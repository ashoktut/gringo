import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { CreateRoleDialogComponent } from './dialogs/create-role-dialog.component';
import { EditRoleDialogComponent } from './dialogs/edit-role-dialog.component';
import { DeleteConfirmationDialogComponent, DeleteConfirmationData } from './dialogs/delete-confirmation-dialog.component';
import { AssignRoleDialogComponent } from './dialogs/assign-role-dialog.component';
import { NotificationService } from '../../../services/notification.service';

// import { RoleManagementService } from '../../services/role-management.service';
// import { NotificationService } from '../../services/notification.service';
// import { StatisticsCardsComponent } from '../../sharedComponents/statistics-cards/statistics-cards.component';
// import { FilterSectionComponent, FilterConfig } from '../../sharedComponents/filter-section/filter-section.component';
// import { RolesDataTableComponent } from '../../sharedComponents/roles-data-table/roles-data-table.component';
// import { Role, FilterOptions, Company } from '../../models/role.models';

// Temporary simplified interfaces for demo
interface Role {
  id: string;
  name: string;
  isActive: boolean;
}

interface FilterOptions {
  searchTerm: string;
  search?: string;
  status?: string;
  scope?: string;
}

interface Company {
  id: string;
  name: string;
}

interface FilterConfig {
  showSearch?: boolean;
  showScope?: boolean;
  showStatus?: boolean;
  searchPlaceholder?: string;
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
    MatChipsModule,
    MatInputModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="role-management-container" role="main" aria-labelledby="page-title">
      <!-- Header Section -->
      <header class="header-section">
        <div class="title-section">
          <h1 id="page-title">Role Management</h1>
          <p class="subtitle">Manage roles and permissions across the system</p>
        </div>

        <div class="header-actions" role="toolbar" aria-label="Role Management Actions">
          @if (canCreateRole()) {
            <button
              mat-raised-button
              color="primary"
              (click)="openCreateRoleDialog()"
              [attr.aria-describedby]="'create-role-help'">
              <mat-icon aria-hidden="true">add</mat-icon>
              Create Role
            </button>
            <div id="create-role-help" class="sr-only">Opens dialog to create a new role</div>
          }

          @if (canManagePermissions()) {
            <button
              mat-stroked-button
              (click)="openPermissionManagement()"
              [attr.aria-describedby]="'manage-permissions-help'">
              <mat-icon aria-hidden="true">security</mat-icon>
              Manage Permissions
            </button>
            <div id="manage-permissions-help" class="sr-only">Opens permission management interface</div>
          }

          <button
            mat-stroked-button
            (click)="exportRoles()"
            [disabled]="isLoading()"
            [attr.aria-describedby]="'export-help'">
            <mat-icon aria-hidden="true">download</mat-icon>
            Export
          </button>
          <div id="export-help" class="sr-only">Export roles data to file</div>

          <button
            mat-icon-button
            matTooltip="Refresh roles data"
            (click)="refreshRoles()"
            [disabled]="isLoading()"
            aria-label="Refresh roles data">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </header>

      <!-- Statistics Section -->
      <section aria-labelledby="stats-title">
        <h2 id="stats-title" class="sr-only">Role Statistics</h2>
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ roleStats().totalRoles }}</div>
              <div class="stat-label">Total Roles</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ roleStats().systemRoles }}</div>
              <div class="stat-label">System Roles</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ roleStats().companyRoles }}</div>
              <div class="stat-label">Company Roles</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ roleStats().activeRoles }}</div>
              <div class="stat-label">Active Roles</div>
            </mat-card-content>
          </mat-card>
        </div>
      </section>      <!-- Company Selection (for System Admins) -->
      @if (isSystemAdmin()) {
        <section aria-labelledby="company-selection-title">
          <h2 id="company-selection-title" class="sr-only">Company Selection</h2>
          <mat-card class="company-selector-card">
            <mat-card-content>
              <div class="company-selector">
                <mat-form-field appearance="outline">
                  <mat-label>Filter by Company</mat-label>
                  <mat-select
                    [value]="selectedCompany()?.id || ''"
                    (selectionChange)="onCompanyChange($event.value)"
                    [attr.aria-describedby]="'company-filter-help'">
                    <mat-option value="">All Companies</mat-option>
                    @for (company of companies(); track company.id) {
                      <mat-option [value]="company.id">
                        {{ company.name }}
                      </mat-option>
                    }
                  </mat-select>
                  <div id="company-filter-help" class="sr-only">
                    Filter roles by specific company or view all companies
                  </div>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </section>
      }

      <!-- Filters Section -->
      <mat-card class="filter-card">
        <mat-card-header>
          <mat-card-title>Filter Roles</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="filter-form">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput placeholder="Search roles..."
                     [value]="filters().searchTerm || ''"
                     (input)="updateSearch($event)">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [value]="filters().status || ''"
                         (selectionChange)="updateStatus($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="inactive">Inactive</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Scope</mat-label>
              <mat-select [value]="filters().scope || ''"
                         (selectionChange)="updateScope($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option value="system">System</mat-option>
                <mat-option value="company">Company</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Roles Table Section -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>Roles</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="filteredRoles()" class="roles-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Role Name</th>
              <td mat-cell *matCellDef="let role">{{ role.name }}</td>
            </ng-container>

            <!-- Description Column -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let role">{{ role.description }}</td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let role">
                <mat-chip [color]="role.isActive ? 'primary' : 'warn'">
                  {{ role.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let role">
                <button mat-icon-button (click)="editRole(role)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteRole(role)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- Error Display -->
      @if (error()) {
        <div
          class="error-banner"
          role="alert"
          aria-live="assertive"
          [attr.aria-label]="'Error: ' + error()?.message">
          <mat-icon>error</mat-icon>
          <span>{{ error()?.message }}</span>
          <button
            mat-icon-button
            (click)="clearError()"
            aria-label="Dismiss error">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .role-management-container {
      padding: 1.5rem;
      max-width: 100%;
      margin: 0 auto;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .title-section h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 500;
      color: var(--mdc-theme-on-surface, #333);
    }

    .subtitle {
      margin: 0;
      color: var(--mdc-theme-on-surface, #666);
      font-size: 1rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .company-selector-card {
      margin-bottom: 1.5rem;
    }

    .company-selector {
      max-width: 400px;
    }

    .table-card {
      margin-bottom: 2rem;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      margin-top: 1rem;
      background: var(--mdc-theme-error-container, #ffebee);
      color: var(--mdc-theme-on-error-container, #c62828);
      border-radius: 4px;
      border-left: 4px solid var(--mdc-theme-error, #f44336);
    }

    .error-banner mat-icon:first-child {
      color: var(--mdc-theme-error, #f44336);
    }

    .error-banner span {
      flex: 1;
    }

    /* Screen reader only content */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 768px) {
      .role-management-container {
        padding: 1rem;
      }

      .header-section {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .header-actions {
        justify-content: flex-start;
      }

      .title-section h1 {
        font-size: 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .header-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions button {
        justify-content: flex-start;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .error-banner {
        border-width: 2px;
        border-style: solid;
      }
    }

    /* Focus indicators */
    button:focus {
      outline: 2px solid var(--mdc-theme-primary, #1976d2);
      outline-offset: 2px;
    }
  `]
})
export class RoleManagementComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);

  // Mock data for demonstration
  readonly roles = signal<Role[]>([]);
  readonly companies = signal<Company[]>([]);
  readonly selectedCompany = signal<Company | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<any>(null);
  readonly filters = signal<FilterOptions>({ searchTerm: '' });
  readonly filteredRoles = computed(() => this.roles());
  readonly roleStats = signal({ totalRoles: 0, systemRoles: 0, companyRoles: 0, activeRoles: 0 });

  // Table configuration
  readonly displayedColumns = ['name', 'description', 'status', 'actions'];

  // Component configuration
  readonly filterConfig: FilterConfig = {
    showSearch: true,
    showScope: true,
    showStatus: true,
    searchPlaceholder: 'Search by name, description, or permissions'
  };

  ngOnInit(): void {
    // Load initial data - would typically come from service
    console.log('Component initialized');
  }

  onFiltersChange(filterChanges: Partial<FilterOptions>): void {
    this.filters.update(current => ({ ...current, ...filterChanges }));
  }

  onCompanyChange(companyId: string): void {
    const company = this.companies().find(c => c.id === companyId) || null;
    this.selectedCompany.set(company);
  }

  onTableAction(event: { action: string; role: Role }): void {
    const { action, role } = event;
    console.log(`Action: ${action}, Role: ${role.name}`);
    // Handle action based on type
  }

  refreshRoles(): void {
    console.log('Refreshing roles...');
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 1000);
  }

  clearError(): void {
    this.error.set(null);
  }

  // Action methods
  openCreateRoleDialog(): void {
    const dialogRef = this.dialog.open(CreateRoleDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notificationService.showSuccess(`Role "${result.name}" created successfully!`);
        this.refreshRoles();
      }
    });
  }

  openEditRoleDialog(role: Role): void {
    const dialogRef = this.dialog.open(EditRoleDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: role,
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notificationService.showSuccess(`Role "${result.name}" updated successfully!`);
        this.refreshRoles();
      }
    });
  }

  openPermissionManagement(): void {
    this.notificationService.showInfo('Permission management feature coming soon!');
  }

  duplicateRole(role: Role): void {
    this.notificationService.showInfo(`Duplicating role "${role.name}"...`);
    // Would implement actual duplication logic
  }

  openRoleAssignment(role: Role): void {
    const dialogRef = this.dialog.open(AssignRoleDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: role,
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.notificationService.showSuccess(`Users assigned to role "${role.name}" successfully!`);
      }
    });
  }

  toggleRoleStatus(role: Role): void {
    const action = role.isActive ? 'deactivate' : 'activate';
    const confirmData: DeleteConfirmationData = {
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Role`,
      message: `Are you sure you want to ${action} this role?`,
      itemName: role.name,
      warningMessage: role.isActive
        ? 'Deactivating this role will prevent it from being assigned to new users.'
        : 'Activating this role will allow it to be assigned to users.',
      confirmButtonText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: confirmData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        role.isActive = !role.isActive;
        this.notificationService.showSuccess(`Role "${role.name}" ${action}d successfully!`);
      }
    });
  }

  deleteRole(role: Role): void {
    const confirmData: DeleteConfirmationData = {
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role?',
      itemName: role.name,
      warningMessage: 'This will remove the role from all users who have it assigned. This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: confirmData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.notificationService.showSuccess(`Role "${role.name}" deleted successfully!`);
        this.roles.update(roles => roles.filter(r => r.id !== role.id));
      }
    });
  }

  exportRoles(): void {
    this.notificationService.showInfo('Exporting roles...');
    // Would implement actual export functionality
  }

  // Permission check methods - these would typically come from an auth service
  canCreateRole(): boolean {
    return true;
  }

  canManagePermissions(): boolean {
    return true;
  }

  isSystemAdmin(): boolean {
    return true;
  }

  // Filter methods
  updateSearch(event: any): void {
    const searchTerm = event.target.value;
    this.filters.update(f => ({ ...f, searchTerm, search: searchTerm }));
  }

  updateStatus(status: string): void {
    this.filters.update(f => ({ ...f, status }));
  }

  updateScope(scope: string): void {
    this.filters.update(f => ({ ...f, scope }));
  }

  // Table action methods - delegate to main action methods
  editRole(role: Role): void {
    this.openEditRoleDialog(role);
  }
}
