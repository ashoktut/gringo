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

// Flow Form Designer Interfaces
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  position: NodePosition;
  properties: NodeProperties;
  connections: NodeConnections;
  isSelected?: boolean;
  isValid?: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface NodeConnections {
  inputs: string[];
  outputs: string[];
  dependencies: string[];
}

export interface NodeProperties {
  fieldType?: string;
  label?: string;
  required?: boolean;
  validation?: FlowValidationRule[];
  options?: OptionValue[];
  placeholder?: string;
  description?: string;
  [key: string]: any;
}

export interface FlowValidationRule {
  type: string;
  value?: any;
  message?: string;
}

export interface OptionValue {
  value: any;
  label: string;
}

export type FlowNodeType = 'input' | 'logic' | 'validation' | 'output' | 'section';

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
}

export interface FlowLogicRule {
  id: string;
  type: 'condition' | 'calculation' | 'validation';
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'show' | 'hide' | 'enable' | 'disable' | 'set_value' | 'set_required' | 'validate' | 'calculate';
  targetField?: string;
  value?: any;
  message?: string;
  formula?: string;
}

export interface FlowCompiledForm {
  id: string;
  name: string;
  sections: FlowFormSection[];
  metadata: {
    createdAt: Date;
    compiledFrom: 'flow-designer';
    nodeCount: number;
    connectionCount: number;
  };
}

export interface FlowFormSection {
  title: string;
  description?: string;
  fields: FlowFormField[];
  expanded?: boolean;
}

export interface FlowFormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: OptionValue[];
  validation?: any[];
  conditional?: any;
}
