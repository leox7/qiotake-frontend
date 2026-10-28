import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Listing, ROOM_TYPE_LABELS } from '../../../core/models/listing.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BookingPanelComponent } from '../booking-panel/booking-panel.component';
import { ListingGalleryComponent } from '../listing-gallery/listing-gallery.component';
import { ListingReviewsComponent } from '../listing-reviews/listing-reviews.component';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { ListingService } from '../../../core/services/listing.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One home's own page: /listings/:id
 * It loads the listing once, then shows the photos, the details and the booking panel.
 * The page can be in one of four states: loading, not found, error (with Retry), or loaded.
 */
@Component({
  selector: 'app-listing-detail',
  imports: [
    ListingGalleryComponent,
    BookingPanelComponent,
    ListingReviewsComponent,
    StarRatingComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
  ],
  templateUrl: './listing-detail.component.html',
  styleUrl: './listing-detail.component.css',
})
export class ListingDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly listingService = inject(ListingService);
  private readonly pageTitle = inject(PageTitleService);

  // The id from the address. Number('abc') gives NaN, which we treat as "not found" below.
  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly listing = signal<Listing | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly errorText = signal('');

  // Kept apart from `listing` so a new review can update the stars without reloading the whole page
  readonly averageRating = signal<number | null>(null);
  readonly reviewCount = signal(0);

  private request?: Subscription;

  readonly roomTypeLabel = computed(() => {
    const listing = this.listing();
    return listing ? ROOM_TYPE_LABELS[listing.roomType] : '';
  });

  /** "Listed today", "Listed 1 day ago", "Listed 12 days ago", or '' when the backend has no date. */
  readonly listedText = computed(() => {
    const createdAt = this.listing()?.createdAt;
    if (!createdAt) {
      return '';
    }
    const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / ONE_DAY_MS));
    if (days === 0) {
      return 'Listed today';
    }
    return days === 1 ? 'Listed 1 day ago' : `Listed ${days} days ago`;
  });

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** Asks the backend for the listing. Also used by the Retry button. */
  load(): void {
    // Ids are whole numbers from 1 up. Anything else cannot exist, so we do not even ask.
    if (!Number.isInteger(this.id) || this.id < 1) {
      this.showNotFound();
      return;
    }

    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorText.set('');

    this.request = this.listingService.getListing(this.id).subscribe({
      next: (listing) => {
        this.listing.set(listing);
        this.averageRating.set(listing.averageRating);
        this.reviewCount.set(listing.reviewCount);
        this.loading.set(false);
        // The tab title becomes "<listing title> | QiotaKE"
        this.pageTitle.set(listing.title);
      },
      error: (error) => {
        this.loading.set(false);
        // 404: the listing does not exist (or was deleted). That is not an error, so no Retry button.
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.showNotFound();
        } else {
          this.errorText.set(getApiErrorMessage(error));
        }
      },
    });
  }

  /**
   * A review was added, changed or deleted. The backend works out the new average, so we ask for the home again
   * and take only the two rating numbers. The rest of the page stays exactly as it is.
   */
  refreshRatings(): void {
    this.listingService.getListing(this.id).subscribe({
      next: (listing) => {
        this.averageRating.set(listing.averageRating);
        this.reviewCount.set(listing.reviewCount);
      },
      // The review is already saved. If this fails the stars simply update on the next visit.
      error: () => {},
    });
  }

  /**
   * "Back to homes". If the visitor came from the search page, we go back in the browser history,
   * so their filters and page number are kept. Otherwise (they opened a shared link, or came from
   * another page) we simply open the search page.
   */
  backToHomes(event: Event): void {
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation;
    const previousUrl = previous ? this.router.serializeUrl(previous.finalUrl ?? previous.initialUrl) : '';

    // The link has href="/listings" so "open in new tab" still works. For a normal click we stop the
    // browser from reloading the whole app and let the Angular router move instead.
    event.preventDefault();

    // "/listings" or "/listings?page=2" is the search page, "/listings/5" is another home.
    const cameFromSearch = previousUrl === '/listings' || previousUrl.startsWith('/listings?');
    if (cameFromSearch) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/listings');
    }
  }

  private showNotFound(): void {
    this.loading.set(false);
    this.notFound.set(true);
    this.pageTitle.set('Home not found');
  }
}
