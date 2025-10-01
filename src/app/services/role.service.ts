import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Role,
  Permission,
  User,
  ApiResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = '/api/roles';

  // Reactive state
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);

  /**
   * Get all roles for a company
   */
  getRolesByCompany(companyId: string): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.API_BASE}/company/${companyId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch roles');
          }
          this.roles.set(response.data);
          return response.data;
        })
      );
  }

  /**
   * Get all system permissions
   */
  getSystemPermissions(): Observable<Permission[]> {
    return this.http.get<ApiResponse<Permission[]>>(`${this.API_BASE}/permissions`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch permissions');
          }
          this.permissions.set(response.data);
          return response.data;
        })
      );
  }

  /**
   * Create new role
   */
  createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.API_BASE}`, roleData)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create role');
          }

          // Update local state
          const currentRoles = this.roles();
          this.roles.set([...currentRoles, response.data]);

          return response.data;
        })
      );
  }

  /**
   * Update role
   */
  updateRole(roleId: string, updates: Partial<Role>): Observable<Role> {
    return this.http.put<ApiResponse<Role>>(`${this.API_BASE}/${roleId}`, updates)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update role');
          }

          // Update local state
          const currentRoles = this.roles();
          const updatedRoles = currentRoles.map(role =>
            role.id === roleId ? response.data! : role
          );
          this.roles.set(updatedRoles);

          return response.data;
        })
      );
  }

  /**
   * Delete role
   */
  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_BASE}/${roleId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete role');
          }

          // Update local state
          const currentRoles = this.roles();
          const filteredRoles = currentRoles.filter(role => role.id !== roleId);
          this.roles.set(filteredRoles);
        })
      );
  }

  /**
   * Toggle role active status
   */
  toggleRoleStatus(roleId: string, isActive: boolean): Observable<Role> {
    return this.http.patch<ApiResponse<Role>>(`${this.API_BASE}/${roleId}/status`, {
      isActive
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to update role status');
        }

        // Update local state
        const currentRoles = this.roles();
        const updatedRoles = currentRoles.map(role =>
          role.id === roleId ? response.data! : role
        );
        this.roles.set(updatedRoles);

        return response.data;
      })
    );
  }

  /**
   * Add permission to role
   */
  addPermissionToRole(roleId: string, permissionId: string): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.API_BASE}/${roleId}/permissions`, {
      permissionId
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to add permission to role');
        }

        // Update local state
        this.updateRoleInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(roleId: string, permissionId: string): Observable<Role> {
    return this.http.delete<ApiResponse<Role>>(`${this.API_BASE}/${roleId}/permissions/${permissionId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to remove permission from role');
          }

          // Update local state
          this.updateRoleInState(response.data);
          return response.data;
        })
      );
  }

  /**
   * Set role permissions (replaces all existing permissions)
   */
  setRolePermissions(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.put<ApiResponse<Role>>(`${this.API_BASE}/${roleId}/permissions`, {
      permissionIds
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to set role permissions');
        }

        // Update local state
        this.updateRoleInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Get users assigned to a role
   */
  getUsersByRole(roleId: string): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.API_BASE}/${roleId}/users`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch users for role');
          }
          return response.data;
        })
      );
  }

  /**
   * Assign role to user
   */
  assignRoleToUser(roleId: string, userId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/${roleId}/users`, {
      userId
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to assign role to user');
        }
      })
    );
  }

  /**
   * Remove role from user
   */
  removeRoleFromUser(roleId: string, userId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_BASE}/${roleId}/users/${userId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to remove role from user');
          }
        })
      );
  }

  /**
   * Get role by ID
   */
  getRoleById(roleId: string): Observable<Role> {
    return this.http.get<ApiResponse<Role>>(`${this.API_BASE}/${roleId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Role not found');
          }
          return response.data;
        })
      );
  }

  /**
   * Clone role (create copy with different name)
   */
  cloneRole(roleId: string, newName: string, newDisplayName: string): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.API_BASE}/${roleId}/clone`, {
      name: newName,
      displayName: newDisplayName
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to clone role');
        }

        // Update local state
        const currentRoles = this.roles();
        this.roles.set([...currentRoles, response.data]);

        return response.data;
      })
    );
  }

  /**
   * Get default roles for new companies
   */
  getDefaultCompanyRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.API_BASE}/defaults`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch default roles');
          }
          return response.data;
        })
      );
  }

  /**
   * Create default roles for a company
   */
  createDefaultRolesForCompany(companyId: string): Observable<Role[]> {
    return this.http.post<ApiResponse<Role[]>>(`${this.API_BASE}/create-defaults`, {
      companyId
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to create default roles');
        }

        // Update local state
        const currentRoles = this.roles();
        this.roles.set([...currentRoles, ...response.data]);

        return response.data;
      })
    );
  }

  /**
   * Search roles by name
   */
  searchRoles(companyId: string, query: string): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(
      `${this.API_BASE}/company/${companyId}/search?q=${encodeURIComponent(query)}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Search failed');
        }
        return response.data;
      })
    );
  }

  /**
   * Get role statistics
   */
  getRoleStats(roleId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.API_BASE}/${roleId}/stats`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch role statistics');
          }
          return response.data;
        })
      );
  }

  // Private helper methods

  private updateRoleInState(updatedRole: Role): void {
    const currentRoles = this.roles();
    const updatedRoles = currentRoles.map(role =>
      role.id === updatedRole.id ? updatedRole : role
    );
    this.roles.set(updatedRoles);
  }

  // Additional methods referenced in components
  getAllRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.API_BASE}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch roles');
          }
          this.roles.set(response.data);
          return response.data;
        })
      );
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.getSystemPermissions();
  }

  getCompanyRoles(companyId: string): Observable<Role[]> {
    return this.getRolesByCompany(companyId);
  }
}
