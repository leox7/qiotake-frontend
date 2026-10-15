import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Lets a route open only for one role. The required role is written on the route itself:
 *   { path: 'admin', canActivate: [roleGuard], data: { role: 'ADMIN' } }
 * Not logged in, or the wrong role -> go to /login.
 * TODO (session handling prompt): send a logged-in user with the wrong role to a 403 page instead.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const tokens = inject(TokenStorageService);

  if (tokens.isLoggedIn() && tokens.getRole() === route.data['role']) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
