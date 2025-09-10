import { Component, ViewChild } from '@angular/core';
import { SidenavService } from './services/sidenav.service';
import { MatSidenav } from '@angular/material/sidenav';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay, filter } from 'rxjs/operators';

interface NavItem {
  name: string;
  route: string;
  icon: string;
  description: string;
  badge?: {
    count: number;
    type: 'info' | 'warning' | 'error' | 'success';
  };
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild('drawer') drawer!: MatSidenav;
  title = 'Gringo - Professional Services';
  currentRoute = '';
  notificationCount = 3; // This would come from a service in real app

  isHandset$: Observable<boolean>;
  navItems: NavItem[] = [
    {
      name: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      description: 'Overview of all activities, quick stats, and navigation hub'
    },
    {
      name: 'Home',
      route: '/home',
      icon: 'home',
      description: 'Main landing page with recent activity and announcements'
    },
    {
      name: 'RFQ Form',
      route: '/reps/rfq',
      icon: 'request_quote',
      description: 'Create new Request for Quotation submissions',
      badge: { count: 2, type: 'info' }
    },
    {
      name: 'RQR Form',
      route: '/rqr',
      icon: 'refresh',
      description: 'Request for Revision - modify existing submissions'
    },
    {
      name: 'Submissions',
      route: '/submissions',
      icon: 'assignment',
      description: 'View, manage, and track all RFQ submissions',
      badge: { count: 5, type: 'success' }
    },
    {
      name: 'Templates',
      route: '/templates',
      icon: 'folder',
      description: 'Manage document templates for PDF generation'
    },
    {
      name: 'Analytics',
      route: '/analytics',
      icon: 'bar_chart',
      description: 'View reports, charts, and business intelligence data'
    },
    {
      name: 'Settings',
      route: '/settings',
      icon: 'settings',
      description: 'Configure application preferences and system settings'
    }
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private sidenavService: SidenavService
  ) {
    // Listen for sidenav toggle requests from the service
    this.sidenavService.toggle$.subscribe(() => {
      if (this.drawer) {
        this.drawer.toggle();
      }
    });
    // Initialize responsive observable
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay()
      );

    // Track current route for highlighting active nav item
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
      this.updateTitle();
      this.updateNotificationCount();
    });
  }

  private updateTitle() {
    const currentItem = this.navItems.find(item =>
      this.currentRoute === item.route ||
      (item.route !== '/' && this.currentRoute.startsWith(item.route))
    );

    if (currentItem) {
      this.title = `Gringo - ${currentItem.name}`;
    } else {
      this.title = 'Gringo - Professional Services';
    }
  }

  private updateNotificationCount() {
    // In a real application, this would fetch from a service
    // For now, we'll simulate dynamic count based on route
    if (this.currentRoute.includes('/submissions')) {
      this.notificationCount = 5;
    } else if (this.currentRoute.includes('/analytics')) {
      this.notificationCount = 2;
    } else {
      this.notificationCount = 3;
    }
  }

  // Enhanced functionality methods
  openHelp() {
    // Open help documentation or tutorial
    window.open('/help', '_blank');
  }

  openGlobalSearch() {
    // Implement global search functionality
    console.log('Opening global search...');
    // This could open a search dialog or navigate to search page
  }

  openNotifications() {
    // Navigate to notifications page or open notifications panel
    this.router.navigate(['/notifications']);
  }

  onButtonClick() {
    // Navigation method if needed
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route ||
           (route !== '/' && this.currentRoute.startsWith(route));
  }
}
