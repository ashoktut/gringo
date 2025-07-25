import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, CommonModule, MatInputModule, MatButtonModule, RouterModule, MatFormFieldModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
    forgotPasswordForm = new FormGroup({
    usermail: new FormControl('', [Validators.required, Validators.email]),
  });

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      console.log('Form Submitted', this.forgotPasswordForm.value);
      // Handle forgot password logic here
    } else {
      console.error('Form is invalid');
    }
  }

}
