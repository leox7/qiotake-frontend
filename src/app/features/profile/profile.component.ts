import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Profile } from '../../core/models/profile.model';
import { AuthStateService } from '../../core/services/auth-state.service';
import { SessionService } from '../../core/services/session.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../core/utils/api-error';
import { formatDate, formatMonthYear } from '../../core/utils/format-date';
import { getRoleLabel } from '../../core/utils/role-label';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ProfileService } from './profile.service';

// Letters (also accented ones), spaces, hyphens and apostrophes, and at least one real character
// (so a name made only of spaces is refused). The backend checks the same rules.
const NAME_PATTERN = /^(?=.*\S)[\p{L} '-]+$/u;

const NAME_VALIDATORS = [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)];

/**
 * The profile page for every role. It has NO navbar or footer of its own: students see it inside the
 * public layout (/profile), landlords inside the portal layout (/landlord/profile).
 *
 * Only the first and last name can be edited. The email is locked, and the role never changes.
 */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, ErrorMessageComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  // Inside a portal the layout supplies the spacing, so the page drops its own (see the css)
  host: { '[class.in-portal]': '!showOwnHeader' },
})
export class ProfileComponent {
  private readonly profileService = inject(ProfileService);
  private readonly authState = inject(AuthStateService);
  private readonly sessionService = inject(SessionService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  // A portal route (landlord, admin) has `data.header`, which the portal layout shows above the page.
  // Then this page must not draw its own header a second time.
  readonly showOwnHeader = !inject(ActivatedRoute).snapshot.data['header'];

  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly errorText = signal('');

  /** True while the name form is open. */
  readonly editing = signal(false);
  readonly saving = signal(false);

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: NAME_VALIDATORS }),
    lastName: new FormControl('', { nonNullable: true, validators: NAME_VALIDATORS }),
  });

  // Used to move the keyboard focus when the buttons appear and disappear
  private readonly firstNameInput = viewChild<ElementRef<HTMLInputElement>>('firstNameInput');
  private readonly editButton = viewChild<ElementRef<HTMLButtonElement>>('editButton');

  /** "JW" for Jane Wanjiru. */
  readonly initials = computed(() => {
    const profile = this.profile();
    return profile ? (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase() : '';
  });

  /**
   * "Your session ends on 7 November 2026." from the date the backend gave at login (kept by TokenStorageService).
   * Empty when we do not have it (for example a login from before this was added): the page then shows its old text.
   */
  sessionEndText(): string {
    const end = this.tokenStorage.getRefreshTokenExpiresAt();
    const date = end ? new Date(end) : null;
    if (!end || !date || isNaN(date.getTime())) {
      return '';
    }
    return `Your session ends on ${formatDate(end.slice(0, 10))}.`;
  }

  readonly roleLabel = computed(() => {
    const profile = this.profile();
    return profile ? getRoleLabel(profile.role) : '';
  });

  /** "June 2026" from createdAt. Empty if the date cannot be read, so the page never shows "Invalid Date". */
  readonly memberSince = computed(() => {
    const profile = this.profile();
    return profile ? formatMonthYear(profile.createdAt) : '';
  });

  constructor() {
    this.load();
  }

  /** Reads the profile. Also used by the Retry button. */
  load(): void {
    this.loading.set(true);
    this.errorText.set('');

    this.profileService.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorText.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  // ---------- editing the name ----------

  startEditing(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    // Start from the saved names, and forget red messages left from an earlier try
    this.form.reset({ firstName: profile.firstName, lastName: profile.lastName });
    this.editing.set(true);
    this.focusAfterRender(this.firstNameInput);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.focusAfterRender(this.editButton);
  }

  save(): void {
    // A second click while the first request is on its way does nothing.
    if (this.saving()) {
      return;
    }
    // Show the red messages if a name is empty or wrong.
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    const { firstName, lastName } = this.form.getRawValue();

    this.profileService.updateName(firstName.trim(), lastName.trim()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.profile.set(updated);

        // The navbar reads the logged in user from AuthStateService, so updating it there
        // changes the initials and the name in the navbar at once. It also saves them in storage.
        this.authState.setUser({
          id: updated.id,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          role: updated.role,
        });

        this.toast.success('Your name was saved');
        this.editing.set(false);
        this.focusAfterRender(this.editButton);
      },
      error: (error) => {
        this.saving.set(false);
        // The form stays open so nothing typed is lost. The backend's reason goes in a toast.
        // No connection, 403 and 5xx are already toasted by error.interceptor.ts.
        if (shouldToastHere(error)) {
          this.toast.error(getApiErrorMessage(error));
        }
      },
    });
  }

  /** The red text under a name field, or '' when there is nothing to say. */
  nameError(control: FormControl<string>, label: string): string {
    if (!control.touched || control.valid) {
      return '';
    }
    if (control.hasError('maxlength')) {
      return `${label} can be at most 50 characters.`;
    }
    // Spaces only counts as empty, even though it fails the pattern rule and not the required rule
    if (control.hasError('required') || control.value.trim() === '') {
      return `Enter your ${label.toLowerCase()}.`;
    }
    return `${label} can only have letters, spaces, hyphens and apostrophes.`;
  }

  // ---------- security ----------

  /** The real logout: tells the backend, clears this device, goes home and shows a toast. */
  logout(): void {
    this.sessionService.logout();
  }

  /**
   * The button or input we want to focus does not exist until Angular has drawn the new screen,
   * so we wait for that first. Without this, keyboard users lose their place when a button disappears.
   */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
