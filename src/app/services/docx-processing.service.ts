import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import {
  Template,
  TemplateGenerationRequest,
  DocxProcessingOptions,
  ImageProcessingOptions,
} from '../models/template.models';
import { HttpClient } from '@angular/common/http';

// Import pizzip and docxtemplater properly for bundling
import * as mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

export interface RfqProcessingResult {
  pdfBlob: Blob;
  downloadUrl: string;
  emailStatus: {
    sent: boolean;
    recipients: string[];
    error?: string;
  };
  googleDriveUrl?: string;
  serverPath?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocxProcessingService {
  constructor(private http: HttpClient) {}

  /**
   * Complete RFQ processing pipeline:
   * 1. Populate Word template
   * 2. Convert to PDF
   * 3. Download locally
   * 4. Send via email
   * 5. Upload to Google Drive
   * 6. Save to server
   */
  processRfqSubmission(
    template: Template,
    formData: Record<string, any>,
    recipients: string[],
    clientEmail: string,
    options?: DocxProcessingOptions
  ): Observable<RfqProcessingResult> {
    const submissionId = this.generateSubmissionId(formData);
    const filename = `RFQ-${submissionId}-${
      formData['clientName']?.replace(/\s+/g, '-') || 'Client'
    }.pdf`;

    console.log('🚀 Starting RFQ processing pipeline:', {
      templateName: template.name,
      submissionId,
      filename,
      hasTemplate: !!template.originalFile || !!template.binaryContent,
      formDataKeys: Object.keys(formData),
    });

    return this.processDocxTemplate(template, formData, options).pipe(
      switchMap((pdfBlob) => {
        console.log('📄 PDF generated, starting distribution pipeline...');

        // Execute all operations in parallel
        return forkJoin({
          // 1. Create download URL
          downloadUrl: this.createDownloadUrl(pdfBlob, filename),

          // 2. Send emails
          emailStatus: this.sendRfqEmails(
            pdfBlob,
            formData,
            recipients,
            clientEmail,
            filename
          ),

          // 3. Upload to Google Drive
          googleDriveUrl: this.uploadToGoogleDrive(pdfBlob, filename, formData),

          // 4. Save to server
          serverPath: this.saveToServer(pdfBlob, filename, submissionId),
        }).pipe(
          map((results) => ({
            pdfBlob,
            ...results,
          }))
        );
      })
    );
  }

  /**
   * Process Word document with docx library maintaining formatting
   */
  processDocxTemplate(
    template: Template,
    formData: Record<string, any>,
    options?: DocxProcessingOptions
  ): Observable<Blob> {
    console.log('📄 Processing docx template (new HTML flow):', {
      templateId: template.id,
      templateName: template.name,
      hasOriginalFile: !!template.originalFile,
      hasBinaryContent: !!template.binaryContent,
      binaryContentSize: template.binaryContent
        ? template.binaryContent.byteLength
        : 0,
      formDataFields: Object.keys(formData).length,
    });

    if (!template.originalFile && !template.binaryContent) {
      throw new Error(
        'Template must have originalFile or binaryContent for docx processing'
      );
    }

    return this.loadDocumentBinary(template).pipe(
      switchMap(async (arrayBuffer) => {
        // 1. Convert DOCX to HTML with mammoth
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        // 2. Interpolate placeholders in HTML
        const interpolatedHtml = this.interpolateHtmlPlaceholders(html, formData);
        // 3. Convert HTML to PDF using html2pdf.js
        const pdfBlob = await this.htmlToPdfBlob(interpolatedHtml);
        return pdfBlob;
      })
    );
  }

  /**
   * Interpolate {{placeholders}} in HTML with formData values
   */
  private interpolateHtmlPlaceholders(html: string, data: Record<string, any>): string {
    return html.replace(/{{(\w+)}}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : '';
    });
  }

  /**
   * Convert HTML string to PDF Blob using html2pdf.js
   */
  private async htmlToPdfBlob(html: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const element = document.createElement('div');
      element.innerHTML = html;
      html2pdf()
        .from(element)
        .outputPdf('blob')
        .then((blob: Blob) => resolve(blob))
        .catch(reject);
    });
  }

  /**
   * Load document as ArrayBuffer for processing
   */
  private loadDocumentBinary(template: Template): Observable<ArrayBuffer> {
    return new Observable((observer) => {
      if (template.binaryContent) {
        console.log(
          '📁 Using template binary content, size:',
          template.binaryContent.byteLength
        );

        try {
          // Ensure we have a proper ArrayBuffer
          let arrayBuffer: ArrayBuffer;

          if (template.binaryContent instanceof ArrayBuffer) {
            arrayBuffer = template.binaryContent;
          } else {
            // Convert to proper ArrayBuffer if it's a Uint8Array or similar
            const uint8Array = new Uint8Array(template.binaryContent);
            arrayBuffer = uint8Array.buffer.slice(
              uint8Array.byteOffset,
              uint8Array.byteOffset + uint8Array.byteLength
            );
          }

          // ✅ FIXED: Validate this is a Word document FIRST
          if (!this.validateWordDocument(arrayBuffer)) {
            observer.error(
              new Error(
                'Template is not a valid Word document (.docx file required)'
              )
            );
            return;
          }

          console.log(
            '✅ Valid Word document detected, proceeding with docx processing'
          );
          observer.next(arrayBuffer);
          observer.complete();
          return;
        } catch (error) {
          console.error('❌ Error processing binary content:', error);
          observer.error(
            new Error(
              `Failed to process template binary content: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
          return;
        }
      }

      if (template.originalFile && template.originalFile instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;

          // ✅ FIXED: Validate Word document for file uploads too
          if (!this.validateWordDocument(arrayBuffer)) {
            observer.error(
              new Error(
                'Uploaded file is not a valid Word document (.docx file required)'
              )
            );
            return;
          }

          console.log('✅ Valid Word document file detected');
          observer.next(arrayBuffer);
          observer.complete();
        };
        reader.onerror = () =>
          observer.error(new Error('Failed to read template file'));
        reader.readAsArrayBuffer(template.originalFile);
        return;
      }

      observer.error(new Error('No binary content available for template'));
    });
  }

  /**
   * Process document and convert directly to PDF
   */
  // ...existing code...

  /**
   * Process document using docx library
   */
  private processDocumentWithDocx(
    arrayBuffer: ArrayBuffer,
    formData: Record<string, any>,
    options: DocxProcessingOptions
  ): Observable<Blob> {
    return from(this.processDocxDocument(arrayBuffer, formData, options));
  }

  /**
   * Core docx processing logic
   */
  private async processDocxDocument(
    arrayBuffer: ArrayBuffer,
    formData: Record<string, any>,
    options: DocxProcessingOptions
  ): Promise<Blob> {
    try {
      // Note: This is a conceptual implementation
      // You'll need to install and import the actual docx library

      // 1. Load the document
      const document = await this.loadDocxDocument(arrayBuffer);

      // 2. Process text placeholders
      if (options.preserveStyles) {
        await this.replaceTextPlaceholdersWithFormatting(document, formData);
      }

      // 3. Process image placeholders
      if (options.preserveImages) {
        await this.replaceImagePlaceholders(
          document,
          formData,
          options.imageQuality || 80
        );
      }

      // 4. Process table placeholders
      if (options.preserveTables) {
        await this.processTablePlaceholders(document, formData);
      }

      // 5. Convert to PDF or return as docx
      return await this.convertDocumentToPdf(document);
    } catch (error) {
      console.error('Error processing docx document:', error);
      throw new Error(
        `Docx processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Replace all placeholders in document with enhanced debugging
   */
  // Deprecated docxtemplater placeholder replacement removed.
  // This method is now obsolete and should not be used.

  /**
   * Enhanced PDF conversion with proper formatting - FIXED VERSION
   */
  private async convertToPdfWithFormatting(
    document: any,
    formData: Record<string, any>,
    options: DocxProcessingOptions
  ): Promise<Blob> {
    try {
      console.log('🔄 Converting processed Word document to PDF...');

      // Get the processed Word document as a buffer
      const processedDocxBuffer = document.getZip().generate({
        type: 'arraybuffer',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      console.log(
        '📄 Processed Word document size:',
        processedDocxBuffer.byteLength
      );

      // ✅ FIXED: Try server-side conversion first (preserves formatting)
      if (this.hasServerPdfService()) {
        console.log('🔄 Attempting server-side PDF conversion...');
        return await this.serverSidePdfConversion(
          processedDocxBuffer,
          formData,
          options
        );
      }

      // ✅ FIXED: For now, return the processed Word document
      // In production, you need proper DOCX to PDF conversion
      console.warn('⚠️ Server-side PDF conversion not available');
      console.log('💡 Returning processed Word document instead');

      return new Blob([processedDocxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    } catch (error) {
      console.error('❌ Error converting to PDF:', error);
      throw new Error(
        `PDF conversion failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Server-side PDF conversion (recommended for quality) - FIXED VERSION
   */
  private async serverSidePdfConversion(
    processedDocxBuffer: ArrayBuffer,
    formData: Record<string, any>,
    options: DocxProcessingOptions
  ): Promise<Blob> {
    const formData_req = new FormData();
    formData_req.append(
      'document',
      new Blob([processedDocxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      'processed-template.docx'
    );

    formData_req.append(
      'options',
      JSON.stringify({
        format: 'pdf',
        quality: 'high',
        preserveFormatting: true,
        embedFonts: true,
        optimizeForPrint: true,
      })
    );

    try {
      console.log(
        '🔄 Sending processed Word document to server for PDF conversion...'
      );

      const response = (await this.http
        .post('/api/documents/convert-to-pdf', formData_req, {
          responseType: 'blob',
        })
        .toPromise()) as Blob;

      console.log(
        '✅ Server-side PDF conversion successful, size:',
        response.size
      );
      return response;
    } catch (error) {
      console.error('❌ Server-side PDF conversion failed:', error);
      throw new Error('Server-side PDF conversion service unavailable');
    }
  }

  /**
   * Client-side PDF conversion fallback
   */
  private async clientSidePdfConversion(
    processedDocxBuffer: ArrayBuffer,
    formData: Record<string, any>,
    options: DocxProcessingOptions
  ): Promise<Blob> {
    console.log('🔄 Converting to PDF using client-side conversion...');

    try {
      // Generate a proper PDF using client-side generation
      const pdfContent = this.generateRfqPdfContent(formData);

      console.log('✅ Client-side PDF generated successfully');
      return pdfContent;
    } catch (error) {
      console.error('❌ Error in client-side PDF conversion:', error);

      // Fallback to text file if PDF generation fails
      const errorMessage = `PDF Conversion Notice:

This RFQ submission has been processed, but PDF generation requires server-side conversion.
Please contact the system administrator to enable PDF generation capabilities.

Form Data Summary:
- Company: ${formData['companyName'] || 'N/A'}
- Contact: ${formData['contactPerson'] || 'N/A'}
- Email: ${formData['email'] || 'N/A'}
- Project Type: ${formData['projectType'] || 'N/A'}

Submission ID: ${Date.now()}
Generated: ${new Date().toISOString()}`;

      return new Blob([errorMessage], { type: 'text/plain' });
    }
  }

  /**
   * Create download URL for immediate download
   */
  private createDownloadUrl(
    pdfBlob: Blob,
    filename: string
  ): Observable<string> {
    return new Observable((observer) => {
      const url = URL.createObjectURL(pdfBlob);

      // Trigger automatic download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      console.log(`📥 PDF download initiated: ${filename}`);
      observer.next(url);
      observer.complete();
    });
  }

  /**
   * Send RFQ emails with PDF attachment
   */
  private sendRfqEmails(
    pdfBlob: Blob,
    formData: Record<string, any>,
    recipients: string[],
    clientEmail: string,
    filename: string
  ): Observable<{ sent: boolean; recipients: string[]; error?: string }> {
    const allRecipients = [...recipients, clientEmail].filter(
      (email) => email && email.trim()
    );

    if (allRecipients.length === 0) {
      return new Observable((observer) => {
        observer.next({
          sent: false,
          recipients: [],
          error: 'No email recipients provided',
        });
        observer.complete();
      });
    }

    // Convert blob to base64 for email attachment
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = (reader.result as string).split(',')[1];

        const emailData = {
          recipients: allRecipients,
          subject: `RFQ Submission - ${formData['clientName']} - ${formData['standNum']}`,
          body: this.createEmailBody(formData),
          attachment: {
            filename: filename,
            content: base64Content,
            contentType: 'application/pdf',
          },
        };

        // Mock email sending - replace with actual email service
        console.log('📧 Sending RFQ emails to:', allRecipients);
        setTimeout(() => {
          observer.next({
            sent: true,
            recipients: allRecipients,
          });
          observer.complete();
        }, 1000);
      };
      reader.onerror = () => {
        observer.next({
          sent: false,
          recipients: allRecipients,
          error: 'Failed to process PDF for email',
        });
        observer.complete();
      };
      reader.readAsDataURL(pdfBlob);
    });
  }

  /**
   * Upload PDF to Google Drive
   */
  private uploadToGoogleDrive(
    pdfBlob: Blob,
    filename: string,
    formData: Record<string, any>
  ): Observable<string> {
    const driveData = {
      file: pdfBlob,
      filename: filename,
      folderId: this.getRfqFolderId(formData), // Organize by client/date
      metadata: {
        description: `RFQ submission for ${formData['clientName']}`,
        properties: {
          submissionId: this.generateSubmissionId(formData),
          clientName: formData['clientName'],
          repName: formData['repName'],
          submissionDate: new Date().toISOString(),
        },
      },
    };

    // Mock Google Drive upload - replace with actual Google Drive API
    return new Observable((observer) => {
      console.log('☁️ Uploading to Google Drive:', filename);
      setTimeout(() => {
        const driveUrl = `https://drive.google.com/file/d/mock-file-id-${Date.now()}/view`;
        observer.next(driveUrl);
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Save PDF to server file system
   */
  private saveToServer(
    pdfBlob: Blob,
    filename: string,
    submissionId: string
  ): Observable<string> {
    const serverData = {
      file: pdfBlob,
      filename: filename,
      directory: `/rfq-submissions/${new Date().getFullYear()}/${this.getMonthName()}`,
      metadata: {
        submissionId: submissionId,
        createdAt: new Date().toISOString(),
        fileSize: pdfBlob.size,
      },
    };

    // Mock server storage - replace with actual file upload service
    return new Observable((observer) => {
      console.log('💾 Saving to server:', filename);
      setTimeout(() => {
        const serverPath = `/uploads/rfq-submissions/${new Date().getFullYear()}/${this.getMonthName()}/${filename}`;
        observer.next(serverPath);
        observer.complete();
      }, 1500);
    });
  }

  /**
   * Process special RFQ placeholders
   */
  private async processSpecialRfqPlaceholders(
    document: any,
    formData: Record<string, any>
  ): Promise<void> {
    console.log('🔧 Processing special RFQ placeholders');

    // Handle basic form data placeholders only
    // (Special HTML placeholders removed for clean production code)
    const specialPlaceholders = {
      '{{ALL_FORM_DATA}}': 'Form data processed',
      '{{IMAGE_GALLERY}}': 'Images processed',
      '{{DRAWING_SECTION}}': 'Drawings processed',
      '{{SUBMISSION_SUMMARY}}': 'Summary processed',
      '{{RFQ_TIMELINE}}': 'Timeline processed',
      '{{CONTACT_INFO}}': 'Contact info processed',
    };

    Object.entries(specialPlaceholders).forEach(([placeholder, content]) => {
      this.replaceInDocument(document, placeholder, content);
    });
  }

  /**
   * Utility methods
   */
  private generateSubmissionId(formData: Record<string, any>): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-3);
    return `RFQ-${dateStr}-${timeStr}`;
  }

  private getRfqFolderId(formData: Record<string, any>): string {
    // Organize Google Drive folders by year/month or client
    const year = new Date().getFullYear();
    const month = this.getMonthName();
    return `rfq-${year}-${month}`;
  }

  private getMonthName(): string {
    return new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
  }

  private createEmailBody(formData: Record<string, any>): string {
    return `
      Dear Team,

      A new RFQ submission has been received and is ready for processing.

      📋 SUBMISSION DETAILS:
      • Client: ${formData['clientName'] || 'N/A'}
      • Project: ${formData['standNum'] || 'N/A'}
      • Rep: ${formData['repName'] || 'N/A'}
      • Timeline: ${formData['roofTimeline'] || 'N/A'}

      📎 The complete RFQ documentation is attached as a PDF.

      Best regards,
      RFQ Processing System
    `;
  }

  private hasServerPdfService(): boolean {
    // ✅ FIXED: Return false since no server-side conversion available yet
    return false;
  }

  private countDrawingPhotos(formData: Record<string, any>): number {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      if (formData[`drawingPhoto${i}`]) count++;
    }
    return count;
  }

  // ...existing code...

  /**
   * Replace text placeholders while preserving formatting
   */
  private async replaceTextPlaceholdersWithFormatting(
    document: any,
    formData: Record<string, any>
  ): Promise<void> {
    console.log('🔄 Processing text placeholders with formatting preservation');

    // RFQ-specific field processing
    const processedData = this.preprocessRfqData(formData);

    console.log('📊 Template data to be applied:', processedData);

    try {
  // Use docxtemplater's new API to replace all placeholders
  document.render(processedData);

      console.log('✅ Template placeholders processed successfully');
    } catch (error) {
      console.error('❌ Error processing template placeholders:', error);

      // Log specific docxtemplater errors
      if (error instanceof Error && 'properties' in error) {
        const props = (error as any).properties;
        console.error('📋 Template error details:', {
          id: props.id,
          explanation: props.explanation,
          scope: props.scope,
          offset: props.offset,
        });

        if (props.errors) {
          props.errors.forEach((err: any, index: number) => {
            console.error(`  Error ${index + 1}:`, err);
          });
        }
      }

      throw error;
    }
  }

  /**
   * Process RFQ-specific data types with enhanced field mapping
   */
  private preprocessRfqData(
    formData: Record<string, any>
  ): Record<string, string> {
    console.log(
      '🔄 Processing RFQ form data for Word template placeholders...'
    );
    console.log('📊 Raw form data received:', formData);

    const processed: Record<string, string> = {};

    // First, process all basic fields
    Object.entries(formData).forEach(([key, value]) => {
      processed[key] = this.processRfqFieldValue(key, value);
    });

    // Add computed fields and formatting enhancements
    this.addComputedFields(processed, formData);

    // Add standard template fields that might be expected
    this.addStandardTemplateFields(processed, formData);

    console.log('✅ Processed template data:', processed);
    return processed;
  }

  /**
   * Add computed fields based on form data
   */
  private addComputedFields(
    processed: Record<string, string>,
    formData: Record<string, any>
  ): void {
    // Computed submission info
    const today = new Date();
    processed['submissionDate'] = today.toLocaleDateString();
    processed['submissionTime'] = today.toLocaleTimeString();
    processed['submissionDateTime'] = today.toLocaleString();

    // Generate unique submission ID if not present
    if (!processed['submissionId']) {
      processed['submissionId'] = `RFQ-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;
    }

    // Project summary
    const projectParts = [];
    if (processed['companyName']) projectParts.push(processed['companyName']);
    if (processed['standNum'])
      projectParts.push(`Stand ${processed['standNum']}`);
    if (processed['municipality']) projectParts.push(processed['municipality']);
    processed['projectSummary'] = projectParts.join(' - ');

    // Contact summary
    const contactParts = [];
    if (processed['clientName']) contactParts.push(processed['clientName']);
    if (processed['clientPhone']) contactParts.push(processed['clientPhone']);
    if (processed['clientEmail']) contactParts.push(processed['clientEmail']);
    processed['contactSummary'] = contactParts.join(' | ');

    // Technical summary
    const techParts = [];
    if (processed['structureType'])
      techParts.push(`Structure: ${processed['structureType']}`);
    if (processed['mainPitch'])
      techParts.push(`Pitch: ${processed['mainPitch']}°`);
    if (processed['maxTrussSpacing'])
      techParts.push(`Spacing: ${processed['maxTrussSpacing']}mm`);
    processed['technicalSummary'] = techParts.join(' | ');

    // Service summary
    if (processed['serviceType']) {
      processed['serviceSummary'] = `Services: ${processed['serviceType']}`;
    }
  }

  /**
   * Add standard template fields that are commonly expected
   */
  private addStandardTemplateFields(
    processed: Record<string, string>,
    formData: Record<string, any>
  ): void {
    // Common alternative field names for Word templates
    const fieldMappings: Record<string, string> = {
      // Client information alternatives
      customerName: processed['clientName'] || '',
      customer: processed['clientName'] || '',
      contactName: processed['clientName'] || '',
      contact: processed['clientName'] || '',
      company: processed['companyName'] || '',
      organization: processed['companyName'] || '',

      // Contact details alternatives
      phone: processed['clientPhone'] || '',
      telephone: processed['clientPhone'] || '',
      email: processed['clientEmail'] || '',
      emailAddress: processed['clientEmail'] || '',

      // Project information alternatives
      stand: processed['standNum'] || '',
      standNumber: processed['standNum'] || '',
      erf: processed['standNum'] || '',
      erfNumber: processed['standNum'] || '',

      // Location alternatives
      location: processed['municipality'] || '',
      area: processed['municipality'] || '',
      city: processed['municipality'] || '',

      // Building information alternatives
      building: processed['buildingType'] || '',
      buildingCategory: processed['buildingType'] || '',
      structure: processed['structureType'] || '',

      // Representative alternatives
      rep: processed['repName'] || '',
      representative: processed['repName'] || '',
      salesperson: processed['repName'] || '',

      // Dates alternatives
      dateSubmitted: processed['dateSubmitted'] || '',
      submissionDate: processed['submissionDate'] || '',
      dateDue: processed['dateDue'] || '',
      dueDate: processed['dateDue'] || '',

      // Technical specifications alternatives
      pitch: processed['mainPitch'] || '',
      mainPitch: processed['mainPitch'] || '',
      pitch1: processed['mainPitch'] || '',
      pitch2: processed['pitch2'] || '',
      secondaryPitch: processed['pitch2'] || '',
      spacing: processed['maxTrussSpacing'] || '',
      trussSpacing: processed['maxTrussSpacing'] || '',
      maxSpacing: processed['maxTrussSpacing'] || '',

      // Service alternatives
      service: processed['serviceType'] || '',
      services: processed['serviceType'] || '',
      workType: processed['serviceType'] || '',

      // Ceiling and construction details
      ceiling: processed['ceilingType'] || '',
      ceilingType: processed['ceilingType'] || '',
      walls: processed['wallCobbling'] || '',
      wallType: processed['wallCobbling'] || '',

      // Overhangs
      eaves: processed['eavesOverhang'] || '',
      gable: processed['gableOverhang'] || '',
      apex: processed['apexOverhang'] || '',

      // Specifications
      underlay: processed['ulaySpec'] || '',
      insulation: processed['insSpec'] || '',
      sundries: processed['trussSundry'] || '',

      // Loading
      solarLoading: processed['isSolarLoading'] || '',
      geyserLoading: processed['isGeyserLoading'] || '',
      exposedTruss: processed['isExposedTrussRequired'] || '',

      // Notes
      notes: processed['trussNotes'] || '',
      comments: processed['trussNotes'] || '',
      specialInstructions: processed['trussNotes'] || '',

      // Timeline
      roofTimeline: processed['roofTimeline'] || '',
      timeline: processed['roofTimeline'] || '',
      schedule: processed['roofTimeline'] || '',
    };

    // Add all mapped fields
    Object.entries(fieldMappings).forEach(([key, value]) => {
      if (!processed[key] && value) {
        processed[key] = value;
      }
    });

    // Add yes/no boolean representations
    this.addBooleanRepresentations(processed);
  }

  /**
   * Add different representations for boolean fields
   */
  private addBooleanRepresentations(processed: Record<string, string>): void {
    const booleanFields = [
      'isSolarLoading',
      'isGeyserLoading',
      'isExposedTrussRequired',
    ];

    booleanFields.forEach((field) => {
      const value = processed[field];
      if (value) {
        const boolValue = this.parseBoolean(value);
        // Add different representations
        processed[`${field}_YesNo`] = boolValue ? 'Yes' : 'No';
        processed[`${field}_TRUE_FALSE`] = boolValue ? 'TRUE' : 'FALSE';
        processed[`${field}_Checkbox`] = boolValue ? '☑' : '☐';
        processed[`${field}_XMark`] = boolValue ? 'X' : '';
      }
    });
  }

  /**
   * Parse boolean values from various formats
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const str = value.toLowerCase().trim();
      return str === 'true' || str === 'yes' || str === '1' || str === 'on';
    }
    return !!value;
  }

  /**
   * Process RFQ field values based on type with enhanced object handling
   */
  private processRfqFieldValue(fieldName: string, value: any): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle Date objects first (before checking if it's an object)
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    // Handle complex objects (like location objects)
    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.processObjectField(fieldName, value);
    }

    // Handle array fields (multi-select)
    if (Array.isArray(value)) {
      return this.processArrayField(fieldName, value);
    }

    // Handle date fields (string dates)
    if (this.isDateField(fieldName) && typeof value === 'string') {
      return this.formatDate(value);
    }

    // Handle boolean fields
    if (this.isBooleanField(fieldName)) {
      return this.formatBoolean(value);
    }

    // Default string conversion
    return String(value);
  }

  /**
   * Process object fields (like location objects, etc.)
   */
  private processObjectField(fieldName: string, value: any): string {
    // Handle location objects
    if (
      fieldName === 'projectLocation' ||
      fieldName.includes('location') ||
      fieldName.includes('address')
    ) {
      const parts = [];
      if (value.address) parts.push(value.address);
      if (value.street) parts.push(value.street);
      if (value.city) parts.push(value.city);
      if (value.province) parts.push(value.province);
      if (value.postalCode) parts.push(value.postalCode);
      if (value.country) parts.push(value.country);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    // Handle objects with common value properties
    if (value.value !== undefined) return String(value.value);
    if (value.label !== undefined) return String(value.label);
    if (value.text !== undefined) return String(value.text);
    if (value.name !== undefined) return String(value.name);

    // For simple objects, try to extract meaningful content
    const keys = Object.keys(value);
    if (keys.length === 1) {
      return this.processRfqFieldValue(keys[0], value[keys[0]]);
    }

    // If all else fails, return a JSON representation
    try {
      return JSON.stringify(value);
    } catch {
      return '[Complex Object]';
    }
  }

  /**
   * Process array fields (multi-select dropdowns)
   */
  private processArrayField(fieldName: string, value: any[]): string {
    const rfqArrayFields = [
      'structureType', // ["tiled", "sheeted"]
      'serviceType', // ["Supply Truss", "Erect Cover"]
      'ulaySpec', // ["Undertile", "Bubblefoil"]
      'trussSundry', // ["Verge Tiles", "Barge Boards"]
      'ccMail', // ["andri@roofing.com", "bryan@roofing.com"]
    ];

    if (rfqArrayFields.includes(fieldName)) {
      return value.map((item) => String(item)).join(', ');
    }

    return value.join(', ');
  }

  /**
   * Replace image placeholders with actual images
   */
  private async replaceImagePlaceholders(
    document: any,
    formData: Record<string, any>,
    imageQuality: number
  ): Promise<void> {
    console.log('🖼️ Processing image placeholders');

    const imageFields = [
      'sitePhoto',
      'architecturalDrawing',
      'referencePhoto',
      'drawingPhoto1',
      'drawingPhoto2',
      'drawingPhoto3',
      'drawingPhoto4',
      'drawingPhoto5',
    ];

    for (const fieldName of imageFields) {
      const placeholder = `{{${fieldName}}}`;
      const imageData = formData[fieldName];

      if (imageData && (imageData.url || imageData.base64)) {
        console.log(`Inserting image for ${fieldName}`);
        await this.insertImageInDocument(
          document,
          placeholder,
          imageData,
          imageQuality
        );
      }
    }
  }

  /**
   * Insert image into document at placeholder location
   */
  private async insertImageInDocument(
    document: any,
    placeholder: string,
    imageData: any,
    quality: number
  ): Promise<void> {
    // Get image dimensions based on field type
    const dimensions = this.getImageDimensions(placeholder);

    console.log(
      `Inserting image at ${placeholder} with dimensions ${dimensions.width}x${dimensions.height}`
    );

    // Placeholder for actual docx library image insertion
    // Actual implementation would:
    // 1. Convert image data to proper format
    // 2. Find placeholder location in document
    // 3. Replace placeholder with image element
    // 4. Apply sizing and formatting
  }

  /**
   * Get appropriate image dimensions for different RFQ image types
   */
  private getImageDimensions(placeholder: string): {
    width: number;
    height: number;
  } {
    const dimensionMap: Record<string, { width: number; height: number }> = {
      '{{drawingPhoto1}}': { width: 450, height: 300 },
      '{{drawingPhoto2}}': { width: 450, height: 300 },
      '{{drawingPhoto3}}': { width: 450, height: 300 },
      '{{drawingPhoto4}}': { width: 450, height: 300 },
      '{{drawingPhoto5}}': { width: 450, height: 300 },
      '{{sitePhoto}}': { width: 300, height: 225 },
      '{{architecturalDrawing}}': { width: 600, height: 400 },
      '{{referencePhoto}}': { width: 300, height: 225 },
    };

    return dimensionMap[placeholder] || { width: 250, height: 200 };
  }

  /**
   * Process table placeholders
   */
  private async processTablePlaceholders(
    document: any,
    formData: Record<string, any>
  ): Promise<void> {
    console.log('📊 Processing table placeholders');

    // Example: Create dynamic tables for RFQ data
    const tableData = this.createRfqTableData(formData);

    // Replace table placeholders with actual table content
    // Actual docx library would handle table creation and population
  }

  /**
   * Create table data for RFQ submission
   */
  private createRfqTableData(formData: Record<string, any>): any[] {
    return [
      { label: 'Client Name', value: formData['clientName'] || '' },
      { label: 'Project Address', value: formData['standNum'] || '' },
      { label: 'Representative', value: formData['repName'] || '' },
      {
        label: 'Structure Type',
        value: Array.isArray(formData['structureType'])
          ? formData['structureType'].join(', ')
          : formData['structureType'] || '',
      },
      { label: 'Solar Loading', value: formData['isSolarLoading'] || '' },
      { label: 'Timeline', value: formData['roofTimeline'] || '' },
    ];
  }

  /**
   * Convert processed document to PDF
   */
  private async convertDocumentToPdf(document: any): Promise<Blob> {
    console.log('📄 Converting document to PDF');

    // Placeholder for PDF conversion
    // Actual implementation would use a PDF library or service
    // to convert the processed Word document to PDF

    // Return a notice that PDF conversion requires server-side implementation
    const noticeContent = `PDF Conversion Notice:

This document has been processed with the provided template and form data.
However, PDF conversion requires a server-side implementation with proper
document conversion libraries.

Please implement server-side PDF conversion using tools like:
- LibreOffice/OpenOffice headless conversion
- Microsoft Office Online conversion API
- Dedicated document conversion services

Document processed at: ${new Date().toISOString()}`;

    return new Blob([noticeContent], { type: 'text/plain' });
  }

  /**
   * Utility methods
   */
  private replaceInDocument(
    document: any,
    placeholder: string,
    value: string
  ): void {
    // Placeholder for actual document text replacement
    console.log(`Replacing ${placeholder} with ${value} in document`);
  }

  /**
   * Check if field is a date field
   */
  private isDateField(fieldName: string): boolean {
    const dateFields = [
      'dateSubmitted',
      'dateDue',
      'submissionDate',
      'dueDate',
      'drawings1',
      'drawings2',
      'drawings3',
      'drawings4',
      'drawings5',
    ];

    // Also check for field names containing 'date'
    return (
      dateFields.includes(fieldName) || fieldName.toLowerCase().includes('date')
    );
  }

  /**
   * Check if field is a boolean field
   */
  private isBooleanField(fieldName: string): boolean {
    const booleanFields = [
      'isSolarLoading',
      'isGeyserLoading',
      'isExposedTrussRequired',
      'gateAccess',
      'optionalP&G1',
      'isRepeatedSubmission',
    ];

    // Also check for field names starting with 'is' or 'has'
    return (
      booleanFields.includes(fieldName) ||
      fieldName.startsWith('is') ||
      fieldName.startsWith('has') ||
      fieldName.startsWith('optional')
    );
  }

  /**
   * Generate PDF content using basic PDF structure
   */
  private generateRfqPdfContent(formData: Record<string, any>): Blob {
    const submissionId = this.generateSubmissionId(formData);
    const currentDate = new Date().toLocaleDateString('en-ZA');
    const currentTime = new Date().toLocaleTimeString('en-ZA');

    // Create a basic PDF structure
    const pdfContent = this.createBasicPdf(
      formData,
      submissionId,
      currentDate,
      currentTime
    );

    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Create basic PDF structure with improved formatting
   */
  private createBasicPdf(
    formData: Record<string, any>,
    submissionId: string,
    currentDate: string,
    currentTime: string
  ): string {
    // Extract key information with proper formatting
    const clientName =
      this.formatValueForPdf(formData['clientName']) || 'Not Specified';
    const companyName =
      this.formatValueForPdf(formData['companyName']) || clientName;
    const repName =
      this.formatValueForPdf(formData['repName']) || 'Not Specified';
    const email =
      this.formatValueForPdf(formData['clientEmail']) || 'Not Specified';
    const phone =
      this.formatValueForPdf(formData['clientPhone']) || 'Not Specified';
    const standNum =
      this.formatValueForPdf(formData['standNum']) || 'Not Specified';
    const municipality =
      this.formatValueForPdf(formData['municipality']) || 'Not Specified';
    const timeline =
      this.formatValueForPdf(formData['roofTimeline']) || 'Not Specified';

    // Dates with proper formatting
    const dateSubmitted =
      this.formatValueForPdf(formData['dateSubmitted']) || 'Not Specified';
    const dateDue =
      this.formatValueForPdf(formData['dateDue']) || 'Not Specified';

    // Technical specifications
    const structureType =
      this.formatValueForPdf(formData['structureType']) || 'Not Specified';
    const serviceType =
      this.formatValueForPdf(formData['serviceType']) || 'Not Specified';
    const mainPitch =
      this.formatValueForPdf(formData['mainPitch']) || 'Not Specified';
    const maxSpacing =
      this.formatValueForPdf(formData['maxTrussSpacing']) || 'Not Specified';
    const buildingType =
      this.formatValueForPdf(formData['buildingType']) || 'Not Specified';

    // Create organized form data sections
    const formDataSections = this.createFormDataSections(formData);

    // Create PDF content stream with better formatting
    const contentStream = `BT
/F1 14 Tf
50 750 Td
18 TL
(REQUEST FOR QUOTE - RFQ)Tj
0 -20 Td
/F1 10 Tf
12 TL
(Generated: ${currentDate} at ${currentTime})Tj
0 -15 Td
(Submission ID: ${submissionId})Tj
0 -25 Td
/F1 12 Tf
15 TL
(CLIENT INFORMATION)Tj
0 -18 Td
/F1 10 Tf
12 TL
(Company: ${companyName})Tj
0 -12 Td
(Contact Person: ${clientName})Tj
0 -12 Td
(Representative: ${repName})Tj
0 -12 Td
(Email: ${email})Tj
0 -12 Td
(Phone: ${phone})Tj
0 -12 Td
(Stand/Erf: ${standNum})Tj
0 -12 Td
(Municipality: ${municipality})Tj
0 -25 Td
/F1 12 Tf
(PROJECT TIMELINE)Tj
0 -18 Td
/F1 10 Tf
(Date Submitted: ${dateSubmitted})Tj
0 -12 Td
(Date Due: ${dateDue})Tj
0 -12 Td
(Timeline: ${timeline})Tj
0 -25 Td
/F1 12 Tf
(TECHNICAL SPECIFICATIONS)Tj
0 -18 Td
/F1 10 Tf
(Building Type: ${buildingType})Tj
0 -12 Td
(Structure Type: ${structureType})Tj
0 -12 Td
(Service Type: ${serviceType})Tj
0 -12 Td
(Main Pitch: ${mainPitch})Tj
0 -12 Td
(Max Truss Spacing: ${maxSpacing}mm)Tj
0 -25 Td
/F1 12 Tf
(DETAILED FORM DATA)Tj
0 -18 Td
/F1 9 Tf
10 TL
${formDataSections}
ET`;

    // Calculate content length for PDF structure
    const contentLength = contentStream.length;

    // Basic PDF structure with proper xref table
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length ${contentLength}
>>
stream
${contentStream}
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000273 00000 n
0000000${(400 + contentLength).toString().padStart(6, '0')} 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${450 + contentLength}
%%EOF`;
  }

  /**
   * Create organized form data sections for PDF
   */
  private createFormDataSections(formData: Record<string, any>): string {
    const sections: string[] = [];

    // Group fields by category
    const categories = {
      Dates: ['dateSubmitted', 'dateDue'],
      Contact: ['repName', 'ccMail', 'clientType'],
      Location: ['standNum', 'municipality', 'buildingType'],
      Structure: ['structureType', 'maxTrussSpacing', 'mainPitch', 'pitch2'],
      Services: ['serviceType', 'ceilingType', 'wallCobbling'],
      Overhangs: ['eavesOverhang', 'gableOverhang', 'apexOverhang'],
      Specifications: ['ulaySpec', 'insSpec', 'trussSundry'],
      Loading: [
        'isSolarLoading',
        'solarLoadingArea',
        'isGeyserLoading',
        'geyserLoadingArea',
      ],
      'Exposed Truss': [
        'isExposedTrussRequired',
        'exposedTrussType',
        'exposedTrussType_2',
        'exposedTrussType_3',
      ],
      Notes: ['trussNotes', 'generalNotes'],
      Optional: ['optionalP&G1', 'p&g1Description', 'gateAccess'],
    };

    Object.entries(categories).forEach(([categoryName, fields]) => {
      const categoryData = fields
        .map((field) => {
          const value = this.formatValueForPdf(formData[field]);
          return value ? `(${field}: ${value})Tj 0 -10 Td` : '';
        })
        .filter((line) => line)
        .join(' ');

      if (categoryData) {
        sections.push(
          `(${categoryName.toUpperCase()}:)Tj 0 -12 Td ${categoryData} 0 -8 Td`
        );
      }
    });

    return sections.join(' ');
  }

  /**
   * Format values for PDF display with enhanced object handling
   */
  private formatValueForPdf(value: any): string {
    if (value === null || value === undefined) return '';

    if (Array.isArray(value)) {
      return value.map((item) => this.formatValueForPdf(item)).join(', ');
    }

    if (typeof value === 'object') {
      // Handle Date objects
      if (value instanceof Date) {
        return value.toLocaleDateString('en-ZA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }

      // Handle location objects that might have address properties
      if (value.address || value.location || value.name) {
        const parts = [];
        if (value.address) parts.push(value.address);
        if (value.location) parts.push(value.location);
        if (value.name) parts.push(value.name);
        if (value.city) parts.push(value.city);
        if (value.province) parts.push(value.province);
        return parts.join(', ');
      }

      // Handle objects with common properties
      if (value.value !== undefined) return String(value.value);
      if (value.label !== undefined) return String(value.label);
      if (value.text !== undefined) return String(value.text);

      // Try to extract meaningful data from object
      const keys = Object.keys(value);
      if (keys.length === 1) {
        return this.formatValueForPdf(value[keys[0]]);
      }

      // If object has multiple properties, create a readable summary
      if (keys.length > 0 && keys.length <= 5) {
        return keys
          .map((key) => `${key}: ${this.formatValueForPdf(value[key])}`)
          .join(', ');
      }

      // Fallback for complex objects
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Format date values with multiple format options
   */
  private formatDate(value: any): string {
    if (!value) return '';

    try {
      const date = new Date(value);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return String(value); // Return original value if not a valid date
      }

      // Return formatted date in South African format (DD/MM/YYYY)
      return date.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(value);
    }
  }

  /**
   * Format boolean values with enhanced representations
   */
  private formatBoolean(value: any): string {
    if (value === null || value === undefined) return '';

    // Handle different boolean representations
    const boolValue = this.parseBoolean(value);
    return boolValue ? 'Yes' : 'No';
  }

  /**
   * Validate that this is actually a Word document
   */
  private validateWordDocument(arrayBuffer: ArrayBuffer): boolean {
    try {
      // Check for DOCX magic numbers (ZIP file header)
      const header = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZip =
        header[0] === 0x50 &&
        header[1] === 0x4b &&
        header[2] === 0x03 &&
        header[3] === 0x04;

      if (!isZip) {
        console.warn(
          '❌ Document is not a valid ZIP-based file (DOCX format required)'
        );
        return false;
      }

      // Additional validation could check for [Content_Types].xml file
      console.log('✅ Document appears to be a valid DOCX file');
      return true;
    } catch (error) {
      console.error('❌ Error validating Word document:', error);
      return false;
    }
  }

  /**
   * Repair template placeholders that have formatting issues
   */
  private async repairTemplatePlaceholders(
    arrayBuffer: ArrayBuffer
  ): Promise<ArrayBuffer> {
  // Removed PizZip and docxtemplater-based repair logic. This method is now a stub.
  return arrayBuffer;
  }

  /**
   * Fix placeholders that are broken across XML formatting tags
   */
  private fixPlaceholdersAcrossXmlTags(content: string): string {
    console.log('🔧 Fixing placeholders across XML tags...');

    // Common patterns where Word splits placeholders across formatting tags
    const patterns = [
      // Pattern: {{<w:t>field</w:t>}} or similar
      /\{\{<[^>]*>([^<]*)<\/[^>]*>\}\}/g,

      // Pattern: {{field<w:t>}} or {{<w:t>field}}
      /\{\{([^}]*)<[^>]*>/g,
      /<[^>]*>([^}]*)\}\}/g,

      // Pattern: {{fie<w:t>ld}} where field name is split
      /\{\{([^}<]*)<[^>]*>([^}]*)\}\}/g,

      // More complex patterns with multiple XML tags
      /\{\{([^}<]*)<[^>]*>[^<]*<\/[^>]*>([^}]*)\}\}/g,
    ];

    // Apply fixes for each pattern
    patterns.forEach((pattern, index) => {
      const before = content.length;
      content = content.replace(pattern, (match, ...groups) => {
        // Reconstruct the placeholder without XML tags
        const fieldName = groups.filter((g) => g && g.trim()).join('');
        return `{{${fieldName}}}`;
      });
      const after = content.length;
      if (before !== after) {
        console.log(
          `✅ Fixed pattern ${index + 1}: ${before - after} characters changed`
        );
      }
    });

    return content;
  }

  /**
   * Fix common Word formatting issues that break placeholders
   */
  private fixWordFormattingIssues(content: string): string {
    console.log('🔧 Fixing Word formatting issues...');

    // Remove smart quotes that might break placeholders
    content = content.replace(/[""]/g, '"');
    content = content.replace(/['']/g, "'");

    // Fix spacing issues around placeholders
    content = content.replace(/\{\s*\{\s*/g, '{{');
    content = content.replace(/\s*\}\s*\}/g, '}}');

    // Fix placeholders with extra spaces
    content = content.replace(/\{\{\s*([^}]+)\s*\}\}/g, '{{$1}}');

    // Remove any zero-width characters that Word might insert
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

    return content;
  }

  /**
   * Extract all placeholders from content for validation
   */
  private extractPlaceholders(content: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }

  // ...existing code...

  /**
   * Load a DOCX document from an ArrayBuffer.
   * This is a stub implementation. Replace with actual docx library logic.
   */
  private async loadDocxDocument(arrayBuffer: ArrayBuffer): Promise<any> {
    // TODO: Replace with actual docx library logic, e.g., using docxtemplater or similar
    // For now, return a mock object with minimal API for downstream code
    return {
      getZip: () => ({
        generate: ({ type, mimeType }: { type: string; mimeType: string }) => arrayBuffer,
      }),
      render: (_data: any) => {},
    };
  }
}
