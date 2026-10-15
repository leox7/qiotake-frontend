import { Component, computed, input } from '@angular/core';
import { getStatusInfo } from '../../../core/utils/status-tone';

/**
 * A small coloured pill for a status. Give it the status text the backend sent:
 *   <app-status-badge status="UNKNOWN" />   shows a yellow "CONFIRMING"
 * The colour and the friendly word come from core/utils/status-tone.ts.
 */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  // `computed` recalculates by itself whenever `status` changes.
  readonly info = computed(() => getStatusInfo(this.status()));
}
