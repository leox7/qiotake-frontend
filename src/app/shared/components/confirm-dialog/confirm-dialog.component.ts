import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { trapFocus } from '../../../core/utils/trap-focus';

/**
 * A small "Are you sure?" box on top of the page. The parent shows it with @if and closes it
 * when one of the two outputs fires:
 *   @if (bookingToCancel()) {
 *     <app-confirm-dialog heading="Cancel this request?" message="..." confirmLabel="Yes, cancel"
 *                         cancelLabel="Keep it" [busy]="cancelling()"
 *                         (confirmed)="cancel()" (dismissed)="close()" />
 *   }
 * Escape, the backdrop and the cancel button all fire `dismissed`. Tab stays inside the box.
 * The parent should put the focus back on the button that opened it when it closes.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  host: { '(document:keydown.escape)': 'dismiss()' },
})
export class ConfirmDialogComponent {
  // Called "heading" (not "title") because a title attribute would also pop up as a tooltip.
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  /** True while the parent is waiting for the backend: buttons are disabled so nothing is sent twice. */
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    // Start on the safe button ("keep it"), so pressing Enter by accident does not do the risky thing.
    afterNextRender(() => this.cancelButton().nativeElement.focus());
  }

  dismiss(): void {
    if (!this.busy()) {
      this.dismissed.emit();
    }
  }

  /** Keep the Tab key inside the box, so keyboard users cannot "fall out" behind it. */
  keepFocusInside(event: KeyboardEvent, box: HTMLElement): void {
    trapFocus(event, box);
  }
}
