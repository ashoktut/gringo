import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthBridgeService } from '../../services/auth-bridge.service';

interface AdminTab {
  label: string;
  route: string;
  icon: string;
  description?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule
  ],
  template: `
    <div class="admin-layout-container">
      <mat-toolbar class="admin-header" color="primary">
        <mat-icon class="admin-icon">admin_panel_settings</mat-icon>
        <span class="admin-title">{{ pageTitle }}</span>
        <span class="spacer"></span>
        <div class="admin-user-info">
          <mat-icon>account_circle</mat-icon>
          <span>{{ currentUser?.name || 'Admin' }}</span>
          <span class="user-role">{{ userRole }}</span>
        </div>
      </mat-toolbar>

      <div class="admin-content">
        @if (showTabs) {
          <mat-tab-group
            class="admin-tabs"
            [selectedIndex]="selectedTabIndex"
            (selectedTabChange)="onTabChange($event)"
            animationDuration="300ms">
            @for (tab of adminTabs; track tab.route) {
              <mat-tab [label]="tab.label">
                <ng-template matTabContent>
                  <div class="tab-content">
                    <div class="tab-header">
                      <div class="tab-info">
                        <h2>
                          <mat-icon>{{ tab.icon }}</mat-icon>
                          {{ tab.label }}
                        </h2>
                        @if (tab.description) {
                          <p class="tab-description">{{ tab.description }}</p>
                        }
                      </div>
                    </div>
                    <div class="tab-body">
                      <router-outlet></router-outlet>
                    </div>
                  </div>
                </ng-template>
              </mat-tab>
            }
          </mat-tab-group>
        } @else {
          <div class="admin-single-content">
            <router-outlet></router-outlet>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  @Input() pageTitle = 'Admin Dashboard';
  @Input() showTabs = true;

  currentUser: any = null;
  userRole = '';
  selectedTabIndex = 0;

  adminTabs: AdminTab[] = [
    {
      label: 'User Management',
      route: '/admin/users',
      icon: 'people',
      description: 'Manage users, companies, and roles'
    },
    {
      label: 'Analytics',
      route: '/admin/analytics',
      icon: 'analytics',
      description: 'View system metrics and usage statistics'
    },
    {
      label: 'Templates',
      route: '/templates',
      icon: 'description',
      description: 'Manage document templates and assignments'
    },
    {
      label: 'Form Builder',
      route: '/form-builder',
      icon: 'build',
      description: 'Create and edit forms'
    },
    {
      label: 'Configuration',
      route: '/config-management',
      icon: 'settings',
      description: 'System configuration and settings'
    }
  ];

  superAdminTabs: AdminTab[] = [
    {
      label: 'Super Admin Users',
      route: '/super-admin/users',
      icon: 'admin_panel_settings',
      description: 'Manage all system users and companies'
    },
    {
      label: 'Super Admin Analytics',
      route: '/super-admin/analytics',
      icon: 'trending_up',
      description: 'System-wide analytics and performance'
    },
    {
      label: 'System Configuration',
      route: '/config-management',
      icon: 'engineering',
      description: 'Global system configuration'
    }
  ];

  constructor(
    private authBridge: AuthBridgeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadUserInfo();
    this.setActiveTab();
  }

  private loadUserInfo() {
    this.currentUser = this.authBridge.getCurrentUser();

    if (this.authBridge.isSuperAdmin()) {
      this.userRole = 'Super Admin';
      this.adminTabs = [...this.adminTabs, ...this.superAdminTabs];
    } else if (this.authBridge.isCompanyAdmin()) {
      this.userRole = 'Company Admin';
    } else {
      this.userRole = 'User';
    }
  }

  private setActiveTab() {
    const currentRoute = this.router.url;
    const tabIndex = this.adminTabs.findIndex(tab => currentRoute.includes(tab.route));
    if (tabIndex >= 0) {
      this.selectedTabIndex = tabIndex;
    }
  }

  onTabChange(event: any) {
    const selectedTab = this.adminTabs[event.index];
    if (selectedTab) {
      this.router.navigate([selectedTab.route]);
    }
  }
}
