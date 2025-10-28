import { Component, ViewChild, OnInit } from '@angular/core';
import { SidenavService } from './services/sidenav.service';
import { AuthBridgeService } from './services/auth-bridge.service';
import { MatSidenav } from '@angular/material/sidenav';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay, filter } from 'rxjs/operators';

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
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;
  title = 'Gringo';
  currentRoute = '';

  isHandset$: Observable<boolean>;
  baseNavItems = [
    { name: 'Home', route: '/', icon: 'home' },
    { name: 'My Forms', route: '/my-forms', icon: 'assignment' },
    { name: 'RFQ Form', route: '/rfq', icon: 'request_quote' },
    { name: 'RQR Form', route: '/rqr', icon: 'refresh' },
    { name: 'Submissions', route: '/submissions', icon: 'folder' }
  ];

  adminNavItems = [
    { name: 'User Management', route: '/admin/users', icon: 'people' },
    { name: 'Analytics', route: '/admin/analytics', icon: 'analytics' },
    { name: 'Settings', route: '/admin/settings', icon: 'settings' },
    { name: 'Templates', route: '/templates', icon: 'description' },
    { name: 'Form Builder', route: '/form-builder', icon: 'build' },
    { name: 'Configuration', route: '/config-management', icon: 'engineering' }
  ];

  superAdminNavItems = [
    { name: 'Super Admin Users', route: '/super-admin/users', icon: 'admin_panel_settings' },
    { name: 'Super Admin Analytics', route: '/super-admin/analytics', icon: 'trending_up' },
    { name: 'Super Admin Settings', route: '/super-admin/settings', icon: 'tune' },
    { name: 'System Configuration', route: '/config-management', icon: 'engineering' }
  ];

  navItems: any[] = [];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private sidenavService: SidenavService,
    private authBridge: AuthBridgeService
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
    });
  }

  ngOnInit() {
    this.updateNavigation();
    
    // Update navigation when user state changes  
    // Since authBridge doesn't have getCurrentUser() observable, 
    // we'll check on route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateNavigation();
    });
  }

  private updateNavigation() {
    const currentUser = this.authBridge.getCurrentUser();
    this.navItems = [...this.baseNavItems];

    if (currentUser && this.authBridge.isAuthenticated()) {
      if (this.authBridge.isSuperAdmin()) {
        this.navItems.push(...this.adminNavItems, ...this.superAdminNavItems);
      } else if (this.authBridge.isCompanyAdmin()) {
        this.navItems.push(...this.adminNavItems);
      }
    }
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
