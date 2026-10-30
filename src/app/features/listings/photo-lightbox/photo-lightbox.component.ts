import { Component, ElementRef, afterNextRender, input, linkedSignal, output, viewChild } from '@angular/core';
import { trapFocus } from '../../../core/utils/trap-focus';

/** How far (in pixels) a finger must slide sideways before we count it as a swipe. */
const SWIPE_DISTANCE = 50;

/**
 * A full screen photo viewer.
 *   <app-photo-lightbox [photos]="urls" [startIndex]="2" [title]="listing.title" (closed)="..." />
 * Keys: left / right arrow change the photo, Escape closes. On phones you can also swipe.
 * The parent decides when to show it (with @if) and puts the focus back when `closed` fires.
 */
@Component({
  selector: 'app-photo-lightbox',
  templateUrl: './photo-lightbox.component.html',
  styleUrl: './photo-lightbox.component.css',
  // Listen to the keyboard on the whole page while the viewer is open.
  host: {
    '(document:keydown.escape)': 'closed.emit()',
    '(document:keydown.arrowleft)': 'previous()',
    '(document:keydown.arrowright)': 'next()',
  },
})
export class PhotoLightboxComponent {
  /** Full photo addresses (already passed through getImageUrl). */
  readonly photos = input.required<string[]>();
  readonly startIndex = input(0);
  /** Used in the alt text, for example "Studio near KCA, photo 2 of 5". */
  readonly title = input('');

  readonly closed = output<void>();

  /**
   * Which photo is shown, counting from 0. A linkedSignal starts from another signal (here the
   * startIndex input) but can still be changed by us afterwards with set() and update().
   */
  readonly index = linkedSignal(() => this.startIndex());

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  // Where the finger first touched the screen, to tell a swipe from a tap.
  private touchStartX = 0;

  constructor() {
    // Runs once, right after the viewer is drawn on the screen.
    afterNextRender(() => {
      // Keyboard and screen reader users start inside the viewer, on the close button.
      this.closeButton().nativeElement.focus();
    });
  }

  // The % makes it wrap around: "next" on the last photo goes back to the first one.
  next(): void {
    this.index.update((i) => (i + 1) % this.photos().length);
  }

  previous(): void {
    this.index.update((i) => (i - 1 + this.photos().length) % this.photos().length);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const distance = event.changedTouches[0].clientX - this.touchStartX;
    if (distance <= -SWIPE_DISTANCE) {
      this.next(); // finger moved to the left
    } else if (distance >= SWIPE_DISTANCE) {
      this.previous(); // finger moved to the right
    }
  }

  /** Keep the Tab key inside the viewer, so keyboard users cannot get "lost" behind it. */
  keepFocusInside(event: KeyboardEvent, dialog: HTMLElement): void {
    trapFocus(event, dialog);
  }
}
