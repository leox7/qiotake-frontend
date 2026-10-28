import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Payment, PaymentStatus, PAYMENT_TYPE_LABELS } from '../../../core/models/payment.model';
import { BookingService } from '../../../core/services/booking.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDateTime } from '../../../core/utils/format-date';
import { MAX_PAGE_SIZE, loadAllPages } from '../../../core/utils/load-all-pages';
import { getStatusInfo } from '../../../core/utils/status-tone';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LandlordStats } from '../landlord.models';
import { LandlordService } from '../landlord.service';

const PAGE_SIZE = 10;

type StatusFilter = 'ALL' | PaymentStatus;

/** A payment plus the first name of the student who made it. */
interface PaymentRow extends Payment {
  studentFirstName: string;
}

/**
 * /landlord/payments: the payments made on the landlord's homes. Read only.
 *
 * The backend gives the payments page by page, with no filter. So this page reads all of them once and
 * filters and pages them itself. A payment has no student name, so it is found through the booking
 * (payment.bookingId -> the landlord's booking requests). The student's phone number is never shown.
 */
@Component({
  selector: 'app-landlord-payments',
  imports: [
    DecimalPipe,
    EmptyStateComponent,
    ErrorMessageComponent,
    PaginationComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent {
  private readonly landlordService = inject(LandlordService);
  private readonly bookingService = inject(BookingService);

  readonly payments = signal<PaymentRow[]>([]);
  /** The backend's income numbers. null when they could not be read; the page then adds up the list itself. */
  readonly stats = signal<LandlordStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly page = signal(0);

  readonly skeletonRows = [1, 2, 3, 4];

  /** The choices of the status filter, with the same friendly words as the badges ("Confirming" for UNKNOWN). */
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All statuses' },
    ...(['PAID', 'PENDING', 'UNKNOWN', 'FAILED'] as PaymentStatus[]).map((value) => ({
      value,
      label: getStatusInfo(value).label,
    })),
  ];

  /** "2026-10": the start of every date-time of this month. */
  private readonly thisMonth = this.monthKey(new Date());

  private readonly paidThisMonth = computed(() =>
    this.payments().filter((payment) => payment.status === 'PAID' && payment.dateCreated.startsWith(this.thisMonth)),
  );

  /** Total received this month. From the stats endpoint (the backend adds up the PAID payments); if that call failed, adds up the list. */
  readonly receivedThisMonth = computed(
    () => this.stats()?.incomeThisMonth ?? this.paidThisMonth().reduce((sum, payment) => sum + payment.amount, 0),
  );

  /** Number of successful (PAID) payments this month. Counted from the list, the stats endpoint has no such number. */
  readonly successfulThisMonth = computed(() => this.paidThisMonth().length);

  private readonly filtered = computed(() => {
    const status = this.statusFilter();
    return status === 'ALL' ? this.payments() : this.payments().filter((payment) => payment.status === status);
  });

  readonly totalPages = computed(() => Math.ceil(this.filtered().length / PAGE_SIZE));
  readonly rows = computed(() => this.filtered().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  constructor() {
    this.load();
  }

  /** Reads all payments, the booking requests (for the student names) and the income numbers. Also used by Retry. */
  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      payments: loadAllPages((page) => this.landlordService.getReceivedPayments(page, MAX_PAGE_SIZE)),
      // Only for the student names: if this fails the names show as "-" and the payments still show
      bookings: loadAllPages((page) => this.bookingService.getLandlordBookings(page, MAX_PAGE_SIZE)).pipe(
        catchError(() => of([])),
      ),
      stats: this.landlordService.getStats().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ payments, bookings, stats }) => {
        const names = new Map(bookings.map((booking) => [booking.id, booking.studentFirstName]));
        this.payments.set(
          payments.map((payment) => ({ ...payment, studentFirstName: names.get(payment.bookingId) ?? '-' })),
        );
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.page.set(0);
  }

  typeLabel(payment: Payment): string {
    return PAYMENT_TYPE_LABELS[payment.type];
  }

  dateText(payment: Payment): string {
    return formatDateTime(payment.dateCreated);
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
