import { Role } from './user.model';

/**
 * The logged in user's own profile, exactly as GET and PATCH /api/users/me send it (ProfileResponseDto).
 * The first six fields exist for every role. The others are only sent for the role they belong to:
 * the backend leaves a field out of the JSON when it is null, so here they are optional.
 */
export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** ISO date-time of when the account was created. */
  createdAt: string;
  /** "ACTIVE", or "DEACTIVATED" once an admin has switched the account off. */
  status: string;

  // students
  university?: string;
  activeBookings?: number;
  pendingRequests?: number;
  paymentsMade?: number;

  // landlords. The backend already masks the phone number and the national ID.
  phoneNumber?: string;
  nationalIdNumber?: string;
  verified?: boolean;
  listingCount?: number;
}

/** What PATCH /api/users/me accepts (ProfileUpdateDto). Only the names can change. */
export interface ProfileUpdate {
  firstName: string;
  lastName: string;
}
