import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models/booking.model';
import { PAYMENT_TYPE_LABELS, Payment, PaymentProvider, PaymentType } from '../../../core/models/payment.model';
import { BookingService } from '../../../core/services/booking.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDate, formatDateTime } from '../../../core/utils/format-date';
import { kenyanPhoneValidator, normalizeKenyanPhone } from '../../../core/validators/kenyan-phone.validator';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PaymentService } from '../payment.service';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

/** How long we wait for the student to enter the PIN before we say "we are confirming". */
const COUNTDOWN_SECONDS = 120;

/** While waiting, we ask the backend for the payment status every 4 seconds. */
const POLL_EVERY_SECONDS = 4;

/**
 * Which screen the card shows right now. There is always exactly ONE of these, kept in `view`.
 *   loading     reading the booking and the earlier payments
 *   error       reading failed (has a Retry button)
 *   problem     this booking cannot be paid here (not found, not yours, not confirmed)
 *   nothing     nothing to pay right now
 *   form        the phone number and the pay button
 *   pending     STK Push sent, waiting for the PIN
 *   success     paid
 *   failed      did not go through, can try again
 *   confirming  M-Pesa has not given a final answer yet. Never ask the student to pay again here.
 */
type View = 'loading' | 'error' | 'problem' | 'nothing' | 'form' | 'pending' | 'success' | 'failed' | 'confirming';

/**
 * /bookings/:id/pay: pays the deposit (first) and then the monthly rent with M-Pesa STK Push.
 *
 * The browser NEVER decides that a payment worked. The student's phone talks to M-Pesa, M-Pesa talks to
 * our backend, and this page only asks the backend "what is the status of this payment?" every few seconds.
 */
@Component({
  selector: 'app-payment',
  imports: [ReactiveFormsModule, RouterLink, StatusBadgeComponent, ErrorMessageComponent, MoneyPipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent implements OnDestroy {
  private readonly bookingService = inject(BookingService);
  private readonly paymentService = inject(PaymentService);

  // The booking id from the address. Anything that is not a whole number cannot exist.
  readonly bookingId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  readonly view = signal<View>('loading');
  readonly problemText = signal('');
  readonly errorText = signal('');

  /** The booking, with what is due next (nextPaymentType, nextPaymentAmount, nextPaymentDueDate). The backend works that out. */
  readonly booking = signal<Booking | null>(null);
  /** The payment mode the backend has switched on (null until we know, or if it could not be read). */
  readonly provider = signal<PaymentProvider | null>(null);
  /** All payments of this booking, newest first. */
  readonly payments = signal<Payment[]>([]);
  /** The payment the pending, success, failed and confirming screens talk about. */
  readonly payment = signal<Payment | null>(null);

  readonly formError = signal('');
  readonly sending = signal(false);

  readonly secondsLeft = signal(COUNTDOWN_SECONDS);
  /** True while a status request is on its way. */
  readonly checking = signal(false);
  /** True after "Check status" found nothing new. */
  readonly stillWaiting = signal(false);

  readonly form = new FormGroup({
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, kenyanPhoneValidator()],
    }),
  });

  readonly typeLabels = PAYMENT_TYPE_LABELS;

  /** What the next payment is. The backend says it (deposit first, then rent). */
  readonly paymentType = computed<PaymentType>(() => (this.booking()?.nextPaymentType === 'RENT' ? 'RENT' : 'DEPOSIT'));

  /** The amount the backend will charge, in KES. */
  readonly amount = computed(() => this.booking()?.nextPaymentAmount ?? 0);

  /** The countdown as m:ss, for example 1:59. */
  readonly countdownText = computed(() => {
    const minutes = Math.floor(this.secondsLeft() / 60);
    const seconds = String(this.secondsLeft() % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  /**
   * SIMULATED means no real money moves. The backend tells us from the start (payments/config). If that call
   * failed, the provider of the latest payment says the same thing.
   */
  readonly testMode = computed(() => (this.provider() ?? this.payments()[0]?.provider) === 'SIMULATED');

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  // ---------- loading and resuming ----------

  /** Reads the booking and the earlier payments, then decides which screen to show. Also used by Retry. */
  async load(): Promise<void> {
    this.view.set('loading');

    if (!Number.isInteger(this.bookingId) || this.bookingId < 1) {
      this.showProblem('We could not find this booking.');
      return;
    }

    try {
      // The backend only gives a student their OWN booking, so someone else's booking is a 404 ("not found").
      const booking = await firstValueFrom(this.bookingService.getBooking(this.bookingId));
      if (booking.status !== 'CONFIRMED') {
        this.showProblem('You can only pay for a booking after the landlord has confirmed it.');
        return;
      }

      // Independent questions, so we ask them together. The mode is only a label: if it fails we carry on without it.
      const [payments, config] = await Promise.all([
        firstValueFrom(this.paymentService.getPaymentsForBooking(this.bookingId)),
        firstValueFrom(this.paymentService.getPaymentConfig()).catch(() => null),
      ]);

      this.booking.set(booking);
      this.payments.set(payments);
      this.provider.set(config?.provider ?? null);
      this.chooseViewFromPayments();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.showProblem('We could not find this booking.');
        return;
      }
      this.errorText.set(getApiErrorMessage(error));
      this.view.set('error');
    }
  }

  private showProblem(text: string): void {
    this.problemText.set(text);
    this.view.set('problem');
  }

  /**
   * Decides the screen from the payments we know. This is what protects against a refresh or a second tab:
   * a payment that is still open ALWAYS wins, so the student can never be asked to pay twice.
   */
  private chooseViewFromPayments(): void {
    const openPayment = this.payments().find((p) => p.status === 'PENDING' || p.status === 'UNKNOWN');
    if (openPayment) {
      this.showPayment(openPayment);
    } else if (this.nothingToPay()) {
      this.view.set('nothing');
    } else {
      this.view.set('form');
    }
  }

  /** The backend says nothing is due: the deposit is paid and every month of the stay has its rent. */
  private nothingToPay(): boolean {
    return this.booking()?.nextPaymentType === 'NONE';
  }

  // ---------- starting a payment ----------

  submit(): void {
    // A second click while the first request is on its way does nothing.
    if (this.sending()) {
      return;
    }
    // Show the phone message if it is empty or wrong.
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.sending.set(true);
    this.formError.set('');

    // We send the normalized form (254XXXXXXXXX), as the project rules say. The backend accepts it too.
    const phone = normalizeKenyanPhone(this.form.controls.phone.value);

    this.paymentService.startPayment(this.bookingId, this.paymentType(), phone).subscribe({
      next: (payment) => {
        this.sending.set(false);
        // The phone number is not needed in the browser any more.
        this.form.reset();
        this.showPayment(payment);
      },
      error: (error) => this.onStartFailed(error),
    });
  }

  private async onStartFailed(error: unknown): Promise<void> {
    const message = getApiErrorMessage(error);

    // 409 = the backend refused because of a payment that already exists (pending, unknown, or deposit paid).
    // Maybe another tab started it. Read the payments again and show the screen that matches the truth.
    if (error instanceof HttpErrorResponse && error.status === 409) {
      try {
        this.payments.set(await firstValueFrom(this.paymentService.getPaymentsForBooking(this.bookingId)));
        this.booking.set(await firstValueFrom(this.bookingService.getBooking(this.bookingId)));
        this.chooseViewFromPayments();
      } catch {
        // could not read them again: the message below is still shown
      }
    }

    // If we are still on the form, tell the student why. (On other screens the screen itself explains.)
    if (this.view() === 'form') {
      this.formError.set(message);
    }
    this.sending.set(false);
  }

  // ---------- showing a payment, and waiting for its answer ----------

  /** Shows the screen for this payment's backend status. Used for every answer from the backend. */
  private showPayment(payment: Payment): void {
    this.payment.set(payment);
    this.stillWaiting.set(false);

    // Keep the history list up to date: replace the payment if we know it, otherwise add it on top.
    this.payments.update((list) =>
      list.some((p) => p.id === payment.id)
        ? list.map((p) => (p.id === payment.id ? payment : p))
        : [payment, ...list],
    );

    switch (payment.status) {
      case 'PAID':
        this.stopCountdown();
        this.view.set('success');
        this.refreshBooking();
        break;
      case 'FAILED':
        this.stopCountdown();
        this.view.set('failed');
        break;
      case 'UNKNOWN':
        // M-Pesa has not given a final answer. The backend keeps checking by itself.
        this.stopCountdown();
        this.view.set('confirming');
        break;
      default: // 'PENDING'
        this.view.set('pending');
        this.startCountdown();
    }
  }

  /**
   * A payment just went through, so what is due next has changed (after the deposit comes rent, after the last rent
   * nothing). Read the booking again to get it from the backend. If this fails the receipt simply has no next date.
   */
  private refreshBooking(): void {
    this.bookingService.getBooking(this.bookingId).subscribe({
      next: (booking) => this.booking.set(booking),
      error: () => undefined,
    });
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.secondsLeft.set(COUNTDOWN_SECONDS);
    this.timer = setInterval(() => this.onSecondPassed(), 1000);
  }

  private stopCountdown(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  // Runs every second while PENDING: counts down, and every 4th second asks the backend.
  private onSecondPassed(): void {
    this.secondsLeft.update((seconds) => seconds - 1);

    if (this.secondsLeft() <= 0) {
      // No final answer in 2 minutes. That is NOT a failure: the backend keeps checking with M-Pesa.
      this.stopCountdown();
      this.view.set('confirming');
      this.checkStatus(); // one last look, in case the answer just arrived
    } else if (this.secondsLeft() % POLL_EVERY_SECONDS === 0) {
      this.checkStatus();
    }
  }

  /**
   * Asks the backend for the payment's status once. Used by the 4 second polling and by "Check status".
   * Only a real answer (PAID, FAILED or UNKNOWN) changes the screen. PENDING means "keep waiting".
   */
  checkStatus(): void {
    const current = this.payment();
    // If the previous question is still on its way, do not stack another one.
    if (!current || this.checking()) {
      return;
    }
    this.checking.set(true);

    this.paymentService.getPaymentStatus(current.id).subscribe({
      next: (latest) => {
        this.checking.set(false);
        const wasConfirming = this.view() === 'confirming';

        if (latest.status !== 'PENDING') {
          this.showPayment(latest);
        }
        // Tells the student that "Check status" ran but there is no final answer yet.
        this.stillWaiting.set(wasConfirming && (latest.status === 'PENDING' || latest.status === 'UNKNOWN'));
      },
      // One failed question is not a failed payment. The polling simply asks again 4 seconds later.
      error: () => this.checking.set(false),
    });
  }

  /** "Try again" after FAILED. Only possible when nothing is pending (the FAILED screen only shows then). */
  tryAgain(): void {
    this.formError.set('');
    this.view.set('form');
  }

  // ---------- text for the template ----------

  /** "1 Jun 2026, 10:15": when the payment was PAID, or when it was started if it is not paid. */
  dateOf(payment: Payment): string {
    return formatDateTime(payment.paidAt ?? payment.dateCreated);
  }

  /** "1 June 2026", the day the next payment is due, or '' when nothing is due. */
  nextDueText(): string {
    const date = this.booking()?.nextPaymentDueDate;
    return date ? formatDate(date) : '';
  }
}
