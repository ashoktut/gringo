
import { Component, inject, signal } from '@angular/core';
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
import { Router, RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  selector: 'app-register',
  imports: [
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  registerForm = new FormGroup(
    {
      username: new FormControl('', [
        Validators.required,
        Validators.email,
      ]),
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

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.snackBar.open('Please fill in all fields correctly', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const email = this.registerForm.value.username!;
    const password = this.registerForm.value.password!;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.registerForm.disable();

    try {
      const result = await this.supabaseService.signUp(email, password);

      console.log('✅ Registration successful:', result);

      this.successMessage.set(
        'Registration successful! Please check your email to confirm your account.'
      );

      this.snackBar.open(
        'Account created! Please check your email to confirm.',
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
      console.error('❌ Registration error:', error);

      let message = 'Registration failed. Please try again.';

      if (error.message?.includes('already registered')) {
        message = 'This email is already registered. Please login instead.';
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
      this.registerForm.enable();
    }
  }
}
