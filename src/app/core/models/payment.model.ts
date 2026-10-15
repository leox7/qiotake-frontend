/**
 * Must match the backend enum PaymentStatus.
 * UNKNOWN means M-Pesa has not told us yet whether the money moved, so the screen says "Confirming".
 */
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'UNKNOWN';

/** An M-Pesa payment. TODO: fill in the real fields from the backend (Swagger) in the payments prompt. */
export interface Payment {
  id: number;
}
