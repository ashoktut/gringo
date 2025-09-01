import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Template, TemplateType, DocumentType } from '../models/template.models';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateStorageService {
  private readonly STORAGE_KEY = 'pdf_templates';
  private templatesSubject = new BehaviorSubject<Template[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor(private indexedDbService: IndexedDbService) {
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
          isUniversal: isUniversal
        };

        this.saveTemplate(template).subscribe({
          next: (savedTemplate) => {
            observer.next(savedTemplate);
            observer.complete();
          },
          error: (error) => observer.error(error)
        });
      };

      reader.onerror = () => observer.error(reader.error);
      reader.readAsText(file);
    });
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
        const templates = items.map(item => ({
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
}
