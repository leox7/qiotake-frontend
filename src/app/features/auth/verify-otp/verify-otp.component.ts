import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { getHomeUrl } from '../../../core/utils/role-home';
import { getSafeReturnUrl } from '../../../core/utils/safe-return-url';
import { AuthService } from '../auth.service';

// The backend keeps a code for 5 minutes, and allows a new one every 60 seconds.
const CODE_LIFETIME_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

/**
 * Step two of logging in: the 6 digit code from the email.
 * The email address arrives through the router "state" set by the login page.
 */
@Component({
  selector: 'app-verify-otp',
  imports: [RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['../auth-card.css', './verify-otp.component.css'],
})
export class VerifyOtpComponent implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  // The six <input> boxes in the page, in order.
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  /** The email the code was sent to. Empty if someone opened this page directly. */
  readonly email: string = this.router.currentNavigation()?.extras.state?.['email'] ?? '';

  /** For example ja***@students.kcau.ac.ke */
  readonly maskedEmail = maskEmail(this.email);

  /** The six digits typed so far ('' for an empty box). */
  readonly digits = signal<string[]>(Array(CODE_LENGTH).fill(''));
  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal('');

  // ---------- Timers ----------
  // We store the MOMENT each timer ends and compare it with the clock, instead of counting down
  // by hand. That stays correct even when the browser slows timers in a background tab.
  private readonly now = signal(Date.now());
  private readonly expiresAt = signal(Date.now() + CODE_LIFETIME_SECONDS * 1000);
  private readonly resendAvailableAt = signal(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  private readonly clock = setInterval(() => this.now.set(Date.now()), 1000);

  /** Seconds left before the code expires. */
  readonly secondsLeft = computed(() => secondsUntil(this.expiresAt(), this.now()));
  readonly expired = computed(() => this.secondsLeft() === 0);
  readonly countdown = computed(() => {
    const minutes = Math.floor(this.secondsLeft() / 60);
    const seconds = (this.secondsLeft() % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  /** Seconds before "Resend code" works again. */
  readonly resendSecondsLeft = computed(() => secondsUntil(this.resendAvailableAt(), this.now()));

  // Where to go after logging in (only used for students).
  private readonly returnUrl = getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  constructor() {
    // Opened directly (no email in the state)? There is nothing to verify, so go to the login page.
    if (!this.email) {
      this.router.navigateByUrl('/login');
    }
  }

  ngAfterViewInit(): void {
    this.focusBox(0);
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
  }

  // ---------- The six boxes ----------

  /** Runs after each typed character. Keeps only a single digit and moves forward. */
  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    // If several characters got in (for example autofill), the last one is the newest.
    const digit = input.value.replace(/\D/g, '').slice(-1);

    // Write the clean value back, so a typed letter disappears at once.
    input.value = digit;
    this.setDigit(index, digit);
    this.errorMessage.set('');

    if (digit && index < CODE_LENGTH - 1) {
      this.focusBox(index + 1);
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && this.digits()[index] === '' && index > 0) {
      // An empty box: Backspace goes back and clears the previous box.
      event.preventDefault();
      this.setDigit(index - 1, '');
      this.boxes()[index - 1].nativeElement.value = '';
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusBox(index + 1);
    }
  }

  /** Pasting a code ("123456", or "123 456") fills the boxes. Only digits are used. */
  onPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!pasted) {
      return;
    }

    // A full code always starts at the first box. A short one fills from the box that was used.
    const start = pasted.length >= CODE_LENGTH ? 0 : index;
    const chars = pasted.slice(0, CODE_LENGTH - start).split('');

    chars.forEach((char, offset) => {
      this.setDigit(start + offset, char);
      this.boxes()[start + offset].nativeElement.value = char;
    });

    this.errorMessage.set('');
    this.focusBox(Math.min(start + chars.length, CODE_LENGTH - 1));
  }

  private setDigit(index: number, digit: string): void {
    this.digits.update((list) => list.map((old, i) => (i === index ? digit : old)));
  }

  private focusBox(index: number): void {
    const box = this.boxes()[index]?.nativeElement;
    box?.focus();
    box?.select();
  }

  private clearBoxes(): void {
    this.digits.set(Array(CODE_LENGTH).fill(''));
    this.boxes().forEach((box) => (box.nativeElement.value = ''));
    this.focusBox(0);
  }

  // ---------- Verify ----------

  onSubmit(event: Event): void {
    // Stop the browser from reloading the page the old-fashioned way (this form has no ngSubmit).
    event.preventDefault();
    const code = this.digits().join('');

    if (this.expired()) {
      this.errorMessage.set('Code expired, request a new one.');
      return;
    }
    if (code.length < CODE_LENGTH) {
      this.errorMessage.set('Enter all 6 digits of the code.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.verifyOtp({ email: this.email, otp: code }).subscribe({
      next: (response) => {
        // Students go back to the page they wanted. Landlords and admins always go to their dashboard.
        const destination =
          response.role === 'STUDENT' && this.returnUrl ? this.returnUrl : getHomeUrl(response.role);
        this.router.navigateByUrl(destination);
      },
      error: (error) => {
        this.loading.set(false);
        this.clearBoxes();

        // 401 = wrong code (the backend cannot tell "wrong" from "expired", our countdown can).
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.errorMessage.set('That code is not correct. Check the email and try again.');
        } else {
          this.errorMessage.set(getApiErrorMessage(error));
        }
      },
    });
  }

  // ---------- Resend ----------

  onResend(): void {
    if (this.resendSecondsLeft() > 0 || this.resending()) {
      return;
    }

    this.resending.set(true);
    this.authService.resendOtp({ email: this.email }).subscribe({
      next: () => {
        // A new code replaces the old one, so both timers start again.
        this.expiresAt.set(Date.now() + CODE_LIFETIME_SECONDS * 1000);
        this.resendAvailableAt.set(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        this.errorMessage.set('');
        this.clearBoxes();
        this.resending.set(false);
        this.toast.success('A new code has been sent to your email');
      },
      error: (error) => {
        this.resending.set(false);

        // 429 = asked too soon. The Retry-After header says how many seconds are left.
        if (error instanceof HttpErrorResponse && error.status === 429) {
          const seconds = Number(error.headers.get('Retry-After')) || RESEND_COOLDOWN_SECONDS;
          this.resendAvailableAt.set(Date.now() + seconds * 1000);
        }
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }
}

/** Seconds from `now` until `endTime`, never below 0. */
function secondsUntil(endTime: number, now: number): number {
  return Math.max(0, Math.ceil((endTime - now) / 1000));
}

/** jane.doe@students.kcau.ac.ke -> ja***@students.kcau.ac.ke (the middle of the name part is hidden). */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) {
    return email;
  }
  const name = email.substring(0, at);
  const visible = name.length > 2 ? name.substring(0, 2) : name.substring(0, 1);
  return visible + '***' + email.substring(at);
}
