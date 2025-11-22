import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f0f2f5;
    }
  `],
  imports: [RouterOutlet],
})
export class AuthLayoutComponent {}
