import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormSubmissionService, FormSubmission } from '../../services/form-submission.service';
import { Template, TemplateType, TemplateGenerationRequest } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { PdfGenerationService } from '../../services/pdf-generation.service';

interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Extended interface for UI display
interface SubmissionDisplay extends FormSubmission {
  reference: string;
  companyName: string;
  contactEmail: string;
  templateName: string;
  submittedDate: Date;
  priority: string;
  type: string;
}

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.css']
})
export class SubmissionsComponent implements OnInit {
  submissions: SubmissionDisplay[] = [];
  filteredSubmissions: SubmissionDisplay[] = [];

  // UI State
  searchQuery: string = '';
  statusFilter: string = '';
  dateFilter: string = '';

  // Table configuration
  displayedColumns: string[] = ['reference', 'company', 'template', 'date', 'status', 'priority', 'actions'];

  // Stats
  stats: SubmissionStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  constructor(
    private formSubmissionService: FormSubmissionService,
    private templateService: TemplateManagementService,
    private pdfGenerationService: PdfGenerationService,
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
        this.submissions = submissions.map(sub => ({
          ...sub,
          reference: sub.submissionId || `RFQ-${Date.now()}`,
          companyName: sub.formData?.clientName || 'Unknown Company',
          contactEmail: sub.formData?.email || 'No email',
          templateName: sub.formTitle || 'Default Template',
          submittedDate: sub.createdAt,
          priority: this.getPriority(sub),
          type: sub.formType || 'RFQ'
        })).sort((a, b) =>
          new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        );
        this.updateStats();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
        this.showError('Failed to load submissions');
      }
    });
  }

  private getPriority(submission: FormSubmission): string {
    // Logic to determine priority based on submission data
    const age = Date.now() - new Date(submission.createdAt).getTime();
    const dayAge = age / (1000 * 60 * 60 * 24);

    if (dayAge > 7) return 'high';
    if (dayAge > 3) return 'medium';
    return 'low';
  }

  private updateStats() {
    this.stats = {
      total: this.submissions.length,
      pending: this.submissions.filter(s => s.status === 'draft' || s.status === 'submitted').length,
      approved: this.submissions.filter(s => s.status === 'completed').length,
      rejected: this.submissions.filter(s => s.status === 'submitted' && s.priority === 'rejected').length // Placeholder logic
    };
  }

  applyFilters() {
    let filtered = [...this.submissions];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(submission =>
        submission.reference.toLowerCase().includes(query) ||
        submission.companyName.toLowerCase().includes(query) ||
        submission.contactEmail.toLowerCase().includes(query) ||
        submission.templateName.toLowerCase().includes(query) ||
        submission.status.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(submission =>
        submission.status === this.statusFilter
      );
    }

    // Apply date filter
    if (this.dateFilter) {
      const now = new Date();
      const cutoffDate = new Date();

      switch (this.dateFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }

      if (this.dateFilter !== '') {
        filtered = filtered.filter(submission =>
          new Date(submission.submittedDate) >= cutoffDate
        );
      }
    }

    this.filteredSubmissions = filtered;
  }

  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.dateFilter = '';
    this.applyFilters();
  }

  // Utility methods
  getTimeAgo(date: string): string {
    const now = new Date();
    const submittedDate = new Date(date);
    const diffMs = now.getTime() - submittedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
      case 'draft':
        return 'pending_actions';
      case 'completed':
      case 'approved':
        return 'check_circle';
      case 'rejected':
        return 'cancel';
      case 'in-review':
        return 'rate_review';
      default:
        return 'help';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'in-review': return 'In Review';
      default: return status;
    }
  }

  // Action methods
  viewSubmission(submission: SubmissionDisplay) {
    // Navigate to detail view or open modal
    console.log('Viewing submission:', submission);
    this.showSuccess('Opening submission details...');
  }

  editSubmission(submission: SubmissionDisplay) {
    this.router.navigate(['/reps/rfq'], {
      queryParams: { edit: true, submissionId: submission.submissionId }
    });
  }

  approveSubmission(submission: SubmissionDisplay) {
    // Update submission status
    this.updateSubmissionStatus(submission, 'completed');
  }

  rejectSubmission(submission: SubmissionDisplay) {
    // Update submission status - using priority field as placeholder for rejected status
    submission.priority = 'rejected';
    this.showSuccess('Submission rejected successfully');
    this.updateStats();
    this.applyFilters();
  }

  duplicateSubmission(submission: SubmissionDisplay) {
    this.router.navigate(['/reps/rfq'], {
      queryParams: { duplicate: true, submissionId: submission.submissionId }
    });
  }

  downloadSubmission(submission: SubmissionDisplay) {
    this.generateEnhancedPDF(submission);
  }

  emailSubmission(submission: SubmissionDisplay) {
    if (submission && submission.contactEmail) {
      // In a real app, this would integrate with email service
      const subject = `RFQ Submission ${submission.reference}`;
      const body = `Dear ${submission.companyName},\n\nPlease find your RFQ submission details attached.\n\nReference: ${submission.reference}\nStatus: ${submission.status}\n\nBest regards,\nGringo Team`;

      // For now, open default email client
      window.location.href = `mailto:${submission.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      this.showSuccess('Email client opened');
    } else {
      this.showError('No email address available for this submission');
    }
  }

  deleteSubmission(submission: SubmissionDisplay) {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      this.formSubmissionService.deleteSubmission(submission.submissionId).subscribe({
        next: () => {
          this.showSuccess('Submission deleted successfully');
          this.loadSubmissions();
        },
        error: (error) => {
          console.error('Error deleting submission:', error);
          this.showError('Failed to delete submission');
        }
      });
    }
  }

  private updateSubmissionStatus(submission: SubmissionDisplay, status: 'draft' | 'submitted' | 'completed') {
    // This would typically call a service method to update the status
    submission.status = status;
    this.showSuccess(`Submission ${status} successfully`);
    this.updateStats();
    this.applyFilters();
  }

  // Quick actions
  createNewSubmission() {
    this.router.navigate(['/reps/rfq']);
  }

  importSubmissions() {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.processImportFile(file);
      }
    };
    input.click();
  }

  exportSubmissions() {
    if (this.filteredSubmissions.length === 0) {
      this.showInfo('No submissions to export');
      return;
    }

    // Prepare data for export
    const exportData = this.filteredSubmissions.map(sub => ({
      Reference: sub.reference,
      Company: sub.companyName,
      Email: sub.contactEmail,
      Template: sub.templateName,
      Status: sub.status,
      Priority: sub.priority,
      'Submitted Date': new Date(sub.submittedDate).toLocaleDateString(),
      'Days Old': Math.floor((Date.now() - new Date(sub.submittedDate).getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Convert to CSV
    const csvContent = this.convertToCSV(exportData);
    this.downloadCSV(csvContent, 'submissions-export.csv');
    this.showSuccess(`Exported ${exportData.length} submissions to CSV`);
  }

  // Enhanced PDF Generation
  generateEnhancedPDF(submission: SubmissionDisplay) {
    const enhancedFormData = {
      ...submission.formData,
      submissionId: submission.submissionId || submission.reference,
      formTitle: submission.formTitle || submission.templateName,
      status: submission.status,
      createdAt: submission.createdAt || submission.submittedDate,
      repName: submission.formData?.repName || 'Field Representative',
      dateSubmitted: new Date(submission.submittedDate).toLocaleDateString(),
      headerImage: 'assets/images/header.png',
      footerImage: 'assets/images/footer.png'
    };

    this.pdfGenerationService.generateEnhancedRFQ(enhancedFormData).subscribe({
      next: () => {
        this.showSuccess('PDF generated successfully!');
      },
      error: (error) => {
        console.error('PDF generation error:', error);
        this.showError('Error generating PDF: ' + (error.message || 'Unknown error'));
      }
    });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  private downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private processImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const content = e.target.result;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          this.showInfo(`JSON import detected: ${data.length || 0} records found`);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter((line: string) => line.trim());
          this.showInfo(`CSV import detected: ${lines.length - 1} records found (excluding header)`);
        }
        // In a real application, this would process and validate the data
        this.showSuccess('Import functionality will be fully implemented soon');
      } catch (error) {
        this.showError('Error processing import file: ' + error);
      }
    };
    reader.readAsText(file);
  }

  // Utility notification methods
  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['info-snackbar']
    });
  }
}
