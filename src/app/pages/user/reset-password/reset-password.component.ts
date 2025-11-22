import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

// Password match validator
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (password && confirmPassword && password !== confirmPassword) {
    control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }

  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  tokenValid = signal(false);

  resetPasswordForm = new FormGroup(
    {
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: new FormControl('', [
        Validators.required,
      ]),
    },
    { validators: passwordsMatchValidator }
  );

  async ngOnInit() {
    // Check if we have a valid recovery token from the URL
    // Supabase will automatically handle the token from the email link
    const session = await this.supabaseService.getSession();

    if (session) {
      this.tokenValid.set(true);
      console.log('✅ Valid password reset session detected');
    } else {
      this.errorMessage.set('Invalid or expired reset link. Please request a new password reset.');
      console.error('❌ No valid session for password reset');
    }
  }

  async onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.snackBar.open('Please fill in all fields correctly', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (!this.tokenValid()) {
      this.snackBar.open('Invalid reset link. Please request a new one.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const newPassword = this.resetPasswordForm.value.password!;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.resetPasswordForm.disable();

    try {
      await this.supabaseService.updatePassword(newPassword);

      console.log('✅ Password updated successfully');

      this.successMessage.set(
        'Password reset successful! Redirecting to login...'
      );

      this.snackBar.open(
        'Password updated successfully!',
        'Close',
        {
          duration: 3000,
          panelClass: ['success-snackbar']
        }
      );

      // Wait 2 seconds then redirect to login
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Password reset error:', error);

      let message = 'Failed to reset password. Please try again.';

      if (error.message?.includes('session')) {
        message = 'Your reset link has expired. Please request a new one.';
      } else if (error.message?.includes('Password')) {
        message = 'Password must be at least 6 characters long.';
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
      this.resetPasswordForm.enable();
    }
  }
}
