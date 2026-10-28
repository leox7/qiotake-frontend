import { Component } from '@angular/core';
import { LegalPageComponent } from './legal-page.component';
import { TERMS_SECTIONS } from './terms.data';

/** The /terms page. The text lives in terms.data.ts. */
@Component({
  selector: 'app-terms-page',
  imports: [LegalPageComponent],
  template: `<app-legal-page heading="Terms and Conditions" [sections]="sections" />`,
})
export class TermsPageComponent {
  readonly sections = TERMS_SECTIONS;
}
