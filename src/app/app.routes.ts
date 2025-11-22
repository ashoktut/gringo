import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';
import { LoginComponent } from './pages/user/login/login.component';
import { RegisterComponent } from './pages/user/register/register.component';
import { ForgotPasswordComponent } from './pages/user/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/user/reset-password/reset-password.component';
import { HomeComponent } from './pages/home/home.component';
import { SubmissionsComponent } from './pages/submissions/submissions.component';
import { TemplatesComponent } from './pages/templates/templates.component';
import { StorageManagementComponent } from './pages/storage-management/storage-management.component';
import { FormBuilderComponent } from './pages/form-builder/form-builder.component';
import { ConfigManagementComponent } from './pages/form-builder/config-management/config-management.component';
import { DynamicFormComponent } from './sharedComponents/dynamic-form/dynamic-form.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [publicGuard] },
      { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [publicGuard] },
      { path: 'reset-password', component: ResetPasswordComponent }, // No guard - accessible via email link
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },

      // Enhanced Dynamic Form Routes
      {
        path: 'forms/:formType',
        component: DynamicFormComponent,
        data: {
          title: 'Dynamic Form',
          enableRepeatMode: true,
          enableCompanySelector: true,
          enableDrafts: true,
          enableValidation: true
        }
      },
      // Form-specific enhancement routes for menu
      { path: 'rfq', redirectTo: 'forms/rfq', pathMatch: 'full' },
      { path: 'rqr', redirectTo: 'forms/rqr', pathMatch: 'full' },


      // Enhanced Submissions Routes
      {
        path: 'submissions',
        component: SubmissionsComponent,
        data: { title: 'All Submissions', enableTypeFilter: true }
      },
      {
        path: 'submissions/:formType',
        component: SubmissionsComponent,
        data: { title: 'Form Submissions', enableTypeFilter: true }
      },

      // Enhanced Template Routes
      {
        path: 'templates',
        component: TemplatesComponent,
        data: {
          title: 'Template Management',
          enableCategoryFilter: true,
          enableFormTypeFilter: true
        }
      },
      {
        path: 'templates/:formType',
        component: TemplatesComponent,
        data: {
          title: 'Form Templates',
          enableCategoryFilter: true,
          enableFormTypeFilter: true
        }
      },

      // Configuration and Management Routes
      {
        path: 'config-management',
        component: ConfigManagementComponent,
        data: {
          title: 'Configuration Management',
          requiresAdmin: true
        }
      },
      {
        path: 'form-builder',
        component: FormBuilderComponent,
        data: {
          title: 'Form Builder',
          requiresAdmin: true
        }
      },
      {
        path: 'storage-management',
        component: StorageManagementComponent,
        data: {
          title: 'Storage Management',
          requiresAdmin: true
        }
      },

      // RBAC Management Routes (Company Admin only)
      {
        path: 'role-management',
        loadComponent: () => import('./pages/role-management/role-management.component').then(m => m.RoleManagementComponent),
        data: {
          title: 'Role Management',
          requiresAdmin: true
        }
      },
      {
        path: 'user-management',
        loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
        data: {
          title: 'User Management',
          requiresAdmin: true
        }
      },

      // Default route for authenticated users
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },

  // Wildcard route to redirect to home for any other path
  { path: '**', redirectTo: '' }
];

