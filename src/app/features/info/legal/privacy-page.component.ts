import { Component } from '@angular/core';
import { LegalPageComponent } from './legal-page.component';
import { PRIVACY_SECTIONS } from './privacy.data';

/** The /privacy page. The text lives in privacy.data.ts. */
@Component({
  selector: 'app-privacy-page',
  imports: [LegalPageComponent],
  template: `<app-legal-page heading="Privacy Policy" [sections]="sections" />`,
})
export class PrivacyPageComponent {
  readonly sections = PRIVACY_SECTIONS;
}
