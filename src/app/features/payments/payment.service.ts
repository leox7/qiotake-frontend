import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../../core/models/paged-response.model';
import { Payment, PaymentRequest, PaymentType } from '../../core/models/payment.model';

/** The backend allows at most 50 payments per request. */
const BACKEND_PAGE_SIZE = 50;

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
   * Every payment of one booking, newest first.
   * The backend has no "payments of a booking" call. It only lists ALL payments of the student
   * (GET /payments/my), so we read them page by page and keep the ones of this booking.
   * async / await just means "wait for the answer, then carry on with the next line".
   */
  async getPaymentsForBooking(bookingId: number): Promise<Payment[]> {
    const found: Payment[] = [];

    for (let page = 0; ; page++) {
      const params = new HttpParams().set('page', page).set('size', BACKEND_PAGE_SIZE);
      const result = await firstValueFrom(this.http.get<PagedResponse<Payment>>(`${this.baseUrl}/my`, { params }));

      found.push(...result.content.filter((payment) => payment.bookingId === bookingId));

      // `content.length === 0` is a safety stop so a strange answer can never loop forever
      if (result.last || result.content.length === 0) {
        return found;
      }
    }
  }
}
