import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EnhancedNotificationService,
  NotificationConfig,
  NotificationDelivery,
  NotificationType,
  NotificationPriority,
  NotificationCategory
} from '../../services/enhanced-notification.service';
import { AuthBridgeService } from '../../services/auth-bridge.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatBadgeModule,
    MatMenuModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notification-center">
      <div class="notification-header">
        <h2>
          <mat-icon>notifications</mat-icon>
          Notifications
          @if (unreadCount() > 0) {
            <mat-chip class="unread-badge" color="accent" selected>
              {{ unreadCount() }}
            </mat-chip>
          }
        </h2>

        <div class="header-actions">
          <button mat-icon-button matTooltip="Mark all as read" (click)="markAllAsRead()">
            <mat-icon>done_all</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Refresh" (click)="refreshNotifications()">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-icon-button [matMenuTriggerFor]="filterMenu" matTooltip="Filter">
            <mat-icon>filter_list</mat-icon>
          </button>
          <mat-menu #filterMenu="matMenu">
            <button mat-menu-item (click)="setFilter('all')">
              <mat-icon>notifications</mat-icon>
              All Notifications
            </button>
            <button mat-menu-item (click)="setFilter('unread')">
              <mat-icon>mark_email_unread</mat-icon>
              Unread Only
            </button>
            <button mat-menu-item (click)="setFilter('task')">
              <mat-icon>assignment</mat-icon>
              Task Notifications
            </button>
            <button mat-menu-item (click)="setFilter('system')">
              <mat-icon>settings</mat-icon>
              System Notifications
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="notification-stats">
        <div class="stat-item">
          <mat-icon class="stat-icon">notifications</mat-icon>
          <div class="stat-content">
            <div class="stat-value">{{ filteredNotifications().length }}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>

        <div class="stat-item">
          <mat-icon class="stat-icon unread">mark_email_unread</mat-icon>
          <div class="stat-content">
            <div class="stat-value">{{ unreadCount() }}</div>
            <div class="stat-label">Unread</div>
          </div>
        </div>

        <div class="stat-item">
          <mat-icon class="stat-icon urgent">priority_high</mat-icon>
          <div class="stat-content">
            <div class="stat-value">{{ urgentCount() }}</div>
            <div class="stat-label">Urgent</div>
          </div>
        </div>

        <div class="stat-item">
          <mat-icon class="stat-icon today">today</mat-icon>
          <div class="stat-content">
            <div class="stat-value">{{ todayCount() }}</div>
            <div class="stat-label">Today</div>
          </div>
        </div>
      </div>

      <!-- Notification List -->
      <mat-card class="notification-list-card">
        <mat-card-header>
          <mat-card-title>
            {{ currentFilterLabel() }}
            @if (filteredNotifications().length > 0) {
              <span class="count-badge">({{ filteredNotifications().length }})</span>
            }
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (filteredNotifications().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">notifications_none</mat-icon>
              <h3>No notifications</h3>
              <p>{{ getEmptyStateMessage() }}</p>
            </div>
          } @else {
            <mat-list class="notification-list">
              @for (notification of filteredNotifications(); track notification.id) {
                <mat-list-item
                  class="notification-item"
                  [class.unread]="isUnread(notification)"
                  [class.urgent]="notification.priority === 'urgent'"
                  (click)="markAsRead(notification)">

                  <div class="notification-content">
                    <div class="notification-header-row">
                      <div class="notification-icon">
                        <mat-icon [color]="getNotificationColor(notification.type)">
                          {{ getNotificationIcon(notification.type) }}
                        </mat-icon>
                      </div>

                      <div class="notification-title">
                        {{ notification.title }}
                        @if (notification.priority === 'urgent') {
                          <mat-chip class="priority-chip urgent" selected>
                            <mat-icon>priority_high</mat-icon>
                            URGENT
                          </mat-chip>
                        }
                        @if (notification.priority === 'high') {
                          <mat-chip class="priority-chip high" selected>
                            HIGH
                          </mat-chip>
                        }
                      </div>

                      <div class="notification-time">
                        {{ getTimeAgo(notification.createdAt) }}
                      </div>

                      <button mat-icon-button [matMenuTriggerFor]="notificationMenu" (click)="$event.stopPropagation()">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #notificationMenu="matMenu">
                        @if (isUnread(notification)) {
                          <button mat-menu-item (click)="markAsRead(notification)">
                            <mat-icon>mark_email_read</mat-icon>
                            Mark as Read
                          </button>
                        } @else {
                          <button mat-menu-item (click)="markAsUnread(notification)">
                            <mat-icon>mark_email_unread</mat-icon>
                            Mark as Unread
                          </button>
                        }
                        <button mat-menu-item (click)="deleteNotification(notification)">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-menu>
                    </div>

                    <div class="notification-message">
                      {{ notification.message }}
                    </div>

                    @if (notification.actions && notification.actions.length > 0) {
                      <div class="notification-actions">
                        @for (action of notification.actions; track action.id) {
                          <button
                            mat-button
                            [color]="action.style === 'primary' ? 'primary' : action.style === 'danger' ? 'warn' : ''"
                            (click)="executeAction(notification, action); $event.stopPropagation()">
                            {{ action.label }}
                          </button>
                        }
                      </div>
                    }

                    <div class="notification-metadata">
                      <mat-chip class="category-chip" selected>
                        {{ getCategoryLabel(notification.category) }}
                      </mat-chip>

                      @if (notification.data) {
                        <div class="notification-data">
                          @if (notification.data['taskId']) {
                            <span class="data-item">
                              <mat-icon>assignment</mat-icon>
                              Task ID: {{ notification.data['taskId'] }}
                            </span>
                          }
                          @if (notification.data['dueDate']) {
                            <span class="data-item">
                              <mat-icon>schedule</mat-icon>
                              Due: {{ notification.data['dueDate'] | date:'short' }}
                            </span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </mat-list-item>

                @if (!$last) {
                  <mat-divider></mat-divider>
                }
              }
            </mat-list>
          }
        </mat-card-content>
      </mat-card>

      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate" class="loading-bar"></mat-progress-bar>
      }
    </div>
  `,
  styles: [`
    .notification-center {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 500;

        .unread-badge {
          font-size: 0.75rem;
          height: 20px;
          min-height: 20px;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .notification-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;

        .stat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: rgba(0, 0, 0, 0.6);

          &.unread { color: #ff9800; }
          &.urgent { color: #f44336; }
          &.today { color: #2196f3; }
        }

        .stat-content {
          .stat-value {
            font-size: 1.25rem;
            font-weight: 600;
            line-height: 1;
          }

          .stat-label {
            font-size: 0.75rem;
            color: rgba(0, 0, 0, 0.6);
            margin-top: 2px;
          }
        }
      }
    }

    .notification-list-card {
      .count-badge {
        color: rgba(0, 0, 0, 0.6);
        font-weight: normal;
        font-size: 0.9rem;
      }
    }

    .notification-list {
      padding: 0;

      .notification-item {
        padding: 16px 0;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        &.unread {
          background-color: rgba(25, 118, 210, 0.04);
          border-left: 4px solid #1976d2;
          padding-left: 12px;
        }

        &.urgent {
          background-color: rgba(244, 67, 54, 0.04);
          border-left: 4px solid #f44336;
          padding-left: 12px;
        }

        .notification-content {
          width: 100%;

          .notification-header-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 8px;

            .notification-icon {
              flex-shrink: 0;
              margin-top: 2px;
            }

            .notification-title {
              flex: 1;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 8px;

              .priority-chip {
                font-size: 0.65rem;
                height: 20px;
                min-height: 20px;

                &.urgent {
                  background-color: #f44336 !important;
                  color: white !important;
                }

                &.high {
                  background-color: #ff9800 !important;
                  color: white !important;
                }

                mat-icon {
                  font-size: 14px;
                  width: 14px;
                  height: 14px;
                }
              }
            }

            .notification-time {
              flex-shrink: 0;
              font-size: 0.75rem;
              color: rgba(0, 0, 0, 0.6);
              margin-top: 2px;
            }
          }

          .notification-message {
            margin-left: 36px;
            margin-bottom: 12px;
            color: rgba(0, 0, 0, 0.8);
            line-height: 1.4;
          }

          .notification-actions {
            margin-left: 36px;
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .notification-metadata {
            margin-left: 36px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;

            .category-chip {
              font-size: 0.7rem;
              height: 20px;
              min-height: 20px;
            }

            .notification-data {
              display: flex;
              gap: 16px;
              flex-wrap: wrap;

              .data-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.75rem;
                color: rgba(0, 0, 0, 0.6);

                mat-icon {
                  font-size: 14px;
                  width: 14px;
                  height: 14px;
                }
              }
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: rgba(0, 0, 0, 0.3);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        color: rgba(0, 0, 0, 0.6);
      }

      p {
        margin: 0;
        color: rgba(0, 0, 0, 0.4);
      }
    }

    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }
  `]
})
export class NotificationCenterComponent implements OnInit {
  private enhancedNotificationService = inject(EnhancedNotificationService);
  private authBridgeService = inject(AuthBridgeService);

  // State signals
  notifications = signal<NotificationConfig[]>([]);
  deliveries = signal<NotificationDelivery[]>([]);
  currentFilter = signal<string>('all');
  isLoading = signal(false);

  // Computed properties
  unreadCount = computed(() => this.enhancedNotificationService.unreadCount());

  filteredNotifications = computed(() => {
    const filter = this.currentFilter();
    const allNotifications = this.notifications();

    switch (filter) {
      case 'unread':
        return allNotifications.filter(n => this.isUnread(n));
      case 'task':
        return allNotifications.filter(n => n.category === 'task');
      case 'system':
        return allNotifications.filter(n => n.category === 'system');
      default:
        return allNotifications;
    }
  });

  urgentCount = computed(() =>
    this.notifications().filter(n => n.priority === 'urgent').length
  );

  todayCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.notifications().filter(n =>
      new Date(n.createdAt) >= today
    ).length;
  });

  ngOnInit() {
    this.loadNotifications();
  }

  private loadNotifications() {
    this.isLoading.set(true);

    this.enhancedNotificationService.getUserNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
        this.isLoading.set(false);
      }
    });

    // Load deliveries for read status
    this.enhancedNotificationService.deliveries$.subscribe(deliveries => {
      this.deliveries.set(deliveries);
    });
  }

  setFilter(filter: string) {
    this.currentFilter.set(filter);
  }

  currentFilterLabel(): string {
    const filter = this.currentFilter();
    switch (filter) {
      case 'unread': return 'Unread Notifications';
      case 'task': return 'Task Notifications';
      case 'system': return 'System Notifications';
      default: return 'All Notifications';
    }
  }

  getEmptyStateMessage(): string {
    const filter = this.currentFilter();
    switch (filter) {
      case 'unread': return 'All notifications have been read.';
      case 'task': return 'No task-related notifications.';
      case 'system': return 'No system notifications.';
      default: return 'No notifications to display.';
    }
  }

  isUnread(notification: NotificationConfig): boolean {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return false;

    return this.deliveries().some(delivery =>
      delivery.notificationId === notification.id &&
      delivery.recipientId === session.user.id &&
      delivery.status !== 'read'
    );
  }

  markAsRead(notification: NotificationConfig) {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    this.enhancedNotificationService.markAsRead(notification.id, session.user.id).subscribe();
  }

  markAsUnread(notification: NotificationConfig) {
    // Implementation for marking as unread would go here
    console.log('Mark as unread:', notification);
  }

  markAllAsRead() {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    const unreadNotifications = this.notifications().filter(n => this.isUnread(n));
    unreadNotifications.forEach(notification => {
      this.enhancedNotificationService.markAsRead(notification.id, session.user.id).subscribe();
    });
  }

  deleteNotification(notification: NotificationConfig) {
    // Implementation for deleting notification would go here
    console.log('Delete notification:', notification);
  }

  refreshNotifications() {
    this.loadNotifications();
  }

  executeAction(notification: NotificationConfig, action: any) {
    console.log('Execute action:', action, 'for notification:', notification);

    // Mark as read when action is executed
    this.markAsRead(notification);

    // Handle different action types
    switch (action.action) {
      case 'navigate':
        if (action.data?.route) {
          // In a real app, you would use Angular Router
          console.log('Navigate to:', action.data.route);
        }
        break;
      case 'complete_task':
        console.log('Complete task:', action.data?.taskId);
        break;
      case 'extend_deadline':
        console.log('Extend deadline for task:', action.data?.taskId);
        break;
      default:
        console.log('Unknown action:', action.action);
    }
  }

  getNotificationIcon(type: NotificationType): string {
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

  getNotificationColor(type: NotificationType): string {
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

  getCategoryLabel(category: NotificationCategory): string {
    switch (category) {
      case 'task': return 'Task';
      case 'workflow': return 'Workflow';
      case 'device': return 'Device';
      case 'system': return 'System';
      case 'user': return 'User';
      case 'security': return 'Security';
      case 'maintenance': return 'Maintenance';
      default: return 'General';
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
