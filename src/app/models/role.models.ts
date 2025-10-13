/**
 * Comprehensive type definitions for Role Management system
 * Provides strong typing and type safety throughout the application
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface Permission extends BaseEntity {
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  isActive: boolean;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  scope: RoleScope;
  companyId?: string;
  permissions: Permission[];
  userCount: number;
  isActive: boolean;
  isSystemRole: boolean;
  parentRoleId?: string;
  priority: number;
}

export interface Company extends BaseEntity {
  name: string;
  domain: string;
  settings: CompanySettings;
  isActive: boolean;
  subscriptionPlan: SubscriptionPlan;
  maxUsers: number;
  currentUserCount: number;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  roles: Role[];
  isActive: boolean;
  lastLoginAt?: Date;
  profileImage?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

export interface RoleStats {
  totalRoles: number;
  systemRoles: number;
  companyRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  recentlyCreated: number;
  recentlyModified: number;
}

export interface FilterOptions {
  searchTerm: string;
  scope: RoleScope | 'all';
  companyId?: string;
  isActive?: boolean;
  dateRange?: DateRange;
}

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface RoleManagementState {
  roles: Role[];
  companies: Company[];
  permissions: Permission[];
  selectedCompany: Company | null;
  filters: FilterOptions;
  sort: SortOptions;
  pagination: PaginationOptions;
  isLoading: boolean;
  error: string | null;
}

// Enums for type safety
export enum RoleScope {
  SYSTEM = 'system',
  COMPANY = 'company',
  DEPARTMENT = 'department',
  PROJECT = 'project'
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve'
}

export enum PermissionScope {
  GLOBAL = 'global',
  COMPANY = 'company',
  DEPARTMENT = 'department',
  PERSONAL = 'personal'
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  USER_COUNT = 'userCount',
  SCOPE = 'scope'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

// Utility types
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface CompanySettings {
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  maxRolesPerUser: number;
  auditLogRetention: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp: Date;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Form interfaces
export interface CreateRoleRequest {
  name: string;
  description?: string;
  scope: RoleScope;
  companyId?: string;
  permissionIds: string[];
  isActive: boolean;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: string;
}

export interface RoleAssignmentRequest {
  roleId: string;
  userIds: string[];
  action: 'assign' | 'unassign';
}

// Event interfaces for component communication
export interface RoleEvent {
  type: RoleEventType;
  role: Role;
  previousRole?: Role;
}

export enum RoleEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned'
}

// Dialog interfaces
export interface RoleDialogData {
  role?: Role;
  mode: DialogMode;
  availablePermissions: Permission[];
  companies: Company[];
}

export enum DialogMode {
  CREATE = 'create',
  EDIT = 'edit',
  VIEW = 'view',
  DUPLICATE = 'duplicate'
}

// Error handling interfaces
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  severity: ErrorSeverity;
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
