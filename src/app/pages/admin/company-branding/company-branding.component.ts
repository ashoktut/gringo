import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import {
  CompanyConfigurationService,
  CompanyBrandingStyle,
  FormDisplaySettings,
  FormFeatureFlags
} from '../../../services/company-configuration.service';
import { AuthService } from '../../../services/auth.service';
import { Company } from '../../../models/auth.models';

@Component({
  selector: 'app-company-branding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './company-branding.component.html',
  styleUrls: ['./company-branding.component.css']
})
export class CompanyBrandingComponent implements OnInit {
  brandingForm: FormGroup;
  displayForm: FormGroup;
  featuresForm: FormGroup;

  isLoading = signal(false);
  isSaving = signal(false);
  previewMode = signal(false);
  currentLogo = signal<string | null>(null);
  currentFavicon = signal<string | null>(null);

  // Current company context
  currentCompany = computed(() => this.authService.currentCompany());
  currentUser = computed(() => this.authService.getCurrentUserSync());
  canManageCompany = computed(() =>
    this.authService.hasRoleByName('system_admin') ||
    this.authService.hasRoleByName('company_admin')
  );

  // Available options
  fontOptions = [
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans' },
    { value: 'Lato, sans-serif', label: 'Lato' },
    { value: 'Source Sans Pro, sans-serif', label: 'Source Sans Pro' },
    { value: 'Montserrat, sans-serif', label: 'Montserrat' },
    { value: 'Poppins, sans-serif', label: 'Poppins' },
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' }
  ];

  fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];

  layoutOptions = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' }
  ];

  themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' }
  ];

  // Default colors for quick selection
  colorPresets = [
    { name: 'Material Blue', primary: '#1976d2', secondary: '#424242', accent: '#ff4081' },
    { name: 'Material Green', primary: '#388e3c', secondary: '#424242', accent: '#ff5722' },
    { name: 'Material Purple', primary: '#7b1fa2', secondary: '#424242', accent: '#ffc107' },
    { name: 'Material Orange', primary: '#f57c00', secondary: '#424242', accent: '#3f51b5' },
    { name: 'Corporate Blue', primary: '#0d47a1', secondary: '#37474f', accent: '#ff6f00' },
    { name: 'Forest Green', primary: '#2e7d32', secondary: '#424242', accent: '#ff8f00' },
    { name: 'Deep Purple', primary: '#4527a0', secondary: '#424242', accent: '#ff5722' },
    { name: 'Crimson Red', primary: '#c62828', secondary: '#424242', accent: '#ffc107' }
  ];

  constructor(
    private fb: FormBuilder,
    private companyConfigService: CompanyConfigurationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.brandingForm = this.createBrandingForm();
    this.displayForm = this.createDisplayForm();
    this.featuresForm = this.createFeaturesForm();
  }

  ngOnInit(): void {
    if (!this.canManageCompany()) {
      this.snackBar.open('You do not have permission to manage company settings', 'Dismiss', {
        duration: 5000
      });
      return;
    }

    this.loadCompanyConfiguration();
  }

  private createBrandingForm(): FormGroup {
    return this.fb.group({
      primaryColor: ['#1976d2', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      secondaryColor: ['#424242', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      accentColor: ['#ff4081', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      backgroundColor: ['#ffffff', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      textColor: ['#212121', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      borderRadius: [4, [Validators.required, Validators.min(0), Validators.max(20)]],
      fontFamily: ['Roboto, sans-serif', Validators.required],
      fontSize: ['medium', Validators.required],
      logoUrl: [''],
      customCss: ['']
    });
  }

  private createDisplayForm(): FormGroup {
    return this.fb.group({
      layout: ['comfortable', Validators.required],
      theme: ['light', Validators.required],
      showProgressBar: [true],
      showFieldDescriptions: [true],
      enableAutoSave: [true],
      autoSaveInterval: [30, [Validators.min(10), Validators.max(300)]],
      showRequiredIndicators: [true],
      confirmBeforeSubmit: [true]
    });
  }

  private createFeaturesForm(): FormGroup {
    return this.fb.group({
      enableDigitalSignature: [true],
      enablePictureUpload: [true],
      enableMapIntegration: [true],
      enableAdvancedValidation: [true],
      enableCustomFields: [false],
      enableTemplateCustomization: [true],
      enableBulkOperations: [false],
      enableRealTimeCollaboration: [false],
      maxFileUploadSize: [10, [Validators.min(1), Validators.max(100)]],
      maxFormFields: [100, [Validators.min(10), Validators.max(500)]]
    });
  }

  private async loadCompanyConfiguration(): Promise<void> {
    this.isLoading.set(true);

    try {
      const companyId = this.currentCompany()?.id;
      if (!companyId) return;

      const formConfig = this.companyConfigService.getFormConfig(companyId);
      if (formConfig) {
        // Populate branding form
        this.brandingForm.patchValue(formConfig.customStyling);

        // Populate display form
        this.displayForm.patchValue(formConfig.defaultFormSettings);

        // Populate features form
        this.featuresForm.patchValue(formConfig.featureFlags);
      }
    } catch (error) {
      console.error('Failed to load company configuration:', error);
      this.snackBar.open('Failed to load company settings', 'Dismiss', { duration: 5000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSaveBranding(): Promise<void> {
    if (this.brandingForm.invalid) return;

    await this.saveConfiguration('branding');
  }

  async onSaveDisplay(): Promise<void> {
    if (this.displayForm.invalid) return;

    await this.saveConfiguration('display');
  }

  async onSaveFeatures(): Promise<void> {
    if (this.featuresForm.invalid) return;

    await this.saveConfiguration('features');
  }

  async onSaveAll(): Promise<void> {
    if (this.brandingForm.invalid || this.displayForm.invalid || this.featuresForm.invalid) {
      this.snackBar.open('Please fix validation errors before saving', 'Dismiss', { duration: 5000 });
      return;
    }

    await this.saveConfiguration('all');
  }

  private async saveConfiguration(section: 'branding' | 'display' | 'features' | 'all'): Promise<void> {
    this.isSaving.set(true);

    try {
      const companyId = this.currentCompany()?.id;
      if (!companyId) return;

      const currentConfig = this.companyConfigService.getFormConfig(companyId);
      if (!currentConfig) return;

      let updatedConfig = { ...currentConfig };

      if (section === 'branding' || section === 'all') {
        const brandingData: CompanyBrandingStyle = this.brandingForm.value;
        updatedConfig.customStyling = brandingData;
      }

      if (section === 'display' || section === 'all') {
        const displayData: FormDisplaySettings = this.displayForm.value;
        updatedConfig.defaultFormSettings = displayData;
      }

      if (section === 'features' || section === 'all') {
        const featuresData: FormFeatureFlags = this.featuresForm.value;
        updatedConfig.featureFlags = featuresData;
      }

      await this.companyConfigService.updateFormConfig(companyId, updatedConfig);

      const message = section === 'all' ? 'All settings saved successfully' :
                     `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`;

      this.snackBar.open(message, 'Dismiss', { duration: 3000 });

      // Apply branding to preview if needed
      if (this.previewMode() && (section === 'branding' || section === 'all')) {
        this.applyPreviewBranding();
      }

    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.snackBar.open('Failed to save settings', 'Dismiss', { duration: 5000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  onApplyColorPreset(preset: any): void {
    this.brandingForm.patchValue({
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent
    });
  }

  onResetToDefaults(): void {
    const confirmReset = confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.');

    if (confirmReset) {
      // Reset all forms to default values
      this.brandingForm.reset({
        primaryColor: '#1976d2',
        secondaryColor: '#424242',
        accentColor: '#ff4081',
        backgroundColor: '#ffffff',
        textColor: '#212121',
        borderRadius: 4,
        fontFamily: 'Roboto, sans-serif',
        fontSize: 'medium',
        logoUrl: '',
        customCss: ''
      });

      this.displayForm.reset({
        layout: 'comfortable',
        theme: 'light',
        showProgressBar: true,
        showFieldDescriptions: true,
        enableAutoSave: true,
        autoSaveInterval: 30,
        showRequiredIndicators: true,
        confirmBeforeSubmit: true
      });

      this.featuresForm.reset({
        enableDigitalSignature: true,
        enablePictureUpload: true,
        enableMapIntegration: true,
        enableAdvancedValidation: true,
        enableCustomFields: false,
        enableTemplateCustomization: true,
        enableBulkOperations: false,
        enableRealTimeCollaboration: false,
        maxFileUploadSize: 10,
        maxFormFields: 100
      });

      this.snackBar.open('Settings reset to defaults', 'Dismiss', { duration: 3000 });
    }
  }

  togglePreview(): void {
    this.previewMode.set(!this.previewMode());

    if (this.previewMode()) {
      this.applyPreviewBranding();
    } else {
      this.removePreviewBranding();
    }
  }

  private applyPreviewBranding(): void {
    const brandingData = this.brandingForm.value;
    const root = document.documentElement;

    root.style.setProperty('--preview-primary', brandingData.primaryColor);
    root.style.setProperty('--preview-secondary', brandingData.secondaryColor);
    root.style.setProperty('--preview-accent', brandingData.accentColor);
    root.style.setProperty('--preview-background', brandingData.backgroundColor);
    root.style.setProperty('--preview-text', brandingData.textColor);
    root.style.setProperty('--preview-border-radius', `${brandingData.borderRadius}px`);
    root.style.setProperty('--preview-font-family', brandingData.fontFamily);

    document.body.classList.add('preview-mode');
  }

  private removePreviewBranding(): void {
    const root = document.documentElement;
    const previewVars = [
      '--preview-primary', '--preview-secondary', '--preview-accent',
      '--preview-background', '--preview-text', '--preview-border-radius',
      '--preview-font-family'
    ];

    previewVars.forEach(variable => {
      root.style.removeProperty(variable);
    });

    document.body.classList.remove('preview-mode');
  }

  // Form validation helpers
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (field?.hasError('pattern')) {
      return 'Please enter a valid color code (e.g., #FF0000)';
    }
    if (field?.hasError('min')) {
      return `Value must be at least ${field.getError('min').min}`;
    }
    if (field?.hasError('max')) {
      return `Value must be at most ${field.getError('max').max}`;
    }
    return '';
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  // Color helper methods
  onColorChange(colorField: string, color: string): void {
    this.brandingForm.patchValue({ [colorField]: color });

    if (this.previewMode()) {
      this.applyPreviewBranding();
    }
  }

  generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  onGenerateRandomColors(): void {
    this.brandingForm.patchValue({
      primaryColor: this.generateRandomColor(),
      secondaryColor: this.generateRandomColor(),
      accentColor: this.generateRandomColor()
    });

    if (this.previewMode()) {
      this.applyPreviewBranding();
    }
  }

  // File upload for logo
  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const logoUrl = e.target?.result as string;
          this.brandingForm.patchValue({ logoUrl });
        };
        reader.readAsDataURL(file);
      } else {
        this.snackBar.open('Please select a valid image file', 'Dismiss', { duration: 3000 });
      }
    }
  }

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const logoUrl = e.target?.result as string;
          this.currentLogo.set(logoUrl);
          this.brandingForm.patchValue({ logoUrl });
        };
        reader.readAsDataURL(file);
      } else {
        this.snackBar.open('Please select a valid image file', 'Dismiss', { duration: 3000 });
      }
    }
  }

  onFaviconUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const faviconUrl = e.target?.result as string;
          this.currentFavicon.set(faviconUrl);
        };
        reader.readAsDataURL(file);
      } else {
        this.snackBar.open('Please select a valid favicon file', 'Dismiss', { duration: 3000 });
      }
    }
  }

  resetBranding(): void {
    this.onResetToDefaults();
  }

  onRemoveLogo(): void {
    this.brandingForm.patchValue({ logoUrl: '' });
  }

  // Component lifecycle
  ngOnDestroy(): void {
    // Clean up preview mode if active
    if (this.previewMode()) {
      this.removePreviewBranding();
    }
  }
}
