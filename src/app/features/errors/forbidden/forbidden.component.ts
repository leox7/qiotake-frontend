import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/** Shown when a logged-in user opens a page their role is not allowed to see (roleGuard sends them here). */
@Component({
  selector: 'app-forbidden',
  imports: [EmptyStateComponent],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.css',
})
export class ForbiddenComponent {}
