/**
 * The numbers on the landlord dashboard, exactly as GET /api/landlord/stats sends them (LandlordStatsDto).
 * Money is in KES.
 */
export interface LandlordStats {
  /** The backend counts ALL of the landlord's listings here (available and occupied). */
  activeListings: number;
  /** Booking requests waiting for the landlord's answer. */
  pendingRequests: number;
  incomeThisMonth: number;
  incomeLastMonth: number;
}

/** What GET /api/notifications sends for each notification (NotificationResponseDto). */
export interface LandlordNotification {
  id: number;
  message: string;
  /** Must match the backend enum NotificationType. */
  type: 'BOOKING' | 'PAYMENT' | 'RENT_DUE';
  read: boolean;
  /** ISO date-time, for example "2026-10-28T14:03:11". */
  dateCreated: string;
}
