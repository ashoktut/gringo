import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { UserManagementService } from '../../services/user-management.service';
import { TemplateStorageService } from '../../services/template-storage.service';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  totalTemplates: number;
  totalSubmissions: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'user_login' | 'template_upload' | 'form_submission' | 'user_created' | 'company_created';
  description: string;
  timestamp: Date;
  userId?: string;
  companyId?: string;
}

interface ChartData {
  labels: string[];
  data: number[];
  backgroundColor?: string[];
}

interface CompanyUsage {
  companyId: string;
  companyName: string;
  userCount: number;
  templateCount: number;
  submissionCount: number;
  lastActivity: Date;
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    MatTabsModule,
    MatProgressBarModule,
    MatListModule,
    MatChipsModule
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics-dashboard.component.css'
})
export class AnalyticsDashboardComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly templateService = inject(TemplateStorageService);

  // Reactive data
  stats = signal<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
    totalTemplates: 0,
    totalSubmissions: 0,
    recentActivity: []
  });

  companyUsage = signal<CompanyUsage[]>([]);
  isLoading = signal(false);
  selectedTimeRange = signal('7d');
  selectedMetric = signal('users');

  // Chart data
  userGrowthData = signal<ChartData>({ labels: [], data: [] });
  templateUsageData = signal<ChartData>({ labels: [], data: [] });
  companyActivityData = signal<ChartData>({ labels: [], data: [] });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await Promise.all([
        this.loadStats(),
        this.loadCompanyUsage(),
        this.loadChartData()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    // Get users data
    this.userService.getUsers().subscribe(users => {
      const activeUsers = users.filter(u => u.isActive).length;
      
      // Get companies data
      this.userService.getCompanies().subscribe(companies => {
        const activeCompanies = companies.filter(c => c.active).length;
        
        // Get templates data
        this.templateService.getAllTemplates().subscribe(templates => {
          const stats: DashboardStats = {
            totalUsers: users.length,
            activeUsers: activeUsers,
            totalCompanies: companies.length,
            activeCompanies: activeCompanies,
            totalTemplates: templates.length,
            totalSubmissions: this.getRandomSubmissionCount(), // Mock data
            recentActivity: this.generateRecentActivity(users, companies, templates)
          };
          
          this.stats.set(stats);
        });
      });
    });
  }

  private async loadCompanyUsage(): Promise<void> {
    this.userService.getCompanies().subscribe(companies => {
      this.userService.getUsers().subscribe(users => {
        this.templateService.getAllTemplates().subscribe(templates => {
          const usage: CompanyUsage[] = companies.map(company => {
            const companyUsers = users.filter(u => u.companyId === company.id);
            const companyTemplates = templates.filter(t => 
              t.assignedCompanies?.includes(company.id) || t.companyId === company.id
            );
            
            return {
              companyId: company.id,
              companyName: company.name,
              userCount: companyUsers.length,
              templateCount: companyTemplates.length,
              submissionCount: Math.floor(Math.random() * 50) + 5, // Mock data
              lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            };
          });
          
          this.companyUsage.set(usage);
        });
      });
    });
  }

  private async loadChartData(): Promise<void> {
    // Generate mock chart data for demonstration
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return date.toLocaleDateString();
    });

    this.userGrowthData.set({
      labels: last7Days,
      data: [12, 15, 18, 22, 25, 28, 32],
      backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b']
    });

    this.templateUsageData.set({
      labels: ['RFQ', 'Invoice', 'Quote', 'Report', 'Contract'],
      data: [35, 25, 20, 15, 5],
      backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7']
    });

    this.companyActivityData.set({
      labels: last7Days,
      data: [8, 12, 15, 18, 22, 25, 30],
      backgroundColor: ['#a8e6cf', '#88d8c0', '#70d0b4', '#59c9a5', '#42c299', '#2abb8e', '#11b482']
    });
  }

  private generateRecentActivity(users: any[], companies: any[], templates: any[]): ActivityItem[] {
    const activities: ActivityItem[] = [];
    const activityTypes = ['user_login', 'template_upload', 'form_submission', 'user_created', 'company_created'];
    
    for (let i = 0; i < 10; i++) {
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)] as ActivityItem['type'];
      const user = users[Math.floor(Math.random() * users.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      
      let description = '';
      switch (type) {
        case 'user_login':
          description = `${user?.name || 'User'} logged in`;
          break;
        case 'template_upload':
          description = `New template uploaded by ${user?.name || 'User'}`;
          break;
        case 'form_submission':
          description = `Form submitted by ${user?.name || 'User'}`;
          break;
        case 'user_created':
          description = `New user ${user?.name || 'User'} created`;
          break;
        case 'company_created':
          description = `New company ${company?.name || 'Company'} created`;
          break;
      }
      
      activities.push({
        id: `activity-${i}`,
        type,
        description,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        userId: user?.id,
        companyId: company?.id
      });
    }
    
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private getRandomSubmissionCount(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  // Event handlers
  onTimeRangeChange(range: string): void {
    this.selectedTimeRange.set(range);
    this.loadChartData(); // Reload chart data for new time range
  }

  onMetricChange(metric: string): void {
    this.selectedMetric.set(metric);
    // Update charts based on selected metric
  }

  onRefreshData(): void {
    this.loadDashboardData();
  }

  // Utility methods
  getActivityIcon(type: ActivityItem['type']): string {
    switch (type) {
      case 'user_login': return 'login';
      case 'template_upload': return 'upload';
      case 'form_submission': return 'assignment';
      case 'user_created': return 'person_add';
      case 'company_created': return 'business';
      default: return 'activity';
    }
  }

  getActivityColor(type: ActivityItem['type']): string {
    switch (type) {
      case 'user_login': return 'primary';
      case 'template_upload': return 'accent';
      case 'form_submission': return 'primary';
      case 'user_created': return 'warn';
      case 'company_created': return 'warn';
      default: return 'basic';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  getUsagePercentage(current: number, total: number): number {
    return total > 0 ? (current / total) * 100 : 0;
  }
}