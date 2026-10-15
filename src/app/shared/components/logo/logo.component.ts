import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The QiotaKE logo. Clicking it goes to the home page.
 * Use <app-logo [light]="true" /> on a dark background (the text turns white).
 */
@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css',
})
export class LogoComponent {
  // An input is a value the parent gives to this component.
  readonly light = input(false);
}
