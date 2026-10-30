import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingCounts, BookingRequest, BookingTab } from '../models/booking.model';
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
   * One page of the logged-in student's bookings, newest first. `page` starts at 0, the backend allows at most 50 per page.
   * `status` is a booking status or 'PAST' (cancelled and vacated together). Leave it out for every booking.
   */
  getMyBookings(page: number, size: number, status?: BookingTab): Observable<PagedResponse<Booking>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PagedResponse<Booking>>(`${this.baseUrl}/my`, { params });
  }

  /** The numbers for the tabs of My bookings: all, pending, confirmed and past. */
  getMyBookingCounts(): Observable<BookingCounts> {
    return this.http.get<BookingCounts>(`${this.baseUrl}/my/counts`);
  }

  /**
   * One booking by its id. A student only gets their own (404 for anyone else's), a landlord only the ones on
   * their listings. The payment page uses it to know what is due.
   */
  getBooking(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.baseUrl}/${id}`);
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
   * the backend allows 50 per page. The backend has no status filter and no counts for landlords (see MISSING-BACKEND.md),
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
}
