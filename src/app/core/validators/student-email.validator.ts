import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Every KCA student email ends like this. Note "students" with an s ("@student..." is wrong). */
export const STUDENT_EMAIL_ENDING = '@students.kcau.ac.ke';

/**
 * A form validator: student emails must end with @students.kcau.ac.ke (the backend checks this too).
 * An empty box is NOT an error here (that is the job of Validators.required). The error name is `studentEmail`.
 */
export function studentEmailValidator(control: AbstractControl): ValidationErrors | null {
  const email = String(control.value ?? '').trim().toLowerCase();
  if (email === '' || email.endsWith(STUDENT_EMAIL_ENDING)) {
    return null;
  }
  return { studentEmail: true };
}
