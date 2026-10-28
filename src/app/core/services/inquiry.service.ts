import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InquiryRequest } from '../models/inquiry.model';

/** Sends the contact form. The endpoint is public, so no login is needed. */
@Injectable({ providedIn: 'root' })
export class InquiryService {
  private readonly http = inject(HttpClient);

  // We do not use the answer (the backend echoes the saved inquiry), only whether it worked.
  sendInquiry(inquiry: InquiryRequest): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/inquiries`, inquiry);
  }
}
