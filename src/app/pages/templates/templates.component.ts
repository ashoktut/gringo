import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil } from 'rxjs';
import { Template, TemplateType, PdfGenerationOptions } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { DocumentTemplateComponent } from '../../sharedComponents/document-template/document-template.component';
import { SearchComponent, SearchConfig } from '../../sharedComponents/search/search.component';

// Enhanced form type configuration
interface FormTypeConfig {
  type: TemplateType;
  label: string;
  icon: string;
  color: string;
  description: string;
  samplePlaceholders: string[];
  category: 'business' | 'technical' | 'administrative';
}

// Template category interface
interface TemplateCategory {
  name: string;
  icon: string;
  description: string;
  templates: Template[];
}

// Template association interface
interface TemplateAssociation {
  templateId: string;
  formType: TemplateType;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
}

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatCheckboxModule,
    DocumentTemplateComponent,
    SearchComponent
  ],
  template: `
    <div class="templates-container">
      <!-- Enhanced Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <mat-icon class="page-icon">folder_special</mat-icon>
            Template Management Hub
          </h1>
          <p class="subtitle">
            {{ currentFormType() ?
              'Managing ' + getFormTypeLabel(currentFormType()) + ' templates' :
              'Organize and manage document templates across all form types'
            }}
          </p>
        </div>

        <div class="header-actions">
          <app-search
            [config]="searchConfig"
            (searchChange)="onSearchChange($event)"
            (searchClear)="onSearchClear()">
          </app-search>

          <button mat-icon-button
                  [matTooltip]="viewMode() === 'grid' ? 'Switch to List View' : 'Switch to Grid View'"
                  (click)="onViewModeChange(viewMode() === 'grid' ? 'list' : 'grid')">
            <mat-icon>{{ viewMode() === 'grid' ? 'view_list' : 'view_module' }}</mat-icon>
          </button>

          <button mat-raised-button
                  color="primary"
                  [matMenuTriggerFor]="createMenu">
            <mat-icon>add</mat-icon>
            Create Template
          </button>

          <mat-menu #createMenu="matMenu">
            @for (config of formTypeConfigs; track config.type) {
              <button mat-menu-item (click)="createNewTemplate(config.type)">
                <mat-icon [style.color]="'var(--mat-' + config.color + '-500)'">
                  {{ config.icon }}
                </mat-icon>
                <span>{{ config.label }}</span>
              </button>
            }
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="bulkUploadTemplates()">
              <mat-icon>cloud_upload</mat-icon>
              <span>Bulk Upload</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Statistics Dashboard -->
      <div class="stats-dashboard">
        @for (stat of [
          { label: 'Total Templates', value: templateStats().total, icon: 'description', color: 'primary' },
          { label: 'Active Templates', value: templateStats().active, icon: 'visibility', color: 'accent' },
          { label: 'Universal Templates', value: templateStats().universal, icon: 'public', color: 'warn' },
          { label: 'Form Types', value: templateStats().formTypeCount, icon: 'category', color: 'primary' }
        ]; track stat.label) {
          <mat-card class="stat-card" [class]="'stat-' + stat.color">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>{{ stat.icon }}</mat-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Enhanced Upload Section -->
      <mat-card class="upload-section">
        <mat-card-header>
          <div mat-card-avatar class="upload-avatar">
            <mat-icon>cloud_upload</mat-icon>
          </div>
          <mat-card-title>Upload New Template</mat-card-title>
          <mat-card-subtitle>
            Create professional document templates with dynamic placeholders
            @if (currentFormType()) {
              for {{ getFormTypeLabel(currentFormType()) }}
            }
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (currentFormType()) {
            <div class="form-type-context">
              <mat-chip class="context-chip" [color]="getFormTypeColor(currentFormType())">
                <mat-icon matChipAvatar>{{ getFormTypeIcon(currentFormType()) }}</mat-icon>
                {{ getFormTypeLabel(currentFormType()) }} Template
              </mat-chip>
              <p class="context-description">
                {{ currentFormTypeConfig()?.description }}
              </p>
              <div class="suggested-placeholders">
                <span class="placeholders-label">Suggested placeholders:</span>
                <mat-chip-set>
                  @for (placeholder of currentFormTypeConfig()?.samplePlaceholders || []; track placeholder) {
                    <mat-chip class="placeholder-chip">
                      {{ '{{' + placeholder + '}}' }}
                    </mat-chip>
                  }
                </mat-chip-set>
              </div>
            </div>
          }

          <app-document-template
            [formType]="currentFormType()"
            (templateUploaded)="onTemplateUploaded($event)"
            (uploadError)="onUploadError($event)">
          </app-document-template>
        </mat-card-content>
      </mat-card>

      <!-- Templates Management -->
      <div class="templates-management">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>folder</mat-icon>
              Template Library
            </mat-card-title>
            <mat-card-subtitle>
              {{ filteredTemplates().length }} template(s)
              {{ currentFormType() ? 'for ' + getFormTypeLabel(currentFormType()) : 'across all form types' }}
            </mat-card-subtitle>
          </mat-card-header>

          <!-- Form Type Tabs -->
          @if (!currentFormType()) {
            <mat-tab-group class="form-type-tabs">
              <mat-tab label="All Templates">
                <div class="tab-content">
                  @if (allTemplates().length > 0) {
                    <div class="templates-grid">
                      @for (template of allTemplates(); track template) {
                        <div class="template-card">
                          <ng-container *ngTemplateOutlet="templateCardTemplate; context: { template: template }"></ng-container>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-state">
                      <mat-icon>description</mat-icon>
                      <h3>No Templates Found</h3>
                      <p>Upload your first template to get started.</p>
                    </div>
                  }
                </div>
              </mat-tab>
              @for (config of formTypeConfigs; track config.type) {
                <mat-tab [label]="config.label">
                  <div class="tab-content">
                    @if (getTemplatesForFormType(config.type).length > 0) {
                      <div class="templates-grid">
                        @for (template of getTemplatesForFormType(config.type); track template) {
                          <div class="template-card">
                            <ng-container *ngTemplateOutlet="templateCardTemplate; context: { template: template }"></ng-container>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-state">
                        <mat-icon>description</mat-icon>
                        <h3>No {{ config.label }}</h3>
                        <p>Upload a template specifically for {{ config.label.toLowerCase() }}.</p>
                      </div>
                    }
                  </div>
                </mat-tab>
              }
            </mat-tab-group>
          }

          <!-- Single Form Type View -->
          @if (currentFormType()) {
            <div class="single-form-view">
              @if (filteredTemplates().length > 0) {
                <div class="templates-grid">
                  @for (template of filteredTemplates(); track template) {
                    <div class="template-card">
                      <ng-container *ngTemplateOutlet="templateCardTemplate; context: { template: template }"></ng-container>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>description</mat-icon>
                  <h3>No {{ getFormTypeLabel(currentFormType()) }}</h3>
                  <p>Upload a template for {{ currentFormType() }} forms using the upload section above.</p>
                </div>
              }
            </div>
          }
        </mat-card>
      </div>

      <!-- Quick Actions -->
      @if (formTypeConfigs.length > 0) {
        <mat-card class="quick-actions">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>flash_on</mat-icon>
              Quick Actions
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              @for (config of formTypeConfigs; track config.type) {
                <button mat-raised-button
                  color="primary"
                  [routerLink]="['/templates', config.type]"
                  class="form-type-button">
                  <mat-icon>{{ config.icon }}</mat-icon>
                  {{ config.label }}
                  <mat-chip class="count-chip">{{ getTemplatesForFormType(config.type).length }}</mat-chip>
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Template Instructions -->
      <mat-card class="instructions-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>help</mat-icon>
            Template Creation Guide
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="instructions-grid">
            <div class="instruction-item">
              <div class="instruction-icon">
                <mat-icon>edit</mat-icon>
              </div>
              <div class="instruction-content">
                <h4>1. Create Your Document</h4>
                <p>Use Word or Google Docs to create your template with placeholders like <code>{{ '{' }}{{ '{' }}clientName{{ '}' }}{{ '}' }}</code></p>
              </div>
            </div>

            <div class="instruction-item">
              <div class="instruction-icon">
                <mat-icon>upload</mat-icon>
              </div>
              <div class="instruction-content">
                <h4>2. Upload Template</h4>
                <p>Upload your document and specify which form type it's designed for</p>
              </div>
            </div>

            <div class="instruction-item">
              <div class="instruction-icon">
                <mat-icon>preview</mat-icon>
              </div>
              <div class="instruction-content">
                <h4>3. Test & Use</h4>
                <p>Test your template with sample data, then use it to generate PDFs from form submissions</p>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Template Card Template -->
    <ng-template #templateCardTemplate let-template="template">
      <mat-card class="template-item">
        <mat-card-header>
          <div mat-card-avatar class="template-avatar">
            <mat-icon>{{ getTemplateIcon(template.type) }}</mat-icon>
          </div>
          <mat-card-title>{{ template.name }}</mat-card-title>
          <mat-card-subtitle>
            <mat-chip [class.universal]="template.isUniversal" class="form-type-chip">
              {{ template.isUniversal ? 'Universal' : template.formType.toUpperCase() }}
            </mat-chip>
            <span class="upload-date">{{ template.uploadedAt | date:'short' }}</span>
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="template-details">
            <div class="detail-row">
              <span class="label">Size:</span>
              <span class="value">{{ formatFileSize(template.size) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="value">{{ getTemplateTypeDisplay(template.type) }}</span>
            </div>
            @if (template.placeholders.length > 0) {
              <div class="detail-row">
                <span class="label">Placeholders:</span>
                <span class="value">{{ template.placeholders.length }} found</span>
              </div>
            }
          </div>

          @if (template.placeholders.length > 0) {
            <div class="placeholders-preview">
              <mat-chip-set>
                @for (placeholder of template.placeholders.slice(0, 3); track placeholder) {
                  <mat-chip
                    class="placeholder-chip">
                    {{ placeholder }}
                  </mat-chip>
                }
                @if (template.placeholders.length > 3) {
                  <mat-chip
                    class="more-chip">
                    +{{ template.placeholders.length - 3 }} more
                  </mat-chip>
                }
              </mat-chip-set>
            </div>
          }
        </mat-card-content>

        <mat-card-actions>
          <button mat-button
            color="primary"
            (click)="testTemplate(template)"
            matTooltip="Generate test PDF">
            <mat-icon>preview</mat-icon>
            Test
          </button>

          <button mat-button
            [matMenuTriggerFor]="templateMenu"
            matTooltip="More actions">
            <mat-icon>more_vert</mat-icon>
          </button>

          <mat-menu #templateMenu="matMenu">
            <button mat-menu-item (click)="cloneTemplate(template)">
              <mat-icon>content_copy</mat-icon>
              <span>Clone for Other Form</span>
            </button>
            <button mat-menu-item (click)="downloadTemplate(template)">
              <mat-icon>download</mat-icon>
              <span>Download</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item
              (click)="deleteTemplate(template.id)"
              class="delete-action">
              <mat-icon>delete</mat-icon>
              <span>Delete</span>
            </button>
          </mat-menu>
        </mat-card-actions>
      </mat-card>
    </ng-template>
    `,
  styles: [`
    .templates-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 24px;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #1976d2;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #666;
      margin: 0;
      font-size: 16px;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .stat-card {
      text-align: center;
      padding: 16px;
      background: linear-gradient(135deg, #1976d2, #42a5f5);
      color: white;
      border-radius: 8px;
      min-width: 80px;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.9;
    }

    .upload-section {
      margin-bottom: 32px;
    }

    .upload-section mat-card-header {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      margin: -24px -24px 24px -24px;
      padding: 24px;
    }

    .upload-section mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .templates-management {
      margin-bottom: 32px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
      margin-top: 16px;
    }

    .template-item {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .template-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .template-avatar {
      background: #1976d2;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .form-type-chip {
      font-size: 11px;
      margin-right: 8px;
    }

    .form-type-chip.universal {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .upload-date {
      font-size: 11px;
      color: #999;
    }

    .template-details {
      margin: 16px 0;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .detail-row .label {
      font-weight: 500;
      color: #666;
    }

    .detail-row .value {
      color: #333;
    }

    .placeholders-preview {
      margin-top: 16px;
    }

    .placeholder-chip {
      background-color: #e8f5e8 !important;
      color: #2e7d32 !important;
      font-size: 11px !important;
    }

    .more-chip {
      background-color: #f5f5f5 !important;
      color: #666 !important;
      font-size: 11px !important;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .quick-actions {
      margin-bottom: 32px;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .form-type-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-chip {
      background-color: rgba(255,255,255,0.2) !important;
      color: inherit !important;
      font-size: 11px !important;
    }

    .instructions-card mat-card-header {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      margin: -24px -24px 24px -24px;
      padding: 24px;
    }

    .instructions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .instruction-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .instruction-icon {
      background: #1976d2;
      color: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .instruction-content h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .instruction-content p {
      margin: 0;
      color: #666;
      line-height: 1.5;
    }

    .instruction-content code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      color: #d32f2f;
    }

    .delete-action {
      color: #d32f2f;
    }

    @media (max-width: 768px) {
      .templates-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-stats {
        width: 100%;
        justify-content: center;
      }

      .templates-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .instructions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TemplatesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signal-based state management
  allTemplates = signal<Template[]>([]);
  currentFormType = signal<TemplateType | ''>('');
  selectedCategory = signal<string>('all');
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);
  viewMode = signal<'grid' | 'list'>('grid');
  sortBy = signal<'name' | 'date' | 'type' | 'usage'>('date');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Form type configurations with enhanced metadata
  formTypeConfigs: FormTypeConfig[] = [
    {
      type: 'rfq' as TemplateType,
      label: 'Requests for Quote',
      icon: 'request_quote',
      color: 'primary',
      description: 'Templates for generating RFQ documents and quotes',
      category: 'business',
      samplePlaceholders: ['clientName', 'standNum', 'solarArea', 'repName', 'dateSubmitted']
    },
    {
      type: 'quote' as TemplateType,
      label: 'Price Quotes',
      icon: 'receipt',
      color: 'accent',
      description: 'Professional quote and pricing documents',
      category: 'business',
      samplePlaceholders: ['projectName', 'totalAmount', 'validUntil', 'terms']
    },
    {
      type: 'invoice' as TemplateType,
      label: 'Invoices',
      icon: 'payment',
      color: 'warn',
      description: 'Invoice templates for billing and payments',
      category: 'administrative',
      samplePlaceholders: ['invoiceNumber', 'amount', 'dueDate', 'paymentTerms']
    },
    {
      type: 'estimate' as TemplateType,
      label: 'Project Estimates',
      icon: 'calculate',
      color: 'primary',
      description: 'Cost estimation and project planning documents',
      category: 'business',
      samplePlaceholders: ['projectType', 'estimatedCost', 'scope', 'timeline']
    },
    {
      type: 'proposal' as TemplateType,
      label: 'Project Proposals',
      icon: 'description',
      color: 'accent',
      description: 'Detailed project proposals and contracts',
      category: 'business',
      samplePlaceholders: ['projectTitle', 'clientName', 'proposalValue', 'deliverables']
    },
    {
      type: 'contract' as TemplateType,
      label: 'Service Contracts',
      icon: 'gavel',
      color: 'primary',
      description: 'Legal contracts and service agreements',
      category: 'administrative',
      samplePlaceholders: ['contractNumber', 'parties', 'terms', 'duration']
    },
    {
      type: 'report' as TemplateType,
      label: 'Technical Reports',
      icon: 'assessment',
      color: 'warn',
      description: 'Technical analysis and inspection reports',
      category: 'technical',
      samplePlaceholders: ['reportTitle', 'inspector', 'findings', 'recommendations']
    }
  ];

  // Computed properties
  filteredTemplates = computed(() => {
    let templates = this.allTemplates();
    const formType = this.currentFormType();
    const category = this.selectedCategory();
    const search = this.searchTerm();

    // Filter by form type
    if (formType && formType.length > 0) {
      templates = templates.filter(t => t.formType === formType || t.isUniversal);
    }

    // Filter by category
    if (category && category !== 'all') {
      const formTypesInCategory = this.formTypeConfigs
        .filter(config => config.category === category)
        .map(config => config.type);
      templates = templates.filter(t =>
        formTypesInCategory.includes(t.formType) || t.isUniversal
      );
    }

    // Apply search
    if (search) {
      templates = this.applySearchFilter(templates, search);
    }

    // Apply sorting
    return this.applySorting(templates);
  });

  templatesByFormType = computed(() => {
    const groupedTemplates: Record<string, Template[]> = {};

    this.formTypeConfigs.forEach(config => {
      groupedTemplates[config.type] = this.allTemplates().filter(t =>
        t.formType === config.type
      );
    });

    groupedTemplates['universal'] = this.allTemplates().filter(t => t.isUniversal);

    return groupedTemplates;
  });

  templatesByCategory = computed(() => {
    const categories: TemplateCategory[] = [
      {
        name: 'business',
        icon: 'business',
        description: 'Business documents and communications',
        templates: []
      },
      {
        name: 'technical',
        icon: 'engineering',
        description: 'Technical reports and specifications',
        templates: []
      },
      {
        name: 'administrative',
        icon: 'admin_panel_settings',
        description: 'Administrative and legal documents',
        templates: []
      }
    ];

    const templates = this.allTemplates();

    categories.forEach(category => {
      const formTypesInCategory = this.formTypeConfigs
        .filter(config => config.category === category.name)
        .map(config => config.type);

      category.templates = templates.filter(t =>
        formTypesInCategory.includes(t.formType) ||
        (t.isUniversal && category.name === 'business')
      );
    });

    return categories;
  });

  formTypeCounts = computed(() => {
    const templates = this.allTemplates();
    const counts: Record<string, number> = {
      all: templates.length,
      universal: templates.filter(t => t.isUniversal).length
    };

    this.formTypeConfigs.forEach(config => {
      counts[config.type] = templates.filter(t => t.formType === config.type).length;
    });

    return counts;
  });

  categoryCounts = computed(() => {
    const categories = this.templatesByCategory();
    const counts: Record<string, number> = { all: this.allTemplates().length };

    categories.forEach(category => {
      counts[category.name] = category.templates.length;
    });

    return counts;
  });

  templateStats = computed(() => {
    const templates = this.allTemplates();
    return {
      total: templates.length,
      active: templates.length, // All templates are considered active by default
      universal: templates.filter(t => t.isUniversal).length,
      formTypeCount: new Set(templates.map(t => t.formType)).size
    };
  });

  currentFormTypeConfig = computed(() => {
    const formType = this.currentFormType();
    return this.formTypeConfigs.find(c => c.type === formType) || null;
  });

  // Search configuration
  searchConfig: SearchConfig = {
    placeholder: 'Search templates by name, type, or placeholders...',
    debounceTime: 300,
    minLength: 1,
    showClearButton: true
  };

  constructor(
    private templateService: TemplateManagementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.setupRouteHandling();
    this.loadTemplates();
  }

  private setupRouteHandling(): void {
    // Check for form type and category in route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const formTypeParam = params.get('formType');
      const validFormTypes = this.formTypeConfigs.map(c => c.type);

      if (formTypeParam && validFormTypes.includes(formTypeParam as TemplateType)) {
        this.currentFormType.set(formTypeParam as TemplateType);
      } else {
        this.currentFormType.set('');
      }
    });

    // Listen for query params (category, search, etc.)
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      if (params['search']) {
        this.searchTerm.set(params['search']);
      }
      if (params['view']) {
        this.viewMode.set(params['view'] === 'list' ? 'list' : 'grid');
      }
      if (params['sort']) {
        this.sortBy.set(params['sort']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates() {
    this.isLoading.set(true);

    this.templateService.getAllTemplates().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (templates) => {
        console.log('📁 Loaded templates:', templates.length);
        this.allTemplates.set(templates);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error loading templates:', error);
        this.showError('Failed to load templates: ' + (error?.message || 'Unknown error'));
        this.isLoading.set(false);
      }
    });
  }

  // Search and filtering
  onSearchChange(searchTerm: string) {
    this.searchTerm.set(searchTerm);
    this.updateURL();
  }

  onSearchClear() {
    this.searchTerm.set('');
    this.updateURL();
  }

  private applySearchFilter(templates: Template[], searchTerm: string): Template[] {
    const searchLower = searchTerm.toLowerCase();

    return templates.filter(template => {
      // Search in template name
      if (template.name.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in form type
      if (template.formType.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in placeholders
      if (template.placeholders.some(p => p.toLowerCase().includes(searchLower))) {
        return true;
      }

      // Search in metadata description if available
      if (template.metadata?.description && template.metadata.description.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });
  }

  private applySorting(templates: Template[]): Template[] {
    const sortBy = this.sortBy();
    const order = this.sortOrder();

    return [...templates].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'type':
          comparison = a.formType.localeCompare(b.formType);
          break;
        case 'usage':
          // Sort by name since usage count is not available in Template interface
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  // Form type and category management
  onFormTypeChange(formType: TemplateType | '') {
    this.currentFormType.set(formType);
    this.updateURL();

    if (formType && formType.length > 0) {
      this.router.navigate(['/templates', formType], {
        queryParams: this.getQueryParams(),
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate(['/templates'], {
        queryParams: this.getQueryParams(),
        queryParamsHandling: 'merge'
      });
    }
  }

  onCategoryChange(category: string) {
    this.selectedCategory.set(category);
    this.updateURL();
  }

  onViewModeChange(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
    this.updateURL();
  }

  onSortChange(sortBy: 'name' | 'date' | 'type' | 'usage') {
    if (this.sortBy() === sortBy) {
      // Toggle order if same field
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('desc');
    }
    this.updateURL();
  }

  private updateURL() {
    const queryParams = this.getQueryParams();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  private getQueryParams(): any {
    const params: any = {};

    if (this.selectedCategory() !== 'all') {
      params.category = this.selectedCategory();
    }
    if (this.searchTerm()) {
      params.search = this.searchTerm();
    }
    if (this.viewMode() !== 'grid') {
      params.view = this.viewMode();
    }
    if (this.sortBy() !== 'date') {
      params.sort = this.sortBy();
    }
    if (this.sortOrder() !== 'desc') {
      params.order = this.sortOrder();
    }

    return params;
  }

  getTemplatesForFormType(formType: TemplateType): Template[] {
    return this.allTemplates().filter(template =>
      template.formType === formType || template.isUniversal
    );
  }

  getFormTypeConfig(formType: TemplateType): FormTypeConfig | undefined {
    return this.formTypeConfigs.find(config => config.type === formType);
  }

  // Template management
  onTemplateUploaded(template: Template) {
    this.showSuccess(`Template "${template.name}" uploaded successfully!`);
    this.loadTemplates();
  }

  onUploadError(error: string) {
    this.showError(error);
  }

  // Enhanced template actions
  createNewTemplate(formType?: TemplateType) {
    // Navigate to template creation or trigger upload
    const targetFormType = formType || this.currentFormType();
    console.log('🆕 Creating new template for:', targetFormType);
    // This could open a dialog or navigate to a creation page
  }

  bulkUploadTemplates() {
    console.log('📁 Bulk upload templates');
    // Implement bulk upload functionality
    this.showInfo('Bulk upload functionality coming soon!');
  }

  exportTemplates(formType?: TemplateType) {
    const templatesToExport = formType
      ? this.getTemplatesForFormType(formType)
      : this.filteredTemplates();

    console.log('📤 Exporting templates:', templatesToExport.length);

    // Create export data
    const exportData = {
      exportDate: new Date().toISOString(),
      formType: formType || 'all',
      templates: templatesToExport.map(t => ({
        name: t.name,
        formType: t.formType,
        type: t.type,
        placeholders: t.placeholders,
        isUniversal: t.isUniversal
      }))
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)],
      { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `templates-export-${formType || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.showSuccess(`Exported ${templatesToExport.length} templates`);
  }

  // Template association management
  setAsDefaultTemplate(template: Template) {
    console.log('⭐ Setting as default template:', template.name);
    // This functionality would need to be implemented in the service
    this.showInfo('Set as default functionality coming soon!');
  }

  toggleTemplateActive(template: Template) {
    console.log('🔄 Toggling template active status:', template.name);
    // This functionality would need to be implemented in the service
    this.showInfo('Toggle active status functionality coming soon!');
  }

  associateWithFormType(template: Template, newFormType: TemplateType) {
    console.log('🔗 Associating template with form type:', template.name, newFormType);
    // This functionality would need to be implemented in the service
    this.showInfo('Associate with form type functionality coming soon!');
  }

  testTemplate(template: Template) {
    const sampleData = this.generateSampleData(template.formType);

    this.templateService.testTemplate(template.id, sampleData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.snackBar.open('Test PDF generated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.snackBar.open('Error generating test PDF: ' + error.message, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  cloneTemplate(template: Template) {
    // TODO: Implement clone dialog
    this.snackBar.open('Clone functionality coming soon!', 'Close', {
      duration: 3000
    });
  }

  downloadTemplate(template: Template) {
    // Create a blob from the template content
    const blob = new Blob([template.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.name;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  deleteTemplate(templateId: string) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.templateService.deleteTemplate(templateId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.loadTemplates();
          this.snackBar.open('Template deleted successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          this.showError('Failed to delete template: ' + (error?.message || 'Unknown error'));
        }
      });
    }
  }

  onTabChange(event: any) {
    // Handle tab changes if needed
    console.log('Tab changed:', event);
  }

  getTemplateIcon(type: string): string {
    switch (type) {
      case 'word': return 'description';
      case 'google-docs': return 'article';
      case 'odt': return 'text_snippet';
      default: return 'insert_drive_file';
    }
  }

  getFormTypeIcon(formType: TemplateType | ''): string {
    if (!formType) return 'description';
    switch (formType) {
      case 'rfq': return 'request_quote';
      case 'rqr': return 'assignment';
      case 'invoice': return 'receipt';
      case 'quote': return 'monetization_on';
      case 'report': return 'assessment';
      default: return 'description';
    }
  }

  getFormTypeLabel(formType: TemplateType | ''): string {
    if (!formType) return 'All Templates';
    const config = this.getFormTypeConfig(formType);
    return config ? config.label : formType.toUpperCase();
  }

  getFormTypeColor(formType: TemplateType | ''): string {
    if (!formType) return 'primary';
    const config = this.getFormTypeConfig(formType);
    return config ? config.color : 'primary';
  }

  getTemplateTypeDisplay(type: string): string {
    switch (type) {
      case 'word': return 'Microsoft Word';
      case 'google-docs': return 'Google Docs';
      case 'odt': return 'OpenDocument';
      default: return type;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateSampleData(formType: TemplateType): any {
    const baseData = {
      submissionId: 'TEST-001',
      dateSubmitted: new Date().toISOString().split('T')[0],
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'submitted'
    };

    switch (formType) {
      case 'rfq':
        return {
          ...baseData,
          clientName: 'John Smith',
          clientEmail: 'john.smith@example.com',
          clientPhone: '+27721549865',
          standNum: '123 Main Street, Cape Town',
          repName: 'Bryan Van Staden',
          roofTimeline: '2 weeks',
          structureType: ['Tiled Roof'],
          buildingType: 'Residential',
          municipality: 'Cape Town',
          trussNotes: 'Standard residential truss with 30-degree pitch'
        };
      case 'rqr':
        return {
          ...baseData,
          clientName: 'Jane Doe',
          clientEmail: 'jane.doe@company.com',
          projectType: 'Commercial Building',
          requirements: 'Steel structure framework',
          budget: '250000',
          location: 'Johannesburg, GP'
        };
      default:
        return {
          ...baseData,
          clientName: 'Sample Client',
          description: 'Sample document description',
          amount: '10000',
          notes: 'This is a test document generated from template'
        };
    }
  }



  getCategoryIcon(category: string): string {
    const categoryConfig = {
      'business': 'business',
      'technical': 'engineering',
      'administrative': 'admin_panel_settings',
      'all': 'folder'
    };
    return categoryConfig[category as keyof typeof categoryConfig] || 'folder';
  }

  getCategoryLabel(category: string): string {
    const categoryLabels = {
      'business': 'Business Documents',
      'technical': 'Technical Reports',
      'administrative': 'Administrative Forms',
      'all': 'All Categories'
    };
    return categoryLabels[category as keyof typeof categoryLabels] || category;
  }

  getTemplateUsageInfo(template: Template): string {
    // Usage count not available in current Template interface
    return 'Usage tracking not available';
  }

  getTemplateStatusIcon(template: Template): string {
    if (template.isUniversal) return 'public';
    return 'description';
  }

  getTemplateStatusColor(template: Template): string {
    if (template.isUniversal) return 'accent';
    return 'primary';
  }

  isTemplateCompatible(template: Template, formType: TemplateType): boolean {
    return template.formType === formType || template.isUniversal;
  }

  // Notification methods
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
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
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}
