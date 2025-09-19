import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { Observable } from 'rxjs';

import { FormConfiguration, FormConfigService } from '../../services/form-config.service';
import { PdfTemplateService } from '../../services/pdf-template.service';
import { FormSubmissionService, FormSubmission } from '../../services/form-submission.service';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

export interface UniversalFormConfig {
  formType: string;
  companyId?: string;
  category?: 'reps' | 'clients' | 'admin' | 'public';
  allowCompanySelection?: boolean;
  showHeader?: boolean;
  enablePdfGeneration?: boolean;
  enableRepeatMode?: boolean;
  readonly?: boolean;
  customTitle?: string;
  customSubtitle?: string;
}

@Component({
  selector: 'app-universal-form-renderer',
  standalone: true,
  imports: [
    CommonModule,
    DynamicFormComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatDividerModule
  ],
  templateUrl: './universal-form-renderer.component.html',
  styleUrl: './universal-form-renderer.component.css'
})
export class UniversalFormRendererComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly formConfigService = inject(FormConfigService);
  private readonly pdfTemplateService = inject(PdfTemplateService);
  private readonly submissionService = inject(FormSubmissionService);
  private readonly snackBar = inject(MatSnackBar);

  // Reactive signals
  currentConfiguration = signal<FormConfiguration | null>(null);
  availableCompanies = signal<string[]>([]);
  isLoading = signal<boolean>(true);
  formConfig = signal<any>(null);
  selectedCompanyId = signal<string>('');

  // Route parameters
  formType = signal<string>('');
  category = signal<string>('');

  // Component configuration
  config = signal<UniversalFormConfig>({
    formType: '',
    allowCompanySelection: true,
    showHeader: true,
    enablePdfGeneration: true,
    enableRepeatMode: true
  });

  // Computed properties
  pageTitle = computed(() => {
    const config = this.currentConfiguration();
    return this.config().customTitle || config?.name || this.getDefaultTitle();
  });

  pageSubtitle = computed(() => {
    const config = this.currentConfiguration();
    return this.config().customSubtitle ||
           config?.metadata?.description ||
           this.getDefaultSubtitle();
  });

  formIcon = computed(() => this.getFormIcon(this.formType()));

  breadcrumb = computed(() => {
    const category = this.category();
    const formType = this.formType();
    return {
      category: this.getCategoryDisplayName(category),
      formType: this.getFormTypeDisplayName(formType)
    };
  });

  ngOnInit() {
    this.initializeFromRoute();
    this.loadAvailableCompanies();
    this.loadFormConfiguration();
  }

  private initializeFromRoute(): void {
    this.route.params.subscribe(params => {
      this.formType.set(params['formType'] || '');
      this.category.set(params['category'] || 'public');

      // Update configuration based on route
      this.config.update(current => ({
        ...current,
        formType: this.formType(),
        category: this.category() as any
      }));
    });

    this.route.queryParams.subscribe(params => {
      this.selectedCompanyId.set(params['companyId'] || '');

      // Handle repeat mode
      if (params['repeat'] && params['submissionId']) {
        this.handleRepeatMode(params['submissionId']);
      }
    });
  }

  private loadAvailableCompanies(): void {
    this.formConfigService.getAvailableCompanies().subscribe({
      next: (companies) => {
        this.availableCompanies.set(companies);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
      }
    });
  }

  private loadFormConfiguration(): void {
    if (!this.formType()) return;

    this.isLoading.set(true);

    this.formConfigService.getFormConfig(
      this.formType(),
      this.selectedCompanyId() || undefined
    ).subscribe({
      next: (config) => {
        if (config) {
          this.currentConfiguration.set(config);
          this.formConfig.set({
            formType: this.formType(),
            title: config.name,
            submitButtonText: this.getSubmitButtonText(),
            showCompanySelector: this.config().allowCompanySelection,
            showHeader: false, // We handle header separately
            enablePdfGeneration: this.config().enablePdfGeneration,
            readonly: this.config().readonly
          });
        } else {
          this.handleNoConfigurationFound();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading form configuration:', error);
        this.isLoading.set(false);
        this.showErrorMessage('Failed to load form configuration');
      }
    });
  }

  private handleNoConfigurationFound(): void {
    this.showErrorMessage(
      `No configuration found for form type: ${this.formType()}`,
      'Go to Form Builder',
      () => {
        this.router.navigate(['/form-builder'], {
          queryParams: { createType: this.formType() }
        });
      }
    );
  }

  private handleRepeatMode(submissionId: string): void {
    // Load submission data for repeat mode
    this.submissionService.getSubmission(submissionId).subscribe({
      next: (submission) => {
        if (submission) {
          // Pre-populate form with submission data
          this.formConfig.update(current => ({
            ...current,
            initialData: submission.formData,
            enableRepeatMode: true,
            originalSubmissionId: submissionId
          }));
        }
      },
      error: (error) => {
        console.error('Error loading submission for repeat:', error);
        this.showErrorMessage('Failed to load submission data');
      }
    });
  }

  onCompanyChange(companyId: string): void {
    this.selectedCompanyId.set(companyId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.route.snapshot.queryParams, companyId },
      queryParamsHandling: 'merge'
    });
    this.loadFormConfiguration();
  }

  retryLoadConfiguration(): void {
    this.loadFormConfiguration();
  }

  onFormSubmitted(submission: any): void {
    const config = this.currentConfiguration();
    if (!config) return;

    // Generate PDF if enabled
    if (this.config().enablePdfGeneration) {
      this.generatePdf(submission.data);
    }

    // Save submission
    this.submissionService.createSubmission(
      this.formType(),
      config.name,
      submission.data,
      config.sections
    ).subscribe({
      next: (result: FormSubmission) => {
        this.showSuccessMessage(
          `${config.name} submitted successfully!`,
          'View Submissions',
          () => {
            this.router.navigate(['/submissions'], {
              queryParams: { formType: this.formType() }
            });
          }
        );
      },
      error: (error: any) => {
        console.error('Error saving submission:', error);
        this.showErrorMessage('Failed to save submission');
      }
    });
  }

  onFormSaved(data: any): void {
    this.showSuccessMessage('Form saved as draft');
  }

  private generatePdf(formData: any): void {
    const config = this.currentConfiguration();
    if (!config) return;

    try {
      // Find the default template or create a basic one
      const templateId = 'default-' + this.formType();
      this.pdfTemplateService.generatePdf(templateId, formData, this.formType());
      this.showSuccessMessage('PDF generated successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      this.showErrorMessage('Failed to generate PDF');
    }
  }

  // Utility methods
  private getDefaultTitle(): string {
    return this.getFormTypeDisplayName(this.formType());
  }

  private getDefaultSubtitle(): string {
    const category = this.getCategoryDisplayName(this.category());
    return `${category} form powered by dynamic form builder`;
  }

  private getFormTypeDisplayName(formType: string): string {
    const types: Record<string, string> = {
      'rfq': 'Request for Quote',
      'contact': 'Contact Form',
      'survey': 'Survey Form',
      'application': 'Application Form',
      'feedback': 'Feedback Form',
      'registration': 'Registration Form'
    };
    return types[formType] || formType.charAt(0).toUpperCase() + formType.slice(1);
  }

  private getCategoryDisplayName(category: string): string {
    const categories: Record<string, string> = {
      'reps': 'Sales Representative',
      'clients': 'Client',
      'admin': 'Administrative',
      'public': 'Public'
    };
    return categories[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  private getFormIcon(formType: string): string {
    const icons: Record<string, string> = {
      'rfq': 'request_quote',
      'contact': 'contact_mail',
      'survey': 'poll',
      'application': 'description',
      'feedback': 'feedback',
      'registration': 'person_add'
    };
    return icons[formType] || 'dynamic_form';
  }

  private getSubmitButtonText(): string {
    const formType = this.formType();
    const texts: Record<string, string> = {
      'rfq': 'Submit Quote Request',
      'contact': 'Send Message',
      'survey': 'Submit Survey',
      'application': 'Submit Application',
      'feedback': 'Submit Feedback',
      'registration': 'Complete Registration'
    };
    return texts[formType] || 'Submit Form';
  }

  private showSuccessMessage(message: string, action?: string, actionCallback?: () => void): void {
    const snackBarRef = this.snackBar.open(message, action || 'Close', {
      duration: action ? 0 : 4000,
      panelClass: ['success-snackbar']
    });

    if (action && actionCallback) {
      snackBarRef.onAction().subscribe(actionCallback);
    }
  }

  private showErrorMessage(message: string, action?: string, actionCallback?: () => void): void {
    const snackBarRef = this.snackBar.open(message, action || 'Close', {
      duration: action ? 0 : 6000,
      panelClass: ['error-snackbar']
    });

    if (action && actionCallback) {
      snackBarRef.onAction().subscribe(actionCallback);
    }
  }
}
