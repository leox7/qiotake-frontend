// Everything the Tab key can land on. Disabled controls are left out because they cannot take focus.
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps the Tab key inside a dialog, so keyboard users cannot "fall out" behind it.
 * Call it from the dialog's keydown handler: (keydown)="trapFocus($event, box)".
 * Tab on the last control jumps to the first one, Shift+Tab on the first jumps to the last.
 */
export function trapFocus(event: KeyboardEvent, box: HTMLElement): void {
  if (event.key !== 'Tab') {
    return;
  }

  const controls = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (controls.length === 0) {
    event.preventDefault(); // nothing to focus: stay where we are
    return;
  }

  const first = controls[0];
  const last = controls[controls.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
