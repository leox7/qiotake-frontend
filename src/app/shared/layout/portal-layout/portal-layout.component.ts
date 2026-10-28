import { Component, HostListener, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SessionService } from '../../../core/services/session.service';
import { getRoleLabel } from '../../../core/utils/role-label';
import { LogoComponent } from '../../components/logo/logo.component';

/** The pictures a menu item can show. Add a new name here AND a new @case in the html when you need one. */
export type PortalIcon = 'dashboard' | 'listings' | 'bookings' | 'payments' | 'notifications' | 'reports' | 'profile';

/** One line of the sidebar menu. */
export interface PortalMenuItem {
  label: string;
  /** Full address, for example '/landlord/listings'. */
  route: string;
  icon: PortalIcon;
  /** True when the item must only be active on exactly this address (the Dashboard, whose address starts every other one). */
  exact?: boolean;
  /** A number shown as a small dot next to the label (for example the requests waiting). 0 or missing shows nothing. */
  badge?: number;
}

/**
 * The header above a page. Every route of a portal writes it in its `data`:
 *   { path: 'listings', data: { header: { eyebrow: 'Manage', heading: 'My listings' } } }
 * `actionLabel` and `actionLink` are optional and make the button on the right.
 */
export interface PortalPageHeader {
  eyebrow: string;
  heading: string;
  actionLabel?: string;
  actionLink?: string;
}

/**
 * The layout of the landlord and admin areas: a sidebar on the left, the page on the right.
 * The public navbar and footer are not shown here (see app.component.ts).
 *
 * Use it once, inside the first route of a portal:
 *   <app-portal-layout [menuItems]="menu" theme="light" />
 * The pages of the portal appear where the <router-outlet> is.
 *
 * Under 1024px the sidebar becomes a drawer that slides in from the left.
 */
@Component({
  selector: 'app-portal-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LogoComponent],
  templateUrl: './portal-layout.component.html',
  styleUrl: './portal-layout.component.css',
})
export class PortalLayoutComponent {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthStateService);

  /** The sidebar links, in the order they are shown. */
  readonly menuItems = input.required<PortalMenuItem[]>();
  /** 'light' sidebar for landlords, 'dark' sidebar for admins. */
  readonly theme = input<'light' | 'dark'>('light');

  // Who is logged in, for the block at the bottom of the sidebar
  readonly initials = this.auth.initials;
  readonly fullName = this.auth.fullName;

  /** Is the drawer open? Only matters on narrow screens, wide screens always show the sidebar. */
  readonly drawerOpen = signal(false);

  /** The header of the page that is open now, or null when the route has none. */
  readonly header = signal<PortalPageHeader | null>(this.readHeader());

  // Used to give the keyboard focus back to the hamburger when Escape closes the drawer.
  private readonly hamburgerButton = viewChild<ElementRef<HTMLButtonElement>>('hamburgerButton');

  constructor() {
    // After every page change: show that page's header and close the drawer.
    // (takeUntilDestroyed stops listening when this component is removed.)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.header.set(this.readHeader());
        this.drawerOpen.set(false);
      });
  }

  /** "Landlord" or "Administrator". */
  roleLabel(): string {
    const role = this.auth.role();
    return role ? getRoleLabel(role) : '';
  }

  toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  logOut(): void {
    // Tells the backend, clears this device, goes to the home page and shows the toast.
    this.session.logout();
  }

  // Escape closes the drawer and puts the focus back on the hamburger button
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen()) {
      this.drawerOpen.set(false);
      this.hamburgerButton()?.nativeElement.focus();
    }
  }

  /** Walks down to the page that is open now and reads `data.header` from its route. */
  private readHeader(): PortalPageHeader | null {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data['header'] ?? null;
  }
}
