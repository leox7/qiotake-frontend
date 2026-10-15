import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Log in',
    // guestGuard: someone who is already logged in is sent to their own home page
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verify-otp',
    title: 'Verify your login',
    loadComponent: () =>
      import('./verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
  },
];
