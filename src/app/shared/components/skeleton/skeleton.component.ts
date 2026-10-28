import { Component, input } from '@angular/core';

/**
 * A grey "placeholder" shape shown while data is loading, so the page does not jump when it arrives.
 *   <app-skeleton kind="card" />     looks like a listing card
 *   <app-skeleton kind="row" />      looks like one table row (use `columns` for the number of cells)
 *   <app-skeleton kind="stat" />     looks like a number card of a dashboard
 * It is hidden from screen readers. The page that uses it should show a "Loading..." text
 * with the `visually-hidden` class instead.
 */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.css',
})
export class SkeletonComponent {
  readonly kind = input<'card' | 'row' | 'stat'>('card');
  readonly columns = input(4);

  // `@for` needs a list, so turn the number of columns into a list of that length.
  cells(): number[] {
    return Array.from({ length: this.columns() }, (_, index) => index);
  }
}
