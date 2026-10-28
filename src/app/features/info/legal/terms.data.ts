import { LegalSection } from './legal-page.component';
import { MPESA_SANDBOX_NOTICE } from './legal-constants';

// DRAFT text. A lawyer should review it before QiotaKE is used with real money and real students.
export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'about',
    title: 'About QiotaKE and these terms',
    paragraphs: [
      'QiotaKE helps students of KCA University in Nairobi find and book student homes, and helps landlords reach those students.',
      'By creating an account or using QiotaKE you agree to these terms. If you do not agree, please do not use the service.',
    ],
  },
  {
    id: 'who-can-use',
    title: 'Who can use QiotaKE',
    paragraphs: [
      'Students must register with a KCA University email address that ends with @students.kcau.ac.ke.',
      'Landlords register with their own email, phone number and national ID number.',
      'You must give true details and keep your login private. You are responsible for what happens under your account.',
    ],
  },
  {
    id: 'landlords-and-listings',
    title: 'Landlords and listings',
    paragraphs: [
      'A landlord account becomes active after the first listing is posted.',
      'Landlords must only post homes they are allowed to rent out, with true photos, prices and descriptions.',
      'QiotaKE may remove a listing that is false, misleading or unsafe.',
    ],
  },
  {
    id: 'bookings',
    title: 'Booking a home',
    paragraphs: [
      'A student sends a booking request with a move-in and a move-out date. Sending a request does not cost anything.',
      'The landlord decides whether to confirm the booking. After the landlord confirms, QiotaKE emails the landlord\'s phone number to the student.',
      'A student can cancel a booking while it is still pending. After it is confirmed, please contact us.',
    ],
  },
  {
    id: 'payments',
    title: 'Deposit and rent payments',
    paragraphs: [
      'For a confirmed booking the student pays a deposit equal to one month\'s rent, and then the rent every month.',
      'Payments are made with M-Pesa STK Push: a prompt is sent to your phone and you approve it with your M-Pesa PIN.',
      'If a payment shows "Confirming", we are still waiting for M-Pesa. Do not pay again until it shows a final result.',
      MPESA_SANDBOX_NOTICE,
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews and ratings',
    paragraphs: [
      'Only students who have finished a stay in a home can review it, and each student can review a home once.',
      'Reviews must be honest and respectful. QiotaKE may remove a review that contains abuse, private details or false claims.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    paragraphs: ['When you use QiotaKE you agree not to:'],
    bullets: [
      'give false details or pretend to be another person',
      'send spam or abusive messages through the contact form',
      'try to break into accounts, or to disturb or overload the service',
      'use the details of another user for anything other than the booking',
    ],
  },
  {
    id: 'responsibility',
    title: 'Our responsibility',
    paragraphs: [
      'QiotaKE is a platform that connects students and landlords. We do not own or manage the homes, and the rental is between the student and the landlord.',
      'We work hard to keep the service running and correct, but we cannot promise that it will always be available or free of mistakes. Please visit a home and check it before you pay.',
    ],
  },
  {
    id: 'changes-and-contact',
    title: 'Changes and contact',
    paragraphs: [
      'We may change these terms. The "Last updated" date at the top shows when the text last changed. If you keep using QiotaKE after a change, you accept the new terms.',
      'Questions about these terms? Use the contact page and we will reply.',
    ],
  },
];
