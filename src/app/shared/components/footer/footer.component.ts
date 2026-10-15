import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_INFO } from '../../../core/config/site-info';
import { LogoComponent } from '../logo/logo.component';

/** The dark bar at the bottom of every public page. Contact details come from core/config/site-info.ts. */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, LogoComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly info = SITE_INFO;

  // A phone link must not contain spaces: "+254 700 000 000" becomes "+254700000000"
  readonly phoneLink = 'tel:' + SITE_INFO.phone.replaceAll(' ', '');

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
