import { Component, OnInit, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';

import { FormConfigService, FormConfiguration } from '../../services/form-config.service';
import { FormSubmissionService } from '../../services/form-submission.service';
import { ReusableFormComponent, FormSection } from '../reusable-form/reusable-form.component';

export interface DynamicFormConfig {
  formType: string;
  title?: string;
  submitButtonText?: string;
  showCompanySelector?: boolean;
  showHeader?: boolean;
  readonly?: boolean;
  autoSave?: boolean;
  validationMode?: 'onChange' | 'onSubmit' | 'onBlur';
}

export interface FormSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
  data?: any;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReusableFormComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.css'
})
export class DynamicFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formConfigService = inject(FormConfigService);
  private readonly formSubmissionService = inject(FormSubmissionService);
  private readonly snackBar = inject(MatSnackBar);

  // Configuration inputs
  @Input() config: DynamicFormConfig = { formType: 'rfq' };
  @Input() companyId?: string;
  @Input() initialData?: any;
  @Input() customTitle?: string;
  @Input() customSubmitText?: string;

  // Feature toggles
  @Input() enableRepeatMode: boolean = false;
  @Input() enableDrafts: boolean = false;
  @Input() enableValidation: boolean = true;
  @Input() enableAutoSave: boolean = false;

  // Output events
  @Output() formSubmit = new EventEmitter<FormSubmissionResult>();
  @Output() formChange = new EventEmitter<any>();
  @Output() companyChange = new EventEmitter<string>();
  @Output() configurationLoad = new EventEmitter<FormConfiguration>();
  @Output() validationChange = new EventEmitter<boolean>();

  // Reactive state using signals
  formSections = signal<FormSection[]>([]);
  currentConfiguration = signal<FormConfiguration | null>(null);
  selectedCompanyId = signal<string>('');
  isLoading = signal<boolean>(true);
  configLoadError = signal<boolean>(false);
  validationErrors = signal<string[]>([]);
  isDirty = signal<boolean>(false);

  // Computed properties
  availableCompanies$ = this.formConfigService.getAvailableCompanies();
  formTitle = computed(() =>
    this.customTitle ||
    this.config.title ||
    this.getDefaultTitle(this.config.formType)
  );
  submitButtonText = computed(() =>
    this.customSubmitText ||
    this.config.submitButtonText ||
    this.getDefaultSubmitText(this.config.formType)
  );
  showCompanySelector = computed(() =>
    this.config.showCompanySelector !== false
  );
  showHeader = computed(() =>
    this.config.showHeader !== false
  );
  isReadonly = computed(() => this.config.readonly || false);
  fieldCount = computed(() => this.getTotalFieldCount());

  // Repeat mode state
  isRepeatMode = signal<boolean>(false);
  originalSubmissionId = signal<string | null>(null);

  ngOnInit() {
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadFormConfiguration();
  }

  private initializeComponent(): void {
    // Set company ID from input or route
    const routeCompanyId = this.route.snapshot.queryParams['companyId'];
    const initialCompanyId = this.companyId || routeCompanyId || '';
    this.selectedCompanyId.set(initialCompanyId);

    // Check for repeat mode
    const repeatId = this.route.snapshot.queryParams['repeat'];
    const submissionId = this.route.snapshot.queryParams['submissionId'];

    if (this.enableRepeatMode && repeatId && submissionId) {
      this.isRepeatMode.set(true);
      this.originalSubmissionId.set(submissionId);
      this.loadSubmissionForRepeat(submissionId);
    }
  }

  private setupRouteHandling(): void {
    // Listen for route parameter changes
    this.route.queryParams.subscribe(params => {
      const newCompanyId = params['companyId'] || '';
      if (newCompanyId !== this.selectedCompanyId()) {
        this.selectedCompanyId.set(newCompanyId);
        this.companyChange.emit(newCompanyId);
        this.loadFormConfiguration();
      }
    });
  }

  private loadFormConfiguration(): void {
    this.isLoading.set(true);
    this.configLoadError.set(false);
    this.validationErrors.set([]);

    console.log(`🔄 Loading ${this.config.formType} configuration for company:`,
      this.selectedCompanyId() || 'default');

    this.formConfigService.getFormConfig(
      this.config.formType,
      this.selectedCompanyId() || undefined
    ).subscribe({
      next: (config) => {
        if (config) {
          console.log('✅ Form configuration loaded:', config.name);
          this.currentConfiguration.set(config);
          this.formSections.set(config.sections);
          this.configurationLoad.emit(config);
        } else {
          console.log('⚠️ No configuration found, loading fallback');
          this.loadFallbackConfiguration();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading form configuration:', error);
        this.configLoadError.set(true);
        this.isLoading.set(false);
        this.showErrorMessage('Error loading form configuration', 'Retry', () => {
          this.loadFormConfiguration();
        });
      }
    });
  }

  private loadFallbackConfiguration(): void {
    console.log(`🔄 Loading fallback configuration for ${this.config.formType}`);

    this.formConfigService.getFormSections(
      this.config.formType,
      this.selectedCompanyId() || undefined
    ).subscribe({
      next: (sections) => {
        this.formSections.set(sections);

        // Create temporary configuration for fallback
        const fallbackConfig: FormConfiguration = {
          id: `fallback-${this.config.formType}`,
          name: `Default ${this.formTitle()}`,
          formType: this.config.formType,
          version: '1.0.0',
          companyId: this.selectedCompanyId() || undefined,
          isDefault: true,
          isActive: true,
          sections: sections,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            description: 'Fallback configuration'
          }
        };

        this.currentConfiguration.set(fallbackConfig);
        this.configurationLoad.emit(fallbackConfig);
      },
      error: (error) => {
        console.error('❌ Error loading fallback configuration:', error);
        this.configLoadError.set(true);
        this.showErrorMessage(
          `Unable to load ${this.config.formType} form`,
          'Contact Support'
        );
      }
    });
  }

  private loadSubmissionForRepeat(submissionId: string): void {
    this.formSubmissionService.getSubmission(submissionId).subscribe({
      next: (submission) => {
        if (submission) {
          console.log('📋 Loading submission for repeat:', submissionId);
          // Process and clean data for repeat
          const repeatData = this.prepareDataForRepeat(submission.formData);
          // Set initial data will be handled by the form component
          this.initialData = { ...this.initialData, ...repeatData };
        }
      },
      error: (error) => {
        console.error('❌ Error loading submission for repeat:', error);
        this.showErrorMessage('Error loading original submission data');
      }
    });
  }

  private prepareDataForRepeat(originalData: any): any {
    const cleanedData = { ...originalData };

    // Remove fields that shouldn't be repeated
    const fieldsToRemove = [
      'submissionId', 'dateSubmitted', 'status',
      'createdAt', 'updatedAt', '_metadata'
    ];

    fieldsToRemove.forEach(field => delete cleanedData[field]);

    // Set new submission date
    const today = new Date();
    cleanedData.dateSubmitted = today.toISOString().split('T')[0];

    return cleanedData;
  }

  onCompanySelectionChange(companyId: string): void {
    console.log('🏢 Company selection changed:', companyId);
    this.selectedCompanyId.set(companyId);
    this.companyChange.emit(companyId);

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { companyId: companyId || null },
      queryParamsHandling: 'merge'
    });
  }

  onFormSubmit(formData: any): void {
    console.log('📝 Form submitted with data:', formData);

    if (!this.validateSubmission(formData)) {
      return;
    }

    const currentConfig = this.currentConfiguration();
    if (!currentConfig) {
      this.showErrorMessage('No configuration available for submission');
      return;
    }

    // Prepare enhanced submission data
    const submissionData = {
      ...formData,
      _metadata: {
        formType: this.config.formType,
        companyId: this.selectedCompanyId() || undefined,
        configurationId: currentConfig.id,
        configurationName: currentConfig.name,
        configurationVersion: currentConfig.version,
        submittedAt: new Date().toISOString(),
        isRepeat: this.isRepeatMode(),
        originalSubmissionId: this.originalSubmissionId(),
        userAgent: navigator.userAgent,
        formTitle: this.formTitle(),
        totalFields: this.fieldCount()
      }
    };

    // Submit to service
    this.formSubmissionService.createSubmission(
      this.config.formType,
      this.formTitle(),
      submissionData,
      this.formSections()
    ).subscribe({
      next: (submission) => {
        console.log('✅ Form submitted successfully:', submission.submissionId);

        const result: FormSubmissionResult = {
          success: true,
          submissionId: submission.submissionId,
          data: formData
        };

        this.showSuccessMessage();
        this.formSubmit.emit(result);
        this.isDirty.set(false);
      },
      error: (error) => {
        console.error('❌ Error submitting form:', error);

        const result: FormSubmissionResult = {
          success: false,
          error: error.message
        };

        this.showErrorMessage(`Error submitting ${this.config.formType}`);
        this.formSubmit.emit(result);
      }
    });
  }

  onFormValueChange(formValue: any): void {
    this.isDirty.set(true);
    this.formChange.emit(formValue);

    // Auto-save if enabled
    if (this.enableAutoSave && this.enableDrafts) {
      this.autoSaveForm(formValue);
    }

    // Validate if enabled
    if (this.enableValidation && this.config.validationMode === 'onChange') {
      this.validateForm(formValue);
    }
  }

  private validateSubmission(formData: any): boolean {
    if (!this.enableValidation) return true;

    const errors: string[] = [];

    // Basic validation
    if (!formData || Object.keys(formData).length === 0) {
      errors.push('Form data is required');
    }

    // Configuration-specific validation
    const config = this.currentConfiguration();
    if (config) {
      config.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.required && !formData[field.name]) {
            errors.push(`${field.label || field.name} is required`);
          }
        });
      });
    }

    this.validationErrors.set(errors);
    this.validationChange.emit(errors.length === 0);

    if (errors.length > 0) {
      this.showErrorMessage(`Please fix ${errors.length} validation error(s)`);
      return false;
    }

    return true;
  }

  private validateForm(formData: any): void {
    // Implement real-time validation logic
    const errors: string[] = [];
    // Add validation rules here
    this.validationErrors.set(errors);
    this.validationChange.emit(errors.length === 0);
  }

  autoSaveForm(formData: any): void {
    // Implement auto-save functionality
    console.log('💾 Auto-saving form data...');
    // This could save to localStorage or send to server
  }

  retryConfiguration(): void {
    this.loadFormConfiguration();
  }

  // Utility methods
  private getDefaultTitle(formType: string): string {
    const titles: Record<string, string> = {
      'rfq': 'Request for Quote',
      'quote': 'Generate Quote',
      'invoice': 'Create Invoice',
      'estimate': 'Project Estimate',
      'proposal': 'Project Proposal',
      'contract': 'Service Contract',
      'order': 'Purchase Order'
    };
    return titles[formType.toLowerCase()] || `${formType.toUpperCase()} Form`;
  }

  private getDefaultSubmitText(formType: string): string {
    const submitTexts: Record<string, string> = {
      'rfq': 'Submit RFQ',
      'quote': 'Generate Quote',
      'invoice': 'Create Invoice',
      'estimate': 'Submit Estimate',
      'proposal': 'Submit Proposal',
      'contract': 'Create Contract',
      'order': 'Place Order'
    };
    return submitTexts[formType.toLowerCase()] || 'Submit Form';
  }

  getFormTypeIcon(): string {
    const icons: Record<string, string> = {
      'rfq': 'request_quote',
      'quote': 'receipt',
      'invoice': 'payment',
      'estimate': 'calculate',
      'proposal': 'description',
      'contract': 'gavel',
      'order': 'shopping_cart'
    };
    return icons[this.config.formType.toLowerCase()] || 'assignment';
  }

  getCompanyDisplayName(companyId: string): string {
    return companyId || 'Default';
  }

  getTotalFieldCount(): number {
    const sections = this.formSections();
    return sections.reduce((total, section) => total + section.fields.length, 0);
  }

  private showSuccessMessage(): void {
    this.snackBar.open(
      `${this.formTitle()} ${this.isRepeatMode() ? 'repeated' : 'submitted'} successfully!`,
      'Close',
      {
        duration: 5000,
        panelClass: ['success-snackbar']
      }
    );
  }

  private showErrorMessage(message: string, action?: string, callback?: () => void): void {
    const snackBarRef = this.snackBar.open(
      message,
      action || 'Close',
      {
        duration: action ? 0 : 5000,
        panelClass: ['error-snackbar']
      }
    );

    if (action && callback) {
      snackBarRef.onAction().subscribe(callback);
    }
  }
}
