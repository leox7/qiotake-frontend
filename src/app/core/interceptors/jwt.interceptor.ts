import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * An interceptor sits between our code and the network. Every HTTP request passes through here,
 * so this is the one place where we attach the login token.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getAccessToken();

  // Only add the token to calls to OUR backend, never to other websites.
  if (token && req.url.startsWith(environment.apiBaseUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // TODO (session handling prompt): when the backend answers 401 (token expired), use the refresh
  // token to get a new access token and retry the request. Not implemented yet.
  return next(req);
};
