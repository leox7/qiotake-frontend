import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking, PAST_STATUSES } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDate, formatDateTime } from '../../../core/utils/format-date';
import { MAX_PAGE_SIZE, loadAllPages } from '../../../core/utils/load-all-pages';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LandlordService } from '../landlord.service';

const PAGE_SIZE = 10;

type Tab = 'PENDING' | 'CONFIRMED' | 'PAST' | 'ALL';

/**
 * /landlord/bookings: the booking requests on the landlord's homes.
 *
 * The backend can only give the list page by page, with no status filter and no counts. So this page reads
 * ALL the requests once, then makes the tabs, the counts and the pages by itself.
 *
 * Not built because the backend does not have it: Decline (no endpoint) and "Mark as vacated"
 * (the vacate endpoint is for students only). See the MISSING BACKEND list.
 */
@Component({
  selector: 'app-booking-requests',
  imports: [
    RouterLink,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorMessageComponent,
    PaginationComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './booking-requests.component.html',
  styleUrl: './booking-requests.component.css',
})
export class BookingRequestsComponent {
  private readonly bookingService = inject(BookingService);
  private readonly landlordService = inject(LandlordService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly tab = signal<Tab>('PENDING');
  readonly page = signal(0);

  readonly skeletonRows = [1, 2, 3, 4];

  readonly counts = computed<Record<Tab, number>>(() => {
    const all = this.bookings();
    return {
      PENDING: all.filter((booking) => booking.status === 'PENDING').length,
      CONFIRMED: all.filter((booking) => booking.status === 'CONFIRMED').length,
      PAST: all.filter((booking) => PAST_STATUSES.includes(booking.status)).length,
      ALL: all.length,
    };
  });

  readonly tabs = computed(() => [
    { key: 'PENDING' as Tab, label: 'Pending', count: this.counts().PENDING },
    { key: 'CONFIRMED' as Tab, label: 'Confirmed', count: this.counts().CONFIRMED },
    { key: 'PAST' as Tab, label: 'Past', count: this.counts().PAST },
    { key: 'ALL' as Tab, label: 'All', count: this.counts().ALL },
  ]);

  /** The requests of the open tab. */
  private readonly inTab = computed(() => {
    const all = this.bookings();
    switch (this.tab()) {
      case 'PENDING':
        return all.filter((booking) => booking.status === 'PENDING');
      case 'CONFIRMED':
        return all.filter((booking) => booking.status === 'CONFIRMED');
      case 'PAST':
        return all.filter((booking) => PAST_STATUSES.includes(booking.status));
      default:
        return all;
    }
  });

  readonly totalPages = computed(() => Math.ceil(this.inTab().length / PAGE_SIZE));
  readonly rows = computed(() => this.inTab().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  /** The request a "Confirm booking" box is open for. */
  readonly confirmTarget = signal<Booking | null>(null);
  /** The request the side panel shows. */
  readonly viewTarget = signal<Booking | null>(null);
  /** The id of the request being confirmed now. Its buttons (and the other Confirm buttons) are disabled meanwhile. */
  readonly busyId = signal<number | null>(null);
  /** Why the last confirm failed, in the backend's own words (for example "another confirmed stay overlaps"). */
  readonly actionError = signal('');

  // The button that opened a box or the panel, to give the keyboard focus back when it closes.
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
  }

  /** Reads every request. Also used by the Retry button. `quiet` keeps the table on screen while it refreshes. */
  load(quiet = false): void {
    if (!quiet) {
      this.loading.set(true);
    }
    this.error.set('');

    loadAllPages((page) => this.bookingService.getLandlordBookings(page, MAX_PAGE_SIZE)).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
        // If the last row of this page was just answered, do not stay on an empty page
        if (this.page() > 0 && this.page() >= this.totalPages()) {
          this.page.set(Math.max(0, this.totalPages() - 1));
        }
      },
      error: (error) => {
        // A quiet refresh that fails keeps the old table; the message is only for a first load
        if (!quiet) {
          this.error.set(getApiErrorMessage(error));
        }
        this.loading.set(false);
      },
    });
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.page.set(0);
  }

  // ---------- Confirm ----------

  openConfirm(booking: Booking, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.actionError.set('');
    this.confirmTarget.set(booking);
  }

  confirm(): void {
    const booking = this.confirmTarget();
    if (!booking || this.busyId() !== null) {
      return;
    }
    this.busyId.set(booking.id);

    this.bookingService.confirmBooking(booking.id).subscribe({
      next: () => {
        this.toast.success(`Booking confirmed. ${booking.studentFirstName} has been emailed your phone number.`);
        this.afterAnswer();
      },
      error: (error) => {
        // No connection, 403 and server errors already got a toast from error.interceptor.ts
        if (shouldToastHere(error)) {
          this.actionError.set(getApiErrorMessage(error));
        }
        this.afterAnswer();
      },
    });
  }

  /**
   * After a confirm (done or failed) refresh the table from the backend. It also fixes other rows: confirming
   * one request cancels the pending requests for the same dates.
   */
  private afterAnswer(): void {
    this.busyId.set(null);
    this.closeConfirm();
    this.load(true);
    this.landlordService.refreshPendingCount();
  }

  closeConfirm(): void {
    this.confirmTarget.set(null);
    this.restoreFocus();
  }

  // ---------- The side panel ----------

  openView(booking: Booking, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.viewTarget.set(booking);
    // Wait for the panel to be drawn, then move the keyboard into it
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('.panel-close')?.focus());
  }

  closeView(): void {
    this.viewTarget.set(null);
    this.restoreFocus();
  }

  private restoreFocus(): void {
    setTimeout(() => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
      this.opener = null;
    });
  }

  // Escape closes the side panel
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewTarget()) {
      this.closeView();
    }
  }

  // ---------- Words for the screen ----------

  day(text: string): string {
    return formatDate(text);
  }

  dateRange(booking: Booking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }

  requestedOn(booking: Booking): string {
    return formatDateTime(booking.dateCreated);
  }

  /** "30 nights" */
  stayLength(booking: Booking): string {
    const [sy, sm, sd] = booking.startDate.split('-').map(Number);
    const [ey, em, ed] = booking.endDate.split('-').map(Number);
    const nights = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000);
    return Number.isNaN(nights) ? '' : `${nights} ${nights === 1 ? 'night' : 'nights'}`;
  }

  emptyText(): { heading: string; text: string } {
    switch (this.tab()) {
      case 'PENDING':
        return { heading: 'No pending requests', text: 'New requests from students waiting for your answer show here.' };
      case 'CONFIRMED':
        return { heading: 'No confirmed bookings', text: 'Requests you confirm show here.' };
      default:
        return { heading: 'Nothing here', text: 'There are no requests in this tab.' };
    }
  }
}
