import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ROOM_TYPE_OPTIONS, RoomType } from '../../../core/models/listing.model';

/** What the visitor typed. An empty roomType ('') or a null maxPrice means "no filter". */
export interface SearchValues {
  location: string;
  roomType: RoomType | '';
  maxPrice: number | null;
}

/**
 * The search form used on the home page and the browse page.
 * - `initial`: values to show in the fields (for example the ones already in the page address).
 * - `searched`: fires with the values when the visitor presses "Search homes".
 *
 *   <app-search-bar [initial]="values" (searched)="onSearch($event)" />
 */
@Component({
  selector: 'app-search-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css',
})
export class SearchBarComponent {
  readonly initial = input<SearchValues>();
  readonly searched = output<SearchValues>();

  readonly roomTypes = ROOM_TYPE_OPTIONS;

  // A reactive form: the fields live here in the code, and the HTML connects to them.
  readonly form = new FormGroup({
    location: new FormControl('', { nonNullable: true }),
    roomType: new FormControl<RoomType | ''>('', { nonNullable: true }),
    maxPrice: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  constructor() {
    // Whenever the parent gives new starting values, show them in the fields.
    effect(() => {
      const values = this.initial();
      if (values) {
        this.form.patchValue(values);
      }
    });
  }

  onSubmit(): void {
    // A negative price is not allowed: show the message under the field instead of searching.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.searched.emit({
      location: value.location.trim(),
      roomType: value.roomType,
      maxPrice: value.maxPrice,
    });
  }
}
