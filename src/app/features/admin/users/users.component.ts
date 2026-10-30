import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { Role } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { formatDateTime } from '../../../core/utils/format-date';
import { getRoleLabel } from '../../../core/utils/role-label';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminUser } from '../admin.models';
import { AdminService } from '../admin.service';
import { CreateAdminDialogComponent } from './create-admin-dialog/create-admin-dialog.component';
import { NationalIdModalComponent } from './national-id-modal/national-id-modal.component';

const PAGE_SIZE = 10;

/** How long we wait after the last key press before searching, so we do not ask the backend for every letter. */
const SEARCH_DELAY_MS = 400;

/** The full ID of one landlord while the small box shows it. Only this page holds it, and only for 30 seconds. */
interface ShownId {
  name: string;
  nationalId: string;
}

/**
 * /admin/users: the users, with search, a role filter, pages, "View ID" for landlords and "Create admin".
 * The backend searches, filters and pages, so the page only asks for the page it needs.
 */
@Component({
  selector: 'app-users',
  imports: [
    ConfirmDialogComponent,
    CreateAdminDialogComponent,
    EmptyStateComponent,
    ErrorMessageComponent,
    NationalIdModalComponent,
    PaginationComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly result = signal<PagedResponse<AdminUser> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  /** The words the list is searched with (set 400 ms after the last key press). */
  readonly search = signal('');
  readonly roleFilter = signal<Role | ''>('');
  readonly page = signal(0);

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly roleOptions: { value: Role | ''; label: string }[] = [
    { value: '', label: 'All roles' },
    { value: 'STUDENT', label: getRoleLabel('STUDENT') },
    { value: 'LANDLORD', label: getRoleLabel('LANDLORD') },
    { value: 'ADMIN', label: getRoleLabel('ADMIN') },
  ];

  // The request that is running (so an older answer can never replace a newer one) and the search delay.
  private request?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  // ---------- "View ID" ----------

  /** The landlord the "are you sure?" box is open for (null = no box). */
  readonly idTarget = signal<AdminUser | null>(null);
  /** True while the ID is being fetched. */
  readonly idBusy = signal(false);
  /** The ID that is on screen now (null = none). Only ONE can be open at a time. */
  readonly shownId = signal<ShownId | null>(null);

  // ---------- "Create admin" ----------

  readonly creating = signal(false);

  // The button that opened a box, to give the keyboard focus back when it closes.
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      clearTimeout(this.searchTimer);
    });
  }

  /** Reads the current page with the current search and role. Also used by the Retry button. */
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');

    this.request = this.adminService.getUsers(this.search(), this.roleFilter(), this.page(), PAGE_SIZE).subscribe({
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

  /** A key was pressed in the search box. Wait until the typing stops, then search from the first page. */
  onSearch(event: Event): void {
    const words = (event.target as HTMLInputElement).value.trim();

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search.set(words);
      this.page.set(0);
      this.load();
    }, SEARCH_DELAY_MS);
  }

  onRoleChange(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as Role | '');
    this.page.set(0);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  fullName(user: AdminUser): string {
    return `${user.firstName} ${user.lastName}`;
  }

  roleLabel(user: AdminUser): string {
    return getRoleLabel(user.role);
  }

  /** The text the shared status badge understands: "ACTIVE" or "DEACTIVATED". */
  accountStatus(user: AdminUser): string {
    return user.enabled === false ? 'DEACTIVATED' : 'ACTIVE';
  }

  createdText(user: AdminUser): string {
    return user.createdAt ? formatDateTime(user.createdAt) : '-';
  }

  // ---------- View ID ----------

  /** Step 1: the landlord's row button opens the "this is recorded" box. Nothing is fetched yet. */
  openIdBox(user: AdminUser, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.idTarget.set(user);
  }

  idBoxMessage(user: AdminUser): string {
    return `You are about to see the full national ID of ${this.fullName(user)}. This action is recorded in the audit log.`;
  }

  /** Step 2: the admin confirmed. Fetch the ID of this ONE landlord and show it in the small box. */
  showId(): void {
    const user = this.idTarget();
    if (!user || this.idBusy()) {
      return;
    }

    this.idBusy.set(true);
    this.adminService.getLandlordNationalId(user.id).subscribe({
      next: (response) => {
        this.idBusy.set(false);
        this.idTarget.set(null);
        // The ID goes ONLY into this signal. It is not put in the table rows, storage, the address or the console.
        this.shownId.set({ name: this.fullName(user), nationalId: response.nationalIdNumber });
      },
      error: (error) => {
        this.idBusy.set(false);
        this.closeBoxes();

        if (error instanceof HttpErrorResponse && error.status === 404) {
          // The account was removed, or it is not a landlord
          this.toast.error('This landlord was not found, so there is no national ID to show.');
        } else if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
        // 403 (not allowed), no connection and server errors already got a toast from error.interceptor.ts
      },
    });
  }

  /** Step 3: the small box closed (button, Escape or after 30 seconds). Forget the ID. */
  hideId(): void {
    this.shownId.set(null);
    this.restoreFocus();
  }

  // ---------- Create admin ----------

  openCreateDialog(event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.creating.set(true);
  }

  onAdminCreated(admin: AdminUser): void {
    this.toast.success(`${this.fullName(admin)} is now an admin. They log in with their email and password.`);
    this.closeBoxes();
    this.load();
  }

  closeBoxes(): void {
    this.idTarget.set(null);
    this.creating.set(false);
    this.restoreFocus();
  }

  private restoreFocus(): void {
    // Wait for the box to leave the page, then put the focus back where the user was
    setTimeout(() => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
      this.opener = null;
    });
  }
}
