import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomRolesService } from '../../services/custom-roles.service';
import { SupabaseService } from '../../services/supabase.service';
import { CompanyUser, CustomRole } from '../../models/custom-roles.interface';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="user-management-container">
      <h2>User Management</h2>
      <p class="subtitle">Assign custom roles to users in your company</p>

      @if (loading()) {
        <div class="loading">Loading users...</div>
      }

      @if (error()) {
        <div class="alert alert-danger">
          {{ error() }}
        </div>
      }

      @if (successMessage()) {
        <div class="alert alert-success">
          {{ successMessage() }}
        </div>
      }

      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Full Name</th>
              <th>Account Type</th>
              <th>Custom Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of companyUsers(); track user.user_id) {
              <tr>
                <td>{{ user.email }}</td>
                <td>{{ user.full_name || '-' }}</td>
                <td>
                  <span [class]="'badge badge-' + user.account_type">
                    {{ user.account_type === 'super_admin' ? 'Super Admin' :
                       user.account_type === 'company_admin' ? 'Company Admin' : 'User' }}
                  </span>
                </td>
                <td>
                  @if (user.account_type === 'user') {
                    <select
                      class="role-select"
                      [value]="user.custom_role_id || ''"
                      (change)="assignRole(user.user_id, $event)"
                    >
                      <option value="">No Role Assigned</option>
                      @for (role of customRolesService.customRoles(); track role.id) {
                        <option [value]="role.id">{{ role.role_name }}</option>
                      }
                    </select>
                  } @else {
                    <span class="text-muted">N/A (Admin)</span>
                  }
                </td>
                <td>
                  @if (user.custom_role_id && user.account_type === 'user') {
                    <button
                      (click)="removeRole(user.user_id)"
                      class="btn btn-sm btn-outline-danger"
                      title="Remove role assignment"
                    >
                      Remove Role
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (companyUsers().length === 0 && !loading()) {
          <div class="empty-state">
            No users found in your company.
          </div>
        }
      </div>

      <div class="info-box">
        <h4>ℹ️ About Role Assignment</h4>
        <ul>
          <li>Only regular users can be assigned custom roles</li>
          <li>Super Admins and Company Admins have full access by default</li>
          <li>Users with custom roles will only see forms assigned to their role</li>
          <li>Removing a role removes all form access for that user</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .user-management-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 0.5rem;
      color: #333;
    }

    .subtitle {
      color: #666;
      margin-bottom: 2rem;
    }

    .loading {
      padding: 3rem;
      text-align: center;
      color: #999;
      font-size: 1.1rem;
    }

    .alert {
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .alert-danger {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .users-table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tr:hover {
      background: #f5f5f5;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .badge-super_admin {
      background: #6f42c1;
      color: white;
    }

    .badge-company_admin {
      background: #007bff;
      color: white;
    }

    .badge-user {
      background: #28a745;
      color: white;
    }

    .role-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9rem;
      min-width: 200px;
      cursor: pointer;
    }

    .role-select:focus {
      outline: none;
      border-color: #007bff;
    }

    .text-muted {
      color: #999;
      font-style: italic;
    }

    .btn {
      padding: 0.4rem 0.8rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-sm {
      padding: 0.3rem 0.6rem;
      font-size: 0.8rem;
    }

    .btn-outline-danger {
      background: transparent;
      color: #dc3545;
      border: 1px solid #dc3545;
    }

    .btn-outline-danger:hover {
      background: #dc3545;
      color: white;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: #999;
    }

    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #007bff;
      padding: 1.5rem;
      border-radius: 4px;
    }

    .info-box h4 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #0056b3;
    }

    .info-box ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .info-box li {
      margin-bottom: 0.5rem;
      color: #555;
    }

    @media (max-width: 768px) {
      .users-table-container {
        overflow-x: auto;
      }

      th, td {
        padding: 0.75rem;
        font-size: 0.85rem;
      }

      .role-select {
        min-width: 150px;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  protected customRolesService = inject(CustomRolesService);
  private supabaseService = inject(SupabaseService);

  loading = signal(false);
  companyUsers = signal<CompanyUser[]>([]);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const userId = this.supabaseService.currentUserValue?.id;
      if (!userId || !this.supabaseService.client) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await this.supabaseService.client
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No company ID found for user');
      }

      const [users, roles] = await Promise.all([
        this.customRolesService.getCompanyUsers(profile.company_id),
        this.customRolesService.getCustomRoles(profile.company_id)
      ]);

      this.companyUsers.set(users);
    } catch (err) {
      this.error.set('Failed to load data: ' + (err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async assignRole(userId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const roleId = select.value || null;

    this.error.set(null);
    this.successMessage.set(null);

    try {
      await this.customRolesService.assignRoleToUser(userId, roleId);

      // Update local state
      const users = this.companyUsers();
      const userIndex = users.findIndex(u => u.user_id === userId);
      if (userIndex !== -1) {
        const updatedUsers = [...users];
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], custom_role_id: roleId };
        this.companyUsers.set(updatedUsers);
      }

      this.successMessage.set(roleId ? 'Role assigned successfully!' : 'Role removed successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set('Failed to assign role: ' + (err as Error).message);
      // Revert select value on error
      await this.loadData();
    }
  }

  async removeRole(userId: string) {
    if (!confirm('Are you sure you want to remove this user\'s role? They will lose access to all role-specific forms.')) {
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);

    try {
      await this.customRolesService.assignRoleToUser(userId, null);

      // Update local state
      const users = this.companyUsers();
      const userIndex = users.findIndex(u => u.user_id === userId);
      if (userIndex !== -1) {
        const updatedUsers = [...users];
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], custom_role_id: null };
        this.companyUsers.set(updatedUsers);
      }

      this.successMessage.set('Role removed successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set('Failed to remove role: ' + (err as Error).message);
    }
  }
}
