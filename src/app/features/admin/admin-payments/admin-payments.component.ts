import { Component, inject, signal } from '@angular/core';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { PaymentStatus, PaymentWithStudent, PAYMENT_TYPE_LABELS } from '../../../core/models/payment.model';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDateTime } from '../../../core/utils/format-date';
import { getStatusInfo } from '../../../core/utils/status-tone';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminService } from '../admin.service';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

const PAGE_SIZE = 10;

type StatusFilter = '' | PaymentStatus;

/**
 * /admin/payments: every payment, with a status filter and pages. Read only: an admin cannot change a
 * payment by hand. The phone number is never shown (the backend sends it masked, and this page leaves it out).
 * Every payment comes with the student's name, so one request per page is all this page needs.
 */
@Component({
  selector: 'app-admin-payments',
  imports: [EmptyStateComponent, ErrorMessageComponent, PaginationComponent, SkeletonComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './admin-payments.component.html',
  styleUrl: './admin-payments.component.css',
})
export class AdminPaymentsComponent {
  private readonly adminService = inject(AdminService);

  readonly page = signal(0);
  readonly statusFilter = signal<StatusFilter>('');
  readonly result = signal<PagedResponse<PaymentWithStudent> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletonRows = [1, 2, 3, 4, 5];

  /** The choices of the status filter, with the same friendly words as the badges ("Confirming" for UNKNOWN). */
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All statuses' },
    ...(['PAID', 'PENDING', 'UNKNOWN', 'FAILED'] as PaymentStatus[]).map((value) => ({
      value,
      label: getStatusInfo(value).label,
    })),
  ];

  constructor() {
    this.load();
  }

  /** Reads the current page. Also used by the Retry button. */
  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getPayments(this.statusFilter(), this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.page.set(0);
    this.load();
  }

  typeLabel(payment: PaymentWithStudent): string {
    return PAYMENT_TYPE_LABELS[payment.type];
  }

  dateText(payment: PaymentWithStudent): string {
    return formatDateTime(payment.dateCreated);
  }

  studentName(payment: PaymentWithStudent): string {
    return `${payment.studentFirstName} ${payment.studentLastName}`;
  }
}
