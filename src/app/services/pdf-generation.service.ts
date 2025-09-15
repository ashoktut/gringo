import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { Template, TemplateGenerationRequest, PdfGenerationOptions } from '../models/template.models';
import { DocxProcessingService } from './docx-processing.service';

declare var html2pdf: any;

@Injectable({
  providedIn: 'root'
})
export class PdfGenerationService {

  constructor(
    private docxProcessor: DocxProcessingService,
    private http: HttpClient
  ) {}

  /**
   * Generate a PDF with page numbers using html2pdf.js
   * This method is reusable for any form or content in the app
   */
  public generatePdfWithPageNumbers(element: HTMLElement, filename: string, options?: any): void {
    // Pre-populate page numbers in the HTML before generating PDF
    const pageNumbers = element.querySelectorAll('.page-number');
    pageNumbers.forEach((span, index) => {
      span.textContent = '1'; // Will be updated by html2pdf
    });

    const defaultOptions = {
      margin: [0, 0, 0, 0], // Remove margins to prevent issues
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after'
      },
      ...options
    };

    if (typeof html2pdf !== 'undefined') {
      console.log('✅ Generating PDF with page numbers...');

      const worker = html2pdf();
      worker.set(defaultOptions)
        .from(element)
        .toPdf()
        .get('pdf').then((pdf: any) => {
          const totalPages = pdf.internal.getNumberOfPages();

          // Update page numbers in all pages
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            // Find and update page number elements
            // This is a simplified approach - for more complex page numbering
            // you might need to use the onAfterPage callback differently
          }

          console.log(`✅ PDF generated with ${totalPages} pages`);
        })
        .save()
        .then(() => {
          console.log('✅ PDF with page numbers generated successfully!');
        })
        .catch((error: any) => {
          console.error('❌ Error generating PDF with page numbers:', error);
        });
    } else {
      console.error('❌ html2pdf library not found.');
    }
  }

  /**
   * Generate enhanced RFQ PDF using the new template
   */
  generateEnhancedRFQ(formData: Record<string, any>, options?: PdfGenerationOptions): Observable<void> {
    console.log('🎯 Starting enhanced PDF generation with data:', formData);

    // Use the main PDF template with proper styling
    return this.http.get('assets/pdf-template.html', { responseType: 'text' }).pipe(
      map(template => {
        console.log('📄 Template loaded, length:', template.length);
        const processedHtml = this.processEnhancedTemplate(template, formData);
        console.log('✅ Template processed, length:', processedHtml.length);

        // Debug: Log the first 500 characters of processed HTML
        console.log('🔍 Processed HTML preview:', processedHtml.substring(0, 500));

        const filename = options?.filename || this.generateRFQFilename(formData);
        console.log('📁 Generating PDF with filename:', filename);

        this.generatePdfWithHtml2Pdf(processedHtml, filename);
      }),
      catchError(error => {
        console.error('❌ Enhanced PDF generation failed:', error);
        throw error;
      })
    );
  }

  /**
   * Debug method to test template loading and processing
   */
  debugTemplate(formData: Record<string, any>): Observable<string> {
    return this.http.get('assets/pdf-template.html', { responseType: 'text' }).pipe(
      map(template => {
        console.log('🔍 Debug - Template loaded successfully');
        const processed = this.processEnhancedTemplate(template, formData);
        console.log('🔍 Debug - Template processed');

        // Open processed HTML in new window for debugging
        const debugWindow = window.open('', '_blank');
        if (debugWindow) {
          debugWindow.document.write(processed);
          debugWindow.document.close();
        }

        return processed;
      })
    );
  }

  /**
   * Process the enhanced template with form data
   */
  private processEnhancedTemplate(template: string, data: Record<string, any>): string {
    let processed = template;

    // Add system-generated fields
    const enhancedData: Record<string, any> = {
      ...data,
      createdAt: new Date().toLocaleString(),
      submissionId: data['submissionId'] || this.generateSubmissionId(),
      headerImage: data['headerImage'] || 'assets/images/header.png'
    };

    console.log('🔄 Processing template with enhanced data keys:', Object.keys(enhancedData));

    // Replace all placeholders
    let replacementCount = 0;
    Object.keys(enhancedData).forEach(key => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const value = this.formatValue(enhancedData[key]);
      const matches = processed.match(placeholder);
      if (matches) {
        console.log(`🔄 Replacing ${matches.length} instances of {{${key}}} with: ${value}`);
        replacementCount += matches.length;
      }
      processed = processed.replace(placeholder, value);
    });

    console.log(`✅ Total replacements made: ${replacementCount}`);

    // Remove any remaining empty placeholders
    const remainingPlaceholders = processed.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
      console.log('⚠️ Remaining unfilled placeholders:', remainingPlaceholders.slice(0, 10));
      if (remainingPlaceholders.length > 10) {
        console.log(`... and ${remainingPlaceholders.length - 10} more`);
      }
    }
    processed = processed.replace(/\{\{[^}]+\}\}/g, '<span style="color:#ff0000;font-weight:bold;">[Missing Data]</span>');

    // Handle empty images - remove img tags with empty src
    processed = processed.replace(/<img[^>]*src=""[^>]*>/g, '');

    // Validate HTML structure
    if (!processed.includes('<body')) {
      console.error('❌ Processed HTML missing body tag');
    }
    if (!processed.includes('DOCTYPE')) {
      console.error('❌ Processed HTML missing DOCTYPE');
    }

    console.log('✅ Template processing complete. Final length:', processed.length);
    return processed;
  }

  /**
   * Generate PDF using html2pdf.js
   */
  private generatePdfWithHtml2Pdf(htmlContent: string, filename: string): void {
    console.log('🎨 Starting html2pdf generation...');
    console.log('📝 HTML content length:', htmlContent.length);

    // Check if content seems valid
    if (htmlContent.length < 1000) {
      console.warn('⚠️ HTML content seems too short, might be missing data');
    }

    // Create a temporary element to render the HTML
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    tempElement.style.width = '210mm';
    tempElement.style.minHeight = '297mm';
    tempElement.style.backgroundColor = '#ffffff';
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    tempElement.style.top = '0';
    tempElement.style.margin = '0';
    tempElement.style.padding = '0';

    // Add to DOM temporarily
    document.body.appendChild(tempElement);

    // Pre-populate page numbers
    const pageNumbers = tempElement.querySelectorAll('.page-number');
    pageNumbers.forEach((span, index) => {
      span.textContent = '1'; // Will be updated during PDF generation
    });

    const options = {
      margin: [0, 0, 0, 0], // No margins to prevent blank pages
      filename: filename,
      image: {
        type: 'jpeg',
        quality: 0.98
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        logging: false,
        removeContainer: true,
        onclone: function(clonedDoc: Document) {
          // Ensure the cloned document doesn't have extra spacing
          const clonedBody = clonedDoc.body;
          if (clonedBody) {
            clonedBody.style.margin = '0';
            clonedBody.style.padding = '0';
            clonedBody.style.boxSizing = 'border-box';
          }
        }
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.no-page-break'
      }
    };

    if (typeof html2pdf !== 'undefined') {
      console.log('✅ html2pdf library found, generating PDF...');

      html2pdf()
        .set(options)
        .from(tempElement)
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          const totalPages = pdf.internal.getNumberOfPages();
          console.log(`📄 PDF generated with ${totalPages} pages`);

          // Update page numbers for each page
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            // Add page number to footer area
            pdf.setFontSize(7);
            pdf.setTextColor(100, 116, 139); // #64748b
            const pageText = `${i}`;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const textWidth = pdf.getTextWidth(pageText);

            // Position in footer area (where the page number span is)
            pdf.text(pageText, (pageWidth - textWidth) / 2, 280); // Near bottom of page
          }

          return pdf;
        })
        .save()
        .then(() => {
          console.log('✅ PDF saved successfully!');
          // Clean up temporary element
          document.body.removeChild(tempElement);
        })
        .catch((error: any) => {
          console.error('❌ html2pdf error:', error);
          document.body.removeChild(tempElement);

          // Fallback to browser print
          console.log('🔄 Falling back to browser print...');
          this.renderPdf(htmlContent, filename);
        });
    } else {
      console.error('❌ html2pdf library not found. Falling back to browser print.');
      document.body.removeChild(tempElement);
      this.renderPdf(htmlContent, filename);
    }
  }  /**
   * Create a simplified version of the template for fallback
   */
  private createSimplifiedTemplate(originalHtml: string): string {
    // Extract text content and create a simpler layout
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHtml;

    // Get all text content while preserving structure
    const sections: string[] = [];

    // Find all sections and extract their content
    const sectionElements = tempDiv.querySelectorAll('div[style*="background"]');
    sectionElements.forEach((section, index) => {
      const heading = section.querySelector('div[style*="font-weight:700"]');
      const content = section.textContent || '';

      if (heading && content.trim()) {
        sections.push(`
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <h3 style="color: #1976d2; margin: 0 0 10px 0;">${heading.textContent}</h3>
            <div style="line-height: 1.6;">${content.replace(heading.textContent || '', '').trim()}</div>
          </div>
        `);
      }
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>LCP Roofing - RFQ Document</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1 {
              color: #1976d2;
              text-align: center;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 10px;
            }
            .section {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .section h3 {
              color: #1976d2;
              margin: 0 0 10px 0;
            }
          </style>
        </head>
        <body>
          <h1>LCP Roofing - Request for Quote</h1>
          <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Generated on ${new Date().toLocaleString()}
          </p>
          ${sections.join('')}
        </body>
      </html>
    `;
  }

  /**
   * Generate RFQ filename
   */
  private generateRFQFilename(formData: Record<string, any>): string {
    const clientName = formData['clientName'] || 'Client';
    const date = new Date().toISOString().split('T')[0];
    const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
    return `LCP_RFQ_${cleanClientName}_${date}.pdf`;
  }

  /**
   * Generate unique submission ID
   */
  private generateSubmissionId(): string {
    return 'RFQ-' + Date.now().toString(36).toUpperCase();
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
   * Generate PDF from template and form data with format preservation
   */
  generatePdf(
    template: Template,
    formData: Record<string, any>,
    options?: PdfGenerationOptions
  ): Observable<void> {

    // Only attempt docx processing for Word templates
    if (template.type === 'word' && this.shouldUseDocxProcessing(template)) {
      console.log('🎯 Using docx library for format preservation');
      return this.generatePdfWithDocx(template, formData, options);
    }

    // For non-Word templates, use string-based processing directly
    if (template.type !== 'word') {
      console.log('📝 Using string replacement for non-Word template');
    } else {
      console.log('⚠️ Using fallback string replacement');
    }
    return this.generatePdfWithStringReplacement(template, formData, options);
  }

  /**
   * Generate PDF using docx library (preserves formatting)
   */
  private generatePdfWithDocx(
    template: Template,
    formData: Record<string, any>,
    options?: PdfGenerationOptions
  ): Observable<void> {

    return this.docxProcessor.processDocxTemplate(template, formData).pipe(
      map(pdfBlob => {
        const filename = options?.filename || this.generateFilename(template, formData);
        this.downloadPdfBlob(pdfBlob, filename);
      }),
      catchError(error => {
        console.error('❌ Docx processing failed, falling back to string replacement:', error);
        return this.generatePdfWithStringReplacement(template, formData, options);
      })
    );
  }

  /**
   * Generate PDF using string replacement (fallback method)
   */
  private generatePdfWithStringReplacement(
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
   * Determine if docx processing should be used
   */
  private shouldUseDocxProcessing(template: Template): boolean {
    // Only log warnings if the template is a Word document
    const isWord = template.type === 'word';
    const canUseDocx = !!(
      isWord &&
      template.preserveFormatting &&
      (template.originalFile || template.binaryContent)
    );

    if (isWord) {
      console.log('🔍 Evaluating template for docx processing:');
      console.log(`  • Template name: "${template.name}"`);
      console.log(`  • Template type: "${template.type}"`);
      console.log(`  • Preserve formatting: ${template.preserveFormatting}`);
      console.log(`  • Has original file: ${!!template.originalFile}`);
      console.log(`  • Has binary content: ${!!template.binaryContent}`);
      console.log(`  • Binary content size: ${template.binaryContent?.byteLength || 0} bytes`);
      console.log(`  • 🎯 Will use docx processing: ${canUseDocx}`);
      if (!canUseDocx) {
        console.warn('⚠️ Falling back to string replacement because:');
        if (!template.preserveFormatting) console.warn('    - preserveFormatting is disabled');
        if (!template.originalFile && !template.binaryContent) console.warn('    - No binary content available');
      }
    }
    return canUseDocx;
  }

  /**
   * Download PDF blob to user's device
   */
  private downloadPdfBlob(pdfBlob: Blob, filename: string): void {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
