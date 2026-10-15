import { Component, input, output } from '@angular/core';

/**
 * Shown when loading something failed. It has a Retry button.
 *   <app-error-message [message]="errorText()" (retry)="load()" />
 * Get a good `message` from getApiErrorMessage(error) in core/utils/api-error.ts.
 */
@Component({
  selector: 'app-error-message',
  templateUrl: './error-message.component.html',
  styleUrl: './error-message.component.css',
})
export class ErrorMessageComponent {
  readonly message = input('Something went wrong. Please try again.');

  readonly retry = output<void>();
}
