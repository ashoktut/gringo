import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormSubmissionService, FormSubmission } from '../../services/form-submission.service';
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
    private router: Router
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
}
