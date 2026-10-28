import { Component, computed, input, output } from '@angular/core';

/**
 * Previous / page numbers / Next, for a list that is cut into pages.
 *   <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
 * `page` starts at 0 (like the backend), the buttons show page + 1. Nothing is drawn when there is only one page.
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  /** The page that is open now, starting at 0. */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  /** The new page number, starting at 0. */
  readonly pageChange = output<number>();

  // The page numbers to show: at most 5, around the current page. Starts at 1 (not 0).
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const start = Math.max(1, Math.min(this.page() + 1 - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  });
}
