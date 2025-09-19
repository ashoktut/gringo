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
import { UniversalFormRendererComponent } from './sharedComponents/universal-form-renderer/universal-form-renderer.component';
import { FormsDashboardComponent } from './pages/forms-dashboard/forms-dashboard.component.new';

export const routes: Routes = [
  // Authentication routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  // Main application routes
  { path: 'home', component: HomeComponent },

  // Forms Dashboard Routes - NEW
  { path: 'reps/forms', component: FormsDashboardComponent },
  { path: 'admin/forms', component: FormsDashboardComponent },
  { path: 'clients/forms', component: FormsDashboardComponent },
  { path: 'forms', component: FormsDashboardComponent }, // Generic fallback

  // Universal Form System Routes
  // Category-based form routes (recommended approach)
  { path: 'reps/forms/:formType', component: UniversalFormRendererComponent },
  { path: 'clients/forms/:formType', component: UniversalFormRendererComponent },
  { path: 'admin/forms/:formType', component: UniversalFormRendererComponent },
  { path: 'public/forms/:formType', component: UniversalFormRendererComponent },

  // Generic form routes (fallback)
  { path: 'forms/:formType', component: UniversalFormRendererComponent },

  // Legacy routes for backward compatibility (will redirect to universal renderer)
  { path: 'rfq', redirectTo: 'reps/forms/rfq', pathMatch: 'full' },
  { path: 'rqr', redirectTo: 'reps/forms/rqr', pathMatch: 'full' },
  { path: 'reps/rfq', redirectTo: 'reps/forms/rfq', pathMatch: 'full' },
  { path: 'reps/rqr', redirectTo: 'reps/forms/rqr', pathMatch: 'full' },

  // Enhanced routes with category and form type support
  { path: 'submissions', component: SubmissionsComponent },
  { path: 'submissions/:category', component: SubmissionsComponent },
  { path: 'submissions/:category/:formType', component: SubmissionsComponent },

  { path: 'templates', component: TemplatesComponent },
  { path: 'templates/:formType', component: TemplatesComponent },

  // Management and configuration routes
  { path: 'storage-management', component: StorageManagementComponent },
  { path: 'form-builder', component: FormBuilderComponent },
  { path: 'config-management', component: ConfigManagementComponent },

  // Default redirect
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Wildcard route for 404s
  { path: '**', redirectTo: '/home' }
];
