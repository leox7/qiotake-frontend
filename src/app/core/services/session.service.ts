import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import { TokenStorageService } from './token-storage.service';
import { ToastService } from './toast.service';

/** The two fields of the backend answer to POST /api/auth/refresh that we need. */
interface RefreshResponse {
  token: string;
  refreshToken: string;
}

/**
 * Keeps the login session alive (refresh) and ends it (logout).
 *
 * It lives in core/ and not in features/auth, because the interceptor and the navbar need it,
 * and only features/auth would otherwise own it (a feature must never be imported by others).
 *
 * This is the ONLY place that sends the refresh token to the backend, and only to the
 * refresh and logout endpoints. It always travels in the request body, never in a header.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  /**
   * The refresh call that is running right now, or null when none is running.
   *
   * WHY we keep it: the backend gives each refresh token ONE use. If five requests fail with 401
   * at the same moment and each one called refresh, the first would work and the other four would
   * send an already-used token. The backend would think the token was stolen and log the user out
   * everywhere. So everybody who needs a refresh shares this one call.
   */
  private refreshInFlight: Observable<string> | null = null;

  /**
   * Gets a new access token using the stored refresh token. Emits the new access token.
   * Fails when there is no refresh token or when the backend refuses it (expired, used, revoked).
   */
  refreshAccessToken(): Observable<string> {
    // Step 1: a refresh is already running? Do not start another one, wait for that one.
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token stored'));
    }

    // Step 2: start the one and only refresh call.
    this.refreshInFlight = this.http
      .post<RefreshResponse>(`${this.authUrl}/refresh`, { refreshToken })
      .pipe(
        // Step 3: the backend sends a NEW refresh token every time (the old one is now dead),
        // so we save both. Saving here means every waiting request finds the new token in storage.
        tap((response) => this.tokens.saveTokens(response.token, response.refreshToken)),
        map((response) => response.token),
        // Step 4: when the call ends (success OR failure) free the slot, so a refresh
        // later in the session (10 minutes from now) can start a fresh call.
        finalize(() => (this.refreshInFlight = null)),
        // Step 5: shareReplay lets many subscribers use ONE http call and gives each of them the
        // same answer, even those who started waiting after it already finished.
        shareReplay(1),
      );

    return this.refreshInFlight;
  }

  /**
   * The session cannot be saved (the refresh failed): forget everything and ask for a new login.
   * The page the user was on goes into returnUrl, so after logging in they land back there.
   */
  endExpiredSession(): void {
    // Several waiting requests fail together and each one calls this. Only the first one
    // finds someone logged in, so the toast and the redirect happen once.
    if (!this.authState.isLoggedIn()) {
      return;
    }

    this.authState.signOut();
    this.toast.error('Your session ended, please log in again');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  /**
   * Real logout: tell the backend to kill the refresh token, then forget everything here.
   * The local cleanup runs even if the backend call fails (offline, server down): the user
   * asked to leave, so they must never stay "logged in" on this device.
   */
  logout(): void {
    const refreshToken = this.tokens.getRefreshToken();

    const finishLogout = () => {
      this.authState.signOut();
      this.router.navigateByUrl('/');
      this.toast.success('You have been logged out');
    };

    // No refresh token stored: there is nothing to cancel on the backend.
    if (!refreshToken) {
      finishLogout();
      return;
    }

    // Both outcomes (next and error) do the same cleanup.
    this.http.post<void>(`${this.authUrl}/logout`, { refreshToken }).subscribe({
      next: finishLogout,
      error: finishLogout,
    });
  }
}
