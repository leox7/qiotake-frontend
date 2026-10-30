import { Component, inject, signal } from '@angular/core';
import { BookingStatus } from '../../../core/models/booking.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { getStatusInfo } from '../../../core/utils/status-tone';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminBooking } from '../admin.models';
import { AdminService } from '../admin.service';

const PAGE_SIZE = 10;

type StatusFilter = '' | BookingStatus;

/**
 * /admin/bookings: every booking, with a status filter and pages. Read only: the landlord confirms
 * bookings and the student cancels them, the backend gives an admin no booking action.
 * The backend filters and pages by itself, so each change of page or filter asks it again.
 */
@Component({
  selector: 'app-admin-bookings',
  imports: [EmptyStateComponent, ErrorMessageComponent, PaginationComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css',
})
export class AdminBookingsComponent {
  private readonly adminService = inject(AdminService);

  readonly page = signal(0);
  readonly statusFilter = signal<StatusFilter>('');
  readonly result = signal<PagedResponse<AdminBooking> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletonRows = [1, 2, 3, 4, 5];

  /** The choices of the status filter, with the same friendly words as the badges. */
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All statuses' },
    ...(['PENDING', 'CONFIRMED', 'CANCELLED', 'VACATED'] as BookingStatus[]).map((value) => ({
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

    this.adminService.getBookings(this.statusFilter(), this.page(), PAGE_SIZE).subscribe({
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

  studentName(booking: AdminBooking): string {
    return `${booking.studentFirstName} ${booking.studentLastName}`;
  }

  datesText(booking: AdminBooking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }
}
