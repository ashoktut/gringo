import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'cc' | 'to' | 'client';
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
  type: string;
}

export interface EmailRequest {
  to: EmailRecipient[];
  cc: EmailRecipient[];
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  submissionId: string;
  formType: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  /**
   * Send RFQ submission email with PDF attachment
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body content
   * @param pdfBlob - PDF file as Blob
   * @param filename - PDF filename
   * @returns Observable with email status
   */
  sendRfqSubmissionEmail(
    to: string,
    subject: string,
    body: string,
    pdfBlob?: Blob,
    filename?: string
  ): Observable<{success: boolean, messageId?: string, error?: string}> {
    console.log('📧 Sending email to:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 Body preview:', body.substring(0, 100) + '...');
    if (pdfBlob && filename) {
      console.log('📧 PDF attachment:', filename, `(${pdfBlob.size} bytes)`);
    }

    // Mock implementation - replace with actual email service
    return of({
      success: true,
      messageId: `mock-email-${Date.now()}`
    });
  }

  /**
   * Send structured RFQ submission email with template support
   */
  sendRfqSubmissionEmailStructured(
    submissionData: any,
    ccMailAddresses: string[],
    clientEmail: string,
    templateId?: string
  ): Observable<EmailResponse> {
    console.log('📧 Sending structured RFQ email');
    console.log('� Recipients:', [...ccMailAddresses, clientEmail]);

    // Create mock email request
    const emailRequest = this.buildEmailRequest(
      submissionData,
      ccMailAddresses,
      clientEmail,
      'mock-pdf-content-base64',
      undefined
    );

    return this.sendEmail(emailRequest);
  }

  /**
   * Send RFQ email - compatibility method for FormSubmissionService
   */
  sendRfqEmail(submissionId: string, formData: any, formStructure: any[]): Observable<any> {
    const ccMailAddresses = this.extractCcMailAddresses(formData);
    const clientEmail = formData.clientEmail || '';

    if (!clientEmail && ccMailAddresses.length === 0) {
      return of({
        success: false,
        error: 'No email recipients provided'
      });
    }

    return this.sendRfqSubmissionEmailStructured(
      formData,
      ccMailAddresses,
      clientEmail
    );
  }  /**
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

  private buildEmailRequest(
    submissionData: any,
    ccMailAddresses: string[],
    clientEmail: string,
    pdfContent: string,
    template?: any
  ): EmailRequest {
    const submissionId = submissionData.submissionId || 'RFQ-' + Date.now();
    const clientName = submissionData.clientName || 'Client';

    console.log('📧 Building email for submission:', submissionId);

    const toRecipients: EmailRecipient[] = [
      { email: clientEmail, name: clientName, type: 'client' }
    ];

    const ccRecipients: EmailRecipient[] = ccMailAddresses.map(email => ({
      email,
      type: 'cc' as const
    }));

    const siteInfo = submissionData.standNum || submissionData.clientName || 'Project';
    const subject = `New RFQ Submission - ${clientName} - ${siteInfo}`;

    const body = this.generateEmailBody(submissionData);

    const attachment: EmailAttachment = {
      filename: `RFQ-${submissionId}-${clientName.replace(/\s+/g, '-')}.pdf`,
      content: pdfContent,
      type: 'application/pdf'
    };

    console.log('📎 Email attachment:', attachment.filename);

    return {
      to: toRecipients,
      cc: ccRecipients,
      subject,
      body,
      attachments: [attachment],
      submissionId,
      formType: 'RFQ'
    };
  }

  private generateEmailBody(submissionData: any): string {
    const clientName = submissionData.clientName || 'Client';
    const standNum = submissionData.standNum || 'Project Location';
    const repName = submissionData.repName || 'Representative';
    const submissionId = submissionData.submissionId || 'N/A';

    return `Dear ${clientName},

Thank you for your Request for Quote (RFQ) submission. We have received your requirements and our team will review them shortly.

**RFQ Details:**
- Submission ID: ${submissionId}
- Project Location: ${standNum}
- Assigned Representative: ${repName}
- Submission Date: ${new Date().toLocaleDateString()}

Your RFQ has been generated and is attached as a PDF document.

Best regards,
The RFQ Processing Team`;
  }

  private sendEmail(emailRequest: EmailRequest): Observable<EmailResponse> {
    return new Observable(observer => {
      console.log('📧 Sending email:', {
        to: emailRequest.to.map(r => r.email),
        cc: emailRequest.cc.map(r => r.email),
        subject: emailRequest.subject,
        attachments: emailRequest.attachments?.length || 0
      });

      setTimeout(() => {
        observer.next({
          success: true,
          messageId: 'email-' + Date.now()
        });
        observer.complete();
      }, 1000);
    });
  }
}
