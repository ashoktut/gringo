export interface Template {
  id: string;
  name: string;
  type: DocumentType;
  formType: TemplateType;
  content: string;
  placeholders: string[];
  size: number;
  uploadedAt: Date;
  isUniversal: boolean;
  metadata?: TemplateMetadata;
}

export interface TemplateMetadata {
  author?: string;
  version?: string;
  description?: string;
  tags?: string[];
}

export type TemplateType = 'rfq' | 'rqr' | 'invoice' | 'quote' | 'report';

export type DocumentType = 'word' | 'google-docs' | 'odt';

export interface TemplateUploadRequest {
  file: File;
  name: string;
  formType: TemplateType;
  isUniversal?: boolean;
  metadata?: Partial<TemplateMetadata>;
}

export interface TemplateGenerationRequest {
  templateId: string;
  formData: Record<string, any>;
  formType: string;
  outputFilename?: string;
}

export interface FormFieldMapping {
  sourceField: string;
  targetPlaceholder: string;
  transformation?: (value: any) => string;
}

export interface PdfGenerationOptions {
  filename?: string;
  pageFormat?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}
