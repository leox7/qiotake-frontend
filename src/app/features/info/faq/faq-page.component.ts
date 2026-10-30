import { Component } from '@angular/core';
import { FaqComponent } from '../../../shared/components/faq/faq.component';

/** The /faq page: a heading, then the reusable question list. */
@Component({
  selector: 'app-faq-page',
  imports: [FaqComponent],
  template: `
    <div class="content page">
      <p class="eyebrow">Help</p>
      <h1>Frequently asked <span class="accent-word">questions</span></h1>
      <p class="lead">Quick answers about registering, booking and paying. Cannot find yours? Use the contact page.</p>
      <app-faq [headingLevel]="2" />
    </div>
  `,
  styles: `
    .page {
      padding-top: 48px;
      padding-bottom: 72px;
    }

    h1 {
      margin-top: 8px;
      color: var(--dark);
      font-size: 36px;
      line-height: 1.2;
    }

    .lead {
      max-width: 720px;
      margin: 12px 0 32px;
      color: var(--dark);
    }

    @media (max-width: 599px) {
      .page {
        padding-top: 32px;
      }

      h1 {
        font-size: 28px;
      }
    }
  `,
})
export class FaqPageComponent {}
