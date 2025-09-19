import { Injectable, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export type UserRole = 'admin' | 'rep' | 'client' | 'public' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  metadata?: {
    department?: string;
    region?: string;
    [key: string]: any;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_STORAGE_KEY = 'gringo_auth_state';

  // Internal state management
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  // Public observable for components to subscribe to
  public authState$ = this.authState.asObservable();

  // Signals for reactive state management
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public userRole = signal<UserRole>('public');
  public userCompany = signal<string | null>(null);

  // Computed properties
  public isAdmin = computed(() => this.userRole() === 'admin');
  public isRep = computed(() => this.userRole() === 'rep');
  public isClient = computed(() => this.userRole() === 'client');

  // Mock users for demonstration (in real app, this would come from backend)
  private mockUsers: User[] = [
    {
      id: 'admin1',
      email: 'admin@gringo.com',
      name: 'System Administrator',
      role: 'admin',
      permissions: ['create_forms', 'manage_users', 'view_all_submissions', 'manage_companies'],
      isActive: true,
      metadata: { department: 'IT' }
    },
    {
      id: 'rep1',
      email: 'rep@acme.com',
      name: 'John Sales',
      role: 'rep',
      companyId: 'company1',
      companyName: 'Acme Construction',
      permissions: ['create_rfq', 'create_rqr', 'view_own_submissions'],
      isActive: true,
      metadata: { department: 'Sales', region: 'North' }
    },
    {
      id: 'rep2',
      email: 'rep@buildtech.com',
      name: 'Sarah Builder',
      role: 'rep',
      companyId: 'company2',
      companyName: 'BuildTech Solutions',
      permissions: ['create_rfq', 'create_rqr', 'view_own_submissions'],
      isActive: true,
      metadata: { department: 'Sales', region: 'South' }
    },
    {
      id: 'client1',
      email: 'client@prime.com',
      name: 'Mike Contractor',
      role: 'client',
      companyId: 'company3',
      companyName: 'Prime Contractors',
      permissions: ['view_public_forms', 'submit_forms'],
      isActive: true,
      metadata: { department: 'Operations' }
    }
  ];

  constructor() {
    this.loadAuthState();

    // For demo purposes, set a default user (remove in production)
    this.setDemoUser();
  }

  /**
   * Load authentication state from localStorage
   */
  private loadAuthState(): void {
    try {
      const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (stored) {
        const authState = JSON.parse(stored);
        this.updateAuthState(authState);
      }
    } catch (error) {
      console.warn('Failed to load auth state:', error);
      this.clearAuthState();
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveAuthState(state: AuthState): void {
    try {
      localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save auth state:', error);
    }
  }

  /**
   * Update internal auth state and signals
   */
  private updateAuthState(state: AuthState): void {
    this.authState.next(state);
    this.currentUser.set(state.user);
    this.isAuthenticated.set(state.isAuthenticated);
    this.userRole.set(state.user?.role || 'public');
    this.userCompany.set(state.user?.companyId || null);
  }

  /**
   * Set demo user for development (remove in production)
   */
  private setDemoUser(): void {
    // Default to rep user for demo
    const demoUser = this.mockUsers[1]; // rep user
    const authState: AuthState = {
      isAuthenticated: true,
      user: demoUser,
      token: 'demo_token_123'
    };
    this.updateAuthState(authState);
    this.saveAuthState(authState);
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthState> {
    // Mock login logic (replace with real API call)
    const user = this.mockUsers.find(u => u.email === credentials.email);

    if (user && user.isActive) {
      const authState: AuthState = {
        isAuthenticated: true,
        user: { ...user, lastLogin: new Date() },
        token: `token_${user.id}_${Date.now()}`
      };

      this.updateAuthState(authState);
      this.saveAuthState(authState);

      return of(authState);
    } else {
      throw new Error('Invalid credentials or inactive user');
    }
  }

  /**
   * Logout current user
   */
  logout(): Observable<boolean> {
    this.clearAuthState();
    return of(true);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    const authState: AuthState = {
      isAuthenticated: false,
      user: null,
      token: null
    };

    this.updateAuthState(authState);
    localStorage.removeItem(this.AUTH_STORAGE_KEY);
  }

  /**
   * Get current user as observable
   */
  getCurrentUser(): Observable<User | null> {
    return this.authState$.pipe(map(state => state.user));
  }

  /**
   * Get current user synchronously
   */
  getCurrentUserSync(): User | null {
    return this.currentUser();
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasRole(roles: UserRole[]): boolean {
    const currentRole = this.userRole();
    return roles.includes(currentRole);
  }

  /**
   * Check if user belongs to specific company
   */
  belongsToCompany(companyId: string): boolean {
    const user = this.currentUser();
    return user?.companyId === companyId;
  }

  /**
   * Switch user (for demo purposes)
   */
  switchUser(userEmail: string): Observable<AuthState> {
    const user = this.mockUsers.find(u => u.email === userEmail);
    if (user) {
      return this.login({ email: userEmail, password: 'demo' });
    }
    throw new Error('User not found');
  }

  /**
   * Get all available demo users (for testing)
   */
  getDemoUsers(): User[] {
    return this.mockUsers.map(user => ({
      ...user,
      // Don't expose sensitive fields
    }));
  }

  /**
   * Refresh user data
   */
  refreshUser(): Observable<User | null> {
    const currentUser = this.currentUser();
    if (!currentUser) return of(null);

    // In real app, this would fetch fresh user data from API
    const refreshedUser = this.mockUsers.find(u => u.id === currentUser.id);
    if (refreshedUser) {
      const authState: AuthState = {
        isAuthenticated: true,
        user: refreshedUser,
        token: this.authState.value.token
      };
      this.updateAuthState(authState);
      this.saveAuthState(authState);
      return of(refreshedUser);
    }

    return of(null);
  }

  /**
   * Validate current session
   */
  validateSession(): Observable<boolean> {
    const token = this.authState.value.token;
    if (!token) return of(false);

    // In real app, this would validate token with backend
    // For demo, just check if token exists and user is active
    const user = this.currentUser();
    return of(!!user && user.isActive);
  }
}
