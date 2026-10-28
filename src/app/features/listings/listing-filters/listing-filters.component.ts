import { Component, effect, input, linkedSignal, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import {
  ListingFilters,
  NO_FILTERS,
  ROOM_TYPE_OPTIONS,
  RoomType,
} from '../../../core/models/listing.model';

// The slider goes from 5,000 to 35,000. The very end (35,000) means "no price limit".
export const BUDGET_MIN = 5000;
export const BUDGET_MAX = 35000;

/**
 * The filter fields (location, budget, room type, available now).
 * It does not change anything itself: it shows `filters` and tells the parent about every change.
 *   <app-listing-filters idPrefix="side" [filters]="filters()" (changed)="applyFilters($event)" />
 * It is used twice on the browse page (sidebar and mobile drawer), so `idPrefix` keeps the ids unique.
 */
@Component({
  selector: 'app-listing-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './listing-filters.component.html',
  styleUrl: './listing-filters.component.css',
})
export class ListingFiltersComponent {
  readonly filters = input.required<ListingFilters>();
  readonly idPrefix = input('filters');
  readonly changed = output<ListingFilters>();

  readonly roomTypes = ROOM_TYPE_OPTIONS;
  readonly budgetMin = BUDGET_MIN;
  readonly budgetMax = BUDGET_MAX;

  readonly locationControl = new FormControl('', { nonNullable: true });

  // The slider position while the visitor drags. It starts again from `filters` whenever they change
  // (a linkedSignal is a signal that can be set by hand, but follows its source when that changes).
  readonly sliderValue = linkedSignal(() => this.filters().maxPrice ?? BUDGET_MAX);

  // The last location text we sent to the parent. See the effect below for why we remember it.
  private lastSentLocation = '';

  constructor() {
    // Send the location only 400 ms after the visitor stops typing, so we do not call the backend on every key.
    this.locationControl.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe((text) => this.sendLocation(text));

    // Show the location from the page address (page refresh, back button, "Clear all", a removed chip).
    // We skip the value we just sent ourselves: it comes back from the address a moment later, and
    // writing it into the box could erase letters typed in the meantime.
    effect(() => {
      const location = this.filters().location;
      if (location !== this.lastSentLocation) {
        this.lastSentLocation = location;
        this.locationControl.setValue(location, { emitEvent: false });
      }
    });
  }

  /**
   * Sends the location now, without waiting for the 400 ms. Used when the visitor leaves the box,
   * for example by tapping "Apply" in the phone drawer, so the last letters are not lost.
   */
  sendLocation(text: string): void {
    this.lastSentLocation = text.trim();
    this.emit({ location: this.lastSentLocation });
  }

  /** Text above the slider, for example "Up to KES 15,000". */
  budgetLabel(): string {
    const value = this.sliderValue();
    return value >= BUDGET_MAX ? 'Any price' : `Up to KES ${value.toLocaleString('en-KE')}`;
  }

  /** While dragging we only move the label. The backend is asked when the visitor lets go. */
  onSliderMove(event: Event): void {
    this.sliderValue.set(Number((event.target as HTMLInputElement).value));
  }

  onSliderRelease(): void {
    const value = this.sliderValue();
    this.emit({ maxPrice: value >= BUDGET_MAX ? null : value });
  }

  onRoomTypeChange(roomType: RoomType | ''): void {
    this.emit({ roomType });
  }

  onAvailableChange(event: Event): void {
    this.emit({ availableOnly: (event.target as HTMLInputElement).checked });
  }

  clearAll(): void {
    this.changed.emit({ ...NO_FILTERS });
  }

  // Send all the filters, with only the changed ones replaced.
  private emit(change: Partial<ListingFilters>): void {
    this.changed.emit({ ...this.filters(), ...change });
  }
}
