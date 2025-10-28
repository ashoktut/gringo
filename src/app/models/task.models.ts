import { FormSubmission, EnhancedFormConfiguration } from './form.models';
import { User, Company } from './user.models';

/**
 * Task Assignment Status Enum
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

/**
 * Task Priority Levels
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Assignment Type
 */
export enum AssignmentType {
  USER = 'USER',
  ROLE = 'ROLE',
  DEVICE = 'DEVICE',
  TEAM = 'TEAM'
}

/**
 * Main Task Assignment Interface
 */
export interface TaskAssignment {
  id: string;
  formConfigurationId: string;
  formConfiguration?: EnhancedFormConfiguration;

  // Assignment details
  assignedBy: string;
  assignedByUser?: User;
  assignedTo: string[];              // Array of user IDs, device IDs, or role IDs
  assignmentType: AssignmentType;
  companyId: string;
  company?: Company;

  // Task information
  title: string;
  description?: string;
  instructions?: string;
  priority: TaskPriority;
  status: TaskStatus;

  // Pre-filled data for the form
  prefillData?: Record<string, any>;

  // Scheduling and deadlines
  assignedAt: Date;
  dueDate?: Date;
  scheduledFor?: Date;
  estimatedDuration?: number;        // In minutes

  // Progress tracking
  startedAt?: Date;
  completedAt?: Date;
  submissionId?: string;
  submission?: FormSubmission;

  // Location context
  locationContext?: LocationContext;

  // Notification settings
  notifyOnAssignment: boolean;
  notifyOnCompletion: boolean;
  notifyOnOverdue: boolean;
  escalationRules?: EscalationRule[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;                   // For optimistic concurrency control

  // Additional context
  tags?: string[];
  customFields?: Record<string, any>;
  attachments?: TaskAttachment[];
}

/**
 * Location Context for Tasks
 */
export interface LocationContext {
  coordinates: [number, number]; // [longitude, latitude]
  address: {
    street?: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
  locationName?: string;             // e.g., "Building A - Floor 3"
  geofenceRadius?: number;          // In meters
  requireLocationVerification?: boolean;
  accuracy?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Escalation Rules
 */
export interface EscalationRule {
  id: string;
  delayMinutes: number;
  escalateTo: string[];             // User IDs to escalate to
  notificationTemplate: string;
  condition?: EscalationCondition;
  isActive: boolean;
}

/**
 * Escalation Conditions
 */
export interface EscalationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * Task Attachments
 */
export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
}

/**
 * Device Assignment for Field Workers
 */
export interface DeviceAssignment {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: string;

  // Authentication
  qrCode?: string;
  accessKey?: string;

  // Status
  status: DeviceStatus;
  isActive: boolean;
  isOnline: boolean;
  lastSeen?: Date;

  // Assignment
  assignedUser?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedBy?: string;
  assignedAt?: Date;
  companyId?: string;

  // Capabilities and location
  capabilities?: DeviceCapabilities;
  location?: DeviceLocation;
  lastKnownLocation?: LocationContext;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device Types
 */
export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
  SCANNER = 'SCANNER',
  KIOSK = 'KIOSK'
}

/**
 * Device Session for Authentication (Legacy - use newer DeviceSession interface)
 */
export interface LegacyDeviceSession {
  sessionId: string;
  deviceId: string;
  userId?: string;
  expiresAt: Date;
  isActive: boolean;
  assignedTasks: TaskAssignment[];

  // Session context
  loginMethod: 'QR_CODE' | 'ACCESS_KEY' | 'USER_LOGIN';
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
}

/**
 * Workflow Configuration
 */
export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;

  // Trigger conditions
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];

  // Actions to execute
  actions: WorkflowAction[];

  // Settings
  isActive: boolean;
  priority: number;                  // Higher number = higher priority

  // Company context
  companyId: string;
  formTypes?: string[];             // Limit to specific form types

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

/**
 * Workflow Triggers
 */
export interface WorkflowTrigger {
  type: 'form_submission' | 'task_completed' | 'deadline_approaching' | 'status_changed' | 'location_entered';
  formId?: string;
  eventId?: string;
  conditions?: Record<string, any>;
}

/**
 * Workflow Conditions
 */
export interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';   // For combining multiple conditions
}

/**
 * Condition Operators
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'within_radius'
  | 'in_region'
  | 'in_city';

/**
 * Workflow Actions
 */
export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  parameters?: Record<string, any>;

  // Target configuration
  targetFormId?: string;
  assignTo?: string[];              // User IDs, role IDs, or device IDs
  assignmentType?: AssignmentType;

  // Action details
  title?: string;
  instructions?: string;
  priority?: TaskPriority;
  dueDate?: Date;                   // Or relative: "+2 days"
  relativeDueDays?: number;

  // Data transformation
  prefillData?: Record<string, any>;
  dataMapping?: DataMapping[];

  // Notification settings
  notificationTemplate?: string;
  emailRecipients?: string[];

  // Conditional execution
  executeIf?: WorkflowCondition[];

  // Retry settings
  retryAttempts?: number;
  retryDelayMinutes?: number;
}

/**
 * Workflow Action Types
 */
export type WorkflowActionType =
  | 'assign_task'
  | 'send_notification'
  | 'escalate'
  | 'update_status'
  | 'create_form'
  | 'webhook'
  | 'email';

/**
 * Data Mapping for Workflow Actions
 */
export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: DataTransformation;
}

/**
 * Data Transformation Types
 */
export enum DataTransformation {
  NONE = 'NONE',
  UPPERCASE = 'UPPERCASE',
  LOWERCASE = 'LOWERCASE',
  CAPITALIZE = 'CAPITALIZE',
  DATE_FORMAT = 'DATE_FORMAT',
  NUMBER_FORMAT = 'NUMBER_FORMAT',
  CUSTOM_FUNCTION = 'CUSTOM_FUNCTION'
}

/**
 * Task Statistics
 */
export interface TaskStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  cancelledTasks: number;

  // Performance metrics
  averageCompletionTime: number;     // In minutes
  completionRate: number;            // Percentage
  onTimeDeliveryRate: number;        // Percentage

  // Time-based stats
  tasksThisWeek: number;
  tasksThisMonth: number;

  // By priority
  urgentTasks: number;
  highPriorityTasks: number;

  lastUpdated: Date;
}

/**
 * Task Query Parameters
 */
export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  assignedBy?: string;
  companyId?: string;
  formType?: string;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create Task Assignment Request
 */
export interface CreateTaskAssignmentRequest {
  formConfigurationId: string;
  title: string;
  description?: string;
  instructions?: string;
  assignedTo: string[];
  assignmentType: AssignmentType;
  priority?: TaskPriority;
  dueDate?: Date;
  scheduledFor?: Date;
  estimatedDuration?: number;
  prefillData?: Record<string, any>;
  locationContext?: Partial<LocationContext>;
  notifyOnAssignment?: boolean;
  notifyOnCompletion?: boolean;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Update Task Assignment Request
 */
export interface UpdateTaskAssignmentRequest extends Partial<CreateTaskAssignmentRequest> {
  id: string;
  version: number;                   // For optimistic concurrency control
}

/**
 * Task Assignment Response
 */
export interface TaskAssignmentResponse {
  task: TaskAssignment;
  affectedUsers: User[];
  notifications: NotificationResult[];
}

/**
 * Notification Result
 */
export interface NotificationResult {
  userId: string;
  type: 'PUSH' | 'EMAIL' | 'SMS';
  status: 'SENT' | 'FAILED' | 'PENDING';
  message?: string;
  timestamp: Date;
}

/**
 * Bulk Task Operation Request
 */
export interface BulkTaskOperationRequest {
  taskIds: string[];
  operation: BulkTaskOperation;
  data?: any;
}

/**
 * Bulk Task Operations
 */
export enum BulkTaskOperation {
  UPDATE_STATUS = 'UPDATE_STATUS',
  UPDATE_PRIORITY = 'UPDATE_PRIORITY',
  REASSIGN = 'REASSIGN',
  CANCEL = 'CANCEL',
  EXTEND_DEADLINE = 'EXTEND_DEADLINE',
  ADD_TAGS = 'ADD_TAGS',
  REMOVE_TAGS = 'REMOVE_TAGS'
}

/**
 * Task Progress Update
 */
export interface TaskProgressUpdate {
  taskId: string;
  status: TaskStatus;
  progressPercentage?: number;
  notes?: string;
  location?: LocationContext;
  attachments?: File[];
  timestamp: Date;
}

/**
 * Task Comment System
 */
export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  comment: string;
  attachments?: TaskAttachment[];
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Device Information for Registration
 */
export interface DeviceInfo {
  deviceId: string;
  name: string;
  type: DeviceType;
  platform: string;
  version?: string;
  capabilities?: DeviceCapability[];
}

/**
 * Device Capabilities
 */
export enum DeviceCapability {
  CAMERA = 'CAMERA',
  GPS = 'GPS',
  BARCODE_SCANNER = 'BARCODE_SCANNER',
  NFC = 'NFC',
  BLUETOOTH = 'BLUETOOTH',
  OFFLINE_STORAGE = 'OFFLINE_STORAGE',
  PUSH_NOTIFICATIONS = 'PUSH_NOTIFICATIONS'
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Workflow Execution History
 */
export interface WorkflowExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  actionType: WorkflowActionType;
  formId: string;
  status: 'processing' | 'completed' | 'failed';
  executedAt: string;
  executionTime: number; // milliseconds
  result: any;
  error?: string;
}



/**
 * Device Status
 */
export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error';

/**
 * Device Capabilities
 */
export interface DeviceCapabilities {
  hasCamera: boolean;
  hasGPS: boolean;
  hasInternet: boolean;
  canSync: boolean;
  supportsPWA: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

/**
 * QR Authentication Result
 */
export interface QRAuthResult {
  success: boolean;
  deviceId?: string;
  sessionId?: string;
  capabilities?: DeviceCapabilities;
  companyId?: string;
  error?: string;
}

/**
 * Device Session
 */
export interface DeviceSession {
  id: string;
  deviceId: string;
  userId: string;
  companyId: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  location?: DeviceLocation;
  capabilities?: DeviceCapabilities;
}

/**
 * Device Location
 */
export interface DeviceLocation {
  coordinates: [number, number];
  address?: string;
  timestamp: string;
}

/**
 * Device Sync
 */
export interface DeviceSync {
  id: string;
  deviceId: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: number;
  error?: string;
}
