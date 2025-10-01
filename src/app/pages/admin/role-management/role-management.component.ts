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
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { Role, Permission, User, Company, CreateRoleRequest, UpdateRoleRequest, RoleWithStats } from '../../../models/auth.models';
import { RoleService } from '../../../services/role.service';
import { CompanyService } from '../../../services/company.service';
import { AuthService } from '../../../services/auth.service';
import { RoleDialogComponent } from './role-dialog/role-dialog.component';
import { PermissionManagementComponent } from './permission-management/permission-management.component';
import { RoleAssignmentComponent } from './role-assignment/role-assignment.component';

@Component({
  selector: 'app-role-management',
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
    MatDividerModule
  ],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  roles = signal<Role[]>([]);
  filteredRoles: any; // Will be assigned as computed in setupFilters
  permissions = signal<Permission[]>([]);
  companies = signal<Company[]>([]);
  selectedCompany = signal<Company | null>(null);
  selectedRole = signal<Role | null>(null);
  isLoading = signal(false);
  searchTerm = signal('');
  scopeFilter = signal<'system' | 'company' | 'all'>('all');

  // Current user context
  currentUser = computed(() => this.authService.getCurrentUserSync());
  isSystemAdmin = computed(() => this.authService.hasRoleByName('system_admin'));
  isCompanyAdmin = computed(() => this.authService.hasRoleByName('company_admin'));

  // Table configuration
  displayedColumns: string[] = [
    'name',
    'description',
    'scope',
    'company',
    'permissions',
    'userCount',
    'createdAt',
    'actions'
  ];

  // Filter options
  scopeOptions = [
    { value: 'all', label: 'All Scopes' },
    { value: 'system', label: 'System Roles' },
    { value: 'company', label: 'Company Roles' }
  ];

  // Computed properties
  totalRoles = computed(() => this.roles().length);
  systemRoles = computed(() =>
    this.roles().filter(r => r.scope === 'system').length
  );
  companyRoles = computed(() =>
    this.roles().filter(r => r.scope === 'company').length
  );
  activeRoles = computed(() =>
    this.roles().filter(r => r.isActive).length
  );

  constructor(
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
    // Use computed to automatically filter roles based on search and filter criteria
    this.filteredRoles = computed(() => {
      let filtered = this.roles();

      // Apply search filter
      const search = this.searchTerm().toLowerCase();
      if (search) {
        filtered = filtered.filter(role =>
          role.name.toLowerCase().includes(search) ||
          role.description?.toLowerCase().includes(search) ||
          role.permissions?.some(p => p.name.toLowerCase().includes(search))
        );
      }

      // Apply scope filter
      const scope = this.scopeFilter();
      if (scope !== 'all') {
        filtered = filtered.filter(role => role.scope === scope);
      }

      // Apply company filter for company admins
      const currentUser = this.currentUser();
      if (currentUser && !this.isSystemAdmin() && currentUser.companyId) {
        filtered = filtered.filter(role =>
          role.scope === 'system' || role.companyId === currentUser.companyId
        );
      }

      return filtered;
    });
  }

  private setupContextBasedView(): void {
    const currentUser = this.currentUser();

    if (currentUser && !this.isSystemAdmin() && currentUser.companyId) {
      // For company admins, set the selected company and filter roles
      const userCompany = this.companies().find(c => c.id === currentUser.companyId);
      if (userCompany) {
        this.selectedCompany.set(userCompany);
      }
    }
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    // Load roles, permissions, and companies in parallel
    Promise.all([
      this.loadRoles(),
      this.loadPermissions(),
      this.loadCompanies()
    ]).finally(() => {
      this.isLoading.set(false);
    });
  }

  private async loadRoles(): Promise<void> {
    try {
      const roles = await this.roleService.getAllRoles().toPromise();
      this.roles.set(roles || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }

  private async loadPermissions(): Promise<void> {
    try {
      const permissions = await this.roleService.getAllPermissions().toPromise();
      this.permissions.set(permissions || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }

  private async loadCompanies(): Promise<void> {
    try {
      if (this.isSystemAdmin()) {
        const response = await this.companyService.getAllCompanies().toPromise();
        if (Array.isArray(response)) {
          this.companies.set(response);
        } else if (response && 'companies' in response) {
          this.companies.set(response.companies);
        } else {
          this.companies.set([]);
        }
      } else {
        // For company admins, only load their company
        const currentUser = this.currentUser();
        if (currentUser?.companyId) {
          const company = await this.companyService.getCompany(currentUser.companyId).toPromise();
          this.companies.set(company ? [company] : []);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onScopeFilterChange(scope: 'system' | 'company' | 'all'): void {
    this.scopeFilter.set(scope);
  }

  onCompanyChange(company: Company | null): void {
    this.selectedCompany.set(company);
    this.refreshRoles();
  }

  openCreateRoleDialog(): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '800px',
      data: {
        mode: 'create',
        permissions: this.permissions(),
        companies: this.companies(),
        selectedCompany: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshRoles();
        }
      });
  }

  openEditRoleDialog(role: Role): void {
    if (!this.canEditRole(role)) return;

    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '800px',
      data: {
        mode: 'edit',
        role,
        permissions: this.permissions(),
        companies: this.companies(),
        selectedCompany: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshRoles();
        }
      });
  }

  openPermissionManagement(): void {
    const dialogRef = this.dialog.open(PermissionManagementComponent, {
      width: '1000px',
      data: {
        permissions: this.permissions(),
        roles: this.roles()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.updated) {
          this.loadPermissions();
        }
      });
  }

  openRoleAssignment(role: Role): void {
    const dialogRef = this.dialog.open(RoleAssignmentComponent, {
      width: '900px',
      data: {
        role,
        company: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.updated) {
          this.refreshRoles();
        }
      });
  }

  duplicateRole(role: Role): void {
    if (!this.canCreateRole()) return;

    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '800px',
      data: {
        mode: 'duplicate',
        role,
        permissions: this.permissions(),
        companies: this.companies(),
        selectedCompany: this.selectedCompany()
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshRoles();
        }
      });
  }

  toggleRoleStatus(role: Role): void {
    if (!this.canEditRole(role)) return;

    const updateData: UpdateRoleRequest = {
      ...role,
      isActive: !role.isActive
    };

    this.roleService.updateRole(role.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshRoles();
        },
        error: (error) => {
          console.error('Failed to update role status:', error);
        }
      });
  }

  deleteRole(role: Role): void {
    if (!this.canDeleteRole(role)) return;

    const confirmMessage = `Are you sure you want to delete the role "${role.name}"? This action cannot be undone and will affect all users with this role.`;

    if (confirm(confirmMessage)) {
      this.roleService.deleteRole(role.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.refreshRoles();
          },
          error: (error) => {
            console.error('Failed to delete role:', error);
          }
        });
    }
  }

  refreshRoles(): void {
    this.loadRoles();
  }

  exportRoles(): void {
    // Implementation for exporting role data
    const rolesData = this.filteredRoles().map((role: Role) => ({
      name: role.name,
      description: role.description,
      scope: role.scope,
      permissions: role.permissions?.map((p: Permission) => p.name) || [],
      isActive: role.isActive,
      createdAt: role.createdAt
    }));

    const dataStr = JSON.stringify(rolesData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `roles-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Permission checks
  canCreateRole(): boolean {
    return this.authService.hasPermission('create:roles');
  }

  canEditRole(role: Role): boolean {
    if (!this.authService.hasPermission('edit:roles')) return false;

    // System admins can edit all roles
    if (this.isSystemAdmin()) return true;

    // Company admins can only edit company-scoped roles for their company
    const currentUser = this.currentUser();
    return role.scope === 'company' &&
           role.companyId === currentUser?.companyId;
  }

  canDeleteRole(role: Role): boolean {
    if (!this.authService.hasPermission('delete:roles')) return false;

    // Cannot delete system roles or roles with users
    const roleWithStats = role as RoleWithStats;
    if (role.scope === 'system' || (roleWithStats.userCount && roleWithStats.userCount > 0)) {
      return false;
    }

    // Same edit rules apply for deletion
    return this.canEditRole(role);
  }

  canManagePermissions(): boolean {
    return this.isSystemAdmin() && this.authService.hasPermission('manage:permissions');
  }

  canAssignRoles(): boolean {
    return this.authService.hasPermission('assign:roles');
  }

  // Utility methods
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  getScopeIcon(scope: string): string {
    switch (scope) {
      case 'system': return 'admin_panel_settings';
      case 'company': return 'business';
      default: return 'help';
    }
  }

  getScopeColor(scope: string): string {
    switch (scope) {
      case 'system': return 'primary';
      case 'company': return 'accent';
      default: return '';
    }
  }

  getPermissionCount(role: Role): number {
    return role.permissions?.length || 0;
  }

  getCompanyName(companyId: string | null): string {
    if (!companyId) return 'System';
    const company = this.companies().find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  }
}
