import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TemplateConfiguration } from '../interfaces/template-configuration.interface';
import { Template, PdfGenerationOptions } from '../models/template.models';
import { EnhancedTemplateManagementService } from './enhanced-template-management.service';
import { DocxProcessingService } from './docx-processing.service';

declare global {
  interface Window {
    html2pdf: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedPdfGenerationService {
  private pdfLibraryLoaded = false;
  private readonly libraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

  constructor(
    private templateService: EnhancedTemplateManagementService,
    private docxProcessor: DocxProcessingService
  ) {
    this.ensurePdfLibraryLoaded();
  }

  // ===== MAIN PDF GENERATION METHODS =====

  /**
   * Generate PDF from template configuration (NEW APPROACH)
   */
  generateFromTemplate(
    templateId: string,
    formData: any,
    options?: Partial<PdfGenerationOptions>
  ): Observable<void> {
    return from(this.generateFromTemplateAsync(templateId, formData, options));
  }

  /**
   * Generate PDF from HTML element (LEGACY SUPPORT)
   */
  generateFromElement(
    element: HTMLElement,
    filename: string,
    options?: any
  ): Observable<void> {
    return from(this.generateFromElementAsync(element, filename, options));
  }

  /**
   * Generate PDF from HTML string (UTILITY METHOD)
   */
  generateFromHtml(
    htmlContent: string,
    filename: string,
    options?: any
  ): Observable<void> {
    return from(this.generateFromHtmlAsync(htmlContent, filename, options));
  }

  /**
   * Preview template without downloading (NEW FEATURE)
   */
  previewTemplate(
    templateId: string,
    formData?: any
  ): Observable<void> {
    return from(this.previewTemplateAsync(templateId, formData));
  }

  /**
   * Generate PDF as blob for further processing (UTILITY)
   */
  generateAsBlob(
    templateId: string,
    formData: any,
    options?: Partial<PdfGenerationOptions>
  ): Observable<Blob> {
    return from(this.generateAsBlobAsync(templateId, formData, options));
  }

  // ===== LEGACY SUPPORT METHODS =====

  /**
   * Legacy method for backward compatibility with existing code
   */
  generatePdf(
    template: Template,
    formData: any,
    options?: PdfGenerationOptions
  ): Observable<void> {
    return from(this.generatePdfLegacyAsync(template, formData, options));
  }

  /**
   * Legacy method with page numbers support
   */
  generatePdfWithPageNumbers(
    element: HTMLElement,
    filename: string,
    options?: any
  ): void {
    this.generateFromElementAsync(element, filename, {
      ...options,
      pageNumbers: true
    }).catch(error => {
      console.error('PDF generation error:', error);
    });
  }

  // ===== PRIVATE ASYNC IMPLEMENTATIONS =====

  private async generateFromTemplateAsync(
    templateId: string,
    formData: any,
    options?: Partial<PdfGenerationOptions>
  ): Promise<void> {
    await this.ensurePdfLibraryLoaded();

    const template = this.templateService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Validate template and data
    const validation = this.validateGenerationRequirements(template, formData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    // Inject data into template
    const processedHtml = this.injectDataIntoTemplate(template, formData);

    // Prepare PDF options
    const pdfOptions = this.preparePdfOptions(template, options);

    // Generate PDF
    await this.generateFromHtml(processedHtml, pdfOptions);
  }

  private async generateFromElementAsync(
    element: HTMLElement,
    filename: string,
    options?: any
  ): Promise<void> {
    await this.ensurePdfLibraryLoaded();

    const defaultOptions = this.getDefaultElementOptions(filename, options);

    // Add page numbers if requested
    if (options?.pageNumbers) {
      this.addPageNumbers(element);
    }

    // Generate PDF
    await window.html2pdf()
      .from(element)
      .set(defaultOptions)
      .save();
  }

  private async generateFromHtmlAsync(
    htmlContent: string,
    filename: string,
    options?: any
  ): Promise<void> {
    await this.ensurePdfLibraryLoaded();

    // Create temporary container
    const container = this.createTempContainer(htmlContent);
    document.body.appendChild(container);

    try {
      const pdfOptions = this.getDefaultHtmlOptions(filename, options);

      await window.html2pdf()
        .from(container)
        .set(pdfOptions)
        .save();
    } finally {
      // Cleanup
      document.body.removeChild(container);
    }
  }

  private async previewTemplateAsync(
    templateId: string,
    formData?: any
  ): Promise<void> {
    const template = this.templateService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Use sample data if no form data provided
    const dataToUse = formData || template.sampleData || this.getDefaultSampleData();

    // Inject data into template
    const processedHtml = this.injectDataIntoTemplate(template, dataToUse);

    // Create preview HTML
    const previewHtml = this.createPreviewHtml(processedHtml, template.name);

    // Open in new window
    const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (previewWindow) {
      previewWindow.document.write(previewHtml);
      previewWindow.document.close();
    } else {
      throw new Error('Unable to open preview window. Please check popup blockers.');
    }
  }

  private async generateAsBlobAsync(
    templateId: string,
    formData: any,
    options?: Partial<PdfGenerationOptions>
  ): Promise<Blob> {
    await this.ensurePdfLibraryLoaded();

    const template = this.templateService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Inject data into template
    const processedHtml = this.injectDataIntoTemplate(template, formData);

    // Create temporary container
    const container = this.createTempContainer(processedHtml);
    document.body.appendChild(container);

    try {
      const pdfOptions = this.preparePdfOptions(template, options);

      const pdfBlob = await window.html2pdf()
        .from(container)
        .set({
          ...pdfOptions,
          filename: undefined // Don't auto-download when getting blob
        })
        .outputPdf('blob');

      return pdfBlob;
    } finally {
      // Cleanup
      document.body.removeChild(container);
    }
  }

  private async generatePdfLegacyAsync(
    template: Template,
    formData: any,
    options?: PdfGenerationOptions
  ): Promise<void> {
    await this.ensurePdfLibraryLoaded();

    // Process legacy template content
    let processedContent = template.content;

    // Replace placeholders with form data
    if (template.placeholders) {
      template.placeholders.forEach(placeholder => {
        const value = this.getNestedValue(formData, placeholder) || '';
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, String(value));
      });
    }

    // Apply system placeholders
    processedContent = this.injectSystemPlaceholders(processedContent, formData);

    // Prepare options
    const pdfOptions = {
      filename: options?.filename || `${template.name}_${Date.now()}.pdf`,
      margin: [10, 10, 10, 10],
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    await this.generateFromHtmlAsync(processedContent, pdfOptions.filename, pdfOptions);
  }

  // ===== DATA INJECTION METHODS =====

  private injectDataIntoTemplate(template: TemplateConfiguration, data: any): string {
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

  private getFieldValue(data: any, fieldName: string, mapping: any): string {
    const value = this.getNestedValue(data, fieldName) || mapping.defaultValue || '';

    // Apply formatting if specified
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
      '{{pageNumber}}': '<span class="pageNumber"></span>',
      '{{totalPages}}': '<span class="totalPages"></span>'
    };

    Object.entries(systemPlaceholders).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      html = html.replace(regex, value);
    });

    return html;
  }

  // ===== PDF OPTIONS PREPARATION =====

  private preparePdfOptions(template: TemplateConfiguration, options?: Partial<PdfGenerationOptions>): any {
    const pdfSettings = template.pdfSettings;

    return {
      filename: options?.filename || `${template.name}_${Date.now()}.pdf`,
      margin: [
        pdfSettings?.margins?.top || 10,
        pdfSettings?.margins?.right || 10,
        pdfSettings?.margins?.bottom || 10,
        pdfSettings?.margins?.left || 10
      ],
      html2canvas: {
        scale: pdfSettings?.scale || 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        removeContainer: true
      },
      jsPDF: {
        unit: 'mm',
        format: pdfSettings?.pageSize?.toLowerCase() || 'a4',
        orientation: pdfSettings?.orientation || 'portrait',
        putOnlyUsedFonts: true,
        floatPrecision: 16
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: '.page-break',
        after: '.page-break-after',
        avoid: '.no-break'
      }
    };
  }

  private getDefaultElementOptions(filename: string, options: any = {}): any {
    return {
      margin: options.margin || [0, 0, 0, 0],
      filename: filename,
      image: {
        type: 'jpeg',
        quality: options.imageQuality || 0.98
      },
      html2canvas: {
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        ...options.html2canvas
      },
      jsPDF: {
        unit: 'mm',
        format: options.format || 'a4',
        orientation: options.orientation || 'portrait',
        ...options.jsPDF
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break',
        after: '.page-break-after',
        avoid: '.no-break',
        ...options.pagebreak
      }
    };
  }

  private getDefaultHtmlOptions(filename: string, options: any = {}): any {
    return {
      filename: filename,
      margin: options.margin || [10, 10, 10, 10],
      html2canvas: {
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ...options.html2canvas
      },
      jsPDF: {
        unit: 'mm',
        format: options.format || 'a4',
        orientation: options.orientation || 'portrait',
        ...options.jsPDF
      }
    };
  }

  // ===== UTILITY METHODS =====

  private addPageNumbers(element: HTMLElement): void {
    const pageNumbers = element.querySelectorAll('.page-number');
    pageNumbers.forEach((span, index) => {
      span.textContent = '1'; // Will be updated by html2pdf
    });
  }

  private createTempContainer(html: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.backgroundColor = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.6';
    container.style.color = '#333';

    return container;
  }

  private createPreviewHtml(content: string, templateName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Preview - ${templateName}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    }

    .preview-header {
      background: #0b7ad4;
      color: white;
      padding: 15px 20px;
      margin: -20px -20px 20px -20px;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-actions {
      display: flex;
      gap: 10px;
    }

    .preview-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .preview-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .preview-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 210mm;
      margin: 0 auto;
    }

    .preview-note {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    @media print {
      .preview-header,
      .preview-note {
        display: none;
      }

      .preview-content {
        box-shadow: none;
        max-width: none;
        padding: 0;
      }

      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <div class="preview-header">
    <span>📄 Template Preview: ${templateName}</span>
    <div class="preview-actions">
      <button class="preview-btn" onclick="window.print()">🖨️ Print</button>
      <button class="preview-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="preview-note">
    <strong>Preview Mode:</strong> This is a live preview of your template with sample data.
    Use the print button above or your browser's print function to print this preview.
  </div>

  <div class="preview-content">
    ${content}
  </div>
</body>
</html>`;
  }

  // ===== VALIDATION METHODS =====

  private validateGenerationRequirements(template: TemplateConfiguration, formData: any): {isValid: boolean; errors: string[]} {
    const errors: string[] = [];

    if (!template.htmlContent) {
      errors.push('Template has no HTML content');
    }

    // Check required fields
    const requiredFields = template.fieldMappings.filter(m => m.isRequired);
    requiredFields.forEach(field => {
      const value = this.getNestedValue(formData, field.fieldName);
      if (!value || String(value).trim().length === 0) {
        errors.push(`Required field missing: ${field.fieldName}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // ===== LIBRARY LOADING =====

  private async ensurePdfLibraryLoaded(): Promise<void> {
    if (window.html2pdf) {
      return;
    }

    if (this.pdfLibraryLoaded) {
      // Wait for library to be available
      let attempts = 0;
      while (!window.html2pdf && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.html2pdf) {
        throw new Error('PDF library failed to load');
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.libraryUrl;
      script.onload = () => {
        this.pdfLibraryLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF library'));
      };
      document.head.appendChild(script);
    });
  }

  // ===== HELPER METHODS =====

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private generateSubmissionId(): string {
    return 'PDF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  private getDefaultSampleData(): any {
    return {
      submissionId: this.generateSubmissionId(),
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
      companyName: 'Sample Company',
      clientName: 'Sample Client',
      clientEmail: 'client@example.com',
      repName: 'Sample Representative',
      dateSubmitted: new Date().toISOString()
    };
  }

  // ===== PUBLIC UTILITY METHODS =====

  /**
   * Get template size estimate for performance optimization
   */
  getTemplateSizeEstimate(templateId: string): {htmlSize: number; estimatedPdfSize: string} | null {
    const template = this.templateService.getTemplate(templateId);
    if (!template?.htmlContent) return null;

    const htmlSize = new Blob([template.htmlContent]).size;
    const estimatedPdfSize = htmlSize < 50000 ? 'Small (<1MB)' :
                           htmlSize < 200000 ? 'Medium (1-3MB)' : 'Large (>3MB)';

    return { htmlSize, estimatedPdfSize };
  }

  /**
   * Check if PDF generation is available
   */
  isPdfGenerationAvailable(): boolean {
    return !!window.html2pdf || this.pdfLibraryLoaded;
  }

  /**
   * Extract placeholders from HTML content
   */
  extractPlaceholders(htmlContent: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(htmlContent)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }
}
