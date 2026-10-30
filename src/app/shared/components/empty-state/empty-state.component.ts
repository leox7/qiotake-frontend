import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The pictures an empty state can show. */
export type EmptyStateIcon = 'home' | 'search' | 'calendar' | 'card';

/**
 * "Nothing here yet" message. Examples:
 *   <app-empty-state icon="calendar" heading="No bookings yet" text="Your requests will show here."
 *                    buttonLabel="Browse homes" buttonLink="/listings" />
 *   <app-empty-state icon="search" heading="No homes found" text="Try a bigger budget."
 *                    buttonLabel="Clear filters" (buttonClick)="clearFilters()" />
 * The button is optional: with `buttonLink` it is a link, otherwise it fires `buttonClick`.
 */
@Component({
  selector: 'app-empty-state',
  imports: [RouterLink],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly icon = input<EmptyStateIcon>('home');
  // Called "heading" (not "title"), because a title attribute would also pop up as a tooltip.
  readonly heading = input.required<string>();
  /** 2 when the page already has its own h1, 1 when this message IS the page (the not found and no access pages). */
  readonly headingLevel = input<1 | 2>(2);
  readonly text = input('');
  readonly buttonLabel = input('');
  readonly buttonLink = input('');

  readonly buttonClick = output<void>();
}
