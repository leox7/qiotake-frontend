import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';

// The landlord and admin areas have their own layout (shared/layout/portal-layout), so they must not show the public navbar and footer.
const OWN_LAYOUT_AREAS = ['landlord', 'admin'];

// Pages that keep the navbar but have no footer: the sign in pages (a short focused card) and the listings search page.
const NO_FOOTER_PAGES = ['/login', '/register', '/verify-otp', '/listings'];

/** The app shell: navbar on top, the current page in the middle, footer at the bottom. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly router = inject(Router);

  // The address of the current page, updated after every navigation. (A signal made from a stream.)
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  // The address without the "?query" and "#fragment" part
  private readonly path = computed(() => this.currentUrl().split(/[?#]/)[0]);

  // "/admin/users?page=2" -> first part is "admin" -> no navbar and footer
  readonly showNavbarAndFooter = computed(() => {
    const firstPart = this.path().split('/')[1];
    return !OWN_LAYOUT_AREAS.includes(firstPart);
  });

  // A plain "#main-content" link would be taken over by the router, so the click moves the focus by hand instead.
  skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }

  // Exact match: "/listings" has no footer, but "/listings/5" (a listing's own page) still does
  readonly showFooter = computed(
    () => this.showNavbarAndFooter() && !NO_FOOTER_PAGES.includes(this.path().replace(/\/$/, '')),
  );
}
