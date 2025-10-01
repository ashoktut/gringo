import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Company,
  CompanySettings,
  CompanyBranding,
  CompanyFeatures,
  CompanySubscription,
  ApiResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = '/api/companies';

  // Reactive state
  companies = signal<Company[]>([]);
  selectedCompany = signal<Company | null>(null);

  /**
   * Get all companies (Super Admin only)
   */
  getAllCompanies(page = 1, limit = 20): Observable<{ companies: Company[], pagination: any }> {
    return this.http.get<ApiResponse<{ companies: Company[], pagination: any }>>(
      `${this.API_BASE}?page=${page}&limit=${limit}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch companies');
        }
        this.companies.set(response.data.companies);
        return response.data;
      })
    );
  }

  /**
   * Get company by ID
   */
  getCompanyById(companyId: string): Observable<Company> {
    return this.http.get<ApiResponse<Company>>(`${this.API_BASE}/${companyId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Company not found');
          }
          return response.data;
        })
      );
  }

  /**
   * Create new company
   */
  createCompany(companyData: Partial<Company>): Observable<Company> {
    return this.http.post<ApiResponse<Company>>(`${this.API_BASE}`, companyData)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create company');
          }

          // Update local state
          const currentCompanies = this.companies();
          this.companies.set([...currentCompanies, response.data]);

          return response.data;
        })
      );
  }

  /**
   * Update company
   */
  updateCompany(companyId: string, updates: Partial<Company>): Observable<Company> {
    return this.http.put<ApiResponse<Company>>(`${this.API_BASE}/${companyId}`, updates)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company');
          }

          // Update local state
          const currentCompanies = this.companies();
          const updatedCompanies = currentCompanies.map(company =>
            company.id === companyId ? response.data! : company
          );
          this.companies.set(updatedCompanies);

          // Update selected company if it's the one being updated
          const selected = this.selectedCompany();
          if (selected?.id === companyId) {
            this.selectedCompany.set(response.data);
          }

          return response.data;
        })
      );
  }

  /**
   * Delete company (Super Admin only)
   */
  deleteCompany(companyId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_BASE}/${companyId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete company');
          }

          // Update local state
          const currentCompanies = this.companies();
          const filteredCompanies = currentCompanies.filter(company => company.id !== companyId);
          this.companies.set(filteredCompanies);

          // Clear selected company if it was deleted
          const selected = this.selectedCompany();
          if (selected?.id === companyId) {
            this.selectedCompany.set(null);
          }
        })
      );
  }

  /**
   * Activate/Deactivate company
   */
  toggleCompanyStatus(companyId: string, isActive: boolean): Observable<Company> {
    return this.http.patch<ApiResponse<Company>>(`${this.API_BASE}/${companyId}/status`, {
      isActive
    }).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to update company status');
        }

        // Update local state
        this.updateCompanyInState(response.data);
        return response.data;
      })
    );
  }

  /**
   * Update company settings
   */
  updateCompanySettings(companyId: string, settings: Partial<CompanySettings>): Observable<CompanySettings> {
    return this.http.put<ApiResponse<CompanySettings>>(`${this.API_BASE}/${companyId}/settings`, settings)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company settings');
          }

          // Update the company in local state
          this.updateCompanySettings_internal(companyId, response.data);
          return response.data;
        })
      );
  }

  /**
   * Update company branding
   */
  updateCompanyBranding(companyId: string, branding: Partial<CompanyBranding>): Observable<CompanyBranding> {
    return this.http.put<ApiResponse<CompanyBranding>>(`${this.API_BASE}/${companyId}/branding`, branding)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company branding');
          }

          // Update the company in local state
          this.updateCompanyBranding_internal(companyId, response.data);
          return response.data;
        })
      );
  }

  /**
   * Update company features
   */
  updateCompanyFeatures(companyId: string, features: Partial<CompanyFeatures>): Observable<CompanyFeatures> {
    return this.http.put<ApiResponse<CompanyFeatures>>(`${this.API_BASE}/${companyId}/features`, features)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company features');
          }

          // Update the company in local state
          this.updateCompanyFeatures_internal(companyId, response.data);
          return response.data;
        })
      );
  }

  /**
   * Update company subscription
   */
  updateCompanySubscription(companyId: string, subscription: Partial<CompanySubscription>): Observable<CompanySubscription> {
    return this.http.put<ApiResponse<CompanySubscription>>(`${this.API_BASE}/${companyId}/subscription`, subscription)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company subscription');
          }

          // Update the company in local state
          this.updateCompanySubscription_internal(companyId, response.data);
          return response.data;
        })
      );
  }

  /**
   * Get company statistics
   */
  getCompanyStats(companyId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.API_BASE}/${companyId}/stats`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch company statistics');
          }
          return response.data;
        })
      );
  }

  /**
   * Get company users count
   */
  getCompanyUsersCount(companyId: string): Observable<number> {
    return this.http.get<ApiResponse<{ count: number }>>(`${this.API_BASE}/${companyId}/users/count`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch users count');
          }
          return response.data.count;
        })
      );
  }

  /**
   * Upload company logo
   */
  uploadCompanyLogo(companyId: string, logoFile: File): Observable<string> {
    const formData = new FormData();
    formData.append('logo', logoFile);

    return this.http.post<ApiResponse<{ logoUrl: string }>>(
      `${this.API_BASE}/${companyId}/logo`,
      formData
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to upload logo');
        }

        // Update branding in local state
        this.updateCompanyBranding_internal(companyId, { logo: response.data.logoUrl });
        return response.data.logoUrl;
      })
    );
  }

  /**
   * Search companies by name or domain
   */
  searchCompanies(query: string, page = 1, limit = 20): Observable<{ companies: Company[], pagination: any }> {
    return this.http.get<ApiResponse<{ companies: Company[], pagination: any }>>(
      `${this.API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Search failed');
        }
        return response.data;
      })
    );
  }

  /**
   * Get companies with active status
   */
  getActiveCompanies(): Observable<Company[]> {
    return this.http.get<ApiResponse<Company[]>>(`${this.API_BASE}/active`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch active companies');
          }
          return response.data;
        })
      );
  }

  /**
   * Validate company domain
   */
  validateCompanyDomain(domain: string): Observable<{ isAvailable: boolean }> {
    return this.http.post<ApiResponse<{ isAvailable: boolean }>>(
      `${this.API_BASE}/validate-domain`,
      { domain }
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Domain validation failed');
        }
        return response.data;
      })
    );
  }

  // Private helper methods

  private updateCompanyInState(updatedCompany: Company): void {
    const currentCompanies = this.companies();
    const updatedCompanies = currentCompanies.map(company =>
      company.id === updatedCompany.id ? updatedCompany : company
    );
    this.companies.set(updatedCompanies);

    // Update selected company if it's the one being updated
    const selected = this.selectedCompany();
    if (selected?.id === updatedCompany.id) {
      this.selectedCompany.set(updatedCompany);
    }
  }

  private updateCompanySettings_internal(companyId: string, settings: CompanySettings): void {
    const currentCompanies = this.companies();
    const updatedCompanies = currentCompanies.map(company =>
      company.id === companyId
        ? { ...company, settings: { ...company.settings, ...settings } }
        : company
    );
    this.companies.set(updatedCompanies);

    // Update selected company
    const selected = this.selectedCompany();
    if (selected?.id === companyId) {
      this.selectedCompany.set({
        ...selected,
        settings: { ...selected.settings, ...settings }
      });
    }
  }

  private updateCompanyBranding_internal(companyId: string, branding: Partial<CompanyBranding>): void {
    const currentCompanies = this.companies();
    const updatedCompanies = currentCompanies.map(company =>
      company.id === companyId
        ? { ...company, branding: { ...company.branding, ...branding } }
        : company
    );
    this.companies.set(updatedCompanies);

    // Update selected company
    const selected = this.selectedCompany();
    if (selected?.id === companyId) {
      this.selectedCompany.set({
        ...selected,
        branding: { ...selected.branding, ...branding }
      });
    }
  }

  private updateCompanyFeatures_internal(companyId: string, features: Partial<CompanyFeatures>): void {
    const currentCompanies = this.companies();
    const updatedCompanies = currentCompanies.map(company =>
      company.id === companyId
        ? { ...company, features: { ...company.features, ...features } }
        : company
    );
    this.companies.set(updatedCompanies);

    // Update selected company
    const selected = this.selectedCompany();
    if (selected?.id === companyId) {
      this.selectedCompany.set({
        ...selected,
        features: { ...selected.features, ...features }
      });
    }
  }

  private updateCompanySubscription_internal(companyId: string, subscription: Partial<CompanySubscription>): void {
    const currentCompanies = this.companies();
    const updatedCompanies = currentCompanies.map(company =>
      company.id === companyId
        ? { ...company, subscription: { ...company.subscription, ...subscription } }
        : company
    );
    this.companies.set(updatedCompanies);

    // Update selected company
    const selected = this.selectedCompany();
    if (selected?.id === companyId) {
      this.selectedCompany.set({
        ...selected,
        subscription: { ...selected.subscription, ...subscription }
      });
    }
  }

  // Additional methods referenced in components
  getCompany(companyId: string): Observable<Company> {
    return this.getCompanyById(companyId);
  }

  updateCompanyStatus(companyId: string, status: string): Observable<Company> {
    return this.http.patch<ApiResponse<Company>>(`${this.API_BASE}/${companyId}/status`, { status })
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update company status');
          }
          
          // Update company in state
          const updatedCompany = response.data;
          const currentCompanies = this.companies();
          const updatedCompanies = currentCompanies.map(company =>
            company.id === companyId ? updatedCompany : company
          );
          this.companies.set(updatedCompanies);

          return updatedCompany;
        })
      );
  }
}
