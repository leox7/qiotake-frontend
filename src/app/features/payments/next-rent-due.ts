/**
 * When is the next rent due? The backend works it out like this: once the deposit is paid, the first
 * rent is due on the day the stay starts, and every paid rent moves the date one month later.
 * The backend does not send that date, so we repeat the same sum here from what we know:
 * the start date and how many rents are already paid.
 *
 * Both dates are "yyyy-MM-dd" texts, which can be compared like normal text.
 * If the day does not exist in the next month (31 January + 1 month), it becomes the last day (28 February),
 * the same as the backend does. This is only used to decide what to SHOW: the backend still checks every payment.
 */
export function getNextRentDue(startDate: string, paidRentCount: number): string {
  let [year, month, day] = startDate.split('-').map(Number);

  for (let i = 0; i < paidRentCount; i++) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    day = Math.min(day, lastDayOfMonth);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
