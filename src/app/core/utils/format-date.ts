/**
 * Turns a backend date such as "2026-06-01" into "1 June 2026".
 *
 * We build the date from its numbers instead of using `new Date("2026-06-01")`, because that one
 * means midnight in UTC and can show the day before in some time zones.
 */
export function formatDate(text: string): string {
  const [year, month, day] = text.split('-').map(Number);
  if (!year || !month || !day) {
    return text; // not the shape we expect: show it as it came instead of "Invalid Date"
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Turns a backend date-time such as "2026-10-28T14:03:11" into "28 Oct 2026, 14:03".
 * The backend sends no time zone, so the browser reads it as local time, which is what we want to show.
 */
export function formatDateTime(text: string): string {
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}
