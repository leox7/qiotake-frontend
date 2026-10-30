import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../../core/models/paged-response.model';
import { Payment, PaymentConfig, PaymentRequest, PaymentType } from '../../core/models/payment.model';

/** All calls to /api/payments that a student needs. The login token is added by jwt.interceptor.ts. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;

  /**
   * Starts an M-Pesa payment. The backend sends an STK Push to the phone and answers at once with
   * the new payment, usually still PENDING. The money is NOT paid yet at this point.
   * Needs the payment `type` as well as the phone, because the backend wants it (DEPOSIT or RENT).
   */
  startPayment(bookingId: number, type: PaymentType, phoneNumber: string): Observable<Payment> {
    const body: PaymentRequest = { bookingId, type, phoneNumber };
    return this.http.post<Payment>(this.baseUrl, body);
  }

  /** One payment with its current status. The page asks this again and again while a payment is PENDING. */
  getPaymentStatus(paymentId: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.baseUrl}/${paymentId}`);
  }

  /**
   * Every payment of ONE of the student's own bookings, newest first (404 for someone else's booking).
   * One request is enough: a stay has a deposit and one rent per month, far fewer than the 50 the backend allows per page.
   */
  getPaymentsForBooking(bookingId: number): Observable<Payment[]> {
    const params = new HttpParams().set('bookingId', bookingId).set('size', 50);
    return this.http.get<PagedResponse<Payment>>(this.baseUrl, { params }).pipe(map((result) => result.content));
  }

  /** Which payment mode is on. SIMULATED means no real money moves, so the page can say so before the first payment. */
  getPaymentConfig(): Observable<PaymentConfig> {
    return this.http.get<PaymentConfig>(`${this.baseUrl}/config`);
  }
}
