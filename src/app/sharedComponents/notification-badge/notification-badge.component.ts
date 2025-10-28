import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { EnhancedNotificationService } from '../../services/enhanced-notification.service';

@Component({
  selector: 'app-notification-badge',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    RouterModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      [matBadge]="unreadCount() > 0 ? unreadCount() : null"
      [matBadgeHidden]="unreadCount() === 0"
      matBadgeColor="warn"
      matBadgeSize="small"
      [matMenuTriggerFor]="notificationMenu"
      matTooltip="Notifications"
      class="notification-badge-button">
      <mat-icon>notifications</mat-icon>
    </button>

    <mat-menu #notificationMenu="matMenu" class="notification-menu">
      <div class="notification-menu-header">
        <h3>Notifications</h3>
        @if (unreadCount() > 0) {
          <span class="unread-count">{{ unreadCount() }} unread</span>
        }
      </div>

      <mat-divider></mat-divider>

      <div class="notification-menu-content">
        @if (recentNotifications().length === 0) {
          <div class="no-notifications">
            <mat-icon>notifications_none</mat-icon>
            <p>No new notifications</p>
          </div>
        } @else {
          @for (notification of recentNotifications(); track notification.id) {
            <div class="notification-item" [class.unread]="isUnread(notification)">
              <div class="notification-icon">
                <mat-icon [color]="getNotificationColor(notification.type)">
                  {{ getNotificationIcon(notification.type) }}
                </mat-icon>
              </div>
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-time">{{ getTimeAgo(notification.createdAt) }}</div>
              </div>
              @if (isUnread(notification)) {
                <div class="unread-indicator"></div>
              }
            </div>
            @if (!$last) {
              <mat-divider></mat-divider>
            }
          }
        }
      </div>

      <mat-divider></mat-divider>

      <div class="notification-menu-actions">
        @if (unreadCount() > 0) {
          <button mat-menu-item (click)="markAllAsRead()">
            <mat-icon>done_all</mat-icon>
            Mark all as read
          </button>
        }
        <button mat-menu-item routerLink="/notifications">
          <mat-icon>list</mat-icon>
          View all notifications
        </button>
        <button mat-menu-item routerLink="/notification-preferences">
          <mat-icon>settings</mat-icon>
          Notification settings
        </button>
      </div>
    </mat-menu>
  `,
  styles: [`
    .notification-badge-button {
      position: relative;
    }

    .notification-menu {
      width: 360px;
      max-width: 90vw;
    }

    .notification-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 500;
      }

      .unread-count {
        font-size: 0.75rem;
        color: #f44336;
        font-weight: 500;
      }
    }

    .notification-menu-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      color: rgba(0, 0, 0, 0.6);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.3);
      }

      p {
        margin: 0;
        font-size: 0.875rem;
      }
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      position: relative;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }

      &.unread {
        background-color: rgba(25, 118, 210, 0.04);
      }

      .notification-icon {
        flex-shrink: 0;
        margin-right: 12px;
        margin-top: 2px;
      }

      .notification-content {
        flex: 1;
        min-width: 0;

        .notification-title {
          font-weight: 500;
          font-size: 0.875rem;
          line-height: 1.2;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notification-message {
          font-size: 0.75rem;
          color: rgba(0, 0, 0, 0.7);
          line-height: 1.3;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-time {
          font-size: 0.65rem;
          color: rgba(0, 0, 0, 0.5);
        }
      }

      .unread-indicator {
        position: absolute;
        left: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        background-color: #1976d2;
        border-radius: 50%;
      }
    }

    .notification-menu-actions {
      padding: 8px 0;

      button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;

        mat-icon {
          margin: 0;
        }
      }
    }

    /* Scrollbar styling */
    .notification-menu-content::-webkit-scrollbar {
      width: 4px;
    }

    .notification-menu-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .notification-menu-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }

    .notification-menu-content::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.3);
    }
  `]
})
export class NotificationBadgeComponent {
  private enhancedNotificationService = inject(EnhancedNotificationService);

  // Computed properties
  unreadCount = computed(() => this.enhancedNotificationService.unreadCount());
  recentNotifications = computed(() =>
    this.enhancedNotificationService.recentNotifications().slice(0, 5)
  );

  isUnread(notification: any): boolean {
    // This would typically check against delivery status
    return true; // Simplified for demo
  }

  markAllAsRead() {
    // Implementation would mark all notifications as read
    console.log('Mark all notifications as read');
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'task_assignment': return 'assignment_ind';
      case 'task_completion': return 'check_circle';
      case 'task_overdue': return 'schedule';
      case 'workflow_execution': return 'timeline';
      case 'device_status': return 'devices';
      case 'system_alert': return 'warning';
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info':
      default: return 'info';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'task_assignment': return 'primary';
      case 'task_completion': return 'primary';
      case 'task_overdue': return 'warn';
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'success': return 'primary';
      default: return '';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}
