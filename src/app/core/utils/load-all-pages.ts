import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { PagedResponse } from '../models/paged-response.model';

/** The backend allows at most 50 per page. */
export const MAX_PAGE_SIZE = 50;

/** A safety stop (20 x 50 = 1000 rows) so a strange answer can never make this ask for ever. */
const MAX_PAGES = 20;

/**
 * Reads every page of a list from the backend and gives back all the rows in one array.
 * Used where the backend cannot filter or count by itself (landlord bookings and payments),
 * so the page filters, counts and pages the rows on its own.
 *   loadAllPages((page) => bookingService.getLandlordBookings(page, MAX_PAGE_SIZE))
 */
export function loadAllPages<T>(getPage: (page: number) => Observable<PagedResponse<T>>): Observable<T[]> {
  return getPage(0).pipe(
    expand((result) =>
      result.last || result.content.length === 0 || result.page + 1 >= MAX_PAGES ? EMPTY : getPage(result.page + 1),
    ),
    reduce((all, result) => all.concat(result.content), [] as T[]),
  );
}
