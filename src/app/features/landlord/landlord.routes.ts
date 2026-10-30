import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

// These are relative to /landlord (set in app.routes.ts, which also adds /landlord/profile and the layout around them).
// `data.header` is the eyebrow, title and optional button that portal-layout shows above each page.
export const LANDLORD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Landlord dashboard',
    data: {
      header: {
        eyebrow: 'Overview',
        heading: 'Dashboard',
        actionLabel: 'Add listing',
        actionLink: '/landlord/listings/new',
      },
    },
    loadComponent: () =>
      import('./landlord-dashboard/landlord-dashboard.component').then((m) => m.LandlordDashboardComponent),
  },

  {
    path: 'listings',
    title: 'My listings',
    data: {
      header: {
        eyebrow: 'Manage',
        heading: 'My listings',
        actionLabel: '+ Add listing',
        actionLink: '/landlord/listings/new',
      },
    },
    loadComponent: () => import('./my-listings/my-listings.component').then((m) => m.MyListingsComponent),
  },
  // The form asks "Leave without saving?" (unsavedChangesGuard) when the user leaves a form with unsaved work.
  {
    path: 'listings/new',
    title: 'Add listing',
    data: { header: { eyebrow: 'Manage', heading: 'Add a listing' } },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./listing-form/listing-form.component').then((m) => m.ListingFormComponent),
  },
  {
    path: 'listings/:id/edit',
    title: 'Edit listing',
    data: { header: { eyebrow: 'Manage', heading: 'Edit listing' } },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./listing-form/listing-form.component').then((m) => m.ListingFormComponent),
  },
  {
    path: 'bookings',
    title: 'Booking requests',
    data: { header: { eyebrow: 'Requests', heading: 'Booking requests' } },
    loadComponent: () =>
      import('./booking-requests/booking-requests.component').then((m) => m.BookingRequestsComponent),
  },
  {
    path: 'payments',
    title: 'Payments',
    data: { header: { eyebrow: 'Income', heading: 'Payments' } },
    loadComponent: () => import('./payments/payments.component').then((m) => m.PaymentsComponent),
  },

  {
    path: 'notifications',
    title: 'Notifications',
    data: { header: { eyebrow: 'Updates', heading: 'Notifications' } },
    loadComponent: () =>
      import('./notifications/notifications.component').then((m) => m.NotificationsComponent),
  },
];
