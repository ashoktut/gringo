import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomRolesService } from '../../services/custom-roles.service';
import { SupabaseService } from '../../services/supabase.service';
import { CustomRole, FormType, RoleFormAssignment } from '../../models/custom-roles.interface';

@Component({
  selector: 'app-role-management',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="role-management-container">
      <h2>Role Management</h2>

      <div class="content-grid">
        <!-- Left Panel: Create/Edit Roles -->
        <div class="roles-panel">
          <h3>Custom Roles</h3>

          <div class="create-role-form">
            <input
              type="text"
              [(ngModel)]="newRoleName"
              placeholder="Role Name (e.g., Sales Rep, Driver)"
              class="form-control"
            />
            <textarea
              [(ngModel)]="newRoleDescription"
              placeholder="Role Description (optional)"
              class="form-control"
              rows="3"
            ></textarea>
            <button (click)="createRole()" class="btn btn-primary">
              Create Role
            </button>
          </div>

          <div class="roles-list">
            @if (loading()) {
              <div class="loading">Loading roles...</div>
            }

            @for (role of customRolesService.customRoles(); track role.id) {
              <div
                class="role-item"
                [class.active]="selectedRole()?.id === role.id"
                (click)="selectRole(role)"
              >
                <div class="role-info">
                  <h4>{{ role.role_name }}</h4>
                  @if (role.role_description) {
                    <p>{{ role.role_description }}</p>
                  }
                </div>
                <button
                  (click)="deleteRole(role.id, $event)"
                  class="btn btn-danger btn-sm"
                  title="Delete role"
                >
                  ×
                </button>
              </div>
            }

            @if (customRolesService.customRoles().length === 0 && !loading()) {
              <div class="empty-state">
                No custom roles created yet. Create one to get started.
              </div>
            }
          </div>
        </div>

        <!-- Right Panel: Form Permissions -->
        <div class="permissions-panel">
          <h3>Form Permissions</h3>

          @if (selectedRole(); as role) {
            <div class="selected-role-info">
              <h4>{{ role.role_name }}</h4>
              @if (role.role_description) {
                <p>{{ role.role_description }}</p>
              }
            </div>

            <div class="permissions-table">
              <table>
                <thead>
                  <tr>
                    <th>Form</th>
                    <th>View</th>
                    <th>Create</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  @for (form of customRolesService.formTypes(); track form.id) {
                    <tr>
                      <td>{{ form.form_name }}</td>
                      <td>
                        <input
                          type="checkbox"
                          [checked]="hasPermission(form.id, 'can_view')"
                          (change)="togglePermission(form.id, 'can_view', $event)"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          [checked]="hasPermission(form.id, 'can_create')"
                          (change)="togglePermission(form.id, 'can_create', $event)"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          [checked]="hasPermission(form.id, 'can_edit')"
                          (change)="togglePermission(form.id, 'can_edit', $event)"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          [checked]="hasPermission(form.id, 'can_delete')"
                          (change)="togglePermission(form.id, 'can_delete', $event)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              @if (customRolesService.formTypes().length === 0) {
                <div class="empty-state">
                  No forms available.
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              Select a role to manage its form permissions.
            </div>
          }
        </div>
      </div>

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
    </div>
  `,
  styles: [`
    .role-management-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 2rem;
      color: #333;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 2rem;
      margin-bottom: 1rem;
    }

    .roles-panel, .permissions-panel {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #555;
      font-size: 1.2rem;
    }

    .create-role-form {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem;
      margin-bottom: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .roles-list {
      max-height: 500px;
      overflow-y: auto;
    }

    .role-item {
      display: flex;
      justify-content: space-between;
      align-items: start;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .role-item:hover {
      background: #f5f5f5;
      border-color: #007bff;
    }

    .role-item.active {
      background: #e3f2fd;
      border-color: #007bff;
    }

    .role-info h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      color: #333;
    }

    .role-info p {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
    }

    .selected-role-info {
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .selected-role-info h4 {
      margin: 0 0 0.5rem 0;
      color: #007bff;
    }

    .selected-role-info p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .permissions-table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
    }

    td:not(:first-child) {
      text-align: center;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
      width: 100%;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 1.2rem;
      line-height: 1;
    }

    .loading, .empty-state {
      padding: 2rem;
      text-align: center;
      color: #999;
    }

    .alert {
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
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

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RoleManagementComponent implements OnInit {
  protected customRolesService = inject(CustomRolesService);
  private supabaseService = inject(SupabaseService);

  loading = signal(false);
  selectedRole = signal<CustomRole | null>(null);
  roleFormAssignments = signal<RoleFormAssignment[]>([]);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  newRoleName = '';
  newRoleDescription = '';

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get company_id from current user's profile
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

      await Promise.all([
        this.customRolesService.getCustomRoles(profile.company_id),
        this.customRolesService.getFormTypes(profile.company_id)
      ]);
    } catch (err) {
      this.error.set('Failed to load data: ' + (err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async createRole() {
    if (!this.newRoleName.trim()) {
      this.error.set('Role name is required');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);

    try {
      const userId = this.supabaseService.currentUserValue?.id;
      if (!userId || !this.supabaseService.client) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await this.supabaseService.client
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!profile?.company_id) {
        throw new Error('No company ID found');
      }

      await this.customRolesService.createCustomRole({
        company_id: profile.company_id,
        role_name: this.newRoleName.trim(),
        role_description: this.newRoleDescription.trim() || undefined
      });

      this.newRoleName = '';
      this.newRoleDescription = '';
      this.successMessage.set('Role created successfully!');

      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set('Failed to create role: ' + (err as Error).message);
    }
  }

  async selectRole(role: CustomRole) {
    this.selectedRole.set(role);
    this.error.set(null);

    try {
      const assignments = await this.customRolesService.getRoleFormAssignments(role.id);
      this.roleFormAssignments.set(assignments);
    } catch (err) {
      this.error.set('Failed to load role permissions: ' + (err as Error).message);
    }
  }

  async deleteRole(roleId: string, event: Event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this role? Users assigned to this role will lose their role assignment.')) {
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);

    try {
      await this.customRolesService.deleteCustomRole(roleId);

      if (this.selectedRole()?.id === roleId) {
        this.selectedRole.set(null);
        this.roleFormAssignments.set([]);
      }

      const userId = this.supabaseService.currentUserValue?.id;
      if (userId && this.supabaseService.client) {
        const { data: profile } = await this.supabaseService.client
          .from('user_profiles')
          .select('company_id')
          .eq('user_id', userId)
          .single();

        if (profile?.company_id) {
          await this.customRolesService.getCustomRoles(profile.company_id);
        }
      }

      this.successMessage.set('Role deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set('Failed to delete role: ' + (err as Error).message);
    }
  }

  hasPermission(formId: string, permission: keyof Pick<RoleFormAssignment, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>): boolean {
    const assignment = this.roleFormAssignments().find(a => a.form_type_id === formId);
    return assignment?.[permission] || false;
  }

  async togglePermission(formId: string, permission: keyof Pick<RoleFormAssignment, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const role = this.selectedRole();

    if (!role) return;

    this.error.set(null);

    try {
      const currentAssignment = this.roleFormAssignments().find(a => a.form_type_id === formId);

      await this.customRolesService.assignFormToRole({
        custom_role_id: role.id,
        form_type_id: formId,
        can_view: permission === 'can_view' ? checkbox.checked : (currentAssignment?.can_view || false),
        can_create: permission === 'can_create' ? checkbox.checked : (currentAssignment?.can_create || false),
        can_edit: permission === 'can_edit' ? checkbox.checked : (currentAssignment?.can_edit || false),
        can_delete: permission === 'can_delete' ? checkbox.checked : (currentAssignment?.can_delete || false)
      });

      // Reload assignments
      const assignments = await this.customRolesService.getRoleFormAssignments(role.id);
      this.roleFormAssignments.set(assignments);
    } catch (err) {
      this.error.set('Failed to update permission: ' + (err as Error).message);
      checkbox.checked = !checkbox.checked; // Revert checkbox
    }
  }
}
