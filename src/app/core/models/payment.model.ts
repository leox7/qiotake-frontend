/**
 * Must match the backend enum PaymentStatus.
 * PAID is the success status (the backend does not use the word SUCCESS).
 * UNKNOWN means M-Pesa has not told us yet whether the money moved, so the screen says "Confirming".
 */
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'UNKNOWN';

/** Must match the backend enum PaymentType. The deposit is paid first, then the monthly rent. */
export type PaymentType = 'DEPOSIT' | 'RENT';

/** Must match the backend enum PaymentProviderType. SIMULATED means no real money moves. */
export type PaymentProvider = 'SIMULATED' | 'MPESA';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  DEPOSIT: 'Deposit',
  RENT: 'Rent',
};

/**
 * What a student sends to POST /api/payments (PaymentRequestDto).
 * There is no amount: the backend takes it from the listing price.
 */
export interface PaymentRequest {
  bookingId: number;
  type: PaymentType;
  /** Any common Kenyan format. The backend turns it into 254XXXXXXXXX. */
  phoneNumber: string;
}

/** A payment, exactly as the backend sends it (PaymentResponseDto). */
export interface Payment {
  id: number;
  bookingId: number;
  listingTitle: string;
  type: PaymentType;
  /** In KES. */
  amount: number;
  status: PaymentStatus;
  provider: PaymentProvider;
  /** Always masked by the backend, for example 2547****678. */
  phoneNumber: string;
  /** null until M-Pesa has confirmed (and always null with the simulated provider). */
  mpesaReceiptNumber: string | null;
  /** ISO date-time. */
  dateCreated: string;
  /** ISO date-time of when the payment became PAID. null for every other status. */
  paidAt: string | null;
  /** A short friendly reason, for FAILED payments only. null otherwise. */
  failureReason: string | null;
}

/**
 * A payment as the landlord and the admin see it (PaymentWithStudentResponseDto): the same, plus who paid.
 * Only the name, never the phone number or the email.
 */
export interface PaymentWithStudent extends Payment {
  studentFirstName: string;
  studentLastName: string;
}

/** GET /api/payments/config (PaymentConfigDto): which payment mode is switched on. Nothing secret. */
export interface PaymentConfig {
  provider: PaymentProvider;
}
