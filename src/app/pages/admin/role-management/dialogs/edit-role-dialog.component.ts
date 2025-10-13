import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Role, UpdateRoleRequest } from '../../../../models/role.models';
import { RoleManagementService } from '../../../../services/role-management.service';

@Component({
  selector: 'app-edit-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Edit Role</h2>

    <mat-dialog-content>
      <form [formGroup]="roleForm" class="role-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter role name" required>
          @if (roleForm.get('name')?.hasError('required') && roleForm.get('name')?.touched) {
            <mat-error>Role name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Enter role description" rows="3" maxlength="1000"></textarea>
          <mat-hint align="end">{{ roleForm.get('description')?.value?.length || 0 }}/1000</mat-hint>
        </mat-form-field>

        <div class="checkbox-field">
          <mat-checkbox formControlName="isActive">Active</mat-checkbox>
          <span class="checkbox-hint">Inactive roles cannot be assigned to users</span>
        </div>

        <div class="permissions-section">
          <h3>Permissions</h3>
          <div class="permissions-grid">
            @for (permission of availablePermissions(); track permission.id) {
              <mat-checkbox
                [checked]="isPermissionSelected(permission.id)"
                (change)="togglePermission(permission.id, $event.checked)"
                class="permission-checkbox">
                <div class="permission-info">
                  <span class="permission-name">{{ permission.name }}</span>
                  <span class="permission-description">{{ permission.description }}</span>
                </div>
              </mat-checkbox>
            }
          </div>
        </div>

        @if (selectedPermissions().length > 0) {
          <div class="selected-permissions">
            <h4>Selected Permissions ({{ selectedPermissions().length }})</h4>
            <mat-chip-set>
              @for (permId of selectedPermissions(); track permId) {
                <mat-chip (removed)="removePermission(permId)">
                  {{ getPermissionName(permId) }}
                  <button matChipRemove><mat-icon>cancel</mat-icon></button>
                </mat-chip>
              }
            </mat-chip-set>
          </div>
        }

        <div class="role-info">
          <div class="info-item">
            <span class="info-label">Scope:</span>
            <span class="info-value">{{ role.scope }}</span>
          </div>
          @if (role.companyId) {
            <div class="info-item">
              <span class="info-label">Company:</span>
              <span class="info-value">{{ getCompanyName(role.companyId) }}</span>
            </div>
          }
          <div class="info-item">
            <span class="info-label">Created:</span>
            <span class="info-value">{{ role.createdAt | date: 'medium' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Updated:</span>
            <span class="info-value">{{ role.updatedAt | date: 'medium' }}</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isSubmitting()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!isFormValid() || isSubmitting() || !hasChanges()">
        @if (isSubmitting()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Updating...</span>
        } @else {
          <ng-container>
            <mat-icon>save</mat-icon>
            <span>Update Role</span>
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .role-form { display: flex; flex-direction: column; gap: 1rem; min-width: 500px; max-width: 600px; }
    .full-width { width: 100%; }
    .checkbox-field { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem 0; }
    .checkbox-hint { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); margin-left: 2rem; }
    .permissions-section { margin-top: 1rem; padding: 1rem; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; }
    .permissions-section h3 { margin: 0 0 1rem 0; font-size: 1rem; font-weight: 500; }
    .permissions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; max-height: 300px; overflow-y: auto; }
    .permission-checkbox { padding: 0.5rem; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; }
    .permission-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .permission-name { font-weight: 500; font-size: 0.875rem; }
    .permission-description { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); }
    .selected-permissions { margin-top: 1rem; }
    .selected-permissions h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 500; }
    .role-info { margin-top: 1rem; padding: 1rem; background-color: rgba(0, 0, 0, 0.04); border-radius: 4px; }
    .info-item { display: flex; justify-content: space-between; padding: 0.25rem 0; }
    .info-label { font-weight: 500; color: rgba(0, 0, 0, 0.6); }
    .info-value { color: rgba(0, 0, 0, 0.87); }
    mat-dialog-actions button { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class EditRoleDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<EditRoleDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleManagementService);
  readonly role: Role = inject(MAT_DIALOG_DATA);

  readonly availablePermissions = this.roleService.permissions;
  readonly companies = this.roleService.companies;
  readonly isSubmitting = signal(false);
  readonly selectedPermissions = signal<string[]>([]);

  roleForm!: FormGroup;
  private initialFormValue: any;

  ngOnInit(): void {
    this.roleForm = this.fb.group({
      name: [this.role.name, [Validators.required, Validators.maxLength(255)]],
      description: [this.role.description || '', [Validators.maxLength(1000)]],
      isActive: [this.role.isActive]
    });

    this.selectedPermissions.set(this.role.permissions.map(p => p.id));
    this.initialFormValue = { ...this.roleForm.value, permissions: [...this.selectedPermissions()] };
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions().includes(permissionId);
  }

  togglePermission(permissionId: string, checked: boolean): void {
    if (checked) {
      this.selectedPermissions.update(perms => [...perms, permissionId]);
    } else {
      this.selectedPermissions.update(perms => perms.filter(p => p !== permissionId));
    }
  }

  removePermission(permissionId: string): void {
    this.selectedPermissions.update(perms => perms.filter(p => p !== permissionId));
  }

  getPermissionName(permissionId: string): string {
    return this.availablePermissions().find(p => p.id === permissionId)?.name || '';
  }

  getCompanyName(companyId: string): string {
    return this.companies().find(c => c.id === companyId)?.name || 'Unknown';
  }

  isFormValid(): boolean {
    return this.roleForm.valid && this.selectedPermissions().length > 0;
  }

  hasChanges(): boolean {
    const currentValue = { ...this.roleForm.value, permissions: [...this.selectedPermissions()] };
    return JSON.stringify(currentValue) !== JSON.stringify(this.initialFormValue);
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.isSubmitting() || !this.hasChanges()) return;

    this.isSubmitting.set(true);
    const formValue = this.roleForm.value;
    const updateData: UpdateRoleRequest = {
      id: this.role.id,
      name: formValue.name,
      description: formValue.description || undefined,
      isActive: formValue.isActive,
      permissionIds: this.selectedPermissions()
    };

    this.roleService.updateRole(updateData).subscribe({
      next: (role) => this.dialogRef.close(role),
      error: (error) => {
        console.error('Error updating role:', error);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
