import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth-new.service';
import { UserManagementService } from './user-management.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Import both sets of models
import { User as AuthUser, Company as AuthCompany } from '../models/auth.models';
import { User as UserMgmtUser, Company as UserMgmtCompany } from '../models/user.models';

/**
 * Bridge service that synchronizes authentication between AuthService and UserManagementService
 * This allows the sophisticated AuthService to handle authentication while UserManagementService
 * provides the multi-tenant template management functionality
 */
@Injectable({
  providedIn: 'root'
})
export class AuthBridgeService {
  private readonly authService = inject(AuthService);
  private readonly userMgmtService = inject(UserManagementService);
  private readonly router = inject(Router);

  // Track synchronization state
  private isSyncing = signal(false);

  constructor() {
    this.initializeBridge();
  }

  /**
   * Initialize the bridge by setting up subscriptions to sync data
   */
  private initializeBridge(): void {
    // Listen to auth service login events and sync with user management
    this.authService.currentUser$.subscribe(async (authUser) => {
      if (authUser && !this.isSyncing()) {
        await this.syncUserToUserManagement(authUser);
      }
    });

    // Listen to auth service company changes
    this.authService.currentCompany$.subscribe(async (authCompany) => {
      if (authCompany && !this.isSyncing()) {
        await this.syncCompanyToUserManagement(authCompany);
      }
    });
  }

  /**
   * Enhanced login that uses AuthService but syncs to UserManagementService
   */
  async login(email: string, password: string, companyDomain?: string): Promise<boolean> {
    try {
      this.isSyncing.set(true);

      // Use AuthService for the actual authentication
      const loginRequest = {
        email: email.toLowerCase().trim(),
        password,
        companyDomain,
        rememberMe: false
      };

      const response = await firstValueFrom(this.authService.login(loginRequest));

      if (response && response.token) {
        // AuthService should automatically update currentUser$ and currentCompany$
        // Our bridge will catch these changes and sync to UserManagementService
        return true;
      }

      return false;
    } catch (error) {
      console.error('Bridge login error:', error);
      throw error;
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Enhanced logout that clears both services
   */
  async logout(): Promise<void> {
    try {
      // Logout from both services
      await this.authService.logout();
      this.userMgmtService.logout();

      // Navigate to login
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Bridge logout error:', error);
      // Even if logout fails, clear local state
      this.userMgmtService.logout();
      this.router.navigate(['/login']);
    }
  }

  /**
   * Convert AuthService user to UserManagementService user and sync
   */
  private async syncUserToUserManagement(authUser: AuthUser): Promise<void> {
    try {
      // Get the current company from AuthService
      const authCompany = await firstValueFrom(this.authService.currentCompany$);

      // Convert AuthUser to UserMgmtUser format
      const userMgmtUser: UserMgmtUser = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name || `${authUser.firstName} ${authUser.lastName}`.trim(),
        role: this.mapAuthRoleToUserMgmtRole(authUser.roles),
        companyId: authUser.companyId || authCompany?.id,
        isActive: authUser.isActive,
        createdAt: authUser.createdAt,
        lastLoginAt: authUser.lastLogin,
        permissions: this.mapAuthPermissionsToUserMgmtPermissions(authUser.roles)
      };

      // Create session in UserManagementService
      const session = {
        user: userMgmtUser,
        company: authCompany ? this.convertAuthCompanyToUserMgmtCompany(authCompany) : undefined,
        permissions: userMgmtUser.permissions || [],
        accessToken: await this.authService.getToken() || undefined
      };

      // Set the session in UserManagementService
      this.userMgmtService.setSession(session);

    } catch (error) {
      console.error('Error syncing user to UserManagementService:', error);
    }
  }

  /**
   * Convert AuthService company to UserManagementService company and sync
   */
  private async syncCompanyToUserManagement(authCompany: AuthCompany): Promise<void> {
    try {
      const userMgmtCompany = this.convertAuthCompanyToUserMgmtCompany(authCompany);

      // Ensure the company exists in UserManagementService
      await this.userMgmtService.ensureCompanyExists(userMgmtCompany);
    } catch (error) {
      console.error('Error syncing company to UserManagementService:', error);
    }
  }

  /**
   * Convert AuthService company to UserManagementService company format
   */
  private convertAuthCompanyToUserMgmtCompany(authCompany: AuthCompany): UserMgmtCompany {
    return {
      id: authCompany.id,
      name: authCompany.name,
      code: authCompany.domain, // Use domain as code
      industry: authCompany.industry,
      logo: authCompany.branding?.logo,
      active: authCompany.isActive,
      createdAt: authCompany.createdAt,
      settings: {
        brandingColor: authCompany.branding?.primaryColor,
        customLogo: authCompany.branding?.logo,
        maxUsers: authCompany.maxUsers
      },
      adminUsers: [authCompany.adminUserId],
      allowedFormTypes: []
    };
  }

  /**
   * Map AuthService roles to UserManagementService role
   */
  private mapAuthRoleToUserMgmtRole(authRoles?: any[]): 'super-admin' | 'company-admin' | 'user' {
    if (!authRoles || authRoles.length === 0) return 'user';

    // Check for system-level super admin role
    const hasSystemAdmin = authRoles.some(role =>
      role.scope === 'system' &&
      (role.name === 'super-admin' || role.name === 'system-admin')
    );

    if (hasSystemAdmin) return 'super-admin';

    // Check for company-level admin role
    const hasCompanyAdmin = authRoles.some(role =>
      role.scope === 'company' &&
      (role.name === 'admin' || role.name === 'company-admin')
    );

    if (hasCompanyAdmin) return 'company-admin';

    return 'user';
  }

  /**
   * Map AuthService permissions to UserManagementService permissions
   */
  private mapAuthPermissionsToUserMgmtPermissions(authRoles?: any[]): any[] {
    if (!authRoles) return [];

    const permissions: any[] = [];

    authRoles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach((permission: any) => {
          permissions.push({
            resource: permission.resource,
            action: permission.action,
            scope: permission.scope || role.scope
          });
        });
      }
    });

    return permissions;
  }

  /**
   * Check if user is authenticated in either service
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated() || this.userMgmtService.isLoggedIn();
  }

  /**
   * Get current user from the appropriate service
   */
  getCurrentUser(): UserMgmtUser | null {
    return this.userMgmtService.getCurrentUser();
  }

  /**
   * Get current company from the appropriate service
   */
  getCurrentCompany(): UserMgmtCompany | null {
    return this.userMgmtService.getCurrentCompany();
  }

  /**
   * Check if user has super admin privileges
   */
  isSuperAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === 'super-admin';
  }

  /**
   * Check if user has company admin privileges
   */
  isCompanyAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === 'company-admin' || currentUser?.role === 'super-admin';
  }
}
