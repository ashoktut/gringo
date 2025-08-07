import {
  Component,
  Input,
  Output,
  EventEmitter,
  Injectable,
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
    | 'tel';
  required?: boolean;
  placeholder?: string;
  options?: { value: any; label: string }[];
  validators?: any[];
  rows?: number; // for textarea
  multiple?: boolean; // for select
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
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './reusable-form.component.html',
  styleUrl: './reusable-form.component.css',
})
export class ReusableFormComponent {
  @Input() fields: FormField[] = [];
  @Input() submitButtonText: string = 'Submit';
  @Input() formTitle?: string;
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formValueChange = new EventEmitter<any>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.buildForm();
    this.form.valueChanges.subscribe((value) => {
      this.formValueChange.emit(value);
    });
  }

  private buildForm(): void {
    const group: { [key: string]: FormControl } = {};

    this.fields.forEach((field) => {
      const validators = this.getValidators(field);
      const initialValue = field.type === 'checkbox' ? false : '';
      group[field.name] = new FormControl(initialValue, validators);
    });

    this.form = this.fb.group(group);
  }

  private getValidators(field: FormField): any[] {
    const validators = [];

    if (field.required) {
      validators.push(Validators.required);
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
    }

    if (field.validators) {
      validators.push(...field.validators);
    }

    return validators;
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && control.touched) {
      const field = this.fields.find((f) => f.name === fieldName);

      if (control.errors['required']) {
        return `${field?.label} is required.`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address.';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
      }
      if (control.errors['pattern']) {
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

  isInputField(type: string): boolean {
    return ['text', 'email', 'password', 'number', 'tel'].includes(type);
  }
}
