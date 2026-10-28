/** Must match the backend enum BookingStatus. */
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VACATED';

/**
 * The statuses that mean "this booking is over": cancelled before it started, or the student moved out.
 * The "Past" tab of My bookings uses this list. If the backend adds a new finished status, add it here.
 */
export const PAST_STATUSES: BookingStatus[] = ['CANCELLED', 'VACATED'];

/**
 * What a student sends to POST /api/bookings (BookingRequestDto).
 * Dates are plain "yyyy-MM-dd" strings, exactly what an <input type="date"> gives us.
 * The student is never sent: the backend takes them from the login token.
 */
export interface BookingRequest {
  listingId: number;
  /** Move-in day, "yyyy-MM-dd". */
  startDate: string;
  /** Move-out day, "yyyy-MM-dd". Must be after startDate. */
  endDate: string;
}

/** A booking, exactly as the backend sends it (BookingResponseDto). */
export interface Booking {
  id: number;
  listingId: number;
  listingTitle: string;
  listingLocation: string;
  /** Only the student's first name, so a landlord can see who is asking. */
  studentFirstName: string;
  /** "yyyy-MM-dd" */
  startDate: string;
  /** "yyyy-MM-dd" */
  endDate: string;
  status: BookingStatus;
  /** ISO date-time */
  dateCreated: string;
}
