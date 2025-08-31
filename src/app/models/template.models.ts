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

  // Enhanced properties for docx library support
  originalFile?: Blob;                // Original Word file for format preservation
  binaryContent?: ArrayBuffer;        // Binary data of the document
  preserveFormatting?: boolean;       // Flag to enable format preservation
  hasImages?: boolean;                // Indicates if template contains image placeholders
}

export interface TemplateMetadata {
  author?: string;
  version?: string;
  description?: string;
  tags?: string[];
}

export type TemplateType = 'rfq' | 'rqr' | 'invoice' | 'quote' | 'report';

export type DocumentType = 'word' | 'google-docs' | 'odt' | 'pdf' | 'html';

export interface TemplateUploadRequest {
  file: File;
  name: string;
  formType: TemplateType;
  isUniversal?: boolean;
  metadata?: Partial<TemplateMetadata>;
  preserveFormatting?: boolean;       // Enable format preservation during upload
}

export interface TemplateGenerationRequest {
  templateId: string;
  formData: Record<string, any>;
  formType: string;
  outputFilename?: string;
  preserveFormatting?: boolean;       // Enable format preservation during generation
  imageProcessing?: ImageProcessingOptions;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface DocxProcessingOptions {
  preserveStyles?: boolean;
  preserveImages?: boolean;
  preserveTables?: boolean;
  preserveHeaders?: boolean;
  preserveFooters?: boolean;
  imageQuality?: number;
  outputFormat?: 'pdf' | 'docx'; // ✅ PDF output option
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
  // Docx-specific options
  preserveWordFormatting?: boolean;
  imageQuality?: number;
  fontEmbedding?: boolean;
  // Enhanced distribution options
  downloadImmediately?: boolean;
  emailRecipients?: string[];
  googleDriveUpload?: boolean;
  serverStorage?: boolean;
}

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
