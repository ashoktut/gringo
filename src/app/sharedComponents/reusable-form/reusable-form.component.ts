import {
  Component,
  Input,
  Output,
  EventEmitter,
  Injectable,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';

// Import your existing PDF services
import { PdfTemplateService, Template } from '../../services/pdf-template.service';
import { PdfGenerationService } from '../../services/pdf-generation.service';
import { DocxProcessingService } from '../../services/docx-processing.service';
import { Template as DocxTemplate, DocumentType } from '../../models/template.models';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter,
} from '@angular/material/core';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MapLibrePickerComponent } from '../map-libre-picker/map-libre-picker.component';
import { DigitalSignatureComponent } from '../digital-signature/digital-signature.component';
import { PictureUploadComponent } from '../picture-upload/picture-upload.component';

// Custom Date Adapter for DD/MM/YYYY format
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.indexOf('/') > -1) {
      const str = value.split('/');
      if (str.length === 3) {
        const day = Number(str[0]);
        const month = Number(str[1]) - 1;
        const year = Number(str[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    const timestamp = typeof value === 'number' ? value : Date.parse(value);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  override format(date: Date, displayFormat: Object): string {
    if (!date) return '';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${this._to2digit(day)}/${this._to2digit(month)}/${year}`;
  }

  private _to2digit(n: number) {
    return ('00' + n).slice(-2);
  }
}

// Custom date format
export const DD_MM_YYYY_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export interface FormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'tel'
    | 'map'
    | 'signature'
    | 'label'
    | 'picture'


  required?: boolean;
  placeholder?: string;
  options?: { value: any; label: string }[];
  validators?: any[];
  rows?: number; // for textarea
  multiple?: boolean; // for select
  clearable?: boolean; // show a clear button
  // ADD THESE NEW PROPERTIES FOR CONDITIONAL FIELDS
  conditional?: {
    dependsOn: string; // field name it depends on
    showWhen: any; // value that triggers showing this field
  };
  // ADD MAP CONFIGURATION OBJECT - defines map behavior and appearance
  mapConfig?: {
    defaultCenter?: [number, number]; // [lng, lat] - Note: MapLibre uses [lng, lat] format
    zoom?: number; // Initial zoom level (1-20)
    height?: string; // CSS height value like '400px'
    enableGeocoding?: boolean; // Show address search box
    enableLocationPicker?: boolean; // Allow clicking to select location
    enableTracking?: boolean; // Enable real-time GPS tracking
    enableRouting?: boolean; // Enable route calculation
    style?: string; // Map style URL from OpenFreeMap
  };
  // ✅ ADD SIGNATURE CONFIGURATION
  signatureConfig?: {
    canvasWidth?: number;
    canvasHeight?: number;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
  };

  // 📷 ADD PICTURE CONFIGURATION
  pictureConfig?: {
    maxFileSize?: number; // Max file size in bytes (default: 5MB)
    acceptedTypes?: string[]; // Accepted MIME types (default: common image types)
    placeholder?: string; // Button text placeholder
  };

  // 🏷️ ADD LABEL CONFIGURATION
  labelConfig?: {
    style?: 'default' | 'title' | 'subtitle' | 'caption' | 'info' | 'warning' | 'error'; // Visual style
    alignment?: 'left' | 'center' | 'right'; // Text alignment
    color?: string; // Custom color
    fontSize?: string; // Custom font size
    bold?: boolean; // Bold text
    italic?: boolean; // Italic text
  };
  text?: string; // For label type - the text content to display
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  expanded?: boolean; // whether panel is initially expanded
}

@Component({
  selector: 'app-reusable-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDatepickerModule,
    MatButtonModule,
    MatNativeDateModule,
    MatIconModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MapLibrePickerComponent,
    DigitalSignatureComponent,
    PictureUploadComponent,
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './reusable-form.component.html',
  styleUrl: './reusable-form.component.css',
})
export class ReusableFormComponent implements OnInit, OnChanges, OnDestroy {
  private readonly snackBar = inject(MatSnackBar);
  private readonly pdfTemplateService = inject(PdfTemplateService);
  private readonly pdfGenerationService = inject(PdfGenerationService);
  private readonly docxProcessingService = inject(DocxProcessingService);

  // Standard inputs
  @Input() fields: FormField[] = [];
  @Input() sections?: FormSection[]; // optional grouped mode
  @Input() multi: boolean = true; // allow multiple panels open
  @Input() submitButtonText: string = 'Submit';
  @Input() formTitle?: string;
  @Input() initialData: any = null; // Add this for repeat functionality

  // Enhanced enterprise features inputs
  @Input() enableAutoSave: boolean = false;
  @Input() autoSaveInterval: number = 30000; // 30 seconds
  @Input() enableCompanySelector: boolean = false;
  @Input() availableCompanies: { id: string; name: string }[] = [];
  @Input() selectedCompanyId?: string;
  @Input() enableValidationFeedback: boolean = true;
  @Input() enableDraftMode: boolean = false;
  @Input() validationMode: 'onChange' | 'onSubmit' | 'onBlur' = 'onChange';
  @Input() showFormProgress: boolean = false;
  @Input() enableFieldHints: boolean = true;

  // Output events
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formValueChange = new EventEmitter<any>();
  @Output() companyChange = new EventEmitter<string>();
  @Output() autoSaveTriggered = new EventEmitter<any>();
  @Output() validationStateChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();
  @Output() formProgressChange = new EventEmitter<{ completed: number; total: number }>();

  // Reactive state using signals
  isLoading = signal<boolean>(false);
  isDirty = signal<boolean>(false);
  validationErrors = signal<string[]>([]);
  autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  currentCompanyId = signal<string>('');

  // Computed properties
  formProgress = computed(() => {
    if (!this.showFormProgress || !this.form) return { completed: 0, total: 0 };

    const allFields = this.getAllFields().filter(f => f.type !== 'label');
    const completedFields = allFields.filter(field => {
      const control = this.form.get(field.name);
      return control && control.value && control.valid;
    });

    return { completed: completedFields.length, total: allFields.length };
  });

  isFormValid = computed(() => {
    return this.form?.valid ?? false;
  });

  autoSaveStatusText = computed(() => {
    switch (this.autoSaveStatus()) {
      case 'saving': return 'Saving...';
      case 'saved': return 'All changes saved';
      case 'error': return 'Auto-save failed';
      default: return '';
    }
  });

  form!: FormGroup;
  private lastErrorLog: { [key: string]: number } = {}; // Track error logging timestamps
  private autoSaveSubscription?: Subscription;
  private formChangeSubscription?: Subscription;

  constructor(private fb: FormBuilder) {}

// ✅ Enhanced ngOnInit with enterprise features
ngOnInit() {
  this.buildForm();

  // Set initial company if provided
  if (this.selectedCompanyId) {
    this.currentCompanyId.set(this.selectedCompanyId);
  }

  // Populate form with initial data if provided (for repeat functionality)
  if (this.initialData) {
    setTimeout(() => {
      this.populateFormWithData(this.initialData);
    }, 100);
  }

  this.setupFormMonitoring();
  this.setupAutoSave();
  this.setupValidationFeedback();
}

private setupFormMonitoring() {
  // Monitor form value changes with enterprise features
  this.formChangeSubscription = this.form.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe((value) => {
      this.isDirty.set(true);
      this.formValueChange.emit(value);

      // Update form progress
      if (this.showFormProgress) {
        const progress = this.formProgress();
        this.formProgressChange.emit(progress);
      }

      // Trigger validation feedback if enabled
      if (this.enableValidationFeedback && this.validationMode === 'onChange') {
        this.updateValidationState();
      }

      // Drastically reduce logging frequency for better performance
      if (Math.random() < 0.001) { // Only log 0.1% of changes
        console.log('Form value changed:', value);
      }
    });

  // Monitor form status changes with minimal logging
  this.form.statusChanges.subscribe((status) => {
    if (this.enableValidationFeedback) {
      this.updateValidationState();
    }

    if (Math.random() < 0.001) { // Only log 0.1% of status changes
      console.log('Form status changed:', status);
    }
  });
}

private setupAutoSave() {
  if (!this.enableAutoSave) return;

  this.autoSaveSubscription = this.form.valueChanges
    .pipe(
      debounceTime(this.autoSaveInterval),
      distinctUntilChanged()
    )
    .subscribe((value) => {
      if (this.isDirty() && this.form.valid) {
        this.performAutoSave(value);
      }
    });
}

private setupValidationFeedback() {
  if (!this.enableValidationFeedback) return;

  // Setup validation based on mode
  if (this.validationMode === 'onBlur') {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.valueChanges.pipe(debounceTime(300)).subscribe(() => {
          // For onBlur validation, we'll update on value change after delay
          setTimeout(() => {
            this.updateValidationState();
          }, 300);
        });
      }
    });
  }
}

private updateValidationState() {
  const errors: string[] = [];
  const formErrors = this.form.errors;

  if (formErrors) {
    Object.keys(formErrors).forEach(key => {
      errors.push(`Form error: ${key}`);
    });
  }

  Object.keys(this.form.controls).forEach(key => {
    const control = this.form.get(key);
    if (control && control.errors) {
      Object.keys(control.errors).forEach(errorKey => {
        const field = this.getAllFields().find(f => f.name === key);
        const fieldLabel = field?.label || key;
        errors.push(`${fieldLabel}: ${this.getErrorMessage(errorKey, control.errors![errorKey])}`);
      });
    }
  });

  this.validationErrors.set(errors);
  this.validationStateChange.emit({
    isValid: this.form.valid,
    errors: errors
  });
}

private performAutoSave(value: any) {
  this.autoSaveStatus.set('saving');

  // Emit auto-save event with current form data
  this.autoSaveTriggered.emit({
    formData: value,
    timestamp: new Date(),
    companyId: this.currentCompanyId()
  });

  // Simulate auto-save completion (in real app, this would be handled by parent component)
  setTimeout(() => {
    this.autoSaveStatus.set('saved');
    this.isDirty.set(false);

    if (this.enableValidationFeedback) {
      this.snackBar.open('Changes auto-saved', 'Dismiss', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    }

    // Reset status after a delay
    setTimeout(() => {
      this.autoSaveStatus.set('idle');
    }, 3000);
  }, 1000);
}

private getErrorMessage(errorKey: string, errorValue: any): string {
  switch (errorKey) {
    case 'required': return 'This field is required';
    case 'email': return 'Please enter a valid email address';
    case 'min': return `Minimum value is ${errorValue.min}`;
    case 'max': return `Maximum value is ${errorValue.max}`;
    case 'minlength': return `Minimum length is ${errorValue.requiredLength} characters`;
    case 'maxlength': return `Maximum length is ${errorValue.requiredLength} characters`;
    case 'pattern': return 'Please enter a valid format';
    default: return `Invalid ${errorKey}`;
  }
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['sections']) {
      this.buildForm();
    }

    if (changes['selectedCompanyId'] && changes['selectedCompanyId'].currentValue) {
      this.currentCompanyId.set(changes['selectedCompanyId'].currentValue);
      this.onCompanyChange(changes['selectedCompanyId'].currentValue);
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
    }
  }

  // Company handling methods
  onCompanyChange(companyId: string): void {
    this.currentCompanyId.set(companyId);
    this.companyChange.emit(companyId);
    this.isDirty.set(true);

    if (this.enableValidationFeedback) {
      this.snackBar.open(`Company selection updated: ${this.getCompanyName(companyId)}`, 'Dismiss', {
        duration: 2000,
        panelClass: ['info-snackbar']
      });
    }
  }

  private getCompanyName(companyId: string): string {
    const company = this.availableCompanies.find(c => c.id === companyId);
    return company?.name || companyId;
  }

  // Enhanced submit handling
  onSubmit(): void {
    if (this.validationMode === 'onSubmit') {
      this.updateValidationState();
    }

    if (this.form.valid) {
      const formData = {
        ...this.form.value,
        companyId: this.currentCompanyId(),
        submittedAt: new Date(),
        formMetadata: {
          isDraft: this.enableDraftMode,
          validationErrors: this.validationErrors(),
          autoSaveEnabled: this.enableAutoSave
        }
      };

      this.formSubmit.emit(formData);
      this.isDirty.set(false);

      if (this.enableValidationFeedback) {
        this.snackBar.open('Form submitted successfully', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    } else {
      this.updateValidationState();

      if (this.enableValidationFeedback) {
        this.snackBar.open('Please fix validation errors before submitting', 'Dismiss', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  private getAllFields(): FormField[] {
    if (this.sections?.length) {
      return this.sections.flatMap((s) => s.fields);
    }
    return this.fields;
  }

  // private buildForm(): void {
  //   const group: { [key: string]: FormControl } = {};

  //   this.getAllFields().forEach((field) => {
  //     const validators = this.getValidators(field);
  //     const initialValue = field.type === 'checkbox' ? false : '';
  //     group[field.name] = new FormControl(initialValue, validators);
  //   });

  //   this.form = this.fb.group(group);
  // }

  private buildForm(): void {
    const group: { [key: string]: FormControl } = {};
    const allFields = this.getAllFields();

    allFields.forEach((field) => {
      // Skip creating form controls for label fields (they're display-only)
      if (field.type === 'label') {
        return;
      }

      const validators = this.getValidators(field);
      // Use initialData if provided
      let initialValue = null;
      if (this.initialData && this.initialData.hasOwnProperty(field.name)) {
        initialValue = this.initialData[field.name];
      } else if (field.type === 'checkbox') {
        initialValue = false;
      } else if (field.type === 'select' && field.multiple) {
        initialValue = [];
      } else if (field.type === 'number') {
        initialValue = 0;
      } else if (field.type === 'picture') {
        initialValue = null;
      } else {
        initialValue = '';
      }
      group[field.name] = new FormControl(initialValue, validators);
    });

    this.form = this.fb.group(group);

    // Add value change listeners for conditional fields
    this.setupConditionalFields();

    // ✅ ADD: Force initial validation update
    setTimeout(() => {
      this.form.updateValueAndValidity();
    }, 0);
  }

  private setupConditionalFields(): void {
    const allFields = this.getAllFields();
    const conditionalFields = allFields.filter((field) => field.conditional);

    conditionalFields.forEach((field) => {
      const dependentControl = this.form.get(field.conditional!.dependsOn);
      if (dependentControl) {
        dependentControl.valueChanges.subscribe((value) => {
          const fieldControl = this.form.get(field.name);
          if (fieldControl) {
            let shouldShow = false;

            // Check for special 'hasValue' condition
            if (field.conditional!.showWhen === 'hasValue') {
              shouldShow = value !== null && value !== undefined && value !== '';
            } else {
              // Default: exact value matching
              shouldShow = value === field.conditional!.showWhen;
            }

            if (!shouldShow) {
              // Clear and disable field when hidden
              fieldControl.setValue(field.type === 'checkbox' ? false : null);
              fieldControl.clearValidators();
              fieldControl.setErrors(null); // ✅ ADD: Clear any existing errors
            } else {
              // Re-apply validators when shown
              const validators = this.getValidators(field);
              fieldControl.setValidators(validators);
            }
            fieldControl.updateValueAndValidity();
          }
        });
      }
    });
  }

  private getValidators(field: FormField): any[] {
    const validators = [];

    // Only add required validator if field is not conditional or should be shown
    if (field.required) {
      if (field.conditional) {
        // For conditional fields, add custom validator that checks if field should be shown
        validators.push((control: any) => {
          const dependentControl = this.form?.get(field.conditional!.dependsOn);
          let shouldShow = false;

          // Check for special 'hasValue' condition
          if (field.conditional!.showWhen === 'hasValue') {
            const value = dependentControl?.value;
            shouldShow = value !== null && value !== undefined && value !== '';
          } else {
            // Default: exact value matching
            shouldShow = dependentControl?.value === field.conditional!.showWhen;
          }

          if (!shouldShow) {
            return null; // Don't validate if field is hidden
          }

          // Apply required validation only when field is visible
          if (
            !control.value ||
            (Array.isArray(control.value) && control.value.length === 0) ||
            (typeof control.value === 'string' && control.value.trim() === '')
          ) {
            return { required: true };
          }
          return null;
        });
      } else {
        validators.push(Validators.required);
      }
    }

    switch (field.type) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'password':
        validators.push(Validators.minLength(8));
        break;
      case 'tel':
        validators.push(Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/));
        break;
      case 'number':
        validators.push(Validators.pattern(/^\d+(\.\d+)?$/)); // ✅ UPDATED: Allow decimals
        break;
      // ✅ Map field validation - VERIFY THIS EXISTS
      case 'map':
        if (field.required) {
          validators.push((control: any) => {
            // Check if this is a conditional field
            if (field.conditional) {
              const dependentControl = this.form?.get(
                field.conditional.dependsOn
              );
              let shouldShow = false;

              // Check for special 'hasValue' condition
              if (field.conditional.showWhen === 'hasValue') {
                const value = dependentControl?.value;
                shouldShow = value !== null && value !== undefined && value !== '';
              } else {
                // Default: exact value matching
                shouldShow = dependentControl?.value === field.conditional.showWhen;
              }

              if (!shouldShow) return null; // Don't validate if hidden
            }

            const value = control.value;
            if (!value || !value.lat || !value.lng) {
              return { required: true };
            }
            if (
              typeof value.lat !== 'number' ||
              typeof value.lng !== 'number'
            ) {
              return { invalidCoordinates: true };
            }
            if (
              value.lat < -90 ||
              value.lat > 90 ||
              value.lng < -180 ||
              value.lng > 180
            ) {
              return { invalidCoordinates: true };
            }
            return null;
          });
        }
        break;
      // ✅ ADD SIGNATURE VALIDATION
      case 'signature':
        if (field.required) {
          validators.push((control: any) => {
            // Check if this is a conditional field
            if (field.conditional) {
              const dependentControl = this.form?.get(
                field.conditional.dependsOn
              );
              let shouldShow = false;

              // Check for special 'hasValue' condition
              if (field.conditional.showWhen === 'hasValue') {
                const value = dependentControl?.value;
                shouldShow = value !== null && value !== undefined && value !== '';
              } else {
                // Default: exact value matching
                shouldShow = dependentControl?.value === field.conditional.showWhen;
              }

              if (!shouldShow) return null; // Don't validate if hidden
            }

            const value = control.value;
           // ✅ UPDATED: Better validation for signature
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
              return { signatureRequired: true };
            }
            return null;
          });
        }
        break;
      // 📷 ADD PICTURE VALIDATION
      case 'picture':
        if (field.required) {
          validators.push((control: any) => {
            // Check if this is a conditional field
            if (field.conditional) {
              const dependentControl = this.form?.get(
                field.conditional.dependsOn
              );
              let shouldShow = false;

              // Check for special 'hasValue' condition
              if (field.conditional.showWhen === 'hasValue') {
                const value = dependentControl?.value;
                shouldShow = value !== null && value !== undefined && value !== '';
              } else {
                // Default: exact value matching
                shouldShow = dependentControl?.value === field.conditional.showWhen;
              }

              if (!shouldShow) return null; // Don't validate if hidden
            }

            const value = control.value;
            // Check if picture data exists and has required properties
            if (!value || !value.file || !value.dataUrl) {
              return { pictureRequired: true };
            }
            return null;
          });
        }
        break;
    }

    if (field.validators) {
      validators.push(...field.validators);
    }

    return validators;
  }

  // Legacy method - replaced by computed signal
  /*
  isFormValid(): boolean {
    if (!this.form) return false;

    const allFields = this.getAllFields();

    // Check each field individually
    for (const field of allFields) {
      const control = this.form.get(field.name);
      if (!control) continue;

      // Skip validation for hidden conditional fields
      if (field.conditional && !this.shouldShowField(field)) {
        continue;
      }

      // Check if visible field is valid
      if (control.invalid) {
        // Drastically reduce validation error logging - only log 0.1% of errors with 30s cooldown
        if (control.errors && Object.keys(control.errors).length > 0) {
          const errorKey = `${field.name}_validation_error`;
          const now = Date.now();
          if (!this.lastErrorLog[errorKey] || (now - this.lastErrorLog[errorKey] > 30000 && Math.random() < 0.001)) {
            this.lastErrorLog[errorKey] = now;

            console.warn(`⚠️ Field validation error - ${field.name}:`, {
              label: field.label,
              type: field.type,
              value: control.value,
              errors: control.errors
            });
          }
        }
        return false;
      }
    }

    return true;
  }
  */



  // ✅ ADD: Debug method to log form errors
  private logFormErrors(): void {
    const allFields = this.getAllFields();

    allFields.forEach((field) => {
      const control = this.form.get(field.name);
      if (control?.errors) {
        console.log(`Field ${field.name} errors:`, control.errors);
        console.log(
          `Field ${field.name} should show:`,
          this.shouldShowField(field)
        );
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

// ✅ UPDATE: Better error handling
getFieldError(fieldName: string): string {
  const control = this.form.get(fieldName);
  if (control?.errors && control.touched) {
    const allFields = this.getAllFields();
    const field = allFields.find((f) => f.name === fieldName);

    if (control.errors['required'] || control.errors['signatureRequired']) {
      if (field?.type === 'map') {
        return `Please select a location on the map.`;
      }
      if (field?.type === 'signature') {
        return `Please provide your signature.`;
      }
      return `${field?.label} is required.`;
    }
    if (control.errors['invalidCoordinates']) {
      return `Please select a valid location on the map.`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address.';
    }
    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    }
    if (control.errors['pattern']) {
      if (field?.type === 'tel') {
        return 'Please enter a valid phone number.';
      }
      if (field?.type === 'number') {
        return 'Please enter a valid number.';
      }
      return `Please enter a valid ${field?.label?.toLowerCase()}.`;
    }
  }
  return '';
}

  hasFieldError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.errors && control.touched);
  }

  // Add these methods to the component class
  trackByFieldName(index: number, field: FormField): string {
    return field.name;
  }

  ////////////////
  trackBySection(index: number, section: FormSection): string {
    return section.title;
  }

  isInputField(type: string): boolean {
    return ['text', 'email', 'password', 'number', 'tel'].includes(type);
  }

  clearField(field: FormField, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const ctrl = this.form.get(field.name);
    if (!ctrl) return;

    // Fields reset or cleared
    switch (field.type) {
      case 'checkbox':
        ctrl.setValue(false);
        break;
      case 'radio':
        ctrl.setValue(''); // Use empty string for radio to avoid null
        break;
      case 'select':
        ctrl.setValue(field.multiple ? [] : null);
        break;
      case 'number':
        ctrl.setValue(0);
        break;
      case 'date':
        ctrl.setValue(null); // Keep null for date, as Angular Material expects null for empty date
        break;
      case 'map':
        ctrl.setValue(null); // Keep null for map, unless your app expects something else
        break;
      case 'signature':
        ctrl.setValue(null); // Keep null for signature, unless your app expects something else
        break;
      default:
        ctrl.setValue('');
    }

    (document.activeElement as HTMLElement)?.blur?.();
    ctrl.markAsPristine();
    ctrl.markAsUntouched();
    ctrl.updateValueAndValidity();
  }

  // Conditional fields logic
  shouldShowField(field: FormField): boolean {
    if (!field.conditional) {
      return true; // Always show if no conditional logic
    }

    const dependentControl = this.form.get(field.conditional.dependsOn);
    if (!dependentControl) {
      return false; // Hide if dependent field doesn't exist
    }

    // Check for special 'hasValue' condition (for date fields, etc.)
    if (field.conditional.showWhen === 'hasValue') {
      const value = dependentControl.value;
      return value !== null && value !== undefined && value !== '';
    }

    // Default: exact value matching
    return dependentControl.value === field.conditional.showWhen;
  }

  // Enterprise utility methods
  resetForm(): void {
    this.form.reset();
    this.isDirty.set(false);
    this.validationErrors.set([]);
    this.autoSaveStatus.set('idle');

    if (this.enableValidationFeedback) {
      this.snackBar.open('Form reset', 'Dismiss', {
        duration: 2000,
        panelClass: ['info-snackbar']
      });
    }
  }

  saveDraft(): void {
    if (!this.enableDraftMode) return;

    const draftData = {
      formData: this.form.value,
      companyId: this.currentCompanyId(),
      savedAt: new Date(),
      formProgress: this.formProgress(),
      validationState: {
        isValid: this.isFormValid(),
        errors: this.validationErrors()
      }
    };

    this.autoSaveTriggered.emit({
      ...draftData,
      isDraft: true
    });

    if (this.enableValidationFeedback) {
      this.snackBar.open('Draft saved', 'Dismiss', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    }
  }

  loadDraft(draftData: any): void {
    if (draftData.formData) {
      this.populateFormWithData(draftData.formData);
    }

    if (draftData.companyId) {
      this.currentCompanyId.set(draftData.companyId);
    }

    this.isDirty.set(false);

    if (this.enableValidationFeedback) {
      this.snackBar.open('Draft loaded', 'Dismiss', {
        duration: 2000,
        panelClass: ['info-snackbar']
      });
    }
  }

  validateAllFields(): boolean {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });

    this.updateValidationState();
    return this.form.valid;
  }

  getFormSummary(): any {
    return {
      isValid: this.isFormValid(),
      isDirty: this.isDirty(),
      progress: this.formProgress(),
      validationErrors: this.validationErrors(),
      autoSaveStatus: this.autoSaveStatus(),
      companyId: this.currentCompanyId(),
      lastModified: new Date()
    };
  }
  // Add helper method for map fields:
  isMapField(type: string): boolean {
    return type === 'map';
  }

  // Add helper method for signature fields:
  isSignatureField(type: string): boolean {
    return type === 'signature';
  }

  // Add helper method for picture fields:
  isPictureField(type: string): boolean {
    return type === 'picture';
  }

  // Add helper method for label fields:
  isLabelField(type: string): boolean {
    return type === 'label';
  }

  // Get CSS classes for label field
  getLabelClasses(field: FormField): string[] {
    const classes = [];
    const style = field.labelConfig?.style || 'default';

    classes.push(`label-${style}`);

    if (field.labelConfig?.alignment) {
      classes.push(`label-align-${field.labelConfig.alignment}`);
    }

    if (field.labelConfig?.bold) {
      classes.push('label-bold');
    }

    if (field.labelConfig?.italic) {
      classes.push('label-italic');
    }

    return classes;
  }

  // Get inline styles for label field
  getLabelStyles(field: FormField): { [key: string]: string } {
    const styles: { [key: string]: string } = {};

    if (field.labelConfig?.color) {
      styles['color'] = field.labelConfig.color;
    }

    if (field.labelConfig?.fontSize) {
      styles['font-size'] = field.labelConfig.fontSize;
    }

    return styles;
  }

  // Handle picture upload errors
  onPictureError(error: string, fieldName: string): void {
    console.error(`Picture upload error for field ${fieldName}:`, error);
    // Optionally set form error
    const control = this.form.get(fieldName);
    if (control) {
      control.setErrors({ pictureError: error });
    }
  }

  // Populate form with initial data (for repeat functionality)
  private populateFormWithData(data: any): void {
    if (!this.form || !data) return;

    Object.keys(data).forEach(key => {
      const control = this.form.get(key);
      if (control && data[key] !== undefined && data[key] !== null) {
        control.setValue(data[key]);
        control.markAsTouched();
      }
    });

    // Update form validation after populating
    this.form.updateValueAndValidity();
  }

  // PDF Generation Methods
  /**
   * Generate PDF from current form data using HTML template
   */
  async generatePdfFromHtml(templateId?: string): Promise<void> {
    if (!this.form.valid) {
      this.snackBar.open('Please complete the form before generating PDF', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    try {
      const formData = this.form.value;
      const companyId = this.currentCompanyId();

      // Get available templates if no templateId provided
      if (!templateId) {
        const templates = await this.pdfTemplateService.getTemplatesForCompany(companyId);
        if (templates.length === 0) {
          this.snackBar.open('No templates available for this company', 'Dismiss', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }
        templateId = templates[0].id; // Use first available template
      }

      // Use PdfTemplateService to generate from current form configuration
      const pdfBlob = await this.pdfTemplateService.generateFromFormConfiguration(
        templateId,
        formData,
        { sections: this.sections, fields: this.fields }
      );

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `form-submission-${new Date().getTime()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      this.snackBar.open('PDF generated successfully', 'Dismiss', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.snackBar.open('Failed to generate PDF', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Generate PDF from DOCX template
   */
  async generatePdfFromDocx(templateFile: File): Promise<void> {
    if (!this.form.valid) {
      this.snackBar.open('Please complete the form before generating PDF', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    try {
      const formData = this.form.value;

      // Create a template object from the file
      const template: DocxTemplate = {
        id: `temp-${Date.now()}`,
        name: templateFile.name,
        type: 'word' as DocumentType,
        formType: 'rfq',
        content: '', // Will be read by the service
        placeholders: [],
        size: templateFile.size,
        uploadedAt: new Date(),
        isUniversal: false
      };

      // Use DocxProcessingService to process the template
      // Note: This is a simplified call - you may need to adjust based on your specific needs
      const result$ = this.docxProcessingService.processRfqSubmission(
        template,
        formData,
        ['default@example.com'], // Default recipient
        formData.email || 'client@example.com' // Client email from form
      );

      result$.subscribe({
        next: (result) => {
          this.snackBar.open('PDF generated and processed successfully', 'Dismiss', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('DOCX PDF generation failed:', error);
          this.snackBar.open('Failed to generate PDF from DOCX template', 'Dismiss', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } catch (error) {
      console.error('DOCX PDF generation failed:', error);
      this.snackBar.open('Failed to generate PDF from DOCX template', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    }
  }  /**
   * Get available PDF templates for current company
   */
  async getAvailableTemplates(): Promise<any[]> {
    try {
      const companyId = this.currentCompanyId();
      return await this.pdfTemplateService.getTemplatesForCompany(companyId);
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  /**
   * Handle DOCX file selection for PDF generation
   */
  async onDocxFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      await this.generatePdfFromDocx(file);
      // Reset the input so the same file can be selected again
      input.value = '';
    }
  }
}
