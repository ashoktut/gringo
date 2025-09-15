import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StorageDashboardComponent } from '../../sharedComponents/storage-dashboard/storage-dashboard.component';

@Component({
  selector: 'app-storage-management',
  templateUrl: './storage-management.component.html',
  styleUrls: ['./storage-management.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    StorageDashboardComponent
  ]
})
export class StorageManagementComponent {

}
