import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { Company, CompanyStatus, SubscriptionPlan, CompanyFeature, CompanyFeatures, CreateCompanyRequest, UpdateCompanyRequest } from '../../../../models/auth.models';
import { CompanyService } from '../../../../services/company.service';

interface DialogData {
  mode: 'create' | 'edit';
  company?: Company;
}

@Component({
  selector: 'app-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './company-dialog.component.html',
  styleUrls: ['./company-dialog.component.css']
})
export class CompanyDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  companyForm!: FormGroup;
  subscriptionForm!: FormGroup;
  featuresForm!: FormGroup;
  isLoading = signal(false);
  isEdit: boolean;

  // Options
  statusOptions: CompanyStatus[] = ['active', 'inactive', 'suspended', 'trial'];
  planOptions: SubscriptionPlan[] = ['free', 'basic', 'professional', 'enterprise'];

  // Available features
  availableFeatures: { key: keyof CompanyFeature; label: string; description: string }[] = [
    { key: 'rfqManagement', label: 'RFQ Management', description: 'Create and manage RFQs' },
    { key: 'templateManagement', label: 'Template Management', description: 'Custom template creation and management' },
    { key: 'userManagement', label: 'User Management', description: 'Manage company users and roles' },
    { key: 'analytics', label: 'Analytics', description: 'Advanced analytics and reporting' },
    { key: 'apiAccess', label: 'API Access', description: 'Programmatic access to platform features' },
    { key: 'customBranding', label: 'Custom Branding', description: 'White-label and custom branding options' },
    { key: 'prioritySupport', label: 'Priority Support', description: '24/7 priority customer support' },
    { key: 'advancedSecurity', label: 'Advanced Security', description: 'Enhanced security features and compliance' }
  ];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private dialogRef: MatDialogRef<CompanyDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.isEdit = data.mode === 'edit';
    this.initializeForms();
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.company) {
      this.populateFormsWithCompanyData(this.data.company);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Basic company information form
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      domain: ['', [Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        country: ['']
      }),
      status: ['active', Validators.required],
      description: [''],
      website: ['', [Validators.pattern(/^https?:\/\/.+$/)]],
      taxId: [''],
      industry: ['']
    });

    // Subscription form
    this.subscriptionForm = this.fb.group({
      plan: ['free', Validators.required],
      maxUsers: [10, [Validators.required, Validators.min(1)]],
      maxStorage: [1024, [Validators.required, Validators.min(100)]], // MB
      startDate: [new Date(), Validators.required],
      endDate: [''],
      isActive: [true]
    });

    // Features form
    this.featuresForm = this.fb.group({
      rfqManagement: [true],
      templateManagement: [false],
      userManagement: [false],
      analytics: [false],
      apiAccess: [false],
      customBranding: [false],
      prioritySupport: [false],
      advancedSecurity: [false]
    });
  }

  private populateFormsWithCompanyData(company: Company): void {
    // Populate basic company info
    this.companyForm.patchValue({
      name: company.name,
      domain: company.domain,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      address: company.address || {},
      status: company.status,
      description: company.description,
      website: company.website,
      taxId: company.taxId,
      industry: company.industry
    });

    // Populate subscription info
    this.subscriptionForm.patchValue({
      plan: company.subscription.plan,
      maxUsers: company.subscription.maxUsers,
      maxStorage: company.subscription.maxStorage,
      startDate: company.subscription.startDate ? new Date(company.subscription.startDate) : new Date(),
      endDate: company.subscription.endDate ? new Date(company.subscription.endDate) : null,
      isActive: company.subscription.isActive
    });

    // Populate features
    if (company.features) {
      this.featuresForm.patchValue(company.features);
    }
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      this.isLoading.set(true);

      const companyData = this.buildCompanyData();

      const operation = this.isEdit
        ? this.companyService.updateCompany(this.data.company!.id, companyData)
        : this.companyService.createCompany(companyData);

      operation
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.isLoading.set(false);
            this.snackBar.open(
              `Company ${this.isEdit ? 'updated' : 'created'} successfully`,
              'Close',
              { duration: 3000 }
            );
            this.dialogRef.close(result);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.snackBar.open(
              `Failed to ${this.isEdit ? 'update' : 'create'} company: ${error.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
    } else {
      this.markFormGroupTouched(this.companyForm);
      this.markFormGroupTouched(this.subscriptionForm);
      this.markFormGroupTouched(this.featuresForm);
    }
  }

  private buildCompanyData(): Partial<Company> {
    const basicInfo = this.companyForm.value;
    const subscriptionInfo = this.subscriptionForm.value;
    const featuresInfo = this.featuresForm.value;

    return {
      name: basicInfo.name,
      domain: basicInfo.domain || undefined,
      contactEmail: basicInfo.contactEmail,
      contactPhone: basicInfo.contactPhone || undefined,
      address: this.isAddressEmpty(basicInfo.address) ? undefined : basicInfo.address,
      status: basicInfo.status,
      description: basicInfo.description || undefined,
      website: basicInfo.website || undefined,
      taxId: basicInfo.taxId || undefined,
      industry: basicInfo.industry || undefined,
      subscription: {
        plan: subscriptionInfo.plan,
        status: subscriptionInfo.status || 'active' as const,
        isActive: subscriptionInfo.isActive !== undefined ? subscriptionInfo.isActive : true,
        startDate: subscriptionInfo.startDate || new Date(),
        endDate: subscriptionInfo.endDate,
        maxUsers: subscriptionInfo.maxUsers || 10,
        maxForms: subscriptionInfo.maxForms || 10,
        maxStorage: subscriptionInfo.maxStorage || 1,
        features: subscriptionInfo.features || []
      },
      features: featuresInfo
    };
  }

  private isAddressEmpty(address: any): boolean {
    return !address || (!address.street && !address.city && !address.state && !address.zipCode && !address.country);
  }

  private isFormValid(): boolean {
    return this.companyForm.valid && this.subscriptionForm.valid && this.featuresForm.valid;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control && control.constructor.name === 'FormGroup') {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFormError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
      if (field.errors['min']) return `Value must be at least ${field.errors['min'].min}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Company name',
      domain: 'Domain',
      contactEmail: 'Contact email',
      contactPhone: 'Contact phone',
      status: 'Status',
      plan: 'Subscription plan',
      maxUsers: 'Maximum users',
      maxStorage: 'Maximum storage',
      startDate: 'Start date'
    };
    return labels[fieldName] || fieldName;
  }

  onPlanChange(plan: SubscriptionPlan): void {
    // Auto-adjust limits based on plan
    const planLimits = {
      free: { maxUsers: 5, maxStorage: 500 },
      basic: { maxUsers: 25, maxStorage: 2048 },
      professional: { maxUsers: 100, maxStorage: 10240 },
      enterprise: { maxUsers: 1000, maxStorage: 51200 }
    };

    const limits = planLimits[plan];
    this.subscriptionForm.patchValue({
      maxUsers: limits.maxUsers,
      maxStorage: limits.maxStorage
    });

    // Enable/disable features based on plan
    this.updateFeaturesBasedOnPlan(plan);
  }

  private updateFeaturesBasedOnPlan(plan: SubscriptionPlan): void {
    const planFeatures = {
      free: ['rfqManagement'],
      basic: ['rfqManagement', 'templateManagement'],
      professional: ['rfqManagement', 'templateManagement', 'userManagement', 'analytics'],
      enterprise: ['rfqManagement', 'templateManagement', 'userManagement', 'analytics', 'apiAccess', 'customBranding', 'prioritySupport', 'advancedSecurity']
    };

    const enabledFeatures = planFeatures[plan] || [];
    const featuresUpdate: Partial<CompanyFeatures> = {};

    this.availableFeatures.forEach(feature => {
      (featuresUpdate as any)[feature.key] = enabledFeatures.includes(feature.key);
    });

    this.featuresForm.patchValue(featuresUpdate);
  }

  isFeatureAvailableForPlan(featureKey: string, plan: SubscriptionPlan): boolean {
    const planFeatures = {
      free: ['rfqManagement'],
      basic: ['rfqManagement', 'templateManagement'],
      professional: ['rfqManagement', 'templateManagement', 'userManagement', 'analytics'],
      enterprise: ['rfqManagement', 'templateManagement', 'userManagement', 'analytics', 'apiAccess', 'customBranding', 'prioritySupport', 'advancedSecurity']
    };

    return (planFeatures[plan] || []).includes(featureKey);
  }

  get selectedPlan(): SubscriptionPlan {
    return this.subscriptionForm.get('plan')?.value || 'free';
  }
}
