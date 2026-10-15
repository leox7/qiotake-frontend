import { Injectable } from '@angular/core';
import { Role, User } from '../models/user.model';

// Keys used inside the browser storage. Kept in one place so they are easy to find.
const ACCESS_TOKEN_KEY = 'qiotake_access_token';
const REFRESH_TOKEN_KEY = 'qiotake_refresh_token';
const USER_KEY = 'qiotake_user';

/**
 * Remembers who is logged in.
 *
 * - The access token (short-lived) goes in sessionStorage: it disappears when the tab closes.
 * - The refresh token (long-lived) goes in localStorage: it survives closing the browser.
 * - The basic user details (name, email, role) sit next to the access token, so they disappear with it.
 *
 * `providedIn: 'root'` means Angular creates ONE shared copy that any class can ask for.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  saveTokens(accessToken: string, refreshToken: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** Keeps the basic user details (id, name, email, role). Storage only holds text, so we save JSON. */
  saveUser(user: User): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** The saved user, or null when nobody is logged in (or the saved text is damaged). */
  getUser(): User | null {
    // Without an access token the saved user is out of date, so nobody counts as logged in.
    if (!this.getAccessToken()) {
      return null;
    }

    const text = sessionStorage.getItem(USER_KEY);
    if (!text) {
      return null;
    }

    // Someone could edit the storage by hand, so never trust that the text is valid JSON.
    try {
      return JSON.parse(text) as User;
    } catch {
      return null;
    }
  }

  getRole(): Role | null {
    return this.getUser()?.role ?? null;
  }

  /** True when an access token is stored. */
  isLoggedIn(): boolean {
    return this.getAccessToken() !== null;
  }

  /** Forget everything (used on logout). */
  clear(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
