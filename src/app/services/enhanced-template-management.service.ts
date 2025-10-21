import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, filter, switchMap, forkJoin, of } from 'rxjs';
import { TemplateConfiguration, TemplateCategory, FieldMapping } from '../interfaces/template-configuration.interface';
import { Template, TemplateUploadRequest, TemplateGenerationRequest, TemplateType, PdfGenerationOptions } from '../models/template.models';
import { CompanyTemplateAssignment } from '../models/user.models';
import { TemplateStorageService } from './template-storage.service';
import { TemplateProcessingService } from './template-processing.service';
import { PdfGenerationService } from './pdf-generation.service';
import { UserManagementService } from './user-management.service';

@Injectable({
  providedIn: 'root'
})
export class EnhancedTemplateManagementService {
  private readonly STORAGE_KEY = 'enhanced-template-configurations';
  private readonly CATEGORIES_KEY = 'template-categories';

  private templatesSubject = new BehaviorSubject<TemplateConfiguration[]>([]);
  private categoriesSubject = new BehaviorSubject<TemplateCategory[]>([]);
  private templateAssignmentsSubject = new BehaviorSubject<CompanyTemplateAssignment[]>([]);

  public templates$ = this.templatesSubject.asObservable();
  public categories$ = this.categoriesSubject.asObservable();
  public templateAssignments$ = this.templateAssignmentsSubject.asObservable();

  // Company-specific observables
  public companyTemplates$ = this.templates$.pipe(
    switchMap(() => this.getTemplatesForCurrentUser())
  );

  constructor(
    private storageService: TemplateStorageService,
    private processingService: TemplateProcessingService,
    private pdfService: PdfGenerationService,
    private userService: UserManagementService
  ) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    await this.loadTemplates();
    await this.loadCategories();
    this.loadAssignments();

    // Initialize with system templates if none exist
    if (this.templatesSubject.value.length === 0) {
      await this.createSystemTemplates();
    }
  }

  // ===== ENHANCED TEMPLATE CRUD OPERATIONS =====

  async saveTemplate(template: TemplateConfiguration): Promise<void> {
    try {
      const currentTemplates = this.templatesSubject.value;
      const existingIndex = currentTemplates.findIndex(t => t.id === template.id);

      // Update timestamps
      const now = new Date();
      if (existingIndex >= 0) {
        template.lastModified = now;
        currentTemplates[existingIndex] = { ...template };
      } else {
        template.createdDate = now;
        template.lastModified = now;
        template.id = template.id || this.generateTemplateId();
        currentTemplates.push(template);
      }

      await this.saveToStorage(currentTemplates);
      this.templatesSubject.next([...currentTemplates]);

    } catch (error) {
      console.error('Error saving template:', error);
      throw new Error('Failed to save template');
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const currentTemplates = this.templatesSubject.value;
      const filteredTemplates = currentTemplates.filter(t => t.id !== templateId);

      await this.saveToStorage(filteredTemplates);
      this.templatesSubject.next(filteredTemplates);

    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  async duplicateTemplate(templateId: string, newName?: string): Promise<TemplateConfiguration> {
    const originalTemplate = this.getTemplate(templateId);
    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    const duplicatedTemplate: TemplateConfiguration = {
      ...originalTemplate,
      id: this.generateTemplateId(),
      name: newName || `${originalTemplate.name} (Copy)`,
      createdDate: new Date(),
      lastModified: new Date(),
      isDefault: false, // Copies are never default
      version: '1.0'
    };

    await this.saveTemplate(duplicatedTemplate);
    return duplicatedTemplate;
  }

  // ===== COMPANY-SPECIFIC TEMPLATE MANAGEMENT =====

  getTemplate(templateId: string): TemplateConfiguration | undefined {
    const template = this.templatesSubject.value.find(t => t.id === templateId);

    // Check if user has access to this template
    if (template && !this.canUserAccessTemplate(template)) {
      return undefined;
    }

    return template;
  }

  getTemplatesForCurrentUser(): Observable<TemplateConfiguration[]> {
    return this.templates$.pipe(
      map(templates => {
        const currentUser = this.userService.getCurrentUser();
        const currentCompany = this.userService.getCurrentCompany();

        if (!currentUser) {
          return [];
        }

        // Super admin sees all templates
        if (currentUser.role === 'super-admin') {
          return templates;
        }

        // Company admin sees templates assigned to their company
        if (currentUser.role === 'company-admin' && currentCompany) {
          return templates.filter(template =>
            template.isGlobal ||
            template.assignedCompanies.includes(currentCompany.id) ||
            template.createdBy === currentUser.id
          );
        }

        return [];
      })
    );
  }

  getTemplatesForCompanyAndForm(companyId: string, formType: string): Observable<TemplateConfiguration[]> {
    // Check if user can access templates for this company
    if (!this.userService.canManageCompany(companyId)) {
      return of([]);
    }

    return this.getTemplatesForCurrentUser().pipe(
      map(templates => templates.filter(template =>
        template.isActive &&
        (template.isGlobal || template.assignedCompanies.includes(companyId)) &&
        (template.formTypes.length === 0 || template.formTypes.includes(formType))
      ))
    );
  }

  getTemplatesByCategory(categoryId: string): Observable<TemplateConfiguration[]> {
    return this.getTemplatesForCurrentUser().pipe(
      map(templates => templates.filter(t => t.tags.includes(categoryId)))
    );
  }

  async assignTemplateToCompany(templateId: string, companyId: string, formType: string): Promise<CompanyTemplateAssignment> {
    const currentUser = this.userService.getCurrentUser();

    if (!currentUser || !this.userService.hasPermission('templates', 'assign')) {
      throw new Error('Insufficient permissions to assign templates');
    }

    // Company admins can only assign to their own company
    if (currentUser.role === 'company-admin' && currentUser.companyId !== companyId) {
      throw new Error('Company admins can only assign templates to their own company');
    }

    const assignment: CompanyTemplateAssignment = {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      companyId,
      formType,
      assignedBy: currentUser.id,
      assignedAt: new Date(),
      isActive: true
    };

    // Update the template's assigned companies
    const template = this.getTemplate(templateId);
    if (template) {
      if (!template.assignedCompanies.includes(companyId)) {
        template.assignedCompanies.push(companyId);
        template.isCompanySpecific = true;
        template.lastModified = new Date();
        await this.saveTemplate(template);
      }
    }

    // Save the assignment
    const assignments = this.templateAssignmentsSubject.value;
    assignments.push(assignment);
    this.templateAssignmentsSubject.next(assignments);
    this.saveAssignments();

    return assignment;
  }

  async unassignTemplateFromCompany(templateId: string, companyId: string): Promise<void> {
    const currentUser = this.userService.getCurrentUser();

    if (!currentUser || !this.userService.hasPermission('templates', 'assign')) {
      throw new Error('Insufficient permissions to unassign templates');
    }

    // Company admins can only unassign from their own company
    if (currentUser.role === 'company-admin' && currentUser.companyId !== companyId) {
      throw new Error('Company admins can only unassign templates from their own company');
    }

    // Update template
    const template = this.getTemplate(templateId);
    if (template) {
      template.assignedCompanies = template.assignedCompanies.filter(id => id !== companyId);
      template.isCompanySpecific = template.assignedCompanies.length > 0;
      template.lastModified = new Date();
      await this.saveTemplate(template);
    }

    // Remove assignments
    const assignments = this.templateAssignmentsSubject.value;
    const updatedAssignments = assignments.filter(a =>
      !(a.templateId === templateId && a.companyId === companyId)
    );
    this.templateAssignmentsSubject.next(updatedAssignments);
    this.saveAssignments();
  }

  getTemplateAssignmentsForCompany(companyId: string): Observable<CompanyTemplateAssignment[]> {
    if (!this.userService.canManageCompany(companyId)) {
      return of([]);
    }

    return this.templateAssignments$.pipe(
      map(assignments => assignments.filter(a => a.companyId === companyId && a.isActive))
    );
  }

  private canUserAccessTemplate(template: TemplateConfiguration): boolean {
    const currentUser = this.userService.getCurrentUser();
    const currentCompany = this.userService.getCurrentCompany();

    if (!currentUser) {
      return false;
    }

    // Super admin can access all templates
    if (currentUser.role === 'super-admin') {
      return true;
    }

    // Company admin can access global templates and templates assigned to their company
    if (currentUser.role === 'company-admin' && currentCompany) {
      return template.isGlobal ||
             template.assignedCompanies.includes(currentCompany.id) ||
             template.createdBy === currentUser.id;
    }

    return false;
  }

  // ===== TEMPLATE ACTIVATION AND MANAGEMENT =====

  async toggleTemplateActivation(templateId: string): Promise<void> {
    const template = this.getTemplate(templateId);
    if (template) {
      template.isActive = !template.isActive;
      template.lastModified = new Date();
      await this.saveTemplate(template);
    }
  }

  async setDefaultTemplate(templateId: string, companyId?: string, formType?: string): Promise<void> {
    const templates = this.templatesSubject.value;

    // Remove default flag from other templates in the same scope
    templates.forEach(template => {
      if (template.isDefault &&
          (!companyId || template.assignedCompanies.includes(companyId)) &&
          (!formType || template.formTypes.includes(formType))) {
        template.isDefault = false;
      }
    });

    // Set new default
    const newDefaultTemplate = this.getTemplate(templateId);
    if (newDefaultTemplate) {
      newDefaultTemplate.isDefault = true;
      newDefaultTemplate.lastModified = new Date();
    }

    await this.saveToStorage(templates);
    this.templatesSubject.next([...templates]);
  }

  async removeTemplateFromCompany(templateId: string, companyId: string): Promise<void> {
    const template = this.getTemplate(templateId);
    if (template) {
      template.assignedCompanies = template.assignedCompanies.filter(id => id !== companyId);
      template.lastModified = new Date();
      await this.saveTemplate(template);
    }
  }

  // ===== TEMPLATE IMPORT/EXPORT =====

  async importLCPRoofingTemplate(companyId?: string, formTypes: string[] = ['rfq']): Promise<TemplateConfiguration> {
    const lcpTemplate: TemplateConfiguration = {
      id: this.generateTemplateId(),
      name: 'LCP Roofing Professional RFQ',
      description: 'Complete professional RFQ template with all sections for construction industry',
      templateType: 'html',
      htmlContent: await this.getLCPTemplateContent(),

      // Company assignments
      assignedCompanies: companyId ? [companyId] : [],
      formTypes: formTypes,
      isGlobal: !companyId,

      // Metadata
      createdDate: new Date(),
      lastModified: new Date(),
      version: '1.0',
      author: 'LCP Roofing',
      tags: ['construction', 'rfq', 'professional'],

      // PDF settings optimized for LCP template
      pdfSettings: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 60, bottom: 40, left: 20, right: 20 },
        scale: 1,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:8px;text-align:center;width:100%;">LCP Roofing RFQ</div>',
        footerTemplate: '<div style="font-size:8px;text-align:center;width:100%;">Page <span class="pageNumber"></span></div>',
        printBackground: true
      },

      // Field mappings from your comprehensive template
      fieldMappings: this.getLCPFieldMappings(),

      isActive: true,
      isDefault: !companyId,
      isSystemTemplate: true,

      // Sample data for testing
      sampleData: this.getLCPSampleData()
    };

    await this.saveTemplate(lcpTemplate);
    return lcpTemplate;
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return JSON.stringify(template, null, 2);
  }

  async importTemplate(templateJson: string): Promise<TemplateConfiguration> {
    try {
      const template: TemplateConfiguration = JSON.parse(templateJson);
      template.id = this.generateTemplateId(); // Generate new ID
      template.createdDate = new Date();
      template.lastModified = new Date();

      await this.saveTemplate(template);
      return template;

    } catch (error) {
      console.error('Error importing template:', error);
      throw new Error('Invalid template format');
    }
  }

  // ===== ENHANCED PDF GENERATION =====

  async generatePdfFromTemplate(
    templateId: string,
    formData: any,
    options?: Partial<PdfGenerationOptions>
  ): Promise<void> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Inject data into template
    const processedHtml = this.injectDataIntoTemplate(template, formData);

    // Prepare PDF options
    const pdfOptions: PdfGenerationOptions = {
      filename: options?.filename || `${template.name}_${Date.now()}.pdf`,
      preserveWordFormatting: options?.preserveWordFormatting ?? true,
      imageQuality: options?.imageQuality ?? 0.9,
      fontEmbedding: true,
      ...template.pdfSettings
    };

    // Generate PDF using the existing service
    const tempTemplate: Template = {
      id: template.id,
      name: template.name,
  type: template.templateType as import('../models/template.models').DocumentType || 'html',
      formType: template.formTypes[0] as TemplateType || 'rfq',
      content: processedHtml,
      placeholders: template.fieldMappings.map(m => m.placeholder),
      size: processedHtml.length,
      uploadedAt: template.createdDate || new Date(),
      isUniversal: template.isGlobal || false,
      preserveFormatting: true,
      // New properties required by Template type
      isCompanySpecific: template.assignedCompanies && template.assignedCompanies.length > 0,
      visibility: template.isGlobal ? 'public' : 'private',
      metadata: {
        author: template.author,
        version: template.version,
        tags: template.tags
      }
    };

    return this.pdfService.generatePdf(tempTemplate, formData, pdfOptions).toPromise();
  }

  // ===== DATA INJECTION AND PROCESSING =====

  injectDataIntoTemplate(template: TemplateConfiguration, data: any): string {
    if (!template.htmlContent) {
      throw new Error('Template has no HTML content');
    }

    let processedHtml = template.htmlContent;

    // Process field mappings
    template.fieldMappings.forEach(mapping => {
      const value = this.getFieldValue(data, mapping.fieldName, mapping);
      const regex = new RegExp(`\\{\\{${mapping.placeholder}\\}\\}`, 'g');
      processedHtml = processedHtml.replace(regex, value);
    });

    // Process system placeholders
    processedHtml = this.injectSystemPlaceholders(processedHtml, data);

    return processedHtml;
  }

  // ===== TEMPLATE VALIDATION AND TESTING =====

  validateTemplate(template: TemplateConfiguration): {isValid: boolean; errors: string[]} {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.htmlContent || template.htmlContent.trim().length === 0) {
      errors.push('Template content is required');
    }

    if (template.fieldMappings.length === 0) {
      errors.push('Template must have at least one field mapping');
    }

    // Validate field mappings
    template.fieldMappings.forEach((mapping, index) => {
      if (!mapping.fieldName || !mapping.placeholder) {
        errors.push(`Field mapping ${index + 1} is incomplete`);
      }
    });

    // Validate placeholder usage in template
    if (template.htmlContent) {
      const usedPlaceholders = this.extractPlaceholdersFromHtml(template.htmlContent);
      const definedPlaceholders = template.fieldMappings.map(m => m.placeholder);

      usedPlaceholders.forEach(placeholder => {
        if (!definedPlaceholders.includes(placeholder) && !this.isSystemPlaceholder(placeholder)) {
          errors.push(`Undefined placeholder found: {{${placeholder}}}`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  async testTemplate(templateId: string, testData?: any): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const dataToUse = testData || template.sampleData || this.getLCPSampleData();
    return this.injectDataIntoTemplate(template, dataToUse);
  }

  // ===== HELPER METHODS =====

  private async getLCPTemplateContent(): Promise<string> {
    // Load and return your complete LCP template HTML
    try {
      const response = await fetch('assets/pdf-template.html');
      if (response.ok) {
        return await response.text();
      } else {
        // Fallback to embedded template
        return this.getEmbeddedLCPTemplate();
      }
    } catch (error) {
      console.error('Error loading LCP template:', error);
      return this.getEmbeddedLCPTemplate();
    }
  }

  private getEmbeddedLCPTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Request for Quote - {{companyName}}</title>
  <style>
    /* LCP Roofing Professional Styles */
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20mm;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #0b7ad4;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .company-logo {
      color: #0b7ad4;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .document-title {
      font-size: 28px;
      color: #2c3e50;
      margin: 10px 0;
      font-weight: 700;
    }

    .document-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #0b7ad4;
    }

    .section {
      margin: 25px 0;
      padding: 20px;
      background: #fff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .section-title {
      color: #0b7ad4;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      border-bottom: 2px solid #0b7ad4;
      padding-bottom: 5px;
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }

    .field-row {
      display: flex;
      margin: 10px 0;
      align-items: center;
    }

    .field-label {
      font-weight: bold;
      min-width: 140px;
      color: #495057;
      font-size: 14px;
    }

    .field-value {
      background: #e3f2fd;
      padding: 8px 12px;
      border-radius: 4px;
      flex: 1;
      margin-left: 10px;
      border: 1px solid #bbdefb;
    }

    .image-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .image-placeholder {
      border: 2px dashed #0b7ad4;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 8px;
      color: #6c757d;
      font-size: 14px;
    }

    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
      padding-top: 20px;
    }

    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
    }

    .signature-box {
      border: 1px solid #dee2e6;
      padding: 20px;
      text-align: center;
      background: #f8f9fa;
      border-radius: 8px;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-logo">{{companyName}}</div>
    <h1 class="document-title">Request for Quote</h1>
    <p>Professional Construction Services</p>
    <p>Generated on {{currentDate}} at {{currentTime}}</p>
  </div>

  <div class="document-info">
    <h3>Document Information</h3>
    <div class="field-grid">
      <div class="field-row">
        <span class="field-label">Submission ID:</span>
        <span class="field-value">{{submissionId}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Date Submitted:</span>
        <span class="field-value">{{dateSubmitted}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Representative:</span>
        <span class="field-value">{{repName}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">ABK Reference:</span>
        <span class="field-value">{{abk}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Project Information</h2>
    <div class="field-grid">
      <div class="field-row">
        <span class="field-label">Stand Number:</span>
        <span class="field-value">{{standNum}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Client Name:</span>
        <span class="field-value">{{clientName}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Client Email:</span>
        <span class="field-value">{{clientEmail}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Client Phone:</span>
        <span class="field-value">{{clientPhone}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Building Type:</span>
        <span class="field-value">{{buildingType}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Municipality:</span>
        <span class="field-value">{{municipality}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Design Information</h2>
    <div class="field-grid">
      <div class="field-row">
        <span class="field-label">Gate Access:</span>
        <span class="field-value">{{gateAccess}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Structure Type:</span>
        <span class="field-value">{{structureType}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Main Pitch:</span>
        <span class="field-value">{{mainPitch}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Service Type:</span>
        <span class="field-value">{{serviceType}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Roof Covering Details</h2>
    <div class="field-grid">
      <div class="field-row">
        <span class="field-label">Cover Required:</span>
        <span class="field-value">{{coverReq}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Cover Type:</span>
        <span class="field-value">{{coverType}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Tile Profile:</span>
        <span class="field-value">{{tileProfile}}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Tile Colour:</span>
        <span class="field-value">{{tileColour}}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Project Images</h2>
    <div class="image-section">
      <div class="image-placeholder">
        {{drawingPhoto1 || 'Drawing Photo 1'}}
      </div>
      <div class="image-placeholder">
        {{drawingPhoto2 || 'Drawing Photo 2'}}
      </div>
      <div class="image-placeholder">
        {{drawingPhoto3 || 'Drawing Photo 3'}}
      </div>
      <div class="image-placeholder">
        {{drawingPhoto4 || 'Drawing Photo 4'}}
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">General Notes</h2>
    <div class="field-row">
      <span class="field-value" style="margin-left: 0; min-height: 80px; padding: 15px;">
        {{generalNotes || 'No additional notes provided.'}}
      </span>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <h4>Representative Signature</h4>
      <div style="height: 60px; margin: 15px 0;">
        {{repSign || '[Signature Required]'}}
      </div>
      <p>{{repName}}</p>
      <p>Date: {{currentDate}}</p>
    </div>
    <div class="signature-box">
      <h4>Client Signature</h4>
      <div style="height: 60px; margin: 15px 0;">
        [Client Signature]
      </div>
      <p>{{clientName}}</p>
      <p>Date: _____________</p>
    </div>
  </div>

  <div class="footer">
    <p>This document was automatically generated from {{companyName}} RFQ template</p>
    <p>{{companyName}} - Professional Construction Services</p>
    <p>Generated: {{currentDate}} | Submission ID: {{submissionId}}</p>
  </div>
</body>
</html>`;
  }

  private getLCPFieldMappings(): FieldMapping[] {
    return [
      // Project Information
      { fieldName: 'standNum', placeholder: 'standNum', dataType: 'text', isRequired: true },
      { fieldName: 'companyName', placeholder: 'companyName', dataType: 'text', isRequired: true },
      { fieldName: 'clientName', placeholder: 'clientName', dataType: 'text', isRequired: true },
      { fieldName: 'clientEmail', placeholder: 'clientEmail', dataType: 'text', isRequired: true },
      { fieldName: 'clientPhone', placeholder: 'clientPhone', dataType: 'text', isRequired: false },
      { fieldName: 'buildingType', placeholder: 'buildingType', dataType: 'text', isRequired: false },
      { fieldName: 'municipality', placeholder: 'municipality', dataType: 'text', isRequired: false },

      // Quote Details
      { fieldName: 'dateSubmitted', placeholder: 'dateSubmitted', dataType: 'date', isRequired: true, formatter: 'date:short' },
      { fieldName: 'repName', placeholder: 'repName', dataType: 'text', isRequired: true },
      { fieldName: 'abk', placeholder: 'abk', dataType: 'text', isRequired: false },
      { fieldName: 'dateDue', placeholder: 'dateDue', dataType: 'date', isRequired: false, formatter: 'date:short' },

      // Design Information
      { fieldName: 'gateAccess', placeholder: 'gateAccess', dataType: 'text', isRequired: false },
      { fieldName: 'structureType', placeholder: 'structureType', dataType: 'text', isRequired: false },
      { fieldName: 'mainPitch', placeholder: 'mainPitch', dataType: 'text', isRequired: false },
      { fieldName: 'serviceType', placeholder: 'serviceType', dataType: 'text', isRequired: false },

      // Roof Covering
      { fieldName: 'coverReq', placeholder: 'coverReq', dataType: 'text', isRequired: false },
      { fieldName: 'coverType', placeholder: 'coverType', dataType: 'text', isRequired: false },
      { fieldName: 'tileProfile', placeholder: 'tileProfile', dataType: 'text', isRequired: false },
      { fieldName: 'tileColour', placeholder: 'tileColour', dataType: 'text', isRequired: false },

      // Images
      { fieldName: 'drawingPhoto1', placeholder: 'drawingPhoto1', dataType: 'image', isRequired: false },
      { fieldName: 'drawingPhoto2', placeholder: 'drawingPhoto2', dataType: 'image', isRequired: false },
      { fieldName: 'drawingPhoto3', placeholder: 'drawingPhoto3', dataType: 'image', isRequired: false },
      { fieldName: 'drawingPhoto4', placeholder: 'drawingPhoto4', dataType: 'image', isRequired: false },
      { fieldName: 'drawingPhoto5', placeholder: 'drawingPhoto5', dataType: 'image', isRequired: false },

      // Notes and Signatures
      { fieldName: 'generalNotes', placeholder: 'generalNotes', dataType: 'text', isRequired: false },
      { fieldName: 'repSign', placeholder: 'repSign', dataType: 'image', isRequired: false }
    ];
  }

  private getLCPSampleData(): any {
    return {
      // Project Information
      standNum: 'Stand 123, Sample Street, Johannesburg, 2000',
      companyName: 'Demo Construction Company',
      clientName: 'John Doe',
      clientEmail: 'john.doe@email.com',
      clientPhone: '+27 11 123 4567',
      buildingType: 'Residential House',
      municipality: 'City of Johannesburg',

      // Quote Details
      dateSubmitted: new Date().toISOString(),
      repName: 'Sample Representative',
      abk: 'ABK-001-2025',
      dateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),

      // Design Information
      gateAccess: 'Standard vehicle access available',
      structureType: 'Residential single-story house',
      mainPitch: '22 degrees',
      serviceType: 'Full roofing service with trusses',

      // Roof Covering
      coverReq: 'Yes - full roof covering required',
      coverType: 'Concrete tiles',
      tileProfile: 'Marseilles profile',
      tileColour: 'Charcoal Grey',

      // Notes
      generalNotes: 'This is a sample RFQ generated for demonstration purposes. Client requires completion before rainy season. Eco-friendly materials preferred where possible.',

      // System fields
      submissionId: 'RFQ-' + Date.now(),
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
      repSign: '[Digital Signature Required]'
    };
  }

  private getFieldValue(data: any, fieldName: string, mapping: FieldMapping): string {
    const value = this.getNestedValue(data, fieldName) || mapping.defaultValue || '';

    // Apply formatting
    if (mapping.formatter && value) {
      return this.formatValue(value, mapping.formatter, mapping.dataType);
    }

    return String(value);
  }

  private formatValue(value: any, formatter: string, dataType: string): string {
    switch (formatter) {
      case 'currency':
        return new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR'
        }).format(Number(value));

      case 'date:short':
        return new Date(value).toLocaleDateString();

      case 'date:long':
        return new Date(value).toLocaleDateString('en-ZA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      default:
        return String(value);
    }
  }

  private injectSystemPlaceholders(html: string, data: any): string {
    const systemPlaceholders = {
      '{{currentDate}}': new Date().toLocaleDateString(),
      '{{currentTime}}': new Date().toLocaleTimeString(),
      '{{submissionId}}': data.submissionId || this.generateSubmissionId(),
      '{{pageNumber}}': '<span class="pageNumber"></span>'
    };

    Object.entries(systemPlaceholders).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      html = html.replace(regex, value);
    });

    return html;
  }

  private extractPlaceholdersFromHtml(html: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(html)) !== null) {
      placeholders.push(match[1]);
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }

  private isSystemPlaceholder(placeholder: string): boolean {
    const systemPlaceholders = ['currentDate', 'currentTime', 'submissionId', 'pageNumber'];
    return systemPlaceholders.includes(placeholder);
  }

  private generateTemplateId(): string {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateSubmissionId(): string {
    return 'SUB_' + Date.now();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async loadTemplates(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.templatesSubject.next(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  private async saveToStorage(templates: TemplateConfiguration[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.CATEGORIES_KEY);
      if (stored) {
        this.categoriesSubject.next(JSON.parse(stored));
      } else {
        await this.createDefaultCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  private async createDefaultCategories(): Promise<void> {
    const defaultCategories: TemplateCategory[] = [
      {
        id: 'construction',
        name: 'Construction',
        description: 'Templates for construction industry',
        icon: 'construction',
        templates: []
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Medical and healthcare templates',
        icon: 'local_hospital',
        templates: []
      },
      {
        id: 'general',
        name: 'General Business',
        description: 'General business templates',
        icon: 'business',
        templates: []
      }
    ];

    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(defaultCategories));
    this.categoriesSubject.next(defaultCategories);
  }

  private async createSystemTemplates(): Promise<void> {
    // Create the LCP template as a system template
    await this.importLCPRoofingTemplate();
  }

  // ===== TEMPLATE ASSIGNMENT STORAGE =====

  private loadAssignments(): void {
    const stored = localStorage.getItem('template-assignments');
    if (stored) {
      try {
        const assignments = JSON.parse(stored).map((a: any) => ({
          ...a,
          assignedAt: new Date(a.assignedAt)
        }));
        this.templateAssignmentsSubject.next(assignments);
      } catch (error) {
        console.error('Failed to load template assignments:', error);
      }
    }
  }

  private saveAssignments(): void {
    localStorage.setItem('template-assignments', JSON.stringify(this.templateAssignmentsSubject.value));
  }
}
