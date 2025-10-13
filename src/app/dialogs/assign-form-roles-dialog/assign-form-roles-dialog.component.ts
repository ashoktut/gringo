import { Component, Inject, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { Role } from '../../models/role.models';
import { RoleManagementService } from '../../services/role-management.service';
import { AuthService } from '../../services/auth-new.service';

export interface AssignFormRolesDialogData {
  formId: string;
  formName: string;
  currentRoleIds: string[];
  requiresApproval?: boolean;
  approverRoleIds?: string[];
}

@Component({
  selector: 'app-assign-form-roles-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatInputModule
  ],
  templateUrl: './assign-form-roles-dialog.component.html',
  styleUrl: './assign-form-roles-dialog.component.css'
})
export class AssignFormRolesDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleManagementService);
  private readonly authService = inject(AuthService);

  roleForm!: FormGroup;
  loading = signal(false);
  searchTerm = signal('');

  // Available roles for company
  private allRolesSignal = signal<Role[]>([]);

  // Computed filtered roles based on search
  filteredRoles = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const roles = this.allRolesSignal();

    if (!search) return roles;

    return roles.filter(role =>
      role.name.toLowerCase().includes(search) ||
      role.description?.toLowerCase().includes(search)
    );
  });

  // Computed selected roles for display
  selectedAccessRoles = computed(() => {
    const selectedIds = this.roleForm?.get('accessRoleIds')?.value || [];
    return this.allRolesSignal().filter(role => selectedIds.includes(role.id));
  });

  selectedApproverRoles = computed(() => {
    const selectedIds = this.roleForm?.get('approverRoleIds')?.value || [];
    return this.allRolesSignal().filter(role => selectedIds.includes(role.id));
  });

  constructor(
    public dialogRef: MatDialogRef<AssignFormRolesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignFormRolesDialogData
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCompanyRoles();
  }

  private initializeForm(): void {
    this.roleForm = this.fb.group({
      accessRoleIds: [this.data.currentRoleIds || [], Validators.required],
      requiresApproval: [this.data.requiresApproval || false],
      approverRoleIds: [this.data.approverRoleIds || []]
    });

    // Watch for requiresApproval changes
    this.roleForm.get('requiresApproval')?.valueChanges.subscribe(requiresApproval => {
      const approverControl = this.roleForm.get('approverRoleIds');
      if (requiresApproval) {
        approverControl?.setValidators(Validators.required);
      } else {
        approverControl?.clearValidators();
        approverControl?.setValue([]);
      }
      approverControl?.updateValueAndValidity();
    });
  }

  private loadCompanyRoles(): void {
    this.loading.set(true);

    this.roleService.loadRoles().subscribe({
      next: (roles) => {
        this.allRolesSignal.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  toggleRoleSelection(roleId: string, type: 'access' | 'approver'): void {
    const controlName = type === 'access' ? 'accessRoleIds' : 'approverRoleIds';
    const control = this.roleForm.get(controlName);
    const currentValue = control?.value || [];

    if (currentValue.includes(roleId)) {
      control?.setValue(currentValue.filter((id: string) => id !== roleId));
    } else {
      control?.setValue([...currentValue, roleId]);
    }
  }

  isRoleSelected(roleId: string, type: 'access' | 'approver'): boolean {
    const controlName = type === 'access' ? 'accessRoleIds' : 'approverRoleIds';
    const currentValue = this.roleForm.get(controlName)?.value || [];
    return currentValue.includes(roleId);
  }

  removeRole(roleId: string, type: 'access' | 'approver'): void {
    const controlName = type === 'access' ? 'accessRoleIds' : 'approverRoleIds';
    const control = this.roleForm.get(controlName);
    const currentValue = control?.value || [];
    control?.setValue(currentValue.filter((id: string) => id !== roleId));
  }

  selectAll(): void {
    const allRoleIds = this.filteredRoles().map(role => role.id);
    this.roleForm.get('accessRoleIds')?.setValue(allRoleIds);
  }

  clearAll(): void {
    this.roleForm.get('accessRoleIds')?.setValue([]);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.roleForm.invalid) {
      return;
    }

    const formValue = this.roleForm.value;
    this.dialogRef.close({
      accessRoleIds: formValue.accessRoleIds,
      requiresApproval: formValue.requiresApproval,
      approverRoleIds: formValue.approverRoleIds
    });
  }
}
