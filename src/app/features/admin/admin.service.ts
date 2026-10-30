import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListingStatus } from '../../core/models/listing.model';
import { PagedResponse } from '../../core/models/paged-response.model';
import { PaymentStatus, PaymentWithStudent } from '../../core/models/payment.model';
import { BookingStatus } from '../../core/models/booking.model';
import { Role } from '../../core/models/user.model';
import {
  AdminBooking,
  AdminListing,
  AdminRegisterRequest,
  AdminStats,
  AdminUser,
  AuditLog,
  AuditLogFilters,
  NationalIdResponse,
} from './admin.models';

/**
 * The calls the admin pages make. Only an admin may call them (the backend checks).
 * The login token is added by jwt.interceptor.ts.
 * A status of '' means "no filter": the parameter is simply not sent, and the backend then returns every status.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiBaseUrl;

  /** The overview numbers. The backend works out "this month" and "last month" itself. */
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`);
  }

  /**
   * One page of users, newest first. The backend searches (part of the name or email), filters by role and pages.
   * `search` and `role` are left out of the address when they are empty. Landlord ID numbers arrive already masked.
   */
  getUsers(search: string, role: Role | '', page: number, size: number): Observable<PagedResponse<AdminUser>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) {
      params = params.set('search', search);
    }
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get<PagedResponse<AdminUser>>(`${this.apiUrl}/admin/users`, { params });
  }

  /** Creates another admin. 400 for a wrong field, 409 when the email is already used. They log in with the normal OTP login. */
  createAdmin(request: AdminRegisterRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/admin/admins`, request);
  }

  /**
   * The FULL national ID of ONE landlord. The backend writes an audit row for every call (user.national_id_viewed).
   * 404 when the user does not exist or is not a landlord. Never keep the answer anywhere except in the modal that shows it.
   */
  getLandlordNationalId(userId: number): Observable<NationalIdResponse> {
    return this.http.get<NationalIdResponse>(`${this.apiUrl}/admin/users/${userId}/national-id`);
  }

  /** One page of ALL listings with the landlord's full name, newest first. */
  getListings(status: ListingStatus | '', page: number, size: number): Observable<PagedResponse<AdminListing>> {
    return this.http.get<PagedResponse<AdminListing>>(`${this.apiUrl}/admin/listings`, {
      params: this.pageParams(status, page, size),
    });
  }

  /** One page of all bookings, newest first. */
  getBookings(status: BookingStatus | '', page: number, size: number): Observable<PagedResponse<AdminBooking>> {
    return this.http.get<PagedResponse<AdminBooking>>(`${this.apiUrl}/admin/bookings`, {
      params: this.pageParams(status, page, size),
    });
  }

  /** One page of all payments with the student's name, newest first. Phone numbers arrive masked. */
  getPayments(status: PaymentStatus | '', page: number, size: number): Observable<PagedResponse<PaymentWithStudent>> {
    return this.http.get<PagedResponse<PaymentWithStudent>>(`${this.apiUrl}/admin/payments`, {
      params: this.pageParams(status, page, size),
    });
  }

  /** One page of the audit log, newest first. Filters: action, part of the actor's email, and a date range. */
  getAuditLogs(filters: AuditLogFilters, page: number, size: number): Observable<PagedResponse<AuditLog>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.action) {
      params = params.set('action', filters.action);
    }
    if (filters.actor) {
      params = params.set('actor', filters.actor);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    return this.http.get<PagedResponse<AuditLog>>(`${this.apiUrl}/admin/audit-logs`, { params });
  }

  /** Every action name the audit log can hold (for example "booking.created"), for the action drop down. */
  getAuditActions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/admin/audit-logs/actions`);
  }

  // HttpParams is immutable: every .set() gives back a new object, so we keep the result.
  private pageParams(status: string, page: number, size: number): HttpParams {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    return params;
  }
}
