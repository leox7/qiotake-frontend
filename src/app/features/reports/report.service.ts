import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from '../../core/services/auth-state.service';
import { getApiErrorMessage } from '../../core/utils/api-error';
import { DEFAULT_REPORT_OPTIONS, ReportOptions } from './report.models';

/**
 * The report calls, and the options the person chose last.
 * The login token is added by jwt.interceptor.ts. That is why the report is fetched here (HttpClient) and
 * not by giving the address to an <iframe>: an iframe cannot send the Authorization header.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStateService);

  /**
   * The options chosen last. Kept ONLY in memory: they are still there when the person leaves the page and comes
   * back, but gone after a refresh or a new login. A plain field is enough, so there is no storage involved.
   */
  private lastOptions: ReportOptions = DEFAULT_REPORT_OPTIONS;

  getLastOptions(): ReportOptions {
    return this.lastOptions;
  }

  rememberOptions(options: ReportOptions): void {
    this.lastOptions = options;
  }

  /**
   * The report as a ready-made HTML page (the backend fills it in with Pebble). A landlord gets a report of their own
   * listings, an admin gets the whole system: the address depends on who is logged in, and the backend checks the role too.
   * Every page built here is written to the audit log by the backend (report.exported).
   *
   * 400 means the options were wrong (for example "from" after "to"). Use getReportErrorMessage() for the text.
   */
  getReportHtml(options: ReportOptions): Observable<string> {
    const url =
      this.auth.role() === 'ADMIN'
        ? `${environment.apiBaseUrl}/admin/reports/view`
        : `${environment.apiBaseUrl}/reports/landlord/view`;

    // HttpParams is immutable: every .set() gives back a new object, so we keep the result.
    // Only the options that were chosen are sent. A missing one means "all" (or the default) for the backend.
    let params = new HttpParams()
      .set('groupBy', options.groupBy)
      .set('sort', options.sort)
      .set('sections', options.sections.join(','));
    if (options.from) {
      params = params.set('from', options.from);
    }
    if (options.to) {
      params = params.set('to', options.to);
    }
    if (options.bookingStatus) {
      params = params.set('bookingStatus', options.bookingStatus);
    }
    if (options.paymentStatus) {
      params = params.set('paymentStatus', options.paymentStatus);
    }

    return this.http.get(url, {
      params,
      // The answer is HTML, not JSON. The backend only answers text/html for this address, so say we accept it.
      headers: { Accept: 'text/html, application/json' },
      responseType: 'text',
    });
  }
}

/**
 * One readable sentence for a failed report call.
 * Because we asked for text, Angular hands the backend's JSON error to us as a string, so first turn it
 * back into an object, then let getApiErrorMessage read it like any other error.
 */
export function getReportErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error === 'string') {
    try {
      const body: unknown = JSON.parse(error.error);
      return getApiErrorMessage(new HttpErrorResponse({ error: body, status: error.status, statusText: error.statusText }));
    } catch {
      // The text was not JSON (for example a plain 401 or 502 page): use the normal rules below
    }
  }
  return getApiErrorMessage(error);
}
