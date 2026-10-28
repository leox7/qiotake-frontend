import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';
import { TokenStorageService } from '../services/token-storage.service';

// Login, OTP, resend, register, refresh and logout all live under /auth. If THEY answer 401
// (wrong password, wrong code, dead refresh token) it is not an "expired access token" problem,
// so we must never try to refresh because of them. That would also loop forever on /auth/refresh.
const AUTH_URL = `${environment.apiBaseUrl}/auth/`;

/** Copy of the request with the access token added. (Requests are read-only, so we make a copy.) */
function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  // Only add the token to calls to OUR backend, never to other websites.
  if (token && req.url.startsWith(environment.apiBaseUrl)) {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return req;
}

/**
 * An interceptor sits between our code and the network. Every HTTP request passes through here.
 *
 * Job 1: attach the ACCESS token to every call to our backend.
 *        (The refresh token is never added here. SessionService sends it only to refresh and logout.)
 * Job 2: when the backend says 401 (access token expired), get a new one and retry the call once.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const session = inject(SessionService);

  // Step 1: remember WHICH token this request was sent with. We need it in step 3 below.
  const tokenUsed = tokens.getAccessToken();

  return next(withToken(req, tokenUsed)).pipe(
    catchError((error: unknown) => {
      // Step 2: only a 401 on a normal API call can be fixed by refreshing. Everything else passes through.
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      const isAuthCall = req.url.startsWith(AUTH_URL);

      // No token was sent = the visitor was not logged in, so there is no session to refresh.
      // No refresh token stored = we have nothing to refresh with.
      if (!is401 || isAuthCall || !tokenUsed || !tokens.getRefreshToken()) {
        return throwError(() => error);
      }

      // Step 3: maybe another request already refreshed while ours was travelling.
      // Then the stored token is newer than the one we sent: just retry with it, no new refresh.
      const storedToken = tokens.getAccessToken();
      if (storedToken && storedToken !== tokenUsed) {
        return next(withToken(req, storedToken));
      }

      // Step 4: ask for a new access token. If many requests got here at the same moment,
      // SessionService makes only ONE refresh call and they all wait for it.
      return session.refreshAccessToken().pipe(
        // Refresh failed (refresh token expired, used or revoked, or no connection):
        // the session is over. Clear everything, go to /login, and pass the original error on.
        catchError(() => {
          session.endExpiredSession();
          return throwError(() => error);
        }),
        // Step 5: refresh worked. Send the original request again with the new token, ONCE.
        // If this retry also fails (even with 401) the error goes to the page, with no second loop.
        switchMap((newToken) => next(withToken(req, newToken))),
      );
    }),
  );
};
