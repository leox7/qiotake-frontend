import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { formatDateTime } from '../../../core/utils/format-date';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AuditLog, AuditLogFilters } from '../admin.models';
import { AdminService } from '../admin.service';
import { hideSensitiveText } from './hide-sensitive-text';

const PAGE_SIZE = 10;

/** How long we wait after the last key press before searching, so we do not ask the backend for every letter. */
const SEARCH_DELAY_MS = 400;

/**
 * Nicer words for the actions that need them. Every other action is made readable by actionLabel() below
 * ("booking.created" becomes "Booking created"), so a new action from the backend still reads well without a change here.
 */
const ACTION_LABELS: Record<string, string> = {
  'user.national_id_viewed': 'Landlord national ID viewed',
};

/**
 * /admin/audit-log: who did what and when, newest first, with filters on the action, the actor's email and the dates.
 * The backend filters and pages by itself (the filters work together), so each change of page or filter asks it again.
 * The action list for the drop down also comes from the backend.
 */
@Component({
  selector: 'app-audit-log',
  imports: [EmptyStateComponent, ErrorMessageComponent, PaginationComponent, SkeletonComponent],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.css',
})
export class AuditLogComponent {
  private readonly adminService = inject(AdminService);

  /** The action names for the drop down, from the backend. Empty until they arrive (then the list only has "All actions"). */
  readonly actions = signal<string[]>([]);

  readonly page = signal(0);
  readonly filters = signal<AuditLogFilters>({ action: '', actor: '', from: '', to: '' });
  readonly result = signal<PagedResponse<AuditLog> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletonRows = [1, 2, 3, 4, 5];

  /** Tells the admin when "to" is before "from". Empty when the dates are fine. The backend is not asked in that case. */
  readonly dateError = computed(() => {
    const { from, to } = this.filters();
    // "yyyy-MM-dd" texts sort in date order, so comparing the texts is enough
    return from && to && to < from ? 'The "to" date must not be before the "from" date.' : '';
  });

  readonly hasFilters = computed(() => {
    const { action, actor, from, to } = this.filters();
    return action !== '' || actor !== '' || from !== '' || to !== '';
  });

  // The request that is running (so an older answer can never replace a newer one) and the search delay.
  private request?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
    // Only fills the drop down. If it fails the page still works, the list just has no actions to choose from.
    this.adminService.getAuditActions().subscribe({
      next: (actions) => this.actions.set(actions),
      error: () => undefined,
    });
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      clearTimeout(this.searchTimer);
    });
  }

  /** Reads the current page. Also used by the Retry button. */
  load(): void {
    if (this.dateError()) {
      return;
    }
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');

    this.request = this.adminService.getAuditLogs(this.filters(), this.page(), PAGE_SIZE).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  /** One of the three filters changed (the field name is 'action', 'from' or 'to'). Start again from the first page. */
  onFilterChange(field: keyof AuditLogFilters, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filters.update((current) => ({ ...current, [field]: value }));
    this.page.set(0);
    this.load();
  }

  /** A key was pressed in the actor box. Wait until the typing stops, then search from the first page. */
  onActorSearch(event: Event): void {
    const words = (event.target as HTMLInputElement).value.trim();

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filters.update((current) => ({ ...current, actor: words }));
      this.page.set(0);
      this.load();
    }, SEARCH_DELAY_MS);
  }

  /** `actorBox` is the search box: it has no [value] binding, so it has to be emptied by hand. */
  clearFilters(actorBox: HTMLInputElement): void {
    clearTimeout(this.searchTimer);
    actorBox.value = '';
    this.filters.set({ action: '', actor: '', from: '', to: '' });
    this.page.set(0);
    this.load();
  }

  /** "booking.created" -> "Booking created". The raw name is still used for the filter. */
  actionLabel(action: string): string {
    const known = ACTION_LABELS[action];
    if (known) {
      return known;
    }
    const words = action.replaceAll('.', ' ').replaceAll('_', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  timeText(log: AuditLog): string {
    return formatDateTime(log.timestamp);
  }

  targetText(log: AuditLog): string {
    if (!log.entityType) {
      return '-';
    }
    return log.entityId === null ? log.entityType : `${log.entityType} #${log.entityId}`;
  }

  /** The details, with anything that looks like a phone number, ID, code or token replaced by "[hidden]". */
  detailsText(log: AuditLog): string {
    return hideSensitiveText(log.details);
  }
}
