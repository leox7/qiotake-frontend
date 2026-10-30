import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminBooking, AdminStats } from '../admin.models';
import { AdminService } from '../admin.service';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

/**
 * /admin: three number cards and the 5 newest bookings.
 *
 * The backend has no "recent activity" endpoint, so the activity table shows the newest bookings instead.
 * (The audit log has more events, but it also holds logins and token refreshes, which are not "activity" for this table.)
 * The two parts load on their own, so one failing does not hide the other.
 */
@Component({
  selector: 'app-admin-overview',
  imports: [DecimalPipe, RouterLink, EmptyStateComponent, ErrorMessageComponent, SkeletonComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.css',
})
export class AdminOverviewComponent {
  private readonly adminService = inject(AdminService);

  readonly stats = signal<AdminStats | null>(null);
  readonly statsLoading = signal(true);
  readonly statsError = signal('');

  readonly bookings = signal<AdminBooking[]>([]);
  readonly bookingsLoading = signal(true);
  readonly bookingsError = signal('');

  readonly skeletonRows = [1, 2, 3, 4, 5];

  /**
   * "up 12% from last month" for the payments card. null when last month was zero
   * (a percentage of zero means nothing), then the card shows no change line.
   */
  readonly paymentsChange = computed(() => {
    const stats = this.stats();
    if (!stats || stats.paymentsReceivedLastMonth <= 0) {
      return null;
    }
    const percent = Math.round(
      ((stats.paymentsReceivedThisMonth - stats.paymentsReceivedLastMonth) / stats.paymentsReceivedLastMonth) * 100,
    );
    if (percent > 0) {
      return { text: `up ${percent}% from last month`, tone: 'good' };
    }
    if (percent < 0) {
      return { text: `down ${-percent}% from last month`, tone: 'bad' };
    }
    return { text: 'same as last month', tone: 'same' };
  });

  constructor() {
    this.loadStats();
    this.loadBookings();
  }

  /** Reads the three numbers. Also used by the Retry button. */
  loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set('');

    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: (error) => {
        this.statsError.set(getApiErrorMessage(error));
        this.statsLoading.set(false);
      },
    });
  }

  /** Reads the 5 newest bookings (the backend sorts newest first). Also used by the Retry button. */
  loadBookings(): void {
    this.bookingsLoading.set(true);
    this.bookingsError.set('');

    this.adminService.getBookings('', 0, 5).subscribe({
      next: (result) => {
        this.bookings.set(result.content);
        this.bookingsLoading.set(false);
      },
      error: (error) => {
        this.bookingsError.set(getApiErrorMessage(error));
        this.bookingsLoading.set(false);
      },
    });
  }

  studentName(booking: AdminBooking): string {
    return `${booking.studentFirstName} ${booking.studentLastName}`;
  }

  datesText(booking: AdminBooking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }
}
