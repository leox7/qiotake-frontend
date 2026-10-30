import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../../core/models/paged-response.model';
import { PaymentWithStudent } from '../../core/models/payment.model';
import { Profile } from '../../core/models/profile.model';
import { LandlordNotification, LandlordStats } from './landlord.models';

/**
 * The calls the landlord pages make. Only landlords may call them (the backend checks).
 * The login token is added by jwt.interceptor.ts.
 */
@Injectable({ providedIn: 'root' })
export class LandlordService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiBaseUrl;

  private readonly pendingCountSignal = signal(0);

  /**
   * How many booking requests wait for the landlord. The sidebar shows it as a dot on "Booking requests".
   * Every time the stats are read (getStats) this number is updated, so a page can call refreshPendingCount()
   * after it changed a booking.
   */
  readonly pendingCount = this.pendingCountSignal.asReadonly();

  /** The dashboard numbers. The backend works out "this month" and "last month" itself. */
  getStats(): Observable<LandlordStats> {
    return this.http
      .get<LandlordStats>(`${this.apiUrl}/landlord/stats`)
      .pipe(tap((stats) => this.pendingCountSignal.set(stats.pendingRequests)));
  }

  /** Reads the stats again just to update the pending dot in the sidebar. A failure is ignored: the old number stays. */
  refreshPendingCount(): void {
    this.getStats().subscribe({ error: () => undefined });
  }

  /**
   * The landlord's own profile (the `verified` flag says if they posted a first listing).
   * The same call lives in features/profile, but a feature may not import another feature.
   */
  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.apiUrl}/users/me`);
  }

  /**
   * One page of the payments made on this landlord's listings, newest first, each with the student's name.
   * `page` starts at 0, the backend allows 50 per page. The backend has no status filter on this call (see MISSING-BACKEND.md).
   */
  getReceivedPayments(page: number, size: number): Observable<PagedResponse<PaymentWithStudent>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<PaymentWithStudent>>(`${this.apiUrl}/payments/received`, { params });
  }

  /** One page of this landlord's notifications, newest first. `page` starts at 0. */
  getNotifications(page: number, size: number): Observable<PagedResponse<LandlordNotification>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<LandlordNotification>>(`${this.apiUrl}/notifications`, { params });
  }

  /** Marks one notification as read. Returns the updated notification. */
  markNotificationRead(id: number): Observable<LandlordNotification> {
    return this.http.put<LandlordNotification>(`${this.apiUrl}/notifications/${id}/read`, {});
  }
}
