import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { FormConfiguration, FormConfigService } from '../../services/form-config.service';
import { FormBuilderTemplateService } from './services/form-builder-template.service';
import { VisualFormEditorComponent } from '../../sharedComponents/visual-form-editor/visual-form-editor.component';
import { ConfigManagementComponent } from './config-management/config-management.component';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatChipsModule,
    VisualFormEditorComponent,
    ConfigManagementComponent
  ],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css'
})
export class FormBuilderComponent implements OnInit {
  // Injected services
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formConfigService = inject(FormConfigService);
  private readonly templateService = inject(FormBuilderTemplateService);

  // Component state
  currentMode = signal<string>('management');
  currentForm = signal<FormConfiguration | null>(null);
  configurations = signal<FormConfiguration[]>([]);

  // Computed properties
  canEdit = computed(() => !!this.currentForm());
  availableTemplates = computed(() => this.templateService.getAllTemplates());

  ngOnInit(): void {
    this.initializeComponent();
  }

  // Initialization
  private initializeComponent(): void {
    this.loadConfigurations();
    this.checkForEditMode();
  }

  private loadConfigurations(): void {
    // Load existing configurations from service
    this.formConfigService.getAllFormConfigs().subscribe({
      next: (configs) => this.configurations.set(configs),
      error: (error) => console.error('Failed to load configurations:', error)
    });
  }

  private checkForEditMode(): void {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        const configId = params['edit'];
        const config = this.configurations().find(c => c.id === configId);
        if (config) {
          this.editConfiguration(config);
        }
      }
    });
  }

  // Mode management
  switchMode(mode: string) {
    this.currentMode.set(mode);
  }

  newForm() {
    this.currentForm.set(null);
    this.currentMode.set('editor');
  }

  // Form actions
  previewForm() {
    if (this.currentForm()) {
      console.log('Previewing form:', this.currentForm());
      // TODO: Implement preview functionality
    }
  }

  exportForm() {
    if (this.currentForm()) {
      const dataStr = JSON.stringify(this.currentForm(), null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `form-${Date.now()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }

  shareForm() {
    if (this.currentForm()) {
      console.log('Sharing form:', this.currentForm());
      // TODO: Implement sharing logic
    }
  }

  // Event handlers from visual editor
  onFormSave(formData: any) {
    console.log('Form saved:', formData);
    this.saveConfiguration(formData);
  }

  onFormLoad(formData: any) {
    console.log('Form loaded:', formData);
    this.currentForm.set(formData);
  }

  onConfigChange(config: any) {
    console.log('Config changed:', config);
  }

  // Configuration management
  editConfiguration(config: FormConfiguration): void {
    this.currentForm.set(config);
    this.currentMode.set('editor');
  }

  createNewConfiguration(): void {
    const newConfig = this.templateService.createCustomConfiguration();
    this.currentForm.set(newConfig);
    this.currentMode.set('editor');
  }

  loadTemplate(templateId: string): void {
    if (templateId === 'rfq') {
      // Special handling for RFQ template from FormConfigService
      const rfqConfig = this.formConfigService.getComprehensiveRfqConfiguration();
      this.currentForm.set(rfqConfig);
    } else {
      // Use template service for other templates
      const config = this.templateService.templateToFormConfiguration(templateId);
      if (config) {
        this.currentForm.set(config);
      }
    }
    this.currentMode.set('editor');
  }

  // Event handlers
  onConfigurationSaved(config: FormConfiguration): void {
    this.saveConfiguration(config);
    this.exitEditor();
  }

  onEditorCancelled(): void {
    this.exitEditor();
  }

  deleteConfiguration(config: FormConfiguration): void {
    this.configurations.update(configs =>
      configs.filter(c => c.id !== config.id)
    );

    if (this.currentForm()?.id === config.id) {
      this.exitEditor();
    }
  }

  // Private helpers
  private saveConfiguration(config: FormConfiguration): void {
    if (!config.id) {
      // New configuration - assign ID
      config.id = this.generateConfigId();
    }

    // Use saveFormConfig for both create and update
    this.formConfigService.saveFormConfig(config).subscribe({
      next: (savedConfig) => {
        console.log('✅ Configuration saved successfully:', savedConfig);
        this.loadConfigurations(); // Refresh the configurations list
      },
      error: (error) => {
        console.error('❌ Error saving configuration:', error);
        // TODO: Show error notification to user
      }
    });
  }

  private exitEditor(): void {
    this.currentForm.set(null);
    this.currentMode.set('management');
  }

  private generateConfigId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
