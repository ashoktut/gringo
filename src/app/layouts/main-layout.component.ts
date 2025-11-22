import { Component, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { SidenavService } from '../services/sidenav.service';
import { SupabaseService } from '../services/supabase.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { signal } from '@angular/core';

interface NavItem {
  name: string;
  route: string;
  icon: string;
  requiredRole?: string;
}

@Component({
  selector: 'app-main-layout',
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav
        #drawer
        class="sidenav"
        [attr.role]="isHandset() ? 'dialog' : 'navigation'"
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()">
        <mat-toolbar class="sidenav-header">
          <mat-icon class="app-icon">business</mat-icon>
          <span class="app-title">Gringo</span>
        </mat-toolbar>
        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              [class.active-nav-item]="isActiveRoute(item.route)"
              (click)="isHandset() ? drawer.close() : null">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.name }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="main-toolbar">
          <button
            type="button"
            aria-label="Toggle sidenav"
            mat-icon-button
            (click)="drawer.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title">{{ title }}</span>
          <span class="toolbar-spacer"></span>

          @if (currentUser()) {
            <span class="user-email">{{ currentUser()?.email }}</span>
          }

          <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="navigateToSettings()">
              <mat-icon>settings</mat-icon>
              <span>Settings</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="main-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    .sidenav {
      width: 260px;
      background-color: #fafafa;
      border-right: 1px solid #e0e0e0;
    }
    .sidenav-header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .app-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
    }
    .app-title {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    mat-nav-list {
      padding-top: 16px;
    }
    a[mat-list-item] {
      color: #424242;
      transition: all 0.2s ease;
      border-radius: 0 24px 24px 0;
      margin: 4px 8px 4px 0;
    }
    a[mat-list-item]:hover {
      background-color: #e3f2fd;
      color: #1976d2;
    }
    .active-nav-item {
      background-color: #e3f2fd !important;
      color: #1976d2 !important;
      font-weight: 600;
      border-left: 4px solid #1976d2;
    }
    .active-nav-item mat-icon {
      color: #1976d2;
    }
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .toolbar-title {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .toolbar-spacer {
      flex: 1 1 auto;
    }
    .user-email {
      margin-right: 12px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.87);
    }
    .main-content {
      padding: 24px;
      overflow-y: auto;
      background-color: #fafafa;
      min-height: calc(100vh - 64px);
    }
  `],
  imports: [
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatListModule
  ],
})
export class MainLayoutComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private sidenavService = inject(SidenavService);
  private supabaseService = inject(SupabaseService);

  title = 'Gringo';
  currentRoute = signal<string>('');

  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  currentUser = toSignal(this.supabaseService.currentUser, { initialValue: null });

  navItems: NavItem[] = [
    { name: 'Home', route: '/home', icon: 'home' },
    { name: 'RFQ Form', route: '/rfq', icon: 'request_quote' },
    { name: 'RQR Form', route: '/rqr', icon: 'refresh' },
    { name: 'Submissions', route: '/submissions', icon: 'folder' },
    { name: 'Templates', route: '/templates', icon: 'description' },
    { name: 'Form Builder', route: '/form-builder', icon: 'build', requiredRole: 'admin' },
    { name: 'Configuration Management', route: '/config-management', icon: 'settings', requiredRole: 'admin' }
  ];

  constructor() {
    // Listen for sidenav toggle requests from the service
    this.sidenavService.toggle$.subscribe(() => {
      if (this.drawer) {
        this.drawer.toggle();
      }
    });

    // Track current route for active highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute.set((event as NavigationEnd).url);
    });
  }

  isActiveRoute(route: string): boolean {
    const current = this.currentRoute();
    return current === route || (route !== '/home' && current.startsWith(route));
  }

  navigateToSettings(): void {
    this.router.navigate(['/config-management']);
  }

  async logout(): Promise<void> {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
