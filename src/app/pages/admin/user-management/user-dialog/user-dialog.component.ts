import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { User, Role, Company, CreateUserRequest, UpdateUserRequest } from '../../../../models/auth.models';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

export interface UserDialogData {
  mode: 'create' | 'edit';
  user?: User;
  roles: Role[];
  currentCompany?: Company | null;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.css']
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;
  isLoading = signal(false);
  isCreating = computed(() => this.data.mode === 'create');

  // Available roles filtered by current user permissions
  availableRoles = computed(() => {
    const currentUser = this.authService.getCurrentUserSync();
    const isSystemAdmin = this.authService.hasRoleByName('system_admin');

    if (isSystemAdmin) {
      return this.data.roles;
    }

    // Company admins can assign system roles and their company roles
    return this.data.roles.filter(role =>
      role.scope === 'system' ||
      (role.scope === 'company' && role.companyId === currentUser?.companyId)
    );
  });

  // Company options for system admins
  companyOptions = signal<Company[]>([]);
  canSelectCompany = computed(() => this.authService.hasRoleByName('system_admin'));

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData
  ) {
    this.userForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.user) {
      this.populateForm(this.data.user);
    }

    // Set default company for new users
    if (this.data.mode === 'create' && this.data.currentCompany && !this.canSelectCompany()) {
      this.userForm.patchValue({
        companyId: this.data.currentCompany.id
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      companyId: ['', this.canSelectCompany() ? [Validators.required] : []],
      roleIds: [[], [Validators.required]],
      isActive: [true],
      sendWelcomeEmail: [true],
      profile: this.fb.group({
        firstName: [''],
        lastName: [''],
        phone: [''],
        title: [''],
        department: [''],
        timezone: [''],
        language: ['en']
      }),
      settings: this.fb.group({
        emailNotifications: [true],
        smsNotifications: [false],
        darkMode: [false],
        twoFactorEnabled: [false]
      })
    });
  }

  private populateForm(user: User): void {
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      roleIds: user.roles?.map(role => role.id) || [],
      isActive: user.isActive,
      sendWelcomeEmail: false,
      profile: {
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phone: user.profile?.phone || '',
        title: user.profile?.title || '',
        department: user.profile?.department || '',
        timezone: user.profile?.timezone || '',
        language: user.profile?.language || 'en'
      },
      settings: {
        emailNotifications: user.settings?.emailNotifications ?? true,
        smsNotifications: user.settings?.smsNotifications ?? false,
        darkMode: user.settings?.darkMode ?? false,
        twoFactorEnabled: user.settings?.twoFactorEnabled ?? false
      }
    });

    // Disable email editing for existing users
    this.userForm.get('email')?.disable();
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isLoading.set(true);

      const formValue = this.userForm.getRawValue();

      if (this.data.mode === 'create') {
        this.createUser(formValue);
      } else if (this.data.user) {
        this.updateUser(this.data.user.id, formValue);
      }
    }
  }

  private createUser(userData: any): void {
    const createRequest: CreateUserRequest = {
      name: userData.name,
      email: userData.email,
      companyId: userData.companyId || this.data.currentCompany?.id,
      roleIds: userData.roleIds,
      isActive: userData.isActive,
      sendWelcomeEmail: userData.sendWelcomeEmail,
      profile: userData.profile,
      settings: userData.settings
    };

    this.userService.createUser(createRequest).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.dialogRef.close(user);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Failed to create user:', error);
        // Handle error display
      }
    });
  }

  private updateUser(userId: string, userData: any): void {
    const updateRequest: UpdateUserRequest = {
      name: userData.name,
      roleIds: userData.roleIds,
      isActive: userData.isActive,
      profile: userData.profile,
      settings: userData.settings
    };

    this.userService.updateUser(userId, updateRequest).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.dialogRef.close(user);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Failed to update user:', error);
        // Handle error display
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Role management methods
  isRoleSelected(roleId: string): boolean {
    const selectedRoles = this.userForm.get('roleIds')?.value || [];
    return selectedRoles.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const roleIdsControl = this.userForm.get('roleIds');
    const currentRoles = roleIdsControl?.value || [];

    if (currentRoles.includes(roleId)) {
      const updatedRoles = currentRoles.filter((id: string) => id !== roleId);
      roleIdsControl?.setValue(updatedRoles);
    } else {
      roleIdsControl?.setValue([...currentRoles, roleId]);
    }
  }

  getRolesByScope(scope: 'system' | 'company') {
    return this.availableRoles().filter(role => role.scope === scope);
  }

  getRoleDescription(role: Role): string {
    return role.description || `${role.name} role permissions`;
  }

  getRolePermissionCount(role: Role): number {
    return role.permissions?.length || 0;
  }

  // Validation helpers
  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      return `${fieldName} must be at least ${field.getError('minlength').requiredLength} characters`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  // Dialog title
  getDialogTitle(): string {
    return this.data.mode === 'create' ? 'Create New User' : `Edit User: ${this.data.user?.name}`;
  }

  // Form validation
  get canSave(): boolean {
    return this.userForm.valid && !this.isLoading();
  }

  // Language options
  languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' }
  ];

  // Timezone options (simplified list)
  timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney' }
  ];
}
