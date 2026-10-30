/**
 * Contact details and facts about QiotaKE, shown in the footer (and later on the Contact page).
 * Change them HERE and every page updates.
 *
 * BEFORE LAUNCH: the phone number, address and opening hours below are placeholders. Replace them with the real ones.
 */
export const SITE_INFO = {
  name: 'QiotaKE',
  description: 'Safe, verified student homes near KCA University, Nairobi.',
  // The backend needs a university when a student registers. QiotaKE only serves KCA students
  // (their email must end with @students.kcau.ac.ke), so the register page sends this fixed value.
  university: 'KCA University',
  copyrightYear: 2026,

  supportEmail: 'campusnestai@gmail.com',
  phone: '+254 700 000 000',
  address: 'KCA University, Thika Road, Ruaraka, Nairobi',
  openingHours: 'Monday to Friday, 8:00am to 5:00pm',

  // Social media links. Leave this list EMPTY until a real page exists: the footer only shows
  // links that are in this list, so nothing leads nowhere. Example:
  // { name: 'Instagram', url: 'https://www.instagram.com/your-real-page' }
  socialLinks: [] as { name: string; url: string }[],
};
