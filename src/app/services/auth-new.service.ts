import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import {
  User,
  Company,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenRefreshRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest,
  JwtPayload,
  ApiResponse,
  SystemRole
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly API_BASE = '/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';
  private readonly COMPANY_KEY = 'current_company';

  // Reactive state using signals
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentCompanySubject = new BehaviorSubject<Company | null>(null);
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  currentUser$ = this.currentUserSubject.asObservable();
  currentCompany$ = this.currentCompanySubject.asObservable();
  permissions$ = this.permissionsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  // Signals for reactive UI
  currentUser = signal<User | null>(null);
  currentCompany = signal<Company | null>(null);
  permissions = signal<string[]>([]);
  isLoading = signal<boolean>(false);

  // Computed properties
  isAuthenticated = computed(() => !!this.currentUser());
  isSuperAdmin = computed(() =>
    this.hasRole('super_admin')
  );
  isCompanyAdmin = computed(() =>
    this.hasRole('company_admin') || this.isSuperAdmin()
  );
  canManageUsers = computed(() =>
    this.hasPermission('users:manage') || this.isCompanyAdmin()
  );
  canManageForms = computed(() =>
    this.hasPermission('forms:manage') || this.isCompanyAdmin()
  );

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored tokens
   */
  private async initializeAuth(): Promise<void> {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    const company = this.getStoredCompany();

    if (token && user && company) {
      if (this.isTokenValid(token)) {
        this.setCurrentUser(user);
        this.setCurrentCompany(company);
        await this.loadUserPermissions();
      } else {
        // Try to refresh the token
        await this.refreshToken().toPromise().catch(() => {
          this.clearAuthState();
        });
      }
    }
  }

  /**
   * Login user with email/password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoading.set(true);
    this.isLoadingSubject.next(true);

    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_BASE}/login`, credentials)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Login failed');
          }
          return response.data;
        }),
        tap(loginResponse => {
          this.handleLoginSuccess(loginResponse);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
        tap(() => {
          this.isLoading.set(false);
          this.isLoadingSubject.next(false);
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<LoginResponse> {
    this.isLoading.set(true);
    this.isLoadingSubject.next(true);

    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_BASE}/register`, userData)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Registration failed');
          }
          return response.data;
        }),
        tap(loginResponse => {
          this.handleLoginSuccess(loginResponse);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
        tap(() => {
          this.isLoading.set(false);
          this.isLoadingSubject.next(false);
        })
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    const refreshToken = this.getStoredRefreshToken();

    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/logout`, {
      refreshToken
    }).pipe(
      map(() => void 0), // Ensure we return void
      tap(() => {
        this.clearAuthState();
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        // Even if logout API fails, clear local state
        this.clearAuthState();
        this.router.navigate(['/login']);
        return of(void 0);
      })
    );
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getStoredRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: TokenRefreshRequest = { refreshToken };

    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_BASE}/refresh`, request)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Token refresh failed');
          }
          return response.data;
        }),
        tap(loginResponse => {
          this.handleLoginSuccess(loginResponse);
        }),
        catchError(error => {
          this.clearAuthState();
          return throwError(() => error);
        })
      );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(request: PasswordResetRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/password-reset`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Password reset request failed');
          }
        })
      );
  }

  /**
   * Confirm password reset with token
   */
  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/password-reset/confirm`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Password reset failed');
          }
        })
      );
  }

  /**
   * Change user password
   */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/change-password`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Password change failed');
          }
        })
      );
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    const user = this.currentUser();
    return user?.roles?.some(role => role.name === roleName) || false;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const permissions = this.permissions();
    return permissions.includes(permission);
  }

  /**
   * Check if user can access resource with specific action
   */
  canAccess(resource: string, action: string): boolean {
    return this.hasPermission(`${resource}:${action}`);
  }

  /**
   * Get user's system role (highest priority role)
   */
  getSystemRole(): SystemRole | null {
    const user = this.currentUser();
    if (!user?.roles) return null;

    // Priority order: super_admin > company_admin > user
    if (user.roles.some(role => role.name === 'super_admin')) {
      return 'super_admin';
    }
    if (user.roles.some(role => role.name === 'company_admin')) {
      return 'company_admin';
    }
    return 'user';
  }

  /**
   * Switch to different company (for super admin)
   */
  switchCompany(companyId: string): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_BASE}/switch-company`, {
      companyId
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Company switch failed');
        }
        return response.data;
      }),
      tap(loginResponse => {
        this.handleLoginSuccess(loginResponse);
      })
    );
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<User>): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_BASE}/profile`, updates)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Profile update failed');
          }
          return response.data;
        }),
        tap(updatedUser => {
          this.setCurrentUser(updatedUser);
        })
      );
  }

  /**
   * Verify email address
   */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/verify-email`, { token })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Email verification failed');
          }
        })
      );
  }

  /**
   * Resend email verification
   */
  resendEmailVerification(): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/resend-verification`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to resend verification email');
          }
        })
      );
  }

  // Private helper methods

  private handleLoginSuccess(loginResponse: LoginResponse): void {
    this.storeToken(loginResponse.token);
    this.storeRefreshToken(loginResponse.refreshToken);
    this.setCurrentUser(loginResponse.user);
    this.setCurrentCompany(loginResponse.company);
    this.setPermissions(loginResponse.permissions);
  }

  private setCurrentUser(user: User): void {
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private setCurrentCompany(company: Company): void {
    this.currentCompany.set(company);
    this.currentCompanySubject.next(company);
    localStorage.setItem(this.COMPANY_KEY, JSON.stringify(company));
  }

  private setPermissions(permissions: string[]): void {
    this.permissions.set(permissions);
    this.permissionsSubject.next(permissions);
  }

  private async loadUserPermissions(): Promise<void> {
    try {
      const response = await this.http.get<ApiResponse<string[]>>(`${this.API_BASE}/permissions`).toPromise();
      if (response?.success && response.data) {
        this.setPermissions(response.data);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
    }
  }

  private clearAuthState(): void {
    this.currentUser.set(null);
    this.currentCompany.set(null);
    this.permissions.set([]);
    this.currentUserSubject.next(null);
    this.currentCompanySubject.next(null);
    this.permissionsSubject.next([]);

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.COMPANY_KEY);
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private storeRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private getStoredCompany(): Company | null {
    const stored = localStorage.getItem(this.COMPANY_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  private decodeToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }

  private handleAuthError(error: any): void {
    console.error('Authentication error:', error);

    // Handle specific error cases
    if (error.status === 401) {
      this.clearAuthState();
      this.router.navigate(['/login']);
    }
  }
}
