import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';

/** How long the full ID stays on the screen. */
const SHOW_FOR_SECONDS = 30;

/**
 * A small box that shows ONE landlord's full national ID for 30 seconds, then closes itself.
 *   @if (shownId(); as shown) {
 *     <app-national-id-modal [name]="shown.name" [nationalId]="shown.nationalId" (closed)="shownId.set(null)" />
 *   }
 * The parent must clear its copy of the ID when `closed` fires. This box keeps the ID only in its own screen
 * text: it is never written to storage, the address or the console, and it disappears with the box.
 * Close button, Escape and the dark area behind all close it early.
 */
@Component({
  selector: 'app-national-id-modal',
  templateUrl: './national-id-modal.component.html',
  styleUrl: './national-id-modal.component.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class NationalIdModalComponent {
  readonly name = input.required<string>();
  readonly nationalId = input.required<string>();

  readonly closed = output<void>();

  readonly secondsLeft = signal(SHOW_FOR_SECONDS);

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private isClosed = false;

  constructor() {
    // The countdown is worked out from the clock (not by subtracting 1 each tick), so it stays right
    // even if the browser slows a timer down in a background tab.
    const endsAt = Date.now() + SHOW_FOR_SECONDS * 1000;
    const timer = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      this.secondsLeft.set(Math.max(left, 0));
      if (left <= 0) {
        this.close();
      }
    }, 250);
    // Stop the timer when the box leaves the page (for example when the user navigates away)
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    afterNextRender(() => this.closeButton().nativeElement.focus());
  }

  close(): void {
    // The timer and the Escape key could both fire; tell the parent only once
    if (!this.isClosed) {
      this.isClosed = true;
      this.closed.emit();
    }
  }
}
