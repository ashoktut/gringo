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
               'Manage and organize PDF templates for all form types' }}
          </p>
        </div>
        
        <!-- Quick Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-number">{{ availableFormTypes.length }}</div>
            <div class="stat-label">Form Types</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ allTemplates.length }}</div>
            <div class="stat-label">Total Templates</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ filteredTemplates.length }}</div>
            <div class="stat-label">{{ currentFormType ? currentFormType.toUpperCase() + ' Templates' : 'Filtered' }}</div>
          </div>
        </div>
      </div>

      <!-- Template Upload Section -->
      <mat-card class="upload-section">
        <mat-card-header>
          <mat-card-title>Upload New Template</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <app-document-template
            [formType]="currentFormType"
            (templateUploaded)="onTemplateUploaded($event)"
            (uploadError)="onUploadError($event)">
          </app-document-template>
        </mat-card-content>
      </mat-card>

      <!-- Templates Section -->
      <mat-card class="templates-section">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>folder_open</mat-icon>
            Available Templates
            <span class="template-count">
              {{ currentFormType ? 'for ' + currentFormType.toUpperCase() : 'across all form types' }}
            </span>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group *ngIf="!currentFormType"
                        class="form-type-tabs"
                        animationDuration="300ms"
                        [(selectedIndex)]="selectedTabIndex"
                        (selectedTabChange)="onTabChange($event)">

            <!-- All Templates Tab -->
            <mat-tab label="ALL TEMPLATES">
              <div class="templates-grid" *ngIf="allTemplates.length > 0; else noTemplatesAll">
                <div *ngFor="let template of allTemplates" class="template-card">
                  <div class="template-content">
                    <div class="template-header">
                      <mat-icon class="template-icon">{{ getTemplateIcon(template.type) }}</mat-icon>
                      <h3>{{ template.name }}</h3>
                      <mat-chip class="form-type-chip">{{ template.formType.toUpperCase() }}</mat-chip>
                    </div>
                    <!-- Template actions would go here -->
                  </div>
                </div>
              </div>
              
              <ng-template #noTemplatesAll>
                <div class="no-templates">
                  <mat-icon>description</mat-icon>
                  <h3>No Templates Available</h3>
                  <p>Upload your first template using the upload section above.</p>
                </div>
              </ng-template>
            </mat-tab>

            <!-- Individual Form Type Tabs -->
            <mat-tab *ngFor="let formType of availableFormTypes"
                     [label]="formType.toUpperCase()">
              <div class="form-type-content">
                <div class="templates-grid" *ngIf="getTemplatesForFormType(formType).length > 0; else noTemplatesForm">
                  <div *ngFor="let template of getTemplatesForFormType(formType)" class="template-card">
                    <!-- Template card content would go here -->
                  </div>
                </div>
                
                <ng-template #noTemplatesForm>
                  <div class="no-templates">
                    <mat-icon>note_add</mat-icon>
                    <h3>No {{ formType.toUpperCase() }} Templates</h3>
                    <p>Upload a template specifically for {{ formType }} forms.</p>
                  </div>
                </ng-template>
              </div>
            </mat-tab>

          </mat-tab-group>

          <!-- Single Form Type View -->
          <div *ngIf="currentFormType" class="single-form-view">
            <div class="templates-grid" *ngIf="filteredTemplates.length > 0; else noTemplatesSingle">
              <div *ngFor="let template of filteredTemplates" class="template-card">
                <!-- Template card content would go here -->
              </div>
            </div>
            
            <ng-template #noTemplatesSingle>
              <div class="no-templates">
                <mat-icon>note_add</mat-icon>
                <h3>No {{ currentFormType.toUpperCase() }} Templates</h3>
                <p>Upload a template for {{ currentFormType }} forms using the upload section above.</p>
              </div>
            </ng-template>
          </div>

        </mat-card-content>
      </mat-card>

      <!-- Quick Actions -->
      <mat-card class="quick-actions" *ngIf="availableFormTypes.length > 0">
        <mat-card-header>
          <mat-card-title>Quick Actions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="actions-grid">
            <button mat-raised-button color="primary"
                    *ngFor="let formType of availableFormTypes"
                    [routerLink]="['/templates', formType]">
              <mat-icon>{{ getFormTypeIcon(formType) }}</mat-icon>
              {{ formType.toUpperCase() }} Templates
              <mat-chip class="count-chip">{{ getTemplatesForFormType(formType).length }}</mat-chip>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .templates-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .subtitle {
      color: #666;
      margin: 0;
      font-size: 16px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .stat-card {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .upload-section,
    .templates-section,
    .quick-actions {
      margin-bottom: 24px;
    }

    .template-count {
      font-size: 0.875rem;
      color: #666;
      font-weight: normal;
    }

    .form-type-tabs {
      margin-top: 16px;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .template-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.3s ease;
    }

    .template-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .template-content {
      padding: 16px;
    }

    .template-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .template-header h3 {
      margin: 0;
      flex: 1;
      font-size: 1.1rem;
    }

    .template-icon {
      color: #1976d2;
    }

    .form-type-chip {
      font-size: 0.75rem;
    }

    .no-templates {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .no-templates mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-templates h3 {
      margin: 0 0 8px 0;
      color: #999;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .count-chip {
      margin-left: 8px;
      font-size: 0.75rem;
    }

    @media (max-width: 768px) {
      .templates-container {
        padding: 16px;
      }

      .stats-row {
        grid-template-columns: 1fr;
      }

      .templates-grid {
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

  constructor(
    private templateService: TemplateManagementService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Get form type from route parameters
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const formType = params.get('formType');
      this.currentFormType = this.isValidTemplateType(formType) ? formType as TemplateType : '';
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
        this.availableFormTypes = formTypes;
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
    return this.allTemplates.filter(template => template.formType === formType);
  }

  onTemplateUploaded(template: Template) {
    this.loadTemplates();
    this.showSuccess('Template uploaded successfully!');
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
          projectTitle: 'Sample RFQ Project',
          clientName: 'ABC Corporation',
          description: 'Sample project description for testing',
          requirements: 'Technical requirements and specifications',
          budget: '50000',
          deadline: '2024-12-31'
        };
      case 'rqr':
        return {
          ...baseData,
          requestTitle: 'Sample Request',
          requesterName: 'John Doe',
          department: 'IT Department',
          description: 'Sample request description',
          priority: 'High',
          requestedBy: new Date().toISOString().split('T')[0]
        };
      case 'invoice':
        return {
          ...baseData,
          invoiceNumber: 'INV-2024-001',
          clientName: 'XYZ Company',
          amount: '15000',
          description: 'Professional services rendered',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      case 'quote':
        return {
          ...baseData,
          quoteNumber: 'QUO-2024-001',
          clientName: 'DEF Industries',
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

  private isValidTemplateType(value: string | null): boolean {
    if (!value) return false;
    const validTypes: TemplateType[] = ['rfq', 'rqr', 'invoice', 'quote', 'report'];
    return validTypes.includes(value as TemplateType);
  }
}

