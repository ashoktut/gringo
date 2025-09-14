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
import { FormBuilderComponent } from './pages/form-builder/form-builder.component';
import { ConfigManagementComponent } from './pages/form-builder/config-management/config-management.component';
import { DynamicFormComponent } from './sharedComponents/dynamic-form/dynamic-form.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'home', component: HomeComponent },

  // Legacy specific routes for backward compatibility
  { path: 'rfq', component: RfqComponent },
  { path: 'rqr', component: RqrComponent },

  // Generic dynamic form routes
  { path: 'forms/:formType', component: DynamicFormComponent },
  { path: 'forms/:formType/repeat', component: DynamicFormComponent },
  { path: 'forms/:formType/company/:companyId', component: DynamicFormComponent },

  // Enhanced routes with dynamic form support
  { path: 'submissions', component: SubmissionsComponent },
  { path: 'submissions/:formType', component: SubmissionsComponent },
  { path: 'templates', component: TemplatesComponent },
  { path: 'templates/:formType', component: TemplatesComponent },

  // Management routes
  { path: 'storage-management', component: StorageManagementComponent },
  { path: 'form-builder', component: FormBuilderComponent },
  { path: 'config-management', component: ConfigManagementComponent },

  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
