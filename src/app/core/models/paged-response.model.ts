/**
 * One page of results, exactly as the backend sends it (PagedResponse).
 * `page` starts at 0 here (the backend counts from 0). Screens show page + 1.
 */
export interface PagedResponse<T> {
  content: T[];
  /** The page number, starting at 0. */
  page: number;
  size: number;
  /** How many results exist in total, over all pages. */
  totalElements: number;
  totalPages: number;
  /** True when this is the last page. */
  last: boolean;
}
