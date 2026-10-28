import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Listing } from '../../../core/models/listing.model';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService } from '../../../core/services/booking.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';

/**
 * The "Request this home" box on a listing page.
 *   <app-booking-panel [listing]="listing" />
 * What it shows depends on who is looking:
 * - logged out:          a "Log in to request" button that comes back here after login
 * - landlord or admin:   a disabled form, because only students can book
 * - student:             the form, then a "Request sent" message after it worked
 */
@Component({
  selector: 'app-booking-panel',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './booking-panel.component.html',
  styleUrl: './booking-panel.component.css',
})
export class BookingPanelComponent {
  private readonly auth = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);

  readonly listing = input.required<Listing>();

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly isStudent = computed(() => this.auth.role() === 'STUDENT');

  /** "The landlord" when the backend did not send a first name. */
  readonly landlordName = computed(() => this.listing().landlordFirstName || 'The landlord');

  /** Today as "yyyy-MM-dd", for the `min` of the move-in date picker. */
  readonly today = todayAsText();

  // The <input type="date"> gives its value as "yyyy-MM-dd" text, or '' when empty.
  readonly form = new FormGroup(
    {
      moveIn: new FormControl('', { nonNullable: true, validators: [Validators.required, notInThePast] }),
      moveOut: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: moveOutAfterMoveIn },
  );

  readonly sending = signal(false);
  /** The backend's reason when the request failed, shown inside the panel. */
  readonly errorText = signal('');
  /** Becomes true after the backend saved the request. */
  readonly sent = signal(false);

  constructor() {
    // Landlords and admins see the form greyed out. disable() also stops the inputs from being used.
    if (this.isLoggedIn() && !this.isStudent()) {
      this.form.disable();
    }
  }

  logInToRequest(): void {
    // After login, the login page sends the student back to this exact page (see getSafeReturnUrl).
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  submit(): void {
    // A second click while the first request is still on its way does nothing.
    if (this.sending()) {
      return;
    }

    // Show the messages under every empty or wrong field.
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { moveIn, moveOut } = this.form.getRawValue();
    this.sending.set(true);
    this.errorText.set('');

    this.bookingService.createBooking(this.listing().id, moveIn, moveOut).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (error) => {
        // The backend explains the problem in plain words, for example that the dates overlap
        // another stay, or that the student already has a booking for those dates.
        this.sending.set(false);
        this.errorText.set(getApiErrorMessage(error));
      },
    });
  }

  /** True when the field was touched and has this error, so we only nag after the user tried. */
  showError(field: 'moveIn' | 'moveOut', error: string): boolean {
    const control = this.form.controls[field];
    return control.touched && control.hasError(error);
  }

  /** The "move out after move in" rule is on the whole form, because it needs both dates. */
  showOrderError(): boolean {
    return this.form.controls.moveOut.touched && this.form.hasError('moveOutBeforeMoveIn');
  }
}

// ---- small helpers ----

/** Today's date on this computer as "yyyy-MM-dd" (the same format the date input uses). */
function todayAsText(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// "yyyy-MM-dd" texts can be compared like normal text: "2026-01-05" < "2026-02-01" is true.

/** Move-in cannot be before today. */
function notInThePast(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value < todayAsText() ? { past: true } : null;
}

/** Move-out must be at least one day after move-in. */
function moveOutAfterMoveIn(group: AbstractControl): ValidationErrors | null {
  const { moveIn, moveOut } = group.value as { moveIn?: string; moveOut?: string };
  return moveIn && moveOut && moveOut <= moveIn ? { moveOutBeforeMoveIn: true } : null;
}
