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
   * Send structured RFQ submission email
   */
  sendRfqSubmissionEmailStructured(
    submissionData: any,
    ccMailAddresses: string[],
    clientEmail: string,
    templateId?: string
  ): Observable<EmailResponse> {
    console.log('📧 Sending structured RFQ email');
    console.log('📧 Recipients:', [...ccMailAddresses, clientEmail]);

    // Mock implementation
    return of({
      success: true,
      messageId: `structured-email-${Date.now()}`
    });
  }
}
