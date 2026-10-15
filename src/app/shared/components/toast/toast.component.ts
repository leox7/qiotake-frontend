import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/** Draws the pop-up messages from ToastService. It is placed ONCE, in app.component.html. */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
