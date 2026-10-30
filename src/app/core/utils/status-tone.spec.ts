import { getStatusInfo } from './status-tone';

describe('getStatusInfo', () => {
  it('maps the booking statuses', () => {
    expect(getStatusInfo('PENDING')).toEqual({ tone: 'warning', label: 'Pending' });
    expect(getStatusInfo('CONFIRMED')).toEqual({ tone: 'success', label: 'Confirmed' });
    expect(getStatusInfo('CANCELLED').tone).toBe('neutral');
  });

  it('maps the payment statuses', () => {
    expect(getStatusInfo('PAID')).toEqual({ tone: 'success', label: 'Paid' });
    expect(getStatusInfo('FAILED')).toEqual({ tone: 'error', label: 'Failed' });
  });

  it('shows UNKNOWN as "Confirming", never as failed', () => {
    expect(getStatusInfo('UNKNOWN')).toEqual({ tone: 'warning', label: 'Confirming' });
  });

  it('shows a status it does not know in plain words instead of breaking', () => {
    expect(getStatusInfo('SOME_NEW_STATUS')).toEqual({ tone: 'neutral', label: 'Some new status' });
  });
});
