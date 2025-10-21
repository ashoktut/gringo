import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';
import { AuthBridgeService } from '../services/auth-bridge.service';

export const userAuthGuard: CanActivateFn = (route, state) => {
  const authBridge = inject(AuthBridgeService);
  const router = inject(Router);

  if (authBridge.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

export const companyAdminGuard: CanActivateFn = (route, state) => {
  const authBridge = inject(AuthBridgeService);
  const router = inject(Router);

  if (!authBridge.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authBridge.isCompanyAdmin()) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authBridge = inject(AuthBridgeService);
  const router = inject(Router);

  if (!authBridge.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authBridge.isSuperAdmin()) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};
