import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Booking, PAST_STATUSES } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

/** The backend allows at most 50 bookings per request. */
const BACKEND_PAGE_SIZE = 50;

/** How many bookings one screen page shows. */
const SCREEN_PAGE_SIZE = 10;

type TabKey = 'all' | 'pending' | 'confirmed' | 'past';

/** The tabs, in order. `matches` says which bookings belong to the tab. */
const TABS: { key: TabKey; label: string; matches: (booking: Booking) => boolean }[] = [
  { key: 'all', label: 'All', matches: () => true },
  { key: 'pending', label: 'Pending', matches: (b) => b.status === 'PENDING' },
  { key: 'confirmed', label: 'Confirmed', matches: (b) => b.status === 'CONFIRMED' },
  { key: 'past', label: 'Past', matches: (b) => PAST_STATUSES.includes(b.status) },
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
 * The backend can only list bookings page by page (newest first). It cannot filter by status and it
 * does not send counts. To show a real count on every tab, we load ALL the student's bookings once
 * (a student has very few), and then filter, count and split into screen pages here in the browser.
 */
@Component({
  selector: 'app-booking-list',
  imports: [
    RouterLink,
    StatusBadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorMessageComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css',
})
export class BookingListComponent {
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);

  readonly tabs = TABS;

  // Every booking of this student.
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly errorText = signal('');

  readonly activeTab = signal<TabKey>('all');
  /** The screen page inside the active tab, starting at 0. */
  readonly page = signal(0);

  // Cancelling: `bookingToCancel` is the booking the dialog is asking about (null = dialog closed).
  readonly bookingToCancel = signal<Booking | null>(null);
  readonly cancelling = signal(false);
  // The "Cancel request" button that opened the dialog, so the focus can go back to it.
  private cancelOpener: HTMLElement | null = null;

  private request?: Subscription;

  /** How many bookings each tab has, e.g. { all: 4, pending: 1, confirmed: 1, past: 2 }. */
  readonly counts = computed(() => {
    const counts = {} as Record<TabKey, number>;
    for (const tab of TABS) {
      counts[tab.key] = this.bookings().filter(tab.matches).length;
    }
    return counts;
  });

  /** The bookings of the active tab. */
  private readonly tabBookings = computed(() => {
    const tab = TABS.find((t) => t.key === this.activeTab()) ?? TABS[0];
    return this.bookings().filter(tab.matches);
  });

  readonly totalPages = computed(() => Math.ceil(this.tabBookings().length / SCREEN_PAGE_SIZE));

  // After a cancel the last page may disappear, so never go past the last page that still exists.
  readonly currentPage = computed(() => Math.min(this.page(), Math.max(0, this.totalPages() - 1)));

  /** The bookings shown on screen right now. */
  readonly visibleBookings = computed(() => {
    const start = this.currentPage() * SCREEN_PAGE_SIZE;
    return this.tabBookings().slice(start, start + SCREEN_PAGE_SIZE);
  });

  /** Page numbers starting at 1, for the buttons. */
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly emptyText = computed(() => EMPTY_TEXT[this.activeTab()]);

  // Three grey rows while loading.
  readonly skeletonRows = [0, 1, 2];

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** Loads all bookings. Also used by Retry and after a failed cancel. */
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorText.set('');
    this.loadPage(0, []);
  }

  // Asks for one backend page, and if there are more, for the next one, until we have them all.
  private loadPage(pageNumber: number, collected: Booking[]): void {
    this.request = this.bookingService.getMyBookings(pageNumber, BACKEND_PAGE_SIZE).subscribe({
      next: (result) => {
        const everything = [...collected, ...result.content];
        // `result.content.length === 0` is a safety stop, so a strange answer can never loop forever.
        if (result.last || result.content.length === 0) {
          this.bookings.set(everything);
          this.loading.set(false);
        } else {
          this.loadPage(pageNumber + 1, everything);
        }
      },
      error: (error) => {
        this.errorText.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  selectTab(key: TabKey): void {
    this.activeTab.set(key);
    this.page.set(0);
  }

  goToPage(pageNumber: number): void {
    this.page.set(pageNumber - 1);
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
      next: (updated) => {
        // Swap the old booking for the updated one. The row moves to the "Past" tab by itself.
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.cancelling.set(false);
        this.closeDialog();
        this.toast.success('Your booking request was cancelled.');
      },
      error: (error) => {
        this.cancelling.set(false);
        this.closeDialog();
        // The backend explains it: "Only PENDING bookings can be cancelled..." (409) or not found (404).
        // No connection, 403 and 5xx are already toasted by error.interceptor.ts, so not again here.
        if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
        // The list may be out of date (for example the landlord just confirmed it), so reload it.
        this.load();
      },
    });
  }

  // ---- text for the template ----

  /** "1 June 2026 to 31 May 2027" */
  dateRange(booking: Booking): string {
    return `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
  }
}
