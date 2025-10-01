import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  User,
  Role,
  ApiResponse,
  UserPreferences
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = '/api/users';

  // Reactive state
  users = signal<User[]>([]);
  selectedUser = signal<User | null>(null);

  /**
   * Get all users for a company
   */
  getUsersByCompany(companyId: string, page = 1, limit = 20): Observable<{ users: User[], pagination: any }> {
    return this.http.get<ApiResponse<{ users: User[], pagination: any }>>(
      `${this.API_BASE}/company/${companyId}?page=${page}&limit=${limit}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch users');
        }
        this.users.set(response.data.users);
        return response.data;
      })
    );
  }

  /**
   * Get all users (Super Admin only)
   */
  getAllUsers(page = 1, limit = 20): Observable<{ users: User[], pagination: any }> {
    return this.http.get<ApiResponse<{ users: User[], pagination: any }>>(
      `${this.API_BASE}?page=${page}&limit=${limit}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch users');
        }
        return response.data;
      })
    );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.API_BASE}/${userId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'User not found');
          }
          return response.data;
        })
      );
  }

  /**
   * Create new user
   */
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.API_BASE}`, userData)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create user');
          }

          // Update local state
          const currentUsers = this.users();
          this.users.set([...currentUsers, response.data]);

          return response.data;
        })
      );
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<User>): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_BASE}/${userId}`, updates)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update user');
          }

          // Update local state
          this.updateUserInState(response.data);
          return response.data;
        })
      );
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_BASE}/${userId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete user');
          }

          // Update local state
          const currentUsers = this.users();
          const filteredUsers = currentUsers.filter(user => user.id !== userId);
          this.users.set(filteredUsers);

          // Clear selected user if it was deleted
          const selected = this.selectedUser();
          if (selected?.id === userId) {
            this.selectedUser.set(null);
          }
        })
      );
  }

  /**
   * Toggle user active status
   */
  toggleUserStatus(userId: string, isActive: boolean): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${this.API_BASE}/${userId}/status`, {
      isActive
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to update user status');
        }

        // Update local state
        this.updateUserInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Assign role to user
   */
  assignRoleToUser(userId: string, roleId: string): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.API_BASE}/${userId}/roles`, {
      roleId
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to assign role to user');
        }

        // Update local state
        this.updateUserInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Remove role from user
   */
  removeRoleFromUser(userId: string, roleId: string): Observable<User> {
    return this.http.delete<ApiResponse<User>>(`${this.API_BASE}/${userId}/roles/${roleId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to remove role from user');
          }

          // Update local state
          this.updateUserInState(response.data);
          return response.data;
        })
      );
  }

  /**
   * Set user roles (replaces all existing roles)
   */
  setUserRoles(userId: string, roleIds: string[]): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_BASE}/${userId}/roles`, {
      roleIds
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to set user roles');
        }

        // Update local state
        this.updateUserInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Observable<UserPreferences> {
    return this.http.put<ApiResponse<UserPreferences>>(`${this.API_BASE}/${userId}/preferences`, preferences)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update user preferences');
          }

          // Update the user in local state
          this.updateUserPreferences_internal(userId, response.data);
          return response.data;
        })
      );
  }

  /**
   * Reset user password (Admin only)
   */
  resetUserPassword(userId: string, newPassword?: string): Observable<{ temporaryPassword?: string }> {
    return this.http.post<ApiResponse<{ temporaryPassword?: string }>>(
      `${this.API_BASE}/${userId}/reset-password`,
      { newPassword }
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to reset user password');
        }
        return response.data;
      })
    );
  }

  /**
   * Send password reset email to user
   */
  sendPasswordResetEmail(userId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/${userId}/send-reset-email`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to send password reset email');
          }
        })
      );
  }

  /**
   * Unlock user account
   */
  unlockUserAccount(userId: string): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${this.API_BASE}/${userId}/unlock`, {})
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to unlock user account');
          }

          // Update local state
          this.updateUserInState(response.data);
          return response.data;
        })
      );
  }

  /**
   * Get user activity log
   */
  getUserActivity(userId: string, page = 1, limit = 20): Observable<any> {
    return this.http.get<ApiResponse<any>>(
      `${this.API_BASE}/${userId}/activity?page=${page}&limit=${limit}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch user activity');
        }
        return response.data;
      })
    );
  }

  /**
   * Search users
   */
  searchUsers(companyId: string, query: string, page = 1, limit = 20): Observable<{ users: User[], pagination: any }> {
    return this.http.get<ApiResponse<{ users: User[], pagination: any }>>(
      `${this.API_BASE}/company/${companyId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
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
   * Get users by role
   */
  getUsersByRole(companyId: string, roleId: string): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.API_BASE}/company/${companyId}/role/${roleId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch users by role');
          }
          return response.data;
        })
      );
  }

  /**
   * Export users to CSV
   */
  exportUsersToCSV(companyId: string): Observable<Blob> {
    return this.http.get(`${this.API_BASE}/company/${companyId}/export`, {
      responseType: 'blob'
    });
  }

  /**
   * Import users from CSV
   */
  importUsersFromCSV(companyId: string, csvFile: File): Observable<{ imported: number, errors: any[] }> {
    const formData = new FormData();
    formData.append('file', csvFile);

    return this.http.post<ApiResponse<{ imported: number, errors: any[] }>>(
      `${this.API_BASE}/company/${companyId}/import`,
      formData
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to import users');
        }

        // Refresh users list after import
        this.getUsersByCompany(companyId).subscribe();
        return response.data;
      })
    );
  }

  /**
   * Upload user profile picture
   */
  uploadProfilePicture(userId: string, imageFile: File): Observable<string> {
    const formData = new FormData();
    formData.append('profilePicture', imageFile);

    return this.http.post<ApiResponse<{ profilePictureUrl: string }>>(
      `${this.API_BASE}/${userId}/profile-picture`,
      formData
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to upload profile picture');
        }

        // Update user in local state
        this.updateUserInState_partial(userId, { profilePicture: response.data.profilePictureUrl });
        return response.data.profilePictureUrl;
      })
    );
  }

  /**
   * Get user statistics
   */
  getUserStats(userId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.API_BASE}/${userId}/stats`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch user statistics');
          }
          return response.data;
        })
      );
  }

  /**
   * Invite user to company
   */
  inviteUser(companyId: string, email: string, roleIds: string[], firstName?: string, lastName?: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/invite`, {
      companyId,
      email,
      roleIds,
      firstName,
      lastName
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to send invitation');
        }
      })
    );
  }

  /**
   * Resend user invitation
   */
  resendInvitation(userId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/${userId}/resend-invitation`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to resend invitation');
          }
        })
      );
  }

  /**
   * Accept user invitation
   */
  acceptInvitation(token: string, password: string): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.API_BASE}/accept-invitation`, {
      token,
      password
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to accept invitation');
        }
        return response.data;
      })
    );
  }

  // Private helper methods

  private updateUserInState(updatedUser: User): void {
    const currentUsers = this.users();
    const updatedUsers = currentUsers.map(user =>
      user.id === updatedUser.id ? updatedUser : user
    );
    this.users.set(updatedUsers);

    // Update selected user if it's the one being updated
    const selected = this.selectedUser();
    if (selected?.id === updatedUser.id) {
      this.selectedUser.set(updatedUser);
    }
  }

  private updateUserInState_partial(userId: string, updates: Partial<User>): void {
    const currentUsers = this.users();
    const updatedUsers = currentUsers.map(user =>
      user.id === userId
        ? { ...user, ...updates }
        : user
    );
    this.users.set(updatedUsers);

    // Update selected user
    const selected = this.selectedUser();
    if (selected?.id === userId) {
      this.selectedUser.set({ ...selected, ...updates });
    }
  }

  private updateUserPreferences_internal(userId: string, preferences: UserPreferences): void {
    const currentUsers = this.users();
    const updatedUsers = currentUsers.map(user =>
      user.id === userId
        ? { ...user, preferences: { ...user.preferences, ...preferences } }
        : user
    );
    this.users.set(updatedUsers);

    // Update selected user
    const selected = this.selectedUser();
    if (selected?.id === userId) {
      this.selectedUser.set({
        ...selected,
        preferences: { ...selected.preferences, ...preferences }
      });
    }
  }

  // Alias method for backward compatibility
  getCompanyUsers(companyId: string): Observable<{ users: User[], pagination: any }> {
    return this.getUsersByCompany(companyId);
  }

  // Additional methods referenced in components
  getUserActivityLog(userId: string): Observable<any[]> {
    // For now, return getUserActivity - this should be renamed consistently
    return this.getUserActivity(userId);
  }

  sendPasswordReset(email: string): Observable<any> {
    // Alias for existing method
    return this.sendPasswordResetEmail(email);
  }

  executeBulkAction(action: string, userIds: string[], options?: any): Observable<any> {
    return this.http.post(`${this.API_BASE}/bulk`, {
      action,
      userIds,
      options
    });
  }
}
