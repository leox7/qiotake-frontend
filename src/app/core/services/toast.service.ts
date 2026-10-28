import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

/** How long a toast stays on screen before it hides by itself. */
const TOAST_DURATION_MS = 3000;

/**
 * Small pop-up messages ("Booking sent", "Could not save"). Any page can do:
 *   toast.success('Profile saved');   toast.error('Could not save');
 * The ToastComponent (shown once in app.component.html) draws whatever is in `toasts`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(kind: Toast['kind'], message: string): void {
    // Five requests can fail together with the same problem: show that message once, not five times.
    if (this.toasts().some((toast) => toast.message === message)) {
      return;
    }

    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    // Hide it again after 3 seconds.
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
