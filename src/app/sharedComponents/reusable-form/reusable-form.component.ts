import {
  Component,
  Input,
  Output,
  EventEmitter,
  Injectable,
  OnInit,
  OnChanges,
  SimpleChanges,
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
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MapLibrePickerComponent } from '../map-libre-picker/map-libre-picker.component';
import { DigitalSignatureComponent } from '../digital-signature/digital-signature.component';

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
    | 'signature';
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
    MapLibrePickerComponent,
    DigitalSignatureComponent,
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './reusable-form.component.html',
  styleUrl: './reusable-form.component.css',
})
export class ReusableFormComponent implements OnInit, OnChanges {
  @Input() fields: FormField[] = [];
  @Input() sections?: FormSection[]; // optional grouped mode
  @Input() multi: boolean = true; // allow multiple panels open
  @Input() submitButtonText: string = 'Submit';
  @Input() formTitle?: string;
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formValueChange = new EventEmitter<any>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

// ✅ ADD: In ngOnInit method
ngOnInit() {
  this.buildForm();

  // Monitor form value changes
  this.form.valueChanges.subscribe((value) => {
    this.formValueChange.emit(value);
    console.log('Form value changed:', value); // ✅ DEBUG LOG
    console.log('Form valid after change:', this.isFormValid()); // ✅ DEBUG LOG
  });

  // ✅ ADD: Monitor form status changes
  this.form.statusChanges.subscribe((status) => {
    console.log('Form status changed:', status); // ✅ DEBUG LOG
  });
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields'] || changes['sections']) {
      this.buildForm();
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
      const validators = this.getValidators(field);
      const initialValue =
        field.type === 'checkbox'
          ? false
          : field.type === 'select' && field.multiple
          ? []
          : null;
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
            if (value !== field.conditional!.showWhen) {
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
          const shouldShow =
            dependentControl?.value === field.conditional!.showWhen;

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
              const shouldShow =
                dependentControl?.value === field.conditional.showWhen;
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
              const shouldShow =
                dependentControl?.value === field.conditional.showWhen;
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
    }

    if (field.validators) {
      validators.push(...field.validators);
    }

    return validators;
  }

  // ✅ ADD: Method to check form validity excluding hidden conditional fields
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
        console.log(`Field ${field.name} is invalid:`, control.errors); // ✅ DEBUG LOG
        return false;
      }
    }

    return true;
  }



  // ✅ UPDATE: Better submit method
  onSubmit(): void {
    console.log('Form submission attempted'); // ✅ DEBUG LOG
    console.log('Form valid:', this.form.valid); // ✅ DEBUG LOG
    console.log('Custom form valid:', this.isFormValid()); // ✅ DEBUG LOG

    // Use custom validation that respects conditional fields
    if (this.isFormValid()) {
      console.log('Form data:', this.form.value); // ✅ DEBUG LOG
      this.formSubmit.emit(this.form.value);
    } else {
      console.log('Form is invalid, marking fields as touched'); // ✅ DEBUG LOG
      this.markFormGroupTouched();
      this.logFormErrors(); // ✅ DEBUG LOG
    }
  }



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
        ctrl.setValue(null);
        break;
      case 'select':
        ctrl.setValue(field.multiple ? [] : null);
        break;
      case 'number':
      case 'date':
        ctrl.setValue(null);
        break;
      case 'map':
        ctrl.setValue(null);
        break;
      case 'signature':
        ctrl.setValue(null);
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

    return dependentControl.value === field.conditional.showWhen;
  }
  // Add helper method for map fields:
  isMapField(type: string): boolean {
    return type === 'map';
  }

  // Add helper method for signature fields:
  isSignatureField(type: string): boolean {
    return type === 'signature';
  }
}
