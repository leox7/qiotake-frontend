import { Routes } from '@angular/router';

// These are relative to /admin (set in app.routes.ts, which also adds /admin/profile and /admin/reports and the layout around them).
// `data.header` is the eyebrow and title that portal-layout shows above each page. Admin pages have no header button.
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Admin overview',
    data: { header: { eyebrow: 'Overview', heading: 'Dashboard' } },
    loadComponent: () => import('./admin-overview/admin-overview.component').then((m) => m.AdminOverviewComponent),
  },
  {
    path: 'users',
    title: 'Users',
    data: { header: { eyebrow: 'Manage', heading: 'Users' } },
    loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'listings',
    title: 'All listings',
    data: { header: { eyebrow: 'Manage', heading: 'Listings' } },
    loadComponent: () => import('./admin-listings/admin-listings.component').then((m) => m.AdminListingsComponent),
  },
  {
    path: 'bookings',
    title: 'All bookings',
    data: { header: { eyebrow: 'Activity', heading: 'Bookings' } },
    loadComponent: () => import('./admin-bookings/admin-bookings.component').then((m) => m.AdminBookingsComponent),
  },
  {
    path: 'payments',
    title: 'All payments',
    data: { header: { eyebrow: 'Activity', heading: 'Payments' } },
    loadComponent: () => import('./admin-payments/admin-payments.component').then((m) => m.AdminPaymentsComponent),
  },
  {
    path: 'audit-log',
    title: 'Audit log',
    data: { header: { eyebrow: 'Security', heading: 'Audit log' } },
    loadComponent: () => import('./audit-log/audit-log.component').then((m) => m.AuditLogComponent),
  },
];
