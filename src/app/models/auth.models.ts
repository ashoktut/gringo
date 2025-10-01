// Authentication and Authorization Models
export interface User {
  id: string;
  email: string;
  name: string; // Full name field
  firstName?: string;
  lastName?: string;
  companyId?: string;
  roles?: Role[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date; // Changed from lastLoginAt
  profilePicture?: string;
  preferences?: UserPreferences;
  profile?: UserProfile;
  settings?: UserSettings;
}

export interface Company {
  id: string;
  name: string;
  domain: string; // company domain for email validation
  isActive: boolean;
  status: CompanyStatus;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  industry?: string;
  taxId?: string;
  description?: string;
  address?: CompanyAddress;
  subscription: CompanySubscription;
  settings: CompanySettings;
  branding: CompanyBranding;
  createdAt: Date;
  updatedAt: Date;
  adminUserId: string; // Company admin user
  maxUsers: number;
  currentUserCount: number;
  features: CompanyFeatures;
}

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  companyId?: string; // Roles are company-specific, null for system roles
  permissions?: Permission[];
  scope: 'system' | 'company'; // Role scope
  isSystem?: boolean; // System roles cannot be deleted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  resource: string; // e.g., 'forms', 'users', 'reports'
  action: string; // e.g., 'create', 'read', 'update', 'delete'
  isSystem: boolean; // System permissions cannot be deleted
}

export interface CompanySubscription {
  plan: SubscriptionPlan;
  status: 'active' | 'suspended' | 'cancelled';
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  maxUsers: number;
  maxForms: number;
  maxStorage: number; // in GB
  features: string[];
}

export interface CompanySettings {
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  defaultUserRole: string; // Default role ID for new users
  timezone: string;
  dateFormat: string;
  language: string;
}

export interface CompanyBranding {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  favicon?: string;
  loginBackgroundImage?: string;
  customCss?: string;
}

export interface CompanyFeatures {
  formBuilder: boolean;
  pdfGeneration: boolean;
  emailIntegration: boolean;
  offlineSync: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  multiLanguage: boolean;
  digitalSignature: boolean;
  geoLocation: boolean;
  rfqManagement: boolean;
  templateManagement: boolean;
  userManagement: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  advancedSecurity: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  formSubmissions: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordHistory: number; // Number of previous passwords to remember
  maxAge: number; // Password expiry in days (0 = no expiry)
}

// Authentication DTOs
export interface LoginRequest {
  email: string;
  password: string;
  companyDomain?: string; // Optional for single-company scenarios
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  company: Company;
  permissions: string[]; // Flattened permissions for easy checking
  expiresAt: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyId?: string; // For joining existing company
  companyName?: string; // For creating new company
  companyDomain?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
  companyDomain?: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Authorization Types
export type SystemRole = 'super_admin' | 'company_admin' | 'user';
export type Resource = 'users' | 'companies' | 'forms' | 'templates' | 'reports' | 'settings' | 'roles' | 'permissions';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'assign';

// JWT Token Payload
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  companyId: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Form Configuration per Company
export interface CompanyFormConfig {
  companyId: string;
  availableFieldTypes: string[];
  customFieldTypes?: CustomFieldType[];
  defaultFormSettings: any;
  requiredFields: string[];
  hiddenFields: string[];
  fieldValidationRules: { [fieldName: string]: any };
  customStyling?: any;
}

export interface CustomFieldType {
  type: string;
  name: string;
  component: string;
  icon: string;
  config: any;
}

// Company-specific template configuration
export interface CompanyTemplateConfig {
  companyId: string;
  availableTemplates: string[];
  defaultTemplate: string;
  customTemplates: CompanyTemplate[];
  templateSettings: any;
}

export interface CompanyTemplate {
  id: string;
  name: string;
  type: 'html' | 'docx' | 'pdf';
  content: string;
  variables: string[];
  isDefault: boolean;
  companyId: string;
}

// Additional User Management Types
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  totalLogins: number;
  averageSessionDuration: number; // in seconds
  lastActivityDate: Date;
  newUsersThisMonth: number;
  loginsByDay: { [date: string]: number };
  topActiveUsers: { userId: string; loginCount: number; name: string }[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'password_reset' | 'profile_update' | 'role_change' | 'permission_change' | string;
  description: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface BulkUserAction {
  action: 'activate' | 'deactivate' | 'addRoles' | 'removeRoles' | 'replaceRoles' | 'sendPasswordReset' | 'delete';
  userIds: string[];
  roleIds?: string[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  companyId?: string;
  roleIds: string[];
  isActive: boolean;
  sendWelcomeEmail: boolean;
  profile?: UserProfile;
  settings?: UserSettings;
}

export interface UpdateUserRequest {
  name?: string;
  roleIds?: string[];
  isActive?: boolean;
  profile?: UserProfile;
  settings?: UserSettings;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  department?: string;
  timezone?: string;
  language?: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  twoFactorEnabled: boolean;
  darkMode: boolean;
}

// Additional Types and Enums
export type CompanyStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'trial';
export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface CompanyAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  zipCode?: string; // Alias for postalCode for backward compatibility
  country: string;
}

export interface CompanyStats {
  totalUsers: number;
  userCount: number; // Alias for totalUsers
  activeUsers: number;
  totalForms: number;
  formCount: number; // Alias for totalForms
  totalSubmissions: number;
  submissionCount: number; // Alias for totalSubmissions
  storageUsed: number;
  storageLimit: number;
}

// Request/Response Types
export interface CreateCompanyRequest {
  name: string;
  domain: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  industry?: string;
  taxId?: string;
  description?: string;
  address?: CompanyAddress;
  subscription: {
    plan: SubscriptionPlan;
    maxUsers: number;
    maxForms?: number;
    maxStorage: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
    status?: 'active' | 'suspended' | 'cancelled';
    features?: string[];
  };
  features?: Partial<CompanyFeatures>;
  adminUser?: {
    name: string;
    email: string;
  };
}

export interface UpdateCompanyRequest {
  name?: string;
  domain?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  industry?: string;
  taxId?: string;
  description?: string;
  address?: CompanyAddress;
  status?: CompanyStatus;
  subscription?: {
    plan?: SubscriptionPlan;
    maxUsers?: number;
    maxForms?: number;
    maxStorage?: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
    status?: 'active' | 'suspended' | 'cancelled';
    features?: string[];
  };
  features?: Partial<CompanyFeatures>;
  settings?: CompanySettings;
  branding?: Partial<CompanyBranding>;
}

export interface CreateRoleRequest {
  name: string;
  displayName?: string;
  description?: string;
  companyId?: string;
  permissionIds: string[];
  scope: 'system' | 'company';
  isActive: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  displayName?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

// Fix CompanyFeatures to be consistent
export interface CompanyFeature {
  formBuilder: boolean;
  pdfGeneration: boolean;
  emailIntegration: boolean;
  offlineSync: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  multiLanguage: boolean;
  digitalSignature: boolean;
  geoLocation: boolean;
  rfqManagement: boolean;
  templateManagement: boolean;
  userManagement: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  advancedSecurity: boolean;
}

// Add userCount to Role interface for management
export interface RoleWithStats extends Role {
  userCount: number;
}

// User Stats interface
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
}
