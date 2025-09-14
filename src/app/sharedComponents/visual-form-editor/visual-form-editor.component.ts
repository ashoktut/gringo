import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormSection, FormField, ReusableFormComponent } from '../reusable-form/reusable-form.component';
import { FormConfiguration } from '../../services/form-config.service';

export interface FieldPaletteItem {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: 'basic' | 'advanced' | 'special';
}

@Component({
  selector: 'app-visual-form-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    DragDropModule,
    ReusableFormComponent
  ],
  templateUrl: './visual-form-editor.component.html',
  styleUrl: './visual-form-editor.component.css'
})
export class VisualFormEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  @Input() configuration: FormConfiguration | null = null;
  @Input() readonly = false;
  @Output() configurationChange = new EventEmitter<FormConfiguration>();
  @Output() save = new EventEmitter<FormConfiguration>();
  @Output() cancel = new EventEmitter<void>();

  // Component state
  selectedTabIndex = signal(0);
  selectedSectionIndex = signal(0);
  selectedFieldIndex = signal(-1);
  draggedField = signal<FormField | null>(null);

  // Mobile navigation state
  isMobileNavVisible = signal(true);
  activeMobilePanel = signal<'palette' | 'builder' | 'properties' | null>(null);

  // Form data
  sections = signal<FormSection[]>([]);
  editorForm!: FormGroup;

  // Field palette
  fieldPalette: FieldPaletteItem[] = [
    // Basic Fields
    { type: 'text', label: 'Text Input', icon: 'text_fields', description: 'Single line text input', category: 'basic' },
    { type: 'email', label: 'Email', icon: 'email', description: 'Email address input with validation', category: 'basic' },
    { type: 'tel', label: 'Phone', icon: 'phone', description: 'Phone number input', category: 'basic' },
    { type: 'number', label: 'Number', icon: 'numbers', description: 'Numeric input with validation', category: 'basic' },
    { type: 'textarea', label: 'Text Area', icon: 'notes', description: 'Multi-line text input', category: 'basic' },
    { type: 'date', label: 'Date Picker', icon: 'calendar_today', description: 'Date selection with picker', category: 'basic' },

    // Advanced Fields
    { type: 'select', label: 'Dropdown', icon: 'arrow_drop_down', description: 'Single or multi-select dropdown', category: 'advanced' },
    { type: 'checkbox', label: 'Checkbox', icon: 'check_box', description: 'Boolean checkbox input', category: 'advanced' },
    { type: 'radio', label: 'Radio Group', icon: 'radio_button_checked', description: 'Single selection from options', category: 'advanced' },

    // Special Fields
    { type: 'map', label: 'Map Location', icon: 'location_on', description: 'Interactive map location picker', category: 'special' },
    { type: 'signature', label: 'Digital Signature', icon: 'draw', description: 'Digital signature capture', category: 'special' },
    { type: 'picture', label: 'Picture Upload', icon: 'photo_camera', description: 'Image upload with preview', category: 'special' },
    { type: 'label', label: 'Display Label', icon: 'label', description: 'Read-only text or information display', category: 'special' }
  ];

  constructor() {
    this.initializeEditorForm();
  }

  ngOnInit() {
    this.loadConfiguration();
  }

  private initializeEditorForm(): void {
    this.editorForm = this.fb.group({
      sections: this.fb.array([]),
      selectedField: this.fb.group({
        name: ['', Validators.required],
        label: ['', Validators.required],
        type: ['text', Validators.required],
        required: [false],
        placeholder: [''],
        description: [''],
        clearable: [false],
        multiple: [false],
        rows: [3],
        options: this.fb.array([]),
        validators: this.fb.array([]),
        conditional: this.fb.group({
          dependsOn: [''],
          showWhen: ['']
        })
      })
    });
  }

  private loadConfiguration(): void {
    if (this.configuration?.sections) {
      this.sections.set([...this.configuration.sections]);
      this.buildSectionsFormArray();
    } else {
      // Create default section if none exists
      this.addSection();
    }
  }

  private buildSectionsFormArray(): void {
    const sectionsArray = this.editorForm.get('sections') as FormArray;
    sectionsArray.clear();

    this.sections().forEach(section => {
      const sectionGroup = this.fb.group({
        title: [section.title, Validators.required],
        description: [section.description || ''],
        expanded: [section.expanded || false],
        fields: this.fb.array([])
      });

      const fieldsArray = sectionGroup.get('fields') as FormArray;
      section.fields.forEach(field => {
        fieldsArray.push(this.createFieldFormGroup(field));
      });

      sectionsArray.push(sectionGroup);
    });
  }

  private createFieldFormGroup(field: FormField): FormGroup {
    return this.fb.group({
      name: [field.name, Validators.required],
      label: [field.label, Validators.required],
      type: [field.type, Validators.required],
      required: [field.required || false],
      placeholder: [field.placeholder || ''],
      clearable: [field.clearable || false],
      multiple: [field.multiple || false],
      rows: [field.rows || 3],
      options: this.fb.array(field.options?.map(opt =>
        this.fb.group({
          value: [opt.value, Validators.required],
          label: [opt.label, Validators.required]
        })
      ) || []),
      text: [field.text || ''], // for label type
      conditional: this.fb.group({
        dependsOn: [field.conditional?.dependsOn || ''],
        showWhen: [field.conditional?.showWhen || '']
      })
    });
  }

  // Section Management
  addSection(): void {
    const newSection: FormSection = {
      title: `Section ${this.sections().length + 1}`,
      description: '',
      expanded: true,
      fields: []
    };

    const updatedSections = [...this.sections(), newSection];
    this.sections.set(updatedSections);
    this.buildSectionsFormArray();
    this.selectedSectionIndex.set(updatedSections.length - 1);
    this.showSuccessMessage('Section added successfully');
  }

  removeSection(index: number): void {
    if (this.sections().length <= 1) {
      this.showErrorMessage('Cannot remove the last section');
      return;
    }

    const updatedSections = this.sections().filter((_, i) => i !== index);
    this.sections.set(updatedSections);
    this.buildSectionsFormArray();

    // Adjust selected section index
    if (this.selectedSectionIndex() >= updatedSections.length) {
      this.selectedSectionIndex.set(updatedSections.length - 1);
    }

    this.showSuccessMessage('Section removed successfully');
  }

  duplicateSection(index: number): void {
    const sectionToDuplicate = this.sections()[index];
    const duplicatedSection: FormSection = {
      ...sectionToDuplicate,
      title: `${sectionToDuplicate.title} (Copy)`,
      fields: sectionToDuplicate.fields.map(field => ({
        ...field,
        name: `${field.name}_copy_${Date.now()}`
      }))
    };

    const updatedSections = [...this.sections()];
    updatedSections.splice(index + 1, 0, duplicatedSection);
    this.sections.set(updatedSections);
    this.buildSectionsFormArray();
    this.showSuccessMessage('Section duplicated successfully');
  }

  // Field Management
  onFieldDrop(event: CdkDragDrop<FormField[]>): void {
    if (event.previousContainer === event.container) {
      // Reordering within same section
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.sections.set([...this.sections()]);
      this.buildSectionsFormArray();
    } else {
      // Check if dropping from palette to section
      if (event.previousContainer.id.startsWith('field-palette-')) {
        this.handlePaletteFieldDrop(event);
      } else {
        // Moving between sections
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        this.sections.set([...this.sections()]);
        this.buildSectionsFormArray();
      }
    }
  }

  private handlePaletteFieldDrop(event: CdkDragDrop<FormField[]>): void {
    // Get the dragged field data from cdkDragData
    const draggedField = event.item.data as FieldPaletteItem;
    const newField = this.createNewFieldFromPalette(draggedField);

    // Find the target section index from the container ID
    const sectionId = event.container.id;
    const sectionIndex = parseInt(sectionId.replace('section-', ''), 10);

    if (sectionIndex >= 0 && sectionIndex < this.sections().length) {
      const updatedSections = [...this.sections()];
      updatedSections[sectionIndex].fields.splice(event.currentIndex, 0, newField);
      this.sections.set(updatedSections);
      this.buildSectionsFormArray();
      this.showSuccessMessage('Field added successfully');
    }
  }

  private createNewFieldFromPalette(paletteItem: FieldPaletteItem): FormField {
    const timestamp = Date.now();
    const baseField: FormField = {
      name: `${paletteItem.type}_${timestamp}`,
      label: paletteItem.label,
      type: paletteItem.type as any,
      required: false,
      clearable: true
    };

    // Add type-specific defaults
    switch (paletteItem.type) {
      case 'select':
      case 'radio':
        baseField.options = [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' }
        ];
        break;
      case 'textarea':
        baseField.rows = 3;
        break;
      case 'label':
        baseField.text = 'Enter your label text here';
        break;
    }

    return baseField;
  }

  removeField(sectionIndex: number, fieldIndex: number): void {
    const updatedSections = [...this.sections()];
    updatedSections[sectionIndex].fields.splice(fieldIndex, 1);
    this.sections.set(updatedSections);
    this.buildSectionsFormArray();

    // Clear selection if removed field was selected
    if (this.selectedFieldIndex() === fieldIndex) {
      this.selectedFieldIndex.set(-1);
    }

    this.showSuccessMessage('Field removed successfully');
  }

  selectField(sectionIndex: number, fieldIndex: number): void {
    this.selectedSectionIndex.set(sectionIndex);
    this.selectedFieldIndex.set(fieldIndex);

    const field = this.sections()[sectionIndex].fields[fieldIndex];
    this.populateFieldEditor(field);
  }

  private populateFieldEditor(field: FormField): void {
    const fieldForm = this.editorForm.get('selectedField') as FormGroup;
    fieldForm.patchValue({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required || false,
      placeholder: field.placeholder || '',
      clearable: field.clearable || false,
      multiple: field.multiple || false,
      rows: field.rows || 3,
      conditional: {
        dependsOn: field.conditional?.dependsOn || '',
        showWhen: field.conditional?.showWhen || ''
      }
    });

    // Handle options for select/radio fields
    const optionsArray = fieldForm.get('options') as FormArray;
    optionsArray.clear();
    if (field.options) {
      field.options.forEach(option => {
        optionsArray.push(this.fb.group({
          value: [option.value, Validators.required],
          label: [option.label, Validators.required]
        }));
      });
    }
  }

  updateSelectedField(): void {
    const sectionIndex = this.selectedSectionIndex();
    const fieldIndex = this.selectedFieldIndex();

    if (fieldIndex === -1) return;

    const fieldForm = this.editorForm.get('selectedField') as FormGroup;
    const updatedField = this.buildFieldFromForm(fieldForm);

    const updatedSections = [...this.sections()];
    updatedSections[sectionIndex].fields[fieldIndex] = updatedField;
    this.sections.set(updatedSections);
    this.buildSectionsFormArray();
    this.showSuccessMessage('Field updated successfully');
  }

  private buildFieldFromForm(fieldForm: FormGroup): FormField {
    const formValue = fieldForm.value;
    const field: FormField = {
      name: formValue.name,
      label: formValue.label,
      type: formValue.type,
      required: formValue.required,
      placeholder: formValue.placeholder,
      clearable: formValue.clearable
    };

    // Add type-specific properties
    if (formValue.type === 'select' || formValue.type === 'radio') {
      field.multiple = formValue.multiple;
      field.options = formValue.options;
    }

    if (formValue.type === 'textarea') {
      field.rows = formValue.rows;
    }

    if (formValue.type === 'label') {
      field.text = formValue.text;
    }

    // Add conditional logic if specified
    if (formValue.conditional.dependsOn) {
      field.conditional = {
        dependsOn: formValue.conditional.dependsOn,
        showWhen: formValue.conditional.showWhen
      };
    }

    return field;
  }

  // Option Management for Select/Radio fields
  addOption(): void {
    const optionsArray = this.editorForm.get('selectedField.options') as FormArray;
    optionsArray.push(this.fb.group({
      value: [`option_${optionsArray.length + 1}`, Validators.required],
      label: [`Option ${optionsArray.length + 1}`, Validators.required]
    }));
  }

  removeOption(index: number): void {
    const optionsArray = this.editorForm.get('selectedField.options') as FormArray;
    optionsArray.removeAt(index);
  }

  // Preview and Save
  getPreviewConfiguration(): FormConfiguration {
    return {
      ...this.configuration!,
      sections: this.sections(),
      metadata: {
        ...this.configuration!.metadata,
        updatedAt: new Date()
      }
    };
  }

  saveConfiguration(): void {
    const updatedConfig = this.getPreviewConfiguration();
    this.configurationChange.emit(updatedConfig);
    this.save.emit(updatedConfig);
  }

  cancelEditing(): void {
    this.cancel.emit();
  }

  // Helper methods for new UI
  getCategoryIcon(category: string): string {
    switch (category) {
      case 'basic': return 'widgets';
      case 'advanced': return 'extension';
      case 'special': return 'auto_awesome';
      default: return 'category';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'basic': return 'Basic Fields';
      case 'advanced': return 'Advanced Fields';
      case 'special': return 'Special Fields';
      default: return 'Fields';
    }
  }

  getSelectedField(): FormField | null {
    const sectionIndex = this.selectedSectionIndex();
    const fieldIndex = this.selectedFieldIndex();

    if (sectionIndex >= 0 && fieldIndex >= 0 && this.sections()[sectionIndex]?.fields[fieldIndex]) {
      return this.sections()[sectionIndex].fields[fieldIndex];
    }

    return null;
  }

  getFieldsByCategory(category: string): FieldPaletteItem[] {
    return this.fieldPalette.filter(field => field.category === category);
  }

  getTotalFieldCount(): number {
    return this.sections().reduce((total, section) => total + section.fields.length, 0);
  }

  getConnectedLists(): string[] {
    const sectionLists = this.sections().map((_, index) => `section-${index}`);
    const paletteLists = ['field-palette-basic', 'field-palette-advanced', 'field-palette-special'];
    return [...sectionLists, ...paletteLists];
  }

  editSection(sectionIndex: number): void {
    // Implementation for section editing - could open a dialog or inline editing
    this.selectedSectionIndex.set(sectionIndex);
  }

  shouldShowFieldOptions(fieldType: string | undefined): boolean {
    return fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox';
  }

  getOptionsCount(): number {
    const field = this.getSelectedField();
    return field?.options?.length || 0;
  }

  getFieldOptions(): any[] {
    const field = this.getSelectedField();
    return field?.options || [];
  }

  updateOptionValue(index: number, value: string): void {
    const field = this.getSelectedField();
    if (field?.options?.[index]) {
      field.options[index].value = value;
      this.updateSelectedField();
    }
  }

  updateOptionLabel(index: number, label: string): void {
    const field = this.getSelectedField();
    if (field?.options?.[index]) {
      field.options[index].label = label;
      this.updateSelectedField();
    }
  }

  reorderOptions(event: CdkDragDrop<any[]>): void {
    const field = this.getSelectedField();
    if (field?.options) {
      moveItemInArray(field.options, event.previousIndex, event.currentIndex);
      this.updateSelectedField();
    }
  }

  hasConditionalLogic(): boolean {
    const field = this.getSelectedField();
    return !!(field?.conditional?.dependsOn);
  }

  toggleConditionalLogic(): void {
    // Implementation for toggling conditional logic
    const currentValue = this.selectedFieldForm.get('hasConditional')?.value;
    if (currentValue) {
      this.selectedFieldForm.patchValue({
        conditional: {
          dependsOn: '',
          showWhen: ''
        }
      });
    } else {
      this.selectedFieldForm.patchValue({
        conditional: null
      });
    }
  }

  getAvailableFields(): FormField[] {
    const allFields: FormField[] = [];
    this.sections().forEach(section => {
      section.fields.forEach(field => {
        if (field.name !== this.getSelectedField()?.name) {
          allFields.push(field);
        }
      });
    });
    return allFields;
  }

  duplicateField(): void {
    const selectedField = this.getSelectedField();
    if (!selectedField) return;

    const sectionIndex = this.selectedSectionIndex();
    const fieldIndex = this.selectedFieldIndex();

    if (sectionIndex >= 0 && fieldIndex >= 0) {
      const duplicatedField = {
        ...selectedField,
        name: `${selectedField.name}_copy`,
        label: `${selectedField.label} (Copy)`
      };

      this.sections.update(sections => {
        sections[sectionIndex].fields.splice(fieldIndex + 1, 0, duplicatedField);
        return [...sections];
      });

      this.showSuccessMessage('Field duplicated successfully');
    }
  }

  deleteSelectedField(): void {
    const sectionIndex = this.selectedSectionIndex();
    const fieldIndex = this.selectedFieldIndex();

    if (sectionIndex >= 0 && fieldIndex >= 0) {
      this.removeField(sectionIndex, fieldIndex);
      this.selectedFieldIndex.set(-1);
      this.showSuccessMessage('Field deleted successfully');
    }
  }

  // Utility methods
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }

  // Getters for template
  get sectionsArray(): FormArray {
    return this.editorForm.get('sections') as FormArray;
  }

  get selectedFieldForm(): FormGroup {
    return this.editorForm.get('selectedField') as FormGroup;
  }

  get optionsArray(): FormArray {
    return this.selectedFieldForm.get('options') as FormArray;
  }

  getFieldIcon(type: string): string {
    return this.fieldPalette.find(item => item.type === type)?.icon || 'help';
  }

  isSelectedField(sectionIndex: number, fieldIndex: number): boolean {
    return this.selectedSectionIndex() === sectionIndex && this.selectedFieldIndex() === fieldIndex;
  }

  // Mobile navigation methods
  toggleMobileNav(panel: 'palette' | 'builder' | 'properties'): void {
    if (this.activeMobilePanel() === panel) {
      this.activeMobilePanel.set(null);
    } else {
      this.activeMobilePanel.set(panel);
    }
  }

  closeMobilePanel(): void {
    this.activeMobilePanel.set(null);
  }
}
