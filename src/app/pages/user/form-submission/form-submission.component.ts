import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { EnhancedFormConfiguration } from '../../../models/form.models';
import { FormService } from '../../../services/form.service';
import { NotificationService } from '../../../services/notification.service';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-form-submission',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatRadioModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: '',
  styles: ''
})
export class FormSubmissionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formService = inject(FormService);
  private readonly notificationService = inject(NotificationService);
  private readonly utils = inject(UtilsService);

  // Component State
  formConfig = signal<EnhancedFormConfiguration | null>(null);
  submissionForm!: FormGroup;
  isSubmitting = signal(false);
  currentSubmissionId: string | null = null; // Track if editing a draft
  formId = signal<string>('');
  attachments = signal<File[]>([]);

  // Computed
  loading = computed(() => this.formService.loading());
  isValid = computed(() => this.submissionForm?.valid || false);
  formTitle = computed(() => this.formConfig()?.name || 'Form Submission');
  requiresApproval = computed(() => this.formConfig()?.requiresApproval || false);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.formId.set(params['id']);
        this.loadForm(params['id']);
      }
    });
  }

  private loadForm(formId: string): void {
    this.formService.getFormConfiguration(formId).subscribe({
      next: (config) => {
        this.formConfig.set(config);
        this.buildDynamicForm(config);
      },
      error: () => {
        this.notificationService.showError('Failed to load form');
        this.router.navigate(['/forms']);
      }
    });
  }

  private buildDynamicForm(config: EnhancedFormConfiguration): void {
    const group: any = {};

    // Build form controls from configuration
    config.fields.forEach((field: any) => {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.type === 'email') {
        validators.push(Validators.email);
      }

      if (field.minLength) {
        validators.push(Validators.minLength(field.minLength));
      }

      if (field.maxLength) {
        validators.push(Validators.maxLength(field.maxLength));
      }

      if (field.pattern) {
        validators.push(Validators.pattern(field.pattern));
      }

      // Initialize control with default value and validators
      group[field.name] = [field.defaultValue || '', validators];
    });

    this.submissionForm = this.fb.group(group);
  }

  getFieldControl(fieldName: string): FormControl {
    return this.submissionForm.get(fieldName) as FormControl;
  }

  getFieldError(fieldName: string): string {
    const control = this.getFieldControl(fieldName);

    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Invalid format';
    }

    return '';
  }

  onFileSelect(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.attachments.update(current => [...current, ...files]);

      // Store file reference in form
      this.submissionForm.patchValue({
        [fieldName]: files.map(f => f.name).join(', ')
      });
    }
  }

  removeAttachment(index: number): void {
    this.attachments.update(current => {
      const newAttachments = [...current];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  }

  saveDraft(): void {
    if (!this.formConfig()) return;

    this.isSubmitting.set(true);

    const formData = this.submissionForm.value;

    this.formService.submitForm({
      formConfigurationId: this.formId(),
      data: formData,
      isDraft: true,
      attachments: this.attachments()
    }).subscribe({
      next: (submission) => {
        this.isSubmitting.set(false);
        this.currentSubmissionId = submission.id;
        this.notificationService.showSuccess('Draft saved successfully');
        this.router.navigate(['/forms']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notificationService.showError('Failed to save draft');
      }
    });
  }

  submit(): void {
    if (this.submissionForm.invalid) {
      this.submissionForm.markAllAsTouched();
      this.notificationService.showError('Please fill in all required fields');
      return;
    }

    this.isSubmitting.set(true);

    const formData = this.submissionForm.value;

    this.formService.submitForm({
      formConfigurationId: this.formId(),
      data: formData,
      isDraft: false,
      attachments: this.attachments()
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.showSuccess(
          this.requiresApproval()
            ? 'Form submitted successfully and pending approval'
            : 'Form submitted successfully'
        );
        this.router.navigate(['/forms']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notificationService.showError('Failed to submit form');
      }
    });
  }

  cancel(): void {
    if (this.submissionForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.router.navigate(['/forms']);
      }
    } else {
      this.router.navigate(['/forms']);
    }
  }

  getFieldType(field: any): string {
    return field.type || 'text';
  }

  isFieldVisible(field: any): boolean {
    // Implement conditional logic here if needed (e.g., based on other field values)
    return !field.hidden;
  }

  formatBytes(bytes: number): string {
    return this.utils.formatBytes(bytes);
  }

  isDraft(): boolean {
    return this.currentSubmissionId !== null;
  }
}
