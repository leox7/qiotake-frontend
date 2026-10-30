/**
 * The topics on the contact form. The backend (InquirySubject enum) reads and sends the readable
 * label, so these exact texts are what we send.
 */
export const INQUIRY_SUBJECTS = [
  'General question',
  'Booking help',
  'Payment help',
  'Landlord account',
  'Report a problem',
] as const;

export type InquirySubject = (typeof INQUIRY_SUBJECTS)[number];

/** The body of POST /api/inquiries (InquiryRequestDto). The limits match the backend's. */
export interface InquiryRequest {
  fullName: string; // 1 to 100 characters
  email: string; // a valid email, up to 150 characters
  subject: InquirySubject;
  message: string; // 1 to 500 characters
}

export const MAX_INQUIRY_NAME_LENGTH = 100;
export const MAX_INQUIRY_EMAIL_LENGTH = 150;
export const MAX_INQUIRY_MESSAGE_LENGTH = 500;

/** What POST /api/inquiries answers (InquiryResponseDto). Only the reference is shown to the visitor. */
export interface InquiryResponse {
  id: number;
  /** A number the visitor can quote, for example "INQ-000123". */
  reference: string;
}
