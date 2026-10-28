import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Listing,
  ListingFilters,
  ListingImage,
  ListingRequest,
  ListingStatus,
  ListingSummary,
} from '../models/listing.model';
import { PagedResponse } from '../models/paged-response.model';

/**
 * All calls to /api/listings. Browsing is public: no login is needed. The landlord calls (create, edit,
 * photos ...) are at the bottom and need a landlord login.
 * It lives in core (not in a feature) because the listing pages, the payment page and the landlord pages all use listings.
 * Each method returns an Observable: nothing is sent until the page calls .subscribe().
 */
@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/listings`;

  /**
   * One page of homes that match the filters.
   * `page` starts at 0, like the backend. The backend always sorts newest first (no sort option).
   */
  searchListings(
    filters: ListingFilters,
    page: number,
    size: number,
  ): Observable<PagedResponse<Listing>> {
    // HttpParams is immutable: every .set() gives back a new object, so we keep the result.
    // We only add a filter when it has a value, because the backend treats a missing one as "any".
    let params = new HttpParams().set('page', page).set('size', size);

    if (filters.location) {
      params = params.set('keyword', filters.location);
    }
    if (filters.roomType) {
      params = params.set('roomType', filters.roomType);
    }
    if (filters.maxPrice !== null) {
      params = params.set('maxPrice', filters.maxPrice);
    }
    if (filters.availableOnly) {
      params = params.set('status', 'AVAILABLE');
    }

    return this.http.get<PagedResponse<Listing>>(this.baseUrl, { params });
  }

  /** One home by its id, for the listing page. A 404 means it does not exist (or was deleted). */
  getListing(id: number): Observable<Listing> {
    return this.http.get<Listing>(`${this.baseUrl}/${id}`);
  }

  /** The numbers for the home page: homes available in total, and per room type the count and lowest rent. */
  getSummary(): Observable<ListingSummary> {
    return this.http.get<ListingSummary>(`${this.baseUrl}/summary`);
  }

  // ---------- Landlord calls (only a landlord may use them, the backend checks) ----------

  /** One page of the logged-in landlord's own listings, newest first. `page` starts at 0, the backend allows 50 per page at most. */
  getMyListings(page: number, size: number): Observable<PagedResponse<Listing>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<Listing>>(`${this.baseUrl}/my`, { params });
  }

  /**
   * One of the landlord's own listings, or null if there is none with this id.
   * The backend answers 403 for another landlord's listing on edit, but a plain GET of one listing is
   * public, so we look through the landlord's own list (50 at a time). Someone else's listing is never in it.
   */
  async findMyListing(id: number): Promise<Listing | null> {
    for (let page = 0; ; page++) {
      const result = await firstValueFrom(this.getMyListings(page, 50));
      const found = result.content.find((listing) => listing.id === id);
      if (found) {
        return found;
      }
      if (result.last || result.content.length === 0) {
        return null;
      }
    }
  }

  /**
   * Posts a new listing. It always starts AVAILABLE. Answers 400 with a message for each wrong field
   * and 409 when another listing already has the same title. The first one also makes the landlord verified.
   */
  createListing(request: ListingRequest): Observable<Listing> {
    return this.http.post<Listing>(this.baseUrl, request);
  }

  /** Changes the text fields of a listing. 403 if it belongs to someone else, 404 if it does not exist, 409 for a duplicate title. */
  updateListing(id: number, request: ListingRequest): Observable<Listing> {
    return this.http.put<Listing>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * The landlord marks their own listing AVAILABLE or OCCUPIED by hand. Bookings are still decided
   * by their dates, this only changes the label students see.
   */
  setStatus(id: number, status: ListingStatus): Observable<Listing> {
    return this.http.put<Listing>(`${this.baseUrl}/${id}/status`, { status });
  }

  /** Deletes a listing for good. 409 when it still has pending or confirmed bookings, or any payment. */
  deleteListing(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Sends ONE photo (multipart form, field "file"). The backend takes one image per request.
   * `isPrimary` true makes it the main photo: it answers 409 if the listing already has one.
   * Secondary photos: at most 4 (409 after that). Only JPG and PNG up to 2MB (400 otherwise).
   * Returns every HTTP event so the page can draw a progress bar from the UploadProgress ones.
   */
  uploadImage(listingId: number, file: File, isPrimary: boolean): Observable<HttpEvent<ListingImage>> {
    const body = new FormData();
    body.append('file', file);
    body.append('isPrimary', String(isPrimary));
    return this.http.post<ListingImage>(`${this.baseUrl}/${listingId}/images`, body, {
      observe: 'events',
      reportProgress: true,
    });
  }

  /**
   * Deletes one photo by its id. The backend does NOT send photo ids when it sends a listing
   * (only the addresses), so a page only knows the id of a photo it uploaded a moment ago.
   */
  deleteImage(listingId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${listingId}/images/${imageId}`);
  }
}
