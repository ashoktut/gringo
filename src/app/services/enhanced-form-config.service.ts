import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import {
  EnhancedFormConfiguration,
  FormSubmission,
  PdfTemplateLayout,
  FormQueryParams,
  SubmissionQueryParams,
  PdfGenerationRequest,
  FormTemplateStatus,
  FormSubmissionStatus,
  CreateFormConfigRequest,
  UpdateFormConfigRequest,
  SubmitFormRequest,
  ApprovalActionRequest
} from '../models/form.models';
import { NotificationService } from './notification.service';
import { AuthService } from './auth-new.service';

/**
 * @deprecated This service is deprecated as of version 2.0.0
 *
 * **MIGRATION NOTICE:**
 * This service has been consolidated into the new `FormService` to eliminate code duplication
 * and provide a unified API for all form operations.
 *
 * **Please migrate to:**
 * ```typescript
 * import { FormService } from './form.service';
 *
 * // Old way:
 * constructor(private enhancedFormService: EnhancedFormConfigService) {}
 * this.enhancedFormService.loadCompanyForms();
 * this.enhancedFormService.submitForm(data);
 * this.enhancedFormService.approveSubmission(data);
 * this.enhancedFormService.loadPdfTemplates();
 *
 * // New way:
 * constructor(private formService: FormService) {}
 * this.formService.loadCompanyForms();
 * this.formService.submitForm(data);
 * this.formService.approveSubmission(data);
 * this.formService.loadPdfTemplates();
 * ```
 *
 * **Benefits of migration:**
 * - Unified API combining FormConfigService, FormBuilderTemplateService, and EnhancedFormConfigService
 * - All 30+ methods available in one service
 * - Signal-based reactive state management
 * - Reduced code duplication (~3500 lines eliminated)
 * - Consistent error handling and notifications
 * - Integrated PDF generation with downloadSubmissionPdf() and previewSubmissionPdf()
 *
 * This service will be removed in version 3.0.0
 */

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedFormConfigService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly API_BASE = '/api/v1/forms';

  // State Management with Signals
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

  // Computed Values
  readonly myCompanyForms = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.companyId) return [];
    return this.forms().filter(f => f.companyId === currentUser.companyId);
  });

  readonly activeForms = computed(() =>
    this.forms().filter(f => f.status === FormTemplateStatus.ACTIVE)
  );

  readonly myAccessibleForms = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    const userRoleIds = currentUser.roles?.map(r => r.id) || [];

    return this.activeForms().filter(form =>
      form.companyId === currentUser.companyId &&
      form.allowedRoleIds.some(roleId => userRoleIds.includes(roleId))
    );
  });

  readonly pendingApprovals = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    const userRoleIds = currentUser.roles?.map(r => r.id) || [];

    return this.submissions().filter(sub =>
      sub.status === FormSubmissionStatus.UNDER_REVIEW &&
      sub.requiresApproval &&
      this.canApprove(sub, userRoleIds)
    );
  });

  readonly myDraftSubmissions = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    return this.submissions().filter(sub =>
      sub.isDraft && sub.submittedBy === currentUser.id
    );
  });

  readonly mySubmissions = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    return this.submissions().filter(sub =>
      sub.submittedBy === currentUser.id
    );
  });

  private canApprove(submission: FormSubmission, userRoleIds: string[]): boolean {
    const form = this.forms().find(f => f.id === submission.formConfigurationId);
    if (!form?.approverRoleIds) return false;
    return form.approverRoleIds.some(roleId => userRoleIds.includes(roleId));
  }

  // ==================== Form Configuration Management ====================

  /**
   * Load all form configurations for company admin
   */
  loadCompanyForms(companyId?: string): Observable<PaginatedResponse<EnhancedFormConfiguration>> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams()
      .set('companyId', companyId || this.authService.currentUser()?.companyId || '');

    return this.http.get<ApiResponse<PaginatedResponse<EnhancedFormConfiguration>>>(
      `${this.API_BASE}/configurations`,
      { params }
    ).pipe(
      map(response => response.data),
      tap(data => {
        this.formsSignal.set(data.data);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        this.handleError('Failed to load forms', error);
        return of({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      })
    );
  }

  /**
   * Get single form configuration
   */
  getFormConfiguration(id: string): Observable<EnhancedFormConfiguration> {
    return this.http.get<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}`
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.handleError('Failed to load form', error);
        throw error;
      })
    );
  }

  /**
   * Create new form configuration (Company Admin)
   */
  createFormConfiguration(data: CreateFormConfigRequest): Observable<EnhancedFormConfiguration> {
    this.loadingSignal.set(true);

    const currentUser = this.authService.currentUser();
    const formData: Partial<EnhancedFormConfiguration> = {
      ...data,
      companyId: currentUser?.companyId,
      createdBy: currentUser?.id || '',
      status: FormTemplateStatus.DRAFT,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      notifyOnSubmission: data.notifyOnSubmission || false,
      isRequired: data.isRequired || false,
      allowMultipleSubmissions: data.allowMultipleSubmissions || true,
      requiresApproval: data.requiresApproval || false
    };

    return this.http.post<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations`,
      formData
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms => [...forms, form]);
        this.loadingSignal.set(false);
        this.notificationService.showSuccess('Form created successfully');
      }),
      catchError(error => {
        this.handleError('Failed to create form', error);
        throw error;
      })
    );
  }

  /**
   * Update form configuration
   */
  updateFormConfiguration(id: string, data: Partial<UpdateFormConfigRequest>): Observable<EnhancedFormConfiguration> {
    this.loadingSignal.set(true);

    return this.http.put<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}`,
      { ...data, updatedAt: new Date() }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === form.id ? form : f)
        );
        this.loadingSignal.set(false);
        this.notificationService.showSuccess('Form updated successfully');
      }),
      catchError(error => {
        this.handleError('Failed to update form', error);
        throw error;
      })
    );
  }

  /**
   * Delete form configuration
   */
  deleteFormConfiguration(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_BASE}/configurations/${id}`
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.formsSignal.update(forms => forms.filter(f => f.id !== id));
        this.notificationService.showSuccess('Form deleted successfully');
      }),
      catchError(error => {
        this.handleError('Failed to delete form', error);
        throw error;
      })
    );
  }

  /**
   * Update form status (activate/deactivate)
   */
  updateFormStatus(id: string, status: FormTemplateStatus): Observable<EnhancedFormConfiguration> {
    return this.http.patch<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${id}/status`,
      { status }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === form.id ? form : f)
        );
        this.notificationService.showSuccess(`Form ${status.toLowerCase()} successfully`);
      }),
      catchError(error => {
        this.handleError('Failed to update form status', error);
        throw error;
      })
    );
  }

  /**
   * Assign roles to form (access control)
   */
  assignRolesToForm(formId: string, roleIds: string[]): Observable<EnhancedFormConfiguration> {
    return this.http.post<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${formId}/roles`,
      { roleIds }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === form.id ? form : f)
        );
        this.notificationService.showSuccess('Roles assigned successfully');
      }),
      catchError(error => {
        this.handleError('Failed to assign roles', error);
        throw error;
      })
    );
  }

  // ==================== PDF Template Management ====================

  /**
   * Load PDF templates for company
   */
  loadPdfTemplates(companyId?: string): Observable<PdfTemplateLayout[]> {
    const params = new HttpParams()
      .set('companyId', companyId || this.authService.currentUser()?.companyId || '');

    return this.http.get<ApiResponse<PdfTemplateLayout[]>>(
      `${this.API_BASE}/pdf-templates`,
      { params }
    ).pipe(
      map(response => response.data),
      tap(templates => this.pdfTemplatesSignal.set(templates)),
      catchError(error => {
        this.handleError('Failed to load PDF templates', error);
        return of([]);
      })
    );
  }

  /**
   * Get single PDF template
   */
  getPdfTemplate(id: string): Observable<PdfTemplateLayout> {
    return this.http.get<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates/${id}`
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.handleError('Failed to load PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Create PDF template
   */
  createPdfTemplate(data: Partial<PdfTemplateLayout>): Observable<PdfTemplateLayout> {
    const currentUser = this.authService.currentUser();
    const templateData: Partial<PdfTemplateLayout> = {
      ...data,
      companyId: currentUser?.companyId || '',
      createdBy: currentUser?.id || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.http.post<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates`,
      templateData
    ).pipe(
      map(response => response.data),
      tap(template => {
        this.pdfTemplatesSignal.update(templates => [...templates, template]);
        this.notificationService.showSuccess('PDF template created successfully');
      }),
      catchError(error => {
        this.handleError('Failed to create PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Update PDF template
   */
  updatePdfTemplate(id: string, data: Partial<PdfTemplateLayout>): Observable<PdfTemplateLayout> {
    return this.http.put<ApiResponse<PdfTemplateLayout>>(
      `${this.API_BASE}/pdf-templates/${id}`,
      { ...data, updatedAt: new Date() }
    ).pipe(
      map(response => response.data),
      tap(template => {
        this.pdfTemplatesSignal.update(templates =>
          templates.map(t => t.id === template.id ? template : t)
        );
        this.notificationService.showSuccess('PDF template updated successfully');
      }),
      catchError(error => {
        this.handleError('Failed to update PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Delete PDF template
   */
  deletePdfTemplate(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_BASE}/pdf-templates/${id}`
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.pdfTemplatesSignal.update(templates =>
          templates.filter(t => t.id !== id)
        );
        this.notificationService.showSuccess('PDF template deleted successfully');
      }),
      catchError(error => {
        this.handleError('Failed to delete PDF template', error);
        throw error;
      })
    );
  }

  /**
   * Assign PDF template to form
   */
  assignPdfTemplateToForm(formId: string, templateId: string): Observable<EnhancedFormConfiguration> {
    return this.http.patch<ApiResponse<EnhancedFormConfiguration>>(
      `${this.API_BASE}/configurations/${formId}/pdf-template`,
      { pdfTemplateId: templateId }
    ).pipe(
      map(response => response.data),
      tap(form => {
        this.formsSignal.update(forms =>
          forms.map(f => f.id === form.id ? form : f)
        );
        this.notificationService.showSuccess('PDF template assigned successfully');
      }),
      catchError(error => {
        this.handleError('Failed to assign PDF template', error);
        throw error;
      })
    );
  }

  // ==================== Form Submissions ====================

  /**
   * Load form submissions
   */
  loadSubmissions(params?: SubmissionQueryParams): Observable<PaginatedResponse<FormSubmission>> {
    const httpParams = this.buildQueryParams(params);

    return this.http.get<ApiResponse<PaginatedResponse<FormSubmission>>>(
      `${this.API_BASE}/submissions`,
      { params: httpParams }
    ).pipe(
      map(response => response.data),
      tap(data => this.submissionsSignal.set(data.data)),
      catchError(error => {
        this.handleError('Failed to load submissions', error);
        return of({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      })
    );
  }

  /**
   * Get single submission
   */
  getSubmission(id: string): Observable<FormSubmission> {
    return this.http.get<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${id}`
    ).pipe(
      map(response => response.data),
      catchError(error => {
        this.handleError('Failed to load submission', error);
        throw error;
      })
    );
  }

  /**
   * Submit form (User action)
   */
  submitForm(request: SubmitFormRequest): Observable<FormSubmission> {
    const currentUser = this.authService.currentUser();
    const formData = new FormData();

    formData.append('formConfigurationId', request.formConfigurationId);
    formData.append('data', JSON.stringify(request.data));
    formData.append('isDraft', String(request.isDraft || false));
    formData.append('submittedBy', currentUser?.id || '');
    formData.append('submittedByName', `${currentUser?.firstName} ${currentUser?.lastName}`);
    formData.append('submittedByEmail', currentUser?.email || '');
    formData.append('companyId', currentUser?.companyId || '');

    // Add attachments if any
    request.attachments?.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });

    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions`,
      formData
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(subs => [...subs, submission]);
        const message = request.isDraft ? 'Draft saved successfully' : 'Form submitted successfully';
        this.notificationService.showSuccess(message);
      }),
      catchError(error => {
        this.handleError('Failed to submit form', error);
        throw error;
      })
    );
  }

  /**
   * Update submission (draft only)
   */
  updateSubmission(id: string, data: Record<string, any>): Observable<FormSubmission> {
    return this.http.put<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${id}`,
      { data, lastModifiedAt: new Date() }
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(subs =>
          subs.map(s => s.id === submission.id ? submission : s)
        );
        this.notificationService.showSuccess('Draft updated successfully');
      }),
      catchError(error => {
        this.handleError('Failed to update submission', error);
        throw error;
      })
    );
  }

  /**
   * Delete submission
   */
  deleteSubmission(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_BASE}/submissions/${id}`
    ).pipe(
      map(() => void 0),
      tap(() => {
        this.submissionsSignal.update(subs => subs.filter(s => s.id !== id));
        this.notificationService.showSuccess('Submission deleted successfully');
      }),
      catchError(error => {
        this.handleError('Failed to delete submission', error);
        throw error;
      })
    );
  }

  /**
   * Approve submission
   */
  approveSubmission(request: ApprovalActionRequest): Observable<FormSubmission> {
    const currentUser = this.authService.currentUser();

    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${request.submissionId}/approve`,
      {
        approvedBy: currentUser?.id,
        approvalComments: request.comments,
        approvedAt: new Date()
      }
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(subs =>
          subs.map(s => s.id === submission.id ? submission : s)
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
   * Reject submission
   */
  rejectSubmission(request: ApprovalActionRequest): Observable<FormSubmission> {
    const currentUser = this.authService.currentUser();

    return this.http.post<ApiResponse<FormSubmission>>(
      `${this.API_BASE}/submissions/${request.submissionId}/reject`,
      {
        rejectedBy: currentUser?.id,
        approvalComments: request.comments,
        rejectedAt: new Date()
      }
    ).pipe(
      map(response => response.data),
      tap(submission => {
        this.submissionsSignal.update(subs =>
          subs.map(s => s.id === submission.id ? submission : s)
        );
        this.notificationService.showWarning('Submission rejected');
      }),
      catchError(error => {
        this.handleError('Failed to reject submission', error);
        throw error;
      })
    );
  }

  // ==================== PDF Generation ====================

  /**
   * Generate PDF for submission
   */
  generatePdf(request: PdfGenerationRequest): Observable<Blob> {
    return this.http.post(
      `${this.API_BASE}/submissions/${request.submissionId}/generate-pdf`,
      request,
      { responseType: 'blob' }
    ).pipe(
      tap(() => {
        this.notificationService.showSuccess('PDF generated successfully');
      }),
      catchError(error => {
        this.handleError('Failed to generate PDF', error);
        throw error;
      })
    );
  }

  /**
   * Download submission PDF
   */
  downloadSubmissionPdf(submissionId: string, fileName?: string): void {
    this.generatePdf({ submissionId }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `submission-${submissionId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  /**
   * Preview PDF in new tab
   */
  previewSubmissionPdf(submissionId: string): void {
    this.generatePdf({ submissionId }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  // ==================== Helper Methods ====================

  private buildQueryParams(params?: any): HttpParams {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return httpParams;
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorSignal.set(message);
    this.loadingSignal.set(false);
    this.notificationService.showError(message);
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.formsSignal.set([]);
    this.submissionsSignal.set([]);
    this.pdfTemplatesSignal.set([]);
    this.errorSignal.set(null);
  }
}
