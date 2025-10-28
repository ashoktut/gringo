import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserManagementService } from '../../services/user-management.service';
import { RolesDataTableComponent } from '../roles-data-table/roles-data-table.component';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super-admin' | 'company-admin' | 'user';
  companyId?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

interface Company {
  id: string;
  name: string;
  code: string;
  active: boolean;
  userCount?: number;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-user-management-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RolesDataTableComponent
  ],
  templateUrl: './user-management-dashboard.component.html',
  styleUrl: './user-management-dashboard.component.css'
})
export class UserManagementDashboardComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  // Signals for reactive UI
  users = signal<User[]>([]);
  companies = signal<Company[]>([]);
  roles = signal<Role[]>([]);
  selectedTabIndex = signal(0);
  isLoading = signal(false);
  
  // Table display columns
  userDisplayedColumns = ['name', 'email', 'role', 'company', 'status', 'lastLogin', 'actions'];
  companyDisplayedColumns = ['name', 'code', 'userCount', 'status', 'actions'];

  // Forms
  userForm: FormGroup;
  companyForm: FormGroup;

  constructor() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', [Validators.required]],
      companyId: [''],
      isActive: [true]
    });

    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(2)]],
      industry: [''],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loadUsers();
    this.loadCompanies();
    this.loadRoles();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.users.set(users);
    });
  }

  private loadCompanies(): void {
    this.userService.getCompanies().subscribe(companies => {
      // Add user count to companies
      const companiesWithCount = companies.map(company => ({
        ...company,
        userCount: this.users().filter(user => user.companyId === company.id).length
      }));
      this.companies.set(companiesWithCount);
    });
  }

  private loadRoles(): void {
    // Mock roles data - this would come from a roles service
    const mockRoles: Role[] = [
      {
        id: '1',
        name: 'Super Admin',
        description: 'Full system access across all companies',
        isActive: true
      },
      {
        id: '2',
        name: 'Company Admin',
        description: 'Administrative access within assigned company',
        isActive: true
      },
      {
        id: '3',
        name: 'User',
        description: 'Standard user access to company resources',
        isActive: true
      },
      {
        id: '4',
        name: 'Viewer',
        description: 'Read-only access to company resources',
        isActive: false
      }
    ];
    this.roles.set(mockRoles);
  }

  // User Management Methods
  onCreateUser(): void {
    if (this.userForm.valid) {
      const userData = this.userForm.value;
      // Implement user creation logic
      this.snackBar.open('User created successfully', 'Close', { duration: 3000 });
      this.userForm.reset();
      this.loadUsers();
    }
  }

  onEditUser(user: User): void {
    // Implement user editing logic
    console.log('Edit user:', user);
  }

  onDeleteUser(user: User): void {
    // Implement user deletion logic
    this.snackBar.open(`User ${user.name} deleted`, 'Close', { duration: 3000 });
    this.loadUsers();
  }

  onToggleUserStatus(user: User): void {
    // Toggle user active status
    user.isActive = !user.isActive;
    this.snackBar.open(
      `User ${user.isActive ? 'activated' : 'deactivated'}`,
      'Close',
      { duration: 3000 }
    );
  }

  // Company Management Methods
  onCreateCompany(): void {
    if (this.companyForm.valid) {
      const companyData = this.companyForm.value;
      // Implement company creation logic
      this.snackBar.open('Company created successfully', 'Close', { duration: 3000 });
      this.companyForm.reset();
      this.loadCompanies();
    }
  }

  onEditCompany(company: Company): void {
    // Implement company editing logic
    console.log('Edit company:', company);
  }

  onDeleteCompany(company: Company): void {
    // Implement company deletion logic
    this.snackBar.open(`Company ${company.name} deleted`, 'Close', { duration: 3000 });
    this.loadCompanies();
  }

  // Role Management Methods
  onEditRole(role: Role): void {
    // Implement role editing logic
    console.log('Edit role:', role);
  }

  onDeleteRole(role: Role): void {
    // Implement role deletion logic
    this.snackBar.open(`Role ${role.name} deleted`, 'Close', { duration: 3000 });
    this.loadRoles();
  }

  // Utility Methods
  getRoleColor(role: string): string {
    switch (role) {
      case 'super-admin': return 'warn';
      case 'company-admin': return 'accent';
      case 'user': return 'primary';
      default: return 'basic';
    }
  }

  getCompanyName(companyId?: string): string {
    if (!companyId) return 'No Company';
    const company = this.companies().find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  }

  formatDate(date?: Date): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }
}