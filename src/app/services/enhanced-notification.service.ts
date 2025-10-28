import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { map, catchError, switchMap, tap, filter, retry, timeout } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { AuthBridgeService } from './auth-bridge.service';
import { UserManagementService } from './user-management.service';

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  category: NotificationCategory;
  actions?: NotificationAction[];
  template?: string;
  templateData?: Record<string, any>;
  companyId: string;
  createdBy: string;
  createdAt: Date;
}

export interface NotificationRecipient {
  id: string; // user ID, role name, device ID, or email address
  type: 'user' | 'role' | 'device' | 'email';
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  type: NotificationChannelType;
  config: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'danger';
  data?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipientId: string;
  recipientType: string;
  channel: NotificationChannelType;
  status: DeliveryStatus;
  attemptCount: number;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  response?: any;
}

export interface PushSubscription {
  id: string;
  userId: string;
  deviceId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'task_assignment'
  | 'task_completion'
  | 'task_overdue'
  | 'workflow_execution'
  | 'device_status'
  | 'system_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationCategory =
  | 'system'
  | 'task'
  | 'workflow'
  | 'device'
  | 'user'
  | 'security'
  | 'maintenance';

export type NotificationChannelType =
  | 'push'
  | 'email'
  | 'sms'
  | 'in_app'
  | 'webhook'
  | 'desktop';

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'expired';

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  emailSubject?: string;
  emailHtml?: string;
  smsText?: string;
  pushTitle?: string;
  pushBody?: string;
  variables: string[];
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  enabled: boolean;
  doNotDisturb: boolean;
  doNotDisturbUntil?: Date | string;
  categories?: Record<NotificationCategory, {
    enabled: boolean;
    channels: NotificationChannelType[];
    quietHours?: {
      start: string; // HH:mm format
      end: string;
    };
  }>;
  channels: {
    email?: {
      enabled: boolean;
      address: string;
      types?: NotificationType[];
      quietHours?: QuietHours;
    };
    sms?: {
      enabled: boolean;
      phoneNumber: string;
      types?: NotificationType[];
      quietHours?: QuietHours;
    };
    push?: {
      enabled: boolean;
      types?: NotificationType[];
      quietHours?: QuietHours;
    };
    inApp?: {
      enabled: boolean;
      types?: NotificationType[];
      showBadge: boolean;
      playSound: boolean;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      types?: NotificationType[];
      authToken?: string;
    };
  };
  emailDigest?: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    time?: string; // HH:mm format for daily/weekly
  };
  pushNotifications?: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    badge: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedNotificationService {
  private authBridgeService = inject(AuthBridgeService);
  private userManagementService = inject(UserManagementService);
  private snackBar = inject(MatSnackBar);

  // State management
  private notificationsSubject = new BehaviorSubject<NotificationConfig[]>([]);
  private deliveriesSubject = new BehaviorSubject<NotificationDelivery[]>([]);
  private templatesSubject = new BehaviorSubject<NotificationTemplate[]>([]);
  private preferencesSubject = new BehaviorSubject<NotificationPreferences[]>([]);
  private pushSubscriptionsSubject = new BehaviorSubject<PushSubscription[]>([]);

  // Signals for reactive state
  private notificationsSignal = signal<NotificationConfig[]>([]);
  private deliveriesSignal = signal<NotificationDelivery[]>([]);
  private templatesSignal = signal<NotificationTemplate[]>([]);
  private preferencesSignal = signal<NotificationPreferences[]>([]);
  private unreadCountSignal = signal<number>(0);

  // Computed properties
  recentNotifications = computed(() =>
    this.notificationsSignal()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  );

  unreadCount = computed(() => this.unreadCountSignal());

  urgentNotifications = computed(() =>
    this.notificationsSignal().filter(n => n.priority === 'urgent')
  );

  failedDeliveries = computed(() =>
    this.deliveriesSignal().filter(d => d.status === 'failed')
  );

  // Storage keys
  private readonly NOTIFICATIONS_KEY = 'notifications';
  private readonly DELIVERIES_KEY = 'notification_deliveries';
  private readonly TEMPLATES_KEY = 'notification_templates';
  private readonly PREFERENCES_KEY = 'notification_preferences';
  private readonly PUSH_SUBSCRIPTIONS_KEY = 'push_subscriptions';

  constructor() {
    this.initializeFromStorage();
    this.setupSubscriptions();
    this.initializePushNotifications();
    this.setupDefaultTemplates();
  }

  private initializeFromStorage(): void {
    try {
      const notificationsData = localStorage.getItem(this.NOTIFICATIONS_KEY);
      if (notificationsData) {
        const notifications = JSON.parse(notificationsData);
        this.notificationsSubject.next(notifications);
        this.notificationsSignal.set(notifications);
      }

      const deliveriesData = localStorage.getItem(this.DELIVERIES_KEY);
      if (deliveriesData) {
        const deliveries = JSON.parse(deliveriesData);
        this.deliveriesSubject.next(deliveries);
        this.deliveriesSignal.set(deliveries);
      }

      const templatesData = localStorage.getItem(this.TEMPLATES_KEY);
      if (templatesData) {
        const templates = JSON.parse(templatesData);
        this.templatesSubject.next(templates);
        this.templatesSignal.set(templates);
      }

      const preferencesData = localStorage.getItem(this.PREFERENCES_KEY);
      if (preferencesData) {
        const preferences = JSON.parse(preferencesData);
        this.preferencesSubject.next(preferences);
        this.preferencesSignal.set(preferences);
      }
    } catch (error) {
      console.error('Error loading notification data from storage:', error);
    }
  }

  private setupSubscriptions(): void {
    // Sync subjects with signals and localStorage
    this.notificationsSubject.subscribe(notifications => {
      this.notificationsSignal.set(notifications);
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
      this.updateUnreadCount();
    });

    this.deliveriesSubject.subscribe(deliveries => {
      this.deliveriesSignal.set(deliveries);
      localStorage.setItem(this.DELIVERIES_KEY, JSON.stringify(deliveries));
    });

    this.templatesSubject.subscribe(templates => {
      this.templatesSignal.set(templates);
      localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    });

    this.preferencesSubject.subscribe(preferences => {
      this.preferencesSignal.set(preferences);
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    });
  }

  private updateUnreadCount(): void {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    const unread = this.deliveriesSignal().filter(delivery =>
      delivery.recipientId === session.user.id &&
      delivery.status !== 'read'
    ).length;

    this.unreadCountSignal.set(unread);
  }

  /**
   * Send a notification
   */
  sendNotification(config: Omit<NotificationConfig, 'id' | 'createdAt' | 'createdBy' | 'companyId'>): Observable<NotificationConfig> {
    try {
      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const notification: NotificationConfig = {
        id: this.generateId(),
        ...config,
        companyId: session.user.companyId || '',
        createdBy: session.user.id,
        createdAt: new Date()
      };

      // Add to notifications list
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([...currentNotifications, notification]);

      // Process delivery through all channels
      return this.processNotificationDelivery(notification).pipe(
        map(() => notification),
        catchError(error => {
          console.error('Notification delivery failed:', error);
          return of(notification); // Return notification even if delivery fails
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Send notification using template
   */
  sendFromTemplate(
    templateId: string,
    recipients: NotificationRecipient[],
    templateData: Record<string, any> = {},
    options: Partial<NotificationConfig> = {}
  ): Observable<NotificationConfig> {
    const template = this.templatesSignal().find(t => t.id === templateId);
    if (!template) {
      return throwError(() => new Error('Template not found'));
    }

    const processedTitle = this.processTemplate(template.title, templateData);
    const processedMessage = this.processTemplate(template.message, templateData);

    return this.sendNotification({
      type: template.type,
      priority: 'normal',
      title: processedTitle,
      message: processedMessage,
      recipients,
      channels: [{ type: 'in_app', config: {} }],
      category: template.category,
      template: templateId,
      templateData,
      ...options
    });
  }

  /**
   * Send task assignment notification
   */
  sendTaskAssignmentNotification(
    taskId: string,
    taskTitle: string,
    assignedTo: string[],
    assignedBy: string,
    dueDate?: Date
  ): Observable<NotificationConfig> {
    const recipients: NotificationRecipient[] = assignedTo.map(userId => ({
      id: userId,
      type: 'user' as const
    }));

    return this.sendNotification({
      type: 'task_assignment',
      priority: 'normal',
      title: 'New Task Assignment',
      message: `You have been assigned a new task: ${taskTitle}`,
      recipients,
      channels: [
        { type: 'in_app', config: {} },
        { type: 'push', config: { title: 'New Task Assignment', body: taskTitle } }
      ],
      category: 'task',
      data: {
        taskId,
        assignedBy,
        dueDate: dueDate?.toISOString()
      },
      actions: [
        {
          id: 'view_task',
          label: 'View Task',
          action: 'navigate',
          style: 'primary',
          data: { route: `/tasks/${taskId}` }
        }
      ]
    });
  }

  /**
   * Send task completion notification
   */
  sendTaskCompletionNotification(
    taskId: string,
    taskTitle: string,
    completedBy: string,
    assignedBy: string
  ): Observable<NotificationConfig> {
    const recipients: NotificationRecipient[] = [{
      id: assignedBy,
      type: 'user'
    }];

    return this.sendNotification({
      type: 'task_completion',
      priority: 'normal',
      title: 'Task Completed',
      message: `Task "${taskTitle}" has been completed`,
      recipients,
      channels: [
        { type: 'in_app', config: {} },
        { type: 'push', config: { title: 'Task Completed', body: taskTitle } }
      ],
      category: 'task',
      data: {
        taskId,
        completedBy
      }
    });
  }

  /**
   * Send overdue task notification
   */
  sendTaskOverdueNotification(
    taskId: string,
    taskTitle: string,
    assignedTo: string[],
    daysOverdue: number
  ): Observable<NotificationConfig> {
    const recipients: NotificationRecipient[] = assignedTo.map(userId => ({
      id: userId,
      type: 'user' as const
    }));

    return this.sendNotification({
      type: 'task_overdue',
      priority: 'high',
      title: 'Task Overdue',
      message: `Task "${taskTitle}" is ${daysOverdue} day(s) overdue`,
      recipients,
      channels: [
        { type: 'in_app', config: {} },
        { type: 'push', config: { title: 'Task Overdue', body: `${taskTitle} - ${daysOverdue} days overdue` } },
        { type: 'email', config: { urgent: true } }
      ],
      category: 'task',
      data: {
        taskId,
        daysOverdue
      },
      actions: [
        {
          id: 'complete_task',
          label: 'Complete Now',
          action: 'complete_task',
          style: 'primary',
          data: { taskId }
        },
        {
          id: 'extend_deadline',
          label: 'Extend Deadline',
          action: 'extend_deadline',
          style: 'secondary',
          data: { taskId }
        }
      ]
    });
  }

  /**
   * Process notification delivery through all configured channels
   */
  private processNotificationDelivery(notification: NotificationConfig): Observable<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];

    notification.recipients.forEach(recipient => {
      notification.channels.forEach(channel => {
        const delivery: NotificationDelivery = {
          id: this.generateId(),
          notificationId: notification.id,
          recipientId: recipient.id,
          recipientType: recipient.type,
          channel: channel.type,
          status: 'pending',
          attemptCount: 0
        };

        deliveries.push(delivery);
      });
    });

    // Add deliveries to storage
    const currentDeliveries = this.deliveriesSubject.value;
    this.deliveriesSubject.next([...currentDeliveries, ...deliveries]);

    // Process each delivery
    const deliveryPromises = deliveries.map(delivery =>
      this.executeDelivery(delivery, notification)
    );

    return of(deliveries);
  }

  /**
   * Execute individual notification delivery
   */
  private executeDelivery(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    delivery.attemptCount++;
    delivery.sentAt = new Date();

    switch (delivery.channel) {
      case 'in_app':
        return this.deliverInApp(delivery, notification);
      case 'push':
        return this.deliverPush(delivery, notification);
      case 'email':
        return this.deliverEmail(delivery, notification);
      case 'sms':
        return this.deliverSMS(delivery, notification);
      case 'webhook':
        return this.deliverWebhook(delivery, notification);
      default:
        delivery.status = 'failed';
        delivery.failureReason = 'Unsupported channel type';
        return of(delivery);
    }
  }

  /**
   * Deliver in-app notification
   */
  private deliverInApp(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    try {
      // Show snack bar for immediate feedback
      const config: MatSnackBarConfig = {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: [`notification-${notification.type}`]
      };

      this.snackBar.open(notification.message, 'View', config);

      delivery.status = 'delivered';
      delivery.deliveredAt = new Date();
      this.updateDelivery(delivery);

      return of(delivery);
    } catch (error) {
      delivery.status = 'failed';
      delivery.failureReason = 'In-app delivery failed';
      this.updateDelivery(delivery);
      return of(delivery);
    }
  }

  /**
   * Deliver push notification
   */
  private deliverPush(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      delivery.status = 'failed';
      delivery.failureReason = 'Push notifications not supported';
      this.updateDelivery(delivery);
      return of(delivery);
    }

    try {
      // In a real implementation, this would send to a push service
      // For now, we'll simulate the delivery
      timer(1000).subscribe(() => {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        this.updateDelivery(delivery);
      });

      return of(delivery);
    } catch (error) {
      delivery.status = 'failed';
      delivery.failureReason = 'Push delivery failed';
      this.updateDelivery(delivery);
      return of(delivery);
    }
  }

  /**
   * Deliver email notification
   */
  private deliverEmail(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    // Simulate email delivery
    return timer(2000).pipe(
      map(() => {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        this.updateDelivery(delivery);
        return delivery;
      }),
      catchError(() => {
        delivery.status = 'failed';
        delivery.failureReason = 'Email delivery failed';
        this.updateDelivery(delivery);
        return of(delivery);
      })
    );
  }

  /**
   * Deliver SMS notification
   */
  private deliverSMS(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    // Simulate SMS delivery
    return timer(1500).pipe(
      map(() => {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        this.updateDelivery(delivery);
        return delivery;
      }),
      catchError(() => {
        delivery.status = 'failed';
        delivery.failureReason = 'SMS delivery failed';
        this.updateDelivery(delivery);
        return of(delivery);
      })
    );
  }

  /**
   * Deliver webhook notification
   */
  private deliverWebhook(delivery: NotificationDelivery, notification: NotificationConfig): Observable<NotificationDelivery> {
    // Simulate webhook delivery
    return timer(500).pipe(
      map(() => {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        this.updateDelivery(delivery);
        return delivery;
      }),
      catchError(() => {
        delivery.status = 'failed';
        delivery.failureReason = 'Webhook delivery failed';
        this.updateDelivery(delivery);
        return of(delivery);
      })
    );
  }

  /**
   * Update delivery status
   */
  private updateDelivery(updatedDelivery: NotificationDelivery): void {
    const currentDeliveries = this.deliveriesSubject.value;
    const index = currentDeliveries.findIndex(d => d.id === updatedDelivery.id);

    if (index >= 0) {
      const updatedDeliveries = [...currentDeliveries];
      updatedDeliveries[index] = updatedDelivery;
      this.deliveriesSubject.next(updatedDeliveries);
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string, userId: string): Observable<void> {
    const deliveries = this.deliveriesSubject.value;
    const userDeliveries = deliveries.filter(d =>
      d.notificationId === notificationId &&
      d.recipientId === userId
    );

    userDeliveries.forEach(delivery => {
      if (delivery.status !== 'read') {
        delivery.status = 'read';
        delivery.readAt = new Date();
      }
    });

    this.deliveriesSubject.next([...deliveries]);
    this.updateUnreadCount();

    return of(void 0);
  }



  /**
   * Process template with data
   */
  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(data[key] || ''));
    });
    return processed;
  }

  /**
   * Initialize push notifications
   */
  private async initializePushNotifications(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Push notification initialization failed:', error);
      }
    }
  }

  /**
   * Setup default notification templates
   */
  private setupDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'task_assignment',
        name: 'Task Assignment',
        category: 'task',
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: 'You have been assigned a new task: {{taskTitle}}',
        pushTitle: 'New Task Assignment',
        pushBody: '{{taskTitle}}',
        emailSubject: 'New Task Assignment - {{taskTitle}}',
        variables: ['taskTitle', 'assignedBy', 'dueDate'],
        isActive: true,
        companyId: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task_completion',
        name: 'Task Completion',
        category: 'task',
        type: 'task_completion',
        title: 'Task Completed',
        message: 'Task "{{taskTitle}}" has been completed by {{completedBy}}',
        pushTitle: 'Task Completed',
        pushBody: '{{taskTitle}}',
        variables: ['taskTitle', 'completedBy'],
        isActive: true,
        companyId: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'task_overdue',
        name: 'Task Overdue',
        category: 'task',
        type: 'task_overdue',
        title: 'Task Overdue',
        message: 'Task "{{taskTitle}}" is {{daysOverdue}} day(s) overdue',
        pushTitle: 'Task Overdue',
        pushBody: '{{taskTitle}} - {{daysOverdue}} days overdue',
        emailSubject: 'OVERDUE: {{taskTitle}}',
        variables: ['taskTitle', 'daysOverdue'],
        isActive: true,
        companyId: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Only add templates if none exist
    if (this.templatesSignal().length === 0) {
      this.templatesSubject.next(defaultTemplates);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): Observable<NotificationPreferences> {
    // Implementation would typically query database
    return of({
      id: `pref-${userId}`,
      userId,
      enabled: true,
      doNotDisturb: false,
      doNotDisturbUntil: undefined,
      channels: {
        email: {
          enabled: true,
          address: '',
          types: ['task_assignment', 'task_overdue', 'system_alert'],
          quietHours: { enabled: false, start: '22:00', end: '08:00' }
        },
        sms: {
          enabled: false,
          phoneNumber: '',
          types: ['task_overdue', 'system_alert', 'error'],
          quietHours: { enabled: true, start: '22:00', end: '08:00' }
        },
        push: {
          enabled: true,
          types: ['task_assignment', 'task_completion', 'task_overdue', 'system_alert'],
          quietHours: { enabled: false, start: '22:00', end: '08:00' }
        },
        inApp: {
          enabled: true,
          types: ['task_assignment', 'task_completion', 'task_overdue', 'workflow_execution', 'device_status', 'system_alert', 'success', 'error', 'warning', 'info'],
          showBadge: true,
          playSound: true
        },
        webhook: {
          enabled: false,
          url: '',
          types: [],
          authToken: ''
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(preferences: NotificationPreferences): Observable<void> {
    // Implementation would typically update database
    console.log('Updating user preferences:', preferences);
    return of(void 0);
  }

  /**
   * Request push notification permission
   */
  async requestPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support push notifications');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Push notification permission denied');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Push notification permission not granted');
    }

    return permission;
  }

  /**
   * Get user notifications with pagination
   */
  getUserNotifications(userId?: string, limit: number = 50, offset: number = 0): Observable<NotificationConfig[]> {
    const session = this.authBridgeService.getCurrentSession();
    const targetUserId = userId || session?.user.id;

    if (!targetUserId) {
      return of([]);
    }

    // Mock implementation - would typically query database
    const mockNotifications: NotificationConfig[] = [
      {
        id: 'notif-1',
        title: 'New Task Assignment',
        message: 'You have been assigned a new task: "Complete inspection report"',
        type: 'task_assignment',
        priority: 'high',
        category: 'task',
        channels: [
          { type: 'push', config: {} },
          { type: 'email', config: {} },
          { type: 'in_app', config: {} }
        ],
        recipients: [{ id: targetUserId, type: 'user' }],
        data: {
          taskId: 'task-123',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        actions: [
          {
            id: 'view-task',
            label: 'View Task',
            action: 'navigate',
            style: 'primary',
            data: { route: '/tasks/task-123' }
          },
          {
            id: 'complete-task',
            label: 'Mark Complete',
            action: 'complete_task',
            style: 'primary',
            data: { taskId: 'task-123' }
          }
        ],
        createdBy: 'system',
        companyId: session?.user.companyId || 'default',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: 'notif-2',
        title: 'Task Overdue',
        message: 'Task "Equipment maintenance" is now overdue',
        type: 'task_overdue',
        priority: 'urgent',
        category: 'task',
        channels: [
          { type: 'push', config: {} },
          { type: 'email', config: {} },
          { type: 'sms', config: {} },
          { type: 'in_app', config: {} }
        ],
        recipients: [{ id: targetUserId, type: 'user' }],
        data: {
          taskId: 'task-456',
          dueDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        actions: [
          {
            id: 'extend-deadline',
            label: 'Extend Deadline',
            action: 'extend_deadline',
            style: 'secondary',
            data: { taskId: 'task-456' }
          }
        ],
        createdBy: 'system',
        companyId: session?.user.companyId || 'default',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: 'notif-3',
        title: 'System Maintenance',
        message: 'Scheduled system maintenance will begin at 2:00 AM',
        type: 'system_alert',
        priority: 'normal',
        category: 'system',
        channels: [
          { type: 'push', config: {} },
          { type: 'email', config: {} },
          { type: 'in_app', config: {} }
        ],
        recipients: [{ id: targetUserId, type: 'user' }],
        data: {
          maintenanceWindow: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        },
        createdBy: 'admin',
        companyId: session?.user.companyId || 'default',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      }
    ];

    return of(mockNotifications.slice(offset, offset + limit));
  }

  // Legacy methods for backward compatibility
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['notification-success']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['notification-error']
    });
  }

  showWarning(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['notification-warning']
    });
  }

  showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['notification-info']
    });
  }

  // Getter methods for observables
  get notifications$(): Observable<NotificationConfig[]> {
    return this.notificationsSubject.asObservable();
  }

  get deliveries$(): Observable<NotificationDelivery[]> {
    return this.deliveriesSubject.asObservable();
  }

  get templates$(): Observable<NotificationTemplate[]> {
    return this.templatesSubject.asObservable();
  }
}
