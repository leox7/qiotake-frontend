import { Routes } from '@angular/router';

export const ERROR_ROUTES: Routes = [
  {
    path: 'forbidden',
    title: 'No access',
    loadComponent: () =>
      import('./forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
  },
  {
    // "**" matches every address that nothing else matched.
    path: '**',
    title: 'Page not found',
    loadComponent: () =>
      import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
