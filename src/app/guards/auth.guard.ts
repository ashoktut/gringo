import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-new.service';

/**
 * Auth Guard - Protects routes requiring authentication
 * Redirects to login if user is not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * Guest Guard - Prevents authenticated users from accessing guest pages (login, register)
 * Redirects to home if user is already authenticated
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Redirect to home if already authenticated
  router.navigate(['/']);
  return false;
};
