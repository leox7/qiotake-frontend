import { Component, inject, signal } from '@angular/core';
import { ListingStatus } from '../../../core/models/listing.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { ListingService } from '../../../core/services/listing.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { getImageUrl } from '../../../core/utils/image-url';
import { formatDateTime } from '../../../core/utils/format-date';
import { getStatusInfo } from '../../../core/utils/status-tone';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminListing } from '../admin.models';
import { AdminService } from '../admin.service';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

const PAGE_SIZE = 10;

type StatusFilter = '' | ListingStatus;

/**
 * /admin/listings: every listing, with a status filter, pages and a Delete action.
 * An admin may delete any listing (the backend allows it). Editing is not offered on purpose.
 * Delete uses ListingService (core), the same call the landlord page uses. The list comes from GET /api/admin/listings,
 * which also sends the landlord's last name.
 */
@Component({
  selector: 'app-admin-listings',
  imports: [ConfirmDialogComponent, EmptyStateComponent, ErrorMessageComponent, PaginationComponent, SkeletonComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './admin-listings.component.html',
  styleUrl: './admin-listings.component.css',
})
export class AdminListingsComponent {
  private readonly adminService = inject(AdminService);
  private readonly listingService = inject(ListingService);
  private readonly toast = inject(ToastService);

  readonly page = signal(0);
  readonly statusFilter = signal<StatusFilter>('');
  readonly result = signal<PagedResponse<AdminListing> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletonRows = [1, 2, 3, 4, 5];

  /** The choices of the status filter, with the same friendly words as the badges. */
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'AVAILABLE', label: getStatusInfo('AVAILABLE').label },
    { value: 'OCCUPIED', label: getStatusInfo('OCCUPIED').label },
  ];

  /** The listing the "This cannot be undone" box is open for (null = no box). */
  readonly deleteTarget = signal<AdminListing | null>(null);
  readonly busy = signal(false);
  /** The reason the last delete failed (for example "this listing still has bookings"). */
  readonly actionError = signal('');

  // The button that opened the box, to give the keyboard focus back when it closes.
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
  }

  /** Reads the current page. Also used by the Retry button. */
  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getListings(this.statusFilter(), this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        // We just deleted the last listing of the last page: go one page back
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

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.page.set(0);
    this.load();
  }

  photo(listing: AdminListing): string | null {
    return getImageUrl(listing.primaryImageUrl);
  }

  /** "Jane Wanjiru": the landlord's full name (the backend sends it on the admin list). */
  landlordName(listing: AdminListing): string {
    const name = `${listing.landlordFirstName ?? ''} ${listing.landlordLastName ?? ''}`.trim();
    return name || '-';
  }

  createdText(listing: AdminListing): string {
    return listing.createdAt ? formatDateTime(listing.createdAt) : '-';
  }

  // ---------- Delete ----------

  openDeleteBox(listing: AdminListing, event: Event): void {
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
        this.closeBox();
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.closeBox();
        // No connection, 403 and server errors already got a toast from error.interceptor.ts
        if (shouldToastHere(error)) {
          this.actionError.set(getApiErrorMessage(error));
        }
      },
    });
  }

  closeBox(): void {
    this.deleteTarget.set(null);
    // Wait for the box to leave the page, then put the focus back where the user was
    setTimeout(() => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
      this.opener = null;
    });
  }
}
