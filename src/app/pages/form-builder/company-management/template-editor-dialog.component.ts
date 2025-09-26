import { Component, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FormConfiguration, FormConfigService } from '../../../services/form-config.service';
import { PdfGenerationService } from '../../../services/pdf-generation.service';

export interface TemplateEditorData {
  form: FormConfiguration;
}

@Component({
  selector: 'app-template-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule
  ],
  template: `
    <div class="template-editor-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon>edit</mat-icon>
        <h2>Template Manager</h2>
        <span class="form-name">{{ data.form.name }}</span>
      </div>

      <div mat-dialog-content class="dialog-content">
        <mat-tab-group>
          <!-- HTML Template Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>code</mat-icon>
              HTML Template
            </ng-template>

            <div class="tab-content">
              <form [formGroup]="htmlTemplateForm" class="template-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>HTML Template Content</mat-label>
                  <textarea
                    matInput
                    formControlName="htmlContent"
                    rows="15"
                    placeholder="Enter HTML template content..."
                    class="html-editor">
                  </textarea>
                  <mat-hint>Use {{ '{{ fieldName }}' }} syntax for dynamic field insertion</mat-hint>
                </mat-form-field>

                <div class="template-actions">
                  <button
                    mat-raised-button
                    color="primary"
                    type="button"
                    (click)="saveHtmlTemplate()"
                    [disabled]="htmlTemplateForm.invalid">
                    <mat-icon>save</mat-icon>
                    Save HTML Template
                  </button>
                  <button
                    mat-button
                    type="button"
                    (click)="loadSampleTemplate()"
                    matTooltip="Load a sample HTML template for testing">
                    <mat-icon>file_copy</mat-icon>
                    Load Sample
                  </button>
                  <button
                    mat-button
                    type="button"
                    (click)="previewHtmlTemplate()"
                    [disabled]="!htmlTemplateForm.value.htmlContent">
                    <mat-icon>preview</mat-icon>
                    Preview
                  </button>
                  <button
                    mat-button
                    type="button"
                    (click)="testPdfGeneration()"
                    [disabled]="!htmlTemplateForm.value.htmlContent"
                    matTooltip="Generate test PDF with sample data">
                    <mat-icon>picture_as_pdf</mat-icon>
                    Test PDF
                  </button>
                  <button
                    mat-button
                    color="warn"
                    type="button"
                    (click)="clearHtmlTemplate()">
                    <mat-icon>clear</mat-icon>
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </mat-tab>

          <!-- DOCX Template Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>description</mat-icon>
              DOCX Template
            </ng-template>

            <div class="tab-content">
              <div class="docx-upload-section">
                @if (currentDocxTemplate()) {
                  <mat-card class="current-template-card">
                    <mat-card-content>
                      <div class="current-template-info">
                        <mat-icon>description</mat-icon>
                        <div class="template-details">
                          <h4>{{ currentDocxTemplate()!.fileName }}</h4>
                          <p>Uploaded: {{ currentDocxTemplate()!.uploadDate | date:'medium' }}</p>
                        </div>
                        <button
                          mat-icon-button
                          color="warn"
                          (click)="removeDocxTemplate()"
                          matTooltip="Remove template">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }

                <div class="upload-area"
                     (dragover)="onDragOver($event)"
                     (drop)="onFileDrop($event)"
                     [class.drag-over]="isDragOver()">
                  <mat-icon>cloud_upload</mat-icon>
                  <h3>Upload DOCX Template</h3>
                  <p>Drag and drop a DOCX file here, or click to browse</p>
                  <input
                    type="file"
                    #fileInput
                    accept=".docx"
                    (change)="onFileSelected($event)"
                    style="display: none;">
                  <button
                    mat-raised-button
                    color="primary"
                    (click)="fileInput.click()">
                    <mat-icon>folder_open</mat-icon>
                    Browse Files
                  </button>
                </div>

                @if (selectedFile()) {
                  <mat-card class="file-preview-card">
                    <mat-card-content>
                      <div class="file-preview">
                        <mat-icon>description</mat-icon>
                        <div class="file-details">
                          <h4>{{ selectedFile()!.name }}</h4>
                          <p>{{ formatFileSize(selectedFile()!.size) }}</p>
                        </div>
                        <div class="file-actions">
                          <button
                            mat-raised-button
                            color="primary"
                            (click)="uploadDocxTemplate()"
                            [disabled]="isUploading()">
                            <mat-icon>upload</mat-icon>
                            {{ isUploading() ? 'Uploading...' : 'Upload' }}
                          </button>
                          <button
                            mat-button
                            (click)="clearSelectedFile()">
                            <mat-icon>clear</mat-icon>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>

          <!-- PDF Settings Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>picture_as_pdf</mat-icon>
              PDF Settings
            </ng-template>

            <div class="tab-content">
              <form [formGroup]="pdfSettingsForm" class="settings-form">
                <div class="settings-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Paper Size</mat-label>
                    <mat-select formControlName="paperSize">
                      <mat-option value="A4">A4</mat-option>
                      <mat-option value="Letter">Letter</mat-option>
                      <mat-option value="A3">A3</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Orientation</mat-label>
                    <mat-select formControlName="orientation">
                      <mat-option value="portrait">Portrait</mat-option>
                      <mat-option value="landscape">Landscape</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-divider></mat-divider>

                <div class="margins-section">
                  <h4>Page Margins (mm)</h4>
                  <div class="margins-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Top</mat-label>
                      <input matInput type="number" formControlName="marginTop" min="0">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Right</mat-label>
                      <input matInput type="number" formControlName="marginRight" min="0">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Bottom</mat-label>
                      <input matInput type="number" formControlName="marginBottom" min="0">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Left</mat-label>
                      <input matInput type="number" formControlName="marginLeft" min="0">
                    </mat-form-field>
                  </div>
                </div>

                <div class="settings-actions">
                  <button
                    mat-raised-button
                    color="primary"
                    type="button"
                    (click)="savePdfSettings()">
                    <mat-icon>save</mat-icon>
                    Save PDF Settings
                  </button>
                  <button
                    mat-button
                    type="button"
                    (click)="resetPdfSettings()">
                    <mat-icon>refresh</mat-icon>
                    Reset to Default
                  </button>
                </div>
              </form>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="close()">
          <mat-icon>close</mat-icon>
          Close
        </button>
        <button mat-raised-button color="primary" (click)="saveAll()">
          <mat-icon>save</mat-icon>
          Save All Changes
        </button>
      </div>
    </div>
  `,
  styles: [`
    .template-editor-dialog {
      width: 800px;
      max-width: 90vw;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--azure-outline);
    }

    .dialog-header h2 {
      margin: 0;
      flex: 1;
      color: var(--azure-primary);
    }

    .form-name {
      background: var(--azure-primary);
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.85rem;
    }

    .dialog-content {
      padding: 0;
    }

    .tab-content {
      padding: 24px;
    }

    .template-form,
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .html-editor {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.4;
    }

    .template-actions,
    .settings-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .docx-upload-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .current-template-card {
      border: 2px solid var(--azure-primary);
    }

    .current-template-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .template-details {
      flex: 1;
    }

    .template-details h4 {
      margin: 0;
      color: var(--azure-primary);
    }

    .template-details p {
      margin: 4px 0 0 0;
      color: var(--azure-on-surface-variant);
      font-size: 0.9rem;
    }

    .upload-area {
      border: 2px dashed var(--azure-outline);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .upload-area:hover,
    .upload-area.drag-over {
      border-color: var(--azure-primary);
      background: var(--azure-surface-variant);
    }

    .upload-area mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--azure-primary);
    }

    .upload-area h3 {
      margin: 0 0 8px 0;
      color: var(--azure-on-surface);
    }

    .upload-area p {
      margin: 0 0 20px 0;
      color: var(--azure-on-surface-variant);
    }

    .file-preview-card {
      border: 1px solid var(--azure-outline);
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-details {
      flex: 1;
    }

    .file-details h4 {
      margin: 0;
      color: var(--azure-on-surface);
    }

    .file-details p {
      margin: 4px 0 0 0;
      color: var(--azure-on-surface-variant);
      font-size: 0.9rem;
    }

    .file-actions {
      display: flex;
      gap: 8px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .margins-section h4 {
      margin: 0 0 16px 0;
      color: var(--azure-primary);
    }

    .margins-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--azure-outline);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @media (max-width: 600px) {
      .template-editor-dialog {
        width: 100%;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }

      .settings-grid,
      .margins-grid {
        grid-template-columns: 1fr;
      }

      .template-actions,
      .file-actions {
        flex-direction: column;
      }
    }
  `]
})
export class TemplateEditorDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formConfigService = inject(FormConfigService);
  private readonly pdfGenerationService = inject(PdfGenerationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<TemplateEditorDialogComponent>);

  // Component state
  selectedFile = signal<File | null>(null);
  currentDocxTemplate = signal<any>(null);
  isDragOver = signal(false);
  isUploading = signal(false);

  // Forms
  htmlTemplateForm!: FormGroup;
  pdfSettingsForm!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TemplateEditorData) {
    this.initializeForms();
    this.loadCurrentTemplates();
  }

  private initializeForms(): void {
    // HTML Template Form
    this.htmlTemplateForm = this.fb.group({
      htmlContent: [this.data.form.templates?.htmlTemplate || '', Validators.required]
    });

    // PDF Settings Form
    const pdfSettings = this.data.form.templates?.pdfSettings;
    this.pdfSettingsForm = this.fb.group({
      paperSize: [pdfSettings?.paperSize || 'A4', Validators.required],
      orientation: [pdfSettings?.orientation || 'portrait', Validators.required],
      marginTop: [pdfSettings?.margins?.top || 20, [Validators.required, Validators.min(0)]],
      marginRight: [pdfSettings?.margins?.right || 20, [Validators.required, Validators.min(0)]],
      marginBottom: [pdfSettings?.margins?.bottom || 20, [Validators.required, Validators.min(0)]],
      marginLeft: [pdfSettings?.margins?.left || 20, [Validators.required, Validators.min(0)]]
    });
  }

  private loadCurrentTemplates(): void {
    if (this.data.form.templates?.docxTemplate) {
      this.currentDocxTemplate.set(this.data.form.templates.docxTemplate);
    }
  }

  // HTML Template Methods
  saveHtmlTemplate(): void {
    if (this.validateHtmlTemplate()) {
      this.snackBar.open('HTML template validated and saved locally', 'Dismiss', { duration: 2000 });
    }
  }

  private validateHtmlTemplate(): boolean {
    const htmlContent = this.htmlTemplateForm.value.htmlContent;

    if (!htmlContent || htmlContent.trim().length === 0) {
      this.snackBar.open('HTML template cannot be empty', 'Dismiss', { duration: 3000 });
      return false;
    }

    try {
      // Parse HTML to check for syntax errors
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const parseErrors = doc.querySelectorAll('parsererror');

      if (parseErrors.length > 0) {
        this.snackBar.open('HTML contains syntax errors - please fix before saving', 'Dismiss', {
          duration: 3000
        });
        return false;
      }

      // Check for potentially dangerous scripts (basic security check)
      if (htmlContent.includes('<script>') || htmlContent.includes('javascript:')) {
        this.snackBar.open('HTML templates cannot contain script tags for security reasons', 'Dismiss', {
          duration: 3000
        });
        return false;
      }

      // Validate placeholder syntax
      const placeholderRegex = /\{\{\s*\w+\s*\}\}/g;
      const placeholders = htmlContent.match(placeholderRegex);
      if (placeholders) {
        console.log('Found placeholders:', placeholders);
      }

      return true;
    } catch (error) {
      console.error('HTML validation error:', error);
      this.snackBar.open('Error validating HTML template', 'Dismiss', { duration: 3000 });
      return false;
    }
  }

  previewHtmlTemplate(): void {
    const htmlContent = this.htmlTemplateForm.value.htmlContent;

    // Basic validation
    if (!htmlContent || htmlContent.trim().length === 0) {
      this.snackBar.open('No HTML content to preview', 'Dismiss', { duration: 2000 });
      return;
    }

    try {
      // Simple HTML validation - check for basic structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const parseErrors = doc.querySelectorAll('parsererror');

      if (parseErrors.length > 0) {
        this.snackBar.open('HTML contains syntax errors', 'Dismiss', { duration: 3000 });
        return;
      }

      // Create a styled preview with form context
      const previewContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Template Preview - ${this.data.form.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: #f5f5f5;
            }
            .preview-header {
              background: #0b7ad4;
              color: white;
              padding: 15px;
              border-radius: 8px 8px 0 0;
              margin-bottom: 0;
            }
            .preview-content {
              background: white;
              padding: 20px;
              border-radius: 0 0 8px 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .field-placeholder {
              background: #e3f2fd;
              border: 2px dashed #0b7ad4;
              padding: 5px 10px;
              border-radius: 4px;
              display: inline-block;
              margin: 2px;
              font-family: monospace;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="preview-header">
            <h2>📄 Template Preview</h2>
            <p>Form: ${this.data.form.name} (${this.data.form.formType})</p>
          </div>
          <div class="preview-content">
            ${this.highlightPlaceholders(htmlContent)}
          </div>
          <script>
            console.log('Template preview loaded for: ${this.data.form.name}');
          </script>
        </body>
        </html>
      `;

      // Open a new window with the styled preview
      const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (previewWindow) {
        previewWindow.document.write(previewContent);
        previewWindow.document.close();
        previewWindow.focus();
      } else {
        this.snackBar.open('Please allow popups to view template preview', 'Dismiss', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error creating preview:', error);
      this.snackBar.open('Error creating template preview', 'Dismiss', { duration: 3000 });
    }
  }

  private highlightPlaceholders(htmlContent: string): string {
    // Replace {{ fieldName }} with highlighted placeholders
    return htmlContent.replace(/\{\{\s*(\w+)\s*\}\}/g,
      '<span class="field-placeholder">{{ $1 }}</span>');
  }

  clearHtmlTemplate(): void {
    if (confirm('Are you sure you want to clear the HTML template?')) {
      this.htmlTemplateForm.patchValue({ htmlContent: '' });
    }
  }

  testPdfGeneration(): void {
    const htmlContent = this.htmlTemplateForm.value.htmlContent;
    if (!htmlContent || !this.validateHtmlTemplate()) {
      return;
    }

    // Create sample data for testing
    const sampleData = {
      clientName: 'John Smith',
      clientEmail: 'john.smith@example.com',
      clientPhone: '+27 72 154 9865',
      projectAddress: '123 Main Street, Cape Town, 8001',
      repName: 'Bryan Van Staden',
      formName: this.data.form.name,
      companyName: this.data.form.companyId || 'Sample Company',
      projectDescription: 'Sample project for testing PDF generation from HTML template',
      estimatedCost: 'R 75,000',
      notes: 'This is a test document generated from the HTML template'
    };

    this.snackBar.open('Generating test PDF...', 'Dismiss', { duration: 2000 });

    try {
      this.pdfGenerationService.generatePdfFromHtmlTemplate(
        htmlContent,
        sampleData,
        this.pdfSettingsForm.value,
        `test_${this.data.form.name}_${new Date().getTime()}.pdf`
      ).subscribe({
        next: () => {
          this.snackBar.open('Test PDF generated successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error generating test PDF:', error);
          this.snackBar.open('Error generating test PDF', 'Dismiss', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('Error in test PDF generation:', error);
      this.snackBar.open('Error generating test PDF', 'Dismiss', { duration: 3000 });
    }
  }

  loadSampleTemplate(): void {
    const sampleHtmlTemplate = `<!DOCTYPE html>
<html>
<head>
    <title>{{ formName }} - {{ companyName }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20mm;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0b7ad4;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-logo {
            color: #0b7ad4;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .document-title {
            font-size: 24px;
            color: #2c3e50;
            margin: 10px 0;
        }
        .document-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #0b7ad4;
        }
        .section {
            margin: 25px 0;
            padding: 20px;
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
        }
        .section-title {
            color: #0b7ad4;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #0b7ad4;
            padding-bottom: 5px;
        }
        .field-row {
            display: flex;
            margin: 10px 0;
            align-items: center;
        }
        .field-label {
            font-weight: bold;
            width: 150px;
            color: #495057;
        }
        .field-value {
            background: #e3f2fd;
            padding: 5px 12px;
            border-radius: 4px;
            flex: 1;
            margin-left: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
        }
        .page-break-before {
            page-break-before: always;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-logo">{{ companyName }}</div>
        <h1 class="document-title">{{ formName }}</h1>
        <p>Document generated on {{ currentDate }} at {{ currentTime }}</p>
    </div>

    <div class="document-info">
        <h3>Document Information</h3>
        <div class="field-row">
            <span class="field-label">Submission ID:</span>
            <span class="field-value">{{ submissionId }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Form Type:</span>
            <span class="field-value">{{ formType }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Generated:</span>
            <span class="field-value">{{ timestamp }}</span>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Client Information</h2>
        <div class="field-row">
            <span class="field-label">Client Name:</span>
            <span class="field-value">{{ clientName }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Email:</span>
            <span class="field-value">{{ clientEmail }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Phone:</span>
            <span class="field-value">{{ clientPhone }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Project Address:</span>
            <span class="field-value">{{ projectAddress }}</span>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Project Details</h2>
        <div class="field-row">
            <span class="field-label">Representative:</span>
            <span class="field-value">{{ repName }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Description:</span>
            <span class="field-value">{{ projectDescription }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Estimated Cost:</span>
            <span class="field-value">{{ estimatedCost }}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Notes:</span>
            <span class="field-value">{{ notes }}</span>
        </div>
    </div>

    <div class="footer">
        <p>This document was automatically generated from {{ formName }} template</p>
        <p>{{ companyName }} - Professional Construction Services</p>
        <p>Generated: {{ currentDate }}</p>
    </div>
</body>
</html>`;

    if (this.htmlTemplateForm.value.htmlContent && this.htmlTemplateForm.value.htmlContent.trim().length > 0) {
      if (confirm('This will replace the current HTML template. Are you sure?')) {
        this.htmlTemplateForm.patchValue({ htmlContent: sampleHtmlTemplate });
        this.snackBar.open('Sample template loaded successfully', 'Dismiss', { duration: 2000 });
      }
    } else {
      this.htmlTemplateForm.patchValue({ htmlContent: sampleHtmlTemplate });
      this.snackBar.open('Sample template loaded successfully', 'Dismiss', { duration: 2000 });
    }
  }

  // DOCX Template Methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file type
    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      this.snackBar.open('Please select a valid DOCX file', 'Dismiss', { duration: 3000 });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('File size must be less than 10MB', 'Dismiss', { duration: 3000 });
      return;
    }

    // Additional validation - check file extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      this.snackBar.open('File must have .docx extension', 'Dismiss', { duration: 3000 });
      return;
    }

    // Validate file name
    if (file.name.length > 100) {
      this.snackBar.open('File name is too long (max 100 characters)', 'Dismiss', { duration: 3000 });
      return;
    }

    // Check for minimum file size (empty DOCX files are usually at least 5KB)
    if (file.size < 5 * 1024) {
      this.snackBar.open('File appears to be too small to be a valid DOCX document', 'Dismiss', { duration: 3000 });
      return;
    }

    this.selectedFile.set(file);
    this.snackBar.open('File selected successfully', 'Dismiss', { duration: 2000 });
  }

  uploadDocxTemplate(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64Content = (reader.result as string).split(',')[1];

        // Validate base64 content
        if (!base64Content || base64Content.length === 0) {
          throw new Error('Failed to encode file content');
        }

        // Create template object with validation metadata
        const template = {
          fileName: file.name,
          fileContent: base64Content,
          uploadDate: new Date(),
          fileSize: file.size,
          originalType: file.type
        };

        this.currentDocxTemplate.set(template);
        this.selectedFile.set(null);
        this.isUploading.set(false);

        this.snackBar.open(`DOCX template "${file.name}" uploaded successfully`, 'Dismiss', {
          duration: 3000
        });
      } catch (error) {
        console.error('Error processing file:', error);
        this.isUploading.set(false);
        this.snackBar.open('Error processing file content', 'Dismiss', { duration: 3000 });
      }
    };

    reader.onerror = () => {
      this.isUploading.set(false);
      this.snackBar.open('Error reading file - file may be corrupted', 'Dismiss', { duration: 3000 });
    };

    reader.readAsDataURL(file);
  }

  removeDocxTemplate(): void {
    if (confirm('Are you sure you want to remove the DOCX template?')) {
      this.currentDocxTemplate.set(null);
      this.snackBar.open('DOCX template removed', 'Dismiss', { duration: 2000 });
    }
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // PDF Settings Methods
  savePdfSettings(): void {
    if (this.pdfSettingsForm.valid) {
      this.snackBar.open('PDF settings saved locally', 'Dismiss', { duration: 2000 });
    }
  }

  resetPdfSettings(): void {
    this.pdfSettingsForm.patchValue({
      paperSize: 'A4',
      orientation: 'portrait',
      marginTop: 20,
      marginRight: 20,
      marginBottom: 20,
      marginLeft: 20
    });
  }

  // Dialog Methods
  saveAll(): void {
    let hasChanges = false;
    let validationErrors: string[] = [];

    const updatedForm = { ...this.data.form };

    // Initialize templates if not present
    if (!updatedForm.templates) {
      updatedForm.templates = {};
    }

    // Validate and save HTML Template
    const htmlContent = this.htmlTemplateForm.value.htmlContent?.trim();
    if (htmlContent) {
      if (this.validateHtmlTemplate()) {
        updatedForm.templates.htmlTemplate = htmlContent;
        hasChanges = true;
      } else {
        validationErrors.push('HTML template validation failed');
      }
    } else if (updatedForm.templates.htmlTemplate) {
      // Remove HTML template if it was cleared
      delete updatedForm.templates.htmlTemplate;
      hasChanges = true;
    }

    // Save DOCX Template
    const docxTemplate = this.currentDocxTemplate();
    if (docxTemplate) {
      updatedForm.templates.docxTemplate = docxTemplate;
      hasChanges = true;
    } else if (updatedForm.templates.docxTemplate) {
      // Remove DOCX template if it was cleared
      delete updatedForm.templates.docxTemplate;
      hasChanges = true;
    }

    // Validate and save PDF Settings
    if (this.pdfSettingsForm.valid) {
      const formValues = this.pdfSettingsForm.value;

      // Validate margin values
      const margins = [formValues.marginTop, formValues.marginRight, formValues.marginBottom, formValues.marginLeft];
      if (margins.some(margin => margin < 0 || margin > 100)) {
        validationErrors.push('Margins must be between 0 and 100mm');
      } else {
        updatedForm.templates.pdfSettings = {
          paperSize: formValues.paperSize,
          orientation: formValues.orientation,
          margins: {
            top: formValues.marginTop,
            right: formValues.marginRight,
            bottom: formValues.marginBottom,
            left: formValues.marginLeft
          }
        };
        hasChanges = true;
      }
    } else {
      validationErrors.push('PDF settings contain invalid values');
    }

    // Check for validation errors
    if (validationErrors.length > 0) {
      this.snackBar.open(`Validation errors: ${validationErrors.join(', ')}`, 'Dismiss', {
        duration: 5000
      });
      return;
    }

    // Check if there are any changes to save
    if (!hasChanges) {
      this.snackBar.open('No changes to save', 'Dismiss', { duration: 2000 });
      return;
    }

    // Save the updated form configuration
    this.formConfigService.saveFormConfig(updatedForm).subscribe({
      next: (savedForm) => {
        this.snackBar.open('All templates and settings saved successfully!', 'Dismiss', {
          duration: 3000
        });
        this.dialogRef.close(savedForm);
      },
      error: (error) => {
        console.error('Error saving form configuration:', error);
        this.snackBar.open('Error saving templates - please try again', 'Dismiss', {
          duration: 3000
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
