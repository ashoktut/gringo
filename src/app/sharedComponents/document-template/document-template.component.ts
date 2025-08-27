import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Template, TemplateType, TemplateUploadRequest } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';

@Component({
  selector: 'app-document-template',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule
],
  template: `
    <div class="document-template-container">
      <!-- Upload Section -->
      <mat-card class="upload-card">
        <mat-card-content>
          <div class="upload-area"
            [class.dragover]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()">
    
            <input #fileInput
              type="file"
              accept=".doc,.docx,.odt,.gdoc"
              (change)="onFileSelected($event)"
              style="display: none">
    
              <div class="upload-content">
                <mat-icon class="upload-icon">cloud_upload</mat-icon>
                <h3>Upload Template Document</h3>
                <p>Drag and drop your Word document or Google Doc here, or click to browse</p>
                <div class="supported-formats">
                  <mat-chip-set>
                    <mat-chip>Word (.docx, .doc)</mat-chip>
                    <mat-chip>Google Docs (.gdoc)</mat-chip>
                    <mat-chip>OpenDocument (.odt)</mat-chip>
                  </mat-chip-set>
                </div>
              </div>
            </div>
    
            <!-- Form Type Selection -->
            @if (selectedFile) {
              <div class="form-config">
                <mat-form-field appearance="outline">
                  <mat-label>Form Type</mat-label>
                  <mat-select [(value)]="selectedFormType" required>
                    <mat-option value="rfq">RFQ (Request for Quote)</mat-option>
                    <mat-option value="rqr">RQR (Request for Requirement)</mat-option>
                    <mat-option value="invoice">Invoice</mat-option>
                    <mat-option value="quote">Quote</mat-option>
                    <mat-option value="report">Report</mat-option>
                    <mat-option value="other">Other</mat-option>
                  </mat-select>
                </mat-form-field>
                <div class="universal-checkbox">
                  <mat-checkbox [(ngModel)]="isUniversal"
                    matTooltip="Universal templates can be used with any form type">
                    Universal Template
                  </mat-checkbox>
                </div>
              </div>
            }
    
            <!-- File Info -->
            @if (selectedFile) {
              <div class="file-info">
                <div class="file-details">
                  <mat-icon>description</mat-icon>
                  <div class="file-metadata">
                    <div class="file-name">{{ selectedFile.name }}</div>
                    <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
                  </div>
                </div>
              </div>
            }
    
            <!-- Upload Progress -->
            @if (isUploading) {
              <div class="upload-progress">
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                <p>Processing template...</p>
              </div>
            }
    
            <!-- Action Buttons -->
            @if (selectedFile && !isUploading) {
              <div class="actions">
                <button mat-raised-button
                  color="primary"
                  (click)="uploadTemplate()"
                  [disabled]="!selectedFormType">
                  <mat-icon>upload</mat-icon>
                  Upload Template
                </button>
                <button mat-button
                  (click)="clearSelection()">
                  <mat-icon>clear</mat-icon>
                  Clear
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
    
        <!-- Template Preview -->
        @if (uploadedTemplate) {
          <mat-card class="preview-card">
            <mat-card-header>
              <mat-card-title>Template Uploaded Successfully</mat-card-title>
              <mat-card-subtitle>{{ uploadedTemplate.name }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="template-info">
                <div class="info-row">
                  <span class="label">Type:</span>
                  <mat-chip>{{ getTemplateTypeDisplay(uploadedTemplate.type) }}</mat-chip>
                </div>
                <div class="info-row">
                  <span class="label">Form Type:</span>
                  <mat-chip [class.universal]="uploadedTemplate.isUniversal">
                    {{ uploadedTemplate.isUniversal ? 'Universal' : uploadedTemplate.formType.toUpperCase() }}
                  </mat-chip>
                </div>
                @if (uploadedTemplate.placeholders.length > 0) {
                  <div class="info-row">
                    <span class="label">Placeholders Found:</span>
                    <div class="placeholders">
                      <mat-chip-set>
                        @for (placeholder of uploadedTemplate.placeholders; track placeholder) {
                          <mat-chip
                            class="placeholder-chip">
                            {{ placeholder }}
                          </mat-chip>
                        }
                      </mat-chip-set>
                    </div>
                  </div>
                }
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button
                color="primary"
                (click)="testTemplate()"
                [disabled]="!canTestTemplate()">
                <mat-icon>preview</mat-icon>
                Test Template
              </button>
            </mat-card-actions>
          </mat-card>
        }
    
        <!-- Template Usage Guide -->
        <mat-card class="guide-card">
          <mat-card-header>
            <mat-card-title>Template Guide</mat-card-title>
            <mat-card-subtitle>How to create effective templates</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="guide-content">
              <h4>1. Use Placeholders</h4>
              <p>Insert placeholders in your document using double curly braces:</p>
              <div class="example-placeholders">
                <mat-chip-set>
                  <mat-chip class="example-chip">{{ '{' }}{{ '{' }}clientName{{ '}' }}{{ '}' }}</mat-chip>
                  <mat-chip class="example-chip">{{ '{' }}{{ '{' }}dateSubmitted{{ '}' }}{{ '}' }}</mat-chip>
                  <mat-chip class="example-chip">{{ '{' }}{{ '{' }}repName{{ '}' }}{{ '}' }}</mat-chip>
                </mat-chip-set>
              </div>
    
              <h4>2. Common Placeholders</h4>
              <div class="common-placeholders">
                <div class="placeholder-category">
                  <strong>Client Info:</strong>
                  <span>clientName, clientEmail, clientPhone</span>
                </div>
                <div class="placeholder-category">
                  <strong>Project Info:</strong>
                  <span>standNum, structureType, buildingType</span>
                </div>
                <div class="placeholder-category">
                  <strong>Dates:</strong>
                  <span>dateSubmitted, dateDue, roofTimeline</span>
                </div>
              </div>
    
              <h4>3. Show All Data</h4>
              <p>Use <code>{{ '{' }}{{ '{' }}ALL_FORM_DATA{{ '}' }}{{ '}' }}</code> to display a complete table of all form fields.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    `,
  styles: [`
    .document-template-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
    }

    .upload-card, .preview-card, .guide-card {
      margin-bottom: 24px;
    }

    .upload-area {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 20px;
    }

    .upload-area:hover,
    .upload-area.dragover {
      border-color: #1976d2;
      background-color: #f5f5f5;
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
      margin-bottom: 16px;
    }

    .upload-content h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .upload-content p {
      margin: 0 0 16px 0;
      color: #666;
    }

    .supported-formats {
      margin-top: 16px;
    }

    .form-config {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 16px;
    }

    .form-config mat-form-field {
      flex: 1;
    }

    .universal-checkbox {
      flex-shrink: 0;
    }

    .file-info {
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .file-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-metadata {
      flex: 1;
    }

    .file-name {
      font-weight: 500;
      color: #333;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }

    .upload-progress {
      margin-bottom: 16px;
    }

    .upload-progress p {
      text-align: center;
      margin-top: 8px;
      color: #1976d2;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .template-info .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .info-row .label {
      font-weight: 500;
      min-width: 120px;
    }

    .placeholders {
      flex: 1;
    }

    .placeholder-chip {
      background-color: #e8f5e8 !important;
      color: #2e7d32 !important;
    }

    .universal {
      background-color: #fff3e0 !important;
      color: #f57c00 !important;
    }

    .guide-content h4 {
      color: #1976d2;
      margin-top: 24px;
      margin-bottom: 8px;
    }

    .guide-content h4:first-child {
      margin-top: 0;
    }

    .example-placeholders {
      margin: 12px 0;
    }

    .example-chip {
      background-color: #e3f2fd !important;
      color: #1976d2 !important;
      font-family: 'Courier New', monospace !important;
    }

    .common-placeholders {
      margin: 16px 0;
    }

    .placeholder-category {
      margin-bottom: 8px;
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }

    .placeholder-category strong {
      color: #1976d2;
    }

    .placeholder-category span {
      color: #666;
      font-size: 14px;
      margin-left: 8px;
    }

    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      color: #d32f2f;
    }

    @media (max-width: 768px) {
      .form-config {
        flex-direction: column;
        align-items: stretch;
      }

      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class DocumentTemplateComponent {
  @Input() formType: TemplateType | '' = '';
  @Output() templateUploaded = new EventEmitter<Template>();
  @Output() uploadError = new EventEmitter<string>();

  selectedFile: File | null = null;
  selectedFormType: TemplateType | '' = '';
  isUniversal: boolean = false;
  isUploading: boolean = false;
  isDragOver: boolean = false;
  uploadedTemplate: Template | null = null;

  constructor(private templateService: TemplateManagementService) {}

  ngOnInit() {
    if (this.formType) {
      this.selectedFormType = this.formType;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  private handleFileSelection(file: File) {
    const validTypes = ['.doc', '.docx', '.odt', '.gdoc'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      this.uploadError.emit('Please select a valid document file (.doc, .docx, .odt, .gdoc)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      this.uploadError.emit('File size must be less than 10MB');
      return;
    }

    this.selectedFile = file;
    this.uploadedTemplate = null;
  }

  uploadTemplate() {
    if (!this.selectedFile || !this.selectedFormType) {
      this.uploadError.emit('Please select a file and form type');
      return;
    }

    this.isUploading = true;

    const uploadRequest: TemplateUploadRequest = {
      file: this.selectedFile,
      name: this.selectedFile.name,
      formType: this.selectedFormType,
      isUniversal: this.isUniversal
    };

    this.templateService.uploadTemplate(uploadRequest).subscribe({
      next: (template) => {
        this.uploadedTemplate = template;
        this.templateUploaded.emit(template);
        this.clearSelection();
        this.isUploading = false;
      },
      error: (error) => {
        this.uploadError.emit('Failed to upload template: ' + error.message);
        this.isUploading = false;
      }
    });
  }

  testTemplate() {
    if (!this.uploadedTemplate) return;

    const sampleData = this.generateSampleData(this.uploadedTemplate.formType);

    this.templateService.testTemplate(this.uploadedTemplate.id, sampleData).subscribe({
      next: () => {
        // Success - PDF generated successfully
      },
      error: (error) => {
        this.uploadError.emit('Failed to generate test PDF: ' + error.message);
      }
    });
  }

  clearSelection() {
    this.selectedFile = null;
    this.selectedFormType = this.formType || '';
    this.isUniversal = false;
  }

  canTestTemplate(): boolean {
    return !!this.uploadedTemplate && this.uploadedTemplate.placeholders.length > 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getTemplateTypeDisplay(type: string): string {
    switch (type) {
      case 'word': return 'Microsoft Word';
      case 'google-docs': return 'Google Docs';
      case 'odt': return 'OpenDocument';
      default: return type;
    }
  }

  private generateSampleData(formType: TemplateType): any {
    const baseData = {
      submissionId: 'TEST-001',
      dateSubmitted: new Date().toISOString().split('T')[0],
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'submitted'
    };

    switch (formType) {
      case 'rfq':
        return {
          ...baseData,
          clientName: 'John Smith',
          clientEmail: 'john.smith@example.com',
          clientPhone: '+27721549865',
          standNum: '123 Main Street, Cape Town',
          repName: 'Bryan Van Staden',
          roofTimeline: '2 weeks',
          structureType: ['Tiled Roof'],
          buildingType: 'Residential',
          municipality: 'Cape Town',
          trussNotes: 'Standard residential truss with 30-degree pitch'
        };
      case 'rqr':
        return {
          ...baseData,
          clientName: 'Jane Doe',
          clientEmail: 'jane.doe@company.com',
          projectType: 'Commercial Building',
          requirements: 'Steel structure framework',
          budget: '250000',
          location: 'Johannesburg, GP'
        };
      default:
        return {
          ...baseData,
          clientName: 'Sample Client',
          description: 'Sample document description',
          amount: '10000',
          notes: 'This is a test document generated from template'
        };
    }
  }
}
