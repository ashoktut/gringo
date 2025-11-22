import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Design Imports
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Service Imports
import { FormConfiguration } from '../../services/form-config.service';
import { FormConfigService } from '../../services/form-config.service';

// Component Imports
import { VisualFormEditorComponent } from '../../sharedComponents/visual-form-editor/visual-form-editor.component';
import { FlowFormDesignerComponent } from '../../sharedComponents/flow-form-designer/flow-form-designer.component';
import { ConfigManagementComponent } from './config-management/config-management.component';

/**
 * Designer Types for the form builder
 */
export type DesignerType = 'flow' | 'visual';

/**
 * Interface for designer information cards
 */
interface DesignerInfo {
  id: DesignerType;
  title: string;
  description: string;
  icon: string;
  features: Array<{ icon: string; text: string }>;
  badge?: { text: string; class: string };
}

/**
 * Interface for feature comparison data
 */
interface ComparisonFeature {
  feature: string;
  icon: string;
  flow: boolean;
  visual: boolean;
  flowTooltip: string;
  visualTooltip: string;
}

/**
 * Enhanced FormBuilder Component with dual designer support
 *
 * This component provides a comprehensive form building interface that supports
 * both the Flow Form Designer (node-based visual editor) and the Visual Form Editor
 * (traditional panel-based editor). Users can choose between designers and
 * manage their form configurations through an intuitive tabbed interface.
 *
 * Features:
 * - Dual designer selection (Flow vs Visual)
 * - Configuration management
 * - Real-time preview capabilities
 * - Settings and preferences
 * - Responsive Material Design interface
 * - Accessibility compliance
 *
 * @author System
 * @version 2.0.0
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    // Core Angular modules
    CommonModule,
    FormsModule,

    // Material Design modules
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTableModule,
    MatExpansionModule,
    MatMenuModule,
    MatDividerModule,

    // Application components
    VisualFormEditorComponent,
    FlowFormDesignerComponent,
    ConfigManagementComponent
  ],
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.css']
})
export class FormBuilderComponent implements OnInit {
  // ===== DEPENDENCY INJECTION =====
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly formConfigService = inject(FormConfigService);

  // ===== SIGNALS FOR STATE MANAGEMENT =====

  /** Currently selected/editing configuration */
  readonly editingConfig = signal<FormConfiguration | null>(null);

  /** List of all available configurations */
  readonly configurations = signal<FormConfiguration[]>([]);

  /** Active tab index (0: Builder, 1: Settings) */
  readonly activeTabIndex = signal<number>(0);

  /** Currently selected designer type */
  readonly selectedDesigner = signal<DesignerType>('flow');

  /** Loading state for async operations */
  readonly isLoading = signal<boolean>(false);

  /** Error state for displaying error messages */
  readonly errorMessage = signal<string | null>(null);

  /** Default designer preference */
  readonly defaultDesigner = signal<DesignerType>('flow');

  /** Left sidebar collapsed state */
  readonly leftSidebarCollapsed = signal<boolean>(false);

  /** Right sidebar collapsed state */
  readonly rightSidebarCollapsed = signal<boolean>(false);

  // ===== COMPUTED SIGNALS =====

  /** Whether user can edit configurations */
  readonly canEdit = computed(() => !!this.editingConfig());

  /** Get current configuration display name */
  readonly currentConfigName = computed(() =>
    this.editingConfig()?.name || 'No Configuration Selected'
  );

  /** Check if there are any configurations */
  readonly hasConfigurations = computed(() =>
    this.configurations().length > 0
  );

  /** Get active designer info */
  readonly activeDesignerInfo = computed(() =>
    this.designerInfo.find(info => info.id === this.selectedDesigner())
  );

  // ===== DESIGNER INFORMATION =====
  readonly designerInfo: DesignerInfo[] = [
    {
      id: 'flow',
      title: 'Flow Form Designer',
      description: 'Node-based visual editor with drag-and-drop interface for creating complex form logic flows.',
      icon: 'account_tree',
      features: [
        { icon: 'check_circle', text: 'Visual node-based interface' },
        { icon: 'check_circle', text: 'Drag-and-drop components' },
        { icon: 'check_circle', text: 'Complex logic flows' },
        { icon: 'check_circle', text: 'Real-time preview' },
        { icon: 'check_circle', text: 'Component relationships' }
      ],
      badge: { text: 'NEW', class: 'new-chip' }
    },
    {
      id: 'visual',
      title: 'Visual Form Editor',
      description: 'Traditional panel-based editor with comprehensive field configuration and layout options.',
      icon: 'edit',
      features: [
        { icon: 'check_circle', text: 'Panel-based interface' },
        { icon: 'check_circle', text: 'Field property editor' },
        { icon: 'check_circle', text: 'Layout configuration' },
        { icon: 'check_circle', text: 'Validation rules' },
        { icon: 'check_circle', text: 'Custom styling' }
      ],
      badge: { text: 'CLASSIC', class: 'classic-chip' }
    }
  ];

  // ===== COMPONENT PALETTE DATA =====
  readonly inputComponents = [
    { type: 'text', label: 'Text Input', icon: 'text_fields' },
    { type: 'email', label: 'Email', icon: 'email' },
    { type: 'number', label: 'Number', icon: 'numbers' },
    { type: 'textarea', label: 'Text Area', icon: 'subject' },
    { type: 'select', label: 'Dropdown', icon: 'arrow_drop_down_circle' },
    { type: 'radio', label: 'Radio Group', icon: 'radio_button_checked' },
    { type: 'checkbox', label: 'Checkbox', icon: 'check_box' },
    { type: 'date', label: 'Date Picker', icon: 'event' },
    { type: 'time', label: 'Time Picker', icon: 'access_time' },
    { type: 'file', label: 'File Upload', icon: 'cloud_upload' },
    { type: 'phone', label: 'Phone Number', icon: 'phone' },
    { type: 'url', label: 'URL', icon: 'link' },
    { type: 'password', label: 'Password', icon: 'lock' },
    { type: 'range', label: 'Slider', icon: 'tune' }
  ];

  readonly logicGates = [
    { type: 'if', label: 'If Condition', icon: 'fork_right' },
    { type: 'and', label: 'AND Gate', icon: 'add' },
    { type: 'or', label: 'OR Gate', icon: 'difference' },
    { type: 'not', label: 'NOT Gate', icon: 'block' },
    { type: 'switch', label: 'Switch Case', icon: 'alt_route' },
    { type: 'loop', label: 'Loop', icon: 'loop' },
    { type: 'validate', label: 'Validation', icon: 'verified' },
    { type: 'calculate', label: 'Calculate', icon: 'calculate' },
    { type: 'transform', label: 'Transform', icon: 'transform' }
  ];

  readonly organizationalComponents = [
    { type: 'section', label: 'Form Section', icon: 'view_module' },
    { type: 'fieldset', label: 'Field Group', icon: 'group_work' },
    { type: 'divider', label: 'Divider', icon: 'horizontal_rule' },
    { type: 'spacer', label: 'Spacer', icon: 'space_bar' },
    { type: 'heading', label: 'Heading', icon: 'title' },
    { type: 'paragraph', label: 'Text Block', icon: 'text_snippet' },
    { type: 'image', label: 'Image', icon: 'image' },
    { type: 'video', label: 'Video', icon: 'video_library' },
    { type: 'html', label: 'Custom HTML', icon: 'code' }
  ];

  // ===== TABLE DATA FOR COMPARISON =====
  readonly displayedColumns: string[] = ['feature', 'flow', 'visual'];
  readonly comparisonData: ComparisonFeature[] = [
    {
      feature: 'Drag & Drop Interface',
      icon: 'touch_app',
      flow: true,
      visual: true,
      flowTooltip: 'Node-based drag and drop',
      visualTooltip: 'Component drag and drop'
    },
    {
      feature: 'Visual Flow Creation',
      icon: 'account_tree',
      flow: true,
      visual: false,
      flowTooltip: 'Create visual flows with connected nodes',
      visualTooltip: 'Not available in Visual Editor'
    },
    {
      feature: 'Complex Logic Rules',
      icon: 'psychology',
      flow: true,
      visual: true,
      flowTooltip: 'Advanced rule engine with visual connections',
      visualTooltip: 'Rule configuration through panels'
    },
    {
      feature: 'Real-time Preview',
      icon: 'visibility',
      flow: true,
      visual: true,
      flowTooltip: 'Live preview during flow creation',
      visualTooltip: 'Form preview with instant updates'
    },
    {
      feature: 'Component Relationships',
      icon: 'hub',
      flow: true,
      visual: false,
      flowTooltip: 'Visual component connections and dependencies',
      visualTooltip: 'Limited relationship visualization'
    },
    {
      feature: 'Field Configuration',
      icon: 'settings',
      flow: true,
      visual: true,
      flowTooltip: 'Node-based field configuration',
      visualTooltip: 'Comprehensive field property panels'
    },
    {
      feature: 'Layout Management',
      icon: 'view_module',
      flow: false,
      visual: true,
      flowTooltip: 'Layout handled through flow structure',
      visualTooltip: 'Advanced layout configuration tools'
    },
    {
      feature: 'Quick Form Creation',
      icon: 'flash_on',
      flow: false,
      visual: true,
      flowTooltip: 'Best for complex forms',
      visualTooltip: 'Optimized for rapid form development'
    }
  ];

  // ===== LIFECYCLE HOOKS =====

  constructor() {
    // Effect to auto-save preferences
    effect(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('preferred-designer', this.selectedDesigner());
      }
    });
  }

  async ngOnInit() {
    try {
      this.isLoading.set(true);
      await this.initializeComponent();
    } catch (error) {
      this.handleError('Failed to initialize form builder', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ===== INITIALIZATION METHODS =====

  private async initializeComponent(): Promise<void> {
    this.loadUserPreferences();
    await this.loadConfigurations();
    this.checkForEditMode();
  }

  private loadUserPreferences(): void {
    if (typeof localStorage !== 'undefined') {
      const savedDesigner = localStorage.getItem('preferred-designer') as DesignerType;
      if (savedDesigner && ['flow', 'visual'].includes(savedDesigner)) {
        this.selectedDesigner.set(savedDesigner);
        this.defaultDesigner.set(savedDesigner);
      }
    }
  }

  private async loadConfigurations(): Promise<void> {
    try {
      // TODO: Replace with actual service call when backend is ready
      const mockConfigurations: FormConfiguration[] = [
        {
          id: '1',
          name: 'Contact Form',
          formType: 'contact',
          version: '1.0',
          isDefault: true,
          isActive: true,
          sections: [],
          metadata: {
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: 'Basic contact form with name, email, and message fields'
          }
        },
        {
          id: '2',
          name: 'Registration Form',
          formType: 'registration',
          version: '1.2',
          isDefault: false,
          isActive: true,
          sections: [],
          metadata: {
            createdBy: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: 'User registration form with validation'
          }
        }
      ];

      this.configurations.set(mockConfigurations);
    } catch (error) {
      throw new Error('Failed to load configurations');
    }
  }

  private checkForEditMode(): void {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        const configId = params['edit'];
        const config = this.configurations().find(c => c.id === configId);
        if (config) {
          this.editConfiguration(config);
        } else {
          this.showError(`Configuration with ID '${configId}' not found`);
        }
      }
    });
  }

  // ===== CONFIGURATION MANAGEMENT =====

  /**
   * Edit an existing configuration
   */
  editConfiguration(config: FormConfiguration): void {
    this.editingConfig.set({ ...config }); // Create a copy to avoid mutations
    this.activeTabIndex.set(0); // Switch to builder tab
    this.showSuccess(`Editing configuration: ${config.name}`);
  }

  /**
   * Create a new configuration
   */
  createNewConfiguration(): void {
    const newConfig: FormConfiguration = {
      id: `config_${Date.now()}`,
      name: 'New Configuration',
      formType: 'custom',
      version: '1.0',
      isDefault: false,
      isActive: true,
      sections: [],
      metadata: {
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'New form configuration'
      }
    };

    this.editingConfig.set(newConfig);
    this.activeTabIndex.set(0); // Switch to builder tab
    this.showSuccess('Created new configuration');
  }

  /**
   * Save configuration changes
   */
  onConfigurationSaved(config: FormConfiguration): void {
    config.metadata.updatedAt = new Date();

    if (this.configurations().some(c => c.id === config.id)) {
      // Update existing
      this.configurations.update(configs =>
        configs.map(c => c.id === config.id ? config : c)
      );
      this.showSuccess(`Configuration '${config.name}' updated successfully`);
    } else {
      // Add new
      this.configurations.update(configs => [...configs, config]);
      this.showSuccess(`Configuration '${config.name}' created successfully`);
    }

    this.editingConfig.set(null);
  }

  /**
   * Cancel editing
   */
  onEditorCancelled(): void {
    this.editingConfig.set(null);
    this.showInfo('Configuration editing cancelled');
  }

  /**
   * Delete a configuration
   */
  deleteConfiguration(config: FormConfiguration): void {
    this.configurations.update(configs =>
      configs.filter(c => c.id !== config.id)
    );

    if (this.editingConfig()?.id === config.id) {
      this.editingConfig.set(null);
    }

    this.showSuccess(`Configuration '${config.name}' deleted`);
  }

  // ===== FLOW DESIGNER EVENT HANDLERS =====

  onFlowConfigurationChange(config: FormConfiguration): void {
    console.log('Flow configuration changed:', config);
    if (config.id) {
      this.configurations.update(configs =>
        configs.map(c => c.id === config.id ? config : c)
      );
    }
  }

  onNodeSelected(node: any): void {
    console.log('Node selected in flow designer:', node);
  }

  onBlueprintCreated(config: FormConfiguration): void {
    console.log('Blueprint created from flow:', config);
    if (!config.id) {
      config.id = `config_${Date.now()}`;
    }

    this.configurations.update(configs => [...configs, config]);
    this.editingConfig.set(config);
    this.showSuccess(`Blueprint '${config.name}' created from flow`);
  }

  // ===== DESIGNER SELECTION =====

  onDesignerChanged(designer: DesignerType): void {
    this.selectedDesigner.set(designer);
    this.showInfo(`Switched to ${designer === 'flow' ? 'Flow' : 'Visual'} designer`);
  }

  /**
   * Set default designer preference
   */
  setDefaultDesigner(designer: DesignerType): void {
    this.defaultDesigner.set(designer);
    this.selectedDesigner.set(designer);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('preferred-designer', designer);
    }
    this.showSuccess(`Default designer set to ${designer === 'flow' ? 'Flow' : 'Visual'}`);
  }

  // ===== DASHBOARD SPECIFIC METHODS =====

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.leftSidebarCollapsed.update(collapsed => !collapsed);
    } else {
      this.rightSidebarCollapsed.update(collapsed => !collapsed);
    }
  }

  /**
   * Handle component drag start
   */
  onComponentDragStart(event: DragEvent, component: any): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify(component));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  /**
   * Export all configurations
   */
  exportAllConfigurations(): void {
    const allConfigs = this.configurations();
    const dataStr = JSON.stringify(allConfigs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'all_form_configurations.json';
      link.click();
      window.URL.revokeObjectURL(url);

      this.showSuccess('All configurations exported successfully');
    }
  }

  // ===== UTILITY METHODS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 2000
    });
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessage.set(message);
    this.showError(message);
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Navigate to specific configuration
   */
  navigateToConfiguration(configId: string): void {
    this.router.navigate([], {
      queryParams: { edit: configId },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(config: FormConfiguration): void {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name.replace(/\s+/g, '_')}_config.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.showSuccess(`Configuration '${config.name}' exported`);
    }
  }

  /**
   * Duplicate an existing configuration
   */
  duplicateConfiguration(config: FormConfiguration): void {
    const duplicate: FormConfiguration = {
      ...config,
      id: `config_${Date.now()}`,
      name: `${config.name} (Copy)`,
      isDefault: false,
      metadata: {
        ...config.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user'
      }
    };

    this.configurations.update(configs => [...configs, duplicate]);
    this.showSuccess(`Configuration duplicated as '${duplicate.name}'`);
  }
}
