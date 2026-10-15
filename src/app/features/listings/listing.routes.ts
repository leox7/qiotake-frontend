import { Routes } from '@angular/router';

// These are relative to /listings (set in app.routes.ts).
export const LISTING_ROUTES: Routes = [
  {
    path: '',
    title: 'Browse homes',
    loadComponent: () =>
      import('./listing-list/listing-list.component').then((m) => m.ListingListComponent),
  },
  {
    path: ':id',
    title: 'Home details',
    loadComponent: () =>
      import('./listing-detail/listing-detail.component').then((m) => m.ListingDetailComponent),
  },
];
