import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';

import { User, Role, BulkUserAction } from '../../../../models/auth.models';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

export interface BulkUserActionsData {
  users: User[];
  roles: Role[];
}

type BulkActionType = 'activate' | 'deactivate' | 'addRoles' | 'removeRoles' | 'replaceRoles' | 'sendPasswordReset' | 'delete';

interface BulkActionOption {
  type: BulkActionType;
  label: string;
  description: string;
  icon: string;
  dangerous?: boolean;
  requiresRoles?: boolean;
}

@Component({
  selector: 'app-bulk-user-actions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatStepperModule,
    MatTooltipModule
  ],
  templateUrl: './bulk-user-actions.component.html',
  styleUrls: ['./bulk-user-actions.component.css']
})
export class BulkUserActionsComponent {
  actionForm: FormGroup;
  isLoading = signal(false);
  selectedAction = signal<BulkActionType | null>(null);

  // Available bulk actions
  bulkActions: BulkActionOption[] = [
    {
      type: 'activate',
      label: 'Activate Users',
      description: 'Enable selected users to log in to the system',
      icon: 'check_circle'
    },
    {
      type: 'deactivate',
      label: 'Deactivate Users',
      description: 'Prevent selected users from logging in',
      icon: 'block',
      dangerous: true
    },
    {
      type: 'addRoles',
      label: 'Add Roles',
      description: 'Add additional roles to selected users',
      icon: 'add',
      requiresRoles: true
    },
    {
      type: 'removeRoles',
      label: 'Remove Roles',
      description: 'Remove specific roles from selected users',
      icon: 'remove',
      requiresRoles: true,
      dangerous: true
    },
    {
      type: 'replaceRoles',
      label: 'Replace Roles',
      description: 'Replace all current roles with new ones',
      icon: 'swap_horiz',
      requiresRoles: true,
      dangerous: true
    },
    {
      type: 'sendPasswordReset',
      label: 'Send Password Reset',
      description: 'Send password reset emails to selected users',
      icon: 'lock_reset'
    },
    {
      type: 'delete',
      label: 'Delete Users',
      description: 'Permanently delete selected users (cannot be undone)',
      icon: 'delete',
      dangerous: true
    }
  ];

  // Computed properties
  selectedUsers = computed(() => this.data.users);
  userCount = computed(() => this.selectedUsers().length);
  availableRoles = computed(() => this.data.roles);

  currentAction = computed(() => {
    const actionType = this.selectedAction();
    return this.bulkActions.find(action => action.type === actionType);
  });

  requiresRoles = computed(() => {
    const action = this.currentAction();
    return action?.requiresRoles || false;
  });

  isDangerous = computed(() => {
    const action = this.currentAction();
    return action?.dangerous || false;
  });

  // Role-related computed properties
  affectedRolesCount = computed(() => {
    if (!this.requiresRoles()) return 0;
    const roleIds = this.actionForm.get('roleIds')?.value || [];
    return roleIds.length;
  });

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<BulkUserActionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BulkUserActionsData
  ) {
    this.actionForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      actionType: [''],
      roleIds: [[]],
      confirmDangerous: [false]
    });
  }

  onActionSelect(actionType: BulkActionType): void {
    this.selectedAction.set(actionType);
    this.actionForm.patchValue({ actionType });

    // Clear role selection when switching actions
    this.actionForm.patchValue({ roleIds: [] });
  }

  onExecute(): void {
    if (!this.canExecute()) return;

    const actionType = this.selectedAction();
    const roleIds = this.actionForm.get('roleIds')?.value || [];

    this.isLoading.set(true);

    const userIds = this.selectedUsers().map(u => u.id);
    const options = this.requiresRoles() ? { roleIds } : undefined;

    this.userService.executeBulkAction(actionType!, userIds, options).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.dialogRef.close({ updated: true, result });
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Bulk action failed:', error);
        // Handle error display
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Role management
  isRoleSelected(roleId: string): boolean {
    const selectedRoles = this.actionForm.get('roleIds')?.value || [];
    return selectedRoles.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const roleIdsControl = this.actionForm.get('roleIds');
    const currentRoles = roleIdsControl?.value || [];

    if (currentRoles.includes(roleId)) {
      const updatedRoles = currentRoles.filter((id: string) => id !== roleId);
      roleIdsControl?.setValue(updatedRoles);
    } else {
      roleIdsControl?.setValue([...currentRoles, roleId]);
    }
  }

  // Validation
  canExecute(): boolean {
    const hasAction = !!this.selectedAction();
    const hasRolesIfNeeded = !this.requiresRoles() || this.affectedRolesCount() > 0;
    const confirmedDangerous = !this.isDangerous() || this.actionForm.get('confirmDangerous')?.value;
    const notLoading = !this.isLoading();

    return hasAction && hasRolesIfNeeded && confirmedDangerous && notLoading;
  }

  // User display helpers
  getUserDisplayName(user: User): string {
    return user.name || user.email;
  }

  getUserStatusIcon(user: User): string {
    if (!user.isActive) return 'block';
    if (!user.lastLogin) return 'schedule';
    return 'check_circle';
  }

  getUserStatusColor(user: User): string {
    if (!user.isActive) return 'warn';
    if (!user.lastLogin) return 'accent';
    return 'primary';
  }

  getUserRoleNames(user: User): string[] {
    return user.roles?.map(role => role.name) || [];
  }

  // Action preview helpers
  getActionPreview(): string {
    const action = this.currentAction();
    const count = this.userCount();

    if (!action) return '';

    switch (action.type) {
      case 'activate':
        return `Activate ${count} user${count !== 1 ? 's' : ''}`;
      case 'deactivate':
        return `Deactivate ${count} user${count !== 1 ? 's' : ''}`;
      case 'addRoles':
        const addCount = this.affectedRolesCount();
        return `Add ${addCount} role${addCount !== 1 ? 's' : ''} to ${count} user${count !== 1 ? 's' : ''}`;
      case 'removeRoles':
        const removeCount = this.affectedRolesCount();
        return `Remove ${removeCount} role${removeCount !== 1 ? 's' : ''} from ${count} user${count !== 1 ? 's' : ''}`;
      case 'replaceRoles':
        const replaceCount = this.affectedRolesCount();
        return `Replace roles with ${replaceCount} role${replaceCount !== 1 ? 's' : ''} for ${count} user${count !== 1 ? 's' : ''}`;
      case 'sendPasswordReset':
        return `Send password reset emails to ${count} user${count !== 1 ? 's' : ''}`;
      case 'delete':
        return `Delete ${count} user${count !== 1 ? 's' : ''} permanently`;
      default:
        return '';
    }
  }

  getSelectedRoles(): Role[] {
    const roleIds = this.actionForm.get('roleIds')?.value || [];
    return this.availableRoles().filter(role => roleIds.includes(role.id));
  }

  getRoleColor(role: Role): string {
    switch (role.scope) {
      case 'system': return 'primary';
      case 'company': return 'accent';
      default: return '';
    }
  }

  // Warning messages for dangerous actions
  getDangerousActionWarning(): string {
    const action = this.currentAction();
    const count = this.userCount();

    switch (action?.type) {
      case 'deactivate':
        return `Warning: This will prevent ${count} user${count !== 1 ? 's' : ''} from logging in to the system.`;
      case 'removeRoles':
        return `Warning: This will remove selected roles from ${count} user${count !== 1 ? 's' : ''}, which may affect their access permissions.`;
      case 'replaceRoles':
        return `Warning: This will replace all current roles for ${count} user${count !== 1 ? 's' : ''} with the selected roles only.`;
      case 'delete':
        return `DANGER: This will permanently delete ${count} user${count !== 1 ? 's' : ''} and cannot be undone. All user data will be lost.`;
      default:
        return '';
    }
  }
}
