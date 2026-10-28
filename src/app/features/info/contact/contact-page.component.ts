import { Component } from '@angular/core';
import { ContactComponent } from '../../../shared/components/contact/contact.component';

/** The /contact page: it only places the reusable contact section on the page. */
@Component({
  selector: 'app-contact-page',
  imports: [ContactComponent],
  template: `
    <div class="content page">
      <!-- The section below has its own visible heading (h2). This one is for screen readers and the page outline. -->
      <h1 class="visually-hidden">Contact us</h1>
      <app-contact />
    </div>
  `,
  styles: `
    .page {
      padding-top: 56px;
      padding-bottom: 80px;
    }

    @media (max-width: 599px) {
      .page {
        padding-top: 32px;
      }
    }
  `,
})
export class ContactPageComponent {}
