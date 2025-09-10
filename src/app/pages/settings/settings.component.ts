import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  // Example settings, replace with real config
  config = {
    rfqRequiredFields: ['projectName', 'clientEmail', 'dateDue', 'repName'],
    templateTypes: ['HTML', 'DOCX', 'PDF'],
    companyInfo: { name: 'Gringo Professional Services', logo: 'assets/images/logo.png' },
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      enableDarkMode: false
    }
  };

  updateConfig() {
    // Placeholder for config update logic
    console.log('Configuration updated:', this.config);
  }
}
