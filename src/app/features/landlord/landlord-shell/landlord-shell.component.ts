import { Component, computed, inject } from '@angular/core';
import { PortalLayoutComponent, PortalMenuItem } from '../../../shared/layout/portal-layout/portal-layout.component';
import { LandlordService } from '../landlord.service';

/**
 * The frame around every /landlord page: the portal layout with the landlord's menu.
 * The pages (dashboard, listings ...) appear inside the layout's <router-outlet>.
 */
@Component({
  selector: 'app-landlord-shell',
  imports: [PortalLayoutComponent],
  templateUrl: './landlord-shell.component.html',
})
export class LandlordShellComponent {
  private readonly landlordService = inject(LandlordService);

  // Rebuilt whenever the number of pending requests changes, so the dot on "Booking requests" stays right.
  readonly menu = computed<PortalMenuItem[]>(() => [
    { label: 'Dashboard', route: '/landlord', icon: 'dashboard', exact: true },
    { label: 'My listings', route: '/landlord/listings', icon: 'listings' },
    {
      label: 'Booking requests',
      route: '/landlord/bookings',
      icon: 'bookings',
      badge: this.landlordService.pendingCount(),
    },
    { label: 'Payments', route: '/landlord/payments', icon: 'payments' },
    // The backend has GET /api/notifications for landlords, so this page exists.
    { label: 'Notifications', route: '/landlord/notifications', icon: 'notifications' },
    { label: 'Reports', route: '/landlord/reports', icon: 'reports' },
    { label: 'Profile', route: '/landlord/profile', icon: 'profile' },
  ]);

  constructor() {
    // The number comes from the stats endpoint. If this fails the dot is simply not shown.
    this.landlordService.refreshPendingCount();
  }
}
