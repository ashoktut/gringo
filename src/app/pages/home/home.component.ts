import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private sidenavService: SidenavService) {}
  toggleSidenav() {
    this.sidenavService.toggle();
  }
  quickActions = [
    {
      "title": "Create RFQ",
      "description": "Request for Quote - Get quotes for your projects",
      "routePath": "/rfq",
      "icon": "request_quote",
      "color": "primary"
    },
    {
      "title": "Create RQR",
      "description": "Request for Re-Quote - Request updated quotes",
      "routePath": "/rqr",
      "icon": "refresh",
      "color": "accent"
    },
    {
      "title": "View Submissions",
      "description": "Browse and manage all form submissions",
      "routePath": "/submissions",
      "icon": "folder_open",
      "color": "warn"
    },
    {
      "title": "Manage Templates",
      "description": "Create and edit document templates",
      "routePath": "/templates",
      "icon": "description",
      "color": "primary"
    }
  ];

  recentActivity = [
    { action: "RFQ submitted", time: "2 hours ago", icon: "assignment" },
    { action: "Template updated", time: "1 day ago", icon: "edit" },
    { action: "Quote approved", time: "3 days ago", icon: "check_circle" }
  ];

  stats = [
    { label: "Active RFQs", value: "12", icon: "trending_up", color: "primary" },
    { label: "Templates", value: "8", icon: "description", color: "accent" },
    { label: "This Month", value: "45", icon: "calendar_today", color: "warn" }
  ];
}
