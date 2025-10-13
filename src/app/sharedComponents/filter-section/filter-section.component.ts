import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FilterOptions, Company, RoleScope } from '../../models/role.models';

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterConfig {
  showSearch?: boolean;
  showScope?: boolean;
  showCompany?: boolean;
  showStatus?: boolean;
  searchPlaceholder?: string;
  scopeOptions?: FilterOption[];
  statusOptions?: FilterOption[];
}

@Component({
  selector: 'app-filter-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="filters-card" role="search" aria-label="Filter Options">
      <mat-card-content>
        <div class="filters-header">
          <h3 class="filters-title">Filters</h3>
          <button
            mat-icon-button
            (click)="clearAllFilters()"
            matTooltip="Clear all filters"
            [disabled]="!hasActiveFilters()"
            aria-label="Clear all filters">
            <mat-icon>clear</mat-icon>
          </button>
        </div>

        <div class="filters-row">
          @if (config.showSearch !== false) {
            <mat-form-field
              appearance="outline"
              class="search-field"
              [class.expanded]="isSearchExpanded()">
              <mat-label>Search</mat-label>
              <input
                matInput
                [value]="filters.searchTerm"
                (input)="onSearchChange($event)"
                [placeholder]="config.searchPlaceholder || 'Search by name, description, or permissions'"
                [attr.aria-describedby]="'search-help'"
                maxlength="100">
              <mat-icon matSuffix>search</mat-icon>
              <mat-hint id="search-help">
                Search across names, descriptions, and permissions
              </mat-hint>
            </mat-form-field>
          }

          @if (config.showScope !== false) {
            <mat-form-field appearance="outline">
              <mat-label>Scope</mat-label>
              <mat-select
                [value]="filters.scope"
                (selectionChange)="onScopeChange($event.value)"
                [attr.aria-describedby]="'scope-help'">
                @for (option of scopeOptions(); track option.value) {
                  <mat-option
                    [value]="option.value"
                    [disabled]="option.disabled">
                    {{ option.label }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint id="scope-help">
                Filter by role scope level
              </mat-hint>
            </mat-form-field>
          }

          @if (config.showCompany !== false && companies.length > 0) {
            <mat-form-field appearance="outline">
              <mat-label>Company</mat-label>
              <mat-select
                [value]="filters.companyId || ''"
                (selectionChange)="onCompanyChange($event.value)"
                [attr.aria-describedby]="'company-help'">
                <mat-option value="">All Companies</mat-option>
                @for (company of companies; track company.id) {
                  <mat-option [value]="company.id">
                    {{ company.name }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint id="company-help">
                Filter by specific company
              </mat-hint>
            </mat-form-field>
          }

          @if (config.showStatus !== false) {
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select
                [value]="filters.isActive?.toString() || ''"
                (selectionChange)="onStatusChange($event.value)"
                [attr.aria-describedby]="'status-help'">
                @for (option of statusOptions(); track option.value) {
                  <mat-option
                    [value]="option.value"
                    [disabled]="option.disabled">
                    {{ option.label }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint id="status-help">
                Filter by active status
              </mat-hint>
            </mat-form-field>
          }

          <div class="filter-actions">
            <button
              mat-stroked-button
              (click)="onRefresh()"
              matTooltip="Refresh data"
              aria-label="Refresh filtered data">
              <mat-icon>refresh</mat-icon>
              <span class="action-text">Refresh</span>
            </button>
          </div>
        </div>

        @if (hasActiveFilters()) {
          <div class="active-filters" role="status" aria-live="polite">
            <span class="active-filters-label">Active filters:</span>
            <div class="filter-chips">
              @if (filters.searchTerm) {
                <div class="filter-chip">
                  <span>Search: "{{ filters.searchTerm }}"</span>
                  <button
                    class="remove-filter"
                    (click)="removeSearchFilter()"
                    aria-label="Remove search filter">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
              @if (filters.scope && filters.scope !== 'all') {
                <div class="filter-chip">
                  <span>Scope: {{ getScopeLabel(filters.scope) }}</span>
                  <button
                    class="remove-filter"
                    (click)="removeScopeFilter()"
                    aria-label="Remove scope filter">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
              @if (filters.companyId) {
                <div class="filter-chip">
                  <span>Company: {{ getCompanyName(filters.companyId) }}</span>
                  <button
                    class="remove-filter"
                    (click)="removeCompanyFilter()"
                    aria-label="Remove company filter">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
              @if (filters.isActive !== undefined) {
                <div class="filter-chip">
                  <span>Status: {{ filters.isActive ? 'Active' : 'Inactive' }}</span>
                  <button
                    class="remove-filter"
                    (click)="removeStatusFilter()"
                    aria-label="Remove status filter">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filters-card {
      margin-bottom: 1.5rem;
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .filters-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--mdc-theme-on-surface, #333);
    }

    .filters-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr auto;
      gap: 1rem;
      align-items: start;
    }

    .search-field {
      min-width: 250px;
    }

    .search-field.expanded {
      grid-column: 1 / -1;
      margin-bottom: 1rem;
    }

    .filter-actions {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      padding-top: 0.5rem;
    }

    .action-text {
      margin-left: 0.5rem;
    }

    .active-filters {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--mdc-theme-outline, #e0e0e0);
    }

    .active-filters-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--mdc-theme-on-surface, #666);
      margin-bottom: 0.5rem;
      display: block;
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      background: var(--mdc-theme-surface-variant, #f5f5f5);
      border: 1px solid var(--mdc-theme-outline, #e0e0e0);
      border-radius: 16px;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
      gap: 0.25rem;
    }

    .remove-filter {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      color: var(--mdc-theme-on-surface, #666);
      transition: background-color 0.2s ease;
    }

    .remove-filter:hover {
      background: var(--mdc-theme-error, #f44336);
      color: white;
    }

    .remove-filter mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    @media (max-width: 1200px) {
      .filters-row {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .search-field {
        grid-column: 1 / -1;
        min-width: unset;
      }
    }

    @media (max-width: 768px) {
      .filters-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .action-text {
        display: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .filter-chip {
        border-width: 2px;
      }
    }
  `]
})
export class FilterSectionComponent {
  @Input({ required: true }) filters!: FilterOptions;
  @Input() companies: Company[] = [];
  @Input() config: FilterConfig = {};

  @Output() filtersChange = new EventEmitter<Partial<FilterOptions>>();
  @Output() refresh = new EventEmitter<void>();

  protected readonly isSearchExpanded = signal(false);

  readonly scopeOptions = signal<FilterOption[]>([
    { value: 'all', label: 'All Scopes' },
    { value: RoleScope.SYSTEM, label: 'System' },
    { value: RoleScope.COMPANY, label: 'Company' },
    { value: RoleScope.DEPARTMENT, label: 'Department' },
    { value: RoleScope.PROJECT, label: 'Project' }
  ]);

  readonly statusOptions = signal<FilterOption[]>([
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ]);

  protected onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.trim();
    this.filtersChange.emit({ searchTerm });
  }

  protected onScopeChange(scope: string): void {
    const scopeValue = scope === 'all' ? 'all' as any : scope as RoleScope;
    this.filtersChange.emit({ scope: scopeValue });
  }

  protected onCompanyChange(companyId: string): void {
    this.filtersChange.emit({
      companyId: companyId || undefined
    });
  }

  protected onStatusChange(status: string): void {
    let isActive: boolean | undefined;
    if (status === 'true') isActive = true;
    else if (status === 'false') isActive = false;
    else isActive = undefined;

    this.filtersChange.emit({ isActive });
  }

  protected onRefresh(): void {
    this.refresh.emit();
  }

  protected hasActiveFilters(): boolean {
    return !!(
      this.filters.searchTerm ||
      (this.filters.scope && this.filters.scope !== 'all') ||
      this.filters.companyId ||
      this.filters.isActive !== undefined
    );
  }

  protected clearAllFilters(): void {
    this.filtersChange.emit({
      searchTerm: '',
      scope: 'all' as any,
      companyId: undefined,
      isActive: undefined
    });
  }

  protected removeSearchFilter(): void {
    this.filtersChange.emit({ searchTerm: '' });
  }

  protected removeScopeFilter(): void {
    this.filtersChange.emit({ scope: 'all' as any });
  }

  protected removeCompanyFilter(): void {
    this.filtersChange.emit({ companyId: undefined });
  }

  protected removeStatusFilter(): void {
    this.filtersChange.emit({ isActive: undefined });
  }

  protected getScopeLabel(scope: string): string {
    const option = this.scopeOptions().find(opt => opt.value === scope);
    return option?.label || scope;
  }

  protected getCompanyName(companyId: string): string {
    const company = this.companies.find(c => c.id === companyId);
    return company?.name || 'Unknown';
  }
}
