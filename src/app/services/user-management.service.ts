import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, filter, of } from 'rxjs';
import { User, Company, UserSession, UserRole, Permission, CompanySettings } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly USERS_KEY = 'app-users';
  private readonly COMPANIES_KEY = 'app-companies';
  private readonly SESSION_KEY = 'user-session';

  private usersSubject = new BehaviorSubject<User[]>([]);
  private companiesSubject = new BehaviorSubject<Company[]>([]);
  private currentSessionSubject = new BehaviorSubject<UserSession | null>(null);

  public users$ = this.usersSubject.asObservable();
  public companies$ = this.companiesSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();
  public currentUser$ = this.currentSession$.pipe(map(session => session?.user || null));
  public currentCompany$ = this.currentSession$.pipe(map(session => session?.company || null));

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    this.loadUsers();
    this.loadCompanies();
    this.loadSession();
    this.initializeDefaultData();
  }

  private initializeDefaultData(): void {
    // Create default super-admin and companies if they don't exist
    const users = this.usersSubject.value;
    const companies = this.companiesSubject.value;

    if (companies.length === 0) {
      this.createDefaultCompanies();
    }

    if (users.length === 0) {
      this.createDefaultUsers();
    }
  }

  private createDefaultCompanies(): void {
    const defaultCompanies: Company[] = [
      {
        id: 'company-1',
        name: 'Acme Corporation',
        code: 'ACME',
        industry: 'Manufacturing',
        active: true,
        createdAt: new Date(),
        adminUsers: ['admin-acme'],
        allowedFormTypes: ['rfq', 'rqr', 'invoice', 'quote'],
        settings: {
          brandingColor: '#1976d2',
          maxTemplates: 50,
          maxUsers: 20
        }
      },
      {
        id: 'company-2',
        name: 'Global Industries',
        code: 'GLOB',
        industry: 'Technology',
        active: true,
        createdAt: new Date(),
        adminUsers: ['admin-global'],
        allowedFormTypes: ['rfq', 'rqr', 'report'],
        settings: {
          brandingColor: '#4caf50',
          maxTemplates: 30,
          maxUsers: 15
        }
      },
      {
        id: 'company-3',
        name: 'Tech Solutions Inc',
        code: 'TECH',
        industry: 'Software Development',
        active: true,
        createdAt: new Date(),
        adminUsers: ['admin-tech'],
        allowedFormTypes: ['rfq', 'invoice', 'quote', 'other'],
        settings: {
          brandingColor: '#ff9800',
          maxTemplates: 40,
          maxUsers: 25
        }
      }
    ];

    this.companiesSubject.next(defaultCompanies);
    this.saveCompanies();
  }

  private createDefaultUsers(): void {
    const defaultUsers: User[] = [
      {
        id: 'super-admin',
        email: 'admin@gringo.com',
        name: 'Super Administrator',
        role: 'super-admin',
        isActive: true,
        createdAt: new Date(),
        permissions: [
          { resource: '*', actions: ['read', 'write', 'delete', 'assign', 'manage'], scope: 'global' }
        ]
      },
      {
        id: 'admin-acme',
        email: 'admin@acme.com',
        name: 'John Smith (Acme Admin)',
        role: 'company-admin',
        companyId: 'company-1',
        isActive: true,
        createdAt: new Date(),
        permissions: [
          { resource: 'templates', actions: ['read', 'write', 'assign'], scope: 'company' },
          { resource: 'users', actions: ['read'], scope: 'company' },
          { resource: 'forms', actions: ['read', 'write'], scope: 'company' }
        ]
      },
      {
        id: 'admin-global',
        email: 'admin@global.com',
        name: 'Sarah Johnson (Global Admin)',
        role: 'company-admin',
        companyId: 'company-2',
        isActive: true,
        createdAt: new Date(),
        permissions: [
          { resource: 'templates', actions: ['read', 'write', 'assign'], scope: 'company' },
          { resource: 'users', actions: ['read'], scope: 'company' },
          { resource: 'forms', actions: ['read', 'write'], scope: 'company' }
        ]
      },
      {
        id: 'admin-tech',
        email: 'admin@techsolutions.com',
        name: 'Mike Chen (Tech Admin)',
        role: 'company-admin',
        companyId: 'company-3',
        isActive: true,
        createdAt: new Date(),
        permissions: [
          { resource: 'templates', actions: ['read', 'write', 'assign'], scope: 'company' },
          { resource: 'users', actions: ['read'], scope: 'company' },
          { resource: 'forms', actions: ['read', 'write'], scope: 'company' }
        ]
      }
    ];

    this.usersSubject.next(defaultUsers);
    this.saveUsers();
  }

  // ===== SESSION MANAGEMENT =====

  login(email: string, companyId?: string): Observable<UserSession | null> {
    const users = this.usersSubject.value;
    const companies = this.companiesSubject.value;

    const user = users.find(u => u.email === email && u.isActive);
    if (!user) {
      return of(null);
    }

    let company: Company | undefined;

    if (user.role === 'super-admin') {
      // Super admin can work with any company or globally
      company = companyId ? companies.find(c => c.id === companyId) : undefined;
    } else {
      // Company admin/user must use their assigned company
      company = companies.find(c => c.id === user.companyId);
      if (!company || !company.active) {
        return of(null);
      }
    }

    const session: UserSession = {
      user,
      company,
      permissions: user.permissions || [],
      accessToken: this.generateAccessToken(user)
    };

    this.currentSessionSubject.next(session);
    this.saveSession(session);

    return of(session);
  }

  logout(): void {
    this.currentSessionSubject.next(null);
    localStorage.removeItem(this.SESSION_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentSessionSubject.value?.user || null;
  }

  getCurrentCompany(): Company | null {
    return this.currentSessionSubject.value?.company || null;
  }

  isLoggedIn(): boolean {
    return this.currentSessionSubject.value !== null;
  }

  hasPermission(resource: string, action: string): boolean {
    const session = this.currentSessionSubject.value;
    if (!session) return false;

    const user = session.user;

    // Super admin has all permissions
    if (user.role === 'super-admin') {
      return true;
    }

    // Check specific permissions
    return user.permissions?.some(permission => {
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      const actionMatch = permission.actions.includes(action as any);
      return resourceMatch && actionMatch;
    }) || false;
  }

  canManageCompany(companyId: string): boolean {
    const session = this.currentSessionSubject.value;
    if (!session) return false;

    const user = session.user;

    // Super admin can manage all companies
    if (user.role === 'super-admin') {
      return true;
    }

    // Company admin can only manage their own company
    return user.role === 'company-admin' && user.companyId === companyId;
  }

  // ===== COMPANY MANAGEMENT =====

  getCompanies(): Observable<Company[]> {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      return of([]);
    }

    if (currentUser.role === 'super-admin') {
      return this.companies$;
    } else {
      // Company users can only see their own company
      return this.companies$.pipe(
        map(companies => companies.filter(c => c.id === currentUser.companyId))
      );
    }
  }

  getAllCompanies(): Company[] {
    return this.companiesSubject.value;
  }

  getCompanyById(id: string): Observable<Company | null> {
    return this.companies$.pipe(
      map(companies => companies.find(c => c.id === id) || null),
      filter(company => {
        if (!company) return false;
        return this.canManageCompany(company.id);
      })
    );
  }

  // ===== USER MANAGEMENT =====

  getUsers(): Observable<User[]> {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      return of([]);
    }

    if (currentUser.role === 'super-admin') {
      return this.users$;
    } else {
      // Company users can only see users from their company
      return this.users$.pipe(
        map(users => users.filter(u => u.companyId === currentUser.companyId))
      );
    }
  }

  getUserById(id: string): Observable<User | null> {
    return this.users$.pipe(
      map(users => users.find(u => u.id === id) || null)
    );
  }

  // ===== UTILITY METHODS =====

  switchCompany(companyId: string): Observable<boolean> {
    const currentUser = this.getCurrentUser();

    if (!currentUser || currentUser.role !== 'super-admin') {
      return of(false);
    }

    return this.login(currentUser.email, companyId).pipe(
      map(session => session !== null)
    );
  }

  private generateAccessToken(user: User): string {
    return `token_${user.id}_${Date.now()}`;
  }

  private loadUsers(): void {
    const stored = localStorage.getItem(this.USERS_KEY);
    if (stored) {
      try {
        const users = JSON.parse(stored).map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : undefined
        }));
        this.usersSubject.next(users);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }
  }

  private loadCompanies(): void {
    const stored = localStorage.getItem(this.COMPANIES_KEY);
    if (stored) {
      try {
        const companies = JSON.parse(stored).map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
        this.companiesSubject.next(companies);
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    }
  }

  private loadSession(): void {
    const stored = localStorage.getItem(this.SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        session.user.createdAt = new Date(session.user.createdAt);
        if (session.user.lastLoginAt) {
          session.user.lastLoginAt = new Date(session.user.lastLoginAt);
        }
        if (session.company) {
          session.company.createdAt = new Date(session.company.createdAt);
        }
        this.currentSessionSubject.next(session);
      } catch (error) {
        console.error('Failed to load session:', error);
        localStorage.removeItem(this.SESSION_KEY);
      }
    }
  }

  private saveUsers(): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(this.usersSubject.value));
  }

  private saveCompanies(): void {
    localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(this.companiesSubject.value));
  }

  private saveSession(session: UserSession): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Set session directly (used by AuthBridgeService)
   */
  setSession(session: UserSession): void {
    this.currentSessionSubject.next(session);
    this.saveSession(session);
  }

  /**
   * Ensure a company exists in the system (used by AuthBridgeService)
   */
  async ensureCompanyExists(company: Company): Promise<void> {
    const companies = this.companiesSubject.value;
    const existingCompany = companies.find(c => c.id === company.id);

    if (!existingCompany) {
      companies.push(company);
      this.companiesSubject.next(companies);
      this.saveCompanies();
    } else if (JSON.stringify(existingCompany) !== JSON.stringify(company)) {
      // Update existing company if data has changed
      const index = companies.findIndex(c => c.id === company.id);
      companies[index] = company;
      this.companiesSubject.next(companies);
      this.saveCompanies();
    }
  }

  /**
   * Check if current user has a specific role
   */
  hasRole(role: UserRole): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === role;
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.role === role))
    );
  }

  /**
   * Get users by IDs
   */
  getUsersByIds(userIds: string[]): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => userIds.includes(user.id)))
    );
  }
}
