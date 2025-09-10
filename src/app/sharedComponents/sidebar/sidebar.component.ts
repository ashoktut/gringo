import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [[
    CommonModule,
    MatListModule,
    MatIconModule,
    MatSidenavModule,
    RouterModule,
    MatTooltipModule
  ]]
})
export class SidebarComponent {
  navLinks = [
    { icon: 'dashboard', label: 'Dashboard', link: '/dashboard' },
    { icon: 'request_quote', label: 'RFQ', link: '/reps/rfq' },
    { icon: 'folder', label: 'Templates', link: '/templates' },
    { icon: 'assignment', label: 'Submissions', link: '/submissions' },
    { icon: 'bar_chart', label: 'Analytics', link: '/analytics' },
    { icon: 'settings', label: 'Settings', link: '/settings' }
  ];
}
