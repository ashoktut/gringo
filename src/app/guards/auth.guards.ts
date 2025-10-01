import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-new.service';

/**
 * Authentication Guard - Check if user is logged in
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login with return url
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * Guest Guard - Redirect authenticated users away from login/register pages
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Redirect authenticated users to dashboard
  router.navigate(['/dashboard']);
  return false;
};

/**
 * Super Admin Guard - Only super admins can access
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  if (authService.isSuperAdmin()) {
    return true;
  }

  // Redirect to unauthorized page
  router.navigate(['/unauthorized']);
  return false;
};

/**
 * Company Admin Guard - Company admins and super admins can access
 */
export const companyAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  if (authService.isCompanyAdmin()) {
    return true;
  }

  // Redirect to unauthorized page
  router.navigate(['/unauthorized']);
  return false;
};

/**
 * Role Guard Factory - Check if user has specific role
 */
export function roleGuard(requiredRole: string): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    if (authService.hasRole(requiredRole)) {
      return true;
    }

    // Redirect to unauthorized page
    router.navigate(['/unauthorized']);
    return false;
  };
}

/**
 * Permission Guard Factory - Check if user has specific permission
 */
export function permissionGuard(requiredPermission: string): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    if (authService.hasPermission(requiredPermission)) {
      return true;
    }

    // Redirect to unauthorized page
    router.navigate(['/unauthorized']);
    return false;
  };
}

/**
 * Multiple Permissions Guard Factory - Check if user has ALL specified permissions
 */
export function multiplePermissionsGuard(requiredPermissions: string[]): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    const hasAllPermissions = requiredPermissions.every(permission =>
      authService.hasPermission(permission)
    );

    if (hasAllPermissions) {
      return true;
    }

    // Redirect to unauthorized page
    router.navigate(['/unauthorized']);
    return false;
  };
}

/**
 * Any Permission Guard Factory - Check if user has ANY of the specified permissions
 */
export function anyPermissionGuard(permissions: string[]): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    const hasAnyPermission = permissions.some(permission =>
      authService.hasPermission(permission)
    );

    if (hasAnyPermission) {
      return true;
    }

    // Redirect to unauthorized page
    router.navigate(['/unauthorized']);
    return false;
  };
}

/**
 * Company Access Guard - Check if user belongs to specific company or is super admin
 */
export const companyAccessGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Super admins can access any company
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Get company ID from route parameters
  const companyId = route.paramMap.get('companyId');
  const currentUser = authService.currentUser();

  if (!companyId) {
    // If no company ID in route, allow access (will be handled by component)
    return true;
  }

  if (currentUser?.companyId === companyId) {
    return true;
  }

  // Redirect to unauthorized page
  router.navigate(['/unauthorized']);
  return false;
};

/**
 * Feature Guard Factory - Check if company has specific feature enabled
 */
export function featureGuard(requiredFeature: keyof import('../models/auth.models').CompanyFeatures): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    const currentCompany = authService.currentCompany();

    if (!currentCompany) {
      router.navigate(['/unauthorized']);
      return false;
    }

    if (currentCompany.features[requiredFeature]) {
      return true;
    }

    // Redirect to feature unavailable page
    router.navigate(['/feature-unavailable'], {
      queryParams: { feature: requiredFeature }
    });
    return false;
  };
}

/**
 * Active Company Guard - Check if company is active
 */
export const activeCompanyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const currentCompany = authService.currentCompany();

  if (!currentCompany) {
    router.navigate(['/unauthorized']);
    return false;
  }

  if (currentCompany.isActive) {
    return true;
  }

  // Redirect to company suspended page
  router.navigate(['/company-suspended']);
  return false;
};

/**
 * Subscription Guard Factory - Check if company has valid subscription
 */
export function subscriptionGuard(requiredPlan?: 'basic' | 'premium' | 'enterprise'): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    const currentCompany = authService.currentCompany();

    if (!currentCompany) {
      router.navigate(['/unauthorized']);
      return false;
    }

    // Check if subscription is active
    if (currentCompany.subscription.status !== 'active') {
      router.navigate(['/subscription-required']);
      return false;
    }

    // Check specific plan if required
    if (requiredPlan) {
      const planHierarchy = { basic: 1, premium: 2, enterprise: 3 };
      const currentPlanLevel = planHierarchy[currentCompany.subscription.plan];
      const requiredPlanLevel = planHierarchy[requiredPlan];

      if (currentPlanLevel < requiredPlanLevel) {
        router.navigate(['/upgrade-required'], {
          queryParams: { requiredPlan }
        });
        return false;
      }
    }

    return true;
  };
}
