import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

/**
 * The "who is logged in right now?" answer that screens can WATCH.
 *
 * A signal is a box that holds a value. When the value changes, every screen that reads it
 * updates by itself. TokenStorageService only remembers things; this service tells the screens.
 *
 * The login page (prompt 04) will call `setUser()` after the tokens are saved.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly tokens = inject(TokenStorageService);

  // Start from whatever the browser storage remembers (for example after a page refresh).
  private readonly user = signal<User | null>(this.tokens.getUser());

  /** The user's details, or null when logged out. */
  readonly currentUser = this.user.asReadonly();

  readonly isLoggedIn = computed(() => this.user() !== null);

  readonly role = computed(() => this.user()?.role ?? null);

  readonly fullName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  /** First letter of the first and last name, for the round avatar. Example: Jane Wanjiru -> JW */
  readonly initials = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  });

  /** Call after a successful login: saves the user and tells every screen. */
  setUser(user: User): void {
    this.tokens.saveUser(user);
    this.user.set(user);
  }

  /** Forgets the tokens and the user on this device. For a real logout use SessionService.logout(), which also tells the backend. */
  signOut(): void {
    this.tokens.clear();
    this.user.set(null);
  }
}
