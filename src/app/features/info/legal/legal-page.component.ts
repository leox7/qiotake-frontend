import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_LAST_UPDATED } from './legal-constants';

/** One numbered part of a legal page. Empty paragraphs are skipped (see MPESA_SANDBOX_NOTICE). */
export interface LegalSection {
  id: string; // used for the link that scrolls to it, so use letters and dashes only
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

/**
 * The page used by both /terms and /privacy. Give it a heading and the sections, it does the rest:
 * a table of contents (a list on computers, a dropdown on phones) that scrolls to a section and
 * marks the one you are reading.
 */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.css',
})
export class LegalPageComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly heading = input.required<string>();
  readonly sections = input.required<LegalSection[]>();

  readonly lastUpdated = LEGAL_LAST_UPDATED;

  // The id of the section you are reading now. '' until the page is drawn, which means "the first one".
  readonly activeId = signal('');

  constructor() {
    // Only runs in the browser, after the sections are on the screen
    afterNextRender(() => this.watchSections());
  }

  /** Smoothly scrolls to a section, unless the visitor asked their device for less motion. */
  goTo(id: string): void {
    const section = document.getElementById(id);
    if (!section) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    this.activeId.set(id);
  }

  /** The phone dropdown calls this when a section is chosen. */
  onJump(event: Event): void {
    this.goTo((event.target as HTMLSelectElement).value);
  }

  /** Is this the section being read? Before any scrolling, that is the first section. */
  isActive(id: string, index: number): boolean {
    return this.activeId() ? this.activeId() === id : index === 0;
  }

  /**
   * Tells us when a section reaches the top part of the screen, and marks it as the current one.
   * The bottom margin of -70% means only the top 30% of the screen counts.
   */
  private watchSections(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const reached = entries.find((entry) => entry.isIntersecting);
        if (reached) {
          this.activeId.set(reached.target.id);
        }
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    this.host.nativeElement.querySelectorAll('section[id]').forEach((section) => observer.observe(section));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
