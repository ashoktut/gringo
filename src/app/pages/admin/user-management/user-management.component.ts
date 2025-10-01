import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { User, Role, Company, CreateUserRequest, UpdateUserRequest, UserStatus } from '../../../models/auth.models';
import { UserService } from '../../../services/user.service';
import { RoleService } from '../../../services/role.service';
import { CompanyService } from '../../../services/company.service';
import { AuthService } from '../../../services/auth.service';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { BulkUserActionsComponent } from './bulk-user-actions/bulk-user-actions.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatTabsModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  users = signal<User[]>([]);
  filteredUsers: any; // Will be assigned as computed in setupFilters
  availableRoles = signal<Role[]>([]);
  selectedUsers = signal<Set<string>>(new Set());
  selectedCompany = signal<Company | null>(null);
  isLoading = signal(false);
  searchTerm = signal('');
  statusFilter = signal<UserStatus | 'all'>('all');
  roleFilter = signal<string | 'all'>('all');

  // Current user context
  currentUser = computed(() => this.authService.getCurrentUserSync());
  currentCompany = computed(() => this.authService.currentCompany());
  isSystemAdmin = computed(() => this.authService.hasRoleByName('system_admin'));
  isCompanyAdmin = computed(() => this.authService.hasRoleByName('company_admin'));

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'name',
    'email',
    'roles',
    'status',
    'lastLogin',
    'createdAt',
    'actions'
  ];

  // Filter options
  statusOptions: { value: UserStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' }
  ];

  // Computed properties
  totalUsers = computed(() => this.users().length);
  activeUsers = computed(() =>
    this.users().filter(u => u.isActive).length
  );
  pendingUsers = computed(() =>
    this.users().filter(u => !u.isActive && this.getUserStatus(u) === 'pending').length
  );
  suspendedUsers = computed(() =>
    this.users().filter(u => this.getUserStatus(u) === 'suspended').length
  );
  selectedCount = computed(() => this.selectedUsers().size);

  // Additional computed properties for template
  userStats = computed(() => ({
    total: this.totalUsers(),
    active: this.activeUsers(),
    inactive: this.users().filter(u => !u.isActive).length,
    pending: this.pendingUsers(),
    suspended: this.suspendedUsers(),
    totalLogins: this.users().reduce((total, user) => total + (user.lastLogin ? 1 : 0), 0)
  }));

  roles = computed(() => this.availableRoles());
  selectedUserCount = computed(() => this.selectedCount());
  inactiveUsers = computed(() => this.users().filter(u => !u.isActive).length);

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private companyService: CompanyService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.setupFilters();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupContextBasedView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Use computed to automatically filter users based on search and filter criteria
    this.filteredUsers = computed(() => {
      let filtered = this.users();

      // Apply search filter
      const search = this.searchTerm().toLowerCase();
      if (search) {
        filtered = filtered.filter(user =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.roles?.some(role => role.name.toLowerCase().includes(search))
        );
      }

      // Apply status filter
      const status = this.statusFilter();
      if (status !== 'all') {
        filtered = filtered.filter(user => this.getUserStatus(user) === status);
      }

      // Apply role filter
      const roleId = this.roleFilter();
      if (roleId !== 'all') {
        filtered = filtered.filter(user =>
          user.roles?.some(role => role.id === roleId)
        );
      }

      return filtered;
    });
  }

  private setupContextBasedView(): void {
    const currentUser = this.currentUser();
    const currentCompany = this.currentCompany();

    if (currentUser && currentCompany && !this.isSystemAdmin()) {
      // For company admins, set the selected company
      this.selectedCompany.set(currentCompany);
    }
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    // Load users and roles in parallel
    Promise.all([
      this.loadUsers(),
      this.loadAvailableRoles()
    ]).finally(() => {
      this.isLoading.set(false);
    });
  }

  private async loadUsers(): Promise<void> {
    try {
      const currentUser = this.currentUser();

      if (this.isSystemAdmin()) {
        // System admins can see all users
        const response = await this.userService.getAllUsers().toPromise();
        if (Array.isArray(response)) {
          this.users.set(response);
        } else if (response && 'users' in response) {
          this.users.set(response.users);
        } else {
          this.users.set([]);
        }
      } else if (currentUser?.companyId) {
        // Company admins can only see users from their company
        const response = await this.userService.getCompanyUsers(currentUser.companyId).toPromise();
        if (Array.isArray(response)) {
          this.users.set(response);
        } else if (response && 'users' in response) {
          this.users.set(response.users);
        } else {
          this.users.set([]);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  private async loadAvailableRoles(): Promise<void> {
    try {
      const currentUser = this.currentUser();

      if (this.isSystemAdmin()) {
        // System admins can assign all roles
        const roles = await this.roleService.getAllRoles().toPromise();
        this.availableRoles.set(roles || []);
      } else if (currentUser?.companyId) {
        // Company admins can only assign company roles and system roles they have
        const roles = await this.roleService.getCompanyRoles(currentUser.companyId).toPromise();
        this.availableRoles.set(roles || []);
      }
    } catch (error) {
      console.error('Failed to load available roles:', error);
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onStatusFilterChange(status: UserStatus | 'all'): void {
    this.statusFilter.set(status);
  }

  onRoleFilterChange(roleId: string | 'all'): void {
    this.roleFilter.set(roleId);
  }

  onUserSelectionToggle(user: User): void {
    const selected = new Set<string>(this.selectedUsers());

    if (selected.has(user.id)) {
      selected.delete(user.id);
    } else {
      selected.add(user.id);
    }

    this.selectedUsers.set(selected);
  }

  onSelectAllToggle(): void {
    const filtered = this.filteredUsers();
    const selected = new Set<string>(this.selectedUsers());

    if (selected.size === filtered.length) {
      // Deselect all
      this.selectedUsers.set(new Set());
    } else {
      // Select all filtered users
      const newSelection = new Set<string>(filtered.map((u: User) => u.id));
      this.selectedUsers.set(newSelection);
    }
  }

  isUserSelected(user: User): boolean {
    return this.selectedUsers().has(user.id);
  }

  isAllSelected(): boolean {
    const filtered = this.filteredUsers();
    return filtered.length > 0 && this.selectedUsers().size === filtered.length;
  }

  isIndeterminate(): boolean {
    const selectedCount = this.selectedUsers().size;
    const filteredCount = this.filteredUsers().length;
    return selectedCount > 0 && selectedCount < filteredCount;
  }

  openCreateUserDialog(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '800px',
      data: {
        mode: 'create',
        availableRoles: this.availableRoles(),
        selectedCompany: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshUsers();
        }
      });
  }

  openEditUserDialog(user: User): void {
    if (!this.canEditUser(user)) return;

    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '800px',
      data: {
        mode: 'edit',
        user,
        availableRoles: this.availableRoles(),
        selectedCompany: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshUsers();
        }
      });
  }

  viewUserDetails(user: User): void {
    const dialogRef = this.dialog.open(UserDetailsComponent, {
      width: '1000px',
      data: { user }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.updated) {
          this.refreshUsers();
        }
      });
  }

  openBulkActions(): void {
    if (this.selectedCount() === 0) return;

    const selectedUsersList = this.users().filter((u: User) => this.selectedUsers().has(u.id));

    const dialogRef = this.dialog.open(BulkUserActionsComponent, {
      width: '700px',
      data: {
        users: selectedUsersList,
        availableRoles: this.availableRoles()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.updated) {
          this.selectedUsers.set(new Set());
          this.refreshUsers();
        }
      });
  }

  toggleUserStatus(user: User): void {
    if (!this.canEditUser(user)) return;

    const newStatus = user.isActive ? false : true;

    const updateData: UpdateUserRequest = {
      isActive: newStatus
    };

    this.userService.updateUser(user.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshUsers();
        },
        error: (error) => {
          console.error('Failed to update user status:', error);
        }
      });
  }

  sendPasswordReset(user: User): void {
    if (!this.canEditUser(user)) return;

    this.userService.sendPasswordReset(user.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Password reset sent to:', user.email);
        },
        error: (error) => {
          console.error('Failed to send password reset:', error);
        }
      });
  }

  deleteUser(user: User): void {
    if (!this.canDeleteUser(user)) return;

    const confirmMessage = `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.refreshUsers();
          },
          error: (error) => {
            console.error('Failed to delete user:', error);
          }
        });
    }
  }

  refreshUsers(): void {
    this.loadUsers();
  }

  exportUsers(): void {
    const usersData = this.filteredUsers().map((user: User) => ({
      name: user.name,
      email: user.email,
      roles: user.roles?.map((r: Role) => r.name) || [],
      status: this.getUserStatus(user),
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }));

    const dataStr = JSON.stringify(usersData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Permission checks
  canCreateUser(): boolean {
    return this.authService.hasPermission('create:users');
  }

  canEditUser(user: User): boolean {
    if (!this.authService.hasPermission('edit:users')) return false;

    // System admins can edit all users
    if (this.isSystemAdmin()) return true;

    // Company admins can only edit users from their company
    const currentUser = this.currentUser();
    return user.companyId === currentUser?.companyId;
  }

  canDeleteUser(user: User): boolean {
    if (!this.authService.hasPermission('delete:users')) return false;

    // Cannot delete yourself
    const currentUser = this.currentUser();
    if (user.id === currentUser?.id) return false;

    // Same edit rules apply for deletion
    return this.canEditUser(user);
  }

  canBulkEdit(): boolean {
    return this.authService.hasPermission('edit:users') && this.selectedCount() > 0;
  }

  // Utility methods
  getUserStatus(user: User): UserStatus {
    if (!user.isActive) {
      // Check if user has logged in before
      return user.lastLogin ? 'suspended' : 'pending';
    }
    return 'active';
  }

  formatDate(date: Date | string | null): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  formatDateTime(date: Date | string | null): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStatusColor(status: UserStatus): string {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'accent';
      case 'suspended': return 'warn';
      case 'inactive': return '';
      default: return '';
    }
  }

  getRoleNames(user: User): string[] {
    return user.roles?.map(role => role.name) || [];
  }

  getRoleName(roleId: string): string {
    const role = this.availableRoles().find(r => r.id === roleId);
    return role?.name || 'Unknown Role';
  }

  // Additional methods required by template
  showBulkActions(): boolean {
    return this.selectedCount() > 0;
  }



  onSelectAll(event: any): void {
    if (event.checked) {
      const allUserIds = this.filteredUsers().map((u: User) => u.id);
      this.selectedUsers.set(new Set(allUserIds));
    } else {
      this.selectedUsers.set(new Set());
    }
  }

  onUserSelect(event: any, userId: string): void {
    const selected = new Set<string>(this.selectedUsers());
    if (event.checked) {
      selected.add(userId);
    } else {
      selected.delete(userId);
    }
    this.selectedUsers.set(selected);
  }

  getUserRoleNames(user: User): string[] {
    return this.getRoleNames(user);
  }

  getUserStatusColor(status: UserStatus): string {
    return this.getStatusColor(status);
  }

  getUserStatusText(user: User): string {
    return this.getUserStatus(user);
  }

  openUserDetails(user: User): void {
    this.viewUserDetails(user);
  }

  clearSelection(): void {
    this.selectedUsers.set(new Set());
  }
}
