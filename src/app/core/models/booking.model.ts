/** Must match the backend enum BookingStatus. */
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VACATED';

/**
 * The statuses that mean "this booking is over". Only the landlord's Booking requests page uses this list,
 * because the backend has no status filter or counts for landlords. A student's tabs use the backend's PAST filter.
 */
export const PAST_STATUSES: BookingStatus[] = ['CANCELLED', 'VACATED'];

/** What the student has to pay next for a booking. NONE: nothing is due (not confirmed, or everything is paid). */
export type NextPaymentType = 'DEPOSIT' | 'RENT' | 'NONE';

/**
 * The tabs of My bookings. The backend understands these as the `status` of GET /api/bookings/my.
 * PAST means CANCELLED and VACATED together.
 */
export type BookingTab = BookingStatus | 'PAST';

/** The numbers on the tabs, from GET /api/bookings/my/counts (BookingCountsDto). */
export interface BookingCounts {
  all: number;
  pending: number;
  confirmed: number;
  past: number;
}

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
  /** The listing's main photo path (pass it through getImageUrl), or null when the listing has none. */
  listingImageUrl: string | null;
  /** True when a PAID deposit exists for this booking. */
  depositPaid: boolean;
  /** What is due next. The backend works it out, the browser must not. */
  nextPaymentType: NextPaymentType;
  /** "yyyy-MM-dd". null when nextPaymentType is NONE. */
  nextPaymentDueDate: string | null;
  /** In KES, the price the backend will charge. null when nextPaymentType is NONE. */
  nextPaymentAmount: number | null;
}
