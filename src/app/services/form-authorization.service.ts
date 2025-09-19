import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormConfiguration } from './form-config.service';
import { AuthService, UserRole } from './auth.service';

/**
 * Service responsible for authorization and access control logic
 * Follows separation of concerns - isolates authorization logic
 */
@Injectable({
  providedIn: 'root'
})
export class FormAuthorizationService {
  private authService = inject(AuthService);

  /**
   * Check if user can access a specific form
   */
  canAccessForm(form: FormConfiguration, userRole?: UserRole, companyId?: string): boolean {
    // Check role-based access
    if (form.metadata.allowedRoles && form.metadata.allowedRoles.length > 0) {
      const currentRole = userRole || this.authService.getCurrentUserSync()?.role || 'public';
      if (!form.metadata.allowedRoles.includes(currentRole)) {
        return false;
      }
    }

    // Check company-specific access
    if (form.companyId && companyId && form.companyId !== companyId) {
      return false;
    }

    // Check if form is active
    return form.isActive;
  }

  /**
   * Filter forms based on user access permissions
   */
  filterFormsForUser(
    forms: FormConfiguration[],
    userRole?: UserRole,
    companyId?: string
  ): FormConfiguration[] {
    return forms.filter(form => this.canAccessForm(form, userRole, companyId));
  }

  /**
   * Get forms for specific category and role
   */
  getFormsForRoleAndCategory(
    forms: FormConfiguration[],
    role: UserRole,
    category?: string,
    companyId?: string
  ): FormConfiguration[] {
    let filteredForms = this.filterFormsForUser(forms, role, companyId);

    // Filter by category if specified
    if (category && category !== 'all') {
      filteredForms = filteredForms.filter(form =>
        form.metadata.category === category
      );
    }

    return filteredForms;
  }

  /**
   * Check if user has permission for specific action
   */
  hasPermission(action: string, resource: string, userRole?: UserRole): boolean {
    const currentRole = userRole || this.authService.getCurrentUserSync()?.role || 'public';

    // Define permission matrix
    const permissions: Record<UserRole, string[]> = {
      admin: ['*'], // Admin has all permissions
      rep: ['read:forms', 'create:submissions', 'read:submissions'],
      client: ['read:forms', 'create:submissions'],
      public: ['read:public-forms'],
      guest: ['read:public-forms']
    };

    const userPermissions = permissions[currentRole] || [];

    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check for specific permission
    const permission = `${action}:${resource}`;
    return userPermissions.includes(permission);
  }
}
