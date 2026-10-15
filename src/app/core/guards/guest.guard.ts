import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { getHomeUrl } from '../utils/role-home';

/**
 * The opposite of authGuard: only people who are NOT logged in may open the route
 * (login and register). A logged-in user is sent to their own home page instead.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const role = auth.role();

  if (auth.isLoggedIn() && role) {
    return inject(Router).createUrlTree([getHomeUrl(role)]);
  }
  return true;
};
