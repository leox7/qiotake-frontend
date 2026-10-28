import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Review } from '../../../core/models/review.model';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDate } from '../../../core/utils/format-date';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { ReviewService } from '../review.service';

/** How many reviews each "Show more" adds. */
const PAGE_SIZE = 10;

/**
 * What the backend said about the logged in student, when they have no review yet:
 *   checking  we are asking
 *   write     they finished a stay here and may write a review
 *   no        they may not (no finished stay yet)
 *   failed    we could not ask, so we show nothing rather than a wrong message
 */
type ReviewAccess = 'checking' | 'write' | 'no' | 'failed';

/**
 * The reviews part of a listing page: the average, the student's own review or the form to write one,
 * and the list of everybody's reviews, 10 at a time.
 */
@Component({
  selector: 'app-listing-reviews',
  imports: [StarRatingComponent, ReviewFormComponent, ConfirmDialogComponent, ErrorMessageComponent, SkeletonComponent],
  templateUrl: './listing-reviews.component.html',
  styleUrl: './listing-reviews.component.css',
})
export class ListingReviewsComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  readonly listingId = input.required<number>();
  /** From the listing. null when nobody has reviewed yet. */
  readonly averageRating = input.required<number | null>();
  readonly reviewCount = input.required<number>();

  /** A review was added, changed or deleted, so the page should refresh the average in its heading. */
  readonly ratingsChanged = output<void>();

  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(true);
  readonly errorText = signal('');
  readonly loadingMore = signal(false);
  /** The next page to ask for. Page 0 is the first one. */
  private nextPage = 0;
  readonly hasMore = signal(false);

  readonly isStudent = computed(() => this.authState.role() === 'STUDENT');
  readonly access = signal<ReviewAccess>('checking');
  /** The logged in student's own review, or null. */
  readonly myReview = signal<Review | null>(null);
  /** True while the student is changing their review. */
  readonly editing = signal(false);
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);

  /** Everybody's reviews except the student's own, which has its own card at the top. */
  readonly otherReviews = computed(() => this.reviews().filter((review) => review.id !== this.myReview()?.id));

  // Used to put the keyboard focus back when a button disappears and comes back
  private readonly editButton = viewChild<ElementRef<HTMLButtonElement>>('editButton');
  private readonly deleteButton = viewChild<ElementRef<HTMLButtonElement>>('deleteButton');

  ngOnInit(): void {
    this.loadFirstPage();
    this.loadStatus();
  }

  // ---------- the list of reviews ----------

  /** Reads the first reviews. Also used by Retry. */
  loadFirstPage(): void {
    this.loading.set(true);
    this.errorText.set('');
    this.nextPage = 0;

    this.reviewService.getReviews(this.listingId(), 0, PAGE_SIZE).subscribe({
      next: (page) => {
        this.reviews.set(page.content);
        this.hasMore.set(!page.last);
        this.nextPage = 1;
        this.loading.set(false);
      },
      error: (error) => {
        this.errorText.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** "Show more reviews": adds the next page under the ones we have. */
  loadMore(): void {
    if (this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);

    this.reviewService.getReviews(this.listingId(), this.nextPage, PAGE_SIZE).subscribe({
      next: (page) => {
        // A review posted a moment ago pushes the others down, so a page can repeat one we already show
        const shownIds = new Set(this.reviews().map((review) => review.id));
        const fresh = page.content.filter((review) => !shownIds.has(review.id));
        this.reviews.update((list) => [...list, ...fresh]);
        this.hasMore.set(!page.last);
        this.nextPage++;
        this.loadingMore.set(false);
      },
      // The list stays as it is. The error interceptor already toasts a lost connection.
      error: () => this.loadingMore.set(false),
    });
  }

  // ---------- the student's own review ----------

  /**
   * Asks the backend what this student may do here: write a review, or change the one they wrote.
   * Only students are asked. Everybody else just reads.
   */
  private loadStatus(): void {
    if (!this.isStudent()) {
      this.access.set('no');
      return;
    }
    this.access.set('checking');

    this.reviewService.getMyReviewStatus(this.listingId()).subscribe({
      next: (status) => {
        this.myReview.set(status.myReview);
        this.access.set(status.canReview ? 'write' : 'no');
      },
      error: () => this.access.set('failed'),
    });
  }

  /** The form saved a NEW review: show it as "Your review" and at the top of the list. */
  onPosted(review: Review): void {
    this.myReview.set(review);
    this.reviews.update((list) => [review, ...list]);
    this.ratingsChanged.emit();
  }

  /** The form saved changes to the student's own review. */
  onEdited(review: Review): void {
    this.myReview.set(review);
    this.reviews.update((list) => list.map((item) => (item.id === review.id ? review : item)));
    this.editing.set(false);
    this.ratingsChanged.emit();
    this.focusAfterRender(this.editButton);
  }

  /** The backend said 409: the student reviewed this home before. Load that review instead of the form. */
  onAlreadyReviewed(): void {
    this.toast.success('You have already reviewed this home. Here is your review.');
    this.loadStatus();
    this.loadFirstPage();
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.focusAfterRender(this.editButton);
  }

  // ---------- deleting ----------

  closeDeleteDialog(): void {
    this.confirmingDelete.set(false);
    this.focusAfterRender(this.deleteButton);
  }

  confirmDelete(): void {
    const mine = this.myReview();
    if (!mine || this.deleting()) {
      return;
    }
    this.deleting.set(true);

    this.reviewService.deleteReview(this.listingId(), mine.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.myReview.set(null);
        this.reviews.update((list) => list.filter((review) => review.id !== mine.id));
        this.toast.success('Your review was deleted');
        // After deleting, the student may write a new review, so ask the backend again
        this.loadStatus();
        this.ratingsChanged.emit();
      },
      error: (error) => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        // No connection, 403 and 5xx are already toasted by error.interceptor.ts
        if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
        // The review may already be gone (404), so show what the backend says now
        this.loadStatus();
        this.loadFirstPage();
      },
    });
  }

  // ---------- text and focus ----------

  /** "12 June 2026" from an ISO date-time. */
  dateOf(review: Review): string {
    return formatDate(review.createdAt.slice(0, 10));
  }

  /**
   * The button we want to focus does not exist until Angular has drawn the new screen, so we wait for that.
   * Without this, keyboard users lose their place when a button disappears.
   */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
