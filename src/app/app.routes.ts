import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// Lazy loading: each page's code is downloaded only when the user first opens it.
// `loadComponent` lazy-loads one page; `loadChildren` lazy-loads a feature's own route file.
// `title` is the name shown in the browser tab: "<title> | QiotaKE" (see page-title.service.ts).
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Student homes near KCA',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  // /login, /register, /verify-otp
  { path: '', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },

  // /listings, /listings/:id
  {
    path: 'listings',
    loadChildren: () => import('./features/listings/listing.routes').then((m) => m.LISTING_ROUTES),
  },

  // Bookings are for students only: logged out goes to /login, landlord or admin goes to /forbidden.
  {
    path: 'bookings',
    canActivate: [roleGuard],
    data: { role: 'STUDENT' },
    children: [
      {
        path: '',
        title: 'My bookings',
        loadComponent: () =>
          import('./features/bookings/booking-list/booking-list.component').then(
            (m) => m.BookingListComponent,
          ),
      },
      {
        path: ':id/pay',
        title: 'Pay for your booking',
        loadComponent: () =>
          import('./features/payments/payment/payment.component').then((m) => m.PaymentComponent),
      },
    ],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    title: 'My profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },

  // Role-protected portals. The required role is read from `data` by roleGuard.
  // The landlord portal: the shell draws the sidebar layout, every child page appears inside it.
  {
    path: 'landlord',
    canActivate: [roleGuard],
    data: { role: 'LANDLORD' },
    loadComponent: () =>
      import('./features/landlord/landlord-shell/landlord-shell.component').then((m) => m.LandlordShellComponent),
    children: [
      // The profile page lives in features/profile. A feature may not import another feature,
      // so it is attached here in app.routes.ts, which is allowed to know every feature.
      {
        path: 'profile',
        title: 'My profile',
        data: { header: { eyebrow: 'Account settings', heading: 'My profile' } },
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      // Reports are one shared page (features/reports) that landlords and admins both use. It is attached
      // here for the same reason as the profile: a feature may not import another feature.
      {
        path: 'reports',
        title: 'Reports',
        data: { header: { eyebrow: 'Insights', heading: 'Reports' } },
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      // /landlord (dashboard), /landlord/listings, /bookings, /payments, /notifications
      {
        path: '',
        loadChildren: () => import('./features/landlord/landlord.routes').then((m) => m.LANDLORD_ROUTES),
      },
    ],
  },

  // The admin portal works like the landlord one: the shell draws the dark sidebar layout, the pages appear inside it.
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: 'profile',
        title: 'My profile',
        data: { header: { eyebrow: 'Account settings', heading: 'My profile' } },
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'reports',
        title: 'Reports',
        data: { header: { eyebrow: 'Insights', heading: 'Reports' } },
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      // /admin (overview), /admin/users, /listings, /bookings, /payments, /audit-log
      { path: '', loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
    ],
  },

  // /faq, /contact, /terms, /privacy
  { path: '', loadChildren: () => import('./features/info/info.routes').then((m) => m.INFO_ROUTES) },

  // /forbidden and the "page not found" page (the "**" inside). Must stay LAST,
  // because "**" matches every address that the routes above did not.
  { path: '', loadChildren: () => import('./features/errors/errors.routes').then((m) => m.ERROR_ROUTES) },
];
