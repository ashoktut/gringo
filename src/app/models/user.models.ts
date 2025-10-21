export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;           // Company ID for company-admin users
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  permissions?: Permission[];
}

export interface Company {
  id: string;
  name: string;
  code: string;
  industry?: string;
  logo?: string;
  active: boolean;
  createdAt: Date;
  settings?: CompanySettings;
  adminUsers?: string[];        // User IDs of company admins
  allowedFormTypes?: string[];  // Form types this company can use
}

export interface CompanySettings {
  brandingColor?: string;
  customLogo?: string;
  emailSettings?: EmailSettings;
  maxTemplates?: number;
  maxUsers?: number;
}

export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  fromEmail?: string;
  fromName?: string;
}

export type UserRole = 'super-admin' | 'company-admin' | 'user';

export interface Permission {
  resource: string;             // 'templates', 'companies', 'users', etc.
  actions: PermissionAction[];  // ['read', 'write', 'delete', etc.]
  scope: 'global' | 'company' | 'own';
}

export type PermissionAction = 'read' | 'write' | 'delete' | 'assign' | 'manage';

export interface UserSession {
  user: User;
  company?: Company;
  permissions: Permission[];
  accessToken?: string;
}

export interface CompanyTemplateAssignment {
  id: string;
  templateId: string;
  companyId: string;
  formType: string;
  assignedBy: string;           // User ID who assigned the template
  assignedAt: Date;
  isActive: boolean;
}
