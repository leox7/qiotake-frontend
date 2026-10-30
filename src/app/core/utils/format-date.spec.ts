import { formatDate, formatDateTime, formatMonthYear } from './format-date';

describe('formatDate', () => {
  it('turns a backend date into "1 June 2026"', () => {
    expect(formatDate('2026-06-01')).toBe('1 June 2026');
    expect(formatDate('2026-12-31')).toBe('31 December 2026');
  });

  it('shows text it cannot read as it came, never "Invalid Date"', () => {
    expect(formatDate('soon')).toBe('soon');
  });
});

describe('formatDateTime', () => {
  it('turns a backend date-time into "28 Oct 2026, 14:03"', () => {
    expect(formatDateTime('2026-10-28T14:03:11')).toBe('28 Oct 2026, 14:03');
  });

  it('shows text it cannot read as it came', () => {
    expect(formatDateTime('soon')).toBe('soon');
  });
});

describe('formatMonthYear', () => {
  it('turns a date-time into "June 2026"', () => {
    expect(formatMonthYear('2026-06-14T10:00:00')).toBe('June 2026');
  });

  it('returns an empty text when the date cannot be read', () => {
    expect(formatMonthYear('soon')).toBe('');
  });
});
