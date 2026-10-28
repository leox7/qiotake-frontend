import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingRequest } from '../models/booking.model';
import { PagedResponse } from '../models/paged-response.model';
/**
 * Calls to /api/bookings. It lives in core (not in features/bookings) because two features use it:
 * the listing page (to request a booking) and the My bookings page.
 * The login token is added by jwt.interceptor.ts, so nothing about tokens is needed here.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/bookings`;

  /**
   * A student asks to rent a home for these dates. Only students may do this (the backend checks).
   * The new booking starts as PENDING until the landlord confirms it.
   * `moveIn` and `moveOut` are "yyyy-MM-dd" strings.
   */
  createBooking(listingId: number, moveIn: string, moveOut: string): Observable<Booking> {
    const body: BookingRequest = { listingId, startDate: moveIn, endDate: moveOut };
    return this.http.post<Booking>(this.baseUrl, body);
  }

  /**
   * One page of the logged-in student's bookings, newest first. `page` starts at 0.
   * The backend has no status filter and no counts, so the page filters and counts by itself.
   * The backend allows at most 50 per page.
   */
  getMyBookings(page: number, size: number): Observable<PagedResponse<Booking>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<Booking>>(`${this.baseUrl}/my`, { params });
  }

  /**
   * A student cancels their own booking. Only PENDING bookings can be cancelled: the backend answers
   * 409 for any other status and 404 if the booking does not exist. Returns the updated booking.
   */
  cancelBooking(id: number): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/${id}/cancel`, {});
  }

  /**
   * One page of the booking requests on the logged-in landlord's listings, newest first. `page` starts at 0,
   * the backend allows 50 per page. The backend has no status filter and no counts (see MISSING BACKEND),
   * so the Booking requests page loads the list and filters and counts by itself.
   */
  getLandlordBookings(page: number, size: number): Observable<PagedResponse<Booking>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<Booking>>(`${this.baseUrl}/landlord`, { params });
  }

  /**
   * The landlord confirms a PENDING booking on their own listing. The backend then emails the student
   * the landlord's phone number (we never see it). Answers 409 when the booking is not PENDING or another
   * confirmed stay overlaps these dates, 403 for someone else's listing. Returns the updated booking.
   */
  confirmBooking(id: number): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/${id}/confirm`, {});
  }

  /**
   * One of the student's own bookings, or null if there is none with this id.
   * The backend has no "get one booking" call, so we look through the student's list (50 at a time).
   * Someone else's booking is never in this list, which is also why it comes back as null.
   */
  async findMyBooking(id: number): Promise<Booking | null> {
    for (let page = 0; ; page++) {
      const result = await firstValueFrom(this.getMyBookings(page, 50));
      const found = result.content.find((booking) => booking.id === id);
      if (found) {
        return found;
      }
      // `content.length === 0` is a safety stop so a strange answer can never loop forever
      if (result.last || result.content.length === 0) {
        return null;
      }
    }
  }
}
