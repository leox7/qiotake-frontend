import { TestBed } from '@angular/core/testing';
import { User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let storage: TokenStorageService;
  const user = { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@students.kcau.ac.ke', role: 'STUDENT' } as User;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    storage = TestBed.inject(TokenStorageService);
  });

  it('keeps the access token in sessionStorage and the refresh token in localStorage', () => {
    storage.saveTokens('access-1', 'refresh-1', '2026-11-07T10:00:00');

    expect(sessionStorage.getItem('qiotake_access_token')).toBe('access-1');
    expect(localStorage.getItem('qiotake_refresh_token')).toBe('refresh-1');
    expect(localStorage.getItem('qiotake_access_token')).toBeNull();
    expect(storage.getRefreshTokenExpiresAt()).toBe('2026-11-07T10:00:00');
  });

  it('reports who is logged in', () => {
    storage.saveTokens('access-1', 'refresh-1');
    storage.saveUser(user);

    expect(storage.isLoggedIn()).toBe(true);
    expect(storage.getRole()).toBe('STUDENT');
  });

  it('clear() forgets the tokens, the user and the session end date', () => {
    storage.saveTokens('access-1', 'refresh-1', '2026-11-07T10:00:00');
    storage.saveUser(user);

    storage.clear();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(storage.getRefreshTokenExpiresAt()).toBeNull();
    expect(storage.getUser()).toBeNull();
    expect(storage.isLoggedIn()).toBe(false);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('does not trust damaged user text in the storage', () => {
    storage.saveTokens('access-1', 'refresh-1');
    sessionStorage.setItem('qiotake_user', '{not json');

    expect(storage.getUser()).toBeNull();
  });
});
