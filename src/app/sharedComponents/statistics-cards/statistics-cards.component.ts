import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RoleStats } from '../../models/role.models';

export interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

@Component({
  selector: 'app-statistics-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stats-grid" role="region" aria-label="Statistics Overview">
      @for (stat of statisticsCards(); track stat.label) {
        <mat-card
          class="stat-card"
          [ngClass]="stat.color"
          [attr.aria-label]="getAriaLabel(stat)"
          role="article">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-header">
                <div class="stat-value-container">
                  <div
                    class="stat-value"
                    [attr.aria-live]="'polite'"
                    [attr.aria-atomic]="'true'">
                    {{ formatValue(stat.value) }}
                  </div>
                  @if (stat.trend) {
                    <div
                      class="stat-trend"
                      [ngClass]="{ 'positive': stat.trend.isPositive, 'negative': !stat.trend.isPositive }"
                      [attr.aria-label]="getTrendAriaLabel(stat.trend)">
                      <mat-icon class="trend-icon">
                        {{ stat.trend.isPositive ? 'trending_up' : 'trending_down' }}
                      </mat-icon>
                      <span class="trend-value">{{ Math.abs(stat.trend.value) }}%</span>
                    </div>
                  }
                </div>
                <mat-icon
                  class="stat-icon"
                  [attr.aria-label]="stat.icon + ' icon'">
                  {{ stat.icon }}
                </mat-icon>
              </div>
              <div class="stat-label">{{ stat.label }}</div>
              @if (stat.description) {
                <div class="stat-description">{{ stat.description }}</div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      transition: all 0.3s ease;
      cursor: default;
      position: relative;
      overflow: hidden;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--card-accent-color, #e0e0e0);
      transition: background-color 0.3s ease;
    }

    .stat-card.primary::before {
      --card-accent-color: var(--mdc-theme-primary, #1976d2);
    }

    .stat-card.accent::before {
      --card-accent-color: var(--mdc-theme-secondary, #dc004e);
    }

    .stat-card.success::before {
      --card-accent-color: #4caf50;
    }

    .stat-card.warning::before {
      --card-accent-color: #ff9800;
    }

    .stat-card.danger::before {
      --card-accent-color: #f44336;
    }

    .stat-content {
      padding: 0.5rem 0;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .stat-value-container {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 600;
      line-height: 1;
      color: var(--mdc-theme-on-surface, #333);
    }

    .stat-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-trend.positive {
      color: #4caf50;
    }

    .stat-trend.negative {
      color: #f44336;
    }

    .trend-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .stat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      opacity: 0.7;
      color: var(--card-accent-color, #666);
    }

    .stat-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--mdc-theme-on-surface, #666);
      margin-bottom: 0.25rem;
    }

    .stat-description {
      font-size: 0.75rem;
      color: var(--mdc-theme-on-surface, #999);
      line-height: 1.3;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .stat-value {
        font-size: 1.75rem;
      }

      .stat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .stat-card {
        border: 2px solid;
      }

      .stat-value {
        font-weight: 700;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .stat-card {
        transition: none;
      }

      .stat-card:hover {
        transform: none;
      }
    }
  `]
})
export class StatisticsCardsComponent {
  @Input({ required: true }) stats!: RoleStats;
  @Input() showTrends = false;
  @Input() customCards?: StatCard[];

  protected readonly Math = Math;

  readonly statisticsCards = computed<StatCard[]>(() => {
    if (this.customCards) {
      return this.customCards;
    }

    const stats = this.stats;
    if (!stats) return [];

    return [
      {
        label: 'Total Roles',
        value: stats.totalRoles,
        icon: 'account_box',
        color: 'default',
        description: 'All roles in the system'
      },
      {
        label: 'System Roles',
        value: stats.systemRoles,
        icon: 'admin_panel_settings',
        color: 'primary',
        description: 'Global system-wide roles'
      },
      {
        label: 'Company Roles',
        value: stats.companyRoles,
        icon: 'business',
        color: 'accent',
        description: 'Company-specific roles'
      },
      {
        label: 'Active Roles',
        value: stats.activeRoles,
        icon: 'check_circle',
        color: 'success',
        description: 'Currently active and usable roles'
      }
    ];
  });

  protected formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  protected getAriaLabel(stat: StatCard): string {
    let label = `${stat.label}: ${stat.value}`;
    if (stat.trend) {
      const trendDirection = stat.trend.isPositive ? 'increased' : 'decreased';
      label += `, ${trendDirection} by ${Math.abs(stat.trend.value)}%`;
    }
    if (stat.description) {
      label += `. ${stat.description}`;
    }
    return label;
  }

  protected getTrendAriaLabel(trend: { value: number; isPositive: boolean }): string {
    const direction = trend.isPositive ? 'increased' : 'decreased';
    return `${direction} by ${Math.abs(trend.value)} percent`;
  }
}
