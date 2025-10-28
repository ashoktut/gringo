import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AuthBridgeService } from '../../services/auth-bridge.service';

interface SystemSettings {
  general: {
    siteName: string;
    supportEmail: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    defaultTimezone: string;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    requireMFA: boolean;
    allowRegistration: boolean;
    emailVerificationRequired: boolean;
  };
  features: {
    enablePdfGeneration: boolean;
    enableDigitalSignature: boolean;
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableApiAccess: boolean;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    customCss: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    enableSSL: boolean;
  };
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.css']
})
export class SystemSettingsComponent implements OnInit {
  settings = signal<SystemSettings>({
    general: {
      siteName: 'Gringo Forms Platform',
      supportEmail: 'support@gringo.com',
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png', 'gif'],
      defaultTimezone: 'UTC'
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireMFA: false,
      allowRegistration: true,
      emailVerificationRequired: true
    },
    features: {
      enablePdfGeneration: true,
      enableDigitalSignature: true,
      enableAnalytics: true,
      enableNotifications: true,
      enableApiAccess: false
    },
    branding: {
      primaryColor: '#1976d2',
      secondaryColor: '#424242',
      logoUrl: '',
      faviconUrl: '',
      customCss: ''
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@gringo.com',
      fromName: 'Gringo Platform',
      enableSSL: true
    }
  });

  generalForm: FormGroup;
  securityForm: FormGroup;
  featuresForm: FormGroup;
  brandingForm: FormGroup;
  emailForm: FormGroup;

  isSuperAdmin = false;
  loading = signal(false);
  timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
  ];

  constructor(
    private fb: FormBuilder,
    private authBridge: AuthBridgeService,
    private snackBar: MatSnackBar
  ) {
    this.isSuperAdmin = this.authBridge.isSuperAdmin();
    
    // Initialize forms
    this.generalForm = this.createGeneralForm();
    this.securityForm = this.createSecurityForm();
    this.featuresForm = this.createFeaturesForm();
    this.brandingForm = this.createBrandingForm();
    this.emailForm = this.createEmailForm();
  }

  ngOnInit() {
    this.loadSettings();
  }

  private createGeneralForm(): FormGroup {
    return this.fb.group({
      siteName: ['', Validators.required],
      supportEmail: ['', [Validators.required, Validators.email]],
      maxFileSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      allowedFileTypes: [[]],
      defaultTimezone: ['UTC', Validators.required]
    });
  }

  private createSecurityForm(): FormGroup {
    return this.fb.group({
      sessionTimeout: [30, [Validators.required, Validators.min(5), Validators.max(480)]],
      passwordMinLength: [8, [Validators.required, Validators.min(6), Validators.max(20)]],
      requireMFA: [false],
      allowRegistration: [true],
      emailVerificationRequired: [true]
    });
  }

  private createFeaturesForm(): FormGroup {
    return this.fb.group({
      enablePdfGeneration: [true],
      enableDigitalSignature: [true],
      enableAnalytics: [true],
      enableNotifications: [true],
      enableApiAccess: [false]
    });
  }

  private createBrandingForm(): FormGroup {
    return this.fb.group({
      primaryColor: ['#1976d2'],
      secondaryColor: ['#424242'],
      logoUrl: [''],
      faviconUrl: [''],
      customCss: ['']
    });
  }

  private createEmailForm(): FormGroup {
    return this.fb.group({
      smtpHost: [''],
      smtpPort: [587, [Validators.min(1), Validators.max(65535)]],
      smtpUser: [''],
      smtpPassword: [''],
      fromEmail: ['', [Validators.required, Validators.email]],
      fromName: ['', Validators.required],
      enableSSL: [true]
    });
  }

  private loadSettings() {
    this.loading.set(true);
    
    // Simulate loading settings from backend
    setTimeout(() => {
      const currentSettings = this.settings();
      
      this.generalForm.patchValue(currentSettings.general);
      this.securityForm.patchValue(currentSettings.security);
      this.featuresForm.patchValue(currentSettings.features);
      this.brandingForm.patchValue(currentSettings.branding);
      this.emailForm.patchValue(currentSettings.email);
      
      this.loading.set(false);
    }, 1000);
  }

  async saveGeneralSettings() {
    if (this.generalForm.valid) {
      this.loading.set(true);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentSettings = this.settings();
        this.settings.set({
          ...currentSettings,
          general: this.generalForm.value
        });
        
        this.snackBar.open('General settings saved successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error) {
        this.snackBar.open('Error saving general settings', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading.set(false);
      }
    }
  }

  async saveSecuritySettings() {
    if (this.securityForm.valid && this.isSuperAdmin) {
      this.loading.set(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentSettings = this.settings();
        this.settings.set({
          ...currentSettings,
          security: this.securityForm.value
        });
        
        this.snackBar.open('Security settings saved successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error) {
        this.snackBar.open('Error saving security settings', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading.set(false);
      }
    }
  }

  async saveFeatureSettings() {
    this.loading.set(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        features: this.featuresForm.value
      });
      
      this.snackBar.open('Feature settings saved successfully', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      this.snackBar.open('Error saving feature settings', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading.set(false);
    }
  }

  async saveBrandingSettings() {
    if (this.brandingForm.valid) {
      this.loading.set(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentSettings = this.settings();
        this.settings.set({
          ...currentSettings,
          branding: this.brandingForm.value
        });
        
        this.snackBar.open('Branding settings saved successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error) {
        this.snackBar.open('Error saving branding settings', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading.set(false);
      }
    }
  }

  async saveEmailSettings() {
    if (this.emailForm.valid && this.isSuperAdmin) {
      this.loading.set(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentSettings = this.settings();
        this.settings.set({
          ...currentSettings,
          email: this.emailForm.value
        });
        
        this.snackBar.open('Email settings saved successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error) {
        this.snackBar.open('Error saving email settings', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading.set(false);
      }
    }
  }

  async testEmailConnection() {
    if (this.emailForm.valid) {
      this.loading.set(true);
      
      try {
        // Simulate email test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.snackBar.open('Email connection test successful', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error) {
        this.snackBar.open('Email connection test failed', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading.set(false);
      }
    }
  }

  previewBranding() {
    const branding = this.brandingForm.value;
    
    // Apply preview styling
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
    
    this.snackBar.open('Branding preview applied', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  resetBranding() {
    // Reset to default values
    this.brandingForm.patchValue({
      primaryColor: '#1976d2',
      secondaryColor: '#424242',
      logoUrl: '',
      faviconUrl: '',
      customCss: ''
    });
    
    // Reset CSS variables
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--secondary-color');
    
    this.snackBar.open('Branding reset to defaults', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}