import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Turns the ways a Kenyan number may be typed into one form: 254XXXXXXXXX.
 *   0712 345 678  ->  254712345678      +254712345678  ->  254712345678
 * Spaces and dashes are ignored. The backend (PhoneUtil) follows the same rules.
 * The result may still be invalid, so check it with isValidKenyanPhone().
 */
export function normalizeKenyanPhone(raw: string): string {
  let phone = raw.trim().replace(/[\s-]/g, '');

  if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }

  // Local format: a 0 and nine digits. The 0 is replaced by Kenya's country code.
  if (/^0\d{9}$/.test(phone)) {
    phone = '254' + phone.substring(1);
  }

  return phone;
}

/** True for 2547XXXXXXXX and 2541XXXXXXXX (Safaricom, Airtel, Telkom mobile numbers). */
export function isValidKenyanPhone(raw: string): boolean {
  return /^254[17]\d{8}$/.test(normalizeKenyanPhone(raw));
}

/**
 * A form validator. Usage:  new FormControl('', [Validators.required, kenyanPhoneValidator()])
 * An empty box is NOT an error here (that is the job of Validators.required), so the
 * validator can also be used on optional fields.
 * The error name is `kenyanPhone`.
 */
export function kenyanPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (value === '') {
      return null;
    }
    return isValidKenyanPhone(value) ? null : { kenyanPhone: true };
  };
}
