import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Lets a route open only for one role. The required role is written on the route itself:
 *   { path: 'admin', canActivate: [roleGuard], data: { role: 'ADMIN' } }
 *
 * - Not logged in      -> /login (with returnUrl, so login brings them back here)
 * - Logged in, wrong role -> /forbidden
 *
 * It reads TokenStorageService (the browser storage), not a value in memory,
 * so it still works right after the user refreshes the page.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const role = inject(TokenStorageService).getRole();

  // getRole() is null when there is no access token (or no saved user): treat that as logged out.
  if (!role) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (role === route.data['role']) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
