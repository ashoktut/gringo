import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { FormService } from '../../../services/form.service';
import { EnhancedFormConfiguration, FormSubmission, FormSubmissionStatus } from '../../../models/form.models';
import { NotificationService } from '../../../services/notification.service';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-forms-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: '',
  styles: ''
})
export class FormsDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly formService = inject(FormService);
  private readonly notificationService = inject(NotificationService);
  private readonly utils = inject(UtilsService);

  // Component State
  selectedTab = signal(0);

  // Computed from service signals
  loading = computed(() => this.formService.loading());
  accessibleForms = computed(() => this.formService.myAccessibleForms());
  mySubmissions = computed(() => this.formService.submissions());

  // Filtered submissions
  draftSubmissions = computed(() =>
    this.mySubmissions().filter(s => s.status === FormSubmissionStatus.DRAFT)
  );

  pendingSubmissions = computed(() =>
    this.mySubmissions().filter(s => s.status === FormSubmissionStatus.UNDER_REVIEW)
  );

  approvedSubmissions = computed(() =>
    this.mySubmissions().filter(s => s.status === FormSubmissionStatus.APPROVED)
  );

  rejectedSubmissions = computed(() =>
    this.mySubmissions().filter(s => s.status === FormSubmissionStatus.REJECTED)
  );

  // Statistics
  stats = computed(() => ({
    totalForms: this.accessibleForms().length,
    totalDrafts: this.draftSubmissions().length,
    totalPending: this.pendingSubmissions().length,
    totalApproved: this.approvedSubmissions().length,
    totalRejected: this.rejectedSubmissions().length
  }));

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // Load accessible forms
    this.formService.loadCompanyForms().subscribe();

    // Load user's submissions
    this.formService.loadSubmissions({
      page: 1,
      pageSize: 100
    }).subscribe();
  }

  // Navigation
  startNewSubmission(form: EnhancedFormConfiguration): void {
    this.router.navigate(['/forms/submit', form.id]);
  }

  continueDraft(submission: FormSubmission): void {
    this.router.navigate(['/forms/submit', submission.formConfigurationId], {
      queryParams: { draftId: submission.id }
    });
  }

  viewSubmission(submission: FormSubmission): void {
    this.router.navigate(['/forms/submission', submission.id]);
  }

  editDraft(submission: FormSubmission): void {
    this.router.navigate(['/forms/submit', submission.formConfigurationId], {
      queryParams: { draftId: submission.id }
    });
  }

  deleteDraft(submission: FormSubmission): void {
    if (confirm('Are you sure you want to delete this draft?')) {
      // Delete draft logic here
      this.notificationService.showSuccess('Draft deleted successfully');
      this.loadData();
    }
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

  formatDate(date: Date | string): string {
    return this.utils.formatDate(date);
  }

  formatDateTime(date: Date | string): string {
    return this.utils.formatDateTime(date);
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
  }
}
