import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/** A "coming soon" page. The portal layout already shows the page header, so only the message is here. */
@Component({
  selector: 'app-landlord-placeholder',
  imports: [EmptyStateComponent],
  templateUrl: './landlord-placeholder.component.html',
})
export class LandlordPlaceholderComponent {}
