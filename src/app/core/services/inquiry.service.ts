import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InquiryRequest, InquiryResponse } from '../models/inquiry.model';

/** Sends the contact form. The endpoint is public, so no login is needed. */
@Injectable({ providedIn: 'root' })
export class InquiryService {
  private readonly http = inject(HttpClient);

  /** The answer holds the reference ("INQ-000123") that the visitor can quote. */
  sendInquiry(inquiry: InquiryRequest): Observable<InquiryResponse> {
    return this.http.post<InquiryResponse>(`${environment.apiBaseUrl}/inquiries`, inquiry);
  }
}
