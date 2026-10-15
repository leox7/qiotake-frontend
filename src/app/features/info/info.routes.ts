import { Routes } from '@angular/router';

export const INFO_ROUTES: Routes = [
  {
    path: 'faq',
    title: 'FAQ',
    loadComponent: () => import('./faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'contact',
    title: 'Contact us',
    loadComponent: () => import('./contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'terms',
    title: 'Terms and Conditions',
    loadComponent: () => import('./terms/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    loadComponent: () => import('./privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
];
