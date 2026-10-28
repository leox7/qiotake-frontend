import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../../core/models/paged-response.model';
import { MyReviewStatus, Review, ReviewRequest } from '../../core/models/review.model';

/** The calls to /api/listings/{id}/reviews. Reading the list is public, everything else needs a logged in student. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  private reviewsUrl(listingId: number): string {
    return `${environment.apiBaseUrl}/listings/${listingId}/reviews`;
  }

  /** One page of reviews, newest first. `page` starts at 0. The backend allows at most 50 per page. */
  getReviews(listingId: number, page: number, size: number): Observable<PagedResponse<Review>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<Review>>(this.reviewsUrl(listingId), { params });
  }

  /**
   * Students only. Tells the page what to show this student: the review form (`canReview`),
   * or their own review with Edit and Delete (`myReview`), or nothing.
   */
  getMyReviewStatus(listingId: number): Observable<MyReviewStatus> {
    return this.http.get<MyReviewStatus>(`${this.reviewsUrl(listingId)}/mine`);
  }

  /**
   * A student reviews a home. The backend answers:
   *   403 if the student has not finished a stay in this home
   *   409 if the student already reviewed it
   * The student and the date are never sent, the backend takes them from the login token.
   */
  createReview(listingId: number, rating: number, comment: string): Observable<Review> {
    return this.http.post<Review>(this.reviewsUrl(listingId), this.buildBody(rating, comment));
  }

  /** A student changes the rating and comment of their OWN review (403 for anyone else's, 404 if it is gone). */
  updateReview(listingId: number, reviewId: number, rating: number, comment: string): Observable<Review> {
    return this.http.put<Review>(`${this.reviewsUrl(listingId)}/${reviewId}`, this.buildBody(rating, comment));
  }

  /** A student deletes their OWN review. The backend answers with nothing. */
  deleteReview(listingId: number, reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.reviewsUrl(listingId)}/${reviewId}`);
  }

  private buildBody(rating: number, comment: string): ReviewRequest {
    const body: ReviewRequest = { rating };
    // A comment is optional, so an empty one is simply left out (the backend then keeps no comment)
    if (comment.trim() !== '') {
      body.comment = comment.trim();
    }
    return body;
  }
}
