import { Role, Company } from './auth.models';

/**
 * Form Template Status
 */
export enum FormTemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * PDF Template Layout Configuration
 */
export interface PdfTemplateLayout {
  id: string;
  name: string;
  description?: string;

  // Page Settings
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  // Template Structure (HTML with placeholders)
  headerHtml?: string;  // Company logo, form title, etc.
  bodyHtml: string;     // Main content with {{fieldName}} placeholders
  footerHtml?: string;  // Page numbers, disclaimers, etc.

  // Styling
  cssStyles?: string;

  // Additional Options
  includeSubmissionInfo?: boolean;  // Date, user, submission ID
  includeCompanyLogo?: boolean;
  watermark?: string;

  // Metadata
  createdBy: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Form Configuration (extends existing FormConfiguration)
 */
export interface EnhancedFormConfiguration {
  // Basic Info
  id: string;
  name: string;
  description?: string;
  fields: any[];  // Existing field structure

  // Company Association
  companyId: string;
  company?: Company;

  // Access Control
  allowedRoleIds: string[];  // Which roles can access this form
  allowedRoles?: Role[];

  // PDF Configuration
  pdfTemplateId?: string;
  pdfTemplate?: PdfTemplateLayout;

  // Form Settings
  status: FormTemplateStatus;
  isRequired: boolean;
  allowMultipleSubmissions: boolean;
  requiresApproval: boolean;
  approverRoleIds?: string[];  // Which roles can approve submissions

  // Notifications
  notifyOnSubmission: boolean;
  notificationEmails?: string[];

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Form Submission Status
 */
export enum FormSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Form Submission
 */
export interface FormSubmission {
  id: string;
  formConfigurationId: string;
  formConfiguration?: EnhancedFormConfiguration;

  // Submitted Data
  data: Record<string, any>;  // fieldName -> value
  attachments?: FormAttachment[];

  // Submitter Info
  submittedBy: string;
  submittedByName: string;
  submittedByEmail: string;
  companyId: string;

  // Status
  status: FormSubmissionStatus;
  isDraft: boolean;

  // PDF
  pdfUrl?: string;
  pdfGeneratedAt?: Date;

  // Approval Workflow
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  approvalComments?: string;

  // Timestamps
  createdAt: Date;
  submittedAt?: Date;
  lastModifiedAt: Date;

  // Audit
  ipAddress?: string;
  submissionNumber: string;  // Unique reference like "FORM-2025-001"
}

/**
 * Form Attachment
 */
export interface FormAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: Date;
}

/**
 * Form Access Control
 */
export interface FormAccessControl {
  formId: string;
  companyId: string;
  roleIds: string[];
  userIds?: string[];  // Optional: specific users
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * PDF Generation Request
 */
export interface PdfGenerationRequest {
  submissionId: string;
  templateId?: string;  // Optional: override default template
  includeAttachments?: boolean;
}

/**
 * Query Parameters
 */
export interface FormQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FormTemplateStatus;
  companyId?: string;
  createdBy?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SubmissionQueryParams {
  page?: number;
  pageSize?: number;
  formId?: string;
  status?: FormSubmissionStatus;
  submittedBy?: string;
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'submittedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create Form Configuration Request
 */
export interface CreateFormConfigRequest {
  name: string;
  description?: string;
  fields: any[];
  allowedRoleIds: string[];
  pdfTemplateId?: string;
  isRequired?: boolean;
  allowMultipleSubmissions?: boolean;
  requiresApproval?: boolean;
  approverRoleIds?: string[];
  notifyOnSubmission?: boolean;
  notificationEmails?: string[];
}

/**
 * Update Form Configuration Request
 */
export interface UpdateFormConfigRequest extends Partial<CreateFormConfigRequest> {
  id: string;
}

/**
 * Submit Form Request
 */
export interface SubmitFormRequest {
  formConfigurationId: string;
  data: Record<string, any>;
  isDraft?: boolean;
  attachments?: File[];
}

/**
 * Approve/Reject Submission Request
 */
export interface ApprovalActionRequest {
  submissionId: string;
  comments?: string;
  attachments?: File[];
}

/**
 * Basic Form Interface for Workflow Engine
 */
export interface Form {
  id: string;
  title: string;
  type?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  fields?: FormField[];
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form Field Interface
 */
export interface FormField {
  id: string;
  name: string;
  type: string;
  value: any;
  label?: string;
  required?: boolean;
}
