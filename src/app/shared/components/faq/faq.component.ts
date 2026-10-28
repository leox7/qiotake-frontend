import { Component, signal } from '@angular/core';
import { FAQ_ITEMS } from './faq.data';

/**
 * The question list (an "accordion"): each question is a button that opens its answer.
 * Only one answer is open at a time, and the first one is open at the start.
 * It has no page heading, so the FAQ page and the home page can each add their own.
 */
@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css',
})
export class FaqComponent {
  readonly items = FAQ_ITEMS;

  // The number of the open question. -1 means all are closed.
  readonly openIndex = signal(0);

  /** Clicking the open question closes it, clicking another one opens that one (and closes the first). */
  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
