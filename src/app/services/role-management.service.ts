import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap, retry, delay } from 'rxjs/operators';
import {
  Role,
  Company,
  Permission,
  RoleStats,
  FilterOptions,
  SortOptions,
  PaginationOptions,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleAssignmentRequest,
  ApiResponse,
  PaginatedResponse,
  RoleScope,
  AppError,
  ErrorSeverity
} from '../models/role.models';

@Injectable({
  providedIn: 'root'
})
export class RoleManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/roles';

  // State management with signals
  private readonly _roles = signal<Role[]>([]);
  private readonly _companies = signal<Company[]>([]);
  private readonly _permissions = signal<Permission[]>([]);
  private readonly _selectedCompanyId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<AppError | null>(null);

  // Filters and pagination
  private readonly _filters = signal<FilterOptions>({
    searchTerm: '',
    scope: 'all' as any,
    companyId: undefined,
    isActive: undefined
  });

  private readonly _sortOptions = signal<SortOptions>({
    field: 'name' as any,
    direction: 'asc' as any
  });

  private readonly _pagination = signal<PaginationOptions>({
    page: 1,
    pageSize: 20,
    totalItems: 0
  });

  // Public readonly signals
  readonly roles = this._roles.asReadonly();
  readonly companies = this._companies.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly selectedCompanyId = this._selectedCompanyId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly sortOptions = this._sortOptions.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed values
  readonly selectedCompany = computed(() => {
    const companyId = this._selectedCompanyId();
    return companyId ? this._companies().find(c => c.id === companyId) || null : null;
  });

  readonly filteredRoles = computed(() => {
    const roles = this._roles();
    const filters = this._filters();
    const selectedCompanyId = this._selectedCompanyId();

    return roles.filter(role => {
      // Search filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const matchesSearch =
          role.name.toLowerCase().includes(searchTerm) ||
          role.description?.toLowerCase().includes(searchTerm) ||
          role.permissions.some(p => p.name.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;
      }

      // Scope filter
      if (filters.scope && filters.scope !== 'all') {
        if (role.scope !== filters.scope) return false;
      }

      // Company filter
      if (selectedCompanyId && role.scope === RoleScope.COMPANY) {
        if (role.companyId !== selectedCompanyId) return false;
      }

      // Active status filter
      if (filters.isActive !== undefined) {
        if (role.isActive !== filters.isActive) return false;
      }

      return true;
    });
  });

  readonly roleStats = computed<RoleStats>(() => {
    const roles = this._roles();
    const activeRoles = roles.filter(r => r.isActive);

    return {
      totalRoles: roles.length,
      systemRoles: roles.filter(r => r.scope === RoleScope.SYSTEM).length,
      companyRoles: roles.filter(r => r.scope === RoleScope.COMPANY).length,
      activeRoles: activeRoles.length,
      inactiveRoles: roles.length - activeRoles.length,
      recentlyCreated: roles.filter(r => this.isRecentlyCreated(r.createdAt)).length,
      recentlyModified: roles.filter(r => this.isRecentlyModified(r.updatedAt)).length
    };
  });

  constructor() {
    this.loadInitialData();
  }

  // Public API methods

  /**
   * Load all roles with optional filters and pagination
   */
  loadRoles(refresh = false): Observable<Role[]> {
    if (!refresh && this._roles().length > 0) {
      return of(this._roles());
    }

    this._isLoading.set(true);
    this._error.set(null);

    const params = this.buildHttpParams();

    return this.http.get<PaginatedResponse<Role>>(`${this.baseUrl}`, { params }).pipe(
      retry(2),
      tap(response => {
        this._roles.set(response.data);
        this._pagination.update(p => ({
          ...p,
          totalItems: response.pagination?.totalItems || response.data.length
        }));
      }),
      map(response => response.data),
      catchError(error => this.handleError('Failed to load roles', error)),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Create a new role
   */
  createRole(roleData: CreateRoleRequest): Observable<Role> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<Role>>(`${this.baseUrl}`, roleData).pipe(
      map(response => response.data),
      tap(newRole => {
        this._roles.update(roles => [...roles, newRole]);
      }),
      catchError(error => this.handleError('Failed to create role', error)),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Update an existing role
   */
  updateRole(roleData: UpdateRoleRequest): Observable<Role> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<Role>>(`${this.baseUrl}/${roleData.id}`, roleData).pipe(
      map(response => response.data),
      tap(updatedRole => {
        this._roles.update(roles =>
          roles.map(role => role.id === updatedRole.id ? updatedRole : role)
        );
      }),
      catchError(error => this.handleError('Failed to update role', error)),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Delete a role
   */
  deleteRole(roleId: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${roleId}`).pipe(
      map(() => void 0),
      tap(() => {
        this._roles.update(roles => roles.filter(role => role.id !== roleId));
      }),
      catchError(error => this.handleError('Failed to delete role', error)),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Toggle role active status
   */
  toggleRoleStatus(roleId: string): Observable<Role> {
    const role = this._roles().find(r => r.id === roleId);
    if (!role) {
      return throwError(() => new Error('Role not found'));
    }

    return this.updateRole({
      id: roleId,
      isActive: !role.isActive
    });
  }

  /**
   * Assign/unassign users to/from a role
   */
  manageRoleAssignment(assignment: RoleAssignmentRequest): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${assignment.roleId}/users`, assignment).pipe(
      map(() => void 0),
      catchError(error => this.handleError('Failed to manage role assignment', error)),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Load companies for company filter
   */
  loadCompanies(): Observable<Company[]> {
    if (this._companies().length > 0) {
      return of(this._companies());
    }

    return this.http.get<ApiResponse<Company[]>>('/api/v1/companies').pipe(
      map(response => response.data),
      tap(companies => this._companies.set(companies)),
      catchError(error => this.handleError('Failed to load companies', error))
    );
  }

  /**
   * Load available permissions
   */
  loadPermissions(): Observable<Permission[]> {
    if (this._permissions().length > 0) {
      return of(this._permissions());
    }

    return this.http.get<ApiResponse<Permission[]>>('/api/v1/permissions').pipe(
      map(response => response.data),
      tap(permissions => this._permissions.set(permissions)),
      catchError(error => this.handleError('Failed to load permissions', error))
    );
  }

  /**
   * Export roles data
   */
  exportRoles(format: 'csv' | 'excel' = 'csv'): Observable<Blob> {
    const params = new HttpParams()
      .set('format', format)
      .set('filters', JSON.stringify(this._filters()));

    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError('Failed to export roles', error))
    );
  }

  // Filter and pagination methods

  updateFilters(filters: Partial<FilterOptions>): void {
    this._filters.update(current => ({ ...current, ...filters }));
    this._pagination.update(p => ({ ...p, page: 1 })); // Reset to first page
    this.loadRoles(true).subscribe();
  }

  updateSort(sort: Partial<SortOptions>): void {
    this._sortOptions.update(current => ({ ...current, ...sort }));
    this.loadRoles(true).subscribe();
  }

  updatePagination(pagination: Partial<PaginationOptions>): void {
    this._pagination.update(current => ({ ...current, ...pagination }));
    this.loadRoles(true).subscribe();
  }

  setSelectedCompany(companyId: string | null): void {
    this._selectedCompanyId.set(companyId);
    this.loadRoles(true).subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  // Private helper methods

  private loadInitialData(): void {
    this.loadRoles().subscribe();
    this.loadCompanies().subscribe();
    this.loadPermissions().subscribe();
  }

  private buildHttpParams(): HttpParams {
    const filters = this._filters();
    const sort = this._sortOptions();
    const pagination = this._pagination();

    let params = new HttpParams()
      .set('page', pagination.page.toString())
      .set('pageSize', pagination.pageSize.toString())
      .set('sortField', sort.field)
      .set('sortDirection', sort.direction);

    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }

    if (filters.scope && filters.scope !== 'all') {
      params = params.set('scope', filters.scope);
    }

    if (filters.companyId) {
      params = params.set('companyId', filters.companyId);
    }

    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }

    return params;
  }

  private handleError(message: string, error: HttpErrorResponse): Observable<never> {
    console.error(`RoleManagementService Error: ${message}`, error);

    const appError: AppError = {
      code: error.status?.toString() || 'UNKNOWN',
      message: error.error?.message || message,
      details: error.error,
      timestamp: new Date(),
      severity: this.getErrorSeverity(error.status)
    };

    this._error.set(appError);
    this._isLoading.set(false);

    return throwError(() => appError);
  }

  private getErrorSeverity(status?: number): ErrorSeverity {
    if (!status) return ErrorSeverity.ERROR;

    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status >= 400) return ErrorSeverity.ERROR;
    if (status >= 300) return ErrorSeverity.WARNING;

    return ErrorSeverity.INFO;
  }

  private isRecentlyCreated(date: Date): boolean {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(date) > weekAgo;
  }

  private isRecentlyModified(date: Date): boolean {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return new Date(date) > dayAgo;
  }
}
