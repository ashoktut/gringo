import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormConfiguration, FormConfigService } from '../../../services/form-config.service';
import { FormSection, FormField } from '../../../sharedComponents/reusable-form/reusable-form.component';

@Component({
  selector: 'app-config-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './config-editor.component.html',
  styleUrls: ['./config-editor.component.css']
})
export class ConfigEditorComponent implements OnInit {
  @Input() configId?: string;
  @Output() saved = new EventEmitter<FormConfiguration>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly formConfigService = inject(FormConfigService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Signals for state management
  readonly configuration = signal<FormConfiguration | null>(null);
  readonly isEditing = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly validationErrors = signal<string[]>([]);
  
  // Form groups
  configForm!: FormGroup;
  
  // Field type options
  readonly fieldTypes = [
    { value: 'text', label: 'Text Input', icon: 'text_fields' },
    { value: 'email', label: 'Email', icon: 'email' },
    { value: 'tel', label: 'Phone', icon: 'phone' },
    { value: 'number', label: 'Number', icon: 'numbers' },
    { value: 'textarea', label: 'Text Area', icon: 'subject' },
    { value: 'select', label: 'Dropdown', icon: 'arrow_drop_down_circle' },
    { value: 'radio', label: 'Radio Group', icon: 'radio_button_checked' },
    { value: 'checkbox', label: 'Checkbox', icon: 'check_box' },
    { value: 'date', label: 'Date', icon: 'event' },
    { value: 'time', label: 'Time', icon: 'access_time' },
    { value: 'file', label: 'File Upload', icon: 'attach_file' },
    { value: 'signature', label: 'Digital Signature', icon: 'draw' },
    { value: 'map', label: 'Map Location', icon: 'location_on' },
    { value: 'picture', label: 'Picture Upload', icon: 'photo_camera' },
    { value: 'label', label: 'Label/Text', icon: 'label' }
  ];

  // Validation options
  readonly validationOptions = [
    { value: 'required', label: 'Required' },
    { value: 'email', label: 'Email Format' },
    { value: 'minlength', label: 'Minimum Length' },
    { value: 'maxlength', label: 'Maximum Length' },
    { value: 'min', label: 'Minimum Value' },
    { value: 'max', label: 'Maximum Value' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    if (this.configId) {
      this.loadConfiguration();
    } else {
      this.createNewConfiguration();
    }
  }

  private initializeForm(): void {
    this.configForm = this.fb.group({
      name: ['', Validators.required],
      formType: ['', Validators.required],
      companyId: [''],
      isDefault: [false],
      isActive: [true],
      description: [''],
      industry: ['']
    });
  }

  private loadConfiguration(): void {
    if (!this.configId) return;
    
    this.isLoading.set(true);
    this.formConfigService.getAllFormConfigs().subscribe(configs => {
      const config = configs.find(c => c.id === this.configId);
      if (config) {
        this.configuration.set(config);
        this.populateForm(config);
        this.isEditing.set(true);
      }
      this.isLoading.set(false);
    });
  }

  private createNewConfiguration(): void {
    const newConfig: FormConfiguration = {
      id: '',
      name: 'New Configuration',
      formType: 'custom',
      version: '1.0.0',
      isDefault: false,
      isActive: true,
      sections: [this.createDefaultSection()],
      metadata: {
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: ''
      }
    };
    
    this.configuration.set(newConfig);
    this.populateForm(newConfig);
    this.isEditing.set(false);
  }

  private populateForm(config: FormConfiguration): void {
    this.configForm.patchValue({
      name: config.name,
      formType: config.formType,
      companyId: config.companyId || '',
      isDefault: config.isDefault,
      isActive: config.isActive,
      description: config.metadata.description || '',
      industry: config.metadata.industry || ''
    });
  }

  // Section management
  addSection(): void {
    const config = this.configuration();
    if (!config) return;
    
    const newSection = this.createDefaultSection();
    config.sections.push(newSection);
    this.configuration.set({ ...config });
  }

  removeSection(index: number): void {
    const config = this.configuration();
    if (!config || config.sections.length <= 1) return;
    
    config.sections.splice(index, 1);
    this.configuration.set({ ...config });
  }

  moveSectionUp(index: number): void {
    const config = this.configuration();
    if (!config || index <= 0) return;
    
    [config.sections[index - 1], config.sections[index]] = 
    [config.sections[index], config.sections[index - 1]];
    this.configuration.set({ ...config });
  }

  moveSectionDown(index: number): void {
    const config = this.configuration();
    if (!config || index >= config.sections.length - 1) return;
    
    [config.sections[index], config.sections[index + 1]] = 
    [config.sections[index + 1], config.sections[index]];
    this.configuration.set({ ...config });
  }

  // Field management
  addField(sectionIndex: number): void {
    const config = this.configuration();
    if (!config) return;
    
    const newField = this.createDefaultField();
    config.sections[sectionIndex].fields.push(newField);
    this.configuration.set({ ...config });
  }

  removeField(sectionIndex: number, fieldIndex: number): void {
    const config = this.configuration();
    if (!config) return;
    
    config.sections[sectionIndex].fields.splice(fieldIndex, 1);
    this.configuration.set({ ...config });
  }

  moveFieldUp(sectionIndex: number, fieldIndex: number): void {
    const config = this.configuration();
    if (!config || fieldIndex <= 0) return;
    
    const fields = config.sections[sectionIndex].fields;
    [fields[fieldIndex - 1], fields[fieldIndex]] = 
    [fields[fieldIndex], fields[fieldIndex - 1]];
    this.configuration.set({ ...config });
  }

  moveFieldDown(sectionIndex: number, fieldIndex: number): void {
    const config = this.configuration();
    if (!config) return;
    
    const fields = config.sections[sectionIndex].fields;
    if (fieldIndex >= fields.length - 1) return;
    
    [fields[fieldIndex], fields[fieldIndex + 1]] = 
    [fields[fieldIndex + 1], fields[fieldIndex]];
    this.configuration.set({ ...config });
  }

  // Field option management
  addFieldOption(sectionIndex: number, fieldIndex: number): void {
    const config = this.configuration();
    if (!config) return;
    
    const field = config.sections[sectionIndex].fields[fieldIndex];
    if (!field.options) field.options = [];
    
    field.options.push({ value: '', label: '' });
    this.configuration.set({ ...config });
  }

  removeFieldOption(sectionIndex: number, fieldIndex: number, optionIndex: number): void {
    const config = this.configuration();
    if (!config) return;
    
    const field = config.sections[sectionIndex].fields[fieldIndex];
    if (field.options) {
      field.options.splice(optionIndex, 1);
      this.configuration.set({ ...config });
    }
  }

  // Validation
  validateConfiguration(): boolean {
    const config = this.configuration();
    if (!config) return false;
    
    // Update config with form values
    const formValue = this.configForm.value;
    config.name = formValue.name;
    config.formType = formValue.formType;
    config.companyId = formValue.companyId || undefined;
    config.isDefault = formValue.isDefault;
    config.isActive = formValue.isActive;
    config.metadata.description = formValue.description;
    config.metadata.industry = formValue.industry;
    
    const validation = this.formConfigService.validateConfiguration(config);
    this.validationErrors.set(validation.errors);
    
    return validation.valid;
  }

  // Actions
  save(): void {
    if (!this.validateConfiguration()) {
      this.snackBar.open('Please fix validation errors', 'Close', { duration: 3000 });
      return;
    }
    
    const config = this.configuration()!;
    config.metadata.updatedAt = new Date();
    
    if (!this.isEditing()) {
      config.id = this.generateId();
      config.metadata.createdAt = new Date();
    }
    
    this.formConfigService.saveFormConfig(config).subscribe({
      next: (savedConfig) => {
        this.snackBar.open('Configuration saved successfully', 'Close', { duration: 3000 });
        this.saved.emit(savedConfig);
      },
      error: (error) => {
        this.snackBar.open('Failed to save configuration', 'Close', { duration: 3000 });
        console.error('Save error:', error);
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  // Preview
  previewConfiguration(): void {
    // TODO: Implement preview functionality
    this.snackBar.open('Preview functionality coming soon', 'Close', { duration: 2000 });
  }

  // Export/Import
  exportConfiguration(): void {
    const config = this.configuration();
    if (!config) return;
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.name.replace(/\s+/g, '_')}_config.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Helper methods
  private createDefaultSection(): FormSection {
    return {
      title: 'New Section',
      description: '',
      expanded: true,
      fields: [this.createDefaultField()]
    };
  }

  private createDefaultField(): FormField {
    return {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
      clearable: true
    };
  }

  private generateId(): string {
    return 'config-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get field type icon
  getFieldTypeIcon(type: string): string {
    const fieldType = this.fieldTypes.find(ft => ft.value === type);
    return fieldType?.icon || 'help_outline';
  }

  // Track by functions for ngFor
  trackBySection(index: number, section: FormSection): any {
    return section.title + index;
  }

  trackByField(index: number, field: FormField): any {
    return field.name + index;
  }

  trackByOption(index: number, option: any): any {
    return option.value + index;
  }
}