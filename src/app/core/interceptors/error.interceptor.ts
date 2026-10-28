import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../services/toast.service';

/**
 * Shows a toast for the failures that no single page should have to handle itself:
 *   status 0 (no connection / backend down), 403 (not allowed), 5xx (server broke).
 *
 * Other errors (400, 401, 404, 409, 422, 429...) get NO toast here: the page that made the call
 * knows what they mean ("wrong password", "already booked") and shows its own message.
 *
 * The toast texts are fixed on purpose. We never show what the backend sent for these errors,
 * so stack traces and server internals can never reach the screen.
 *
 * The error is always passed on afterwards, so the page can still react to it (stop a spinner, ...).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Only our own backend. A failing image or other website is not our concern.
      if (error instanceof HttpErrorResponse && req.url.startsWith(environment.apiBaseUrl)) {
        if (error.status === 0) {
          toast.error('Cannot reach the server, check your connection');
        } else if (error.status === 403) {
          toast.error('You are not allowed to do that');
        } else if (error.status >= 500) {
          toast.error('Something went wrong on our side, please try again');
        }
      }

      return throwError(() => error);
    }),
  );
};
