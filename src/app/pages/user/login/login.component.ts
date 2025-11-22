
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = new FormGroup({
    usermail: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.snackBar.open('Please enter a valid email and password', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const email = this.loginForm.value.usermail!;
    const password = this.loginForm.value.password!;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.loginForm.disable();

    try {
      const result = await this.supabaseService.signIn(email, password);

      console.log('✅ Login successful:', result);
      this.snackBar.open('Login successful!', 'Close', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });

      // Navigate to home page
      this.router.navigate(['/home']);

    } catch (error: any) {
      console.error('❌ Login error:', error);

      let message = 'Login failed. Please try again.';

      if (error.message?.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Please confirm your email address before logging in.';
      } else if (error.message) {
        message = error.message;
      }

      this.errorMessage.set(message);
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
      this.loginForm.enable();
    }
  }
}
