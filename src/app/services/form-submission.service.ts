import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { switchMap, catchError, tap, map } from 'rxjs/operators';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';
import { TemplateManagementService } from './template-management.service';
import { DocxProcessingService } from './docx-processing.service';
import { IndexedDbService } from './indexed-db.service';

import { EmailService } from './email.service';

export interface EmailStatus {
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  recipients?: string[];
  error?: string;
}

export interface FormSubmission {
  submissionId: string;
  formType: string;
  formTitle: string;
  formData: any;
  formStructure: FormSection[];
  status: 'draft' | 'submitted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  isRepeatedSubmission?: boolean;
  originalSubmissionId?: string;
  emailStatus?: EmailStatus;
  // Enhanced configuration tracking
  configurationId?: string;
  configurationName?: string;
  companyId?: string;
  configurationVersion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionService {
  private submissions: FormSubmission[] = [];
  private submissionsSubject = new BehaviorSubject<FormSubmission[]>([]);

  constructor(
    private templateService: TemplateManagementService,
    private emailService: EmailService,
    private docxService: DocxProcessingService,
    private indexedDbService: IndexedDbService
  ) {
    // Load from IndexedDB on service initialization
    this.loadSubmissionsFromStorage();
  }

  // Create new submission with enhanced PDF generation and email integration
  createSubmission(
    formType: string,
    formTitle: string,
    formData: any,
    formStructure: FormSection[]
  ): Observable<FormSubmission> {
    // Extract configuration metadata from form data
    const metadata = formData._metadata || {};

    const submission: FormSubmission = {
      submissionId: this.generateId(),
      formType,
      formTitle,
      formData: this.sanitizeForStorage(formData),
      formStructure: this.sanitizeFormStructure(formStructure),
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailStatus: { status: 'pending' },
      // Enhanced configuration tracking
      configurationId: metadata.configurationId,
      configurationName: metadata.configurationName,
      companyId: metadata.companyId,
      configurationVersion: metadata.configurationVersion
    };

    console.log('📝 Creating submission with configuration metadata:', {
      configurationId: submission.configurationId,
      configurationName: submission.configurationName,
      companyId: submission.companyId
    });

    // Save submission first
    this.submissions.push(submission);
    this.saveSubmissionsToStorage().subscribe({
      next: () => {
        this.submissionsSubject.next([...this.submissions]);
        console.log('✅ Submission saved to IndexedDB:', submission.submissionId);
      },
      error: (error) => {
        console.error('❌ Failed to save submission to IndexedDB:', error);
        // Remove from memory if save failed
        const index = this.submissions.findIndex(s => s.submissionId === submission.submissionId);
        if (index > -1) {
          this.submissions.splice(index, 1);
        }
        throw error;
      }
    });

    // Handle automatic email sending for RFQ submissions
    if (formType === 'rfq' || formType === 'RFQ') {
      // Use the original formData for processing (has all data for email/PDF generation)
      // but save sanitized version to IndexedDB
      this.sendRfqEmail(submission.submissionId, formData, formStructure).subscribe({
        next: (emailResult) => {
          submission.emailStatus = emailResult;
          this.updateSubmission(submission);
        },
        error: (error) => {
          submission.emailStatus = {
            status: 'failed',
            error: error.message
          };
          this.updateSubmission(submission);
        }
      });

      // ✅ Enhanced RFQ processing with PDF generation and distribution
      // Use original formData for processing
      this.processRfqWithDocx(formData).subscribe({
        next: (result: any) => {
          console.log('📄 RFQ processed successfully:', {
            pdfGenerated: !!result.pdfBlob,
            emailsSent: result.emailStatus.sent,
            googleDrive: !!result.googleDriveUrl,
            serverSaved: !!result.serverPath
          });
        },
        error: (error: any) => {
          console.error('❌ RFQ processing failed:', error);
        }
      });
    }

    return of(submission);
  }

  /**
   * Send RFQ email with enhanced PDF generation
   */
  private sendRfqEmail(
    submissionId: string,
    formData: any,
    formStructure: FormSection[]
  ): Observable<EmailStatus> {

    // Extract email addresses
    const ccMailAddresses = this.extractCcMailAddresses(formData);
    const clientEmail = formData.clientEmail;

    if (!clientEmail) {
      return of({
        status: 'failed',
        error: 'No client email address provided'
      });
    }

    if (!ccMailAddresses || ccMailAddresses.length === 0) {
      return of({
        status: 'failed',
        error: 'No CC email addresses provided'
      });
    }

    console.log('📧 Sending RFQ email to:', {
      client: clientEmail,
      cc: ccMailAddresses,
      submissionId: submissionId
    });

    // Enhanced email sending with docx support
    return this.emailService.sendRfqSubmissionEmailStructured(
      {
        ...formData,
        submissionId: submissionId,
        formTitle: 'Request for Quote'
      },
      ccMailAddresses,
      clientEmail
    ).pipe(
      switchMap(emailResponse => {
        if (emailResponse && typeof emailResponse === 'object' && 'success' in emailResponse) {
          const typedResponse = emailResponse as { success: boolean; error?: string };
          if (typedResponse.success) {
            return of({
              status: 'sent' as const,
              sentAt: new Date(),
              recipients: [clientEmail, ...ccMailAddresses]
            });
          } else {
            return of({
              status: 'failed' as const,
              error: typedResponse.error || 'Email sending failed'
            });
          }
        } else {
          return of({
            status: 'failed' as const,
            error: 'Invalid email response'
          });
        }
      }),
      catchError(error => {
        return of({
          status: 'failed' as const,
          error: error.message
        });
      })
    );
  }

  /**
   * Enhanced RFQ processing with docx template
   */
  private processRfqWithDocx(formData: any): Observable<any> {
    console.log('🔍 Looking for RFQ templates...');

    // Get RFQ templates
    return this.templateService.getTemplatesForForm('rfq').pipe(
      switchMap(templates => {
        console.log('📋 Found templates:', templates.length, templates.map(t => ({
          id: t.id,
          name: t.name,
          formType: t.formType,
          hasOriginalFile: !!t.originalFile,
          hasBinaryContent: !!t.binaryContent
        })));

        if (templates.length === 0) {
          console.warn('⚠️ No RFQ templates found, skipping docx processing');
          return of({ pdfBlob: null, emailStatus: { sent: false, recipients: [] } });
        }

        const template = templates[0]; // Use first available template
        console.log('📋 Using RFQ template:', template.name);

        // Check if this is an HTML template or a DOCX template
        if (template.name.includes('.html') || template.type === 'html') {
          console.log('🌐 HTML template detected, skipping DOCX processing');
          return of({
            pdfBlob: null,
            emailStatus: { sent: false, recipients: [], note: 'HTML template used - PDF generation handled elsewhere' }
          });
        }

        // Extract recipients
        const recipients = this.extractCcMailAddresses(formData);
        const clientEmail = formData['clientEmail'];

        // Process with enhanced docx service
        return this.docxService.processRfqSubmission(
          template,
          formData,
          recipients,
          clientEmail,
          {
            preserveStyles: true,
            preserveImages: true,
            preserveTables: true,
            outputFormat: 'pdf'
          }
        );
      }),
      catchError(error => {
        console.error('Error in docx processing:', error);
        return of({
          pdfBlob: null,
          emailStatus: { sent: false, recipients: [], error: error.message }
        });
      })
    );
  }

  /**
   * Update existing submission
   */
  private updateSubmission(updatedSubmission: FormSubmission): void {
    const index = this.submissions.findIndex(s => s.submissionId === updatedSubmission.submissionId);
    if (index !== -1) {
      updatedSubmission.updatedAt = new Date();

      // Sanitize data before saving to IndexedDB
      const sanitizedSubmission = {
        ...updatedSubmission,
        formData: this.sanitizeForStorage(updatedSubmission.formData),
        formStructure: this.sanitizeFormStructure(updatedSubmission.formStructure)
      };

      this.submissions[index] = updatedSubmission;

      this.indexedDbService.save(
        this.indexedDbService.STORES.SUBMISSIONS,
        sanitizedSubmission.submissionId,
        sanitizedSubmission
      ).subscribe({
        next: () => {
          this.submissionsSubject.next([...this.submissions]);
          console.log('✅ Submission updated in IndexedDB:', updatedSubmission.submissionId);
        },
        error: (error) => {
          console.error('❌ Failed to update submission in IndexedDB:', error);
        }
      });
    }
  }

  // Get all submissions
  getAllSubmissions(): Observable<FormSubmission[]> {
    return this.submissionsSubject.asObservable();
  }

  // Get single submission
  getSubmission(submissionId: string): Observable<FormSubmission | undefined> {
    const submission = this.submissions.find(s => s.submissionId === submissionId);
    return of(submission);
  }

  // Get submissions by company
  getSubmissionsByCompany(companyId: string): Observable<FormSubmission[]> {
    const companySubmissions = this.submissions.filter(s => s.companyId === companyId);
    return of(companySubmissions);
  }

  // Get submissions by configuration
  getSubmissionsByConfiguration(configurationId: string): Observable<FormSubmission[]> {
    const configSubmissions = this.submissions.filter(s => s.configurationId === configurationId);
    return of(configSubmissions);
  }

  // Get submissions by form type
  getSubmissionsByFormType(formType: string): Observable<FormSubmission[]> {
    const typeSubmissions = this.submissions.filter(s => s.formType === formType);
    return of(typeSubmissions);
  }

  // Get submission statistics
  getSubmissionStats(): Observable<any> {
    const stats = {
      total: this.submissions.length,
      byFormType: {} as Record<string, number>,
      byCompany: {} as Record<string, number>,
      byConfiguration: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recent: this.submissions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
    };

    this.submissions.forEach(submission => {
      // Count by form type
      stats.byFormType[submission.formType] = (stats.byFormType[submission.formType] || 0) + 1;

      // Count by company
      if (submission.companyId) {
        stats.byCompany[submission.companyId] = (stats.byCompany[submission.companyId] || 0) + 1;
      }

      // Count by configuration
      if (submission.configurationId) {
        stats.byConfiguration[submission.configurationId] = (stats.byConfiguration[submission.configurationId] || 0) + 1;
      }

      // Count by status
      stats.byStatus[submission.status] = (stats.byStatus[submission.status] || 0) + 1;
    });

    return of(stats);
  }

  // Delete submission
  deleteSubmission(submissionId: string): Observable<boolean> {
    const index = this.submissions.findIndex(s => s.submissionId === submissionId);
    if (index > -1) {
      this.submissions.splice(index, 1);
      return this.indexedDbService.delete(this.indexedDbService.STORES.SUBMISSIONS, submissionId).pipe(
        tap(() => {
          this.submissionsSubject.next([...this.submissions]);
          console.log('✅ Submission deleted from IndexedDB:', submissionId);
        }),
        catchError(error => {
          console.error('❌ Failed to delete submission from IndexedDB:', error);
          return of(false);
        })
      );
    }
    return of(false);
  }

  // Private helper methods
  private generateId(): string {
    return 'RFQ-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Extract CC mail addresses from form data
   */
  private extractCcMailAddresses(formData: any): string[] {
    const ccMail = formData.ccMail;
    if (Array.isArray(ccMail)) {
      return ccMail;
    } else if (typeof ccMail === 'string') {
      return [ccMail];
    }
    return [];
  }

  private saveSubmissionsToStorage(): Observable<void> {
    const itemsToSave = this.submissions.map(submission => ({
      id: submission.submissionId,
      data: {
        ...submission,
        formData: this.sanitizeForStorage(submission.formData),
        formStructure: this.sanitizeFormStructure(submission.formStructure)
      }
    }));

    return this.indexedDbService.saveAll(this.indexedDbService.STORES.SUBMISSIONS, itemsToSave).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('❌ Failed to save submissions to IndexedDB:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sanitize data to remove non-serializable properties (functions, etc.) before IndexedDB storage
   */
  private sanitizeForStorage(data: any): any {
    if (!data) return data;

    // Convert to JSON and back to remove functions and non-serializable data
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to sanitize data, using fallback sanitization:', error);
      return this.deepSanitize(data);
    }
  }

  /**
   * Deep sanitize form structure to remove validator functions
   */
  private sanitizeFormStructure(formStructure: FormSection[]): FormSection[] {
    if (!formStructure) return [];

    return formStructure.map(section => ({
      ...section,
      fields: section.fields?.map(field => {
        const sanitizedField: any = { ...field };

        // Remove validator functions
        if (sanitizedField.validators) {
          delete sanitizedField.validators;
        }

        // Remove any other function properties
        Object.keys(sanitizedField).forEach(key => {
          if (typeof (sanitizedField as any)[key] === 'function') {
            delete (sanitizedField as any)[key];
          }
        });

        return sanitizedField;
      }) || []
    }));
  }

  /**
   * Fallback deep sanitization for complex objects
   */
  private deepSanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'function') {
      return undefined; // Remove functions
    }

    if (obj instanceof Date) {
      return obj; // Keep dates as-is
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item)).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const sanitizedValue = this.deepSanitize(obj[key]);
          if (sanitizedValue !== undefined) {
            sanitized[key] = sanitizedValue;
          }
        }
      }
      return sanitized;
    }

    return obj; // Primitive values
  }

  private loadSubmissionsFromStorage(): void {
    // First try to migrate any existing localStorage data
    this.indexedDbService.migrateFromLocalStorage('gringo_submissions', this.indexedDbService.STORES.SUBMISSIONS).subscribe({
      next: () => {
        // After migration (or if no migration needed), load from IndexedDB
        this.loadFromIndexedDB();
      },
      error: (error) => {
        console.error('❌ Migration failed, loading from IndexedDB anyway:', error);
        this.loadFromIndexedDB();
      }
    });
  }

  private loadFromIndexedDB(): void {
    this.indexedDbService.getAll<FormSubmission>(this.indexedDbService.STORES.SUBMISSIONS).subscribe({
      next: (items) => {
        this.submissions = items.map(item => ({
          ...item.data,
          createdAt: new Date(item.data.createdAt),
          updatedAt: new Date(item.data.updatedAt)
        }));
        this.submissionsSubject.next([...this.submissions]);
        console.log('✅ Loaded submissions from IndexedDB:', this.submissions.length);
      },
      error: (error) => {
        console.error('❌ Failed to load submissions from IndexedDB:', error);
        // Fallback: keep empty array
        this.submissions = [];
        this.submissionsSubject.next([]);
      }
    });
  }
}
