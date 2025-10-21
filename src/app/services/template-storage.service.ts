import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Template, TemplateType, type DocumentType, TemplateUploadRequest } from '../models/template.models';
import { IndexedDbService } from './indexed-db.service';
import { UserManagementService } from './user-management.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateStorageService {
  private readonly STORAGE_KEY = 'pdf_templates';
  private templatesSubject = new BehaviorSubject<Template[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor(
    private indexedDbService: IndexedDbService,
    private userService: UserManagementService
  ) {
    this.loadTemplatesFromStorage();
  }

  /**
   * Get all templates
   */
  getAllTemplates(): Observable<Template[]> {
    return this.templates$;
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): Observable<Template | null> {
    const templates = this.templatesSubject.value;
    const template = templates.find(t => t.id === id) || null;
    return of(template);
  }

  /**
   * Get templates by form type
   */
  getTemplatesByFormType(formType: string): Observable<Template[]> {
    const templates = this.templatesSubject.value;
    const filtered = templates.filter(t =>
      t.formType === formType || t.isUniversal
    );
    return of(filtered);
  }

  /**
   * Get templates available to current user (company-aware)
   */
  getTemplatesForCurrentUser(): Observable<Template[]> {
    const currentUser = this.userService.getCurrentUser();
    const currentCompany = this.userService.getCurrentCompany();

    if (!currentUser) {
      return of([]);
    }

    return this.templates$.pipe(
      map(templates => {
        // Super admin sees all templates
        if (currentUser.role === 'super-admin') {
          return templates;
        }

        // Company admin sees templates assigned to their company or global templates
        if (currentUser.role === 'company-admin' && currentCompany) {
          return templates.filter(template =>
            template.visibility === 'public' || // Global templates
            (template.assignedCompanies && template.assignedCompanies.includes(currentCompany.id)) ||
            template.companyId === currentCompany.id
          );
        }

        // Regular users see public templates only
        return templates.filter(template => template.visibility === 'public');
      })
    );
  }

  /**
   * Get templates by company and form type (company-aware)
   */
  getTemplatesByCompanyAndFormType(formType: string, companyId?: string): Observable<Template[]> {
    const currentUser = this.userService.getCurrentUser();
    const targetCompanyId = companyId || this.userService.getCurrentCompany()?.id;

    if (!currentUser || !targetCompanyId) {
      return of([]);
    }

    // Check if user can access templates for this company
    if (currentUser.role !== 'super-admin' && currentUser.companyId !== targetCompanyId) {
      return of([]);
    }

    return this.getTemplatesForCurrentUser().pipe(
      map(templates => templates.filter(template =>
        (template.formType === formType || template.isUniversal) &&
        (template.visibility === 'public' ||
         (template.assignedCompanies && template.assignedCompanies.includes(targetCompanyId)) ||
         template.companyId === targetCompanyId)
      ))
    );
  }

  /**
   * Save template to storage
   */
  saveTemplate(template: Template): Observable<Template> {
    const templates = this.templatesSubject.value;
    const existingIndex = templates.findIndex(t => t.id === template.id);

    if (existingIndex > -1) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }

    return this.indexedDbService.save(
      this.indexedDbService.STORES.TEMPLATES,
      template.id,
      template
    ).pipe(
      tap(() => {
        this.templatesSubject.next([...templates]);
        console.log('✅ Template saved to IndexedDB:', template.id);
      }),
      map(() => template),
      catchError(error => {
        console.error('❌ Failed to save template to IndexedDB:', error);
        // Revert the local change if save failed
        if (existingIndex > -1) {
          this.loadTemplatesFromStorage();
        } else {
          const index = templates.findIndex(t => t.id === template.id);
          if (index > -1) templates.splice(index, 1);
          this.templatesSubject.next([...templates]);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete template by ID
   */
  deleteTemplate(id: string): Observable<boolean> {
    const templates = this.templatesSubject.value;
    const templateIndex = templates.findIndex(t => t.id === id);

    if (templateIndex > -1) {
      const deletedTemplate = templates[templateIndex];
      templates.splice(templateIndex, 1);

      return this.indexedDbService.delete(this.indexedDbService.STORES.TEMPLATES, id).pipe(
        tap(() => {
          this.templatesSubject.next([...templates]);
          console.log('✅ Template deleted from IndexedDB:', id);
        }),
        catchError(error => {
          console.error('❌ Failed to delete template from IndexedDB:', error);
          // Revert the local change if delete failed
          templates.splice(templateIndex, 0, deletedTemplate);
          this.templatesSubject.next([...templates]);
          return of(false);
        })
      );
    }

    return of(false);
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<Template>): Observable<Template | null> {
    const templates = this.templatesSubject.value;
    const templateIndex = templates.findIndex(t => t.id === id);

    if (templateIndex > -1) {
      const updatedTemplate = { ...templates[templateIndex], ...updates };
      templates[templateIndex] = updatedTemplate;

      return this.indexedDbService.save(
        this.indexedDbService.STORES.TEMPLATES,
        id,
        updatedTemplate
      ).pipe(
        tap(() => {
          this.templatesSubject.next([...templates]);
          console.log('✅ Template updated in IndexedDB:', id);
        }),
        map(() => updatedTemplate),
        catchError(error => {
          console.error('❌ Failed to update template in IndexedDB:', error);
          this.loadTemplatesFromStorage(); // Reload from storage
          return throwError(() => error);
        })
      );
    }

    return of(null);
  }

  /**
   * Upload new template
   */
  uploadTemplate(
    file: File,
    formType: TemplateType,
    isUniversal: boolean = false
  ): Observable<Template> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const template: Template = {
          id: this.generateTemplateId(),
          name: file.name,
          type: this.getTemplateType(file),
          formType: formType,
          content: reader.result as string,
          placeholders: this.extractPlaceholders(reader.result as string),
          size: file.size,
          uploadedAt: new Date(),
          isUniversal: isUniversal,
          isCompanySpecific: false,
          visibility: 'public'
        };

        this.saveTemplate(template).subscribe({
          next: (savedTemplate) => {
            observer.next(savedTemplate);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Upload template with company assignment (enhanced method)
   */
  uploadTemplateWithAssignment(uploadRequest: TemplateUploadRequest): Observable<Template> {
    const currentUser = this.userService.getCurrentUser();
    const currentCompany = this.userService.getCurrentCompany();

    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const template: Template = {
          id: this.generateTemplateId(),
          name: uploadRequest.name,
          type: this.getTemplateType(uploadRequest.file),
          formType: uploadRequest.formType,
          content: reader.result as string,
          placeholders: this.extractPlaceholders(reader.result as string),
          size: uploadRequest.file.size,
          uploadedAt: new Date(),
          isUniversal: uploadRequest.isUniversal || false,
          isCompanySpecific: uploadRequest.isCompanySpecific || false,
          visibility: uploadRequest.visibility || 'public',

          // Company assignment properties
          companyId: uploadRequest.companyId || currentCompany?.id,
          assignedCompanies: uploadRequest.assignedCompanies || [],
          createdBy: currentUser.id,

          // Metadata from upload request
          metadata: uploadRequest.metadata
        };

        // Auto-assign to current company for company admins
        if (currentUser.role === 'company-admin' && currentCompany && !template.assignedCompanies?.includes(currentCompany.id)) {
          template.assignedCompanies = template.assignedCompanies || [];
          template.assignedCompanies.push(currentCompany.id);
          template.isCompanySpecific = true;
          template.visibility = 'company';
        }

        this.saveTemplate(template).subscribe({
          next: (savedTemplate) => {
            observer.next(savedTemplate);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read file'));
      };

      reader.readAsText(uploadRequest.file);
    });
  }

  /**
   * Assign template to companies (super-admin only)
   */
  assignTemplateToCompanies(templateId: string, companyIds: string[]): Observable<Template> {
    const currentUser = this.userService.getCurrentUser();

    if (!currentUser || currentUser.role !== 'super-admin') {
      return throwError(() => new Error('Only super-admins can assign templates to companies'));
    }

    return this.getTemplateById(templateId).pipe(
      switchMap(template => {
        if (!template) {
          return throwError(() => new Error('Template not found'));
        }

        // Add new company assignments
        const updatedAssignedCompanies = [...new Set([...(template.assignedCompanies || []), ...companyIds])];

        const updatedTemplate: Template = {
          ...template,
          assignedCompanies: updatedAssignedCompanies,
          isCompanySpecific: updatedAssignedCompanies.length > 0,
          visibility: updatedAssignedCompanies.length > 0 ? 'company' : template.visibility
        };

        return this.saveTemplate(updatedTemplate);
      })
    );
  }

  /**
   * Unassign template from companies (super-admin only)
   */
  unassignTemplateFromCompanies(templateId: string, companyIds: string[]): Observable<Template> {
    const currentUser = this.userService.getCurrentUser();

    if (!currentUser || currentUser.role !== 'super-admin') {
      return throwError(() => new Error('Only super-admins can unassign templates from companies'));
    }

    return this.getTemplateById(templateId).pipe(
      switchMap(template => {
        if (!template) {
          return throwError(() => new Error('Template not found'));
        }

        // Remove company assignments
        const updatedAssignedCompanies = (template.assignedCompanies || []).filter(
          (companyId: string) => !companyIds.includes(companyId)
        );

        const updatedTemplate: Template = {
          ...template,
          assignedCompanies: updatedAssignedCompanies,
          isCompanySpecific: updatedAssignedCompanies.length > 0,
          visibility: updatedAssignedCompanies.length > 0 ? 'company' : 'public'
        };

        return this.saveTemplate(updatedTemplate);
      })
    );
  }

  /**
   * Get all companies assigned to a template
   */
  getTemplateAssignments(templateId: string): Observable<string[]> {
    return this.getTemplateById(templateId).pipe(
      map(template => template?.assignedCompanies || [])
    );
  }

  /**
   * Search templates
   */
  searchTemplates(searchQuery: string): Observable<Template[]> {
    const query = searchQuery.toLowerCase();
    const templates = this.templatesSubject.value;
    const filtered = templates.filter(template =>
      template.name.toLowerCase().includes(query) ||
      template.formType.toLowerCase().includes(query) ||
      template.placeholders.some(p => p.toLowerCase().includes(query))
    );

    return of(filtered);
  }

  /**
   * Get available form types from existing templates
   */
  getAvailableFormTypes(): Observable<TemplateType[]> {
    const templates = this.templatesSubject.value;
    const formTypes = [...new Set(templates.map(template => template.formType))];
    return of(formTypes);
  }

  private loadTemplatesFromStorage(): void {
    // First try to migrate any existing localStorage data
    this.indexedDbService.migrateFromLocalStorage(this.STORAGE_KEY, this.indexedDbService.STORES.TEMPLATES).subscribe({
      next: () => {
        // After migration (or if no migration needed), load from IndexedDB
        this.loadFromIndexedDB();
      },
      error: (error) => {
        console.error('❌ Template migration failed, loading from IndexedDB anyway:', error);
        this.loadFromIndexedDB();
      }
    });
  }

  private loadFromIndexedDB(): void {
    this.indexedDbService.getAll<Template>(this.indexedDbService.STORES.TEMPLATES).subscribe({
      next: (items) => {
        const templates = items.map(item => this.migrateTemplate({
          ...item.data,
          uploadedAt: new Date(item.data.uploadedAt)
        }));
        this.templatesSubject.next(templates);
        console.log('✅ Loaded templates from IndexedDB:', templates.length);
      },
      error: (error) => {
        console.error('❌ Failed to load templates from IndexedDB:', error);
        // Fallback: keep empty array
        this.templatesSubject.next([]);
      }
    });
  }

  private generateTemplateId(): string {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getTemplateType(file: File): DocumentType {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'docx':
      case 'doc':
        return 'word';
      case 'gdoc':
        return 'google-docs';
      case 'odt':
        return 'odt';
      default:
        return 'word'; // Default fallback
    }
  }

  private extractPlaceholders(content: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      const placeholder = match[1].trim();
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return placeholders.sort();
  }

  /**
   * Migrate old template format to new format with company properties
   */
  private migrateTemplate(template: any): Template {
    return {
      ...template,
      // Add default values for new required properties if they don't exist
      isCompanySpecific: template.isCompanySpecific ?? false,
      visibility: template.visibility ?? 'public',
      // Ensure other optional properties exist
      companyId: template.companyId ?? undefined,
      assignedCompanies: template.assignedCompanies ?? undefined,
      createdBy: template.createdBy ?? undefined
    };
  }
}
