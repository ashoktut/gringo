import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import {
  EnhancedFormConfiguration,
  FormSubmission,
  PdfTemplateLayout,
  FormQueryParams,
  SubmissionQueryParams,
  FormTemplateStatus,
  FormSubmissionStatus,
  ApiResponse,
  PaginatedResponse
} from '../models/form.models';
import { NotificationService } from './notification.service';

/**
 * UNIFIED Form Management Service
 *
 * Consolidates functionality from:
 * - FormConfigService (2093 lines)
 * - FormBuilderTemplateService
 * - EnhancedFormConfigService (667 lines)
 *
 * Provides complete form management including:
 * - CRUD operations for forms
 * - Template management
 * - Submission handling
 * - PDF template operations
 * - Role assignment
 * - Approval workflow
 *
 * @version 2.0.0
 * @author Consolidated Service
 */
@Injectable({
  providedIn: 'root'
})
export class FormService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly API_BASE = '/api/v1/forms';

  // ==================== State Management ====================

  private formsSignal = signal<EnhancedFormConfiguration[]>([]);
  private submissionsSignal = signal<FormSubmission[]>([]);
  private pdfTemplatesSignal = signal<PdfTemplateLayout[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Public Readonly Signals
  readonly forms = this.formsSignal.asReadonly();
  readonly submissions = this.submissionsSignal.asReadonly();
  readonly pdfTemplates = this.pdfTemplatesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // ==================== Computed Values ====================

  readonly activeForms = computed(() =>
    this.forms().filter(f => f.status === FormTemplateStatus.ACTIVE)
  );

  readonly draftForms = computed(() =>
    this.forms().filter(f => f.status === FormTemplateStatus.DRAFT)
  );

  readonly archivedForms = computed(() =>
    this.forms().filter(f => f.status === FormTemplateStatus.ARCHIVED)
  );

  readonly myCompanyForms = computed(() => {
    // Filter by current user's company (implement based on auth)
    return this.forms();
  });

  readonly myAccessibleForms = computed(() => {
    // Filter based on user roles (implement based on auth)
    return this.activeForms();
  });

  readonly pendingApprovals = computed(() =>
    this.submissions().filter(s => s.status === FormSubmissionStatus.UNDER_REVIEW)
  );

  readonly draftSubmissions = computed(() =>
    this.submissions().filter(s => s.status === FormSubmissionStatus.DRAFT)
  );

  readonly approvedSubmissions = computed(() =>
    this.submissions().filter(s => s.status === FormSubmissionStatus.APPROVED)
  );

  readonly rejectedSubmissions = computed(() =>
    this.submissions().filter(s => s.status === FormSubmissionStatus.REJECTED)
  );

  // ==================== CRUD Operations ====================

  /**
   * Load all form configurations with optional filters
   */
  loadForms(params?: FormQueryParams): Observable<PaginatedResponse<EnhancedFormConfiguration>> {
    this.loadingSignal.set(true);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<ApiResponse<PaginatedResponse<EnhancedFormConfiguration>>>(
      `${this.API_BASE}/configurations`,
      { params: httpParams }
    ).pipe(
      map(response => response.data),
      tap(data => {
        this.formsSignal.set(data.items);
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to load forms', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Load company-specific forms
   */
  loadCompanyForms(): Observable<EnhancedFormConfiguration[]> {
    return this.loadForms({ pageSize: 100 }).pipe(
      map(response => response.items)
    );
  }

  /**
   * Get all form configurations (backward compatibility)
   */
  getAllFormConfigs(): Observable<EnhancedFormConfiguration[]> {
    return this.loadCompanyForms();
  }

  /**
   * Get a single form configuration by ID
   */
  getFormConfiguration(id: string): Observable<EnhancedFormConfiguration> {
    this.loadingSignal.set(true);

    return this.http.get<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}`
    ).pipe(
      map(response => response.data),
      tap(form => {
        // Update in local state
        this.formsSignal.update(forms => {
          const index = forms.findIndex(f => f.id === id);
          if (index >= 0) {
            const updated = [...forms];
            updated[index] = form;
            return updated;
          }
          return [...forms, form];
        });
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to load form configuration', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Create a new form configuration
   */
  createFormConfiguration(data: Partial<EnhancedFormConfiguration>): Observable<EnhancedFormConfiguration> {
    this.loadingSignal.set(true);

    return this.http.post<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations`,
      data
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms => [...forms, form]);
        this.notificationService.showSuccess('Form created successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to create form', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Update an existing form configuration
   */
  updateFormConfiguration(id: string, data: Partial<EnhancedFormConfiguration>): Observable<EnhancedFormConfiguration> {
    this.loadingSignal.set(true);

    return this.http.put<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}`,
      data
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === id ? form : f)
        );
        this.notificationService.showSuccess('Form updated successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to update form', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Save form configuration (create or update)
   */
  saveFormConfig(config: Partial<EnhancedFormConfiguration>): Observable<EnhancedFormConfiguration> {
    if (config.id) {
      return this.updateFormConfiguration(config.id, config);
    } else {
      return this.createFormConfiguration(config);
    }
  }

  /**
   * Delete a form configuration
   */
  deleteFormConfiguration(id: string): Observable<void> {
    this.loadingSignal.set(true);

    return this.http.delete<void>(`${this.API_BASE}/configurations/${id}`).pipe(
      tap(() => {
        this.formsSignal.update(forms => forms.filter(f => f.id !== id));
        this.notificationService.showSuccess('Form deleted successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to delete form', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Delete form config (backward compatibility)
   */
  deleteFormConfig(id: string): Observable<void> {
    return this.deleteFormConfiguration(id);
  }

  /**
   * Update form status (activate, deactivate, archive)
   */
  updateFormStatus(id: string, status: FormTemplateStatus): Observable<EnhancedFormConfiguration> {
    return this.http.patch<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}/status`,
      { status }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === id ? form : f)
        );
        this.notificationService.showSuccess(`Form ${status.toLowerCase()} successfully`);
      }),
      catchError(error => {
        this.handleError('Failed to update form status', error);
        throw error;
      })
    );
  }

  // ==================== Template Management ====================

  /**
   * Get all available form builder templates
   */
  getBuilderTemplates(): any[] {
    return [
      {
        id: 'blank',
        name: 'Blank Form',
        description: 'Start with a blank form',
        icon: 'note_add',
        category: 'general'
      },
      {
        id: 'contact',
        name: 'Contact Form',
        description: 'Basic contact information',
        icon: 'contact_mail',
        category: 'general'
      },
      {
        id: 'survey',
        name: 'Survey',
        description: 'Customer satisfaction survey',
        icon: 'poll',
        category: 'feedback'
      },
      {
        id: 'feedback',
        name: 'Feedback Form',
        description: 'Collect user feedback',
        icon: 'feedback',
        category: 'feedback'
      },
      {
        id: 'registration',
        name: 'Registration Form',
        description: 'Event or service registration',
        icon: 'how_to_reg',
        category: 'registration'
      },
      {
        id: 'application',
        name: 'Application Form',
        description: 'Job or program application',
        icon: 'description',
        category: 'registration'
      },
      {
        id: 'rfq',
        name: 'RFQ Template',
        description: 'Request for Quotation',
        icon: 'request_quote',
        category: 'business'
      }
    ];
  }

  /**
   * Get all templates (backward compatibility)
   */
  getAllTemplates(): any[] {
    return this.getBuilderTemplates();
  }

  /**
   * Convert template ID to form configuration
   */
  templateToFormConfiguration(templateId: string): Partial<EnhancedFormConfiguration> {
    const templates: Record<string, () => Partial<EnhancedFormConfiguration>> = {
      blank: () => this.createBlankTemplate(),
      contact: () => this.createContactTemplate(),
      survey: () => this.createSurveyTemplate(),
      feedback: () => this.createFeedbackTemplate(),
      registration: () => this.createRegistrationTemplate(),
      application: () => this.createApplicationTemplate(),
      rfq: () => this.createRfqTemplate()
    };

    const templateFn = templates[templateId];
    return templateFn ? templateFn() : this.createBlankTemplate();
  }

  /**
   * Get comprehensive RFQ configuration (backward compatibility)
   */
  getComprehensiveRfqConfiguration(): Partial<EnhancedFormConfiguration> {
    return this.createRfqTemplate();
  }

  /**
   * Create custom configuration (backward compatibility)
   */
  createCustomConfiguration(): Partial<EnhancedFormConfiguration> {
    return this.createBlankTemplate();
  }

  // ==================== Template Definitions ====================

  private createBlankTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'New Form',
      description: '',
      fields: [],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: true,
      requiresApproval: false,
      notifyOnSubmission: false,
      allowedRoleIds: []
    };
  }

  private createContactTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Contact Form',
      description: 'Basic contact information form',
      fields: [
        {
          id: 'fullName',
          type: 'TEXT',
          label: 'Full Name',
          name: 'fullName',
          placeholder: 'Enter your full name',
          validation: { required: true },
          order: 1
        },
        {
          id: 'email',
          type: 'EMAIL',
          label: 'Email Address',
          name: 'email',
          placeholder: 'your.email@example.com',
          validation: { required: true },
          order: 2
        },
        {
          id: 'phone',
          type: 'PHONE',
          label: 'Phone Number',
          name: 'phone',
          placeholder: '+1 (555) 123-4567',
          validation: { required: false },
          order: 3
        },
        {
          id: 'message',
          type: 'TEXTAREA',
          label: 'Message',
          name: 'message',
          placeholder: 'Your message here...',
          validation: { required: true, minLength: 10 },
          order: 4
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: true,
      requiresApproval: false,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  private createSurveyTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Customer Survey',
      description: 'Customer satisfaction survey',
      fields: [
        {
          id: 'satisfaction',
          type: 'RADIO',
          label: 'How satisfied are you with our service?',
          name: 'satisfaction',
          options: [
            { value: 'very_satisfied', label: 'Very Satisfied' },
            { value: 'satisfied', label: 'Satisfied' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'dissatisfied', label: 'Dissatisfied' },
            { value: 'very_dissatisfied', label: 'Very Dissatisfied' }
          ],
          validation: { required: true },
          order: 1
        },
        {
          id: 'recommend',
          type: 'SELECT',
          label: 'Would you recommend us to others?',
          name: 'recommend',
          options: [
            { value: 'definitely', label: 'Definitely' },
            { value: 'probably', label: 'Probably' },
            { value: 'not_sure', label: 'Not Sure' },
            { value: 'probably_not', label: 'Probably Not' },
            { value: 'definitely_not', label: 'Definitely Not' }
          ],
          validation: { required: true },
          order: 2
        },
        {
          id: 'feedback',
          type: 'TEXTAREA',
          label: 'Additional Feedback',
          name: 'feedback',
          placeholder: 'Please share your thoughts...',
          validation: { required: false },
          order: 3
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: false,
      requiresApproval: false,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  private createFeedbackTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Feedback Form',
      description: 'Collect user feedback',
      fields: [
        {
          id: 'category',
          type: 'SELECT',
          label: 'Feedback Category',
          name: 'category',
          options: [
            { value: 'bug', label: 'Bug Report' },
            { value: 'feature', label: 'Feature Request' },
            { value: 'improvement', label: 'Improvement Suggestion' },
            { value: 'other', label: 'Other' }
          ],
          validation: { required: true },
          order: 1
        },
        {
          id: 'title',
          type: 'TEXT',
          label: 'Title',
          name: 'title',
          placeholder: 'Brief description',
          validation: { required: true, maxLength: 100 },
          order: 2
        },
        {
          id: 'description',
          type: 'TEXTAREA',
          label: 'Detailed Description',
          name: 'description',
          placeholder: 'Please provide details...',
          validation: { required: true, minLength: 20 },
          order: 3
        },
        {
          id: 'screenshot',
          type: 'FILE_UPLOAD',
          label: 'Screenshot (optional)',
          name: 'screenshot',
          validation: { required: false },
          order: 4
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: true,
      requiresApproval: false,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  private createRegistrationTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Registration Form',
      description: 'Event or service registration',
      fields: [
        {
          id: 'firstName',
          type: 'TEXT',
          label: 'First Name',
          name: 'firstName',
          validation: { required: true },
          order: 1,
          width: 'half'
        },
        {
          id: 'lastName',
          type: 'TEXT',
          label: 'Last Name',
          name: 'lastName',
          validation: { required: true },
          order: 2,
          width: 'half'
        },
        {
          id: 'email',
          type: 'EMAIL',
          label: 'Email Address',
          name: 'email',
          validation: { required: true },
          order: 3
        },
        {
          id: 'phone',
          type: 'PHONE',
          label: 'Phone Number',
          name: 'phone',
          validation: { required: true },
          order: 4
        },
        {
          id: 'organization',
          type: 'TEXT',
          label: 'Organization',
          name: 'organization',
          validation: { required: false },
          order: 5
        },
        {
          id: 'comments',
          type: 'TEXTAREA',
          label: 'Additional Comments',
          name: 'comments',
          validation: { required: false },
          order: 6
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: false,
      requiresApproval: true,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  private createApplicationTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Application Form',
      description: 'Job or program application',
      fields: [
        {
          id: 'applicantName',
          type: 'TEXT',
          label: 'Full Name',
          name: 'applicantName',
          validation: { required: true },
          order: 1
        },
        {
          id: 'email',
          type: 'EMAIL',
          label: 'Email Address',
          name: 'email',
          validation: { required: true },
          order: 2
        },
        {
          id: 'phone',
          type: 'PHONE',
          label: 'Phone Number',
          name: 'phone',
          validation: { required: true },
          order: 3
        },
        {
          id: 'resume',
          type: 'FILE_UPLOAD',
          label: 'Resume/CV',
          name: 'resume',
          validation: { required: true },
          order: 4
        },
        {
          id: 'coverLetter',
          type: 'TEXTAREA',
          label: 'Cover Letter',
          name: 'coverLetter',
          placeholder: 'Tell us about yourself...',
          validation: { required: true, minLength: 100 },
          order: 5
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: false,
      requiresApproval: true,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  private createRfqTemplate(): Partial<EnhancedFormConfiguration> {
    return {
      name: 'Request for Quotation',
      description: 'Comprehensive RFQ form',
      fields: [
        // Company Information Section
        {
          id: 'section1',
          type: 'SECTION_HEADER',
          label: 'Company Information',
          name: 'section_company',
          order: 1
        },
        {
          id: 'companyName',
          type: 'TEXT',
          label: 'Company Name',
          name: 'companyName',
          validation: { required: true },
          order: 2
        },
        {
          id: 'contactPerson',
          type: 'TEXT',
          label: 'Contact Person',
          name: 'contactPerson',
          validation: { required: true },
          order: 3
        },
        {
          id: 'email',
          type: 'EMAIL',
          label: 'Email Address',
          name: 'email',
          validation: { required: true },
          order: 4
        },

        // Requirements Section
        {
          id: 'section2',
          type: 'SECTION_HEADER',
          label: 'Requirements',
          name: 'section_requirements',
          order: 5
        },
        {
          id: 'productService',
          type: 'TEXTAREA',
          label: 'Product/Service Description',
          name: 'productService',
          placeholder: 'Describe what you need...',
          validation: { required: true, minLength: 50 },
          order: 6
        },
        {
          id: 'quantity',
          type: 'NUMBER',
          label: 'Quantity',
          name: 'quantity',
          validation: { required: true, min: 1 },
          order: 7
        },
        {
          id: 'budget',
          type: 'NUMBER',
          label: 'Budget Range',
          name: 'budget',
          placeholder: 'Estimated budget',
          validation: { required: false },
          order: 8
        },
        {
          id: 'deadline',
          type: 'DATE',
          label: 'Required Delivery Date',
          name: 'deadline',
          validation: { required: true },
          order: 9
        },

        // Additional Information
        {
          id: 'section3',
          type: 'SECTION_HEADER',
          label: 'Additional Information',
          name: 'section_additional',
          order: 10
        },
        {
          id: 'specifications',
          type: 'FILE_UPLOAD',
          label: 'Technical Specifications (PDF)',
          name: 'specifications',
          validation: { required: false },
          order: 11
        },
        {
          id: 'additionalNotes',
          type: 'TEXTAREA',
          label: 'Additional Notes',
          name: 'additionalNotes',
          validation: { required: false },
          order: 12
        }
      ],
      status: FormTemplateStatus.DRAFT,
      isRequired: false,
      allowMultipleSubmissions: true,
      requiresApproval: true,
      notifyOnSubmission: true,
      allowedRoleIds: []
    };
  }

  // ==================== Submission Management ====================

  /**
   * Load submissions with optional filters
   */
  loadSubmissions(params?: SubmissionQueryParams): Observable<PaginatedResponse<FormSubmission>> {
    this.loadingSignal.set(true);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<ApiResponse<PaginatedResponse<FormSubmission>>>(
      `${this.API_BASE}/submissions`,
      { params: httpParams }
    ).pipe(
      map(response => response.data),
      tap(data => {
        this.submissionsSignal.set(data.items);
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to load submissions', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Submit a form (create or update submission)
   */
  submitForm(data: {
    formConfigurationId: string;
    data: Record<string, any>;
    isDraft?: boolean;
    attachments?: File[];
  }): Observable<FormSubmission> {
    this.loadingSignal.set(true);

    const formData = new FormData();
    formData.append('formConfigurationId', data.formConfigurationId);
    formData.append('data', JSON.stringify(data.data));
    formData.append('isDraft', String(data.isDraft || false));

    if (data.attachments) {
      data.attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions`,
      formData
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(submissions => [...submissions, submission]);
        const message = data.isDraft ? 'Draft saved successfully' : 'Form submitted successfully';
        this.notificationService.showSuccess(message);
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to submit form', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Update a submission
   */
  updateSubmission(id: string, data: Partial<FormSubmission>): Observable<FormSubmission> {
    this.loadingSignal.set(true);

    return this.http.put<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${id}`,
      data
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(submissions =>
          submissions.map(s => s.id === id ? submission : s)
        );
        this.notificationService.showSuccess('Submission updated successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to update submission', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Approve a submission
   */
  approveSubmission(data: { submissionId: string; comments?: string }): Observable<FormSubmission> {
    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${data.submissionId}/approve`,
      { comments: data.comments }
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(submissions =>
          submissions.map(s => s.id === data.submissionId ? submission : s)
        );
        this.notificationService.showSuccess('Submission approved successfully');
      }),
      catchError(error => {
        this.handleError('Failed to approve submission', error);
        throw error;
      })
    );
  }

  /**
   * Reject a submission
   */
  rejectSubmission(data: { submissionId: string; comments: string }): Observable<FormSubmission> {
    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${data.submissionId}/reject`,
      { comments: data.comments }
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(submissions =>
          submissions.map(s => s.id === data.submissionId ? submission : s)
        );
        this.notificationService.showSuccess('Submission rejected');
      }),
      catchError(error => {
        this.handleError('Failed to reject submission', error);
        throw error;
      })
    );
  }

  // ==================== PDF Template Management ====================

  /**
   * Load all PDF templates
   */
  loadPdfTemplates(): Observable<PdfTemplateLayout[]> {
    this.loadingSignal.set(true);

    return this.http.get<ApiResponse<PdfTemplateLayout[]>>(
      `${this.API_BASE}/pdf-templates`
    ).pipe(
      map(response => response.data),
      tap(templates => {
        this.pdfTemplatesSignal.set(templates);
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to load PDF templates', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get a single PDF template
   */
  getPdfTemplate(id: string): Observable<PdfTemplateLayout> {
    return this.http.get<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates/${id}`
    ).pipe(
      map(response => response.data),
      tap(template => {
        this.pdfTemplatesSignal.update(templates => {
          const index = templates.findIndex(t => t.id === id);
          if (index >= 0) {
            const updated = [...templates];
            updated[index] = template;
            return updated;
          }
          return [...templates, template];
        });
      }),
      catchError(error => {
        this.handleError('Failed to load PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Create a new PDF template
   */
  createPdfTemplate(data: Partial<PdfTemplateLayout>): Observable<PdfTemplateLayout> {
    this.loadingSignal.set(true);

    return this.http.post<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates`,
      data
    ).pipe(
      map(response => response.data),
      tap(template => {
        this.pdfTemplatesSignal.update(templates => [...templates, template]);
        this.notificationService.showSuccess('PDF template created successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to create PDF template', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Update a PDF template
   */
  updatePdfTemplate(id: string, data: Partial<PdfTemplateLayout>): Observable<PdfTemplateLayout> {
    this.loadingSignal.set(true);

    return this.http.put<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates/${id}`,
      data
    ).pipe(
      map(response => response.data),
      tap(template => {
        this.pdfTemplatesSignal.update(templates =>
          templates.map(t => t.id === id ? template : t)
        );
        this.notificationService.showSuccess('PDF template updated successfully');
        this.errorSignal.set(null);
      }),
      catchError(error => {
        this.handleError('Failed to update PDF template', error);
        throw error;
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Delete a PDF template
   */
  deletePdfTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/pdf-templates/${id}`).pipe(
      tap(() => {
        this.pdfTemplatesSignal.update(templates => templates.filter(t => t.id !== id));
        this.notificationService.showSuccess('PDF template deleted successfully');
      }),
      catchError(error => {
        this.handleError('Failed to delete PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Assign PDF template to a form
   */
  assignPdfTemplateToForm(formId: string, templateId: string): Observable<EnhancedFormConfiguration> {
    return this.http.patch<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${formId}/pdf-template`,
      { pdfTemplateId: templateId }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === formId ? form : f)
        );
        this.notificationService.showSuccess('PDF template assigned successfully');
      }),
      catchError(error => {
        this.handleError('Failed to assign PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Generate PDF from submission
   */
  generatePdf(submissionId: string): Observable<Blob> {
    return this.http.post(
      `${this.API_BASE}/submissions/${submissionId}/generate-pdf`,
      {},
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        this.handleError('Failed to generate PDF', error);
        throw error;
      })
    );
  }

  /**
   * Download submission as PDF
   */
  downloadSubmissionPdf(submissionId: string): void {
    this.generatePdf(submissionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `submission-${submissionId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.notificationService.showSuccess('PDF downloaded successfully');
      },
      error: () => {
        this.notificationService.showError('Failed to download PDF');
      }
    });
  }

  /**
   * Preview submission PDF
   */
  previewSubmissionPdf(submissionId: string): void {
    this.generatePdf(submissionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => {
        this.notificationService.showError('Failed to preview PDF');
      }
    });
  }

  // ==================== Role Assignment ====================

  /**
   * Assign roles to a form
   */
  assignRolesToForm(formId: string, roleIds: string[]): Observable<EnhancedFormConfiguration> {
    return this.http.post<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${formId}/roles`,
      { roleIds }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === formId ? form : f)
        );
        this.notificationService.showSuccess('Roles assigned successfully');
      }),
      catchError(error => {
        this.handleError('Failed to assign roles', error);
        throw error;
      })
    );
  }

  // ==================== Error Handling ====================

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorSignal.set(message);
    this.notificationService.showError(message);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.formsSignal.set([]);
    this.submissionsSignal.set([]);
    this.pdfTemplatesSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
