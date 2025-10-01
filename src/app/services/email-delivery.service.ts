import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, retry, delay, switchMap } from 'rxjs/operators';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[]; // List of available template variables like {{submissionId}}, {{userName}}
  isDefault?: boolean;
  companyId?: string;
  formType?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

export interface EmailAttachment {
  filename: string;
  content: string | Blob | File; // Base64 string, Blob, or File
  contentType: string;
  size?: number;
}

export interface EmailDeliveryOptions {
  templateId?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  recipients: EmailRecipient[];
  attachments?: EmailAttachment[];
  variables?: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  replyTo?: string;
  tags?: string[];
  trackOpening?: boolean;
  trackClicks?: boolean;
}

export interface EmailDeliveryStatus {
  id: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'spam';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  trackingData?: {
    opened?: boolean;
    openedAt?: Date;
    clickCount?: number;
    lastClickAt?: Date;
  };
}

export interface EmailNotificationRule {
  id: string;
  name: string;
  trigger: 'form_submitted' | 'form_draft_saved' | 'template_updated' | 'sync_failed' | 'custom';
  conditions?: {
    formTypes?: string[];
    companies?: string[];
    fieldValues?: Record<string, any>;
  };
  emailTemplate: EmailTemplate;
  recipients: EmailRecipient[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmailDeliveryService {
  private readonly http = inject(HttpClient);
  
  private readonly API_BASE = '/api/email';
  private readonly templates$ = new BehaviorSubject<EmailTemplate[]>([]);
  private readonly deliveryStatus$ = new BehaviorSubject<Map<string, EmailDeliveryStatus>>(new Map());
  private readonly notificationRules$ = new BehaviorSubject<EmailNotificationRule[]>([]);

  constructor() {
    this.loadEmailTemplates();
    this.loadNotificationRules();
  }

  // Template Management
  get emailTemplates(): Observable<EmailTemplate[]> {
    return this.templates$.asObservable();
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    try {
      const response = await this.http.post<EmailTemplate>(`${this.API_BASE}/templates`, template).toPromise();
      
      if (response) {
        const currentTemplates = this.templates$.value;
        this.templates$.next([...currentTemplates, response]);
        return response;
      }
      
      throw new Error('Failed to create email template');
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }

  async updateEmailTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    try {
      const response = await this.http.put<EmailTemplate>(`${this.API_BASE}/templates/${templateId}`, updates).toPromise();
      
      if (response) {
        const currentTemplates = this.templates$.value;
        const updatedTemplates = currentTemplates.map(t => t.id === templateId ? response : t);
        this.templates$.next(updatedTemplates);
        return response;
      }
      
      throw new Error('Failed to update email template');
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  }

  async deleteEmailTemplate(templateId: string): Promise<void> {
    try {
      await this.http.delete(`${this.API_BASE}/templates/${templateId}`).toPromise();
      
      const currentTemplates = this.templates$.value;
      const filteredTemplates = currentTemplates.filter(t => t.id !== templateId);
      this.templates$.next(filteredTemplates);
    } catch (error) {
      console.error('Error deleting email template:', error);
      throw error;
    }
  }

  // Email Delivery
  async sendEmail(options: EmailDeliveryOptions): Promise<string> {
    try {
      // Validate email options
      this.validateEmailOptions(options);

      // Prepare email payload
      const emailPayload = await this.prepareEmailPayload(options);

      // Send email
      const response = await this.http.post<{ id: string; status: string }>(`${this.API_BASE}/send`, emailPayload).toPromise();
      
      if (response) {
        // Track delivery status
        const deliveryStatus: EmailDeliveryStatus = {
          id: response.id,
          status: 'queued',
          retryCount: 0,
          maxRetries: 3
        };
        
        const currentStatuses = this.deliveryStatus$.value;
        currentStatuses.set(response.id, deliveryStatus);
        this.deliveryStatus$.next(new Map(currentStatuses));
        
        // Start tracking delivery status
        this.trackDeliveryStatus(response.id);
        
        return response.id;
      }
      
      throw new Error('Failed to send email');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendBulkEmails(emailOptions: EmailDeliveryOptions[]): Promise<string[]> {
    try {
      const emailPayloads = await Promise.all(
        emailOptions.map(options => this.prepareEmailPayload(options))
      );

      const response = await this.http.post<{ ids: string[] }>(`${this.API_BASE}/send-bulk`, {
        emails: emailPayloads
      }).toPromise();
      
      if (response) {
        // Track all delivery statuses
        response.ids.forEach(id => {
          const deliveryStatus: EmailDeliveryStatus = {
            id,
            status: 'queued',
            retryCount: 0,
            maxRetries: 3
          };
          
          const currentStatuses = this.deliveryStatus$.value;
          currentStatuses.set(id, deliveryStatus);
          this.deliveryStatus$.next(new Map(currentStatuses));
          
          this.trackDeliveryStatus(id);
        });
        
        return response.ids;
      }
      
      throw new Error('Failed to send bulk emails');
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      throw error;
    }
  }

  // Form Submission Email Notifications
  async sendFormSubmissionNotification(submissionData: any, formType: string, companyId: string): Promise<void> {
    try {
      // Find applicable notification rules
      const rules = this.notificationRules$.value.filter(rule => 
        rule.isActive &&
        rule.trigger === 'form_submitted' &&
        this.matchesConditions(rule.conditions, { formType, companyId, submissionData })
      );

      if (rules.length === 0) {
        console.log('No notification rules found for form submission');
        return;
      }

      // Send notifications for each matching rule
      const notifications = rules.map(async rule => {
        const emailOptions: EmailDeliveryOptions = {
          templateId: rule.emailTemplate.id,
          recipients: rule.recipients,
          variables: {
            ...submissionData,
            formType,
            companyId,
            submissionDate: new Date().toISOString(),
            submissionId: submissionData.id || Date.now().toString()
          },
          priority: 'normal',
          tags: ['form_submission', formType, companyId],
          trackOpening: true
        };

        const emailId = await this.sendEmail(emailOptions);
        
        // Update rule statistics
        rule.lastTriggered = new Date();
        rule.triggerCount++;
        
        return emailId;
      });

      await Promise.all(notifications);
      
      // Update notification rules
      this.notificationRules$.next([...this.notificationRules$.value]);
      
    } catch (error) {
      console.error('Error sending form submission notification:', error);
      throw error;
    }
  }

  // Notification Rules Management
  get notificationRules(): Observable<EmailNotificationRule[]> {
    return this.notificationRules$.asObservable();
  }

  async createNotificationRule(rule: Omit<EmailNotificationRule, 'id' | 'createdAt' | 'triggerCount'>): Promise<EmailNotificationRule> {
    try {
      const newRule: EmailNotificationRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        triggerCount: 0
      };

      const response = await this.http.post<EmailNotificationRule>(`${this.API_BASE}/notification-rules`, newRule).toPromise();
      
      if (response) {
        const currentRules = this.notificationRules$.value;
        this.notificationRules$.next([...currentRules, response]);
        return response;
      }
      
      throw new Error('Failed to create notification rule');
    } catch (error) {
      console.error('Error creating notification rule:', error);
      throw error;
    }
  }

  async updateNotificationRule(ruleId: string, updates: Partial<EmailNotificationRule>): Promise<EmailNotificationRule> {
    try {
      const response = await this.http.put<EmailNotificationRule>(`${this.API_BASE}/notification-rules/${ruleId}`, updates).toPromise();
      
      if (response) {
        const currentRules = this.notificationRules$.value;
        const updatedRules = currentRules.map(r => r.id === ruleId ? response : r);
        this.notificationRules$.next(updatedRules);
        return response;
      }
      
      throw new Error('Failed to update notification rule');
    } catch (error) {
      console.error('Error updating notification rule:', error);
      throw error;
    }
  }

  async deleteNotificationRule(ruleId: string): Promise<void> {
    try {
      await this.http.delete(`${this.API_BASE}/notification-rules/${ruleId}`).toPromise();
      
      const currentRules = this.notificationRules$.value;
      const filteredRules = currentRules.filter(r => r.id !== ruleId);
      this.notificationRules$.next(filteredRules);
    } catch (error) {
      console.error('Error deleting notification rule:', error);
      throw error;
    }
  }

  // Delivery Status Tracking
  get deliveryStatuses(): Observable<Map<string, EmailDeliveryStatus>> {
    return this.deliveryStatus$.asObservable();
  }

  getDeliveryStatus(emailId: string): Observable<EmailDeliveryStatus | undefined> {
    return this.deliveryStatuses.pipe(
      map(statuses => statuses.get(emailId))
    );
  }

  private async trackDeliveryStatus(emailId: string): Promise<void> {
    try {
      // Poll for status updates
      const maxAttempts = 10;
      let attempts = 0;

      const pollStatus = async (): Promise<void> => {
        if (attempts >= maxAttempts) return;

        try {
          const response = await this.http.get<EmailDeliveryStatus>(`${this.API_BASE}/status/${emailId}`).toPromise();
          
          if (response) {
            const currentStatuses = this.deliveryStatus$.value;
            currentStatuses.set(emailId, response);
            this.deliveryStatus$.next(new Map(currentStatuses));
            
            // Continue polling if still in progress
            if (response.status === 'queued' || response.status === 'sending') {
              attempts++;
              setTimeout(pollStatus, 2000 * Math.pow(2, attempts)); // Exponential backoff
            }
          }
        } catch (error) {
          console.error(`Error tracking delivery status for email ${emailId}:`, error);
        }
      };

      // Start polling
      setTimeout(pollStatus, 1000);
    } catch (error) {
      console.error('Error setting up delivery status tracking:', error);
    }
  }

  // Utility Methods
  private async loadEmailTemplates(): Promise<void> {
    try {
      const templates = await this.http.get<EmailTemplate[]>(`${this.API_BASE}/templates`).toPromise();
      if (templates) {
        this.templates$.next(templates);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
      // Load default templates
      this.loadDefaultTemplates();
    }
  }

  private async loadNotificationRules(): Promise<void> {
    try {
      const rules = await this.http.get<EmailNotificationRule[]>(`${this.API_BASE}/notification-rules`).toPromise();
      if (rules) {
        this.notificationRules$.next(rules);
      }
    } catch (error) {
      console.error('Error loading notification rules:', error);
    }
  }

  private loadDefaultTemplates(): void {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'form-submission-default',
        name: 'Form Submission Notification',
        subject: 'New Form Submission: {{formType}}',
        htmlContent: `
          <h2>New Form Submission Received</h2>
          <p><strong>Form Type:</strong> {{formType}}</p>
          <p><strong>Submitted By:</strong> {{userName || 'Anonymous'}}</p>
          <p><strong>Submission Date:</strong> {{submissionDate}}</p>
          <p><strong>Company:</strong> {{companyName}}</p>
          
          <h3>Submission Details:</h3>
          <div>{{submissionSummary}}</div>
          
          <p><a href="{{dashboardUrl}}/submissions/{{submissionId}}">View Full Submission</a></p>
        `,
        textContent: `
          New Form Submission Received
          
          Form Type: {{formType}}
          Submitted By: {{userName || 'Anonymous'}}
          Submission Date: {{submissionDate}}
          Company: {{companyName}}
          
          View submission: {{dashboardUrl}}/submissions/{{submissionId}}
        `,
        variables: ['formType', 'userName', 'submissionDate', 'companyName', 'submissionSummary', 'submissionId', 'dashboardUrl'],
        isDefault: true
      }
    ];

    this.templates$.next(defaultTemplates);
  }

  private async prepareEmailPayload(options: EmailDeliveryOptions): Promise<any> {
    let finalContent = {
      subject: options.subject || '',
      htmlContent: options.htmlContent || '',
      textContent: options.textContent || ''
    };

    // If template ID provided, load template and merge with variables
    if (options.templateId) {
      const template = this.templates$.value.find(t => t.id === options.templateId);
      if (template) {
        finalContent = {
          subject: this.replaceVariables(template.subject, options.variables || {}),
          htmlContent: this.replaceVariables(template.htmlContent, options.variables || {}),
          textContent: template.textContent ? this.replaceVariables(template.textContent, options.variables || {}) : ''
        };
      }
    }

    // Process attachments
    const processedAttachments = options.attachments ? 
      await Promise.all(options.attachments.map(att => this.processAttachment(att))) : [];

    return {
      ...finalContent,
      recipients: options.recipients,
      attachments: processedAttachments,
      priority: options.priority || 'normal',
      scheduledAt: options.scheduledAt,
      replyTo: options.replyTo,
      tags: options.tags || [],
      trackOpening: options.trackOpening || false,
      trackClicks: options.trackClicks || false
    };
  }

  private async processAttachment(attachment: EmailAttachment): Promise<any> {
    let content = attachment.content;

    // Convert File or Blob to base64
    if (attachment.content instanceof File || attachment.content instanceof Blob) {
      content = await this.blobToBase64(attachment.content as Blob);
    }

    return {
      filename: attachment.filename,
      content: content,
      contentType: attachment.contentType,
      size: attachment.size
    };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    // Handle conditional expressions like {{userName || 'Anonymous'}}
    result = result.replace(/{{\s*(\w+)\s*\|\|\s*['"](.*?)['"]s*}}/g, (match, varName, fallback) => {
      return variables[varName] || fallback;
    });

    return result;
  }

  private validateEmailOptions(options: EmailDeliveryOptions): void {
    if (!options.recipients || options.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!options.templateId && !options.subject) {
      throw new Error('Either templateId or subject is required');
    }

    if (!options.templateId && !options.htmlContent && !options.textContent) {
      throw new Error('Either templateId or content (HTML/text) is required');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    options.recipients.forEach(recipient => {
      if (!emailRegex.test(recipient.email)) {
        throw new Error(`Invalid email address: ${recipient.email}`);
      }
    });
  }

  private matchesConditions(conditions: any, context: any): boolean {
    if (!conditions) return true;

    // Check form types
    if (conditions.formTypes && conditions.formTypes.length > 0) {
      if (!conditions.formTypes.includes(context.formType)) {
        return false;
      }
    }

    // Check companies
    if (conditions.companies && conditions.companies.length > 0) {
      if (!conditions.companies.includes(context.companyId)) {
        return false;
      }
    }

    // Check field values
    if (conditions.fieldValues) {
      for (const [fieldName, expectedValue] of Object.entries(conditions.fieldValues)) {
        const actualValue = context.submissionData[fieldName];
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }
}