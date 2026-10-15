/** The colour family of a status badge. */
export type StatusTone = 'success' | 'warning' | 'neutral' | 'error';

export interface StatusInfo {
  tone: StatusTone;
  label: string;
}

/**
 * One line for every status the backend can send, from its three enums:
 * ListingStatus, BookingStatus and PaymentStatus.
 * "PENDING" exists in both BookingStatus and PaymentStatus and means the same thing in both
 * (waiting), so one line covers both.
 */
const STATUS_INFO: Record<string, StatusInfo> = {
  // ListingStatus
  AVAILABLE: { tone: 'success', label: 'Available' },
  OCCUPIED: { tone: 'neutral', label: 'Occupied' },

  // BookingStatus
  PENDING: { tone: 'warning', label: 'Pending' },
  CONFIRMED: { tone: 'success', label: 'Confirmed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  VACATED: { tone: 'neutral', label: 'Vacated' },

  // PaymentStatus
  PAID: { tone: 'success', label: 'Paid' },
  FAILED: { tone: 'error', label: 'Failed' },
  // UNKNOWN: M-Pesa has not answered yet, so the money may or may not have moved. Never call it "failed".
  UNKNOWN: { tone: 'warning', label: 'Confirming' },
};

/** Turns a backend status such as "UNKNOWN" into a badge colour and a friendly word. */
export function getStatusInfo(status: string): StatusInfo {
  const known = STATUS_INFO[status];
  if (known) {
    return known;
  }

  // A status we have not heard of (for example a new one added to the backend later):
  // show it in plain words instead of breaking the page. "SOME_STATUS" -> "Some status"
  const words = status.toLowerCase().replaceAll('_', ' ');
  return { tone: 'neutral', label: words.charAt(0).toUpperCase() + words.slice(1) };
}
