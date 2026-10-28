import { Component, ElementRef, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  Listing,
  ListingFilters,
  NO_FILTERS,
  ROOM_TYPE_LABELS,
  ROOM_TYPE_OPTIONS,
  RoomType,
} from '../../../core/models/listing.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { SearchBarComponent, SearchValues } from '../../../shared/components/search-bar/search-bar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ListingFiltersComponent } from '../listing-filters/listing-filters.component';
import { ListingService } from '../../../core/services/listing.service';

const PAGE_SIZE = 6;

/**
 * The page address is the single source of truth. Example:
 *   /listings?location=Ruaraka&type=STUDIO&maxPrice=15000&available=true&page=2
 * Every change (search, filter, page) only changes the address. We watch the address,
 * and every time it changes we read the filters from it and ask the backend.
 * That is why refresh, the back button and sharing a link all just work.
 * (The home page can send visitors here with just ?location=...&type=...&maxPrice=...)
 */
@Component({
  selector: 'app-listing-list',
  imports: [
    SearchBarComponent,
    ListingFiltersComponent,
    ListingCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorMessageComponent,
  ],
  templateUrl: './listing-list.component.html',
  styleUrl: './listing-list.component.css',
  // Escape closes the phone drawer
  host: { '(document:keydown.escape)': 'closeDrawer()' },
})
export class ListingListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listingService = inject(ListingService);
  private readonly destroyRef = inject(DestroyRef);

  // What the address says right now.
  readonly filters = signal<ListingFilters>({ ...NO_FILTERS });
  /** Starts at 0, like the backend. The address and the screen use page + 1. */
  readonly page = signal(0);

  // What the backend answered. `result` stays null until the first answer (or after an error).
  readonly result = signal<PagedResponse<Listing> | null>(null);
  readonly loading = signal(true);
  readonly errorText = signal('');

  // The phone drawer keeps its own copy of the filters until the visitor presses "Apply".
  readonly drawerOpen = signal(false);
  readonly draft = signal<ListingFilters>({ ...NO_FILTERS });

  private readonly resultsTop = viewChild<ElementRef<HTMLElement>>('resultsTop');
  private readonly filtersButton = viewChild<ElementRef<HTMLButtonElement>>('filtersButton');
  private readonly drawerClose = viewChild<ElementRef<HTMLButtonElement>>('drawerClose');

  // Used to cancel the previous request when a new one starts, so an old answer cannot replace a newer one.
  private request?: Subscription;

  // Six grey cards shown while the first page loads.
  readonly skeletonCards = Array.from({ length: PAGE_SIZE }, (_, index) => index);

  // The values for the search bar at the top.
  readonly searchValues = computed<SearchValues>(() => ({
    location: this.filters().location,
    roomType: this.filters().roomType,
    maxPrice: this.filters().maxPrice,
  }));

  // One chip for every filter that is switched on.
  readonly chips = computed(() => {
    const filters = this.filters();
    const chips: { key: keyof ListingFilters; label: string }[] = [];

    if (filters.location) {
      chips.push({ key: 'location', label: `Location: ${filters.location}` });
    }
    if (filters.roomType) {
      chips.push({ key: 'roomType', label: ROOM_TYPE_LABELS[filters.roomType] });
    }
    if (filters.maxPrice !== null) {
      chips.push({ key: 'maxPrice', label: `Up to KES ${filters.maxPrice.toLocaleString('en-KE')}` });
    }
    if (filters.availableOnly) {
      chips.push({ key: 'availableOnly', label: 'Available now' });
    }
    return chips;
  });

  // The page numbers to show: at most 5, around the current page. Starts at 1 (not 0).
  readonly pageNumbers = computed(() => {
    const total = this.result()?.totalPages ?? 0;
    const start = Math.max(1, Math.min(this.page() + 1 - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  });

  constructor() {
    // Runs once now, and again every time the address changes.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters.set(readFilters(params));
      this.page.set(readPage(params));
      this.load();
    });

    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  /** Asks the backend for the current page. Also used by the Retry button. */
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errorText.set('');

    this.request = this.listingService
      .searchListings(this.filters(), this.page(), PAGE_SIZE)
      .subscribe({
        next: (result) => {
          // The address asked for a page that does not exist (for example ?page=99): show the last one.
          if (result.content.length === 0 && result.totalPages > 0 && this.page() > 0) {
            this.goTo(this.filters(), result.totalPages - 1, true);
            return;
          }
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error) => {
          // Clear the old results too, so Retry shows the loading cards again.
          this.result.set(null);
          this.errorText.set(getApiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }

  // ---- things the visitor can do. Each one only changes the address, load() runs by itself afterwards ----

  /** A new search or filter always goes back to page 1. */
  applyFilters(filters: ListingFilters): void {
    this.goTo(filters, 0);
  }

  onSearch(values: SearchValues): void {
    this.applyFilters({ ...this.filters(), ...values });
  }

  clearAll(): void {
    this.applyFilters({ ...NO_FILTERS });
  }

  /** Switch one filter off, using the "no filter" value from NO_FILTERS. */
  removeChip(key: keyof ListingFilters): void {
    this.applyFilters({ ...this.filters(), [key]: NO_FILTERS[key] });
  }

  /** `pageNumber` starts at 1. */
  goToPage(pageNumber: number): void {
    this.goTo(this.filters(), pageNumber - 1);
    // Bring the top of the results into view, so the visitor does not stay at the bottom of the old page.
    this.resultsTop()?.nativeElement.scrollIntoView();
  }

  // ---- the phone drawer ----

  openDrawer(): void {
    this.draft.set(this.filters());
    this.drawerOpen.set(true);
    // Wait until the drawer exists on the screen, then move the keyboard focus into it.
    setTimeout(() => this.drawerClose()?.nativeElement.focus());
  }

  closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }
    this.drawerOpen.set(false);
    this.filtersButton()?.nativeElement.focus();
  }

  applyDrawer(): void {
    this.applyFilters(this.draft());
    this.closeDrawer();
  }

  // Puts the filters and the page into the address. `page` starts at 0, the address shows page + 1.
  // A value of null (or undefined) is left out of the address.
  private goTo(filters: ListingFilters, page: number, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl,
      queryParams: {
        location: filters.location || null,
        type: filters.roomType || null,
        maxPrice: filters.maxPrice,
        available: filters.availableOnly ? 'true' : null,
        page: page > 0 ? page + 1 : null,
      },
    });
  }
}

// ---- reading the address. Anyone can type anything there, so every value is checked ----

function readFilters(params: ParamMap): ListingFilters {
  return {
    location: (params.get('location') ?? '').trim().slice(0, 100),
    roomType: readRoomType(params.get('type')),
    maxPrice: readMaxPrice(params.get('maxPrice')),
    availableOnly: params.get('available') === 'true',
  };
}

// Accepts "STUDIO", "studio", "Studio", and also "One bedroom" or "one-bedroom". Anything else means "any".
function readRoomType(text: string | null): RoomType | '' {
  const wanted = (text ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ROOM_TYPE_OPTIONS.find((option) => option.value === wanted)?.value ?? '';
}

function readMaxPrice(text: string | null): number | null {
  const price = Number(text);
  return Number.isFinite(price) && price > 0 ? price : null;
}

// The address shows pages from 1, the backend counts from 0.
function readPage(params: ParamMap): number {
  const pageNumber = Number(params.get('page'));
  return Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber - 1 : 0;
}
