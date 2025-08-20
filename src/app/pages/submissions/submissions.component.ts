import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { FormSubmissionService, FormSubmission } from '../../services/form-submission.service';
import { Template, TemplateType, TemplateGenerationRequest } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { SearchComponent, SearchConfig } from '../../sharedComponents/search/search.component';

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    SearchComponent
  ],
  template: `
    <div class="submissions-container">
      <div class="header">
        <h1>RFQ Submissions</h1>
        <div class="header-actions">
          <app-search
            [config]="searchConfig"
            (searchChange)="onSearchChange($event)"
            (searchClear)="onSearchClear()">
          </app-search>
          <button mat-raised-button color="primary" (click)="createNewRFQ()">
            <mat-icon>add</mat-icon>
            New RFQ
          </button>
        </div>
      </div>

      <div class="search-results" *ngIf="isSearching && searchTerm">
        <p class="search-info">
          <mat-icon>search</mat-icon>
          Found {{ filteredSubmissions.length }} result(s) for "{{ searchTerm }}"
        </p>
      </div>

      <div class="submissions-grid" *ngIf="displayedSubmissions.length > 0; else noSubmissions">
        <mat-card *ngFor="let submission of displayedSubmissions" class="submission-card">
          <mat-card-header>
            <mat-card-title>{{ submission.formTitle }}</mat-card-title>
            <mat-card-subtitle>
              ID: {{ submission.submissionId }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="submission-details">
              <p><strong>Client:</strong> {{ submission.formData?.clientName || 'N/A' }}</p>
              <p><strong>Address:</strong> {{ submission.formData?.standNum || 'N/A' }}</p>
              <p><strong>Status:</strong>
                <mat-chip [color]="getStatusColor(submission.status)">
                  {{ submission.status }}
                </mat-chip>
              </p>
              <p><strong>Created:</strong> {{ submission.createdAt | date:'short' }}</p>
              <p *ngIf="submission.isRepeatedSubmission">
                <mat-icon class="repeat-icon">refresh</mat-icon>
                <em>Repeated from {{ submission.originalSubmissionId }}</em>
              </p>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button
                    matTooltip="View Details"
                    (click)="viewSubmission(submission.submissionId)">
              <mat-icon>visibility</mat-icon>
              View
            </button>

            <button mat-button
                    color="primary"
                    matTooltip="Generate PDF"
                    [matMenuTriggerFor]="pdfMenu"
                    [disabled]="!hasTemplatesForForm(submission.formType)">
              <mat-icon>picture_as_pdf</mat-icon>
              PDF
            </button>

            <button mat-button
                    color="accent"
                    matTooltip="Repeat RFQ"
                    (click)="repeatSubmission(submission.submissionId)">
              <mat-icon>refresh</mat-icon>
              Repeat
            </button>

            <button mat-button
                    color="warn"
                    matTooltip="Delete Submission"
                    (click)="deleteSubmission(submission.submissionId)">
              <mat-icon>delete</mat-icon>
              Delete
            </button>

            <!-- PDF Template Menu -->
            <mat-menu #pdfMenu="matMenu">
              <ng-container *ngFor="let template of getTemplatesForSubmission(submission)">
                <button mat-menu-item (click)="generatePdfFromTemplate(submission, template)">
                  <mat-icon>{{ getTemplateIcon(template.type) }}</mat-icon>
                  <span>{{ template.name }}</span>
                  <mat-chip *ngIf="template.isUniversal" class="universal-chip">Universal</mat-chip>
                </button>
              </ng-container>
              <mat-divider *ngIf="getTemplatesForSubmission(submission).length > 0"></mat-divider>
              <button mat-menu-item (click)="navigateToTemplates(submission.formType)">
                <mat-icon>add</mat-icon>
                <span>Manage Templates</span>
              </button>
            </mat-menu>
          </mat-card-actions>
        </mat-card>
      </div>

      <ng-template #noSubmissions>
        <div class="no-submissions">
          <mat-icon>description</mat-icon>
          <h3>{{ isSearching ? 'No results found' : 'No submissions found' }}</h3>
          <p *ngIf="!isSearching">Start by creating your first RFQ submission.</p>
          <p *ngIf="isSearching">Try adjusting your search terms or clear the search to see all submissions.</p>
          <button mat-raised-button color="primary" (click)="createNewRFQ()">
            Create {{ isSearching ? 'New' : 'First' }} RFQ
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .submissions-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      gap: 24px;
    }

    .header h1 {
      color: #1976d2;
      margin: 0;
      flex-shrink: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: flex-end;
    }

    .search-results {
      margin-bottom: 24px;
    }

    .search-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .search-info mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .submissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .submission-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .submission-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.12);
    }

    .submission-details p {
      margin: 8px 0;
      font-size: 14px;
    }

    .repeat-icon {
      font-size: 16px;
      vertical-align: middle;
      margin-right: 4px;
      color: #2196f3;
    }

    .no-submissions {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }

    .no-submissions mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .no-submissions h3 {
      margin: 16px 0;
      color: #333;
    }

    .universal-chip {
      background-color: #fff3e0 !important;
      color: #f57c00 !important;
      font-size: 10px !important;
      height: 18px !important;
      margin-left: 8px !important;
    }

    mat-menu .mat-menu-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    @media (max-width: 768px) {
      .submissions-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .header-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .submissions-grid {
        grid-template-columns: 1fr;
      }

      .submission-card mat-card-actions {
        justify-content: space-around;
      }
    }
  `]
})
export class SubmissionsComponent implements OnInit {
  submissions: FormSubmission[] = [];
  filteredSubmissions: FormSubmission[] = [];
  displayedSubmissions: FormSubmission[] = [];
  searchTerm: string = '';
  isSearching: boolean = false;

  // Search configuration
  searchConfig: SearchConfig = {
    placeholder: 'Search by ID, client name, status...',
    debounceTime: 300,
    minLength: 1,
    showClearButton: true
  };

  constructor(
    private formSubmissionService: FormSubmissionService,
    private templateService: TemplateManagementService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadSubmissions();
  }

  loadSubmissions() {
    this.formSubmissionService.getAllSubmissions().subscribe({
      next: (submissions) => {
        this.submissions = submissions.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.updateDisplayedSubmissions();
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
      }
    });
  }

  // Search functionality
  onSearchChange(searchTerm: string) {
    this.searchTerm = searchTerm;
    this.isSearching = searchTerm.length > 0;
    this.performSearch();
  }

  onSearchClear() {
    this.searchTerm = '';
    this.isSearching = false;
    this.updateDisplayedSubmissions();
  }

  private performSearch() {
    if (!this.searchTerm) {
      this.filteredSubmissions = [];
      this.updateDisplayedSubmissions();
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();

    this.filteredSubmissions = this.submissions.filter(submission => {
      // Search in submission ID
      if (submission.submissionId.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in client name
      if (submission.formData?.clientName?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in status
      if (submission.status.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in form title
      if (submission.formTitle.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in form type
      if (submission.formType.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in rep name if available
      if (submission.formData?.repName?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in stand number/address
      if (submission.formData?.standNum?.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });

    this.updateDisplayedSubmissions();
  }

  private updateDisplayedSubmissions() {
    this.displayedSubmissions = this.isSearching ? this.filteredSubmissions : this.submissions;
  }

  createNewRFQ() {
    this.router.navigate(['/rfq']);
  }

  viewSubmission(submissionId: string) {
    // For now, just log the submission details
    this.formSubmissionService.getSubmission(submissionId).subscribe(submission => {
      if (submission) {
        console.log('Submission details:', submission);
        alert('Submission details logged to console');
      }
    });
  }

  repeatSubmission(submissionId: string) {
    this.router.navigate(['/rfq'], {
      queryParams: {
        repeat: true,
        submissionId: submissionId
      }
    });
  }

  deleteSubmission(submissionId: string) {
    if (confirm('Are you sure you want to delete this submission?')) {
      this.formSubmissionService.deleteSubmission(submissionId).subscribe({
        next: () => {
          this.loadSubmissions(); // Reload and update search results
        },
        error: (error) => {
          console.error('Error deleting submission:', error);
        }
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'accent';
      case 'submitted': return 'primary';
      case 'completed': return 'primary';
      default: return '';
    }
  }

  // PDF Template Methods
  hasTemplatesForForm(formType: string): boolean {
    // For now, we'll return true and handle the actual check in the template
    // In a real implementation, you might want to cache templates or use a synchronous check
    return true;
  }

  getTemplatesForSubmission(submission: FormSubmission): Template[] {
    // This should be updated to return an Observable or use async pipe in template
    // For now, returning empty array - should be refactored to use observables
    return [];
  }

  generatePdfFromTemplate(submission: FormSubmission, template: Template) {
    const formType = submission.formType || 'rfq';

    // Enhance form data with submission metadata
    const enhancedFormData = {
      ...submission.formData,
      submissionId: submission.submissionId,
      formTitle: submission.formTitle,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      formType: formType
    };

    const request = {
      templateId: template.id,
      formData: enhancedFormData,
      formType: formType
    };

    this.templateService.generatePdf(request).subscribe({
      next: () => {
        this.snackBar.open(
          `PDF generated successfully using "${template.name}"!`,
          'Close',
          {
            duration: 4000,
            panelClass: ['success-snackbar']
          }
        );
      },
      error: (error) => {
        this.snackBar.open(
          'Error generating PDF: ' + error.message,
          'Close',
          {
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );
      }
    });
  }

  navigateToTemplates(formType: string) {
    this.router.navigate(['/templates', formType || 'rfq']);
  }

  getTemplateIcon(type: string): string {
    switch (type) {
      case 'word': return 'description';
      case 'google-docs': return 'article';
      case 'odt': return 'text_snippet';
      default: return 'insert_drive_file';
    }
  }
}
