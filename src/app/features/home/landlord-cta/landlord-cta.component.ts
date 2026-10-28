import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';

/**
 * "Have a place students will love?" banner.
 * Visitors go to the landlord sign up, landlords go to their dashboard,
 * and students and admins get no button because it is not meant for them.
 */
@Component({
  selector: 'app-landlord-cta',
  imports: [RouterLink],
  templateUrl: './landlord-cta.component.html',
  styleUrl: './landlord-cta.component.css',
})
export class LandlordCtaComponent {
  private readonly auth = inject(AuthStateService);

  // Where the button goes, or null when this person gets no button
  readonly destination = computed(() => {
    switch (this.auth.role()) {
      case null:
        return '/register';
      case 'LANDLORD':
        return '/landlord';
      default:
        return null;
    }
  });

  // Only the sign up page needs ?role=landlord, so that the "Landlord" tab is already chosen
  readonly queryParams = computed(() => (this.auth.role() === null ? { role: 'landlord' } : null));
}
