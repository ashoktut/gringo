import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Template, TemplateType } from '../models/template.models';

@Injectable({
  providedIn: 'root'
})
export class TemplateStorageService {
  private readonly STORAGE_KEY = 'pdf_templates';
  private templatesSubject = new BehaviorSubject<Template[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor() {
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
    
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    this.updateTemplatesAndSave(templates);
    return of(template);
  }

  /**
   * Delete template by ID
   */
  deleteTemplate(id: string): Observable<boolean> {
    const templates = this.templatesSubject.value;
    const filteredTemplates = templates.filter(t => t.id !== id);
    
    if (filteredTemplates.length !== templates.length) {
      this.updateTemplatesAndSave(filteredTemplates);
      return of(true);
    }
    
    return of(false);
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<Template>): Observable<Template | null> {
    const templates = this.templatesSubject.value;
    const templateIndex = templates.findIndex(t => t.id === id);
    
    if (templateIndex >= 0) {
      templates[templateIndex] = { ...templates[templateIndex], ...updates };
      this.updateTemplatesAndSave(templates);
      return of(templates[templateIndex]);
    }
    
    return of(null);
  }

  /**
   * Get available form types
   */
  getAvailableFormTypes(): Observable<TemplateType[]> {
    const templates = this.templatesSubject.value;
    const formTypes = [...new Set(templates.map(t => t.formType))];
    return of(formTypes.sort());
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Observable<Template[]> {
    const templates = this.templatesSubject.value;
    const searchQuery = query.toLowerCase();
    
    const filtered = templates.filter(template =>
      template.name.toLowerCase().includes(searchQuery) ||
      template.formType.toLowerCase().includes(searchQuery) ||
      template.placeholders.some(p => p.toLowerCase().includes(searchQuery))
    );
    
    return of(filtered);
  }

  private loadTemplatesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const templates = JSON.parse(stored).map((t: any) => ({
          ...t,
          uploadedAt: new Date(t.uploadedAt)
        }));
        this.templatesSubject.next(templates);
      }
    } catch (error) {
      console.error('Error loading templates from storage:', error);
      this.templatesSubject.next([]);
    }
  }

  private updateTemplatesAndSave(templates: Template[]): void {
    this.templatesSubject.next(templates);
    this.saveTemplatesToStorage(templates);
  }

  private saveTemplatesToStorage(templates: Template[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates to storage:', error);
    }
  }
}
