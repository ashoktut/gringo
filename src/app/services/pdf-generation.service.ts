import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Template, TemplateGenerationRequest, PdfGenerationOptions } from '../models/template.models';

@Injectable({
  providedIn: 'root'
})
export class PdfGenerationService {

  /**
   * Generate PDF from template and form data
   */
  generatePdf(
    template: Template, 
    formData: Record<string, any>, 
    options?: PdfGenerationOptions
  ): Observable<void> {
    return new Observable(observer => {
      try {
        // Extract and format all form fields
        const formattedData = this.formatFormData(formData);
        
        // Create HTML content from template
        const htmlContent = this.populateTemplate(template, formattedData);
        
        // Generate the PDF
        const filename = options?.filename || this.generateFilename(template, formData);
        this.renderPdf(htmlContent, filename, options);
        
        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(template: Template, sampleData?: Record<string, any>): Observable<void> {
    const data = sampleData || this.generateSampleData(template.formType);
    return this.generatePdf(template, data, { filename: `preview-${template.name}` });
  }

  /**
   * Format form data for template population
   */
  private formatFormData(data: any, prefix: string = ''): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    if (!data || typeof data !== 'object') {
      return formatted;
    }

    Object.keys(data).forEach(key => {
      const value = data[key];
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively process nested objects
        Object.assign(formatted, this.formatFormData(value, fieldKey));
      } else {
        // Format the value for display
        formatted[fieldKey] = this.formatValue(value);
        formatted[key] = this.formatValue(value); // Also store without prefix
      }
    });

    return formatted;
  }

  /**
   * Format individual values for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }

  /**
   * Populate template with formatted data
   */
  private populateTemplate(template: Template, formattedData: Record<string, string>): string {
    let htmlContent = template.content;

    // Replace all placeholders with form data
    Object.keys(formattedData).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = formattedData[key];
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Handle special ALL_FORM_DATA placeholder
    if (htmlContent.includes('{{ALL_FORM_DATA}}')) {
      const dataTable = this.createDataTable(formattedData, template.formType);
      htmlContent = htmlContent.replace(/\{\{ALL_FORM_DATA\}\}/g, dataTable);
    }

    return this.wrapInPrintableHtml(htmlContent, template);
  }

  /**
   * Create comprehensive data table
   */
  private createDataTable(data: Record<string, string>, formType: string): string {
    const rows = Object.keys(data)
      .filter(key => !key.includes('.')) // Exclude nested field duplicates
      .map(key => {
        const label = this.formatFieldLabel(key);
        const value = data[key];
        return `
          <tr>
            <td style="font-weight: bold; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">${label}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `;
      }).join('');

    return `
      <div style="margin: 20px 0;">
        <h3 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 5px;">
          ${formType.toUpperCase()} Form Data
        </h3>
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

  /**
   * Convert camelCase to readable labels
   */
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Wrap content in printable HTML
   */
  private wrapInPrintableHtml(content: string, template: Template): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.formType.toUpperCase()} Document - ${new Date().toLocaleDateString()}</title>
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
            <h1>${template.formType.toUpperCase()} Document</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Template: ${template.name}</p>
          </div>
          
          ${content}
          
          <div class="footer">
            <p>This document was automatically generated from ${template.formType.toUpperCase()} form submission.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Render PDF using browser print
   */
  private renderPdf(htmlContent: string, filename: string, options?: PdfGenerationOptions): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blocker settings.');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Add delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(template: Template, formData: Record<string, any>): string {
    const formType = template.formType;
    const submissionId = formData['submissionId'] || 'document';
    const timestamp = new Date().toISOString().split('T')[0];
    return `${formType}-${submissionId}-${timestamp}.pdf`;
  }

  /**
   * Generate sample data for testing
   */
  private generateSampleData(formType: string): Record<string, any> {
    const baseData = {
      submissionId: 'SAMPLE-001',
      dateSubmitted: new Date().toISOString().split('T')[0],
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'sample'
    };

    switch (formType) {
      case 'rfq':
        return {
          ...baseData,
          clientName: 'John Smith',
          clientEmail: 'john.smith@example.com',
          clientPhone: '+27721549865',
          standNum: '123 Main Street, Cape Town',
          repName: 'Bryan Van Staden',
          roofTimeline: '2 weeks',
          structureType: ['Tiled Roof'],
          buildingType: 'Residential',
          municipality: 'Cape Town',
          trussNotes: 'Standard residential truss with 30-degree pitch'
        };
      case 'rqr':
        return {
          ...baseData,
          clientName: 'Jane Doe',
          clientEmail: 'jane.doe@company.com',
          projectType: 'Commercial Building',
          requirements: 'Steel structure framework',
          budget: '250000',
          location: 'Johannesburg, GP'
        };
      default:
        return {
          ...baseData,
          clientName: 'Sample Client',
          description: 'Sample document description',
          amount: '10000',
          notes: 'This is a test document generated from template'
        };
    }
  }
}
