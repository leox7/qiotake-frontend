const HIDDEN = '[hidden]';

/**
 * A safety net for the "Details" column of the audit log.
 *
 * The backend must never put a phone number, a full national ID, a one-time code, a token or a password into
 * an audit row. If one ever slips in, that is a BACKEND bug. This function makes sure the screen still does not
 * show it, by replacing it with "[hidden]". It cannot find every possible secret, it only catches the usual shapes.
 */
export function hideSensitiveText(text: string | null): string {
  if (!text) {
    return '-';
  }

  return (
    text
      // A login token (three parts joined by dots, the first starting with "eyJ"), or "Bearer something"
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, HIDDEN)
      .replace(/\bBearer\s+\S+/gi, `Bearer ${HIDDEN}`)
      // "otp: 123456", "password=abc", "token: xyz" ... keep the word, hide what comes after it
      .replace(/\b(otp|code|token|password|pwd|secret)\b(\s*[:=]\s*)\S+/gi, `$1$2${HIDDEN}`)
      // A phone number written in groups, for example "0712 345 678" or "+254 712-345-678"
      .replace(/\+?\d{3,4}[\s-]\d{3}[\s-]\d{3,4}/g, HIDDEN)
      // Any long run of digits: a phone number (254712345678) or a national ID. Real ids and counts are shorter.
      .replace(/\d{7,}/g, HIDDEN)
  );
}
