import { Injectable } from '@angular/core';

export interface Template {
  id: string;
  name: string;
  type: 'word' | 'google-docs' | 'odt';
  formType: string;
  content: string;
  placeholders: string[];
  size: number;
  uploadedAt: Date;
  isUniversal: boolean;
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

  constructor() {
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
            isUniversal: isUniversal
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
        fields[fieldKey] = this.formatFieldValue(value);
        fields[key] = this.formatFieldValue(value); // Also store without prefix for simple access
      }
    });

    return fields;
  }

  // Format field values for display
  private formatFieldValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }

  // Create HTML from template with all form data
  private createHtmlFromTemplate(template: Template, formFields: Record<string, any>, formType: string): string {
    let htmlContent = template.content;

    // Replace all placeholders with form data
    Object.keys(formFields).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = formFields[key];
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
        const value = formFields[key];
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
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.templates = JSON.parse(stored).map((t: any) => ({
        ...t,
        uploadedAt: new Date(t.uploadedAt)
      }));
    }
  }

  private saveTemplates(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.templates));
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
}
