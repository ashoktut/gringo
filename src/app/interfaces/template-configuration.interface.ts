export interface TemplateConfiguration {
  id: string;
  name: string;
  description: string;

  // Template content and type
  templateType: 'html' | 'docx' | 'pdf';
  htmlContent?: string;
  docxContent?: string; // base64 encoded

  // Multi-tenant assignments
  assignedCompanies: string[];
  formTypes: string[];
  isGlobal: boolean;

  // Template metadata
  createdDate: Date;
  lastModified: Date;
  version: string;
  author: string;
  tags: string[];
  createdBy?: string;                 // User ID who created the template
  isCompanySpecific?: boolean;        // Whether template is company-specific

  // PDF generation settings
  pdfSettings: PdfSettings;

  // Field mappings for data injection
  fieldMappings: FieldMapping[];

  // Template status and visibility
  isActive: boolean;
  isDefault: boolean;
  isSystemTemplate: boolean;

  // Preview and testing
  sampleData?: any;
  previewUrl?: string;
}

export interface PdfSettings {
  pageSize: 'A4' | 'Letter' | 'A3' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  scale: number;
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground: boolean;
}

export interface FieldMapping {
  fieldName: string;
  placeholder: string;
  dataType: 'text' | 'number' | 'date' | 'image' | 'boolean';
  isRequired: boolean;
  defaultValue?: any;
  formatter?: string; // e.g., 'currency', 'date:short'
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: TemplateConfiguration[];
}
