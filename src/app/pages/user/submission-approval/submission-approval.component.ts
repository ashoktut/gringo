import { Component, OnInit, inject, signal, computed, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';

import { FormSubmission, FormSubmissionStatus } from '../../../models/form.models';
import { FormService } from '../../../services/form.service';
import { NotificationService } from '../../../services/notification.service';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-submission-approval',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule
  ],
  template: '',
  styles: ''
})
export class SubmissionApprovalComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly formService = inject(FormService);
  private readonly notificationService = inject(NotificationService);
  private readonly utils = inject(UtilsService);

  // Component State
  displayedColumns = ['submittedBy', 'formName', 'submittedAt', 'status', 'actions'];
  selectedSubmission = signal<FormSubmission | null>(null);
  filterStatus = signal<FormSubmissionStatus | 'all'>('all');
  pageIndex = signal(0);
  pageSize = signal(10);
  sortField = signal<string>('submittedAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Computed
  loading = computed(() => this.formService.loading());
  allSubmissions = computed(() => this.formService.pendingApprovals());

  filteredSubmissions = computed(() => {
    const submissions = this.allSubmissions();
    const status = this.filterStatus();

    if (status === 'all') {
      return submissions;
    }

    return submissions.filter(s => s.status === status);
  });

  paginatedSubmissions = computed(() => {
    const filtered = this.filteredSubmissions();
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  totalCount = computed(() => this.filteredSubmissions().length);

  ngOnInit(): void {
    this.loadSubmissions();
  }

  private loadSubmissions(): void {
    this.formService.loadSubmissions({
      page: 1,
      pageSize: 100,
      status: FormSubmissionStatus.UNDER_REVIEW
    }).subscribe();
  }

  onFilterChange(status: FormSubmissionStatus | 'all'): void {
    this.filterStatus.set(status);
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onSortChange(sort: Sort): void {
    this.sortField.set(sort.active);
    this.sortDirection.set(sort.direction as 'asc' | 'desc');
  }

  viewSubmission(submission: FormSubmission): void {
    this.selectedSubmission.set(submission);
  }

  closeDetail(): void {
    this.selectedSubmission.set(null);
  }

  approveSubmission(submission: FormSubmission): void {
    const dialogRef = this.dialog.open(ApprovalActionDialogComponent, {
      width: '500px',
      data: {
        submission,
        action: 'approve'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.formService.approveSubmission({
          submissionId: submission.id,
          comments: result.comments
        }).subscribe({
          next: () => {
            this.notificationService.showSuccess('Submission approved successfully');
            this.loadSubmissions();
            this.closeDetail();
          },
          error: () => {
            this.notificationService.showError('Failed to approve submission');
          }
        });
      }
    });
  }

  rejectSubmission(submission: FormSubmission): void {
    const dialogRef = this.dialog.open(ApprovalActionDialogComponent, {
      width: '500px',
      data: {
        submission,
        action: 'reject'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.formService.rejectSubmission({
          submissionId: submission.id,
          comments: result.comments
        }).subscribe({
          next: () => {
            this.notificationService.showSuccess('Submission rejected successfully');
            this.loadSubmissions();
            this.closeDetail();
          },
          error: () => {
            this.notificationService.showError('Failed to reject submission');
          }
        });
      }
    });
  }

  downloadPdf(submission: FormSubmission): void {
    if (submission.id) {
      this.formService.downloadSubmissionPdf(submission.id);
    }
  }

  // Helper methods - now using UtilsService
  getStatusColor(status: FormSubmissionStatus): string {
    return this.utils.getStatusColor(status);
  }

  getStatusIcon(status: FormSubmissionStatus): string {
    return this.utils.getStatusIcon(status);
  }

  formatDate(date: Date): string {
    return this.utils.formatDateTime(date);
  }
}

// Approval Action Dialog Component
@Component({
  selector: 'app-approval-action-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.action === 'approve' ? 'check_circle' : 'cancel' }}</mat-icon>
      {{ data.action === 'approve' ? 'Approve' : 'Reject' }} Submission
    </h2>

    <mat-dialog-content>
      <p class="submission-info">
        <strong>Form:</strong> {{ data.submission.formName }}<br>
        <strong>Submitted by:</strong> {{ data.submission.submittedBy }}<br>
        <strong>Date:</strong> {{ formatDate(data.submission.submittedAt) }}
      </p>

      <form [formGroup]="actionForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Comments {{ data.action === 'reject' ? '(Required)' : '(Optional)' }}</mat-label>
          <textarea
            matInput
            formControlName="comments"
            rows="4"
            placeholder="Add comments..."></textarea>
          @if (actionForm.get('comments')?.hasError('required')) {
            <mat-error>Comments are required for rejection</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        [color]="data.action === 'approve' ? 'primary' : 'warn'"
        [disabled]="actionForm.invalid"
        (click)="submit()">
        <mat-icon>{{ data.action === 'approve' ? 'check' : 'close' }}</mat-icon>
        {{ data.action === 'approve' ? 'Approve' : 'Reject' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .submission-info {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 16px;
      line-height: 1.8;
    }

    .full-width {
      width: 100%;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h2 mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
  `]
})
export class ApprovalActionDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ApprovalActionDialogComponent>);

  data: any = inject(MAT_DIALOG_DATA);
  actionForm!: FormGroup;

  ngOnInit(): void {
    const requireComments = this.data.action === 'reject';

    this.actionForm = this.fb.group({
      comments: [
        '',
        requireComments ? [Validators.required, Validators.minLength(10)] : []
      ]
    });
  }

  submit(): void {
    if (this.actionForm.valid) {
      this.dialogRef.close(this.actionForm.value);
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
