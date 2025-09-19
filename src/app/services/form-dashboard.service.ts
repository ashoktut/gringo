import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormConfiguration, FormConfigService } from './form-config.service';
import { FormAuthorizationService } from './form-authorization.service';
import { AuthService, UserRole } from './auth.service';

export interface FormDashboardItem {
  config: FormConfiguration;
  lastUsed?: Date;
  submissionCount: number;
  isRecentlyUsed: boolean;
  formUrl: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface DashboardFilters {
  role: UserRole;
  category?: string;
  companyId?: string;
  searchTerm?: string;
  tags?: string[];
}

/**
 * Service responsible for dashboard business logic
 * Follows separation of concerns - isolates dashboard-specific logic
 */
@Injectable({
  providedIn: 'root'
})
export class FormDashboardService {
  private formConfigService = inject(FormConfigService);
  private authService = inject(AuthService);
  private authorizationService = inject(FormAuthorizationService);

  /**
   * Get dashboard items for current user
   */
  getDashboardItems(filters: DashboardFilters): Observable<FormDashboardItem[]> {
    return this.formConfigService.getAllFormConfigs().pipe(
      map(forms => {
        // Apply authorization filtering
        const authorizedForms = this.authorizationService.getFormsForRoleAndCategory(
          forms,
          filters.role,
          filters.category,
          filters.companyId
        );

        // Apply search filtering
        let filteredForms = authorizedForms;
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filteredForms = authorizedForms.filter(form =>
            form.name.toLowerCase().includes(searchLower) ||
            form.metadata.description?.toLowerCase().includes(searchLower) ||
            form.formType.toLowerCase().includes(searchLower)
          );
        }

        // Apply tag filtering
        if (filters.tags && filters.tags.length > 0) {
          filteredForms = filteredForms.filter(form =>
            filters.tags!.some(tag => form.metadata.tags?.includes(tag))
          );
        }

        // Transform to dashboard items
        return filteredForms.map(form => this.transformToDashboardItem(form, filters.role));
      })
    );
  }

  /**
   * Get available categories for user
   */
  getAvailableCategories(userRole: UserRole): string[] {
    const roleCategories: Record<UserRole, string[]> = {
      admin: ['all', 'admin', 'reps', 'clients', 'public'],
      rep: ['all', 'reps', 'public'],
      client: ['all', 'clients', 'public'],
      public: ['all', 'public'],
      guest: ['all', 'public']
    };

    return roleCategories[userRole] || ['all', 'public'];
  }

  /**
   * Get available tags for filtering
   */
  getAvailableTags(): Observable<string[]> {
    return this.formConfigService.getAllFormConfigs().pipe(
      map(forms => {
        const allTags = forms.flatMap(form => form.metadata.tags || []);
        return [...new Set(allTags)].sort();
      })
    );
  }

  /**
   * Generate form URL based on category and form type
   */
  generateFormUrl(category: string, formType: string): string {
    return `/${category}/forms/${formType}`;
  }

  /**
   * Transform form configuration to dashboard item
   */
  private transformToDashboardItem(form: FormConfiguration, userRole: UserRole): FormDashboardItem {
    const category = form.metadata.category || 'reps';

    return {
      config: form,
      lastUsed: this.getLastUsedDate(form.id), // Mock for now
      submissionCount: this.getSubmissionCount(form.id), // Mock for now
      isRecentlyUsed: this.isRecentlyUsed(form.id), // Mock for now
      formUrl: this.generateFormUrl(category, form.formType),
      canEdit: this.authorizationService.hasPermission('edit', 'forms', userRole),
      canDelete: this.authorizationService.hasPermission('delete', 'forms', userRole)
    };
  }

  // Mock methods - in real app these would come from analytics/submission services
  private getLastUsedDate(formId: string): Date | undefined {
    // Mock implementation
    return Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined;
  }

  private getSubmissionCount(formId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 100);
  }

  private isRecentlyUsed(formId: string): boolean {
    // Mock implementation - consider recent if used in last 7 days
    const lastUsed = this.getLastUsedDate(formId);
    if (!lastUsed) return false;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return lastUsed > weekAgo;
  }
}
