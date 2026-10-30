import { BookingStatus } from '../../core/models/booking.model';
import { PaymentStatus } from '../../core/models/payment.model';
import { getStatusInfo } from '../../core/utils/status-tone';

/**
 * The options of the report, exactly the ones the backend understands
 * (GET /api/reports/landlord/view and GET /api/admin/reports/view). Nothing here is invented.
 * Landlord and admin have the SAME options; the landlord's report only counts their own listings (the backend does that).
 */

/** How the bookings and payments are grouped: by status (PENDING, PAID ...) or by month (2026-10). */
export type ReportGroupBy = 'STATUS' | 'MONTH';

/** The order of the groups: by group name, or by how many are in the group. */
export type ReportSort = 'GROUP_ASC' | 'GROUP_DESC' | 'COUNT_ASC' | 'COUNT_DESC';

/** The parts of the report page. At least one is needed. */
export type ReportSection = 'LISTINGS' | 'BOOKINGS' | 'PAYMENTS' | 'INCOME';

/** What the person chose in the report builder. An empty text means "not chosen" (the backend then uses its default). */
export interface ReportOptions {
  /** "yyyy-MM-dd". Empty: from the very beginning. */
  from: string;
  /** "yyyy-MM-dd". Empty: until today. */
  to: string;
  /** Empty: every booking status. */
  bookingStatus: '' | BookingStatus;
  /** Empty: every payment status. */
  paymentStatus: '' | PaymentStatus;
  groupBy: ReportGroupBy;
  sort: ReportSort;
  sections: ReportSection[];
}

export const ALL_SECTIONS: ReportSection[] = ['LISTINGS', 'BOOKINGS', 'PAYMENTS', 'INCOME'];

/** What the builder starts with the first time. */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  from: '',
  to: '',
  bookingStatus: '',
  paymentStatus: '',
  groupBy: 'STATUS',
  sort: 'GROUP_ASC',
  sections: ALL_SECTIONS,
};

// ---------- The choices of each dropdown. To add an option later, add a line here. ----------

export const GROUP_BY_CHOICES: { value: ReportGroupBy; label: string }[] = [
  { value: 'STATUS', label: 'By status' },
  { value: 'MONTH', label: 'By month' },
];

export const SORT_CHOICES: { value: ReportSort; label: string }[] = [
  { value: 'GROUP_ASC', label: 'Group name, A to Z (oldest month first)' },
  { value: 'GROUP_DESC', label: 'Group name, Z to A (newest month first)' },
  { value: 'COUNT_ASC', label: 'Smallest count first' },
  { value: 'COUNT_DESC', label: 'Biggest count first' },
];

export const SECTION_CHOICES: { value: ReportSection; label: string }[] = [
  { value: 'LISTINGS', label: 'Listings' },
  { value: 'BOOKINGS', label: 'Bookings' },
  { value: 'PAYMENTS', label: 'Payments' },
  { value: 'INCOME', label: 'Income' },
];

const BOOKING_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'VACATED'];
const PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'PENDING', 'UNKNOWN', 'FAILED'];

// The same friendly words as the status badges everywhere else ("Confirming" for UNKNOWN)
export const BOOKING_STATUS_CHOICES = [
  { value: '' as const, label: 'All booking statuses' },
  ...BOOKING_STATUSES.map((value) => ({ value, label: getStatusInfo(value).label })),
];

export const PAYMENT_STATUS_CHOICES = [
  { value: '' as const, label: 'All payment statuses' },
  ...PAYMENT_STATUSES.map((value) => ({ value, label: getStatusInfo(value).label })),
];
