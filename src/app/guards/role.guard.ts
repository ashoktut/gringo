import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-new.service';
import { NotificationService } from '../services/notification.service';

/**
 * Role Guard - Protects routes based on user roles
 * Usage in route config: canActivate: [roleGuard], data: { roles: ['super_admin', 'company_admin'] }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const requiredRoles = route.data['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    console.warn('roleGuard: No roles specified in route data');
    return true;
  }

  // Check if user has at least one of the required roles
  const hasRequiredRole = requiredRoles.some(role => authService.hasRole(role));

  if (hasRequiredRole) {
    return true;
  }

  // User doesn't have required role
  notificationService.showError(
    'You don\'t have permission to access this page.',
    { duration: 5000 }
  );

  // Redirect to home or previous page
  router.navigate(['/']);
  return false;
};

/**
 * Super Admin Guard - Shorthand for super admin only routes
 */
export const superAdminGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  if (authService.isSuperAdmin()) {
    return true;
  }

  notificationService.showError(
    'This page is restricted to super administrators only.',
    { duration: 5000 }
  );

  router.navigate(['/']);
  return false;
};

/**
 * Company Admin Guard - For company admin and super admin routes
 */
export const companyAdminGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  if (authService.isCompanyAdmin()) {
    return true;
  }

  notificationService.showError(
    'You need administrator privileges to access this page.',
    { duration: 5000 }
  );

  router.navigate(['/']);
  return false;
};
