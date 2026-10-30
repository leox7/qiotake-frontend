import { Component, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { getApiErrorMessage, shouldToastHere } from '../../../../core/utils/api-error';
import { trapFocus } from '../../../../core/utils/trap-focus';
import { AdminUser } from '../../admin.models';
import { AdminService } from '../../admin.service';

// Letters (also accented ones), spaces, hyphens and apostrophes, and at least one real character.
// The same rule as the register page.
const NAME_PATTERN = /^(?=.*\S)[\p{L} '-]+$/u;

const NAME_VALIDATORS = [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)];

/**
 * The "Create admin" form in a box on top of the page.
 *   @if (creating()) { <app-create-admin-dialog (created)="onCreated($event)" (dismissed)="creating.set(false)" /> }
 * The new admin logs in the normal way (password, then the 6 digit code). The role is never sent:
 * the backend decides that this account is an admin.
 */
@Component({
  selector: 'app-create-admin-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './create-admin-dialog.component.html',
  styleUrl: './create-admin-dialog.component.css',
  host: { '(document:keydown.escape)': 'dismiss()' },
})
export class CreateAdminDialogComponent {
  private readonly adminService = inject(AdminService);

  /** Fires with the new admin after the backend created the account. */
  readonly created = output<AdminUser>();
  readonly dismissed = output<void>();

  readonly saving = signal(false);
  /** The reason the backend refused (for example "Email already in use"). */
  readonly errorText = signal('');

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: NAME_VALIDATORS }),
    lastName: new FormControl('', { nonNullable: true, validators: NAME_VALIDATORS }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    // The same rule as registration: at least 8 characters and at least one digit
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8), Validators.pattern(/\d/)],
    }),
  });

  private readonly firstNameInput = viewChild.required<ElementRef<HTMLInputElement>>('firstNameInput');

  constructor() {
    afterNextRender(() => this.firstNameInput().nativeElement.focus());
  }

  dismiss(): void {
    if (!this.saving()) {
      this.dismissed.emit();
    }
  }

  /** Keep the Tab key inside the box, so keyboard users cannot "fall out" behind it. */
  keepFocusInside(event: KeyboardEvent, box: HTMLElement): void {
    trapFocus(event, box);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.errorText.set('');
    const value = this.form.getRawValue();

    this.adminService
      .createAdmin({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim().toLowerCase(),
        password: value.password,
      })
      .subscribe({
        next: (admin) => {
          this.saving.set(false);
          this.created.emit(admin);
        },
        error: (error) => {
          this.saving.set(false);
          // No connection, 403 and server errors already got a toast from error.interceptor.ts
          if (shouldToastHere(error)) {
            this.errorText.set(getApiErrorMessage(error));
          }
        },
      });
  }
}
