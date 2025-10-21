
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../services/auth-new.service';
import { AuthBridgeService } from '../../../services/auth-bridge.service';
import { CompanyService } from '../../../services/company.service';
import { LoginRequest, Company } from '../../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authBridge = inject(AuthBridgeService);
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  // Reactive state
  isLoading = signal<boolean>(false);
  hidePassword = signal<boolean>(true);
  loginError = signal<string>('');
  availableCompanies = signal<Company[]>([]);
  showCompanySelector = signal<boolean>(false);
  returnUrl = signal<string>('/dashboard');

  // Form
  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      companyDomain: [''],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.returnUrl.set(returnUrl);
    }

    // Load available companies for domain selection
    this.loadAvailableCompanies();

    // Check if user needs to select company
    this.checkCompanySelection();
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set('');

    try {
      const credentials: LoginRequest = {
        email: this.loginForm.value.email.toLowerCase().trim(),
        password: this.loginForm.value.password,
        companyDomain: this.loginForm.value.companyDomain || undefined,
        rememberMe: this.loginForm.value.rememberMe || false
      };

      // Use the bridge service for enhanced login with multi-tenant sync
      const success = await this.authBridge.login(
        credentials.email,
        credentials.password,
        credentials.companyDomain
      );

      if (success) {
        this.snackBar.open('Login successful', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Navigate to return URL or dashboard
        this.router.navigate([this.returnUrl()]);
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please check your credentials.';

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }

      this.loginError.set(errorMessage);
      this.snackBar.open(errorMessage, 'Dismiss', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onEmailChange(): void {
    const email = this.loginForm.get('email')?.value;
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      this.suggestCompanyDomain(domain);
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  navigateToRegister(): void {
    this.router.navigate(['/register'], {
      queryParams: { returnUrl: this.returnUrl() }
    });
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  // Utility methods
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.errors && field?.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field?.errors || !field?.touched) return '';

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (field.errors['minlength']) {
      return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    return 'Invalid input';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      password: 'Password',
      companyDomain: 'Company Domain'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private async loadAvailableCompanies(): Promise<void> {
    try {
      const companies = await this.companyService.getActiveCompanies().toPromise();
      if (companies) {
        this.availableCompanies.set(companies);
      }
    } catch (error) {
      console.warn('Failed to load available companies:', error);
      // Don't show error to user as this is optional functionality
    }
  }

  private checkCompanySelection(): void {
    const companies = this.availableCompanies();
    // Show company selector if there are multiple active companies
    this.showCompanySelector.set(companies.length > 1);
  }

  private suggestCompanyDomain(domain: string): void {
    const companies = this.availableCompanies();
    const matchingCompany = companies.find(company =>
      company.domain.toLowerCase() === domain.toLowerCase()
    );

    if (matchingCompany) {
      this.loginForm.patchValue({
        companyDomain: matchingCompany.domain
      });
    }
  }
}
