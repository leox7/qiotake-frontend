import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Sets the browser tab title, always in the form "<Page> | QiotaKE".
 *
 * Two ways to use it:
 * 1. Fixed titles: write `title: 'Browse homes'` on the route in a *.routes.ts file (done by the strategy below).
 * 2. Titles that depend on data (for example a listing's name): call `pageTitle.set(listing.title)` in the page.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly title = inject(Title);

  set(page: string): void {
    // The home page title already starts with the brand name, so it is not added a second time
    this.title.setTitle(page.startsWith('QiotaKE') ? page : `${page} | QiotaKE`);
  }

  /** Used when a route has no title of its own. */
  setDefault(): void {
    this.title.setTitle('QiotaKE');
  }
}

/**
 * Angular calls this after every navigation. It reads the `title` written on the route and passes it
 * to PageTitleService, so pages do not need to set their own fixed title.
 * It is switched on in app.config.ts.
 */
@Injectable({ providedIn: 'root' })
export class QiotaTitleStrategy extends TitleStrategy {
  private readonly pageTitle = inject(PageTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) {
      this.pageTitle.set(title);
    } else {
      this.pageTitle.setDefault();
    }
  }
}
