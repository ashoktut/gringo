import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormConfigService, FormConfiguration } from '../../../services/form-config.service';
import { PdfGenerationService } from '../../../services/pdf-generation.service';
import { TemplateEditorDialogComponent } from './template-editor-dialog.component';

interface CompanyInfo {
  name: string;
  configCount: number;
  lastUsed?: Date;
  isActive: boolean;
}

@Component({
  selector: 'app-company-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './company-management.component.html',
  styleUrl: './company-management.component.css'
})
export class CompanyManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly formConfigService = inject(FormConfigService);
  private readonly pdfGenerationService = inject(PdfGenerationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Component state
  companies = signal<CompanyInfo[]>([]);
  isLoading = signal(false);
  showAddForm = signal(false);
  selectedCompanyForms = signal<FormConfiguration[]>([]);
  selectedCompany = signal<string | null>(null);
  isLoadingForms = signal(false);

  // Form
  addCompanyForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.loadCompanies();
  }

  private initializeForm(): void {
    this.addCompanyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  private loadCompanies(): void {
    this.isLoading.set(true);

    this.formConfigService.getAvailableCompanies().subscribe({
      next: (companyNames) => {
        const companyInfos: CompanyInfo[] = companyNames.map(name => ({
          name,
          configCount: 0,
          isActive: true
        }));

        // Get config counts for each company
        companyNames.forEach(name => {
          this.formConfigService.getCompanyConfigurations(name).subscribe(configs => {
            const company = companyInfos.find(c => c.name === name);
            if (company) {
              company.configCount = configs.length;
              company.lastUsed = configs.length > 0 ?
                new Date(Math.max(...configs.map(c => c.metadata.updatedAt.getTime()))) :
                undefined;
            }
            this.companies.set([...companyInfos]);
          });
        });

        this.companies.set(companyInfos);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.isLoading.set(false);
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm.update(show => !show);
    if (!this.showAddForm()) {
      this.addCompanyForm.reset();
    }
  }

  addCompany(): void {
    if (this.addCompanyForm.valid) {
      const companyName = this.addCompanyForm.value.companyName.trim();

      // Check if company already exists
      if (this.companies().some(c => c.name.toLowerCase() === companyName.toLowerCase())) {
        this.snackBar.open('Company already exists', 'Dismiss', { duration: 3000 });
        return;
      }

      // Create a sample configuration for the new company to establish it
      this.formConfigService.createFormConfig(
        `${companyName} - Default RFQ`,
        'rfq',
        'rfq-default-2025', // Base it on default RFQ
        companyName
      ).subscribe({
        next: (config) => {
          this.snackBar.open(`Company "${companyName}" added successfully!`, 'Dismiss', {
            duration: 3000
          });
          this.addCompanyForm.reset();
          this.showAddForm.set(false);
          this.loadCompanies(); // Refresh the list
        },
        error: (error) => {
          console.error('Error creating company:', error);
          this.snackBar.open('Error adding company', 'Dismiss', { duration: 3000 });
        }
      });
    }
  }

  viewCompanyForms(companyName: string): void {
    this.isLoadingForms.set(true);
    this.selectedCompany.set(companyName);

    this.formConfigService.getCompanyConfigurations(companyName).subscribe({
      next: (configs) => {
        this.selectedCompanyForms.set(configs);
        this.isLoadingForms.set(false);
        console.log(`Forms for ${companyName}:`, configs);
      },
      error: (error) => {
        console.error('Error loading company forms:', error);
        this.snackBar.open('Error loading forms', 'Dismiss', { duration: 3000 });
        this.isLoadingForms.set(false);
      }
    });
  }

  toggleFormActivation(form: FormConfiguration): void {
    this.formConfigService.toggleFormActivation(form.id).subscribe({
      next: (updatedForm) => {
        // Update the form in the local array
        const currentForms = this.selectedCompanyForms();
        const updatedForms = currentForms.map(f =>
          f.id === updatedForm.id ? updatedForm : f
        );
        this.selectedCompanyForms.set(updatedForms);

        // Refresh companies to update counts
        this.loadCompanies();

        const status = updatedForm.isActive ? 'activated' : 'deactivated';
        this.snackBar.open(`Form "${updatedForm.name}" ${status}`, 'Dismiss', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error toggling form activation:', error);
        this.snackBar.open('Error updating form status', 'Dismiss', { duration: 3000 });
      }
    });
  }

  editFormTemplate(form: FormConfiguration): void {
    const dialogRef = this.dialog.open(TemplateEditorDialogComponent, {
      data: { form },
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the local form data if changes were saved
        const currentForms = this.selectedCompanyForms();
        const updatedForms = currentForms.map(f =>
          f.id === result.id ? result : f
        );
        this.selectedCompanyForms.set(updatedForms);

        // Refresh companies to update any counts
        this.loadCompanies();
      }
    });
  }

  duplicateForm(form: FormConfiguration): void {
    const duplicateName = `${form.name} (Copy)`;
    this.formConfigService.createFormConfig(
      duplicateName,
      form.formType,
      form.id, // Base it on the existing form
      form.companyId!
    ).subscribe({
      next: (newForm) => {
        this.snackBar.open(`Form duplicated as "${duplicateName}"`, 'Dismiss', {
          duration: 3000
        });
        // Refresh the forms list
        this.viewCompanyForms(this.selectedCompany()!);
      },
      error: (error) => {
        console.error('Error duplicating form:', error);
        this.snackBar.open('Error duplicating form', 'Dismiss', { duration: 3000 });
      }
    });
  }

  deleteForm(form: FormConfiguration): void {
    if (confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
      // For now, just show a message as we don't have a delete method yet
      this.snackBar.open(
        `Delete "${form.name}" - Feature coming soon!`,
        'Dismiss',
        { duration: 3000 }
      );
    }
  }

  closeFormDetails(): void {
    this.selectedCompany.set(null);
    this.selectedCompanyForms.set([]);
  }

  generateSamplePdf(form: FormConfiguration): void {
    if (!form.templates || (!form.templates.htmlTemplate && !form.templates.docxTemplate)) {
      this.snackBar.open('No templates configured for this form', 'Dismiss', { duration: 3000 });
      return;
    }

    // Generate sample data based on form type
    const sampleData = this.generateSampleFormData(form);

    this.snackBar.open('Generating PDF from template...', 'Dismiss', { duration: 2000 });

    this.pdfGenerationService.generatePdfFromFormTemplate(
      form,
      sampleData,
      `${form.name}_sample_${new Date().getTime()}.pdf`
    ).subscribe({
      next: () => {
        this.snackBar.open('PDF generated successfully!', 'Dismiss', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.snackBar.open('Error generating PDF', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private generateSampleFormData(form: FormConfiguration): Record<string, any> {
    const baseData = {
      formName: form.name,
      formType: form.formType,
      companyName: form.companyId || 'Sample Company',
      submissionDate: new Date().toLocaleDateString(),
      submissionTime: new Date().toLocaleTimeString()
    };

    // Generate type-specific sample data
    switch (form.formType) {
      case 'rfq':
        return {
          ...baseData,
          clientName: 'John Smith',
          clientEmail: 'john.smith@example.com',
          clientPhone: '+27 72 154 9865',
          projectAddress: '123 Main Street, Cape Town, 8001',
          repName: 'Bryan Van Staden',
          roofTimeline: '2-3 weeks',
          structureType: 'Tiled Roof',
          buildingType: 'Residential',
          municipality: 'City of Cape Town',
          projectDescription: 'Standard residential roofing project requiring custom trusses',
          estimatedCost: 'R 85,000',
          notes: 'Client requires eco-friendly materials and completion before rainy season'
        };
      case 'rqr':
        return {
          ...baseData,
          clientName: 'Jane Doe',
          clientEmail: 'jane.doe@company.com',
          projectType: 'Commercial Building',
          requirements: 'Steel structure framework for warehouse',
          budget: 'R 250,000',
          location: 'Johannesburg, Gauteng',
          deadline: '6 weeks',
          specifications: 'Load-bearing steel structure with 15m span capability'
        };
      default:
        return {
          ...baseData,
          clientName: 'Sample Client',
          projectDescription: 'General construction project',
          estimatedValue: 'R 50,000',
          contactNumber: '+27 11 123 4567',
          requirements: 'Standard construction requirements as per municipal guidelines'
        };
    }
  }

  createFormForCompany(companyName: string): void {
    // Navigate to form builder with company preset
    // For now, show a message
    this.snackBar.open(
      `Create new form for ${companyName}`,
      'Go to Form Builder',
      { duration: 5000 }
    );
  }
}
