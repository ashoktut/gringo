import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';

export interface Template {
  id: string;
  name: string;
  type: 'word' | 'google-docs' | 'odt' | 'html' | 'custom';
  formType: string;
  content: string;
  placeholders: string[];
  size: number;
  uploadedAt: Date;
  isUniversal: boolean;
  // NEW: Enterprise features
  companyId?: string;
  version: string;
  description?: string;
  previewUrl?: string;
  metadata: {
    createdBy: string;
    lastModified: Date;
    downloadCount: number;
    isActive: boolean;
  };
  // NEW: Support for new form structure
  sectionMappings?: SectionMapping[];
  fieldMappings?: FieldMapping[];
  pdfOptions?: PDFGenerationOptions;
}

export interface SectionMapping {
  sectionId: string;
  templateSection: string;
  includeInPDF: boolean;
  pageBreakBefore?: boolean;
}

export interface FieldMapping {
  fieldName: string;
  templatePlaceholder: string;
  fieldType: string;
  formatOptions?: any;
}

export interface PDFGenerationOptions {
  orientation: 'portrait' | 'landscape';
  format: 'a4' | 'letter' | 'legal';
  margins: { top: number; right: number; bottom: number; left: number; };
  includeSignatures: boolean;
  includePictures: boolean;
  includeMapSnapshots: boolean;
  watermark?: string;
}

export interface FormField {
  key: string;
  label: string;
  value: any;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfTemplateService {
  private templates: Template[] = [];
  private readonly STORAGE_KEY = 'pdf_templates';

  constructor(private indexedDbService: IndexedDbService) {
    this.loadTemplates();
  }

  // Get templates for specific form type or universal templates
  getTemplatesForForm(formType: string): Template[] {
    return this.templates.filter(template =>
      template.formType === formType || template.isUniversal
    );
  }

  // Get all templates regardless of form type
  getAllTemplates(): Template[] {
    return this.templates;
  }

  // Get templates grouped by form type
  getTemplatesByFormType(): Record<string, Template[]> {
    const grouped: Record<string, Template[]> = {};
    this.templates.forEach(template => {
      if (!grouped[template.formType]) {
        grouped[template.formType] = [];
      }
      grouped[template.formType].push(template);
    });
    return grouped;
  }

  // Upload template with form type specification
  uploadTemplate(
    file: File,
    formType: string,
    isUniversal: boolean = false
  ): Promise<Template> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const template: Template = {
            id: this.generateTemplateId(),
            name: file.name,
            type: this.getTemplateType(file),
            formType: formType,
            content: content,
            placeholders: this.extractPlaceholders(content),
            size: file.size,
            uploadedAt: new Date(),
            isUniversal: isUniversal,
            version: '1.0.0',
            metadata: {
              createdBy: 'system',
              lastModified: new Date(),
              downloadCount: 0,
              isActive: true
            }
          };

          this.templates.push(template);
          this.saveTemplates();
          resolve(template);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Generate PDF for any form type with dynamic field mapping
  generatePdf(templateId: string, formData: any, formType: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Extract ALL form fields dynamically
    const allFormFields = this.extractAllFormFields(formData);

    // Create comprehensive HTML with all data
    const htmlContent = this.createHtmlFromTemplate(template, allFormFields, formType);

    // Generate PDF
    this.printToPdf(htmlContent, `${formType}-${formData.submissionId || 'document'}.pdf`);
  }

  // Extract all form fields recursively (handles nested objects)
  private extractAllFormFields(data: any, prefix: string = ''): Record<string, any> {
    const fields: Record<string, any> = {};

    if (!data || typeof data !== 'object') {
      return fields;
    }

    Object.keys(data).forEach(key => {
      const value = data[key];
      const fieldKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively extract nested object fields
        Object.assign(fields, this.extractAllFormFields(value, fieldKey));
      } else {
        // Store the field value
        fields[fieldKey] = this.formatFieldValue({ type: 'text' }, value);
        fields[key] = this.formatFieldValue({ type: 'text' }, value); // Also store without prefix for simple access
      }
    });

    return fields;
  }

  // Create HTML from template with all form data
  private createHtmlFromTemplate(template: Template, formFields: Record<string, any>, formType: string): string {
    let htmlContent = template.content;

    // Replace all placeholders with form data, rendering images as <img> tags
    Object.keys(formFields).forEach(key => {
      const placeholder = `{{${key}}}`;
      let value = formFields[key];
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        value = `<img src="${value}" alt="${key}" style="max-width: 400px; max-height: 200px; display: block; margin: 8px 0;" />`;
      }
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Add comprehensive data table if template supports it
    if (htmlContent.includes('{{ALL_FORM_DATA}}')) {
      const dataTable = this.createCompleteDataTable(formFields, formType);
      htmlContent = htmlContent.replace(/\{\{ALL_FORM_DATA\}\}/g, dataTable);
    }

    return this.wrapInPrintableHtml(htmlContent, formType);
  }

  // Create a complete data table showing all form fields
  private createCompleteDataTable(formFields: Record<string, any>, formType: string): string {
    const rows = Object.keys(formFields)
      .filter(key => !key.includes('.')) // Exclude nested field duplicates
      .map(key => {
        const label = this.formatFieldLabel(key);
        let value = formFields[key];
        if (typeof value === 'string' && value.startsWith('data:image/')) {
          value = `<img src="${value}" alt="${key}" style="max-width: 200px; max-height: 100px; display: block;" />`;
        }
        return `
          <tr>
            <td style="font-weight: bold; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">${label}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `;
      }).join('');

    return `
      <div style="margin: 20px 0;">
        <h3 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 5px;">${formType.toUpperCase()} Form Data</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #1976d2; color: white;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left; width: 30%;">Field</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Convert camelCase to readable labels
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Get form types that have templates
  getAvailableFormTypes(): string[] {
    const formTypes = [...new Set(this.templates.map(t => t.formType))];
    return formTypes.sort();
  }

  // Clone template for different form type
  cloneTemplateForForm(templateId: string, newFormType: string, newName?: string): Template {
    const original = this.templates.find(t => t.id === templateId);
    if (!original) {
      throw new Error('Original template not found');
    }

    const cloned: Template = {
      ...original,
      id: this.generateTemplateId(),
      name: newName || `${original.name} (${newFormType})`,
      formType: newFormType,
      uploadedAt: new Date()
    };

    this.templates.push(cloned);
    this.saveTemplates();
    return cloned;
  }

  // Get template by ID
  getTemplate(templateId: string): Template | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  // Delete template
  deleteTemplate(templateId: string): void {
    this.templates = this.templates.filter(t => t.id !== templateId);
    this.saveTemplates();
  }

  // Get available placeholders for a form type
  getAvailablePlaceholders(formType: string): string[] {
    const templates = this.getTemplatesForForm(formType);
    const allPlaceholders = new Set<string>();

    templates.forEach(template => {
      template.placeholders.forEach(placeholder => {
        allPlaceholders.add(placeholder);
      });
    });

    return Array.from(allPlaceholders).sort();
  }

  private loadTemplates(): void {
    // First try to migrate any existing localStorage data
    this.indexedDbService.migrateFromLocalStorage(this.STORAGE_KEY, this.indexedDbService.STORES.PDF_TEMPLATES).subscribe({
      next: () => {
        // After migration (or if no migration needed), load from IndexedDB
        this.loadFromIndexedDB();
      },
      error: (error) => {
        console.error('❌ PDF template migration failed, loading from IndexedDB anyway:', error);
        this.loadFromIndexedDB();
      }
    });
  }

  private loadFromIndexedDB(): void {
    this.indexedDbService.getAll<Template>(this.indexedDbService.STORES.PDF_TEMPLATES).subscribe({
      next: (items) => {
        this.templates = items.map(item => ({
          ...item.data,
          uploadedAt: new Date(item.data.uploadedAt)
        }));
        console.log('✅ Loaded PDF templates from IndexedDB:', this.templates.length);
      },
      error: (error) => {
        console.error('❌ Failed to load PDF templates from IndexedDB:', error);
        // Fallback: keep empty array
        this.templates = [];
      }
    });
  }

  private saveTemplates(): void {
    const itemsToSave = this.templates.map(template => ({
      id: template.id,
      data: template
    }));

    this.indexedDbService.saveAll(this.indexedDbService.STORES.PDF_TEMPLATES, itemsToSave).subscribe({
      next: () => {
        console.log('✅ PDF templates saved to IndexedDB');
      },
      error: (error) => {
        console.error('❌ Failed to save PDF templates to IndexedDB:', error);
      }
    });
  }

  private generateTemplateId(): string {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getTemplateType(file: File): 'word' | 'google-docs' | 'odt' {
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
        return 'word';
    }
  }

  private extractPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)];
  }

  private printToPdf(htmlContent: string, filename: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    // Add a small delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  private wrapInPrintableHtml(content: string, formType: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formType.toUpperCase()} Document - ${new Date().toLocaleDateString()}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #000; }
              .no-print { display: none; }
              table { page-break-inside: avoid; }
              h1, h2, h3 { page-break-after: avoid; color: #000; }
              @page { margin: 20mm; }
            }
            body {
              margin: 20px;
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 12px;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border: 1px solid #ddd;
              vertical-align: top;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            h1, h2, h3 {
              color: #1976d2;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 20px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${formType.toUpperCase()} Document</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          ${content}

          <div class="footer">
            <p>This document was automatically generated from ${formType.toUpperCase()} form submission.</p>
          </div>
        </body>
      </html>
    `;
  }

  // NEW: Enterprise methods for new architecture

  /**
   * Get templates for specific company and form type
   */
  getTemplatesForCompany(companyId: string, formType?: string): Template[] {
    return this.templates.filter(template =>
      (template.companyId === companyId || template.isUniversal) &&
      (!formType || template.formType === formType || template.isUniversal)
    );
  }

  /**
   * Generate PDF from new FormConfiguration structure
   */
  async generateFromFormConfiguration(
    templateId: string,
    formData: any,
    formConfig: any,
    options?: PDFGenerationOptions
  ): Promise<Blob> {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Process sections-based form data
    const processedData = this.processFormSections(formData, formConfig, template);

    // Use existing PDF generation with enhanced data
    return this.generatePdfBlob(template, processedData, options);
  }

  /**
   * Process sections-based form data for PDF generation
   */
  private processFormSections(formData: any, formConfig: any, template: Template): any {
    const processedData: any = { ...formData };

    // Add section-specific data
    if (formConfig.sections) {
      formConfig.sections.forEach((section: any) => {
        const sectionData: any = {};

        section.fields.forEach((field: any) => {
          const fieldValue = formData[field.name];

          // Handle special field types for PDF
          switch (field.type) {
            case 'signature':
              sectionData[field.name] = fieldValue ? '[Digital Signature]' : '[Not Signed]';
              if (fieldValue?.dataUrl) {
                sectionData[field.name + '_image'] = fieldValue.dataUrl;
              }
              break;

            case 'picture':
              sectionData[field.name] = fieldValue ? '[Image Attached]' : '[No Image]';
              if (fieldValue?.dataUrl) {
                sectionData[field.name + '_image'] = fieldValue.dataUrl;
              }
              break;

            case 'map':
              if (fieldValue?.lat && fieldValue?.lng) {
                sectionData[field.name] = `Lat: ${fieldValue.lat}, Lng: ${fieldValue.lng}`;
                sectionData[field.name + '_coordinates'] = fieldValue;
              } else {
                sectionData[field.name] = '[Location Not Selected]';
              }
              break;

            default:
              sectionData[field.name] = this.formatFieldValue(field, fieldValue);
          }
        });

        processedData[section.id + '_section'] = sectionData;
        processedData[section.id + '_title'] = section.title;
      });
    }

    return processedData;
  }

  /**
   * Format field values for PDF display
   */
  private formatFieldValue(field: any, value: any): string {
    if (value === null || value === undefined) return '';

    switch (field.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'email':
        return value || '';
      case 'number':
        return value ? value.toString() : '';
      case 'select':
      case 'radio':
        return value || '';
      case 'checkbox':
        return value ? 'Yes' : 'No';
      default:
        return value?.toString() || '';
    }
  }

  /**
   * Generate PDF blob (enhanced version of existing method)
   */
  private async generatePdfBlob(
    template: Template,
    data: any,
    options?: PDFGenerationOptions
  ): Promise<Blob> {
    // Use your existing PDF generation logic but with enhanced data
    const processedContent = this.createHtmlFromTemplate(template, data, template.formType);

    // Convert to PDF using your existing PdfGenerationService
    const pdfBlob = await this.convertToPdf(processedContent, options || template.pdfOptions);

    // Update template metadata
    this.updateTemplateUsage(template.id);

    return pdfBlob;
  }

  /**
   * Update template usage statistics
   */
  private updateTemplateUsage(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template && template.metadata) {
      template.metadata.downloadCount = (template.metadata.downloadCount || 0) + 1;
      template.metadata.lastModified = new Date();
      this.saveTemplates();
    }
  }

  /**
   * Convert processed content to PDF (integrate with existing services)
   */
  private async convertToPdf(content: string, options?: PDFGenerationOptions): Promise<Blob> {
    // This would integrate with your existing PdfGenerationService
    // For now, return a placeholder - you'd inject PdfGenerationService here
    return new Promise((resolve) => {
      // Use your existing html2pdf integration from PdfGenerationService
      setTimeout(() => {
        resolve(new Blob(['PDF content'], { type: 'application/pdf' }));
      }, 1000);
    });
  }
}
