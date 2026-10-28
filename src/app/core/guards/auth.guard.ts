import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * A guard decides whether a route may open. Returning `true` lets the user in;
 * returning a URL tree redirects them. Here: not logged in -> go to /login.
 * It reads the browser storage (not a value in memory), so it still works after a page refresh.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  if (inject(TokenStorageService).isLoggedIn()) {
    return true;
  }

  // Remember where the user wanted to go, so login can send them back later.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
