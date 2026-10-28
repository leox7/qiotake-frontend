import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SessionService } from '../../../core/services/session.service';
import { LogoComponent } from '../logo/logo.component';

/**
 * The top bar of every public page.
 * - Wide screens: logo, links, then Log in / Create account (or the avatar menu when logged in).
 * - Narrow screens (under 800px): logo and a hamburger button that opens a panel with everything.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  private readonly auth = inject(AuthStateService);
  private readonly session = inject(SessionService);
  // The <app-navbar> element itself. We need it to tell whether a click happened inside or outside.
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // These come from the auth state, so the navbar updates by itself on login and logout.
  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly initials = this.auth.initials;
  readonly fullName = this.auth.fullName;

  // Is the avatar dropdown open? Is the hamburger panel open?
  readonly accountMenuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  // Students go to their bookings; landlords and admins go to their own dashboard.
  readonly dashboardLink = computed(() => {
    switch (this.auth.role()) {
      case 'LANDLORD':
        return { label: 'Dashboard', path: '/landlord' };
      case 'ADMIN':
        return { label: 'Dashboard', path: '/admin' };
      default:
        return { label: 'My bookings', path: '/bookings' };
    }
  });

  // Used to give the keyboard focus back to the button when Escape closes a menu.
  private readonly avatarButton = viewChild<ElementRef<HTMLButtonElement>>('avatarButton');
  private readonly hamburgerButton = viewChild<ElementRef<HTMLButtonElement>>('hamburgerButton');

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMenus(): void {
    this.accountMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  logOut(): void {
    this.closeMenus();
    // Tells the backend, clears this device, goes to the home page and shows the toast.
    this.session.logout();
  }

  // A click anywhere on the page: close the menus unless the click was inside the navbar.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeMenus();
    }
  }

  // Escape closes the menus and puts the focus back where the user was.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    const wasAccountOpen = this.accountMenuOpen();
    const wasMobileOpen = this.mobileMenuOpen();
    this.closeMenus();

    if (wasAccountOpen) {
      this.avatarButton()?.nativeElement.focus();
    } else if (wasMobileOpen) {
      this.hamburgerButton()?.nativeElement.focus();
    }
  }
}
