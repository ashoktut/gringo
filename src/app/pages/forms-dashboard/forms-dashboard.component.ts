import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';

// Services
import { AuthService, UserRole } from '../../services/auth.service';
import { FormDashboardService, FormDashboardItem, DashboardFilters } from '../../services/form-dashboard.service';
import { FormConfigService, FormConfiguration } from '../../services/form-config.service';

@Component({
  selector: 'app-forms-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatDividerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatInputModule
  ],
  templateUrl: './forms-dashboard.component.html',
  styleUrls: ['./forms-dashboard.component.css']
})
export class FormsDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dashboardService = inject(FormDashboardService);
  private authService = inject(AuthService);
  private formConfigService = inject(FormConfigService);
  private snackBar = inject(MatSnackBar);

  // Signals for reactive state management
  isLoading = signal(false);
  currentRole = signal<UserRole>('rep');
  currentCompanyId = signal<string | null>(null);
  currentCategory = signal<string>('reps');
  availableForms = signal<FormDashboardItem[]>([]);
  filteredForms = signal<FormDashboardItem[]>([]);
  selectedCompany = signal<string>('all');
  searchTerm = signal<string>('');
  availableCategories = signal<string[]>([]);
  availableTags = signal<string[]>([]);

  // Computed properties
  roleTitle = computed(() => {
    switch (this.currentRole()) {
      case 'admin': return 'Administrator Dashboard';
      case 'rep': return 'Sales Representative Dashboard';
      case 'client': return 'Client Portal';
      default: return 'Forms Dashboard';
    }
  });

  roleIcon = computed(() => {
    switch (this.currentRole()) {
      case 'admin': return 'admin_panel_settings';
      case 'rep': return 'person';
      case 'client': return 'business';
      default: return 'dashboard';
    }
  });

  // Mock companies for demo (in real app, this would come from a service)
  companies = [
    { id: 'all', name: 'All Companies' },
    { id: 'company1', name: 'Acme Construction' },
    { id: 'company2', name: 'BuildTech Solutions' },
    { id: 'company3', name: 'RoofTech Pro' }
  ];

  ngOnInit(): void {
    this.setupUserContext();
    this.setupFiltersAndLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public methods for template
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.loadForms();
  }

  onCategoryChange(category: string): void {
    this.currentCategory.set(category);
    this.loadForms();
  }

  onCompanyChange(companyId: string): void {
    this.selectedCompany.set(companyId);
    this.loadForms();
  }

  navigateToForm(formItem: FormDashboardItem): void {
    this.router.navigate([formItem.formUrl]);
  }

  navigateToFormBuilder(): void {
    this.router.navigate(['/form-builder']);
  }

  navigateToConfigManagement(): void {
    this.router.navigate(['/config-management']);
  }

  refreshDashboard(): void {
    this.loadForms();
  }

  getFormTypeIcon(formType: string): string {
    const iconMap: Record<string, string> = {
      'rfq': 'request_quote',
      'rqr': 'refresh',
      'inspection': 'fact_check',
      'contact': 'contact_mail',
      'user-management': 'admin_panel_settings'
    };
    return iconMap[formType] || 'description';
  }

  getFormTypeColor(formType: string): string {
    const colorMap: Record<string, string> = {
      'rfq': 'primary',
      'rqr': 'accent',
      'inspection': 'warn',
      'contact': 'primary',
      'user-management': 'warn'
    };
    return colorMap[formType] || 'primary';
  }

  formatLastUsed(lastUsed?: Date): string {
    if (!lastUsed) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - lastUsed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // Private methods
  private setupUserContext(): void {
    // Get user context from route or auth service
    const user = this.authService.getCurrentUserSync() as { role: UserRole; companyId?: string } | null;
    if (user) {
      this.currentRole.set(user.role);
      this.currentCompanyId.set(user.companyId || null);
    }

    // Override with route parameter if present
    this.route.url.pipe(
      takeUntil(this.destroy$)
    ).subscribe(segments => {
      if (segments.length > 0) {
        const category = segments[0].path; // 'reps', 'admin', 'clients'
        this.currentCategory.set(category);

        // Map category to role if not already set
        if (!user) {
          const roleFromCategory: Record<string, UserRole> = {
            'reps': 'rep',
            'admin': 'admin',
            'clients': 'client'
          };
          this.currentRole.set(roleFromCategory[category] || 'public');
        }
      }
    });
  }

  private setupFiltersAndLoad(): void {
    // Set available categories based on role
    const categories = this.dashboardService.getAvailableCategories(this.currentRole());
    this.availableCategories.set(categories);

    // Load available tags
    this.dashboardService.getAvailableTags().pipe(
      takeUntil(this.destroy$)
    ).subscribe(tags => {
      this.availableTags.set(tags);
    });

    // Initial load
    this.loadForms();
  }

  private loadForms(): void {
    this.isLoading.set(true);

    const filters: DashboardFilters = {
      role: this.currentRole(),
      category: this.currentCategory() === 'all' ? undefined : this.currentCategory(),
      companyId: this.selectedCompany() === 'all' ? undefined : this.selectedCompany(),
      searchTerm: this.searchTerm() || undefined
    };

    this.dashboardService.getDashboardItems(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (items: FormDashboardItem[]) => {
        this.availableForms.set(items);
        this.filteredForms.set(items);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading forms:', error);
        this.snackBar.open('Error loading forms', 'Close', { duration: 5000 });
        this.isLoading.set(false);
      }
    });
  }
}
