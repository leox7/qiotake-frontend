import { FormControl } from '@angular/forms';
import { isValidKenyanPhone, kenyanPhoneValidator, normalizeKenyanPhone } from './kenyan-phone.validator';

describe('normalizeKenyanPhone', () => {
  it('turns the local format into 254XXXXXXXXX', () => {
    expect(normalizeKenyanPhone('0712345678')).toBe('254712345678');
  });

  it('removes the plus sign, spaces and dashes', () => {
    expect(normalizeKenyanPhone('+254 712-345 678')).toBe('254712345678');
  });

  it('keeps a number that is already normalized', () => {
    expect(normalizeKenyanPhone('254112345678')).toBe('254112345678');
  });
});

describe('isValidKenyanPhone', () => {
  it('accepts Safaricom (07) and Telkom/Airtel (01) numbers in every written form', () => {
    expect(isValidKenyanPhone('0712345678')).toBe(true);
    expect(isValidKenyanPhone('0112345678')).toBe(true);
    expect(isValidKenyanPhone('+254712345678')).toBe(true);
    expect(isValidKenyanPhone('254712345678')).toBe(true);
  });

  it('refuses numbers that are too short, too long or not mobile', () => {
    expect(isValidKenyanPhone('071234567')).toBe(false);
    expect(isValidKenyanPhone('07123456789')).toBe(false);
    expect(isValidKenyanPhone('0212345678')).toBe(false);
    expect(isValidKenyanPhone('abc')).toBe(false);
  });
});

describe('kenyanPhoneValidator', () => {
  const validator = kenyanPhoneValidator();

  it('returns no error for a valid number', () => {
    expect(validator(new FormControl('0712 345 678'))).toBeNull();
  });

  it('returns the kenyanPhone error for a wrong number', () => {
    expect(validator(new FormControl('12345'))).toEqual({ kenyanPhone: true });
  });

  it('does not complain about an empty box (Validators.required does that)', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });
});
