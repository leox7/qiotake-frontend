import { Component } from '@angular/core';
import { PortalLayoutComponent, PortalMenuItem } from '../../../shared/layout/portal-layout/portal-layout.component';

/**
 * The frame around every /admin page: the portal layout with the dark sidebar and the admin's menu.
 * The pages (overview, users ...) appear inside the layout's <router-outlet>.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [PortalLayoutComponent],
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {
  readonly menu: PortalMenuItem[] = [
    // exact: every other admin address starts with /admin, so Overview is only active on /admin itself
    { label: 'Overview', route: '/admin', icon: 'dashboard', exact: true },
    { label: 'Users', route: '/admin/users', icon: 'users' },
    { label: 'Listings', route: '/admin/listings', icon: 'listings' },
    { label: 'Bookings', route: '/admin/bookings', icon: 'bookings' },
    { label: 'Payments', route: '/admin/payments', icon: 'payments' },
    { label: 'Audit log', route: '/admin/audit-log', icon: 'audit' },
    { label: 'Reports', route: '/admin/reports', icon: 'reports' },
    { label: 'Profile', route: '/admin/profile', icon: 'profile' },
  ];
}
