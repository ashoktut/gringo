import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-new.service';
import { NotificationService } from '../services/notification.service';

/**
 * Permission Guard - Fine-grained access control based on specific permissions
 * Usage in route config: canActivate: [permissionGuard], data: { permissions: ['users:manage', 'roles:create'] }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const requiredPermissions = route.data['permissions'] as string[];
  const requireAll = route.data['requireAllPermissions'] === true; // Default: require ANY permission

  if (!requiredPermissions || requiredPermissions.length === 0) {
    console.warn('permissionGuard: No permissions specified in route data');
    return true;
  }

  // Check permissions based on requireAll flag
  const hasPermission = requireAll
    ? requiredPermissions.every(permission => authService.hasPermission(permission))
    : requiredPermissions.some(permission => authService.hasPermission(permission));

  if (hasPermission) {
    return true;
  }

  // User doesn't have required permissions
  const message = requireAll
    ? 'You don\'t have all the required permissions to access this page.'
    : 'You don\'t have permission to access this page.';

  notificationService.showError(message, { duration: 5000 });

  // Redirect to home or previous page
  router.navigate(['/']);
  return false;
};

/**
 * Resource Permission Guard - Check permission for specific resource action
 * Usage: canActivate: [resourcePermissionGuard], data: { resource: 'users', action: 'manage' }
 */
export const resourcePermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const resource = route.data['resource'] as string;
  const action = route.data['action'] as string;

  if (!resource || !action) {
    console.warn('resourcePermissionGuard: Resource or action not specified in route data');
    return true;
  }

  if (authService.canAccess(resource, action)) {
    return true;
  }

  notificationService.showError(
    `You don't have permission to ${action} ${resource}.`,
    { duration: 5000 }
  );

  router.navigate(['/']);
  return false;
};
