import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subject, takeUntil } from 'rxjs';
import { Template, TemplateType, PdfGenerationOptions } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { DocumentTemplateComponent } from '../../sharedComponents/document-template/document-template.component';

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
    DocumentTemplateComponent
  ],
  template: `
    <div class="templates-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <mat-icon>description</mat-icon>
            PDF Template Manager
          </h1>
          <p class="subtitle">
            {{ currentFormType ?
            'Managing templates for ' + currentFormType.toUpperCase() + ' forms' :
            'Upload and manage document templates for all form types' }}
          </p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-number">{{ totalTemplates }}</div>
            <div class="stat-label">Total Templates</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ availableFormTypes.length }}</div>
            <div class="stat-label">Form Types</div>
          </div>
        </div>
      </div>

      <!-- Upload Section -->
      <mat-card class="upload-section">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>cloud_upload</mat-icon>
            Upload New Template
          </mat-card-title>
          <mat-card-subtitle>
            Create templates using Word documents or Google Docs with dynamic placeholders
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <app-document-template
            [formType]="currentFormType"
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
              {{ filteredTemplates.length }} template(s)
              {{ currentFormType ? 'for ' + currentFormType.toUpperCase() : 'across all form types' }}
            </mat-card-subtitle>
          </mat-card-header>

          <!-- Form Type Tabs -->
          @if (!currentFormType) {
            <mat-tab-group
              [(selectedIndex)]="selectedTabIndex"
              (selectedTabChange)="onTabChange($event)">
              <mat-tab label="All Templates">
                <div class="tab-content">
                  @if (allTemplates.length > 0) {
                    <div class="templates-grid">
                      @for (template of allTemplates; track template) {
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
              @for (formType of availableFormTypes; track formType) {
                <mat-tab
                  [label]="formType.toUpperCase()">
                  <div class="tab-content">
                    @if (getTemplatesForFormType(formType).length > 0) {
                      <div class="templates-grid">
                        @for (template of getTemplatesForFormType(formType); track template) {
                          <div class="template-card">
                            <ng-container *ngTemplateOutlet="templateCardTemplate; context: { template: template }"></ng-container>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-state">
                        <mat-icon>description</mat-icon>
                        <h3>No {{ formType.toUpperCase() }} Templates</h3>
                        <p>Upload a template specifically for {{ formType }} forms.</p>
                      </div>
                    }
                  </div>
                </mat-tab>
              }
            </mat-tab-group>
          }

          <!-- Single Form Type View -->
          @if (currentFormType) {
            <div class="single-form-view">
              @if (filteredTemplates.length > 0) {
                <div class="templates-grid">
                  @for (template of filteredTemplates; track template) {
                    <div class="template-card">
                      <ng-container *ngTemplateOutlet="templateCardTemplate; context: { template: template }"></ng-container>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>description</mat-icon>
                  <h3>No {{ currentFormType.toUpperCase() }} Templates</h3>
                  <p>Upload a template for {{ currentFormType }} forms using the upload section above.</p>
                </div>
              }
            </div>
          }
        </mat-card>
      </div>

      <!-- Quick Actions -->
      @if (availableFormTypes.length > 0) {
        <mat-card class="quick-actions">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>flash_on</mat-icon>
              Quick Actions
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              @for (formType of availableFormTypes; track formType) {
                <button mat-flat-button
                  color="primary"
                  [routerLink]="['/templates', formType]"
                  class="form-type-button">
                  <mat-icon>{{ getFormTypeIcon(formType) }}</mat-icon>
                  {{ formType.toUpperCase() }} Templates
                  <mat-chip class="count-chip">{{ getTemplatesForFormType(formType).length }}</mat-chip>
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
      background: linear-gradient(135deg, var(--azure-primary), var(--azure-accent));
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
      border-radius: 12px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0.25px;
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    }

    .form-type-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
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

  currentFormType: TemplateType | '' = '';
  allTemplates: Template[] = [];
  filteredTemplates: Template[] = [];
  availableFormTypes: TemplateType[] = [];
  selectedTabIndex: number = 0;

  get totalTemplates(): number {
    return this.allTemplates.length;
  }

  constructor(
    private templateService: TemplateManagementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if we have a specific form type from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const formTypeParam = params.get('formType');
      this.currentFormType = (formTypeParam && ['rfq', 'rqr', 'invoice', 'quote', 'report'].includes(formTypeParam))
        ? formTypeParam as TemplateType
        : '';
      this.loadTemplates();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates() {
    // Load all templates
    this.templateService.getAllTemplates().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (templates) => {
        this.allTemplates = templates;
        this.updateFilteredTemplates();
      },
      error: (error) => {
        this.showError('Failed to load templates: ' + error.message);
      }
    });

    // Load available form types
    this.templateService.getAvailableFormTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (formTypes) => {
        this.availableFormTypes = formTypes as TemplateType[];
      },
      error: (error) => {
        console.error('Failed to load form types:', error);
      }
    });
  }

  private updateFilteredTemplates() {
    if (this.currentFormType) {
      this.templateService.getTemplatesForForm(this.currentFormType).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (templates) => {
          this.filteredTemplates = templates;
        },
        error: (error) => {
          this.showError('Failed to filter templates: ' + error.message);
        }
      });
    } else {
      this.filteredTemplates = this.allTemplates;
    }
  }

  getTemplatesForFormType(formType: TemplateType): Template[] {
    return this.allTemplates.filter(template =>
      template.formType === formType || template.isUniversal
    );
  }

  onTemplateUploaded(template: Template) {
    this.showSuccess('Template uploaded successfully!');
    this.loadTemplates();
  }

  onUploadError(error: string) {
    this.showError(error);
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
        error: (error) => {
          this.showError('Failed to delete template: ' + error.message);
        }
      });
    }
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  getTemplateIcon(type: string): string {
    switch (type) {
      case 'word': return 'description';
      case 'google-docs': return 'article';
      case 'odt': return 'text_snippet';
      default: return 'insert_drive_file';
    }
  }

  getFormTypeIcon(formType: TemplateType): string {
    switch (formType) {
      case 'rfq': return 'request_quote';
      case 'rqr': return 'assignment';
      case 'invoice': return 'receipt';
      case 'quote': return 'monetization_on';
      case 'report': return 'assessment';
      default: return 'description';
    }
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

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
