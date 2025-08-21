import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';
import { TemplateManagementService } from './template-management.service';
import { DocxProcessingService } from './docx-processing.service';

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
    private docxService: DocxProcessingService
  ) {
    // Load from localStorage on service initialization
    this.loadSubmissionsFromStorage();
  }

  // Create new submission with enhanced PDF generation and email integration
  createSubmission(
    formType: string,
    formTitle: string,
    formData: any,
    formStructure: FormSection[]
  ): Observable<FormSubmission> {
    const submission: FormSubmission = {
      submissionId: this.generateId(),
      formType,
      formTitle,
      formData,
      formStructure,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailStatus: { status: 'pending' }
    };

    // Save submission first
    this.submissions.push(submission);
    this.saveSubmissionsToStorage();
    this.submissionsSubject.next([...this.submissions]);

    // Handle automatic email sending for RFQ submissions
    if (formType === 'RFQ') {
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
      this.submissions[index] = updatedSubmission;
      this.saveSubmissionsToStorage();
      this.submissionsSubject.next([...this.submissions]);
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

  // Delete submission
  deleteSubmission(submissionId: string): Observable<boolean> {
    const index = this.submissions.findIndex(s => s.submissionId === submissionId);
    if (index > -1) {
      this.submissions.splice(index, 1);
      this.saveSubmissionsToStorage();
      this.submissionsSubject.next([...this.submissions]);
      return of(true);
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

  private saveSubmissionsToStorage(): void {
    localStorage.setItem('gringo_submissions', JSON.stringify(this.submissions));
  }

  private loadSubmissionsFromStorage(): void {
    const stored = localStorage.getItem('gringo_submissions');
    if (stored) {
      this.submissions = JSON.parse(stored).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }));
      this.submissionsSubject.next([...this.submissions]);
    }
  }
}
