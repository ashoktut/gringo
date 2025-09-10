import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormSubmissionService } from '../../services/form-submission.service';
import { TemplateManagementService } from '../../services/template-management.service';

interface DashboardStat {
  icon: string;
  label: string;
  value: number | string;
  link: string;
  description: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  color?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  isLoading = true;
  lastUpdated = new Date();

  // Enhanced stats with real data integration
  stats: DashboardStat[] = [
    {
      icon: 'request_quote',
      label: 'Active RFQs',
      value: 0,
      link: '/reps/rfq',
      description: 'Create new Request for Quotation',
      color: 'primary',
      trend: { direction: 'up', percentage: 12 }
    },
    {
      icon: 'folder',
      label: 'Templates',
      value: 0,
      link: '/templates',
      description: 'Manage document templates',
      color: 'accent',
      trend: { direction: 'stable', percentage: 0 }
    },
    {
      icon: 'assignment',
      label: 'Submissions',
      value: 0,
      link: '/submissions',
      description: 'View and manage submissions',
      color: 'warn',
      trend: { direction: 'up', percentage: 8 }
    },
    {
      icon: 'pending_actions',
      label: 'Pending Review',
      value: 0,
      link: '/submissions?status=pending',
      description: 'Submissions awaiting review',
      color: 'primary'
    },
    {
      icon: 'bar_chart',
      label: 'Analytics',
      value: 'View Reports',
      link: '/analytics',
      description: 'Business intelligence and reports',
      color: 'accent'
    },
    {
      icon: 'settings',
      label: 'System Health',
      value: '98%',
      link: '/settings',
      description: 'System configuration and health',
      color: 'primary'
    }
  ];

  // Quick actions for easy navigation
  quickActions = [
    {
      title: 'Create New RFQ',
      description: 'Start a new request for quotation',
      icon: 'add_circle',
      route: '/reps/rfq',
      color: 'primary'
    },
    {
      title: 'Review Submissions',
      description: 'Review pending submissions',
      icon: 'rate_review',
      route: '/submissions?status=pending',
      color: 'accent'
    },
    {
      title: 'Manage Templates',
      description: 'Create or edit document templates',
      icon: 'description',
      route: '/templates',
      color: 'warn'
    },
    {
      title: 'View Analytics',
      description: 'Check performance metrics',
      icon: 'insights',
      route: '/analytics',
      color: 'primary'
    }
  ];

  constructor(
    private router: Router,
    private formSubmissionService: FormSubmissionService,
    private templateService: TemplateManagementService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private async loadDashboardData() {
    this.isLoading = true;

    try {
      // Load submissions data
      this.formSubmissionService.getAllSubmissions().subscribe({
        next: (submissions) => {
          const pendingCount = submissions.filter(s => s.status === 'draft' || s.status === 'submitted').length;

          // Update stats
          this.updateStat('Submissions', submissions.length);
          this.updateStat('Pending Review', pendingCount);
          this.updateStat('Active RFQs', submissions.filter(s => s.status !== 'completed').length);

          this.isLoading = false;
          this.lastUpdated = new Date();
        },
        error: (error) => {
          console.error('Error loading submissions:', error);
          this.isLoading = false;
        }
      });      // Load templates data
      this.templateService.getAllTemplates().subscribe({
        next: (templates) => {
          this.updateStat('Templates', templates.length);
        },
        error: (error) => {
          console.error('Error loading templates:', error);
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.isLoading = false;
    }
  }

  private updateStat(label: string, value: number | string) {
    const stat = this.stats.find(s => s.label === label);
    if (stat) {
      stat.value = value;
    }
  }

  navigate(link: string) {
    // Handle query parameters for filtered navigation
    if (link.includes('?')) {
      const [route, queryString] = link.split('?');
      const params = new URLSearchParams(queryString);
      const queryParams: any = {};

      params.forEach((value, key) => {
        queryParams[key] = value;
      });

      this.router.navigate([route], { queryParams });
    } else {
      this.router.navigate([link]);
    }
  }

  navigateToQuickAction(action: any) {
    this.navigate(action.route);
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  getTrendIcon(trend?: { direction: 'up' | 'down' | 'stable'; percentage: number }): string {
    if (!trend) return '';

    switch (trend.direction) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return '';
    }
  }

  getTrendColor(trend?: { direction: 'up' | 'down' | 'stable'; percentage: number }): string {
    if (!trend) return '';

    switch (trend.direction) {
      case 'up': return 'success';
      case 'down': return 'warn';
      case 'stable': return 'primary';
      default: return '';
    }
  }
}
