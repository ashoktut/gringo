import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { Role, Permission, Company, CreateRoleRequest, UpdateRoleRequest } from '../../../../models/auth.models';
import { RoleService } from '../../../../services/role.service';
import { AuthService } from '../../../../services/auth.service';

interface DialogData {
  mode: 'create' | 'edit' | 'duplicate';
  role?: Role;
  permissions: Permission[];
  companies: Company[];
  selectedCompany: Company | null;
}

interface PermissionGroup {
  name: string;
  permissions: Permission[];
  expanded: boolean;
}

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.css']
})
export class RoleDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  roleForm!: FormGroup;
  isLoading = signal(false);
  isEdit: boolean;
  isDuplicate: boolean;

  // Permission management
  permissionGroups = signal<PermissionGroup[]>([]);
  selectedPermissions = signal<Set<string>>(new Set());

  // Current user context
  isSystemAdmin = signal(false);

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<RoleDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.isEdit = data.mode === 'edit';
    this.isDuplicate = data.mode === 'duplicate';
    this.initializeForm();
    this.setupPermissions();
  }

  ngOnInit(): void {
    this.isSystemAdmin.set(this.authService.hasRoleByName('system_admin'));

    if ((this.isEdit || this.isDuplicate) && this.data.role) {
      this.populateFormWithRoleData(this.data.role);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]],
      scope: ['company', Validators.required],
      companyId: [null],
      isActive: [true]
    });

    // Set up dynamic validation based on scope
    this.roleForm.get('scope')?.valueChanges.subscribe(scope => {
      const companyIdControl = this.roleForm.get('companyId');

      if (scope === 'company') {
        companyIdControl?.setValidators(Validators.required);
        // Auto-select company if only one available
        if (this.data.selectedCompany) {
          companyIdControl?.setValue(this.data.selectedCompany.id);
        }
      } else {
        companyIdControl?.clearValidators();
        companyIdControl?.setValue(null);
      }

      companyIdControl?.updateValueAndValidity();
    });
  }

  private setupPermissions(): void {
    // Group permissions by category for better organization
    const groups = this.groupPermissionsByCategory(this.data.permissions);
    this.permissionGroups.set(groups);
  }

  private groupPermissionsByCategory(permissions: Permission[]): PermissionGroup[] {
    const categories = new Map<string, Permission[]>();

    permissions.forEach(permission => {
      const category = this.extractCategory(permission.name);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(permission);
    });

    return Array.from(categories.entries()).map(([name, perms]) => ({
      name: this.formatCategoryName(name),
      permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
      expanded: false
    }));
  }

  private extractCategory(permissionName: string): string {
    // Extract category from permission name (e.g., "create:users" -> "users")
    const parts = permissionName.split(':');
    return parts.length > 1 ? parts[1] : 'general';
  }

  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  }

  private populateFormWithRoleData(role: Role): void {
    const formData = {
      name: this.isDuplicate ? `${role.name} (Copy)` : role.name,
      description: role.description,
      scope: role.scope,
      companyId: role.companyId,
      isActive: this.isDuplicate ? true : role.isActive
    };

    this.roleForm.patchValue(formData);

    // Set selected permissions
    const permissionIds = new Set(role.permissions?.map(p => p.id) || []);
    this.selectedPermissions.set(permissionIds);
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      this.isLoading.set(true);

      const roleData = this.buildRoleData();

      const operation = this.isEdit
        ? this.roleService.updateRole(this.data.role!.id, roleData as UpdateRoleRequest)
        : this.roleService.createRole(roleData as CreateRoleRequest);

      operation
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.isLoading.set(false);
            this.snackBar.open(
              `Role ${this.isEdit ? 'updated' : 'created'} successfully`,
              'Close',
              { duration: 3000 }
            );
            this.dialogRef.close(result);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.snackBar.open(
              `Failed to ${this.isEdit ? 'update' : 'create'} role: ${error.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
    } else {
      this.markFormGroupTouched(this.roleForm);
    }
  }

  private buildRoleData(): CreateRoleRequest | UpdateRoleRequest {
    const formValue = this.roleForm.value;
    const selectedPermissionIds = Array.from(this.selectedPermissions());

    return {
      name: formValue.name,
      description: formValue.description || undefined,
      scope: formValue.scope,
      companyId: formValue.scope === 'company' ? formValue.companyId : undefined,
      permissionIds: selectedPermissionIds,
      isActive: formValue.isActive
    };
  }

  isFormValid(): boolean {
    return this.roleForm.valid && this.selectedPermissions().size > 0;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onPermissionToggle(permission: Permission): void {
    const selected = new Set(this.selectedPermissions());

    if (selected.has(permission.id)) {
      selected.delete(permission.id);
    } else {
      selected.add(permission.id);
    }

    this.selectedPermissions.set(selected);
  }

  isPermissionSelected(permission: Permission): boolean {
    return this.selectedPermissions().has(permission.id);
  }

  toggleGroupExpansion(group: PermissionGroup): void {
    group.expanded = !group.expanded;
  }

  selectAllInGroup(group: PermissionGroup): void {
    const selected = new Set(this.selectedPermissions());
    group.permissions.forEach(permission => {
      selected.add(permission.id);
    });
    this.selectedPermissions.set(selected);
  }

  deselectAllInGroup(group: PermissionGroup): void {
    const selected = new Set(this.selectedPermissions());
    group.permissions.forEach(permission => {
      selected.delete(permission.id);
    });
    this.selectedPermissions.set(selected);
  }

  getGroupSelectionState(group: PermissionGroup): 'all' | 'some' | 'none' {
    const selectedCount = group.permissions.filter(p =>
      this.selectedPermissions().has(p.id)
    ).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === group.permissions.length) return 'all';
    return 'some';
  }

  getFormError(fieldName: string): string {
    const field = this.roleForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Role name',
      description: 'Description',
      scope: 'Scope',
      companyId: 'Company'
    };
    return labels[fieldName] || fieldName;
  }

  get selectedPermissionCount(): number {
    return this.selectedPermissions().size;
  }

  get totalPermissionCount(): number {
    return this.data.permissions.length;
  }

  get canSelectCompany(): boolean {
    return this.roleForm.get('scope')?.value === 'company';
  }

  get canCreateSystemRole(): boolean {
    return this.isSystemAdmin();
  }

  get availableScopes(): Array<{value: string, label: string}> {
    const scopes = [
      { value: 'company', label: 'Company Role' }
    ];

    if (this.canCreateSystemRole) {
      scopes.unshift({ value: 'system', label: 'System Role' });
    }

    return scopes;
  }

  getPermissionDescription(permission: Permission): string {
    return permission.description || `Permission: ${permission.name}`;
  }
}
