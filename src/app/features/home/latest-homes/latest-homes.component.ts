import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Listing, NO_FILTERS } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

// The home page shows only this many homes
const HOW_MANY = 3;

/**
 * "Latest available homes": the 3 newest homes that are still free.
 * The backend always sorts newest first, so asking for page 0 with size 3 and status AVAILABLE is enough.
 */
@Component({
  selector: 'app-latest-homes',
  imports: [RouterLink, ListingCardComponent, SkeletonComponent, EmptyStateComponent, ErrorMessageComponent],
  templateUrl: './latest-homes.component.html',
  styleUrl: './latest-homes.component.css',
})
export class LatestHomesComponent {
  private readonly listingService = inject(ListingService);

  readonly homes = signal<Listing[]>([]);
  readonly loading = signal(true);
  readonly errorText = signal('');

  // Three grey cards while loading
  readonly placeholders = Array.from({ length: HOW_MANY }, (_, index) => index);

  private request?: Subscription;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** Asks the backend for the homes. Also used by the Retry button. */
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorText.set('');

    this.request = this.listingService
      .searchListings({ ...NO_FILTERS, availableOnly: true }, 0, HOW_MANY)
      .subscribe({
        next: (result) => {
          this.homes.set(result.content);
          this.loading.set(false);
        },
        error: (error) => {
          this.errorText.set(getApiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
