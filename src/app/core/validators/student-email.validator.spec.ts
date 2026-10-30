import { FormControl } from '@angular/forms';
import { STUDENT_EMAIL_ENDING, studentEmailValidator } from './student-email.validator';

describe('studentEmailValidator', () => {
  it('uses the students.kcau.ac.ke ending', () => {
    expect(STUDENT_EMAIL_ENDING).toBe('@students.kcau.ac.ke');
  });

  it('accepts a KCA student email, whatever the letter case', () => {
    expect(studentEmailValidator(new FormControl('jane.doe@students.kcau.ac.ke'))).toBeNull();
    expect(studentEmailValidator(new FormControl('  Jane@Students.KCAU.ac.ke '))).toBeNull();
  });

  it('refuses the wrong ending ("@student", another address, gmail)', () => {
    expect(studentEmailValidator(new FormControl('jane@student.kcau.ac.ke'))).toEqual({ studentEmail: true });
    expect(studentEmailValidator(new FormControl('jane@kcau.ac.ke'))).toEqual({ studentEmail: true });
    expect(studentEmailValidator(new FormControl('jane@gmail.com'))).toEqual({ studentEmail: true });
  });

  it('does not complain about an empty box (Validators.required does that)', () => {
    expect(studentEmailValidator(new FormControl(''))).toBeNull();
  });
});
