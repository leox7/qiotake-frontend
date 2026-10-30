import { Role } from '../../core/models/user.model';

// These match the backend DTOs in the Spring Boot project (checked against /v3/api-docs).

/** POST /api/auth/register/student */
export interface RegisterStudentRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  university: string;
}

/** POST /api/auth/register/landlord */
export interface RegisterLandlordRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nationalIdNumber: string;
  phoneNumber: string;
}

/** What the backend answers after a successful registration (the password is never sent back). */
export interface RegisterResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  message: string;
  createdAt: string | null;
}

/** POST /api/auth/login (step one: password) */
export interface LoginRequest {
  email: string;
  password: string;
}

/** The answer to login and resend-otp: "a code was sent". The code itself only travels by email. */
export interface OtpResponse {
  email: string;
  message: string;
}

/** POST /api/auth/verify-otp (step two: the 6 digit code) */
export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

/** POST /api/auth/resend-otp */
export interface ResendOtpRequest {
  email: string;
}

/** The answer to verify-otp: who logged in, plus the two tokens. */
export interface LoginResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** The short-lived access token (10 minutes). */
  token: string;
  /** The long-lived refresh token (7 days). */
  refreshToken: string;
  /** ISO date-time of when that refresh token stops working, so the profile can say when the session ends. */
  refreshTokenExpiresAt: string | null;
  message: string;
}
