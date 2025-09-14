import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';
import { Validators, ValidatorFn } from '@angular/forms';
import { IndexedDbService } from './indexed-db.service';

export interface FormConfiguration {
  id: string;
  name: string;
  formType: string; // Made more flexible to support any form type
  version: string;
  companyId?: string;
  isDefault: boolean;
  isActive: boolean;
  sections: FormSection[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    description?: string;
    industry?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FormConfigService {
  private readonly indexedDbService = inject(IndexedDbService);
  private formConfigs: FormConfiguration[] = [];
  private formConfigsSubject = new BehaviorSubject<FormConfiguration[]>([]);

  constructor() {
    this.loadFormConfigurations();
  }

  /**
   * Get form configuration for a specific form type and company
   */
  getFormConfig(formType: string, companyId?: string): Observable<FormConfiguration | null> {
    return this.formConfigsSubject.pipe(
      map(configs => {
        // Find the most appropriate configuration
        let config = configs.find(c =>
          c.formType === formType &&
          c.companyId === companyId &&
          c.isActive
        );

        // Fallback to default configuration for the form type
        if (!config) {
          config = configs.find(c =>
            c.formType === formType &&
            c.isDefault &&
            c.isActive
          );
        }

        // Return default RFQ configuration if nothing found
        if (!config && formType === 'rfq') {
          return {
            id: 'default-runtime-rfq',
            name: 'Default RFQ Configuration',
            formType: 'rfq',
            version: '1.0.0',
            isDefault: true,
            isActive: true,
            sections: this.getDefaultRfqConfiguration(),
            metadata: {
              createdBy: 'system',
              createdAt: new Date(),
              updatedAt: new Date(),
              description: 'Runtime default RFQ configuration'
            }
          } as FormConfiguration;
        }

        return config || null;
      })
    );
  }

  /**
   * Get form sections only (backward compatibility)
   */
  getFormSections(formType: string, companyId?: string): Observable<FormSection[]> {
    return this.getFormConfig(formType, companyId).pipe(
      map(config => config?.sections || [])
    );
  }

  /**
   * Get all form configurations
   */
  getAllFormConfigs(): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.asObservable();
  }

  /**
   * Save a new form configuration
   */
  saveFormConfig(config: FormConfiguration): Observable<FormConfiguration> {
    config.metadata.updatedAt = new Date();

    const index = this.formConfigs.findIndex(c => c.id === config.id);
    if (index > -1) {
      this.formConfigs[index] = config;
    } else {
      this.formConfigs.push(config);
    }

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }

  /**
   * Create a new form configuration based on existing one
   */
  createFormConfig(
    name: string,
    formType: string,
    basedOnConfigId?: string,
    companyId?: string
  ): Observable<FormConfiguration> {
    console.log('Creating form config:', { name, formType, basedOnConfigId, companyId });

    const baseConfig = basedOnConfigId ?
      this.formConfigs.find(c => c.id === basedOnConfigId) :
      null;

    console.log('Base config found:', baseConfig);

    const newConfig: FormConfiguration = {
      id: this.generateConfigId(),
      name,
      formType,
      version: '1.0.0',
      companyId,
      isDefault: !companyId, // Company-specific configs are not default
      isActive: true,
      sections: baseConfig ? [...baseConfig.sections] : this.getDefaultRfqConfiguration(),
      metadata: {
        createdBy: 'system', // TODO: Get from auth service
        createdAt: new Date(),
        updatedAt: new Date(),
        description: `${name} form configuration`
      }
    };

    console.log('New config created:', newConfig);

    return this.saveFormConfig(newConfig).pipe(
      catchError(error => {
        console.error('Error saving config:', error);
        throw error;
      })
    );
  }

  /**
   * Get available companies for form configurations
   */
  getAvailableCompanies(): Observable<string[]> {
    return this.formConfigsSubject.pipe(
      map(configs => {
        const companies = new Set<string>();
        configs.forEach(config => {
          if (config.companyId) {
            companies.add(config.companyId);
          }
        });
        return Array.from(companies).sort();
      })
    );
  }

  /**
   * Get configurations for a specific company
   */
  getCompanyConfigurations(companyId: string): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.pipe(
      map(configs => configs.filter(c => c.companyId === companyId))
    );
  }

  /**
   * Set configuration as default for its form type
   */
  setAsDefault(configId: string): Observable<FormConfiguration> {
    const config = this.formConfigs.find(c => c.id === configId);
    if (!config) {
      throw new Error('Configuration not found');
    }

    // Remove default status from other configs of the same type
    this.formConfigs.forEach(c => {
      if (c.formType === config.formType && c.id !== configId) {
        c.isDefault = false;
      }
    });

    // Set this config as default
    config.isDefault = true;
    config.metadata.updatedAt = new Date();

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }

  /**
   * Toggle configuration active status
   */
  toggleActiveStatus(configId: string): Observable<FormConfiguration> {
    const config = this.formConfigs.find(c => c.id === configId);
    if (!config) {
      throw new Error('Configuration not found');
    }

    config.isActive = !config.isActive;
    config.metadata.updatedAt = new Date();

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }
  deleteFormConfig(configId: string): Observable<boolean> {
    const index = this.formConfigs.findIndex(c => c.id === configId);
    if (index > -1) {
      this.formConfigs.splice(index, 1);
      return this.saveToStorage().pipe(
        map(() => {
          this.formConfigsSubject.next([...this.formConfigs]);
          return true;
        })
      );
    }
    return of(false);
  }

  /**
   * Initialize default configurations
   */
  initializeDefaultConfigs(): Observable<void> {
    const defaultRfqConfig: FormConfiguration = {
      id: 'default-rfq',
      name: 'Default RFQ Form',
      formType: 'rfq',
      version: '1.0.0',
      isDefault: true,
      isActive: true,
      sections: this.getDefaultRfqConfiguration(),
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Default Request for Quote form configuration',
        industry: 'construction'
      }
    };

    return this.saveFormConfig(defaultRfqConfig).pipe(
      map(() => void 0)
    );
  }

  /**
   * Get default RFQ configuration (your existing form structure)
   */
  public getDefaultRfqConfiguration(): FormSection[] {
    return [
      {
        title: 'Quote Timeline',
        description: '',
        expanded: true,
        fields: [
          {
            name: 'timelineGuideLabel',
            label: '',
            type: 'label',
            text: 'ℹ️ Please allow adequate time for quote preparation. Rush requests may incur additional fees.',
            labelConfig: {
              style: 'info',
              alignment: 'left',
            },
          },
          {
            name: 'dateSubmitted',
            label: 'Date Submitted',
            type: 'date',
            required: true,
            clearable: true,
            validators: [Validators.required],
          },
          {
            name: 'dateDue',
            label: 'Date Due',
            type: 'date',
            required: true,
            clearable: true,
            validators: [Validators.required],
          },
        ],
      },
      {
        title: 'Rep Details',
        description: '',
        fields: [
          {
            name: 'repInfoLabel',
            label: '',
            type: 'label',
            text: 'Please select the representative handling this RFQ and specify email recipients for notifications.',
            labelConfig: {
              style: 'info',
              alignment: 'left',
            },
          },
          {
            name: 'repName',
            label: 'Rep Name',
            type: 'select',
            required: true,
            clearable: true,
            options: [
              { value: 'Bryan Van Staden', label: 'Bryan Van Staden' },
              { value: 'Jeff Nain', label: 'Jeff Nain' },
              { value: 'Roux Mahlerbe', label: 'Roux Mahlerbe' },
              { value: 'Ruan Schroder', label: 'Ruan Schroder' },
              { value: 'Other', label: 'Other' },
            ],
          },
          {
            name: 'ccMail',
            label: 'CC Mail To',
            type: 'select',
            multiple: true,
            required: true,
            clearable: true,
            options: [
              { value: 'andri@lcproofing.co.za', label: 'Andri Pretorius' },
              { value: 'bryan@lcproofing.co.za', label: 'Bryan Van Staden' },
              { value: 'jeff@lcproofing.co.za', label: 'Jeff Nain' },
              { value: 'roux@lcproofing.co.za', label: 'Roux Mahlerbe' },
              { value: 'ruan@lcproofing.co.za', label: 'Ruan Schroder' },
              { value: 'lyndsay@lcproofing.co.za', label: 'Lyndsay Cotton' },
              { value: 'stacy@lcproofing.co.za', label: 'Stacy Burgess' },
            ],
          },
        ],
      },
      {
        title: 'Project Details',
        fields: [
          {
            name: 'projectNoticeLabel',
            label: '',
            type: 'label',
            text: '⚠️ Important: Ensure all project details are accurate as they will be used for quotes and scheduling.',
            labelConfig: {
              style: 'warning',
              alignment: 'left',
            },
          },
          {
            name: 'standNum',
            label: 'Stand / Site Address',
            type: 'text',
            required: true,
            clearable: true,
          },
          {
            name: 'clientType',
            label: 'Client Type',
            type: 'select',
            multiple: false,
            required: true,
            clearable: true,
            options: [
              { value: 'Private', label: 'Private Client' },
              { value: 'Company', label: 'Company' },
            ],
          },
          {
            name: 'companyName',
            label: 'Company Name',
            type: 'text',
            required: true,
            clearable: true,
            placeholder: 'Enter company name',
            conditional: {
              dependsOn: 'clientType',
              showWhen: 'Company',
            },
          },
          {
            name: 'clientName',
            label: 'Client Full Name',
            type: 'text',
            required: true,
            clearable: true,
          },
          {
            name: 'clientPhone',
            label: 'Client Phone Number',
            type: 'tel',
            required: true,
            placeholder: '+27721549865',
            clearable: true,
          },
          {
            name: 'clientEmail',
            label: 'Client Email Address',
            type: 'email',
            required: true,
            placeholder: 'Enter client email address',
            clearable: true,
          },
          {
            name: 'buildingType',
            label: 'Building Type',
            type: 'select',
            required: false,
            clearable: true,
            options: [
              { value: 'Residential', label: 'Residential' },
              { value: 'Commercial', label: 'Commercial' },
              { value: 'Addition less than 80m²', label: 'Addition less than 80m²' },
              { value: 'Addition more than 80m²', label: 'Addition more than 80m²' },
              { value: 'Direct Match', label: 'Direct Match' },
              { value: 'Public Building', label: 'Public Building' },
              { value: 'Other', label: 'Other Building Type' },
            ],
          },
          {
            name: 'municipality',
            label: 'Municipality',
            type: 'text',
            required: false,
            clearable: true,
          },
        ],
      },
      {
        title: 'Truss Details',
        fields: [
          {
            name: 'trussSpecsLabel',
            label: '',
            type: 'label',
            text: '🏗️ Truss Specifications',
            labelConfig: {
              style: 'subtitle',
              alignment: 'left',
              bold: true,
            },
          },
          {
            name: 'structureType',
            label: 'Structure Type',
            type: 'select',
            multiple: true,
            required: true,
            clearable: true,
            options: [
              { value: 'Tiled Roof', label: 'Tiled Roof' },
              { value: 'Sheeted Roof', label: 'Sheeted Roof' },
              { value: 'Slated Roof', label: 'Slated Roof' },
            ],
          },
          {
            name: 'maxTrussSpacing',
            label: 'Max Truss Spacing',
            type: 'text',
            required: true,
            clearable: true,
          },
          {
            name: 'mainPitch',
            label: 'Main Pitch',
            type: 'number',
            required: true,
            clearable: true,
            placeholder: 'Decimal values accepted also',
            validators: [Validators.min(1), Validators.max(100000)],
          },
          {
            name: 'serviceType',
            label: 'Roofing Service Required',
            type: 'select',
            multiple: true,
            required: true,
            clearable: true,
            options: [
              { value: 'Supply Truss', label: 'Supply Truss' },
              { value: 'Supply Cover', label: 'Supply Cover' },
              { value: 'Erect Truss', label: 'Erect Truss' },
              { value: 'Erect Cover', label: 'Erect Cover' },
            ],
          },
          {
            name: 'repSign',
            label: 'Rep Signature',
            type: 'signature',
            required: true,
            placeholder: 'Please sign here to confirm your request',
          },
        ],
      },
    ];
  }

  /**
   * Serialize validators for storage
   */
   private serializeValidators(validators?: ValidatorFn[]): string[] {
    if (!validators) return [];

    return validators
      .filter(validator => validator != null) // Filter out null/undefined validators
      .map(validator => {
        // Convert Angular validators to string identifiers
        if (validator === Validators.required) return 'required';
        if (validator === Validators.email) return 'email';

        // Handle min/max validators with parameters
        const validatorStr = validator.toString();
        if (validatorStr.includes('minlength')) {
          const match = validatorStr.match(/minlength.*?(\d+)/);
          return match ? `minlength:${match[1]}` : 'minlength';
        }
        if (validatorStr.includes('maxlength')) {
          const match = validatorStr.match(/maxlength.*?(\d+)/);
          return match ? `maxlength:${match[1]}` : 'maxlength';
        }
        if (validatorStr.includes('min')) {
          const match = validatorStr.match(/min.*?(\d+)/);
          return match ? `min:${match[1]}` : 'min';
        }
        if (validatorStr.includes('max')) {
          const match = validatorStr.match(/max.*?(\d+)/);
          return match ? `max:${match[1]}` : 'max';
        }

        return 'unknown';
      });
  }  /**
   * Deserialize validators from storage
   */
  private deserializeValidators(validatorStrings?: string[]): ValidatorFn[] {
    if (!validatorStrings) return [];

    return validatorStrings.map(validatorStr => {
      if (validatorStr === 'required') return Validators.required;
      if (validatorStr === 'email') return Validators.email;

      // Handle parameterized validators
      if (validatorStr.startsWith('minlength:')) {
        const length = parseInt(validatorStr.split(':')[1]);
        return Validators.minLength(length);
      }
      if (validatorStr.startsWith('maxlength:')) {
        const length = parseInt(validatorStr.split(':')[1]);
        return Validators.maxLength(length);
      }
      if (validatorStr.startsWith('min:')) {
        const min = parseInt(validatorStr.split(':')[1]);
        return Validators.min(min);
      }
      if (validatorStr.startsWith('max:')) {
        const max = parseInt(validatorStr.split(':')[1]);
        return Validators.max(max);
      }

      return Validators.nullValidator;
    }).filter(v => v !== Validators.nullValidator);
  }

  /**
   * Prepare configuration for storage by serializing validators
   */
  private prepareForStorage(config: FormConfiguration): any {
    const storageConfig = JSON.parse(JSON.stringify(config));

    // Serialize validators in all fields
    storageConfig.sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        if (field.validators) {
          field.validators = this.serializeValidators(field.validators);
        }
      });
    });

    return storageConfig;
  }

  /**
   * Restore configuration from storage by deserializing validators
   */
  private restoreFromStorage(storageConfig: any): FormConfiguration {
    const config = { ...storageConfig };

    // Deserialize validators in all fields
    config.sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        if (field.validators) {
          field.validators = this.deserializeValidators(field.validators);
        }
      });
    });

    return config as FormConfiguration;
  }

  private loadFormConfigurations(): void {
    this.indexedDbService.getAll(this.indexedDbService.STORES.FORM_CONFIGS).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.formConfigs = data.map(item => this.restoreFromStorage(item.data));
          this.formConfigsSubject.next([...this.formConfigs]);
          console.log('✅ Form configurations loaded:', this.formConfigs.length);
        } else {
          console.log('ℹ️ No form configurations found, initializing defaults');
          this.initializeDefaultConfigs().subscribe();
        }
      },
      error: (error) => {
        console.error('❌ Failed to load form configurations:', error);
        this.formConfigsSubject.next([]);
      }
    });
  }

  private saveToStorage(): Observable<void> {
    const itemsToSave = this.formConfigs.map(config => ({
      id: config.id,
      data: this.prepareForStorage(config)
    }));

    return this.indexedDbService.saveAll(this.indexedDbService.STORES.FORM_CONFIGS, itemsToSave).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('❌ Failed to save form configurations:', error);
        throw error;
      })
    );
  }

  /**
   * Bulk delete configurations
   */
  bulkDeleteConfigurations(configIds: string[]): Observable<boolean> {
    const initialCount = this.formConfigs.length;

    // Remove configurations with matching IDs
    this.formConfigs = this.formConfigs.filter(config => !configIds.includes(config.id!));

    if (this.formConfigs.length === initialCount) {
      return of(false); // No configurations were deleted
    }

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return true;
      }),
      catchError(error => {
        console.error('❌ Failed to bulk delete configurations:', error);
        return of(false);
      })
    );
  }

  private generateConfigId(): string {
    return 'config-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
