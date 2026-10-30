import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Booking, BookingCounts, BookingTab } from '../../../core/models/booking.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { getImageUrl } from '../../../core/utils/image-url';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

/** How many bookings one page shows. The backend does the paging. */
const PAGE_SIZE = 10;

type TabKey = 'all' | 'pending' | 'confirmed' | 'past';

/**
 * The tabs, in order. `status` is what we send to the backend for that tab (nothing for "All").
 * `PAST` is the backend's own group for cancelled and vacated bookings together.
 */
const TABS: { key: TabKey; label: string; status?: BookingTab }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', status: 'PENDING' },
  { key: 'confirmed', label: 'Confirmed', status: 'CONFIRMED' },
  { key: 'past', label: 'Past', status: 'PAST' },
];

/** What the empty state says for each tab. */
const EMPTY_TEXT: Record<TabKey, { heading: string; text: string }> = {
  all: { heading: 'You have no bookings yet', text: 'When you request a home, it will show up here.' },
  pending: { heading: 'No pending requests', text: 'Requests waiting for a landlord will show here.' },
  confirmed: { heading: 'No confirmed stays', text: 'Once a landlord confirms your request, it will show here.' },
  past: { heading: 'No past bookings', text: 'Cancelled and finished stays will show here.' },
};

/**
 * /bookings: the student's own bookings.
 *
 * The backend does the work: each tab asks for its own status (and its own page), and the numbers on the
 * tabs come from GET /api/bookings/my/counts. So the page never loads every booking just to filter or count them.
 */
@Component({
  selector: 'app-booking-list',
  imports: [RouterLink, StatusBadgeComponent, SkeletonComponent, EmptyStateComponent, ErrorMessageComponent, ConfirmDialogComponent, PaginationComponent, MoneyPipe],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css',
})
export class BookingListComponent {
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);

  readonly tabs = TABS;

  /** The page of bookings for the active tab. */
  readonly result = signal<PagedResponse<Booking> | null>(null);
  readonly loading = signal(true);
  readonly errorText = signal('');

  /** The numbers on the tabs. null until they arrive (or if they could not be read: then the tabs show no number). */
  readonly counts = signal<BookingCounts | null>(null);

  readonly activeTab = signal<TabKey>('all');
  /** The page inside the active tab, starting at 0. */
  readonly page = signal(0);

  // Cancelling: `bookingToCancel` is the booking the dialog is asking about (null = dialog closed).
  readonly bookingToCancel = signal<Booking | null>(null);
  readonly cancelling = signal(false);
  // The "Cancel request" button that opened the dialog, so the focus can go back to it.
  private cancelOpener: HTMLElement | null = null;

  private request?: Subscription;

  readonly emptyText = computed(() => EMPTY_TEXT[this.activeTab()]);

  // Three grey rows while loading.
  readonly skeletonRows = [0, 1, 2];

  constructor() {
    this.load();
    this.loadCounts();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** Loads the page of the active tab. Also used by Retry and after a cancel. */
  load(): void {
    const status = TABS.find((tab) => tab.key === this.activeTab())?.status;

    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorText.set('');

    this.request = this.bookingService.getMyBookings(this.page(), PAGE_SIZE, status).subscribe({
      next: (result) => {
        // The last booking of the last page just left this tab (for example it was cancelled): go one page back
        if (result.content.length === 0 && this.page() > 0) {
          this.page.set(this.page() - 1);
          this.load();
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorText.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Reads the numbers for the tabs. They are only decoration, so a failure is ignored: the tabs just show no number. */
  private loadCounts(): void {
    this.bookingService.getMyBookingCounts().subscribe({
      next: (counts) => this.counts.set(counts),
      error: () => undefined,
    });
  }

  /** The number on a tab, or null when we do not have the counts. */
  countOf(tab: TabKey): number | null {
    return this.counts()?.[tab] ?? null;
  }

  selectTab(key: TabKey): void {
    this.activeTab.set(key);
    this.page.set(0);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  // ---- cancelling ----

  askToCancel(booking: Booking, event: Event): void {
    this.cancelOpener = event.currentTarget as HTMLElement;
    this.bookingToCancel.set(booking);
  }

  closeDialog(): void {
    this.bookingToCancel.set(null);
    // If the row is gone (the booking was cancelled), this button no longer exists and nothing happens.
    this.cancelOpener?.focus();
  }

  confirmCancel(): void {
    const booking = this.bookingToCancel();
    if (!booking || this.cancelling()) {
      return; // a double click must not send the request twice
    }
    this.cancelling.set(true);

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.closeDialog();
        this.toast.success('Your booking request was cancelled.');
        // The booking moves from Pending to Past, so read the list and the numbers again
        this.load();
        this.loadCounts();
      },
      error: (error) => {
        this.cancelling.set(false);
        this.closeDialog();
        // The backend explains it: "Only PENDING bookings can be cancelled..." (409) or not found (404).
        // No connection, 403 and 5xx are already toasted by error.interceptor.ts, so not again here.
        if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
        // The list may be out of date (for example the landlord just confirmed it), so reload both.
        this.load();
        this.loadCounts();
      },
    });
  }

  // ---- text for the template ----

  /** "1 June 2026 to 31 May 2027" */
  dateRange(booking: Booking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }

  /** The listing's photo address, or null when the listing has none (the card then shows a placeholder). */
  photo(booking: Booking): string | null {
    return getImageUrl(booking.listingImageUrl);
  }

  /** The text of the pay button. The backend says what is due next, so there is no guessing here. */
  payLabel(booking: Booking): string {
    if (booking.nextPaymentType === 'RENT' && booking.nextPaymentDueDate) {
      return `Pay rent due ${formatDate(booking.nextPaymentDueDate)}`;
    }
    return booking.nextPaymentType === 'RENT' ? 'Pay rent' : 'Pay deposit';
  }

  /** "1 June 2026": the day the next payment is due, or '' when the backend sends no date. */
  dueDate(booking: Booking): string {
    return booking.nextPaymentDueDate ? formatDate(booking.nextPaymentDueDate) : '';
  }
}
