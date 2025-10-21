import { Injectable } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { Template, TemplateUploadRequest, TemplateGenerationRequest, TemplateType, PdfGenerationOptions } from '../models/template.models';
import { TemplateStorageService } from './template-storage.service';
import { TemplateProcessingService } from './template-processing.service';
import { PdfGenerationService } from './pdf-generation.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateManagementService {

  constructor(
    private storageService: TemplateStorageService,
    private processingService: TemplateProcessingService,
    private pdfService: PdfGenerationService
  ) {}

  /**
   * Upload and process new template with enhanced binary support
   */
  uploadTemplate(request: TemplateUploadRequest): Observable<Template> {
    // Validate file first
    const validation = this.processingService.validateTemplateFile(request.file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Use the new company-aware upload method
    return this.storageService.uploadTemplateWithAssignment(request);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): Observable<Template[]> {
    return this.storageService.getAllTemplates();
  }

  /**
   * Get templates for specific form type
   */
  getTemplatesForForm(formType: string): Observable<Template[]> {
    return this.storageService.getTemplatesByFormType(formType);
  }

  /**
   * Get templates available to current user (company-aware)
   */
  getTemplatesForCurrentUser(): Observable<Template[]> {
    return this.storageService.getTemplatesForCurrentUser();
  }

  /**
   * Get templates for current user's company and form type
   */
  getTemplatesForCurrentUserAndForm(formType: string): Observable<Template[]> {
    return this.storageService.getTemplatesByCompanyAndFormType(formType);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): Observable<Template | null> {
    return this.storageService.getTemplateById(id);
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): Observable<boolean> {
    return this.storageService.deleteTemplate(id);
  }

  /**
   * Clone template for different form type
   */
  cloneTemplate(templateId: string, newFormType: TemplateType, newName?: string): Observable<Template> {
    return this.storageService.getTemplateById(templateId).pipe(
      switchMap(originalTemplate => {
        if (!originalTemplate) {
          throw new Error('Template not found');
        }

        const clonedTemplate = this.processingService.cloneTemplate(
          originalTemplate,
          newFormType,
          newName
        );

        return this.storageService.saveTemplate(clonedTemplate);
      })
    );
  }

  /**
   * Generate PDF from template with enhanced docx support
   */
  generatePdf(request: TemplateGenerationRequest): Observable<void> {
    return this.storageService.getTemplateById(request.templateId).pipe(
      switchMap(template => {
        if (!template) {
          throw new Error('Template not found');
        }

        // Enhanced generation options for docx processing
        const pdfOptions: PdfGenerationOptions = {
          filename: request.outputFilename,
          preserveWordFormatting: request.preserveFormatting ?? template.preserveFormatting,
          imageQuality: request.imageProcessing?.quality ?? 0.9,
          fontEmbedding: true
        };

        return this.pdfService.generatePdf(template, request.formData, pdfOptions);
      })
    );
  }

  /**
   * Test template with sample data
   */
  testTemplate(templateId: string, testData?: Record<string, any>): Observable<void> {
    return this.storageService.getTemplateById(templateId).pipe(
      switchMap(template => {
        if (!template) {
          throw new Error('Template not found');
        }

        if (testData) {
          return this.pdfService.generatePdf(template, testData);
        } else {
          return this.pdfService.previewTemplate(template);
        }
      })
    );
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Observable<Template[]> {
    return this.storageService.searchTemplates(query);
  }

  /**
   * Get available form types
   */
  getAvailableFormTypes(): Observable<TemplateType[]> {
    return this.storageService.getAvailableFormTypes();
  }

  /**
   * Get templates grouped by form type
   */
  getTemplatesGroupedByFormType(): Observable<Record<string, Template[]>> {
    return this.storageService.getAllTemplates().pipe(
      map(templates => {
        const grouped: Record<string, Template[]> = {};
        templates.forEach(template => {
          if (!grouped[template.formType]) {
            grouped[template.formType] = [];
          }
          grouped[template.formType].push(template);
        });
        return grouped;
      })
    );
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics(templateId: string): Observable<any> {
    return this.storageService.getTemplateById(templateId).pipe(
      map(template => {
        if (!template) {
          throw new Error('Template not found');
        }
        return this.processingService.getTemplateStatistics(template);
      })
    );
  }

  /**
   * Validate template placeholders
   */
  validateTemplatePlaceholders(templateId: string): Observable<{isValid: boolean; warnings: string[]}> {
    return this.storageService.getTemplateById(templateId).pipe(
      map(template => {
        if (!template) {
          throw new Error('Template not found');
        }
        return this.processingService.validatePlaceholders(template.placeholders);
      })
    );
  }

  /**
   * Update template metadata
   */
  updateTemplateMetadata(templateId: string, metadata: any): Observable<Template | null> {
    return this.storageService.updateTemplate(templateId, { metadata });
  }

  /**
   * Export template
   */
  exportTemplate(templateId: string): Observable<void> {
    return this.storageService.getTemplateById(templateId).pipe(
      map(template => {
        if (!template) {
          throw new Error('Template not found');
        }

        // Create download
        const blob = new Blob([template.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = template.name;
        link.click();
        window.URL.revokeObjectURL(url);
      })
    );
  }

  /**
   * Assignment Management Methods (Super-admin only)
   */
  assignTemplateToCompanies(templateId: string, companyIds: string[]): Observable<Template> {
    return this.storageService.assignTemplateToCompanies(templateId, companyIds);
  }

  unassignTemplateFromCompanies(templateId: string, companyIds: string[]): Observable<Template> {
    return this.storageService.unassignTemplateFromCompanies(templateId, companyIds);
  }

  getTemplateAssignments(templateId: string): Observable<string[]> {
    return this.storageService.getTemplateAssignments(templateId);
  }
}
