/**
 * `returnUrl` is the page a visitor wanted before being sent to log in. It comes from the address bar,
 * so anyone could write anything there, for example ?returnUrl=https://evil.com (an "open redirect"
 * attack that sends people to a fake site after they log in).
 *
 * This only accepts a path INSIDE our own app, such as "/bookings", and returns null for anything else.
 */
export function getSafeReturnUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  // Must start with ONE slash. "//evil.com" and "/\evil.com" are treated by browsers as other websites.
  const startsInsideApp = value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');

  // Never "return" to the pages that only guests may see.
  const isGuestPage = /^\/(login|register|verify-otp)(\/|\?|#|$)/.test(value);

  return startsInsideApp && !isGuestPage ? value : null;
}
