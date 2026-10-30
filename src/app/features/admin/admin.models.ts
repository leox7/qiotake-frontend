import { Booking } from '../../core/models/booking.model';
import { Listing } from '../../core/models/listing.model';
import { Role } from '../../core/models/user.model';

/** The numbers on the admin overview, exactly as GET /api/admin/stats sends them (AdminStatsDto). Money is in KES. */
export interface AdminStats {
  totalUsers: number;
  totalListings: number;
  newListingsThisMonth: number;
  pendingBookings: number;
  /** PAID payments only. */
  paymentsReceivedThisMonth: number;
  paymentsReceivedLastMonth: number;
}

/** One user of GET /api/admin/users (UserResponseDto). */
export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** ISO date-time. */
  createdAt: string | null;
  /** false once an admin has deactivated the account. */
  enabled: boolean | null;
  /** The landlord's verified flag (they posted a first listing). null for students and admins. */
  verified: boolean | null;
  /** Only for landlords, and ALWAYS masked by the backend, for example "****5678". */
  nationalIdNumber?: string | null;
}

/** What POST /api/admin/admins needs (AdminRegisterDto). The role is never sent: the backend makes the account an ADMIN. */
export interface AdminRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** What GET /api/admin/users/{id}/national-id answers (NationalIdResponseDto). The only place a full ID ever comes. */
export interface NationalIdResponse {
  nationalIdNumber: string;
}

/** A listing as an admin sees it (AdminListingResponseDto): a normal listing plus the landlord's last name. */
export interface AdminListing extends Listing {
  landlordLastName: string | null;
}

/** A booking as an admin sees it (AdminBookingResponseDto): a normal booking plus who the student is. */
export interface AdminBooking extends Booking {
  studentLastName: string;
  studentEmail: string;
}

/** One row of GET /api/admin/audit-logs (AuditLogResponseDto). */
export interface AuditLog {
  id: number;
  /** ISO date-time. */
  timestamp: string;
  /** The backend sends the email of the person who did it, not their name. */
  actorEmail: string;
  /** For example "ADMIN", or "SYSTEM" / "PUBLIC" for things nobody logged in did. */
  actorRole: string | null;
  /** For example "booking.created". */
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: string | null;
}

/** The filters the audit log endpoint understands. An empty string means "no filter". They work together. */
export interface AuditLogFilters {
  action: string;
  /** Part of the actor's email. */
  actor: string;
  /** "yyyy-MM-dd", the first day to include. */
  from: string;
  /** "yyyy-MM-dd", the last day to include (the whole day counts). */
  to: string;
}
