import { Routes } from '@angular/router';

// The FAQ and the contact form are reusable sections (they are also used on the home page),
// so these routes load small "page" components that wrap them.
export const INFO_ROUTES: Routes = [
  {
    path: 'faq',
    title: 'FAQ',
    loadComponent: () => import('./faq/faq-page.component').then((m) => m.FaqPageComponent),
  },
  {
    path: 'contact',
    title: 'Contact us',
    loadComponent: () => import('./contact/contact-page.component').then((m) => m.ContactPageComponent),
  },
  {
    path: 'terms',
    title: 'Terms and Conditions',
    loadComponent: () => import('./legal/terms-page.component').then((m) => m.TermsPageComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    loadComponent: () => import('./legal/privacy-page.component').then((m) => m.PrivacyPageComponent),
  },
];
