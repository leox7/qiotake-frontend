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
    title: 'Home',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  // /login, /register, /verify-otp
  { path: '', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },

  // /listings, /listings/:id
  {
    path: 'listings',
    loadChildren: () => import('./features/listings/listing.routes').then((m) => m.LISTING_ROUTES),
  },

  // Student pages: must be logged in.
  {
    path: 'bookings',
    canActivate: [authGuard],
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
  {
    path: 'landlord',
    canActivate: [roleGuard],
    data: { role: 'LANDLORD' },
    title: 'Landlord dashboard',
    loadComponent: () =>
      import('./features/landlord/landlord-dashboard/landlord-dashboard.component').then(
        (m) => m.LandlordDashboardComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    title: 'Admin dashboard',
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
  },

  // /faq, /contact, /terms, /privacy
  { path: '', loadChildren: () => import('./features/info/info.routes').then((m) => m.INFO_ROUTES) },

  // Anything unknown goes back to the home page. Must stay LAST.
  { path: '**', redirectTo: '' },
];
