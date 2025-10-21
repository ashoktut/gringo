import { Routes } from '@angular/router';
import { LoginComponent } from './pages/user/login/login.component';
import { RegisterComponent } from './pages/user/register/register.component';
import { ForgotPasswordComponent } from './pages/user/forgot-password/forgot-password.component';
import { HomeComponent } from './pages/home/home.component';
import { RfqComponent } from './pages/reps/rfq/rfq.component';
import { RqrComponent } from './pages/reps/rqr/rqr.component';
import { SubmissionsComponent } from './pages/submissions/submissions.component';
import { TemplatesComponent } from './pages/templates/templates.component';
import { EnhancedTemplatesComponent } from './pages/templates/enhanced-templates.component';
import { StorageManagementComponent } from './pages/storage-management/storage-management.component';
import { FormBuilderComponent } from './pages/form-builder/form-builder.component';
import { ConfigManagementComponent } from './pages/form-builder/config-management/config-management.component';
import { UniversalFormRendererComponent } from './sharedComponents/universal-form-renderer/universal-form-renderer.component';
import { FormsDashboardComponent } from './pages/forms-dashboard/forms-dashboard.component.new';
import { UserSelectorComponent } from './sharedComponents/user-selector/user-selector.component';

// Enhanced Forms System Components
import { FormsDashboardComponent as UserFormsDashboard } from './pages/user/forms-dashboard/forms-dashboard.component';
import { FormSubmissionComponent } from './pages/user/form-submission/form-submission.component';
import { SubmissionApprovalComponent } from './pages/user/submission-approval/submission-approval.component';
import { PdfTemplateEditorComponent } from './pages/admin/pdf-template-editor/pdf-template-editor.component';

// Guards
import { authGuard } from './guards/auth.guard';
import { companyAdminGuard, superAdminGuard } from './guards/role.guard';
import { userAuthGuard, companyAdminGuard as newCompanyAdminGuard, superAdminGuard as newSuperAdminGuard } from './guards/user-auth.guard';

export const routes: Routes = [
  // Authentication routes (legacy)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // User management (new)
  { path: 'user-selector', component: UserSelectorComponent },
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

  { path: 'templates', component: TemplatesComponent, canActivate: [newCompanyAdminGuard] },
  { path: 'templates/:formType', component: TemplatesComponent, canActivate: [newCompanyAdminGuard] },
  { path: 'enhanced-templates', component: EnhancedTemplatesComponent, canActivate: [newCompanyAdminGuard] },
  { path: 'admin/templates', component: EnhancedTemplatesComponent, canActivate: [newSuperAdminGuard] },

  // Management and configuration routes
  { path: 'storage-management', component: StorageManagementComponent },
  { path: 'form-builder', component: FormBuilderComponent },
  { path: 'config-management', component: ConfigManagementComponent },

  // ==================== Enhanced Forms Management System Routes ====================

  // User Dashboard - View accessible forms and submissions
  {
    path: 'my-forms',
    component: UserFormsDashboard,
    canActivate: [authGuard]
  },

  // Form Submission - Fill out a form
  {
    path: 'forms/submit/:formId',
    component: FormSubmissionComponent,
    canActivate: [authGuard]
  },

  // View Submission Details
  {
    path: 'forms/submission/:submissionId',
    component: FormSubmissionComponent,
    canActivate: [authGuard]
  },

  // Submission Approval - For approvers to review submissions
  {
    path: 'forms/approvals',
    component: SubmissionApprovalComponent,
    canActivate: [authGuard]
  },

  // PDF Template Management - Admin only
  {
    path: 'admin/pdf-templates',
    component: PdfTemplateEditorComponent,
    canActivate: [authGuard, companyAdminGuard]
  },

  // PDF Template Editor - Create/Edit specific template
  {
    path: 'admin/pdf-templates/:templateId',
    component: PdfTemplateEditorComponent,
    canActivate: [authGuard, companyAdminGuard]
  },

  // Form Builder - Enhanced with role and PDF template assignment
  {
    path: 'admin/form-builder',
    component: FormBuilderComponent,
    canActivate: [authGuard, companyAdminGuard]
  },

  // Company Forms Management - Admin view of all company forms
  {
    path: 'admin/forms-management',
    component: FormBuilderComponent,
    canActivate: [authGuard, companyAdminGuard]
  },

  // ==================== End Enhanced Forms Routes ====================

  // Default redirect
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Wildcard route for 404s
  { path: '**', redirectTo: '/login' }
];
