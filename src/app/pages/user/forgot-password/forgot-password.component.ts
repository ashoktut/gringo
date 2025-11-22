
import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    RouterModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  forgotPasswordForm = new FormGroup({
    usermail: new FormControl('', [Validators.required, Validators.email]),
  });

  async onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.snackBar.open('Please enter a valid email address', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const email = this.forgotPasswordForm.value.usermail!;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.forgotPasswordForm.disable();

    try {
      await this.supabaseService.resetPassword(email);

      console.log('✅ Password reset email sent');

      this.successMessage.set(
        'Password reset link has been sent to your email. Please check your inbox.'
      );

      this.snackBar.open(
        'Password reset link sent! Check your email.',
        'Close',
        {
          duration: 5000,
          panelClass: ['success-snackbar']
        }
      );

      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Password reset error:', error);

      let message = 'Failed to send reset email. Please try again.';

      if (error.message) {
        message = error.message;
      }

      this.errorMessage.set(message);
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
      this.forgotPasswordForm.enable();
    }
  }

}
