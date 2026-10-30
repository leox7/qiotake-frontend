import { MoneyPipe } from '../pipes/money.pipe';
import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it('writes a whole amount with a thousands separator and no decimals', () => {
    expect(formatMoney(8500)).toBe('KES 8,500');
    expect(formatMoney(1250000)).toBe('KES 1,250,000');
    expect(formatMoney(0)).toBe('KES 0');
  });

  it('always shows two decimals when there are cents', () => {
    expect(formatMoney(8500.5)).toBe('KES 8,500.50');
    expect(formatMoney(99.99)).toBe('KES 99.99');
  });

  it('shows a dash for a missing amount instead of "KES NaN"', () => {
    expect(formatMoney(null)).toBe('-');
    expect(formatMoney(undefined)).toBe('-');
  });

  it('is what the money pipe uses in templates', () => {
    expect(new MoneyPipe().transform(8500)).toBe('KES 8,500');
  });
});
