/** A review of a listing, exactly as the backend sends it (ReviewResponseDto). */
export interface Review {
  id: number;
  listingId: number;
  /** Reviews are public, so the backend sends only the first name. */
  studentFirstName: string;
  /** 1 to 5 stars. */
  rating: number;
  /** null when the student left only stars. */
  comment: string | null;
  /** ISO date-time. */
  createdAt: string;
}

/**
 * What GET /api/listings/{id}/reviews/mine says about the logged in student (MyReviewStatusDto).
 * `canReview` is true only for a student who finished a stay and has not reviewed yet.
 * `myReview` is their review once they wrote one (and then `canReview` is false).
 */
export interface MyReviewStatus {
  canReview: boolean;
  myReview: Review | null;
}

/** What a student sends to POST (new review) or PUT (change it) on /api/listings/{id}/reviews (ReviewRequestDto). */
export interface ReviewRequest {
  /** A whole number from 1 to 5. */
  rating: number;
  /** Optional, at most 500 characters. */
  comment?: string;
}

/** The longest comment the backend accepts. */
export const MAX_REVIEW_COMMENT_LENGTH = 500;
