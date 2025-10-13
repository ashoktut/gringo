import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PdfTemplateLayout } from '../../../models/form.models';
import { FormService } from '../../../services/form.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-pdf-template-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pdf-template-editor.component.html',
  styleUrl: './pdf-template-editor.component.css'
})
export class PdfTemplateEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formService = inject(FormService);
  private readonly notificationService = inject(NotificationService);

  // Component State
  templateForm!: FormGroup;
  isEditMode = signal(false);
  currentTemplateId = signal<string | null>(null);
  showPreview = signal(false);
  previewHtml = signal('');

  // Available Options
  pageSizes = ['A4', 'Letter', 'Legal'] as const;
  orientations = ['portrait', 'landscape'] as const;

  // Field Placeholders for help
  availablePlaceholders = [
    { name: '{{submissionNumber}}', description: 'Unique submission reference' },
    { name: '{{submissionDate}}', description: 'Date of submission' },
    { name: '{{submitterName}}', description: 'Name of person who submitted' },
    { name: '{{submitterEmail}}', description: 'Email of submitter' },
    { name: '{{companyName}}', description: 'Company name' },
    { name: '{{companyLogo}}', description: 'Company logo URL' },
    { name: '{{formTitle}}', description: 'Form title/name' },
    { name: '{{fieldName}}', description: 'Any form field value (replace fieldName with actual field name)' }
  ];

  // Computed
  loading = computed(() => this.formService.loading());
  templates = computed(() => this.formService.pdfTemplates());

  ngOnInit(): void {
    this.initializeForm();
    this.loadTemplates();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      pageSize: ['A4', Validators.required],
      orientation: ['portrait', Validators.required],
      marginTop: [20, [Validators.required, Validators.min(0)]],
      marginRight: [20, [Validators.required, Validators.min(0)]],
      marginBottom: [20, [Validators.required, Validators.min(0)]],
      marginLeft: [20, [Validators.required, Validators.min(0)]],
      headerHtml: [''],
      bodyHtml: ['', Validators.required],
      footerHtml: [''],
      cssStyles: [''],
      includeSubmissionInfo: [true],
      includeCompanyLogo: [true],
      watermark: ['']
    });
  }

  private loadTemplates(): void {
    this.formService.loadPdfTemplates().subscribe();
  }

  private checkEditMode(): void {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.currentTemplateId.set(params['id']);
        this.loadTemplate(params['id']);
      }
    });
  }

  private loadTemplate(id: string): void {
    this.formService.getPdfTemplate(id).subscribe({
      next: (template) => {
        this.populateForm(template);
      },
      error: () => {
        this.notificationService.showError('Failed to load template');
        this.router.navigate(['/admin/pdf-templates']);
      }
    });
  }

  private populateForm(template: PdfTemplateLayout): void {
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      pageSize: template.pageSize,
      orientation: template.orientation,
      marginTop: template.margins.top,
      marginRight: template.margins.right,
      marginBottom: template.margins.bottom,
      marginLeft: template.margins.left,
      headerHtml: template.headerHtml,
      bodyHtml: template.bodyHtml,
      footerHtml: template.footerHtml,
      cssStyles: template.cssStyles,
      includeSubmissionInfo: template.includeSubmissionInfo,
      includeCompanyLogo: template.includeCompanyLogo,
      watermark: template.watermark
    });
  }

  insertPlaceholder(placeholder: string, field: 'headerHtml' | 'bodyHtml' | 'footerHtml'): void {
    const currentValue = this.templateForm.get(field)?.value || '';
    this.templateForm.patchValue({
      [field]: currentValue + placeholder
    });
  }

  generatePreview(): void {
    const formValue = this.templateForm.value;

    // Create sample data for preview
    const sampleData = {
      submissionNumber: 'FORM-2025-001',
      submissionDate: new Date().toLocaleDateString(),
      submitterName: 'John Doe',
      submitterEmail: 'john.doe@example.com',
      companyName: 'Acme Corporation',
      companyLogo: 'https://via.placeholder.com/150x50',
      formTitle: 'Sample Form',
      customerName: 'Jane Smith',
      projectAddress: '123 Main St, City, State',
      phoneNumber: '(555) 123-4567'
    };

    // Replace placeholders with sample data
    let previewContent = formValue.bodyHtml;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewContent = previewContent.replace(regex, value);
    });

    // Build complete HTML
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: ${formValue.pageSize} ${formValue.orientation};
            margin: ${formValue.marginTop}mm ${formValue.marginRight}mm ${formValue.marginBottom}mm ${formValue.marginLeft}mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
          }
          ${formValue.cssStyles || ''}
        </style>
      </head>
      <body>
        ${formValue.headerHtml ? `<header>${formValue.headerHtml}</header>` : ''}
        <main>${previewContent}</main>
        ${formValue.footerHtml ? `<footer>${formValue.footerHtml}</footer>` : ''}
        ${formValue.watermark ? `<div class="watermark">${formValue.watermark}</div>` : ''}
      </body>
      </html>
    `;

    this.previewHtml.set(fullHtml);
    this.showPreview.set(true);
  }

  closePreview(): void {
    this.showPreview.set(false);
  }

  save(): void {
    if (this.templateForm.invalid) {
      this.notificationService.showError('Please fill in all required fields');
      return;
    }

    const formValue = this.templateForm.value;
    const templateData: Partial<PdfTemplateLayout> = {
      name: formValue.name,
      description: formValue.description,
      pageSize: formValue.pageSize,
      orientation: formValue.orientation,
      margins: {
        top: formValue.marginTop,
        right: formValue.marginRight,
        bottom: formValue.marginBottom,
        left: formValue.marginLeft
      },
      headerHtml: formValue.headerHtml,
      bodyHtml: formValue.bodyHtml,
      footerHtml: formValue.footerHtml,
      cssStyles: formValue.cssStyles,
      includeSubmissionInfo: formValue.includeSubmissionInfo,
      includeCompanyLogo: formValue.includeCompanyLogo,
      watermark: formValue.watermark
    };

    if (this.isEditMode() && this.currentTemplateId()) {
      this.updateTemplate(this.currentTemplateId()!, templateData);
    } else {
      this.createTemplate(templateData);
    }
  }

  private createTemplate(data: Partial<PdfTemplateLayout>): void {
    this.formService.createPdfTemplate(data).subscribe({
      next: () => {
        this.notificationService.showSuccess('Template created successfully');
        this.router.navigate(['/admin/pdf-templates']);
      },
      error: () => {
        this.notificationService.showError('Failed to create template');
      }
    });
  }

  private updateTemplate(id: string, data: Partial<PdfTemplateLayout>): void {
    this.formService.updatePdfTemplate(id, data).subscribe({
      next: () => {
        this.notificationService.showSuccess('Template updated successfully');
        this.router.navigate(['/admin/pdf-templates']);
      },
      error: () => {
        this.notificationService.showError('Failed to update template');
      }
    });
  }

  cancel(): void {
    if (this.templateForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.router.navigate(['/admin/pdf-templates']);
      }
    } else {
      this.router.navigate(['/admin/pdf-templates']);
    }
  }

  loadDefaultTemplate(): void {
    const defaultTemplate = `
<div class="header">
  <h1>{{formTitle}}</h1>
  <p>Submission Number: {{submissionNumber}}</p>
  <p>Date: {{submissionDate}}</p>
</div>

<div class="content">
  <h2>Submitter Information</h2>
  <p><strong>Name:</strong> {{submitterName}}</p>
  <p><strong>Email:</strong> {{submitterEmail}}</p>
  <p><strong>Company:</strong> {{companyName}}</p>

  <h2>Form Data</h2>
  <!-- Add your form fields here using {{fieldName}} placeholders -->
  <p><strong>Customer Name:</strong> {{customerName}}</p>
  <p><strong>Project Address:</strong> {{projectAddress}}</p>
  <p><strong>Phone Number:</strong> {{phoneNumber}}</p>
</div>
    `.trim();

    const defaultStyles = `
.header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
  padding-bottom: 20px;
}
.content {
  margin: 20px 0;
}
h1 {
  color: #333;
  font-size: 24pt;
  margin-bottom: 10px;
}
h2 {
  color: #666;
  font-size: 16pt;
  margin-top: 20px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
}
p {
  margin: 8px 0;
}
    `.trim();

    this.templateForm.patchValue({
      bodyHtml: defaultTemplate,
      cssStyles: defaultStyles
    });

    this.notificationService.showSuccess('Default template loaded');
  }
}
