import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SITE_INFO } from '../../../core/config/site-info';
import {
  INQUIRY_SUBJECTS,
  InquirySubject,
  MAX_INQUIRY_EMAIL_LENGTH,
  MAX_INQUIRY_MESSAGE_LENGTH,
  MAX_INQUIRY_NAME_LENGTH,
} from '../../../core/models/inquiry.model';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { getApiErrorMessage } from '../../../core/utils/api-error';
import { InquiryService } from '../../../core/services/inquiry.service';

// A text with only spaces counts as empty. Validators.required alone would accept it.
const HAS_A_LETTER = /\S/;

/**
 * The contact section: our contact details on the left and the message form on the right.
 * The /contact page and the home page both use it.
 * The right side has two looks: the form (with a "sending" state) and the "message sent" screen.
 */
@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  private readonly inquiryService = inject(InquiryService);
  private readonly authState = inject(AuthStateService);
  private readonly injector = inject(Injector);

  readonly info = SITE_INFO;
  // A phone link must not contain spaces: "+254 700 000 000" becomes "+254700000000"
  readonly phoneLink = 'tel:' + SITE_INFO.phone.replaceAll(' ', '');

  readonly subjects = INQUIRY_SUBJECTS;
  readonly maxMessage = MAX_INQUIRY_MESSAGE_LENGTH;

  readonly sending = signal(false);
  readonly sent = signal(false);
  /** The number the backend gives the message, for example "INQ-000123". Shown on the success screen. */
  readonly reference = signal('');
  // The red message above the button when sending failed. Empty means no problem.
  readonly errorText = signal('');

  readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(HAS_A_LETTER), Validators.maxLength(MAX_INQUIRY_NAME_LENGTH)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(MAX_INQUIRY_EMAIL_LENGTH)],
    }),
    // '' means "nothing chosen yet"
    subject: new FormControl<InquirySubject | ''>('', { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(HAS_A_LETTER), Validators.maxLength(MAX_INQUIRY_MESSAGE_LENGTH)],
    }),
  });

  private readonly successHeading = viewChild<ElementRef<HTMLElement>>('successHeading');
  private readonly nameInput = viewChild<ElementRef<HTMLElement>>('nameInput');

  constructor() {
    this.prefillFromLogin();
  }

  /** The red text under a field, or '' when the field is fine (or not touched yet). */
  fieldError(name: 'fullName' | 'email' | 'subject' | 'message'): string {
    const control = this.form.controls[name];
    if (!control.touched || !control.errors) {
      return '';
    }
    switch (name) {
      case 'fullName':
        return control.errors['maxlength']
          ? `Keep your name under ${MAX_INQUIRY_NAME_LENGTH} characters.`
          : 'Enter your full name.';
      case 'email':
        if (control.errors['maxlength']) {
          return `Keep your email under ${MAX_INQUIRY_EMAIL_LENGTH} characters.`;
        }
        return control.errors['required'] ? 'Enter your email.' : 'Enter a valid email address.';
      case 'subject':
        return 'Choose what your message is about.';
      case 'message':
        return control.errors['maxlength']
          ? `Keep your message under ${MAX_INQUIRY_MESSAGE_LENGTH} characters.`
          : 'Write your message.';
    }
  }

  submit(): void {
    // The disabled button is the first guard, this one stops a double Enter press
    if (this.sending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.sending.set(true);
    this.errorText.set('');

    this.inquiryService
      .sendInquiry({
        fullName: value.fullName.trim(),
        email: value.email.trim(),
        // The form is valid, so a real topic was chosen and this is never ''
        subject: value.subject as InquirySubject,
        message: value.message.trim(),
      })
      .subscribe({
        next: (inquiry) => {
          this.sending.set(false);
          this.reference.set(inquiry.reference);
          this.sent.set(true);
          this.focusAfterRender(this.successHeading);
        },
        error: (error) => {
          this.sending.set(false);
          this.errorText.set(this.errorMessageFor(error));
        },
      });
  }

  /** "Send another message": back to an empty form (name and email stay filled in if you are logged in). */
  sendAnother(): void {
    this.form.reset();
    this.prefillFromLogin();
    this.errorText.set('');
    this.reference.set('');
    this.sent.set(false);
    this.focusAfterRender(this.nameInput);
  }

  /** Logged in people do not need to type their name and email again. They can still change them. */
  private prefillFromLogin(): void {
    const user = this.authState.currentUser();
    if (user) {
      this.form.patchValue({ fullName: `${user.firstName} ${user.lastName}`, email: user.email });
    }
  }

  private errorMessageFor(error: unknown): string {
    // 429: this address already sent the most messages the backend allows per hour
    if (error instanceof HttpErrorResponse && error.status === 429) {
      // Retry-After is the number of seconds to wait. If it is missing we give the general text.
      const seconds = Number(error.headers.get('Retry-After'));
      if (seconds > 0) {
        const minutes = Math.ceil(seconds / 60);
        return `You have sent too many messages, please try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
      }
      return 'You have sent too many messages, please try again later.';
    }
    return getApiErrorMessage(error, 'We could not send your message. Please try again.');
  }

  /** The screen changes, so keyboard focus is moved to the new content. Otherwise it would be lost. */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
