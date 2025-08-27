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
export class AppComponent {
  @ViewChild('drawer') drawer!: MatSidenav;
  title = 'Gringo - Professional Services';
  currentRoute = '';

  isHandset$: Observable<boolean>;
  navItems = [
    { name: 'Home', route: '/', icon: 'home' },
    { name: 'RFQ Form', route: '/rfq', icon: 'request_quote' },
    { name: 'RQR Form', route: '/rqr', icon: 'refresh' },
    { name: 'Submissions', route: '/submissions', icon: 'folder' },
    { name: 'Templates', route: '/templates', icon: 'description' }
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
    });
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
