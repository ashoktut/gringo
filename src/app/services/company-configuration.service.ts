import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Company, User } from '../models/auth.models';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';

// Company-specific configuration interfaces
export interface CompanyFormConfig {
  companyId: string;
  availableFieldTypes: string[];
  customFieldTypes: CustomFieldType[];
  defaultFormSettings: FormDisplaySettings;
  requiredFields: string[];
  hiddenFields: string[];
  fieldValidationRules: { [fieldName: string]: ValidationRule };
  customStyling: CompanyBrandingStyle;
  featureFlags: FormFeatureFlags;
}

export interface CustomFieldType {
  type: string;
  name: string;
  component: string;
  icon: string;
  config: any;
  permissions?: string[];
}

export interface FormDisplaySettings {
  layout: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark' | 'auto';
  showProgressBar: boolean;
  showFieldDescriptions: boolean;
  enableAutoSave: boolean;
  autoSaveInterval: number; // seconds
  showRequiredIndicators: boolean;
  confirmBeforeSubmit: boolean;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  customValidator?: string;
}

export interface CompanyBrandingStyle {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  logoUrl?: string;
  customCss?: string;
}

export interface FormFeatureFlags {
  enableDigitalSignature: boolean;
  enablePictureUpload: boolean;
  enableMapIntegration: boolean;
  enableAdvancedValidation: boolean;
  enableCustomFields: boolean;
  enableTemplateCustomization: boolean;
  enableBulkOperations: boolean;
  enableRealTimeCollaboration: boolean;
  maxFileUploadSize: number; // MB
  maxFormFields: number;
}

export interface CompanyTemplateConfig {
  companyId: string;
  availableTemplates: TemplateInfo[];
  defaultTemplate: string;
  customTemplates: CompanyTemplate[];
  templateSettings: TemplateSettings;
  pdfSettings: PDFCompanySettings;
}

export interface TemplateInfo {
  id: string;
  name: string;
  type: 'html' | 'docx' | 'pdf';
  description: string;
  isDefault: boolean;
  isActive: boolean;
  formTypes: string[];
}

export interface CompanyTemplate {
  id: string;
  name: string;
  type: 'html' | 'docx' | 'pdf';
  content: string;
  variables: string[];
  isDefault: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateSettings {
  autoGeneratePDF: boolean;
  includeCompanyBranding: boolean;
  includeUserSignature: boolean;
  includeTimestamp: boolean;
  includeCompanyLogo: boolean;
  headerText?: string;
  footerText?: string;
  watermark?: string;
}

export interface PDFCompanySettings {
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'Letter' | 'A3' | 'Legal';
  margins: { top: number; right: number; bottom: number; left: number; };
  quality: 'draft' | 'normal' | 'high';
  compression: boolean;
  password?: string;
  permissions: {
    allowPrinting: boolean;
    allowCopying: boolean;
    allowModifying: boolean;
    allowAnnotations: boolean;
  };
}

export interface CompanyIntegrationConfig {
  companyId: string;
  enabledIntegrations: IntegrationInfo[];
  apiKeys: { [service: string]: string };
  webhookUrls: { [event: string]: string };
  emailSettings: CompanyEmailSettings;
  notificationSettings: CompanyNotificationSettings;
}

export interface IntegrationInfo {
  service: string;
  name: string;
  enabled: boolean;
  configuration: any;
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface CompanyEmailSettings {
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  smtpSettings?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  emailTemplates: { [templateType: string]: EmailTemplate };
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

export interface CompanyNotificationSettings {
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enablePushNotifications: boolean;
  notificationEvents: { [event: string]: boolean };
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  event: string;
  delay: number; // minutes
  recipients: string[];
  condition?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyConfigurationService {
  private formConfigsSubject = new BehaviorSubject<Map<string, CompanyFormConfig>>(new Map());
  private templateConfigsSubject = new BehaviorSubject<Map<string, CompanyTemplateConfig>>(new Map());
  private integrationConfigsSubject = new BehaviorSubject<Map<string, CompanyIntegrationConfig>>(new Map());

  // Observables
  public formConfigs$ = this.formConfigsSubject.asObservable();
  public templateConfigs$ = this.templateConfigsSubject.asObservable();
  public integrationConfigs$ = this.integrationConfigsSubject.asObservable();

  // Signals for reactive UI
  private currentCompanyId = signal<string | null>(null);
  private isLoading = signal(false);

  // Computed properties
  public currentFormConfig = computed(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return null;
    return this.formConfigsSubject.value.get(companyId) || this.getDefaultFormConfig(companyId);
  });

  public currentTemplateConfig = computed(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return null;
    return this.templateConfigsSubject.value.get(companyId) || this.getDefaultTemplateConfig(companyId);
  });

  public currentIntegrationConfig = computed(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return null;
    return this.integrationConfigsSubject.value.get(companyId) || this.getDefaultIntegrationConfig(companyId);
  });

  constructor(
    private authService: AuthService,
    private companyService: CompanyService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Watch for current user changes to update company context
    this.authService.currentUser$.subscribe(user => {
      if (user?.companyId) {
        this.setCurrentCompany(user.companyId);
      }
    });

    // Load default configurations
    this.loadDefaultConfigurations();
  }

  private loadDefaultConfigurations(): void {
    // This would typically load from a backend service
    // For now, we'll create default configurations
    this.createDefaultConfigurations();
  }

  private createDefaultConfigurations(): void {
    // Default form configuration
    const defaultFormConfig: CompanyFormConfig = {
      companyId: 'default',
      availableFieldTypes: [
        'text', 'email', 'number', 'tel', 'url', 'password',
        'textarea', 'select', 'checkbox', 'radio', 'date',
        'time', 'datetime-local', 'file', 'picture'
      ],
      customFieldTypes: [],
      defaultFormSettings: {
        layout: 'comfortable',
        theme: 'light',
        showProgressBar: true,
        showFieldDescriptions: true,
        enableAutoSave: true,
        autoSaveInterval: 30,
        showRequiredIndicators: true,
        confirmBeforeSubmit: true
      },
      requiredFields: [],
      hiddenFields: [],
      fieldValidationRules: {},
      customStyling: {
        primaryColor: '#1976d2',
        secondaryColor: '#424242',
        accentColor: '#ff4081',
        backgroundColor: '#ffffff',
        textColor: '#212121',
        borderRadius: 4,
        fontFamily: 'Roboto, sans-serif',
        fontSize: 'medium'
      },
      featureFlags: {
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
      }
    };

    // Store default configuration
    const formConfigs = new Map();
    formConfigs.set('default', defaultFormConfig);
    this.formConfigsSubject.next(formConfigs);
  }

  // Public API methods
  public setCurrentCompany(companyId: string): void {
    this.currentCompanyId.set(companyId);
    this.loadCompanyConfigurations(companyId);
  }

  public getCurrentCompanyId(): string | null {
    return this.currentCompanyId();
  }

  private async loadCompanyConfigurations(companyId: string): Promise<void> {
    this.isLoading.set(true);

    try {
      // Load all configurations for the company
      await Promise.all([
        this.loadFormConfig(companyId),
        this.loadTemplateConfig(companyId),
        this.loadIntegrationConfig(companyId)
      ]);
    } catch (error) {
      console.error('Failed to load company configurations:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadFormConfig(companyId: string): Promise<void> {
    // This would typically make an API call
    // For now, create a company-specific config based on default
    const defaultConfig = this.getDefaultFormConfig(companyId);

    // Apply company-specific overrides (would come from API)
    const companyConfig = await this.applyCompanyOverrides(defaultConfig, companyId);

    const formConfigs = new Map(this.formConfigsSubject.value);
    formConfigs.set(companyId, companyConfig);
    this.formConfigsSubject.next(formConfigs);
  }

  private async loadTemplateConfig(companyId: string): Promise<void> {
    const defaultConfig = this.getDefaultTemplateConfig(companyId);

    const templateConfigs = new Map(this.templateConfigsSubject.value);
    templateConfigs.set(companyId, defaultConfig);
    this.templateConfigsSubject.next(templateConfigs);
  }

  private async loadIntegrationConfig(companyId: string): Promise<void> {
    const defaultConfig = this.getDefaultIntegrationConfig(companyId);

    const integrationConfigs = new Map(this.integrationConfigsSubject.value);
    integrationConfigs.set(companyId, defaultConfig);
    this.integrationConfigsSubject.next(integrationConfigs);
  }

  private async applyCompanyOverrides(
    defaultConfig: CompanyFormConfig,
    companyId: string
  ): Promise<CompanyFormConfig> {
    // This would load company-specific overrides from the API
    // For now, return the default with the correct company ID
    return {
      ...defaultConfig,
      companyId
    };
  }

  private getDefaultFormConfig(companyId: string): CompanyFormConfig {
    const defaultConfig = this.formConfigsSubject.value.get('default');
    if (!defaultConfig) {
      throw new Error('Default form configuration not found');
    }

    return {
      ...defaultConfig,
      companyId
    };
  }

  private getDefaultTemplateConfig(companyId: string): CompanyTemplateConfig {
    return {
      companyId,
      availableTemplates: [
        {
          id: 'standard-html',
          name: 'Standard HTML Template',
          type: 'html',
          description: 'Default HTML template for forms',
          isDefault: true,
          isActive: true,
          formTypes: ['rfq', 'quote', 'invoice']
        }
      ],
      defaultTemplate: 'standard-html',
      customTemplates: [],
      templateSettings: {
        autoGeneratePDF: true,
        includeCompanyBranding: true,
        includeUserSignature: false,
        includeTimestamp: true,
        includeCompanyLogo: true
      },
      pdfSettings: {
        orientation: 'portrait',
        paperSize: 'A4',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        quality: 'normal',
        compression: true,
        permissions: {
          allowPrinting: true,
          allowCopying: false,
          allowModifying: false,
          allowAnnotations: true
        }
      }
    };
  }

  private getDefaultIntegrationConfig(companyId: string): CompanyIntegrationConfig {
    return {
      companyId,
      enabledIntegrations: [],
      apiKeys: {},
      webhookUrls: {},
      emailSettings: {
        fromEmail: 'noreply@company.com',
        fromName: 'Company Name',
        emailTemplates: {}
      },
      notificationSettings: {
        enableEmailNotifications: true,
        enableSMSNotifications: false,
        enablePushNotifications: false,
        notificationEvents: {
          'form_submitted': true,
          'form_approved': true,
          'form_rejected': true
        },
        escalationRules: []
      }
    };
  }

  // Configuration retrieval methods
  public getFormConfig(companyId?: string): CompanyFormConfig | null {
    const targetCompanyId = companyId || this.currentCompanyId();
    if (!targetCompanyId) return null;

    return this.formConfigsSubject.value.get(targetCompanyId) ||
           this.getDefaultFormConfig(targetCompanyId);
  }

  public getTemplateConfig(companyId?: string): CompanyTemplateConfig | null {
    const targetCompanyId = companyId || this.currentCompanyId();
    if (!targetCompanyId) return null;

    return this.templateConfigsSubject.value.get(targetCompanyId) ||
           this.getDefaultTemplateConfig(targetCompanyId);
  }

  public getIntegrationConfig(companyId?: string): CompanyIntegrationConfig | null {
    const targetCompanyId = companyId || this.currentCompanyId();
    if (!targetCompanyId) return null;

    return this.integrationConfigsSubject.value.get(targetCompanyId) ||
           this.getDefaultIntegrationConfig(targetCompanyId);
  }

  // Configuration update methods
  public async updateFormConfig(
    companyId: string,
    config: Partial<CompanyFormConfig>
  ): Promise<void> {
    const currentConfig = this.getFormConfig(companyId);
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig, ...config };

    const formConfigs = new Map(this.formConfigsSubject.value);
    formConfigs.set(companyId, updatedConfig);
    this.formConfigsSubject.next(formConfigs);

    // TODO: Save to backend
  }

  public async updateTemplateConfig(
    companyId: string,
    config: Partial<CompanyTemplateConfig>
  ): Promise<void> {
    const currentConfig = this.getTemplateConfig(companyId);
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig, ...config };

    const templateConfigs = new Map(this.templateConfigsSubject.value);
    templateConfigs.set(companyId, updatedConfig);
    this.templateConfigsSubject.next(templateConfigs);

    // TODO: Save to backend
  }

  public async updateIntegrationConfig(
    companyId: string,
    config: Partial<CompanyIntegrationConfig>
  ): Promise<void> {
    const currentConfig = this.getIntegrationConfig(companyId);
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig, ...config };

    const integrationConfigs = new Map(this.integrationConfigsSubject.value);
    integrationConfigs.set(companyId, updatedConfig);
    this.integrationConfigsSubject.next(integrationConfigs);

    // TODO: Save to backend
  }

  // Feature flag checks
  public hasFeature(feature: keyof FormFeatureFlags, companyId?: string): boolean {
    const config = this.getFormConfig(companyId);
    const value = config?.featureFlags[feature];
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  public getFeatureLimit(feature: 'maxFileUploadSize' | 'maxFormFields', companyId?: string): number {
    const config = this.getFormConfig(companyId);
    const value = config?.featureFlags[feature];
    return typeof value === 'number' ? value : 0;
  }

  // Template management
  public async addCustomTemplate(
    companyId: string,
    template: Omit<CompanyTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string> {
    const config = this.getTemplateConfig(companyId);
    if (!config) throw new Error('Template configuration not found');

    const newTemplate: CompanyTemplate = {
      ...template,
      id: this.generateId(),
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.authService.getCurrentUserSync()?.id || 'system'
    };

    const updatedConfig = {
      ...config,
      customTemplates: [...config.customTemplates, newTemplate]
    };

    await this.updateTemplateConfig(companyId, updatedConfig);
    return newTemplate.id;
  }

  public async removeCustomTemplate(companyId: string, templateId: string): Promise<void> {
    const config = this.getTemplateConfig(companyId);
    if (!config) return;

    const updatedConfig = {
      ...config,
      customTemplates: config.customTemplates.filter(t => t.id !== templateId)
    };

    await this.updateTemplateConfig(companyId, updatedConfig);
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public isLoading$(): boolean {
    return this.isLoading();
  }

  // Company branding helpers
  public getCompanyBranding(companyId?: string): CompanyBrandingStyle | null {
    const config = this.getFormConfig(companyId);
    return config?.customStyling || null;
  }

  public applyCompanyBranding(companyId?: string): { [key: string]: string } {
    const branding = this.getCompanyBranding(companyId);
    if (!branding) return {};

    return {
      '--company-primary': branding.primaryColor,
      '--company-secondary': branding.secondaryColor,
      '--company-accent': branding.accentColor,
      '--company-background': branding.backgroundColor,
      '--company-text': branding.textColor,
      '--company-border-radius': `${branding.borderRadius}px`,
      '--company-font-family': branding.fontFamily
    };
  }
}
