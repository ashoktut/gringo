import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import { Company, User, CompanyStats } from '../../../../models/auth.models';
import { CompanyService } from '../../../../services/company.service';
import { UserService } from '../../../../services/user.service';

interface DialogData {
  company: Company;
}

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './company-details.component.html',
  styleUrls: ['./company-details.component.css']
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  company = signal<Company | null>(null);
  companyUsers = signal<User[]>([]);
  companyStats = signal<CompanyStats | null>(null);
  isLoadingUsers = signal(false);
  isLoadingStats = signal(false);

  // Table configuration for users
  userDisplayedColumns: string[] = ['name', 'email', 'role', 'status', 'lastLogin'];

  constructor(
    private companyService: CompanyService,
    private userService: UserService,
    private dialogRef: MatDialogRef<CompanyDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.company.set(data.company);
  }

  ngOnInit(): void {
    this.loadCompanyUsers();
    this.loadCompanyStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompanyUsers(): void {
    const company = this.company();
    if (!company) return;

    this.isLoadingUsers.set(true);
    this.userService.getCompanyUsers(company.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companyUsers.set(response.users || response);
          this.isLoadingUsers.set(false);
        },
        error: (error) => {
          console.error('Failed to load company users:', error);
          this.isLoadingUsers.set(false);
        }
      });
  }

  private loadCompanyStats(): void {
    const company = this.company();
    if (!company) return;

    this.isLoadingStats.set(true);
    this.companyService.getCompanyStats(company.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.companyStats.set(stats);
          this.isLoadingStats.set(false);
        },
        error: (error) => {
          console.error('Failed to load company stats:', error);
          this.isLoadingStats.set(false);
        }
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  formatDate(date: Date | string): string {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateOnly(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'accent';
      case 'suspended': return 'warn';
      case 'inactive': return '';
      default: return '';
    }
  }

  getPlanColor(plan: string): string {
    switch (plan) {
      case 'enterprise': return 'primary';
      case 'professional': return 'accent';
      case 'basic': return 'success';
      case 'free': return '';
      default: return '';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'primary';
      case 'manager': return 'accent';
      case 'user': return 'success';
      default: return '';
    }
  }

  getUserStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warn';
      case 'pending': return 'accent';
      default: return '';
    }
  }

  getCompanyFeatures(): string[] {
    const company = this.company();
    if (!company?.features) return [];
    
    return Object.entries(company.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => this.formatFeatureName(feature));
  }

  private formatFeatureName(feature: string): string {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  getStorageUsagePercentage(): number {
    const stats = this.companyStats();
    const company = this.company();
    
    if (!stats || !company) return 0;
    
    const maxStorage = company.subscription.maxStorage || 1024;
    const usedStorage = stats.storageUsed || 0;
    
    return Math.round((usedStorage / maxStorage) * 100);
  }

  getStorageUsageColor(): string {
    const percentage = this.getStorageUsagePercentage();
    if (percentage >= 90) return 'warn';
    if (percentage >= 75) return 'accent';
    return 'primary';
  }

  formatStorageSize(sizeInMB: number): string {
    if (sizeInMB < 1024) {
      return `${sizeInMB} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  }

  hasAddress(): boolean {
    const company = this.company();
    if (!company?.address) return false;
    
    return !!(
      company.address.street ||
      company.address.city ||
      company.address.state ||
      company.address.zipCode ||
      company.address.country
    );
  }

  getFullAddress(): string {
    const company = this.company();
    if (!company?.address) return '';
    
    const parts = [
      company.address.street,
      company.address.city,
      company.address.state,
      company.address.zipCode,
      company.address.country
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  }
}