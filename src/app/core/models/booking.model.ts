/** Must match the backend enum BookingStatus. */
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VACATED';

/** A booking request. TODO: fill in the real fields from the backend (Swagger) in the bookings prompt. */
export interface Booking {
  id: number;
}
