import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ListingSummary } from '../../core/models/listing.model';
import { ListingService } from '../../core/services/listing.service';
import { getApiErrorMessage } from '../../core/utils/api-error';
import { ContactComponent } from '../../shared/components/contact/contact.component';
import { FaqComponent } from '../../shared/components/faq/faq.component';
import { HeroComponent } from './hero/hero.component';
import { LandlordCtaComponent } from './landlord-cta/landlord-cta.component';
import { LatestHomesComponent } from './latest-homes/latest-homes.component';
import { RoomTypesComponent } from './room-types/room-types.component';

/**
 * The home page (/). It puts the sections in order and loads the one thing two sections share:
 * the summary numbers (homes available, and per room type the count and lowest rent).
 * The hero uses the total, the room type cards use the rest. Each other section loads its own data.
 */
@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    RoomTypesComponent,
    LatestHomesComponent,
    LandlordCtaComponent,
    FaqComponent,
    ContactComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly listingService = inject(ListingService);

  // null until the numbers arrive
  readonly summary = signal<ListingSummary | null>(null);
  readonly summaryError = signal('');

  private request?: Subscription;

  constructor() {
    this.loadSummary();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** Asks the backend for the numbers. Also used by the Retry button of the room type cards. */
  loadSummary(): void {
    this.request?.unsubscribe();
    this.summaryError.set('');

    this.request = this.listingService.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      // The hero just hides its card when this fails. The room type cards show the message and Retry.
      error: (error) => this.summaryError.set(getApiErrorMessage(error)),
    });
  }
}
