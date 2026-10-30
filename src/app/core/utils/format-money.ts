/**
 * Turns an amount into the one money format used everywhere: 8500 -> "KES 8,500", 8500.5 -> "KES 8,500.50".
 * A whole amount has no decimals; an amount with cents always shows two, so "8,500.5" never appears.
 * A missing amount shows "-" instead of "KES NaN".
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '-';
  }

  const value = Number(amount);
  const hasCents = !Number.isInteger(value);
  const digits = value.toLocaleString('en-GB', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `KES ${digits}`;
}
