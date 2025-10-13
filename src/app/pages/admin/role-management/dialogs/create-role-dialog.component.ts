import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RoleScope, CreateRoleRequest } from '../../../../models/role.models';
import { RoleManagementService } from '../../../../services/role-management.service';

@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Role</h2>

    <mat-dialog-content>
      <form [formGroup]="roleForm" class="role-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter role name" required>
          @if (roleForm.get('name')?.hasError('required') && roleForm.get('name')?.touched) {
            <mat-error>Role name is required</mat-error>
          }
          @if (roleForm.get('name')?.hasError('maxlength')) {
            <mat-error>Role name cannot exceed 255 characters</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Enter role description" rows="3" maxlength="1000"></textarea>
          <mat-hint align="end">{{ roleForm.get('description')?.value?.length || 0 }}/1000</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Scope</mat-label>
          <mat-select formControlName="scope" required>
            <mat-option [value]="RoleScope.SYSTEM">
              <span class="scope-option">
                <mat-icon>admin_panel_settings</mat-icon>
                System-wide
              </span>
            </mat-option>
            <mat-option [value]="RoleScope.COMPANY">
              <span class="scope-option">
                <mat-icon>business</mat-icon>
                Company-specific
              </span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        @if (roleForm.get('scope')?.value === RoleScope.COMPANY) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Company</mat-label>
            <mat-select formControlName="companyId" required>
              @for (company of companies(); track company.id) {
                <mat-option [value]="company.id">{{ company.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

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
          @if (selectedPermissions().length === 0) {
            <div class="permissions-warning">
              <mat-icon>warning</mat-icon>
              <span>Please select at least one permission</span>
            </div>
          }
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
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isSubmitting()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!isFormValid() || isSubmitting()">
        @if (isSubmitting()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Creating...</span>
        } @else {
          <ng-container>
            <mat-icon>add</mat-icon>
            <span>Create Role</span>
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .role-form { display: flex; flex-direction: column; gap: 1rem; min-width: 500px; max-width: 600px; }
    .full-width { width: 100%; }
    .scope-option { display: flex; align-items: center; gap: 0.5rem; }
    .checkbox-field { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem 0; }
    .checkbox-hint { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); margin-left: 2rem; }
    .permissions-section { margin-top: 1rem; padding: 1rem; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; }
    .permissions-section h3 { margin: 0 0 1rem 0; font-size: 1rem; font-weight: 500; }
    .permissions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; max-height: 300px; overflow-y: auto; }
    .permission-checkbox { padding: 0.5rem; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; }
    .permission-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .permission-name { font-weight: 500; font-size: 0.875rem; }
    .permission-description { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); }
    .permissions-warning { display: flex; align-items: center; gap: 0.5rem; padding: 1rem; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-top: 1rem; color: #856404; }
    .selected-permissions { margin-top: 1rem; }
    .selected-permissions h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 500; }
    mat-dialog-actions button { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class CreateRoleDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleManagementService);

  readonly RoleScope = RoleScope;
  readonly companies = this.roleService.companies;
  readonly availablePermissions = this.roleService.permissions;
  readonly isSubmitting = signal(false);
  readonly selectedPermissions = signal<string[]>([]);

  roleForm!: FormGroup;

  ngOnInit(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      scope: [RoleScope.COMPANY, Validators.required],
      companyId: [null],
      isActive: [true]
    });

    this.roleForm.get('scope')?.valueChanges.subscribe(scope => {
      const companyIdControl = this.roleForm.get('companyId');
      if (scope === RoleScope.COMPANY) {
        companyIdControl?.setValidators([Validators.required]);
      } else {
        companyIdControl?.clearValidators();
        companyIdControl?.setValue(null);
      }
      companyIdControl?.updateValueAndValidity();
    });
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

  isFormValid(): boolean {
    return this.roleForm.valid && this.selectedPermissions().length > 0;
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.roleForm.value;
    const roleData: CreateRoleRequest = {
      name: formValue.name,
      description: formValue.description || undefined,
      scope: formValue.scope,
      companyId: formValue.companyId || undefined,
      isActive: formValue.isActive,
      permissionIds: this.selectedPermissions()
    };

    this.roleService.createRole(roleData).subscribe({
      next: (role) => this.dialogRef.close(role),
      error: (error) => {
        console.error('Error creating role:', error);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
