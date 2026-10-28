import { DecimalPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SearchBarComponent, SearchValues } from '../../../shared/components/search-bar/search-bar.component';

/**
 * The top of the home page: heading, search bar, three trust points, and a picture with a card on it.
 * `totalAvailable` is the real number of free homes from the summary. null means "not loaded (yet)",
 * and then the card is simply not shown.
 */
@Component({
  selector: 'app-hero',
  imports: [SearchBarComponent, DecimalPipe],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {
  private readonly router = inject(Router);

  readonly totalAvailable = input<number | null>(null);

  readonly trustPoints = ['Clear monthly prices', 'Book online in minutes', 'Pay safely with M-Pesa'];

  /** Opens the browse page with the filters in the address. Empty values (null) are left out of the address. */
  onSearch(values: SearchValues): void {
    this.router.navigate(['/listings'], {
      queryParams: {
        location: values.location || null,
        type: values.roomType || null,
        maxPrice: values.maxPrice,
      },
    });
  }
}
