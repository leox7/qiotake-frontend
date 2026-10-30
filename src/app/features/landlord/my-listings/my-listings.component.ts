import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Listing, ROOM_TYPE_LABELS } from '../../../core/models/listing.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { ListingService } from '../../../core/services/listing.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { getImageUrl } from '../../../core/utils/image-url';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

const PAGE_SIZE = 10;

/**
 * /landlord/listings: the landlord's own homes, with Edit, Mark as occupied/available and Delete.
 * The portal layout draws the page header (with the "+ Add listing" button) from the route.
 */
@Component({
  selector: 'app-my-listings',
  imports: [RouterLink, ConfirmDialogComponent, EmptyStateComponent, ErrorMessageComponent, PaginationComponent, SkeletonComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './my-listings.component.html',
  styleUrl: './my-listings.component.css',
})
export class MyListingsComponent {
  private readonly listingService = inject(ListingService);
  private readonly toast = inject(ToastService);

  readonly page = signal(0);
  readonly result = signal<PagedResponse<Listing> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Three grey rows to show while the list loads. */
  readonly skeletonRows = [1, 2, 3, 4];

  /** The home a confirm box is open for (null = no box). */
  readonly statusTarget = signal<Listing | null>(null);
  readonly deleteTarget = signal<Listing | null>(null);
  /** True while a status change or a delete is running, so nothing is sent twice. */
  readonly busy = signal(false);
  /** The reason the last action failed (for example "this listing still has bookings"). */
  readonly actionError = signal('');

  /** Shown after the form created the very first listing (it comes in the navigation state). */
  readonly activated = signal(false);

  // The button that opened a box, to give the keyboard focus back when it closes.
  private opener: HTMLElement | null = null;

  constructor() {
    const state = inject(Router).getCurrentNavigation()?.extras.state;
    this.activated.set(state?.['activated'] === true);
    this.load();
  }

  /** Reads the current page. Also used by the Retry button. */
  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.listingService.getMyListings(this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        // We just deleted the last home of the last page: go one page back
        if (result.content.length === 0 && this.page() > 0) {
          this.page.set(this.page() - 1);
          this.load();
          return;
        }
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

  photo(listing: Listing): string | null {
    return getImageUrl(listing.primaryImageUrl);
  }

  roomType(listing: Listing): string {
    return ROOM_TYPE_LABELS[listing.roomType];
  }

  // ---------- Mark as occupied / available ----------

  openStatusBox(listing: Listing, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.actionError.set('');
    this.statusTarget.set(listing);
  }

  /** The text of the box depends on where the home is going. */
  statusMessage(listing: Listing): string {
    if (listing.status === 'AVAILABLE') {
      return (
        `"${listing.title}" will show as Occupied, and students who search for available homes will no longer see it. ` +
        'Booking requests are still decided by their dates. You can change it back at any time.'
      );
    }
    return (
      `"${listing.title}" will show as Available again, and students who search for available homes will see it. ` +
      'You can change it back at any time.'
    );
  }

  changeStatus(): void {
    const listing = this.statusTarget();
    if (!listing || this.busy()) {
      return;
    }
    const newStatus = listing.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';

    this.busy.set(true);
    this.listingService.setStatus(listing.id, newStatus).subscribe({
      next: (updated) => {
        // Put the new version of the home in its row, without reloading the page
        this.result.update((current) =>
          current ? { ...current, content: current.content.map((row) => (row.id === updated.id ? updated : row)) } : current,
        );
        this.toast.success(`"${updated.title}" is now ${updated.status === 'OCCUPIED' ? 'occupied' : 'available'}.`);
        this.busy.set(false);
        this.closeBoxes();
      },
      error: (error) => this.failed(error),
    });
  }

  // ---------- Delete ----------

  openDeleteBox(listing: Listing, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.actionError.set('');
    this.deleteTarget.set(listing);
  }

  deleteListing(): void {
    const listing = this.deleteTarget();
    if (!listing || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.listingService.deleteListing(listing.id).subscribe({
      next: () => {
        this.toast.success(`"${listing.title}" was deleted.`);
        this.busy.set(false);
        this.closeBoxes();
        this.load();
      },
      error: (error) => this.failed(error),
    });
  }

  closeBoxes(): void {
    this.statusTarget.set(null);
    this.deleteTarget.set(null);
    // Wait for the box to leave the page, then put the focus back where the user was
    setTimeout(() => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
      this.opener = null;
    });
  }

  dismissActivated(): void {
    this.activated.set(false);
  }

  private failed(error: unknown): void {
    this.busy.set(false);
    this.closeBoxes();
    // No connection, 403 and server errors already got a toast from error.interceptor.ts
    if (shouldToastHere(error)) {
      this.actionError.set(getApiErrorMessage(error));
    }
  }
}
