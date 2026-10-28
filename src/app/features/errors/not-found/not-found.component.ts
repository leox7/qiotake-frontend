import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/** Shown for any address that no route knows (the "**" route at the end of errors.routes.ts). */
@Component({
  selector: 'app-not-found',
  imports: [EmptyStateComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {}
