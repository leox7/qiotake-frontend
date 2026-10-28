import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingSummary, ROOM_TYPE_LABELS } from '../../../core/models/listing.model';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

/**
 * "What are you looking for?": one card per room type with the lowest rent and how many homes are free.
 * The numbers come from the summary that the home page loads. This component only shows them.
 */
@Component({
  selector: 'app-room-types',
  imports: [RouterLink, DecimalPipe, ErrorMessageComponent, SkeletonComponent],
  templateUrl: './room-types.component.html',
  styleUrl: './room-types.component.css',
})
export class RoomTypesComponent {
  readonly summary = input<ListingSummary | null>(null);
  readonly errorText = input('');

  readonly retry = output<void>();

  readonly labels = ROOM_TYPE_LABELS;
  // Four grey cards while loading
  readonly placeholders = [1, 2, 3, 4];
}
