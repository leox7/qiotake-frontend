import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile, ProfileUpdate } from '../../core/models/profile.model';

/** The calls to /api/users/me. The login token is added by jwt.interceptor.ts. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  private readonly url = `${environment.apiBaseUrl}/users/me`;

  /** The profile of whoever is logged in. The backend knows who from the token, so no id is sent. */
  getMe(): Observable<Profile> {
    return this.http.get<Profile>(this.url);
  }

  /** Changes the first and last name. Nothing else can be changed (no email, no role). */
  updateName(firstName: string, lastName: string): Observable<Profile> {
    const body: ProfileUpdate = { firstName, lastName };
    return this.http.patch<Profile>(this.url, body);
  }
}
