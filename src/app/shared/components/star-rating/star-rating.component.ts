import { Component, computed, input } from '@angular/core';

/**
 * Shows a rating as stars. It only displays, it does not let anyone pick a rating.
 *   <app-star-rating [rating]="4.3" />                     ★★★★☆
 *   <app-star-rating [rating]="4.3" [count]="12" />        ★★★★☆ 4.3 (12)
 * Part stars work too: 4.3 fills the fifth star by 30 percent.
 * The size follows the font size of the place where it is used.
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.css',
})
export class StarRatingComponent {
  /** 0 to 5. */
  readonly rating = input.required<number>();
  /** The number of reviews. Leave it out to show only the stars and the rating. */
  readonly count = input<number | null>(null);

  /** How much of the yellow row to show: 5 stars is 100 percent. */
  readonly percent = computed(() => (Math.min(5, Math.max(0, this.rating())) / 5) * 100);

  /** What a screen reader says instead of the stars. */
  readonly label = computed(() => `Rated ${this.rating()} out of 5`);
}
