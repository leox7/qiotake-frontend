import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { getSafeReturnUrl } from '../../../core/utils/safe-return-url';
import { AuthService } from '../auth.service';

/**
 * Step one of logging in: email + password.
 * If they are right the backend emails a 6 digit code and we move to /verify-otp.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['../auth-card.css', './login.component.css'],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // The fields of the form, with their rules (validators).
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  // Signals: small boxes holding values the page shows. When they change, the page updates.
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  // Where to go after the whole login (set by authGuard when a protected page sent the user here).
  private readonly returnUrl = getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  onSubmit(): void {
    // Show every problem at once if the form is not valid yet.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const email = this.form.controls.email.value.trim();
    const password = this.form.controls.password.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        // The email travels in the navigation "state": it is not shown in the address bar and is not
        // saved anywhere. The password is NOT passed on, it only lived in this form.
        // The returnUrl is not secret, so it stays in the address as a query parameter.
        this.router.navigate(['/verify-otp'], {
          state: { email },
          queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {},
        });
      },
      error: (error) => {
        // For example: wrong email or password, or a deactivated account (the backend answers both the same).
        this.errorMessage.set(getApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
