import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Listing, ROOM_TYPE_LABELS } from '../../../core/models/listing.model';
import { getImageUrl } from '../../../core/utils/image-url';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { MoneyPipe } from '../../../core/pipes/money.pipe';

/**
 * One home in a list. The whole card is a link to /listings/:id.
 *   <app-listing-card [listing]="listing" />
 */
@Component({
  selector: 'app-listing-card',
  imports: [RouterLink, StarRatingComponent, StatusBadgeComponent, MoneyPipe],
  templateUrl: './listing-card.component.html',
  styleUrl: './listing-card.component.css',
})
export class ListingCardComponent {
  readonly listing = input.required<Listing>();

  readonly roomTypeLabel = computed(() => ROOM_TYPE_LABELS[this.listing().roomType]);

  // Set to true if the photo file cannot be loaded, so we show the placeholder instead of a broken picture.
  private readonly imageFailed = signal(false);

  readonly imageUrl = computed(() =>
    this.imageFailed() ? null : getImageUrl(this.listing().primaryImageUrl),
  );

  onImageError(): void {
    this.imageFailed.set(true);
  }
}
