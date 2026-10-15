import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from '../../core/services/auth-state.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import {
  LoginRequest,
  LoginResponse,
  OtpResponse,
  RegisterLandlordRequest,
  RegisterResponse,
  RegisterStudentRequest,
  ResendOtpRequest,
  VerifyOtpRequest,
} from './auth.models';

/**
 * All calls to /api/auth. Each method returns an Observable: nothing is sent until
 * the page calls .subscribe(), and the page decides what to do with the answer or the error.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly authState = inject(AuthStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  registerStudent(request: RegisterStudentRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register/student`, request);
  }

  registerLandlord(request: RegisterLandlordRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register/landlord`, request);
  }

  /** Step one: checks the password and makes the backend email a 6 digit code. Nobody is logged in yet. */
  login(request: LoginRequest): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.baseUrl}/login`, request);
  }

  /** Step two: the right code logs the user in. We keep the tokens and the user details. */
  verifyOtp(request: VerifyOtpRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/verify-otp`, request).pipe(
      // tap = "do something with the answer, then pass it on unchanged"
      tap((response) => {
        this.tokens.saveTokens(response.token, response.refreshToken);
        // setUser saves the user details AND tells the navbar (and every other screen) who logged in.
        this.authState.setUser({
          id: response.id,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          role: response.role,
        });
      }),
    );
  }

  /** Emails a new code. The backend answers the same for every email, and 429 if asked again within 60 seconds. */
  resendOtp(request: ResendOtpRequest): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.baseUrl}/resend-otp`, request);
  }
}
