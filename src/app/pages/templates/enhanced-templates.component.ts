import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TemplateConfiguration, TemplateCategory } from '../../interfaces/template-configuration.interface';
import { EnhancedTemplateManagementService } from '../../services/enhanced-template-management.service';
import { UnifiedPdfGenerationService } from '../../services/unified-pdf-generation.service';

@Component({
  selector: 'app-enhanced-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="templates-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">
            <span class="title-icon">📄</span>
            Template Management
          </h1>
          <p class="page-subtitle">Manage document templates for multi-tenant form generation</p>
        </div>

        <div class="header-actions">
          <button
            class="btn btn-primary"
            (click)="showCreateTemplateModal = true">
            <span class="btn-icon">➕</span>
            Create Template
          </button>

          <button
            class="btn btn-secondary"
            (click)="importLCPTemplate()">
            <span class="btn-icon">📥</span>
            Import LCP Template
          </button>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-container">
          <input
            type="text"
            placeholder="Search templates..."
            class="search-input"
            [(ngModel)]="searchQuery"
            (input)="onSearchChange($event)">
          <span class="search-icon">🔍</span>
        </div>

        <div class="filters-container">
          <select
            class="filter-select"
            [(ngModel)]="selectedCategory"
            (change)="filterTemplates()">
            <option value="">All Categories</option>
            <option *ngFor="let category of categories" [value]="category.id">
              {{category.name}}
            </option>
          </select>

          <select
            class="filter-select"
            [(ngModel)]="selectedFormType"
            (change)="filterTemplates()">
            <option value="">All Form Types</option>
            <option value="rfq">RFQ</option>
            <option value="quote">Quote</option>
            <option value="invoice">Invoice</option>
            <option value="report">Report</option>
          </select>

          <select
            class="filter-select"
            [(ngModel)]="selectedStatus"
            (change)="filterTemplates()">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Templates Grid -->
      <div class="templates-grid" *ngIf="filteredTemplates.length > 0">
        <div
          *ngFor="let template of filteredTemplates"
          class="template-card"
          [class.inactive]="!template.isActive">

          <!-- Template Header -->
          <div class="template-header">
            <div class="template-info">
              <h3 class="template-name">{{template.name}}</h3>
              <p class="template-description">{{template.description}}</p>
            </div>

            <div class="template-status">
              <span
                class="status-badge"
                [class.active]="template.isActive"
                [class.inactive]="!template.isActive">
                {{template.isActive ? 'Active' : 'Inactive'}}
              </span>

              <span
                *ngIf="template.isDefault"
                class="default-badge">
                Default
              </span>
            </div>
          </div>

          <!-- Template Metadata -->
          <div class="template-metadata">
            <div class="metadata-row">
              <span class="metadata-label">Type:</span>
              <span class="metadata-value">{{template.templateType | titlecase}}</span>
            </div>

            <div class="metadata-row">
              <span class="metadata-label">Form Types:</span>
              <span class="metadata-value">
                <span
                  *ngFor="let formType of template.formTypes; let last = last"
                  class="form-type-tag">
                  {{formType}}{{!last ? ', ' : ''}}
                </span>
              </span>
            </div>

            <div class="metadata-row">
              <span class="metadata-label">Companies:</span>
              <span class="metadata-value">
                <span *ngIf="template.isGlobal" class="global-badge">Global</span>
                <span *ngIf="!template.isGlobal">{{template.assignedCompanies.length}} assigned</span>
              </span>
            </div>

            <div class="metadata-row">
              <span class="metadata-label">Last Modified:</span>
              <span class="metadata-value">{{template.lastModified | date:'short'}}</span>
            </div>
          </div>

          <!-- Template Tags -->
          <div class="template-tags" *ngIf="template.tags.length > 0">
            <span
              *ngFor="let tag of template.tags"
              class="tag">
              {{tag}}
            </span>
          </div>

          <!-- Template Actions -->
          <div class="template-actions">
            <button
              class="action-btn preview-btn"
              (click)="previewTemplate(template)">
              <span class="btn-icon">👁️</span>
              Preview
            </button>

            <button
              class="action-btn edit-btn"
              (click)="editTemplate(template)">
              <span class="btn-icon">✏️</span>
              Edit
            </button>

            <button
              class="action-btn duplicate-btn"
              (click)="duplicateTemplate(template)">
              <span class="btn-icon">📋</span>
              Duplicate
            </button>

            <button
              class="action-btn toggle-btn"
              [class.activate]="!template.isActive"
              [class.deactivate]="template.isActive"
              (click)="toggleTemplateStatus(template)">
              <span class="btn-icon">{{template.isActive ? '⏸️' : '▶️'}}</span>
              {{template.isActive ? 'Deactivate' : 'Activate'}}
            </button>

            <button
              class="action-btn delete-btn"
              (click)="confirmDeleteTemplate(template)">
              <span class="btn-icon">🗑️</span>
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="filteredTemplates.length === 0">
        <div class="empty-icon">📄</div>
        <h3>No Templates Found</h3>
        <p>{{templates.length === 0 ? 'Create your first template to get started' : 'No templates match your current filters'}}</p>
        <button
          class="btn btn-primary"
          (click)="showCreateTemplateModal = true">
          Create Your First Template
        </button>
      </div>

      <!-- Create/Edit Template Modal -->
      <div class="modal-overlay" *ngIf="showCreateTemplateModal || editingTemplate">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h2>{{editingTemplate ? 'Edit Template' : 'Create New Template'}}</h2>
            <button
              class="modal-close"
              (click)="closeTemplateModal()">✕</button>
          </div>

          <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()">
            <div class="modal-body">
              <!-- Basic Information -->
              <div class="form-section">
                <h3>Basic Information</h3>

                <div class="form-row">
                  <div class="form-group">
                    <label for="templateName">Template Name *</label>
                    <input
                      id="templateName"
                      type="text"
                      formControlName="name"
                      class="form-input"
                      placeholder="Enter template name">
                  </div>

                  <div class="form-group">
                    <label for="templateType">Template Type *</label>
                    <select
                      id="templateType"
                      formControlName="templateType"
                      class="form-select">
                      <option value="html">HTML</option>
                      <option value="docx">DOCX</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label for="templateDescription">Description</label>
                  <textarea
                    id="templateDescription"
                    formControlName="description"
                    class="form-textarea"
                    rows="3"
                    placeholder="Describe what this template is used for"></textarea>
                </div>
              </div>

              <!-- Template Content -->
              <div class="form-section">
                <h3>Template Content</h3>

                <div class="form-group">
                  <label for="htmlContent">HTML Content *</label>
                  <textarea
                    id="htmlContent"
                    formControlName="htmlContent"
                    class="form-textarea code-editor"
                    rows="15"
                    placeholder="Enter your HTML template content with placeholders">
                  </textarea>
                </div>
              </div>

              <!-- Assignment Settings -->
              <div class="form-section">
                <h3>Assignment Settings</h3>

                <div class="form-row">
                  <div class="form-group">
                    <label>
                      <input
                        type="checkbox"
                        formControlName="isGlobal">
                      Global Template (Available to all companies)
                    </label>
                  </div>

                  <div class="form-group">
                    <label>
                      <input
                        type="checkbox"
                        formControlName="isDefault">
                      Set as Default Template
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label for="formTypes">Form Types</label>
                  <select
                    id="formTypes"
                    formControlName="formTypes"
                    class="form-select"
                    multiple>
                    <option value="rfq">RFQ</option>
                    <option value="quote">Quote</option>
                    <option value="invoice">Invoice</option>
                    <option value="report">Report</option>
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple types</small>
                </div>
              </div>

              <!-- Tags -->
              <div class="form-section">
                <h3>Tags</h3>

                <div class="form-group">
                  <label for="tags">Tags (comma-separated)</label>
                  <input
                    id="tags"
                    type="text"
                    formControlName="tagsString"
                    class="form-input"
                    placeholder="construction, professional, rfq">
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="closeTemplateModal()">
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="templateForm.invalid || isSaving">
                {{isSaving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" *ngIf="templateToDelete">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Confirm Deletion</h2>
          </div>

          <div class="modal-body">
            <p>Are you sure you want to delete the template <strong>{{templateToDelete.name}}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="templateToDelete = null">
              Cancel
            </button>

            <button
              type="button"
              class="btn btn-danger"
              (click)="deleteTemplate()">
              Delete Template
            </button>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <p>{{loadingMessage}}</p>
      </div>
    </div>
  `,
  styles: [`
    .templates-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: 100vh;
    }

    /* Header Section */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header-content {
      flex: 1;
    }

    .page-title {
      display: flex;
      align-items: center;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 8px 0;
    }

    .title-icon {
      font-size: 32px;
      margin-right: 12px;
    }

    .page-subtitle {
      color: #6c757d;
      font-size: 16px;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Filters Section */
    .filters-section {
      display: flex;
      gap: 20px;
      margin-bottom: 25px;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .search-container {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      width: 100%;
      padding: 12px 45px 12px 16px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: #0b7ad4;
      box-shadow: 0 0 0 3px rgba(11, 122, 212, 0.1);
    }

    .search-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6c757d;
      font-size: 16px;
    }

    .filters-container {
      display: flex;
      gap: 12px;
    }

    .filter-select {
      padding: 12px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      min-width: 150px;
      transition: border-color 0.3s ease;
    }

    .filter-select:focus {
      outline: none;
      border-color: #0b7ad4;
      box-shadow: 0 0 0 3px rgba(11, 122, 212, 0.1);
    }

    /* Templates Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .template-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      border: 1px solid #e9ecef;
    }

    .template-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .template-card.inactive {
      opacity: 0.7;
      background: #f8f9fa;
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .template-info {
      flex: 1;
    }

    .template-name {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 8px 0;
    }

    .template-description {
      color: #6c757d;
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .template-status {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.active {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .default-badge {
      background: #fff3cd;
      color: #856404;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .template-metadata {
      margin-bottom: 20px;
    }

    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .metadata-label {
      font-weight: 600;
      color: #495057;
    }

    .metadata-value {
      color: #6c757d;
      text-align: right;
      flex: 1;
      margin-left: 12px;
    }

    .form-type-tag {
      display: inline-block;
      background: #e3f2fd;
      color: #0b7ad4;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .global-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .template-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 20px;
    }

    .tag {
      background: #f8f9fa;
      color: #495057;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      border: 1px solid #dee2e6;
    }

    .template-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .preview-btn {
      background: #e3f2fd;
      color: #0b7ad4;
    }

    .preview-btn:hover {
      background: #bbdefb;
    }

    .edit-btn {
      background: #fff3e0;
      color: #f57c00;
    }

    .edit-btn:hover {
      background: #ffe0b2;
    }

    .duplicate-btn {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .duplicate-btn:hover {
      background: #e1bee7;
    }

    .toggle-btn.activate {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .toggle-btn.activate:hover {
      background: #c8e6c9;
    }

    .toggle-btn.deactivate {
      background: #fff3e0;
      color: #f57c00;
    }

    .toggle-btn.deactivate:hover {
      background: #ffe0b2;
    }

    .delete-btn {
      background: #ffebee;
      color: #c62828;
    }

    .delete-btn:hover {
      background: #ffcdd2;
    }

    .btn-icon {
      font-size: 14px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: #0b7ad4;
      color: white;
    }

    .btn-primary:hover {
      background: #0a6bc7;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(11, 122, 212, 0.3);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .empty-state h3 {
      color: #2c3e50;
      margin-bottom: 12px;
    }

    .empty-state p {
      color: #6c757d;
      margin-bottom: 30px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .modal-content.large-modal {
      max-width: 800px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 20px;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6c757d;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s ease;
    }

    .modal-close:hover {
      background: #f8f9fa;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px;
      border-top: 1px solid #e9ecef;
    }

    /* Form Styles */
    .form-section {
      margin-bottom: 30px;
    }

    .form-section h3 {
      color: #2c3e50;
      font-size: 16px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
      font-family: inherit;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #0b7ad4;
      box-shadow: 0 0 0 3px rgba(11, 122, 212, 0.1);
    }

    .code-editor {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      color: #6c757d;
      font-size: 12px;
    }

    .warning-text {
      color: #dc3545;
      font-weight: 500;
    }

    /* Loading */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e9ecef;
      border-left-color: #0b7ad4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .templates-container {
        padding: 15px;
      }

      .header-section {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .filters-section {
        flex-direction: column;
        gap: 12px;
      }

      .templates-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .template-actions {
        flex-direction: column;
      }

      .action-btn {
        justify-content: center;
      }
    }
  `]
})
export class EnhancedTemplatesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  templates: TemplateConfiguration[] = [];
  filteredTemplates: TemplateConfiguration[] = [];
  categories: TemplateCategory[] = [];

  // Filter properties
  searchQuery = '';
  selectedCategory = '';
  selectedFormType = '';
  selectedStatus = '';

  // Modal properties
  showCreateTemplateModal = false;
  editingTemplate: TemplateConfiguration | null = null;
  templateToDelete: TemplateConfiguration | null = null;

  // Form properties
  templateForm: FormGroup;
  isSaving = false;

  // Loading properties
  isLoading = false;
  loadingMessage = '';

  constructor(
    private templateService: EnhancedTemplateManagementService,
    private pdfService: UnifiedPdfGenerationService,
    private fb: FormBuilder
  ) {
    this.templateForm = this.createTemplateForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION =====

  private createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      templateType: ['html', Validators.required],
      htmlContent: ['', Validators.required],
      formTypes: [[]],
      isGlobal: [false],
      isDefault: [false],
      tagsString: ['']
    });
  }

  private setupFormValidation(): void {
    // Add custom validation and form change handlers here
    this.templateForm.get('name')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        // Auto-generate placeholder suggestions based on name
        this.updatePlaceholderSuggestions(value);
      });
  }

  private loadData(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading templates...';

    // Load templates
    this.templateService.templates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(templates => {
        this.templates = templates;
        this.filterTemplates();
        this.isLoading = false;
      });

    // Load categories
    this.templateService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
      });
  }

  // ===== SEARCH AND FILTERING =====

  onSearchChange(event: any): void {
    this.searchQuery = event.target.value;
    this.filterTemplates();
  }

  filterTemplates(): void {
    let filtered = [...this.templates];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(template =>
        template.tags.includes(this.selectedCategory)
      );
    }

    // Apply form type filter
    if (this.selectedFormType) {
      filtered = filtered.filter(template =>
        template.formTypes.includes(this.selectedFormType) ||
        template.formTypes.length === 0
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(template => template.isActive === isActive);
    }

    this.filteredTemplates = filtered;
  }

  // ===== TEMPLATE ACTIONS =====

  async previewTemplate(template: TemplateConfiguration): Promise<void> {
    try {
      this.isLoading = true;
      this.loadingMessage = 'Generating preview...';

      await this.pdfService.previewTemplate(template.id).toPromise();
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to generate preview: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  editTemplate(template: TemplateConfiguration): void {
    this.editingTemplate = { ...template };
    this.populateForm(template);
    this.showCreateTemplateModal = true;
  }

  async duplicateTemplate(template: TemplateConfiguration): Promise<void> {
    try {
      this.isLoading = true;
      this.loadingMessage = 'Duplicating template...';

      const duplicatedName = prompt('Enter name for duplicated template:', `${template.name} (Copy)`);
      if (duplicatedName) {
        await this.templateService.duplicateTemplate(template.id, duplicatedName);
      }
    } catch (error) {
      console.error('Duplication error:', error);
      alert('Failed to duplicate template: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  async toggleTemplateStatus(template: TemplateConfiguration): Promise<void> {
    try {
      await this.templateService.toggleTemplateActivation(template.id);
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Failed to toggle template status: ' + (error as Error).message);
    }
  }

  confirmDeleteTemplate(template: TemplateConfiguration): void {
    this.templateToDelete = template;
  }

  async deleteTemplate(): Promise<void> {
    if (!this.templateToDelete) return;

    try {
      this.isLoading = true;
      this.loadingMessage = 'Deleting template...';

      await this.templateService.deleteTemplate(this.templateToDelete.id);
      this.templateToDelete = null;
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete template: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  // ===== MODAL MANAGEMENT =====

  closeTemplateModal(): void {
    this.showCreateTemplateModal = false;
    this.editingTemplate = null;
    this.templateForm.reset();
    this.templateForm = this.createTemplateForm();
  }

  private populateForm(template: TemplateConfiguration): void {
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      htmlContent: template.htmlContent,
      formTypes: template.formTypes,
      isGlobal: template.isGlobal,
      isDefault: template.isDefault,
      tagsString: template.tags.join(', ')
    });
  }

  async saveTemplate(): Promise<void> {
    if (this.templateForm.invalid) return;

    try {
      this.isSaving = true;
      const formValue = this.templateForm.value;

      const templateData: TemplateConfiguration = {
        id: this.editingTemplate?.id || '',
        name: formValue.name,
        description: formValue.description,
        templateType: formValue.templateType,
        htmlContent: formValue.htmlContent,
        assignedCompanies: this.editingTemplate?.assignedCompanies || [],
        formTypes: Array.isArray(formValue.formTypes) ? formValue.formTypes : [],
        isGlobal: formValue.isGlobal,
        isActive: true,
        isDefault: formValue.isDefault,
        isSystemTemplate: false,
        createdDate: this.editingTemplate?.createdDate || new Date(),
        lastModified: new Date(),
        version: this.editingTemplate?.version || '1.0',
        author: 'User',
        tags: formValue.tagsString ? formValue.tagsString.split(',').map((tag: string) => tag.trim()) : [],
        fieldMappings: this.generateFieldMappings(formValue.htmlContent),
        pdfSettings: this.getDefaultPdfSettings(),
  sampleData: {}
      };

      await this.templateService.saveTemplate(templateData);
      this.closeTemplateModal();
    } catch (error) {
  console.error('Save error:', error);
  alert('Failed to save template: ' + (error as Error).message);
    } finally {
      this.isSaving = false;
    }
  }

  // ===== SPECIAL ACTIONS =====

  async importLCPTemplate(): Promise<void> {
    try {
      this.isLoading = true;
      this.loadingMessage = 'Importing LCP template...';

      await this.templateService.importLCPRoofingTemplate();
      alert('LCP Roofing template imported successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save template: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  // ===== HELPER METHODS =====

  private updatePlaceholderSuggestions(templateName: string): void {
    // Auto-suggest placeholders based on template name
    // This could be enhanced with AI or predefined suggestions
  }

  private generateFieldMappings(htmlContent: string): any[] {
    // Extract placeholders from HTML and create basic field mappings
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(htmlContent)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)].map(placeholder => ({
      fieldName: placeholder,
      placeholder: placeholder,
      dataType: 'text',
      isRequired: false
    }));
  }

  private getDefaultPdfSettings(): any {
    return {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      scale: 1,
      displayHeaderFooter: false,
      printBackground: true
    };
  }
}
