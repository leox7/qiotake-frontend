import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';
import { formatDate } from '../../../core/utils/format-date';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LandlordStats } from '../landlord.models';
import { LandlordService } from '../landlord.service';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

/** How many booking requests the dashboard table shows. The full list comes in the Booking requests page. */
const RECENT_REQUESTS = 5;

/**
 * The landlord's home page. The sidebar and the page header come from the portal layout,
 * so this page only has the banner, the three number cards and the table.
 *
 * The numbers and the table load separately, so a failure in one does not hide the other.
 */
@Component({
  selector: 'app-landlord-dashboard',
  imports: [RouterLink, EmptyStateComponent, ErrorMessageComponent, SkeletonComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './landlord-dashboard.component.html',
  styleUrl: './landlord-dashboard.component.css',
})
export class LandlordDashboardComponent {
  private readonly landlordService = inject(LandlordService);
  private readonly bookingService = inject(BookingService);

  // The three number cards
  readonly stats = signal<LandlordStats | null>(null);
  readonly statsLoading = signal(true);
  readonly statsError = signal('');

  // The table of recent booking requests
  readonly requests = signal<Booking[]>([]);
  readonly requestsLoading = signal(true);
  readonly requestsError = signal('');

  // Three grey rows to show while the table loads
  readonly skeletonRows = [1, 2, 3];

  /**
   * True when the landlord has not posted a listing yet (that is also what makes a landlord "verified").
   * The stats already hold the listing count, so no extra call for the profile is needed.
   */
  readonly hasNoListings = computed(() => {
    const stats = this.stats();
    return stats !== null && stats.activeListings === 0;
  });

  /**
   * "up 12% from last month", or null when there is nothing to compare with
   * (last month is zero, so a percentage would mean nothing).
   */
  readonly incomeChange = computed(() => {
    const stats = this.stats();
    if (!stats || stats.incomeLastMonth <= 0) {
      return null;
    }
    const percent = Math.round(((stats.incomeThisMonth - stats.incomeLastMonth) / stats.incomeLastMonth) * 100);
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
    this.loadRequests();
  }

  /** Reads the three numbers. Also used by the Retry button. */
  loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set('');

    this.landlordService.getStats().subscribe({
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

  /** Reads the newest booking requests. Also used by the Retry button. */
  loadRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set('');

    this.bookingService.getLandlordBookings(0, RECENT_REQUESTS).subscribe({
      next: (result) => {
        this.requests.set(result.content);
        this.requestsLoading.set(false);
      },
      error: (error) => {
        this.requestsError.set(getApiErrorMessage(error));
        this.requestsLoading.set(false);
      },
    });
  }

  /** "1 June 2026 to 30 June 2026" */
  dateRange(booking: Booking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }
}
