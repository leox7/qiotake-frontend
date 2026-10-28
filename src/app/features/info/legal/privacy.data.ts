import { LegalSection } from './legal-page.component';
import { MPESA_SANDBOX_NOTICE } from './legal-constants';

// DRAFT text. A lawyer should review it before QiotaKE is used with real money and real students.
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'overview',
    title: 'What this policy covers',
    paragraphs: [
      'This policy explains what personal information QiotaKE collects, why we collect it and who can see it.',
      'We only collect what we need to run the service: accounts, bookings, payments and support.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    paragraphs: ['Depending on how you use QiotaKE, we keep:'],
    bullets: [
      'your name, email address and password (the password is stored hashed, so nobody can read it)',
      'for students: the university',
      'for landlords: a phone number and a national ID number',
      'your bookings, payments and reviews',
      'the messages you send through the contact form (name, email, topic and message)',
      'the internet address of your device when you send a contact message, only to count how many messages one address sends per hour',
    ],
  },
  {
    id: 'how-we-use-it',
    title: 'How we use your information',
    paragraphs: ['We use your information to:'],
    bullets: [
      'create your account and log you in with a one-time code sent to your email',
      'process booking requests, confirmations and payments',
      'send you emails about your bookings and payments',
      'answer your messages',
      'keep QiotaKE safe and stop abuse',
    ],
  },
  {
    id: 'who-can-see-it',
    title: 'Who can see your information',
    paragraphs: [
      'When a landlord confirms your booking, we email the landlord\'s phone number to you. Landlords see the dates and the student\'s details they need to manage the booking.',
      'Reviews show the first name of the student who wrote them.',
      'Phone numbers and ID numbers are masked wherever they are shown in QiotaKE. We do not sell your information.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments and M-Pesa',
    paragraphs: [
      'Payments use M-Pesa STK Push. We receive the result of each payment (for example paid or failed) so that we can show it on your booking. We never see your M-Pesa PIN.',
      MPESA_SANDBOX_NOTICE,
    ],
  },
  {
    id: 'keeping-it-safe',
    title: 'Keeping your information safe',
    paragraphs: [
      'Passwords are stored hashed. Logging in needs a one-time code from your email. Your login expires by itself, and you can log out on any device.',
      'No system is perfectly safe. Please choose a strong password and do not share your login or your one-time codes.',
    ],
  },
  {
    id: 'browser-storage',
    title: 'Cookies and browser storage',
    paragraphs: [
      'QiotaKE keeps your login in your browser so that you stay signed in. We do not use this storage to track you or to show you adverts.',
    ],
  },
  {
    id: 'how-long-we-keep-it',
    title: 'How long we keep it',
    paragraphs: [
      'We keep your information while your account is active, and for as long as we need it for booking and payment records.',
    ],
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    paragraphs: [
      'You can change your name on your profile page. To correct other details, or to ask us to delete your account, use the contact page.',
    ],
  },
  {
    id: 'changes-and-contact',
    title: 'Changes and contact',
    paragraphs: [
      'We may update this policy. The "Last updated" date at the top shows when it last changed.',
      'Questions about your privacy? Use the contact page and we will reply.',
    ],
  },
];
