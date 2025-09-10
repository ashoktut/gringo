import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FormSubmissionService } from '../../services/form-submission.service';
import { TemplateManagementService } from '../../services/template-management.service';

interface AnalyticsData {
  submissions: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
    byStatus: { [key: string]: number };
    byDate: { date: string; count: number }[];
  };
  templates: {
    total: number;
    mostUsed: { name: string; usage: number }[];
    usageByTemplate: { [key: string]: number };
  };
  performance: {
    avgCompletionTime: number;
    completionRate: number;
    errorRate: number;
    userSatisfaction: number;
  };
}

interface ChartConfig {
  title: string;
  type: 'bar' | 'pie' | 'line' | 'doughnut';
  data: number[] | { label: string; value: number }[];
  description: string;
  color?: string;
  unit?: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  isLoading = true;
  selectedPeriod = '30days';
  startDate: Date | null = null;
  endDate: Date | null = null;

  analytics: AnalyticsData = {
    submissions: {
      total: 0,
      thisMonth: 0,
      lastMonth: 0,
      growthRate: 0,
      byStatus: {},
      byDate: []
    },
    templates: {
      total: 0,
      mostUsed: [],
      usageByTemplate: {}
    },
    performance: {
      avgCompletionTime: 0,
      completionRate: 0,
      errorRate: 0,
      userSatisfaction: 0
    }
  };

  // Enhanced charts with real data integration
  charts: ChartConfig[] = [
    {
      title: 'Submissions Over Time',
      type: 'line',
      data: [],
      description: 'Track submission trends over selected period',
      color: 'primary',
      unit: 'submissions'
    },
    {
      title: 'Submissions by Status',
      type: 'pie',
      data: [],
      description: 'Distribution of submission statuses',
      color: 'accent'
    },
    {
      title: 'Template Usage',
      type: 'bar',
      data: [],
      description: 'Most frequently used templates',
      color: 'warn',
      unit: 'uses'
    },
    {
      title: 'Completion Rate',
      type: 'doughnut',
      data: [],
      description: 'Form completion vs abandonment rate',
      color: 'primary',
      unit: '%'
    }
  ];

  periodOptions = [
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
    { value: '90days', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' }
  ];

  constructor(
    private formSubmissionService: FormSubmissionService,
    private templateService: TemplateManagementService
  ) {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  private async loadAnalyticsData() {
    this.isLoading = true;

    try {
      // Load submissions data
      this.formSubmissionService.getAllSubmissions().subscribe({
        next: (submissions) => {
          this.processSubmissionsData(submissions);
          this.updateCharts();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading submissions for analytics:', error);
          this.isLoading = false;
        }
      });

      // Load templates data
      this.templateService.getAllTemplates().subscribe({
        next: (templates) => {
          this.processTemplatesData(templates);
          this.updateCharts();
        },
        error: (error) => {
          console.error('Error loading templates for analytics:', error);
        }
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
      this.isLoading = false;
    }
  }

  private processSubmissionsData(submissions: any[]) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

    // Calculate basic metrics
    this.analytics.submissions.total = submissions.length;
    this.analytics.submissions.thisMonth = submissions.filter(s =>
      new Date(s.submittedAt).getMonth() === thisMonth
    ).length;
    this.analytics.submissions.lastMonth = submissions.filter(s =>
      new Date(s.submittedAt).getMonth() === lastMonth
    ).length;

    // Calculate growth rate
    if (this.analytics.submissions.lastMonth > 0) {
      this.analytics.submissions.growthRate =
        ((this.analytics.submissions.thisMonth - this.analytics.submissions.lastMonth) /
         this.analytics.submissions.lastMonth) * 100;
    }

    // Group by status
    this.analytics.submissions.byStatus = submissions.reduce((acc, submission) => {
      const status = submission.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Group by date for trending
    const dateGroups = submissions.reduce((acc, submission) => {
      const date = new Date(submission.submittedAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    this.analytics.submissions.byDate = Object.entries(dateGroups)
      .map(([date, count]) => ({ date, count: count as number }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate performance metrics
    this.calculatePerformanceMetrics(submissions);
  }

  private processTemplatesData(templates: any[]) {
    this.analytics.templates.total = templates.length;

    // Mock template usage data (replace with real usage tracking)
    this.analytics.templates.mostUsed = templates.map(template => ({
      name: template.name,
      usage: Math.floor(Math.random() * 100) + 1
    })).sort((a, b) => b.usage - a.usage).slice(0, 5);

    this.analytics.templates.usageByTemplate = this.analytics.templates.mostUsed
      .reduce((acc, template) => {
        acc[template.name] = template.usage;
        return acc;
      }, {} as { [key: string]: number });
  }

  private calculatePerformanceMetrics(submissions: any[]) {
    const completedSubmissions = submissions.filter(s => s.status === 'completed');

    // Mock performance data (replace with real tracking)
    this.analytics.performance = {
      avgCompletionTime: 15.5, // minutes
      completionRate: completedSubmissions.length / submissions.length * 100,
      errorRate: Math.random() * 5, // 0-5%
      userSatisfaction: 85 + Math.random() * 10 // 85-95%
    };
  }

  private updateCharts() {
    // Update submissions over time chart
    this.charts[0].data = this.analytics.submissions.byDate.map(item => item.count);

    // Update submissions by status chart
    this.charts[1].data = Object.entries(this.analytics.submissions.byStatus)
      .map(([label, value]) => ({ label, value }));

    // Update template usage chart
    this.charts[2].data = this.analytics.templates.mostUsed.map(template => template.usage);

    // Update completion rate chart
    this.charts[3].data = [
      { label: 'Completed', value: this.analytics.performance.completionRate },
      { label: 'Incomplete', value: 100 - this.analytics.performance.completionRate }
    ];
  }

  getChartIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'bar': 'bar_chart',
      'pie': 'pie_chart',
      'line': 'trending_up',
      'doughnut': 'donut_large'
    };
    return iconMap[type] || 'bar_chart';
  }

  onPeriodChange() {
    if (this.selectedPeriod !== 'custom') {
      this.startDate = null;
      this.endDate = null;
    }
    this.loadAnalyticsData();
  }

  onDateRangeChange() {
    if (this.startDate && this.endDate) {
      this.loadAnalyticsData();
    }
  }

  refreshAnalytics() {
    this.loadAnalyticsData();
  }

  exportAnalytics() {
    // Prepare data for export
    const exportData = {
      period: this.selectedPeriod,
      generatedAt: new Date().toISOString(),
      data: this.analytics
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getGrowthTrendIcon(): string {
    if (this.analytics.submissions.growthRate > 0) return 'trending_up';
    if (this.analytics.submissions.growthRate < 0) return 'trending_down';
    return 'trending_flat';
  }

  getGrowthTrendColor(): string {
    if (this.analytics.submissions.growthRate > 0) return 'primary';
    if (this.analytics.submissions.growthRate < 0) return 'warn';
    return 'accent';
  }

  formatNumber(value: number, decimals: number = 0): string {
    return value.toFixed(decimals);
  }
}
