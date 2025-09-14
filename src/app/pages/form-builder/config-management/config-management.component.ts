import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntityManagementComponent, EntityManagementConfig, ManagedEntity, EntityService } from '../../../sharedComponents/entity-management/entity-management.component';
import { FormConfigService, FormConfiguration } from '../../../services/form-config.service';
import { FormSubmissionService } from '../../../services/form-submission.service';
import { FormSection } from '../../../sharedComponents/reusable-form/reusable-form.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface ConfigurationWithStats extends ManagedEntity {
  submissionCount: number;
  lastUsed?: Date;
  fieldCount: number;
  // FormConfiguration properties
  name: string;
  formType: string;
  version: string;
  companyId?: string;
  isDefault: boolean;
  isActive: boolean;
  sections: FormSection[];
  metadata: {
    createdBy?: string;
    description?: string;
    industry?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Component({
  selector: 'app-config-management',
  standalone: true,
  imports: [EntityManagementComponent],
  template: `
    <app-entity-management
      [config]="entityConfig"
      [service]="configService"
      (entityCreated)="onConfigCreated($event)"
      (entityUpdated)="onConfigUpdated($event)"
      (entityDeleted)="onConfigDeleted($event)">
    </app-entity-management>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class ConfigManagementComponent {
  private router = inject(Router);
  private formConfigService = inject(FormConfigService);
  private submissionService = inject(FormSubmissionService);
  private snackBar = inject(MatSnackBar);

  entityConfig: EntityManagementConfig<ConfigurationWithStats> = {
    entityName: 'Configuration',
    entityNamePlural: 'Configurations',
    icon: 'settings',
    columns: [
      {
        key: 'name',
        label: 'Configuration Name',
        type: 'text',
        sortable: true
      },
      {
        key: 'formType',
        label: 'Form Type',
        type: 'text',
        sortable: true
      },
      {
        key: 'fieldCount',
        label: 'Fields',
        type: 'number',
        sortable: true
      },
      {
        key: 'submissionCount',
        label: 'Submissions',
        type: 'number',
        sortable: true
      },
      {
        key: 'lastUsed',
        label: 'Last Used',
        type: 'date',
        sortable: true
      },
      {
        key: 'isActive',
        label: 'Active',
        type: 'boolean',
        sortable: true
      }
    ],
    actions: [
      {
        id: 'edit',
        label: 'Edit Configuration',
        icon: 'edit',
        color: 'primary',
        type: 'menu-item',
        handler: (config: ConfigurationWithStats) => this.onConfigSelected(config)
      },
      {
        id: 'view',
        label: 'View Form',
        icon: 'visibility',
        color: 'accent',
        type: 'menu-item',
        handler: (config: ConfigurationWithStats) => this.onViewForm(config)
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'content_copy',
        color: 'warn',
        type: 'menu-item',
        handler: (config: ConfigurationWithStats) => this.onDuplicateConfig(config)
      }
    ],
    createFormFields: [],
    editFormFields: []
  };

  configService: EntityService<ConfigurationWithStats> = {
    getAll: (): Observable<ConfigurationWithStats[]> => {
      return combineLatest([
        this.formConfigService.getAllFormConfigs(),
        this.submissionService.getAllSubmissions()
      ]).pipe(
        map(([configs, submissions]) => {
          return configs.map(config => {
            const configSubmissions = submissions.filter(s => s.formType === config.formType);
            return {
              id: config.id!,
              name: config.name,
              formType: config.formType,
              version: config.version,
              isDefault: config.isDefault,
              isActive: config.isActive,
              sections: config.sections,
              metadata: config.metadata,
              submissionCount: configSubmissions.length,
              lastUsed: configSubmissions.length > 0
                ? new Date(Math.max(...configSubmissions.map(s => new Date(s.createdAt).getTime())))
                : undefined,
              fieldCount: config.sections.reduce((total, section) => total + section.fields.length, 0),
              createdAt: config.metadata.createdAt,
              updatedAt: config.metadata.updatedAt,
              description: config.metadata.description
            } as ConfigurationWithStats;
          });
        })
      );
    },

    getById: (id: string): Observable<ConfigurationWithStats | null> => {
      return combineLatest([
        this.formConfigService.getFormConfig(id),
        this.submissionService.getAllSubmissions()
      ]).pipe(
        map(([config, submissions]) => {
          if (!config) return null;
          const configSubmissions = submissions.filter(s => s.formType === config.formType);
          return {
            id: config.id!,
            name: config.name,
            formType: config.formType,
            version: config.version,
            isDefault: config.isDefault,
            isActive: config.isActive,
            sections: config.sections,
            metadata: config.metadata,
            submissionCount: configSubmissions.length,
            lastUsed: configSubmissions.length > 0
              ? new Date(Math.max(...configSubmissions.map(s => new Date(s.createdAt).getTime())))
              : undefined,
            fieldCount: config.sections.reduce((total, section) => total + section.fields.length, 0),
            createdAt: config.metadata.createdAt,
            updatedAt: config.metadata.updatedAt,
            description: config.metadata.description
          } as ConfigurationWithStats;
        })
      );
    },

    create: (entity: Partial<ConfigurationWithStats>): Observable<ConfigurationWithStats> => {
      const config: Partial<FormConfiguration> = {
        name: entity.name!,
        formType: entity.formType!,
        version: '1.0.0',
        isDefault: false,
        isActive: true,
        sections: entity.sections || [],
        metadata: {
          createdBy: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: entity.description
        }
      };

      return this.formConfigService.saveFormConfig(config as FormConfiguration).pipe(
        map(savedConfig => ({
          id: savedConfig.id!,
          name: savedConfig.name,
          formType: savedConfig.formType,
          version: savedConfig.version,
          isDefault: savedConfig.isDefault,
          isActive: savedConfig.isActive,
          sections: savedConfig.sections,
          metadata: savedConfig.metadata,
          submissionCount: 0,
          fieldCount: savedConfig.sections.reduce((total, section) => total + section.fields.length, 0),
          createdAt: savedConfig.metadata.createdAt,
          updatedAt: savedConfig.metadata.updatedAt,
          description: savedConfig.metadata.description
        }))
      );
    },

    update: (id: string, entity: Partial<ConfigurationWithStats>): Observable<ConfigurationWithStats> => {
      const config: FormConfiguration = {
        id,
        name: entity.name!,
        formType: entity.formType!,
        version: entity.version || '1.0.0',
        isDefault: entity.isDefault || false,
        isActive: entity.isActive!,
        sections: entity.sections || [],
        metadata: {
          createdBy: 'user',
          createdAt: entity.createdAt!,
          updatedAt: new Date(),
          description: entity.description
        }
      };

      return this.formConfigService.saveFormConfig(config).pipe(
        map(savedConfig => ({
          id: savedConfig.id!,
          name: savedConfig.name,
          formType: savedConfig.formType,
          version: savedConfig.version,
          isDefault: savedConfig.isDefault,
          isActive: savedConfig.isActive,
          sections: savedConfig.sections,
          metadata: savedConfig.metadata,
          submissionCount: entity.submissionCount || 0,
          lastUsed: entity.lastUsed,
          fieldCount: savedConfig.sections.reduce((total, section) => total + section.fields.length, 0),
          createdAt: savedConfig.metadata.createdAt,
          updatedAt: savedConfig.metadata.updatedAt,
          description: savedConfig.metadata.description
        }))
      );
    },

    delete: (id: string): Observable<boolean> => {
      return this.formConfigService.deleteFormConfig(id);
    }
  };

  onConfigSelected(config: ConfigurationWithStats): void {
    this.router.navigate(['/forms', config.formType]);
  }

  onConfigCreated(config: ConfigurationWithStats): void {
    this.snackBar.open(`Configuration "${config.name}" created successfully`, 'Close', {
      duration: 3000
    });
    this.router.navigate(['/form-builder/visual-editor'], {
      queryParams: { configId: config.id }
    });
  }

  onConfigUpdated(config: ConfigurationWithStats): void {
    this.snackBar.open(`Configuration "${config.name}" updated successfully`, 'Close', {
      duration: 3000
    });
  }

  onConfigDeleted(configId: string): void {
    this.snackBar.open(`Configuration deleted successfully`, 'Close', {
      duration: 3000
    });
  }

  onViewForm(config: ConfigurationWithStats): void {
    this.router.navigate(['/forms', config.formType]);
  }

  onDuplicateConfig(config: ConfigurationWithStats): void {
    const duplicateConfig: Partial<ConfigurationWithStats> = {
      name: `${config.name} (Copy)`,
      formType: config.formType,
      sections: config.sections,
      description: config.description
    };

    this.configService.create(duplicateConfig).subscribe({
      next: (newConfig) => {
        this.snackBar.open(`Configuration duplicated as "${newConfig.name}"`, 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error duplicating configuration:', error);
        this.snackBar.open('Error duplicating configuration', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
