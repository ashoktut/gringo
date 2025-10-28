import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EnhancedNotificationService,
  NotificationPreferences,
  NotificationChannel,
  NotificationCategory,
  NotificationType,
  NotificationPriority
} from '../../services/enhanced-notification.service';
import { AuthBridgeService } from '../../services/auth-bridge.service';

interface ChannelSettings {
  email: {
    enabled: boolean;
    address: string;
    types: NotificationType[];
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  sms: {
    enabled: boolean;
    phoneNumber: string;
    types: NotificationType[];
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  push: {
    enabled: boolean;
    types: NotificationType[];
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[];
    showBadge: boolean;
    playSound: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    types: NotificationType[];
    authToken?: string;
  };
}

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatTableModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notification-preferences">
      <div class="preferences-header">
        <h2>
          <mat-icon>tune</mat-icon>
          Notification Preferences
        </h2>
        <p>Customize how and when you receive notifications</p>
      </div>

      <form [formGroup]="preferencesForm" (ngSubmit)="savePreferences()">
        <!-- Global Settings -->
        <mat-card class="preference-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>settings</mat-icon>
              Global Settings
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="setting-row">
              <div class="setting-label">
                <strong>Enable Notifications</strong>
                <p>Turn all notifications on or off</p>
              </div>
              <mat-slide-toggle formControlName="enabled" color="primary">
                {{ preferencesForm.get('enabled')?.value ? 'Enabled' : 'Disabled' }}
              </mat-slide-toggle>
            </div>

            <mat-divider></mat-divider>

            <div class="setting-row">
              <div class="setting-label">
                <strong>Do Not Disturb</strong>
                <p>Temporarily disable all notifications</p>
              </div>
              <mat-slide-toggle formControlName="doNotDisturb" color="accent">
                {{ preferencesForm.get('doNotDisturb')?.value ? 'On' : 'Off' }}
              </mat-slide-toggle>
            </div>

            @if (preferencesForm.get('doNotDisturb')?.value) {
              <div class="dnd-settings">
                <mat-form-field appearance="outline">
                  <mat-label>Do Not Disturb Until</mat-label>
                  <input matInput type="datetime-local" formControlName="doNotDisturbUntil">
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Channel-Specific Settings -->
        <mat-accordion class="channel-accordion">
          <!-- Email Notifications -->
          <mat-expansion-panel class="channel-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>email</mat-icon>
                Email Notifications
              </mat-panel-title>
              <mat-panel-description>
                Configure email delivery settings
                <mat-chip [color]="channelSettings().email.enabled ? 'primary' : ''">
                  {{ channelSettings().email.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="channel-content">
              <div class="setting-row">
                <div class="setting-label">
                  <strong>Enable Email Notifications</strong>
                </div>
                <mat-slide-toggle [(ngModel)]="channelSettings().email.enabled" color="primary">
                </mat-slide-toggle>
              </div>

              @if (channelSettings().email.enabled) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email Address</mat-label>
                  <input matInput type="email" [(ngModel)]="channelSettings().email.address" placeholder="your@email.com">
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>

                <div class="notification-types">
                  <h4>Notification Types</h4>
                  <div class="type-chips">
                    @for (type of availableTypes; track type.value) {
                      <mat-chip
                        (click)="toggleType('email', type.value)"
                        [color]="isTypeEnabled('email', type.value) ? 'primary' : ''"
                        class="type-chip">
                        <mat-icon>{{ type.icon }}</mat-icon>
                        {{ type.label }}
                      </mat-chip>
                    }
                  </div>
                </div>

                <div class="quiet-hours">
                  <div class="setting-row">
                    <div class="setting-label">
                      <strong>Quiet Hours</strong>
                      <p>Don't send emails during these hours</p>
                    </div>
                    <mat-slide-toggle [(ngModel)]="channelSettings().email.quietHours.enabled">
                    </mat-slide-toggle>
                  </div>

                  @if (channelSettings().email.quietHours.enabled) {
                    <div class="quiet-hours-time">
                      <mat-form-field appearance="outline">
                        <mat-label>Start Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().email.quietHours.start">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>End Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().email.quietHours.end">
                      </mat-form-field>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-expansion-panel>

          <!-- SMS Notifications -->
          <mat-expansion-panel class="channel-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>sms</mat-icon>
                SMS Notifications
              </mat-panel-title>
              <mat-panel-description>
                Configure SMS delivery settings
                <mat-chip [color]="channelSettings().sms.enabled ? 'primary' : ''">
                  {{ channelSettings().sms.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="channel-content">
              <div class="setting-row">
                <div class="setting-label">
                  <strong>Enable SMS Notifications</strong>
                </div>
                <mat-slide-toggle [(ngModel)]="channelSettings().sms.enabled" color="primary">
                </mat-slide-toggle>
              </div>

              @if (channelSettings().sms.enabled) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Phone Number</mat-label>
                  <input matInput type="tel" [(ngModel)]="channelSettings().sms.phoneNumber" placeholder="+1234567890">
                  <mat-icon matSuffix>phone</mat-icon>
                </mat-form-field>

                <div class="notification-types">
                  <h4>Notification Types</h4>
                  <div class="type-chips">
                    @for (type of urgentTypes; track type.value) {
                      <mat-chip
                        (click)="toggleType('sms', type.value)"
                        [color]="isTypeEnabled('sms', type.value) ? 'primary' : ''"
                        class="type-chip">
                        <mat-icon>{{ type.icon }}</mat-icon>
                        {{ type.label }}
                      </mat-chip>
                    }
                  </div>
                  <p class="help-text">SMS is recommended for urgent notifications only</p>
                </div>

                <div class="quiet-hours">
                  <div class="setting-row">
                    <div class="setting-label">
                      <strong>Quiet Hours</strong>
                      <p>Don't send SMS during these hours</p>
                    </div>
                    <mat-slide-toggle [(ngModel)]="channelSettings().sms.quietHours.enabled">
                    </mat-slide-toggle>
                  </div>

                  @if (channelSettings().sms.quietHours.enabled) {
                    <div class="quiet-hours-time">
                      <mat-form-field appearance="outline">
                        <mat-label>Start Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().sms.quietHours.start">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>End Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().sms.quietHours.end">
                      </mat-form-field>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-expansion-panel>

          <!-- Push Notifications -->
          <mat-expansion-panel class="channel-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>notifications</mat-icon>
                Push Notifications
              </mat-panel-title>
              <mat-panel-description>
                Configure browser push notifications
                <mat-chip [color]="channelSettings().push.enabled ? 'primary' : ''">
                  {{ channelSettings().push.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="channel-content">
              <div class="setting-row">
                <div class="setting-label">
                  <strong>Enable Push Notifications</strong>
                  <p>Requires browser permission</p>
                </div>
                <mat-slide-toggle
                  [(ngModel)]="channelSettings().push.enabled"
                  color="primary"
                  (change)="handlePushToggle()">
                </mat-slide-toggle>
              </div>

              @if (channelSettings().push.enabled) {
                <div class="notification-types">
                  <h4>Notification Types</h4>
                  <div class="type-chips">
                    @for (type of availableTypes; track type.value) {
                      <mat-chip
                        (click)="toggleType('push', type.value)"
                        [color]="isTypeEnabled('push', type.value) ? 'primary' : ''"
                        class="type-chip">
                        <mat-icon>{{ type.icon }}</mat-icon>
                        {{ type.label }}
                      </mat-chip>
                    }
                  </div>
                </div>

                <div class="quiet-hours">
                  <div class="setting-row">
                    <div class="setting-label">
                      <strong>Quiet Hours</strong>
                      <p>Don't show push notifications during these hours</p>
                    </div>
                    <mat-slide-toggle [(ngModel)]="channelSettings().push.quietHours.enabled">
                    </mat-slide-toggle>
                  </div>

                  @if (channelSettings().push.quietHours.enabled) {
                    <div class="quiet-hours-time">
                      <mat-form-field appearance="outline">
                        <mat-label>Start Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().push.quietHours.start">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>End Time</mat-label>
                        <input matInput type="time" [(ngModel)]="channelSettings().push.quietHours.end">
                      </mat-form-field>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-expansion-panel>

          <!-- In-App Notifications -->
          <mat-expansion-panel class="channel-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>notifications_active</mat-icon>
                In-App Notifications
              </mat-panel-title>
              <mat-panel-description>
                Configure in-app notification behavior
                <mat-chip [color]="channelSettings().inApp.enabled ? 'primary' : ''">
                  {{ channelSettings().inApp.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="channel-content">
              <div class="setting-row">
                <div class="setting-label">
                  <strong>Enable In-App Notifications</strong>
                </div>
                <mat-slide-toggle [(ngModel)]="channelSettings().inApp.enabled" color="primary">
                </mat-slide-toggle>
              </div>

              @if (channelSettings().inApp.enabled) {
                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Show Badge</strong>
                    <p>Display unread count badge</p>
                  </div>
                  <mat-slide-toggle [(ngModel)]="channelSettings().inApp.showBadge">
                  </mat-slide-toggle>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Play Sound</strong>
                    <p>Play notification sound</p>
                  </div>
                  <mat-slide-toggle [(ngModel)]="channelSettings().inApp.playSound">
                  </mat-slide-toggle>
                </div>

                <div class="notification-types">
                  <h4>Notification Types</h4>
                  <div class="type-chips">
                    @for (type of availableTypes; track type.value) {
                      <mat-chip
                        (click)="toggleType('inApp', type.value)"
                        [color]="isTypeEnabled('inApp', type.value) ? 'primary' : ''"
                        class="type-chip">
                        <mat-icon>{{ type.icon }}</mat-icon>
                        {{ type.label }}
                      </mat-chip>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-expansion-panel>

          <!-- Webhook Notifications -->
          <mat-expansion-panel class="channel-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>webhook</mat-icon>
                Webhook Notifications
              </mat-panel-title>
              <mat-panel-description>
                Configure webhook delivery settings
                <mat-chip [color]="channelSettings().webhook.enabled ? 'primary' : ''">
                  {{ channelSettings().webhook.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="channel-content">
              <div class="setting-row">
                <div class="setting-label">
                  <strong>Enable Webhook Notifications</strong>
                  <p>Send notifications to external systems</p>
                </div>
                <mat-slide-toggle [(ngModel)]="channelSettings().webhook.enabled" color="primary">
                </mat-slide-toggle>
              </div>

              @if (channelSettings().webhook.enabled) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Webhook URL</mat-label>
                  <input matInput type="url" [(ngModel)]="channelSettings().webhook.url" placeholder="https://api.example.com/webhook">
                  <mat-icon matSuffix>link</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Authentication Token (Optional)</mat-label>
                  <input matInput type="password" [(ngModel)]="channelSettings().webhook.authToken" placeholder="Bearer token or API key">
                  <mat-icon matSuffix>security</mat-icon>
                </mat-form-field>

                <div class="notification-types">
                  <h4>Notification Types</h4>
                  <div class="type-chips">
                    @for (type of availableTypes; track type.value) {
                      <mat-chip
                        (click)="toggleType('webhook', type.value)"
                        [color]="isTypeEnabled('webhook', type.value) ? 'primary' : ''"
                        class="type-chip">
                        <mat-icon>{{ type.icon }}</mat-icon>
                        {{ type.label }}
                      </mat-chip>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-expansion-panel>
        </mat-accordion>

        <!-- Save Actions -->
        <div class="save-actions">
          <button mat-raised-button color="primary" type="submit" [disabled]="isLoading()">
            @if (isLoading()) {
              <ng-container>
                <mat-icon>hourglass_empty</mat-icon>
                Saving...
              </ng-container>
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon>
                Save Preferences
              </ng-container>
            }
          </button>

          <button mat-button type="button" (click)="resetToDefaults()">
            <mat-icon>restore</mat-icon>
            Reset to Defaults
          </button>

          <button mat-button type="button" (click)="testNotifications()">
            <mat-icon>send</mat-icon>
            Test Notifications
          </button>
        </div>
      </form>

      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate" class="loading-bar"></mat-progress-bar>
      }
    </div>
  `,
  styles: [`
    .notification-preferences {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .preferences-header {
      margin-bottom: 32px;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 8px 0;
        font-size: 1.5rem;
        font-weight: 500;
      }

      p {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
      }
    }

    .preference-section {
      margin-bottom: 24px;

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 0;

      .setting-label {
        flex: 1;

        strong {
          display: block;
          margin-bottom: 4px;
        }

        p {
          margin: 0;
          font-size: 0.875rem;
          color: rgba(0, 0, 0, 0.6);
        }
      }
    }

    .dnd-settings {
      margin-top: 16px;
      padding-left: 16px;
      border-left: 2px solid #e0e0e0;
    }

    .channel-accordion {
      margin-bottom: 32px;

      .channel-panel {
        margin-bottom: 8px;

        mat-panel-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        mat-panel-description {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
      }
    }

    .channel-content {
      padding: 16px 0;
    }

    .notification-types {
      margin: 24px 0;

      h4 {
        margin: 0 0 16px 0;
        font-size: 1rem;
        font-weight: 500;
      }

      .type-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .type-chip {
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
          }

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .help-text {
        margin: 12px 0 0 0;
        font-size: 0.75rem;
        color: rgba(0, 0, 0, 0.6);
        font-style: italic;
      }
    }

    .quiet-hours {
      margin-top: 24px;

      .quiet-hours-time {
        display: flex;
        gap: 16px;
        margin-top: 16px;

        mat-form-field {
          flex: 1;
        }
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .save-actions {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      padding: 24px 0;
      border-top: 1px solid #e0e0e0;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .notification-preferences {
        padding: 16px;
      }

      .setting-row {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .quiet-hours-time {
        flex-direction: column;
        gap: 12px;
      }

      .save-actions {
        flex-direction: column;
        align-items: stretch;

        button {
          width: 100%;
          justify-content: center;
        }
      }
    }
  `]
})
export class NotificationPreferencesComponent implements OnInit {
  private enhancedNotificationService = inject(EnhancedNotificationService);
  private authBridgeService = inject(AuthBridgeService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  // State signals
  isLoading = signal(false);
  channelSettings = signal<ChannelSettings>({
    email: {
      enabled: true,
      address: '',
      types: [],
      quietHours: { enabled: false, start: '22:00', end: '08:00' }
    },
    sms: {
      enabled: false,
      phoneNumber: '',
      types: [],
      quietHours: { enabled: true, start: '22:00', end: '08:00' }
    },
    push: {
      enabled: true,
      types: [],
      quietHours: { enabled: false, start: '22:00', end: '08:00' }
    },
    inApp: {
      enabled: true,
      types: [],
      showBadge: true,
      playSound: true
    },
    webhook: {
      enabled: false,
      url: '',
      types: [],
      authToken: ''
    }
  });

  preferencesForm: FormGroup;

  availableTypes = [
    { value: 'task_assignment' as NotificationType, label: 'Task Assignment', icon: 'assignment_ind' },
    { value: 'task_completion' as NotificationType, label: 'Task Completion', icon: 'check_circle' },
    { value: 'task_overdue' as NotificationType, label: 'Task Overdue', icon: 'schedule' },
    { value: 'workflow_execution' as NotificationType, label: 'Workflow Execution', icon: 'timeline' },
    { value: 'device_status' as NotificationType, label: 'Device Status', icon: 'devices' },
    { value: 'system_alert' as NotificationType, label: 'System Alert', icon: 'warning' },
    { value: 'success' as NotificationType, label: 'Success', icon: 'check_circle' },
    { value: 'error' as NotificationType, label: 'Error', icon: 'error' },
    { value: 'warning' as NotificationType, label: 'Warning', icon: 'warning' },
    { value: 'info' as NotificationType, label: 'Info', icon: 'info' }
  ];

  urgentTypes = this.availableTypes.filter(type =>
    ['task_overdue', 'system_alert', 'error'].includes(type.value)
  );

  constructor() {
    this.preferencesForm = this.fb.group({
      enabled: [true],
      doNotDisturb: [false],
      doNotDisturbUntil: ['']
    });
  }

  ngOnInit() {
    this.loadPreferences();
  }

  private loadPreferences() {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    this.isLoading.set(true);

    this.enhancedNotificationService.getUserPreferences(session.user.id).subscribe({
      next: (preferences) => {
        this.updateFormFromPreferences(preferences);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load preferences:', error);
        this.isLoading.set(false);
        this.snackBar.open('Failed to load preferences', 'Close', { duration: 3000 });
      }
    });
  }

  private updateFormFromPreferences(preferences: NotificationPreferences) {
    // Update form controls
    this.preferencesForm.patchValue({
      enabled: preferences.enabled ?? true,
      doNotDisturb: preferences.doNotDisturb ?? false,
      doNotDisturbUntil: preferences.doNotDisturbUntil || ''
    });

    // Update channel settings
    const currentSettings = this.channelSettings();

    // Email settings
    if (preferences.channels?.email) {
      currentSettings.email = {
        ...currentSettings.email,
        ...preferences.channels.email
      };
    }

    // SMS settings
    if (preferences.channels?.sms) {
      currentSettings.sms = {
        ...currentSettings.sms,
        ...preferences.channels.sms
      };
    }

    // Push settings
    if (preferences.channels?.push) {
      currentSettings.push = {
        ...currentSettings.push,
        ...preferences.channels.push
      };
    }

    // In-app settings
    if (preferences.channels?.inApp) {
      currentSettings.inApp = {
        ...currentSettings.inApp,
        ...preferences.channels.inApp
      };
    }

    // Webhook settings
    if (preferences.channels?.webhook) {
      currentSettings.webhook = {
        ...currentSettings.webhook,
        ...preferences.channels.webhook
      };
    }

    this.channelSettings.set(currentSettings);
  }

  isTypeEnabled(channel: keyof ChannelSettings, type: NotificationType): boolean {
    const channelSetting = this.channelSettings()[channel];
    return channelSetting.types?.includes(type) ?? false;
  }

  toggleType(channel: keyof ChannelSettings, type: NotificationType) {
    const currentSettings = this.channelSettings();
    const channelSetting = currentSettings[channel];

    if (!channelSetting.types) {
      channelSetting.types = [];
    }

    const index = channelSetting.types.indexOf(type);
    if (index > -1) {
      channelSetting.types.splice(index, 1);
    } else {
      channelSetting.types.push(type);
    }

    this.channelSettings.set({ ...currentSettings });
  }

  async handlePushToggle() {
    if (this.channelSettings().push.enabled) {
      try {
        await this.enhancedNotificationService.requestPushPermission();
      } catch (error) {
        console.error('Failed to request push permission:', error);
        const currentSettings = this.channelSettings();
        currentSettings.push.enabled = false;
        this.channelSettings.set({ ...currentSettings });
        this.snackBar.open('Push notifications permission denied', 'Close', { duration: 3000 });
      }
    }
  }

  savePreferences() {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    this.isLoading.set(true);

    const preferences: NotificationPreferences = {
      id: `pref-${session.user.id}`,
      userId: session.user.id,
      enabled: this.preferencesForm.get('enabled')?.value ?? true,
      doNotDisturb: this.preferencesForm.get('doNotDisturb')?.value ?? false,
      doNotDisturbUntil: this.preferencesForm.get('doNotDisturbUntil')?.value || undefined,
      channels: this.channelSettings(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.enhancedNotificationService.updateUserPreferences(preferences).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Preferences saved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Failed to save preferences:', error);
        this.isLoading.set(false);
        this.snackBar.open('Failed to save preferences', 'Close', { duration: 3000 });
      }
    });
  }

  resetToDefaults() {
    const defaultSettings: ChannelSettings = {
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
        types: this.availableTypes.map(t => t.value),
        showBadge: true,
        playSound: true
      },
      webhook: {
        enabled: false,
        url: '',
        types: [],
        authToken: ''
      }
    };

    this.channelSettings.set(defaultSettings);
    this.preferencesForm.patchValue({
      enabled: true,
      doNotDisturb: false,
      doNotDisturbUntil: ''
    });

    this.snackBar.open('Preferences reset to defaults', 'Close', { duration: 3000 });
  }

  testNotifications() {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) return;

    this.isLoading.set(true);

    // Send test notifications through all enabled channels
    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test notification to verify your settings are working correctly.',
      type: 'info' as NotificationType,
      priority: 'normal' as NotificationPriority,
      category: 'system' as NotificationCategory,
      channels: [
        { type: 'push' as const, config: {} },
        { type: 'email' as const, config: {} },
        { type: 'in_app' as const, config: {} }
      ],
      recipients: [{ id: session.user.id, type: 'user' as const }]
    };

    this.enhancedNotificationService.sendNotification(testNotification).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Test notifications sent successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Failed to send test notifications:', error);
        this.isLoading.set(false);
        this.snackBar.open('Failed to send test notifications', 'Close', { duration: 3000 });
      }
    });
  }
}
