import { Component, Inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';

import { User, UserStats, ActivityLog } from '../../../../models/auth.models';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

export interface UserDetailsData {
  user: User;
  userStats?: UserStats | null;
}

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatListModule
  ],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent implements OnInit {
  user!: ReturnType<typeof signal<User>>;
  userStats!: ReturnType<typeof signal<UserStats | null>>;
  activityLog = signal<ActivityLog[]>([]);
  isLoadingActivity = signal(false);

  // Computed properties
  canEdit = computed(() => this.authService.hasPermission('edit:users'));
  canViewActivity = computed(() => this.authService.hasPermission('view:user_activity'));

  // User status computed properties
  userStatus = computed(() => {
    const u = this.user();
    if (!u.isActive) return { text: 'Inactive', color: 'warn', icon: 'block' };
    if (!u.lastLogin) return { text: 'Pending', color: 'accent', icon: 'schedule' };
    return { text: 'Active', color: 'primary', icon: 'check_circle' };
  });

  lastLoginText = computed(() => {
    const lastLogin = this.user().lastLogin;
    if (!lastLogin) return 'Never logged in';

    const date = new Date(lastLogin);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  });

  accountAge = computed(() => {
    const created = new Date(this.user().createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
    return `${Math.ceil(diffDays / 365)} years`;
  });

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<UserDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDetailsData
  ) {
    // Initialize signals after data is available
    this.user = signal<User>(this.data.user);
    this.userStats = signal<UserStats | null>(this.data.userStats || null);
  }

  ngOnInit(): void {
    if (this.canViewActivity()) {
      this.loadActivityLog();
    }
  }

  private loadActivityLog(): void {
    this.isLoadingActivity.set(true);
    this.userService.getUserActivityLog(this.user().id)
      .subscribe({
        next: (activities: any) => {
          this.activityLog.set(activities || []);
          this.isLoadingActivity.set(false);
        },
        error: (error: any) => {
          console.error('Failed to load activity log:', error);
          this.isLoadingActivity.set(false);
        }
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', user: this.user() });
  }

  sendPasswordReset(): void {
    this.userService.sendPasswordReset(this.user().email).subscribe({
      next: () => {
        // Show success message
        console.log('Password reset email sent');
      },
      error: (error) => {
        console.error('Failed to send password reset:', error);
      }
    });
  }

  toggleUserStatus(): void {
    const currentUser = this.user();
    const updatedUser = { ...currentUser, isActive: !currentUser.isActive };

    this.userService.updateUser(currentUser.id, updatedUser).subscribe({
      next: (user) => {
        this.user.set(user);
        this.dialogRef.close({ updated: true });
      },
      error: (error) => {
        console.error('Failed to update user status:', error);
      }
    });
  }

  // Utility methods
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateOnly(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  getRoleColor(role: any): string {
    switch (role.scope) {
      case 'system': return 'primary';
      case 'company': return 'accent';
      default: return '';
    }
  }

  getActivityIcon(activity: ActivityLog): string {
    switch (activity.action) {
      case 'login': return 'login';
      case 'logout': return 'logout';
      case 'password_reset': return 'lock_reset';
      case 'profile_update': return 'edit';
      case 'role_change': return 'admin_panel_settings';
      case 'permission_change': return 'security';
      default: return 'info';
    }
  }

  getActivityColor(activity: ActivityLog): string {
    switch (activity.action) {
      case 'login': return 'primary';
      case 'logout': return 'accent';
      case 'password_reset': return 'warn';
      case 'profile_update': return 'primary';
      case 'role_change': return 'warn';
      case 'permission_change': return 'warn';
      default: return '';
    }
  }

  getActivityDescription(activity: ActivityLog): string {
    switch (activity.action) {
      case 'login': return 'User logged in';
      case 'logout': return 'User logged out';
      case 'password_reset': return 'Password reset requested';
      case 'profile_update': return 'Profile information updated';
      case 'role_change': return `Role changed: ${activity.details}`;
      case 'permission_change': return `Permissions modified: ${activity.details}`;
      default: return activity.description || 'Unknown activity';
    }
  }

  getUserInitials(user: User): string {
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  getCompanyName(): string {
    // This would typically come from a company service lookup
    return 'Company Name'; // Placeholder
  }

  // Statistics helpers
  getLoginFrequency(): string {
    const stats = this.userStats();
    if (!stats?.totalLogins) return 'No logins';

    const accountAgeMs = Date.now() - new Date(this.user().createdAt).getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    const avgLoginsPerDay = stats.totalLogins / accountAgeDays;

    if (avgLoginsPerDay >= 1) return `${Math.round(avgLoginsPerDay)} per day`;
    const avgLoginsPerWeek = avgLoginsPerDay * 7;
    if (avgLoginsPerWeek >= 1) return `${Math.round(avgLoginsPerWeek)} per week`;
    const avgLoginsPerMonth = avgLoginsPerDay * 30;
    return `${Math.round(avgLoginsPerMonth)} per month`;
  }

  getSessionDuration(): string {
    const stats = this.userStats();
    if (!stats?.averageSessionDuration) return 'N/A';

    const minutes = Math.round(stats.averageSessionDuration / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    return `${hours} hr`;
  }
}
