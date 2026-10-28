/** One question and its answer. Edit the texts here and both the FAQ page and the home page update. */
export interface FaqItem {
  question: string;
  answer: string;
}

// Keep these answers in line with the real rules of QiotaKE.
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Who can register on QiotaKE?',
    answer:
      'Students need a KCA University email address that ends with @students.kcau.ac.ke. ' +
      'Landlords can register with their own email, phone number and national ID number. ' +
      'A landlord account becomes active after the first listing is posted.',
  },
  {
    question: 'How do I book a home?',
    answer:
      'Browse the homes, open the one you like and choose your move-in and move-out dates. ' +
      'Then press "Request booking". No payment is needed at this point. ' +
      'The landlord reviews your request, and you get an email when it is confirmed or declined.',
  },
  {
    question: 'How do I contact the landlord?',
    answer:
      'Once the landlord confirms your booking, we email you their phone number. ' +
      'Before that, the number stays private, which keeps both students and landlords safe.',
  },
  {
    question: 'How do I pay the deposit and the rent?',
    answer:
      'After your booking is confirmed, open "My bookings" and press "Make a payment". ' +
      'The deposit equals one month\'s rent. After that you pay the rent every month. ' +
      'Every payment is made with M-Pesa STK Push: a prompt appears on your phone and you enter your M-Pesa PIN.',
  },
  {
    question: 'What if my payment shows "Confirming"?',
    answer:
      'It means we are still waiting for M-Pesa to tell us the result. Please do not pay again. ' +
      'Paying twice while a payment is confirming could charge you two times. ' +
      'Wait a few minutes, then check "My bookings". If it still shows "Confirming" after a while, contact us.',
  },
  {
    question: 'Can I cancel a booking?',
    answer:
      'Yes, you can cancel while the booking is still pending, which means the landlord has not answered yet. ' +
      'Open "My bookings" and press "Cancel request". If the landlord has already confirmed, please contact us.',
  },
  {
    question: 'How do landlords list a place?',
    answer:
      'Register as a landlord and log in. In your landlord dashboard, add a listing with a title, ' +
      'the area, the monthly rent, a description and photos. Students can then find it and send you booking requests.',
  },
  {
    question: 'Is my personal information safe?',
    answer:
      'Yes. Passwords are stored hashed, so nobody can read them, and every login needs a one-time code sent to your email. ' +
      'Phone numbers and ID numbers are masked wherever they are shown. ' +
      'You can read more in our Privacy Policy.',
  },
];
