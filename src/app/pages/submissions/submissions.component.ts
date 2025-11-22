import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormSubmissionHybridService, FormSubmission } from '../../services/form-submission-hybrid.service';
import { SupabaseSyncService, SyncStatus } from '../../services/supabase-sync.service';
import { Template, TemplateType, TemplateGenerationRequest } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { Observable } from 'rxjs';
import { PdfGenerationService } from '../../services/pdf-generation.service';
import { SearchComponent, SearchConfig } from '../../sharedComponents/search/search.component';

// Form type configuration interface
interface FormTypeConfig {
  type: string;
  label: string;
  icon: string;
  color: string;
  route: string;
  columns: string[];
  actions: FormTypeAction[];
}

interface FormTypeAction {
  icon: string;
  label: string;
  color?: string;
  action: string;
  tooltip: string;
  condition?: (submission: FormSubmission) => boolean;
}

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
    MatTabsModule,
    MatBadgeModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    SearchComponent
  ],
  template: `
    <div class="submissions-container">
      <!-- Header -->
      <div class="header">
        <div class="header-info">
          <h1>
            <mat-icon class="page-icon">assignment</mat-icon>
            Form Submissions
          </h1>
          <p class="header-description">
            Manage and view all form submissions across different types
          </p>
        </div>

        <div class="header-actions">
          <!-- Sync Status Indicator -->
          @if (syncStatus$ | async; as status) {
            <div class="sync-status"
                 [class.syncing]="status.isSyncing"
                 [class.pending]="status.pendingChanges > 0"
                 [class.synced]="!status.isSyncing && status.pendingChanges === 0">
              @if (status.isSyncing) {
                <mat-icon class="sync-icon spinning">sync</mat-icon>
                <span>Syncing...</span>
              } @else if (status.pendingChanges > 0) {
                <mat-icon class="sync-icon" color="warn">cloud_queue</mat-icon>
                <span>{{ status.pendingChanges }} pending</span>
              } @else {
                <mat-icon class="sync-icon" color="primary">cloud_done</mat-icon>
                <span>Synced</span>
              }
              @if (status.lastSync) {
                <small>{{ status.lastSync | date:'short' }}</small>
              }
            </div>
          }

          <app-search
            [config]="searchConfig"
            (searchChange)="onSearchChange($event)"
            (searchClear)="onSearchClear()">
          </app-search>

          <button mat-raised-button
                  color="primary"
                  [matMenuTriggerFor]="createMenu">
            <mat-icon>add</mat-icon>
            Create New
          </button>

          <mat-menu #createMenu="matMenu">
            @for (config of formTypeConfigs; track config.type) {
              <button mat-menu-item (click)="createNewForm(config.type)">
                <mat-icon [style.color]="'var(--mat-' + config.color + '-500)'">
                  {{ config.icon }}
                </mat-icon>
                <span>New {{ config.label.slice(0, -1) }}</span>
              </button>
            }
          </mat-menu>
        </div>
      </div>

      <!-- Form Type Tabs -->
      <mat-tab-group
        [selectedIndex]="selectedTabIndex()"
        (selectedIndexChange)="onFormTypeChange($event === 0 ? 'all' : formTypeConfigs[$event - 1].type || 'all')"
        class="form-type-tabs">

        <!-- All Submissions Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
              <mat-icon>apps</mat-icon>
              <span>All</span>
              <mat-chip class="tab-badge">{{ formTypeCounts()['all'] }}</mat-chip>
            </div>
          </ng-template>
        </mat-tab>

        <!-- Individual Form Type Tabs -->
        @for (config of formTypeConfigs; track config.type) {
          <mat-tab>
            <ng-template mat-tab-label>
              <div class="tab-label">
                <mat-icon [style.color]="'var(--mat-' + config.color + '-500)'">
                  {{ config.icon }}
                </mat-icon>
                <span>{{ config.label }}</span>
                @if (formTypeCounts()[config.type] > 0) {
                  <mat-chip class="tab-badge" [color]="config.color">
                    {{ formTypeCounts()[config.type] }}
                  </mat-chip>
                }
              </div>
            </ng-template>
          </mat-tab>
        }
      </mat-tab-group>

      <!-- Search Results Info -->
      @if (isSearching() && searchTerm()) {
        <div class="search-results">
          <p class="search-info">
            <mat-icon>search</mat-icon>
            Found {{ displayedSubmissions().length }} result(s) for "{{ searchTerm() }}"
            @if (selectedFormType() !== 'all') {
              in {{ getFormTypeLabel(selectedFormType()) }}
            }
          </p>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <mat-card class="loading-card">
            <mat-card-content>
              <div class="loading-content">
                <mat-progress-spinner diameter="40" mode="indeterminate"></mat-progress-spinner>
                <h3>Loading Submissions</h3>
                <p>Please wait while we fetch your form submissions...</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Submissions Grid -->
      @if (!isLoading() && displayedSubmissions().length > 0) {
        <div class="submissions-grid">
          @for (submission of displayedSubmissions(); track submission.submissionId) {
            <mat-card class="submission-card" [attr.data-form-type]="submission.formType">
              <mat-card-header>
                <div mat-card-avatar class="form-type-avatar">
                  <mat-icon>{{ getFormTypeIcon(submission.formType) }}</mat-icon>
                </div>
                <mat-card-title class="card-title">
                  {{ submission.formTitle }}
                  @if (submission.isRepeatedSubmission) {
                    <mat-chip class="repeat-chip" color="accent">
                      <mat-icon matChipAvatar>refresh</mat-icon>
                      Repeat
                    </mat-chip>
                  }
                </mat-card-title>
                <mat-card-subtitle>
                  <div class="submission-meta">
                    <span class="submission-id">{{ submission.submissionId }}</span>
                    <mat-chip class="form-type-chip"
                             [color]="currentFormTypeConfig()?.color || 'primary'">
                      {{ getFormTypeLabel(submission.formType) }}
                    </mat-chip>
                  </div>
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="submission-details">
                  @if (currentFormTypeConfig()) {
                    @for (column of currentFormTypeConfig()!.columns; track column) {
                      <div class="detail-row">
                        <strong>{{ getColumnLabel(column) }}:</strong>
                        <span>{{ getDisplayValue(submission, column) }}</span>
                      </div>
                    }
                  } @else {
                    <!-- Fallback for 'all' view -->
                    <div class="detail-row">
                      <strong>Client:</strong>
                      <span>{{ submission.formData?.clientName || 'N/A' }}</span>
                    </div>
                    <div class="detail-row">
                      <strong>Status:</strong>
                      <mat-chip [color]="getStatusColor(submission.status)">
                        {{ submission.status }}
                      </mat-chip>
                    </div>
                  }

                  <div class="detail-row">
                    <strong>Created:</strong>
                    <span>{{ submission.createdAt | date:'short' }}</span>
                  </div>

                  @if (submission.isRepeatedSubmission && submission.originalSubmissionId) {
                    <div class="detail-row repeat-info">
                      <mat-icon class="repeat-icon">refresh</mat-icon>
                      <em>Repeated from {{ submission.originalSubmissionId }}</em>
                    </div>
                  }
                </div>
              </mat-card-content>

              <mat-card-actions>
                @if (currentFormTypeConfig()) {
                  @for (action of currentFormTypeConfig()!.actions; track action.action) {
                    @if (shouldShowAction(submission, action)) {
                      <button mat-button
                              [color]="action.color || ''"
                              [matTooltip]="action.tooltip"
                              (click)="handleAction(submission, action.action)">
                        <mat-icon>{{ action.icon }}</mat-icon>
                        {{ action.label }}
                      </button>
                    }
                  }
                } @else {
                  <!-- Default actions for 'all' view -->
                  <button mat-button
                          matTooltip="View Details"
                          (click)="handleAction(submission, 'view')">
                    <mat-icon>visibility</mat-icon>
                    View
                  </button>
                  <button mat-button
                          color="primary"
                          matTooltip="Generate PDF"
                          (click)="handleAction(submission, 'pdf')">
                    <mat-icon>picture_as_pdf</mat-icon>
                    PDF
                  </button>
                  <button mat-button
                          color="accent"
                          matTooltip="Repeat Submission"
                          (click)="handleAction(submission, 'repeat')">
                    <mat-icon>refresh</mat-icon>
                    Repeat
                  </button>
                  <button mat-button
                          color="warn"
                          matTooltip="Delete Submission"
                          (click)="handleAction(submission, 'delete')">
                    <mat-icon>delete</mat-icon>
                    Delete
                  </button>
                }

                <!-- Template PDF Menu -->
                <button mat-button
                        [matMenuTriggerFor]="pdfMenu"
                        [disabled]="!hasTemplatesForForm(submission.formType)"
                        matTooltip="Generate from Template">
                  <mat-icon>description</mat-icon>
                  Templates
                </button>

                <mat-menu #pdfMenu="matMenu">
                  @for (template of getTemplatesForSubmission(submission); track template) {
                    <button mat-menu-item (click)="generatePdfFromTemplate(submission, template)">
                      <mat-icon>{{ getTemplateIcon(template.type) }}</mat-icon>
                      <span>{{ template.name }}</span>
                      @if (template.isUniversal) {
                        <mat-chip class="universal-chip">Universal</mat-chip>
                      }
                    </button>
                  }
                  @if (getTemplatesForSubmission(submission).length > 0) {
                    <mat-divider></mat-divider>
                  }
                  <button mat-menu-item (click)="navigateToTemplates(submission.formType)">
                    <mat-icon>add</mat-icon>
                    <span>Manage Templates</span>
                  </button>
                </mat-menu>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && displayedSubmissions().length === 0) {
        <div class="empty-state">
          <mat-card class="empty-card">
            <mat-card-content>
              <div class="empty-content">
                @if (isSearching()) {
                  <mat-icon class="empty-icon">search_off</mat-icon>
                  <h3>No Results Found</h3>
                  <p>No submissions match your search criteria.</p>
                  <div class="empty-actions">
                    <button mat-button (click)="onSearchClear()">
                      <mat-icon>clear</mat-icon>
                      Clear Search
                    </button>
                  </div>
                } @else if (selectedFormType() !== 'all') {
                  <mat-icon class="empty-icon">{{ getFormTypeIcon(selectedFormType()) }}</mat-icon>
                  <h3>No {{ getFormTypeLabel(selectedFormType()) }}</h3>
                  <p>You haven't created any {{ getFormTypeLabel(selectedFormType()).toLowerCase() }} yet.</p>
                  <div class="empty-actions">
                    <button mat-raised-button
                            color="primary"
                            (click)="createNewForm(selectedFormType())">
                      <mat-icon>add</mat-icon>
                      Create {{ selectedFormType().toUpperCase() }}
                    </button>
                  </div>
                } @else {
                  <mat-icon class="empty-icon">assignment</mat-icon>
                  <h3>No Submissions Yet</h3>
                  <p>Start by creating your first form submission.</p>
                  <div class="empty-actions">
                    <button mat-raised-button
                            color="primary"
                            [matMenuTriggerFor]="createEmptyMenu">
                      <mat-icon>add</mat-icon>
                      Create First Submission
                    </button>

                    <mat-menu #createEmptyMenu="matMenu">
                      @for (config of formTypeConfigs; track config.type) {
                        <button mat-menu-item (click)="createNewForm(config.type)">
                          <mat-icon [style.color]="'var(--mat-' + config.color + '-500)'">
                            {{ config.icon }}
                          </mat-icon>
                          <span>{{ config.label.slice(0, -1) }}</span>
                        </button>
                      }
                    </mat-menu>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Enhanced Submissions Component Styles */
    .submissions-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: calc(100vh - 120px);
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      gap: 24px;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .header-info {
      flex: 1;
    }

    .header-info h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #1976d2;
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .page-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }

    .header-description {
      color: #666;
      margin: 0;
      font-size: 1rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: flex-end;
    }

    /* Sync Status Indicator */
    .sync-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      font-size: 0.875rem;
      transition: all 0.3s ease;
    }

    .sync-status.syncing {
      background: #e3f2fd;
      border-color: #2196f3;
      color: #1976d2;
    }

    .sync-status.pending {
      background: #fff3e0;
      border-color: #ff9800;
      color: #f57c00;
    }

    .sync-status.synced {
      background: #e8f5e9;
      border-color: #4caf50;
      color: #2e7d32;
    }

    .sync-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }

    .sync-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .sync-status small {
      color: #999;
      font-size: 0.75rem;
      margin-left: 4px;
    }

    /* Form Type Tabs */
    .form-type-tabs {
      margin-bottom: 24px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .form-type-tabs ::ng-deep .mat-mdc-tab-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .form-type-tabs ::ng-deep .mat-mdc-tab-label {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
    }

    .form-type-tabs ::ng-deep .mat-mdc-tab-label.mdc-tab--active {
      color: white;
    }

    .form-type-tabs ::ng-deep .mdc-tab-indicator__content--underline {
      background-color: white;
    }

    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab-badge {
      font-size: 0.7rem;
      height: 20px;
      min-height: 20px;
      line-height: 20px;
    }

    /* Search Results */
    .search-results {
      margin-bottom: 24px;
      background: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
      color: #1976d2;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      justify-content: center;
      margin: 48px 0;
    }

    .loading-card {
      max-width: 400px;
      width: 100%;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-content h3 {
      margin: 0;
      color: #333;
    }

    .loading-content p {
      margin: 0;
      color: #666;
    }

    /* Submissions Grid */
    .submissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 24px;
    }

    .submission-card {
      transition: all 0.3s ease;
      border-radius: 12px;
      overflow: hidden;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .submission-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .submission-card[data-form-type="rfq"] {
      border-left: 4px solid #1976d2;
    }

    .submission-card[data-form-type="quote"] {
      border-left: 4px solid #ff9800;
    }

    .submission-card[data-form-type="invoice"] {
      border-left: 4px solid #f44336;
    }

    .submission-card[data-form-type="estimate"] {
      border-left: 4px solid #4caf50;
    }

    /* Card Header */
    .form-type-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .submission-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .submission-id {
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      padding: 2px 6px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .form-type-chip {
      font-size: 0.7rem;
      height: 20px;
    }

    .repeat-chip {
      font-size: 0.7rem;
      height: 24px;
    }

    /* Card Content */
    .submission-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 0.875rem;
      border-bottom: 1px solid #f5f5f5;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row strong {
      color: #333;
      font-weight: 500;
      flex-shrink: 0;
      margin-right: 12px;
    }

    .detail-row span {
      color: #666;
      text-align: right;
      word-break: break-word;
    }

    .repeat-info {
      color: #2196f3;
      font-style: italic;
    }

    .repeat-info .repeat-icon {
      font-size: 16px;
      vertical-align: middle;
      margin-right: 4px;
    }

    /* Card Actions */
    .submission-card mat-card-actions {
      padding: 12px 16px;
      background: #fafafa;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .submission-card mat-card-actions button {
      font-size: 0.75rem;
      padding: 4px 12px;
      min-width: auto;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      justify-content: center;
      margin: 48px 0;
    }

    .empty-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    .empty-content {
      padding: 60px 40px;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 24px;
    }

    .empty-content h3 {
      margin: 16px 0;
      color: #333;
      font-weight: 500;
    }

    .empty-content p {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .empty-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Template Menu */
    .universal-chip {
      background-color: #fff3e0 !important;
      color: #f57c00 !important;
      font-size: 0.6rem !important;
      height: 16px !important;
      margin-left: 8px !important;
    }

    /* Material Design Overrides */
    ::ng-deep .submissions-container {
      .mat-mdc-progress-spinner circle {
        stroke: #1976d2;
      }

      .mat-mdc-chip.mat-primary {
        background-color: #1976d2;
        color: white;
      }

      .mat-mdc-chip.mat-accent {
        background-color: #ff9800;
        color: white;
      }

      .mat-mdc-chip.mat-warn {
        background-color: #f44336;
        color: white;
      }

      .mat-mdc-menu-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .mat-mdc-menu-item mat-icon {
        margin: 0 !important;
      }

      .mat-mdc-card {
        border-radius: 12px;
      }

      .mat-mdc-button,
      .mat-mdc-raised-button {
        border-radius: 6px;
        font-weight: 500;
      }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .submissions-grid {
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      }
    }

    @media (max-width: 768px) {
      .submissions-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 20px;
        align-items: stretch;
        padding: 20px;
      }

      .header-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .submissions-grid {
        grid-template-columns: 1fr;
      }

      .tab-label span {
        display: none;
      }

      .page-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }

      .header-info h1 {
        font-size: 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .submissions-container {
        padding: 12px;
      }

      .header {
        padding: 16px;
      }

      .empty-content {
        padding: 40px 20px;
      }

      .submission-card mat-card-actions {
        justify-content: space-around;
      }

      .submission-card mat-card-actions button {
        flex: 1;
        min-width: 0;
      }

      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .detail-row span {
        text-align: left;
      }
    }

    /* Print Styles */
    @media print {
      .submissions-container {
        background: white;
        padding: 0;
      }

      .header-actions,
      .form-type-tabs,
      .submission-card mat-card-actions {
        display: none !important;
      }

      .submissions-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .submission-card {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ddd;
      }
    }

    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .header,
      .form-type-tabs,
      .search-results,
      .submission-card {
        border: 2px solid #000;
      }

      .form-type-avatar {
        background: #000;
        color: #fff;
      }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .submission-card,
      .loading-content * {
        transition: none !important;
        animation: none !important;
      }
    }
  `]
})
export class SubmissionsComponent implements OnInit {
  // Signal-based state management
  allSubmissions = signal<FormSubmission[]>([]);
  filteredSubmissions = signal<FormSubmission[]>([]);
  selectedFormType = signal<string>('all');
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);

  // Computed properties
  isSearching = computed(() => this.searchTerm().length > 0);

  displayedSubmissions = computed(() => {
    const formType = this.selectedFormType();
    const search = this.searchTerm();
    let submissions = this.allSubmissions();

    // Filter by form type
    if (formType !== 'all') {
      submissions = submissions.filter(s => s.formType === formType);
    }

    // Apply search filter
    if (search) {
      submissions = this.applySearchFilter(submissions, search);
    }

    return submissions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  // Form type configurations
  formTypeConfigs: FormTypeConfig[] = [
    {
      type: 'rfq',
      label: 'Requests for Quote',
      icon: 'request_quote',
      color: 'primary',
      route: '/rfq',
      columns: ['clientName', 'standNum', 'solarArea', 'geyserArea', 'status'],
      actions: [
        { icon: 'visibility', label: 'View', action: 'view', tooltip: 'View Details' },
        { icon: 'picture_as_pdf', label: 'PDF', action: 'pdf', color: 'primary', tooltip: 'Generate PDF' },
        { icon: 'refresh', label: 'Repeat', action: 'repeat', color: 'accent', tooltip: 'Repeat RFQ' },
        { icon: 'delete', label: 'Delete', action: 'delete', color: 'warn', tooltip: 'Delete Submission' }
      ]
    },
    {
      type: 'quote',
      label: 'Quotes',
      icon: 'receipt',
      color: 'accent',
      route: '/quote',
      columns: ['clientName', 'projectName', 'totalAmount', 'validUntil', 'status'],
      actions: [
        { icon: 'visibility', label: 'View', action: 'view', tooltip: 'View Quote' },
        { icon: 'edit', label: 'Edit', action: 'edit', color: 'primary', tooltip: 'Edit Quote' },
        { icon: 'picture_as_pdf', label: 'PDF', action: 'pdf', color: 'primary', tooltip: 'Generate PDF' },
        { icon: 'send', label: 'Send', action: 'send', color: 'accent', tooltip: 'Send Quote', condition: (s) => s.status === 'draft' || s.status === 'submitted' },
        { icon: 'content_copy', label: 'Copy', action: 'copy', tooltip: 'Duplicate Quote' }
      ]
    },
    {
      type: 'invoice',
      label: 'Invoices',
      icon: 'payment',
      color: 'warn',
      route: '/invoice',
      columns: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'status'],
      actions: [
        { icon: 'visibility', label: 'View', action: 'view', tooltip: 'View Invoice' },
        { icon: 'picture_as_pdf', label: 'PDF', action: 'pdf', color: 'primary', tooltip: 'Generate PDF' },
        { icon: 'send', label: 'Send', action: 'send', color: 'accent', tooltip: 'Send Invoice', condition: (s) => s.status === 'draft' || s.status === 'submitted' },
        { icon: 'payment', label: 'Mark Paid', action: 'mark-paid', color: 'primary', tooltip: 'Mark as Paid', condition: (s) => s.status === 'submitted' }
      ]
    },
    {
      type: 'estimate',
      label: 'Estimates',
      icon: 'calculate',
      color: 'primary',
      route: '/estimate',
      columns: ['clientName', 'projectType', 'estimatedCost', 'validUntil', 'status'],
      actions: [
        { icon: 'visibility', label: 'View', action: 'view', tooltip: 'View Estimate' },
        { icon: 'edit', label: 'Edit', action: 'edit', color: 'primary', tooltip: 'Edit Estimate' },
        { icon: 'picture_as_pdf', label: 'PDF', action: 'pdf', color: 'primary', tooltip: 'Generate PDF' },
        { icon: 'transform', label: 'Convert', action: 'convert', color: 'accent', tooltip: 'Convert to Quote' }
      ]
    }
  ];

  // Computed form type data
  formTypeCounts = computed(() => {
    const submissions = this.allSubmissions();
    const counts: Record<string, number> = { all: submissions.length };

    this.formTypeConfigs.forEach(config => {
      counts[config.type] = submissions.filter(s => s.formType === config.type).length;
    });

    return counts;
  });

  currentFormTypeConfig = computed(() => {
    const selected = this.selectedFormType();
    return this.formTypeConfigs.find(c => c.type === selected) || null;
  });

  selectedTabIndex = computed(() => {
    return this.selectedFormType() === 'all' ? 0 : this.formTypeConfigs.findIndex(c => c.type === this.selectedFormType()) + 1;
  });

  // Search configuration
  searchConfig: SearchConfig = {
    placeholder: 'Search submissions...',
    debounceTime: 300,
    minLength: 1,
    showClearButton: true
  };

  // Sync status for UI display (declared after constructor to avoid initialization error)
  syncStatus$!: Observable<SyncStatus>;

  constructor(
    private formSubmissionService: FormSubmissionHybridService,
    private syncService: SupabaseSyncService,
    private templateService: TemplateManagementService,
    private pdfGenerationService: PdfGenerationService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Initialize sync status after syncService is available
    this.syncStatus$ = this.syncService.syncStatus$;
  }

  ngOnInit() {
    this.loadSubmissions();
    this.setupRouteHandling();
  }

  private setupRouteHandling(): void {
    // Check for form type in route
    const routeFormType = this.route.snapshot.queryParams['type'];
    if (routeFormType && this.formTypeConfigs.find(c => c.type === routeFormType)) {
      this.selectedFormType.set(routeFormType);
    }

    // Listen for route changes
    this.route.queryParams.subscribe(params => {
      const formType = params['type'] || 'all';
      if (formType !== this.selectedFormType()) {
        this.selectedFormType.set(formType);
      }
    });
  }

  loadSubmissions() {
    this.isLoading.set(true);
    this.formSubmissionService.getAllSubmissions().subscribe({
      next: (submissions) => {
        console.log('📊 Loaded submissions:', submissions.length);
        this.allSubmissions.set(submissions);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading submissions:', error);
        this.isLoading.set(false);
        this.showErrorMessage('Error loading submissions');
      }
    });
  }

  // Search functionality
  onSearchChange(searchTerm: string) {
    this.searchTerm.set(searchTerm);
  }

  onSearchClear() {
    this.searchTerm.set('');
  }

  private applySearchFilter(submissions: FormSubmission[], searchTerm: string): FormSubmission[] {
    const searchLower = searchTerm.toLowerCase();

    return submissions.filter(submission => {
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

      // Form-type specific field searches
      const formType = submission.formType;
      if (formType === 'rfq') {
        return this.searchRFQFields(submission, searchLower);
      } else if (formType === 'quote') {
        return this.searchQuoteFields(submission, searchLower);
      } else if (formType === 'invoice') {
        return this.searchInvoiceFields(submission, searchLower);
      } else if (formType === 'estimate') {
        return this.searchEstimateFields(submission, searchLower);
      }

      return false;
    });
  }

  private searchRFQFields(submission: FormSubmission, searchTerm: string): boolean {
    const data = submission.formData;
    const searchFields = [
      data?.repName, data?.standNum, data?.solarArea,
      data?.geyserArea, data?.trussArea, data?.trussType
    ];

    return searchFields.some(field =>
      field && field.toString().toLowerCase().includes(searchTerm)
    );
  }

  private searchQuoteFields(submission: FormSubmission, searchTerm: string): boolean {
    const data = submission.formData;
    const searchFields = [
      data?.projectName, data?.totalAmount, data?.validUntil,
      data?.description, data?.terms
    ];

    return searchFields.some(field =>
      field && field.toString().toLowerCase().includes(searchTerm)
    );
  }

  private searchInvoiceFields(submission: FormSubmission, searchTerm: string): boolean {
    const data = submission.formData;
    const searchFields = [
      data?.invoiceNumber, data?.amount, data?.dueDate,
      data?.paymentTerms, data?.notes
    ];

    return searchFields.some(field =>
      field && field.toString().toLowerCase().includes(searchTerm)
    );
  }

  private searchEstimateFields(submission: FormSubmission, searchTerm: string): boolean {
    const data = submission.formData;
    const searchFields = [
      data?.projectType, data?.estimatedCost, data?.validUntil,
      data?.scope, data?.assumptions
    ];

    return searchFields.some(field =>
      field && field.toString().toLowerCase().includes(searchTerm)
    );
  }

  // Form type filtering
  onFormTypeChange(formType: string) {
    this.selectedFormType.set(formType);

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: formType === 'all' ? null : formType },
      queryParamsHandling: 'merge'
    });
  }

  // Form creation methods
  createNewForm(formType?: string) {
    const type = formType || this.selectedFormType();
    const config = this.formTypeConfigs.find(c => c.type === type);

    if (config && type !== 'all') {
      this.router.navigate([config.route]);
    } else {
      // Default to RFQ if no specific type
      this.router.navigate(['/rfq']);
    }
  }

  // Enhanced action handling
  handleAction(submission: FormSubmission, actionType: string) {
    console.log(`🎯 Action: ${actionType} on submission ${submission.submissionId}`);

    switch (actionType) {
      case 'view':
        this.viewSubmission(submission.submissionId);
        break;
      case 'edit':
        this.editSubmission(submission);
        break;
      case 'pdf':
        this.generateEnhancedPDF(submission);
        break;
      case 'repeat':
        this.repeatSubmission(submission.submissionId);
        break;
      case 'copy':
        this.copySubmission(submission);
        break;
      case 'send':
        this.sendSubmission(submission);
        break;
      case 'mark-paid':
        this.markAsPaid(submission);
        break;
      case 'convert':
        this.convertEstimateToQuote(submission);
        break;
      case 'delete':
        this.deleteSubmission(submission.submissionId);
        break;
      default:
        console.warn('Unknown action:', actionType);
    }
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

  editSubmission(submission: FormSubmission) {
    const config = this.formTypeConfigs.find(c => c.type === submission.formType);
    if (config) {
      this.router.navigate([config.route], {
        queryParams: {
          edit: true,
          submissionId: submission.submissionId
        }
      });
    }
  }

  repeatSubmission(submissionId: string) {
    // Get the submission to determine its form type
    this.formSubmissionService.getSubmission(submissionId).subscribe(submission => {
      if (submission) {
        const config = this.formTypeConfigs.find(c => c.type === submission.formType);
        const route = config ? config.route : '/rfq';

        this.router.navigate([route], {
          queryParams: {
            repeat: true,
            submissionId: submissionId
          }
        });
      }
    });
  }

  copySubmission(submission: FormSubmission) {
    const config = this.formTypeConfigs.find(c => c.type === submission.formType);
    if (config) {
      this.router.navigate([config.route], {
        queryParams: {
          copy: true,
          submissionId: submission.submissionId
        }
      });
    }
  }

  sendSubmission(submission: FormSubmission) {
    // Implement sending logic (email, etc.)
    this.showSuccessMessage(`${submission.formTitle} sent successfully`);

    // Update status to sent
    // This would typically update the backend
    console.log('Sending submission:', submission.submissionId);
  }

  markAsPaid(submission: FormSubmission) {
    // Update invoice status to paid
    this.showSuccessMessage(`Invoice ${submission.submissionId} marked as paid`);

    // This would typically update the backend
    console.log('Marking as paid:', submission.submissionId);
  }

  convertEstimateToQuote(submission: FormSubmission) {
    if (submission.formType === 'estimate') {
      this.router.navigate(['/quote'], {
        queryParams: {
          convertFrom: 'estimate',
          submissionId: submission.submissionId
        }
      });
    }
  }

  deleteSubmission(submissionId: string) {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      this.formSubmissionService.deleteSubmission(submissionId).subscribe({
        next: () => {
          this.showSuccessMessage('Submission deleted successfully');
          this.loadSubmissions();
        },
        error: (error) => {
          console.error('❌ Error deleting submission:', error);
          this.showErrorMessage('Error deleting submission');
        }
      });
    }
  }

  // Utility methods
  getDisplayValue(submission: FormSubmission, column: string): string {
    const data = submission.formData;

    switch (column) {
      case 'clientName':
        return data?.clientName || 'N/A';
      case 'standNum':
        return data?.standNum || 'N/A';
      case 'solarArea':
        return Array.isArray(data?.solarArea) ? data.solarArea.join(', ') : data?.solarArea || 'None';
      case 'geyserArea':
        return Array.isArray(data?.geyserArea) ? data.geyserArea.join(', ') : data?.geyserArea || 'None';
      case 'projectName':
        return data?.projectName || 'N/A';
      case 'totalAmount':
      case 'amount':
      case 'estimatedCost':
        const amount = data?.totalAmount || data?.amount || data?.estimatedCost;
        return amount ? `$${amount.toLocaleString()}` : 'N/A';
      case 'validUntil':
      case 'dueDate':
        const date = data?.validUntil || data?.dueDate;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      case 'invoiceNumber':
        return data?.invoiceNumber || 'N/A';
      case 'projectType':
        return data?.projectType || 'N/A';
      case 'status':
        return submission.status;
      default:
        return data?.[column] || 'N/A';
    }
  }

  getColumnLabel(column: string): string {
    const labels: Record<string, string> = {
      clientName: 'Client',
      standNum: 'Address/Stand',
      solarArea: 'Solar Area',
      geyserArea: 'Geyser Area',
      projectName: 'Project',
      totalAmount: 'Amount',
      amount: 'Amount',
      estimatedCost: 'Estimated Cost',
      validUntil: 'Valid Until',
      dueDate: 'Due Date',
      invoiceNumber: 'Invoice #',
      projectType: 'Project Type',
      status: 'Status'
    };

    return labels[column] || column;
  }

  getFormTypeIcon(formType: string): string {
    const config = this.formTypeConfigs.find(c => c.type === formType);
    return config ? config.icon : 'description';
  }

  getFormTypeLabel(formType: string): string {
    const config = this.formTypeConfigs.find(c => c.type === formType);
    return config ? config.label : formType.toUpperCase();
  }

  // Action condition checking
  shouldShowAction(submission: FormSubmission, action: FormTypeAction): boolean {
    if (action.condition) {
      return action.condition(submission);
    }
    return true;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'accent';
      case 'submitted': return 'primary';
      case 'completed': return 'primary';
      default: return '';
    }
  }

  // Enhanced PDF Generation Method
  generateEnhancedPDF(submission: FormSubmission) {
    // Prepare comprehensive form data
    const enhancedFormData = {
      // Core submission data
      ...submission.formData,
      submissionId: submission.submissionId,
      formTitle: submission.formTitle,
      status: submission.status,
      createdAt: submission.createdAt,

      // Add any missing common fields with defaults
      repName: submission.formData?.repName || 'Field Representative',
      dateSubmitted: new Date(submission.createdAt).toLocaleDateString(),
      dateDue: submission.formData?.dateDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),

      // Display fields (formatted for better presentation)
      solarAreaDisplay: Array.isArray(submission.formData?.solarArea) ?
        submission.formData.solarArea.join(', ') : submission.formData?.solarArea || 'None',
      geyserAreaDisplay: Array.isArray(submission.formData?.geyserArea) ?
        submission.formData.geyserArea.join(', ') : submission.formData?.geyserArea || 'None',
      trussAreaDisplay: Array.isArray(submission.formData?.trussArea) ?
        submission.formData.trussArea.join(', ') : submission.formData?.trussArea || 'None',
      trussTypeDisplay: Array.isArray(submission.formData?.trussType) ?
        submission.formData.trussType.join(', ') : submission.formData?.trussType || 'Standard',
      trussType2Display: Array.isArray(submission.formData?.trussType2) ?
        submission.formData.trussType2.join(', ') : submission.formData?.trussType2 || 'Standard',
      pg1DescDisplay: Array.isArray(submission.formData?.pg1Desc) ?
        submission.formData.pg1Desc.join(', ') : submission.formData?.pg1Desc || '',

      // System-generated fields
      headerImage: 'assets/images/header.png',
      footerImage: 'assets/images/footer.png'
    };

    // Generate the enhanced PDF
    this.pdfGenerationService.generateEnhancedRFQ(enhancedFormData).subscribe({
      next: () => {
        this.snackBar.open(
          '🎉 Enhanced PDF generated successfully!',
          'Close',
          {
            duration: 4000,
            panelClass: ['success-snackbar']
          }
        );
      },
      error: (error) => {
        console.error('PDF generation error:', error);
        this.snackBar.open(
          '❌ Error generating PDF: ' + (error.message || 'Unknown error'),
          'Close',
          {
            duration: 6000,
            panelClass: ['error-snackbar']
          }
        );
      }
    });
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

  // Notification methods
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
