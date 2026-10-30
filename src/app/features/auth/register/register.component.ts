import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SITE_INFO } from '../../../core/config/site-info';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import {
  kenyanPhoneValidator,
  normalizeKenyanPhone,
} from '../../../core/validators/kenyan-phone.validator';
import { STUDENT_EMAIL_ENDING, studentEmailValidator } from '../../../core/validators/student-email.validator';
import { AuthService } from '../auth.service';

type AccountType = 'student' | 'landlord';

// Letters (also accented ones), spaces, hyphens and apostrophes. The profile page allows the same.
const NAME_PATTERN = /^[\p{L} '-]+$/u;

/** One page, two kinds of account: the tab decides which fields are needed and which endpoint is called. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../auth-card.css', './register.component.css'],
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly studentEmailEnding = STUDENT_EMAIL_ENDING;

  // Which tab is open. This is the ONLY thing that decides the account type, no role is ever typed or sent.
  readonly tab = signal<AccountType>('student');
  readonly isLandlord = computed(() => this.tab() === 'landlord');

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  // One form for both tabs. The student-only and landlord-only rules switch on and off with the tab (see onlyFor).
  readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, this.onlyFor('student', studentEmailValidator)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      // At least 8 characters and at least one digit
      validators: [Validators.required, Validators.minLength(8), Validators.pattern(/\d/)],
    }),
    phoneNumber: new FormControl('', {
      nonNullable: true,
      validators: [this.onlyFor('landlord', Validators.required), this.onlyFor('landlord', kenyanPhoneValidator())],
    }),
    nationalId: new FormControl('', {
      nonNullable: true,
      validators: [
        this.onlyFor('landlord', Validators.required),
        this.onlyFor('landlord', Validators.pattern(/^\d+$/)),
        // Kenyan national ID numbers have 7 or 8 digits
        this.onlyFor('landlord', Validators.minLength(7)),
        this.onlyFor('landlord', Validators.maxLength(8)),
      ],
    }),
  });

  constructor() {
    // /register?role=landlord opens the landlord tab. Listening (not just reading once) means the tab
    // also follows the link when the visitor is already on this page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const role = params.get('role');
      if (role === 'student' || role === 'landlord') {
        this.setTab(role);
      }
    });
  }

  setTab(tab: AccountType): void {
    this.tab.set(tab);
    this.errorMessage.set('');

    // The rules that depend on the tab must be checked again with the new tab.
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.phoneNumber.updateValueAndValidity();
    this.form.controls.nationalId.updateValueAndValidity();
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const common = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      password: value.password,
    };

    // Only the fields the backend expects for that kind of account are sent. The role is decided by
    // the endpoint itself, so there is no "role" field in the request.
    const request = this.isLandlord()
      ? this.authService.registerLandlord({
          ...common,
          nationalIdNumber: value.nationalId.trim(),
          // The backend stores the number as sent, so we send the clean form: 254712345678
          phoneNumber: normalizeKenyanPhone(value.phoneNumber),
        })
      : this.authService.registerStudent({ ...common, university: SITE_INFO.university });

    request.subscribe({
      next: () => {
        this.toast.success('Account created, please log in');
        this.router.navigateByUrl('/login');
      },
      error: (error) => {
        this.loading.set(false);

        // 409 = this email already has an account: show it next to the email field.
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.form.controls.email.setErrors({ server: getApiErrorMessage(error) });
          this.form.controls.email.markAsTouched();
        } else {
          this.errorMessage.set(getApiErrorMessage(error));
        }
      },
    });
  }

  /** Wraps a rule so it only applies on one tab. On the other tab the field is always "fine". */
  private onlyFor(tab: AccountType, rule: ValidatorFn): ValidatorFn {
    return (control: AbstractControl) => (this.tab() === tab ? rule(control) : null);
  }
}
