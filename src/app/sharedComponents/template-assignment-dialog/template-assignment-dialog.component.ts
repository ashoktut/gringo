import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';
import { Template } from '../../models/template.models';
import { TemplateManagementService } from '../../services/template-management.service';
import { UserManagementService } from '../../services/user-management.service';

export interface AssignmentDialogData {
  template: Template;
}

export interface Company {
  id: string;
  name: string;
  isAssigned: boolean;
}

@Component({
  selector: 'app-template-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './template-assignment-dialog.component.html',
  styleUrls: ['./template-assignment-dialog.component.css']
})
export class TemplateAssignmentDialogComponent implements OnInit {
  companies: Company[] = [];
  loading = false;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<TemplateAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignmentDialogData,
    private templateManagementService: TemplateManagementService,
    private userManagementService: UserManagementService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading = true;

    // Get all companies from UserManagementService
    const allCompanies = this.userManagementService.getAllCompanies();
    const assignedCompanies = this.data.template.assignedCompanies || [];

    this.companies = allCompanies.map(company => ({
      id: company.id,
      name: company.name,
      isAssigned: assignedCompanies.includes(company.id)
    }));

    this.loading = false;
  }

  toggleCompanyAssignment(company: Company): void {
    company.isAssigned = !company.isAssigned;
  }

  selectAll(): void {
    const allSelected = this.companies.every(c => c.isAssigned);
    this.companies.forEach(c => c.isAssigned = !allSelected);
  }

  get allSelected(): boolean {
    return this.companies.length > 0 && this.companies.every(c => c.isAssigned);
  }

  get someSelected(): boolean {
    return this.companies.some(c => c.isAssigned) && !this.allSelected;
  }

  get selectedCount(): number {
    return this.companies.filter(c => c.isAssigned).length;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.saving = true;

    const currentAssignments = this.data.template.assignedCompanies || [];
    const newAssignments = this.companies.filter(c => c.isAssigned).map(c => c.id);

    // Find companies to assign and unassign
    const toAssign = newAssignments.filter(id => !currentAssignments.includes(id));
    const toUnassign = currentAssignments.filter(id => !newAssignments.includes(id));

    // Execute assignment operations
    let saveOperation = this.templateManagementService.getTemplate(this.data.template.id);

    if (toAssign.length > 0) {
      saveOperation = this.templateManagementService.assignTemplateToCompanies(
        this.data.template.id,
        toAssign
      );
    }

    if (toUnassign.length > 0) {
      saveOperation = saveOperation.pipe(
        switchMap(() =>
          this.templateManagementService.unassignTemplateFromCompanies(
            this.data.template.id,
            toUnassign
          )
        )
      );
    }

    saveOperation.subscribe({
      next: (updatedTemplate) => {
        this.saving = false;
        this.snackBar.open('Template assignments updated successfully', 'Close', {
          duration: 3000
        });
        this.dialogRef.close(updatedTemplate);
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(`Error updating assignments: ${error.message}`, 'Close', {
          duration: 5000
        });
      }
    });
  }

  getAssignmentSummary(): string {
    const selectedCount = this.selectedCount;
    const totalCount = this.companies.length;

    if (selectedCount === 0) {
      return 'No companies selected (Public template)';
    }

    if (selectedCount === totalCount) {
      return 'All companies selected';
    }

    return `${selectedCount} of ${totalCount} companies selected`;
  }
}
