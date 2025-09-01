import { Routes } from '@angular/router';
import { LoginComponent } from './pages/user/login/login.component';
import { RegisterComponent } from './pages/user/register/register.component';
import { ForgotPasswordComponent } from './pages/user/forgot-password/forgot-password.component';
import { HomeComponent } from './pages/home/home.component';
import { RfqComponent } from './pages/reps/rfq/rfq.component';
import { RqrComponent } from './pages/reps/rqr/rqr.component';
import { SubmissionsComponent } from './pages/submissions/submissions.component';
import { TemplatesComponent } from './pages/templates/templates.component';
import { StorageManagementComponent } from './pages/storage-management/storage-management.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'home', component: HomeComponent },
  { path: 'rfq', component: RfqComponent },
  { path: 'rqr', component: RqrComponent },
  { path: 'submissions', component: SubmissionsComponent },
  { path: 'submissions/:formType', component: SubmissionsComponent },
  { path: 'templates', component: TemplatesComponent },
  { path: 'templates/:formType', component: TemplatesComponent },
  { path: 'storage-management', component: StorageManagementComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
