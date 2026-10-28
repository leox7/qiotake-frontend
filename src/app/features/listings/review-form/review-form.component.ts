import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAX_REVIEW_COMMENT_LENGTH, Review } from '../../../core/models/review.model';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { ReviewService } from '../review.service';

/**
 * One form for two jobs:
 *   - no `review` given: "Rate your stay", sends a NEW review
 *   - `review` given:    "Edit your review", starts with its stars and comment and sends the changes
 * The parent shows it only to a student the backend said may write or change a review.
 */
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css',
})
export class ReviewFormComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly toast = inject(ToastService);

  readonly listingId = input.required<number>();
  /** The review to change. Leave it out to write a new one. */
  readonly review = input<Review | null>(null);

  /** The backend saved the review (new or changed). The parent shows it. */
  readonly saved = output<Review>();
  /** "Cancel" while editing. */
  readonly cancelled = output<void>();
  /** The backend said 409: this student already has a review here (maybe from another device). */
  readonly alreadyReviewed = output<void>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly maxComment = MAX_REVIEW_COMMENT_LENGTH;

  readonly sending = signal(false);
  /** The backend's reason when sending failed, shown above the button. */
  readonly formError = signal('');

  readonly form = new FormGroup({
    // null until a star is picked
    rating: new FormControl<number | null>(null, { validators: [Validators.required] }),
    comment: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)],
    }),
  });

  ngOnInit(): void {
    // When changing a review, start from what was saved
    const existing = this.review();
    if (existing) {
      this.form.setValue({ rating: existing.rating, comment: existing.comment ?? '' });
    }
  }

  submit(): void {
    // A second click while the first request is on its way does nothing.
    if (this.sending()) {
      return;
    }
    // Show the red messages if no star is picked or the comment is too long.
    this.form.markAllAsTouched();
    const { rating, comment } = this.form.getRawValue();
    if (this.form.invalid || rating === null) {
      return;
    }

    this.sending.set(true);
    this.formError.set('');

    const existing = this.review();
    const request = existing
      ? this.reviewService.updateReview(this.listingId(), existing.id, rating, comment)
      : this.reviewService.createReview(this.listingId(), rating, comment);

    request.subscribe({
      next: (saved) => {
        this.sending.set(false);
        this.toast.success(existing ? 'Your review was updated' : 'Thank you, your review was posted');
        this.saved.emit(saved);
      },
      error: (error) => this.onSendFailed(error),
    });
  }

  private onSendFailed(error: unknown): void {
    this.sending.set(false);

    // 409 = this student already reviewed this home. Not a mistake to fix here: the parent loads
    // their review and shows it instead of this form.
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.alreadyReviewed.emit();
      return;
    }

    // Everything else (for example 403 "no finished stay" or a wrong rating) stays on the form with the reason.
    // No connection, 403 and 5xx also get a toast from error.interceptor.ts, this text is in addition to it.
    this.formError.set(getApiErrorMessage(error));
  }

  /** "1 star", "2 stars" ... for screen readers. */
  starLabel(number: number): string {
    return number === 1 ? '1 star' : `${number} stars`;
  }
}
