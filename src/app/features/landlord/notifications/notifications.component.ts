import { Component, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDateTime } from '../../../core/utils/format-date';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { LandlordNotification } from '../landlord.models';
import { LandlordService } from '../landlord.service';

const PAGE_SIZE = 10;

/** The landlord's notifications, newest first, with a button to mark each one as read. */
@Component({
  selector: 'app-notifications',
  imports: [EmptyStateComponent, ErrorMessageComponent, SkeletonComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent {
  private readonly landlordService = inject(LandlordService);
  private readonly toast = inject(ToastService);

  readonly notifications = signal<LandlordNotification[]>([]);
  readonly loading = signal(true);
  readonly errorText = signal('');

  /** The page we are on. The backend counts from 0, the screen shows page + 1. */
  readonly page = signal(0);
  readonly totalPages = signal(0);

  /** The id of the notification being marked as read now, so its button can show "Saving...". */
  readonly markingId = signal<number | null>(null);

  readonly skeletonRows = [1, 2, 3];

  constructor() {
    this.load();
  }

  /** "28 Oct 2026, 14:03" */
  dateText(notification: LandlordNotification): string {
    return formatDateTime(notification.dateCreated);
  }

  /** Reads the current page. Also used by the Retry button. */
  load(): void {
    this.loading.set(true);
    this.errorText.set('');

    this.landlordService.getNotifications(this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.notifications.set(result.content);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorText.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Move to the previous (-1) or next (+1) page. */
  changePage(step: number): void {
    this.page.update((page) => page + step);
    this.load();
  }

  markAsRead(notification: LandlordNotification): void {
    // A second click while the first request is on its way does nothing.
    if (this.markingId() !== null) {
      return;
    }
    this.markingId.set(notification.id);

    this.landlordService.markNotificationRead(notification.id).subscribe({
      next: (updated) => {
        // Swap the changed notification into the list, so the page does not have to reload
        this.notifications.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.markingId.set(null);
      },
      error: (error) => {
        this.markingId.set(null);
        // No connection, 403 and 5xx are already toasted by error.interceptor.ts
        if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
      },
    });
  }
}
