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
import { Subject, takeUntil } from 'rxjs';

import { Company, CompanyStatus, SubscriptionPlan, CompanyFeature } from '../../../models/auth.models';
import { CompanyService } from '../../../services/company.service';
import { AuthService } from '../../../services/auth.service';
import { CompanyDialogComponent } from './company-dialog/company-dialog.component';
import { CompanyDetailsComponent } from './company-details/company-details.component';

@Component({
  selector: 'app-company-management',
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
    MatTooltipModule
  ],
  templateUrl: './company-management.component.html',
  styleUrls: ['./company-management.component.css']
})
export class CompanyManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Signals for reactive state
  companies = signal<Company[]>([]);
  filteredCompanies: any; // Will be assigned as computed in setupFilters
  selectedCompany = signal<Company | null>(null);
  isLoading = signal(false);
  searchTerm = signal('');
  statusFilter = signal<CompanyStatus | 'all'>('all');
  planFilter = signal<SubscriptionPlan | 'all'>('all');

  // Table configuration
  displayedColumns: string[] = [
    'name',
    'domain',
    'status',
    'plan',
    'userCount',
    'createdAt',
    'actions'
  ];

  // Filter options
  statusOptions: CompanyStatus[] = ['active', 'inactive', 'suspended', 'trial'];
  planOptions: SubscriptionPlan[] = ['free', 'basic', 'professional', 'enterprise'];

  // Computed properties
  totalCompanies = computed(() => this.companies().length);
  activeCompanies = computed(() => 
    this.companies().filter(c => c.status === 'active').length
  );
  trialCompanies = computed(() => 
    this.companies().filter(c => c.status === 'trial').length
  );
  suspendedCompanies = computed(() => 
    this.companies().filter(c => c.status === 'suspended').length
  );

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    // Set up computed filtered companies
    this.setupFilters();
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.setupSearchAndFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Use computed to automatically filter companies based on search and filter criteria
    this.filteredCompanies = computed(() => {
      let filtered = this.companies();
      
      // Apply search filter
      const search = this.searchTerm().toLowerCase();
      if (search) {
        filtered = filtered.filter(company => 
          company.name.toLowerCase().includes(search) ||
          company.domain?.toLowerCase().includes(search) ||
          company.contactEmail.toLowerCase().includes(search)
        );
      }

      // Apply status filter
      const status = this.statusFilter();
      if (status !== 'all') {
        filtered = filtered.filter(company => company.status === status);
      }

      // Apply plan filter
      const plan = this.planFilter();
      if (plan !== 'all') {
        filtered = filtered.filter(company => company.subscription.plan === plan);
      }

      return filtered;
    });
  }

  private setupSearchAndFilters(): void {
    // No additional setup needed with signals - computed properties handle reactivity
  }

  loadCompanies(): void {
    this.isLoading.set(true);
    this.companyService.getAllCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies.set(response.companies || response);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Failed to load companies:', error);
          this.isLoading.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onStatusFilterChange(status: CompanyStatus | 'all'): void {
    this.statusFilter.set(status);
  }

  onPlanFilterChange(plan: SubscriptionPlan | 'all'): void {
    this.planFilter.set(plan);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CompanyDialogComponent, {
      width: '800px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadCompanies();
        }
      });
  }

  openEditDialog(company: Company): void {
    const dialogRef = this.dialog.open(CompanyDialogComponent, {
      width: '800px',
      data: { mode: 'edit', company }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadCompanies();
        }
      });
  }

  viewCompanyDetails(company: Company): void {
    this.selectedCompany.set(company);
    
    const dialogRef = this.dialog.open(CompanyDetailsComponent, {
      width: '1000px',
      data: { company }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.updated) {
          this.loadCompanies();
        }
      });
  }

  toggleCompanyStatus(company: Company): void {
    const newStatus: CompanyStatus = company.status === 'active' ? 'inactive' : 'active';
    
    this.companyService.updateCompanyStatus(company.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadCompanies();
        },
        error: (error: any) => {
          console.error('Failed to update company status:', error);
        }
      });
  }

  deleteCompany(company: Company): void {
    if (confirm(`Are you sure you want to delete company "${company.name}"? This action cannot be undone.`)) {
      this.companyService.deleteCompany(company.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadCompanies();
          },
          error: (error: any) => {
            console.error('Failed to delete company:', error);
          }
        });
    }
  }

  getStatusColor(status: CompanyStatus): string {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'accent';
      case 'suspended': return 'warn';
      case 'inactive': return '';
      default: return '';
    }
  }

  getPlanColor(plan: SubscriptionPlan): string {
    switch (plan) {
      case 'enterprise': return 'primary';
      case 'professional': return 'accent';
      case 'basic': return 'success';
      case 'free': return '';
      default: return '';
    }
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  getCompanyFeatures(company: Company): string[] {
    if (!company.features) return [];
    return Object.entries(company.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }

  canManageCompany(): boolean {
    return this.authService.hasPermission('manage:companies');
  }

  canDeleteCompany(): boolean {
    return this.authService.hasPermission('delete:companies');
  }

  exportCompanies(): void {
    // Implementation for exporting company data
    console.log('Exporting companies...');
  }

  refreshData(): void {
    this.loadCompanies();
  }
}