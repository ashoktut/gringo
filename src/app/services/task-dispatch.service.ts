import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, EMPTY, of } from 'rxjs';
import { map, tap, catchError, switchMap, retry, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  TaskAssignment,
  TaskStatus,
  TaskPriority,
  AssignmentType,
  CreateTaskAssignmentRequest,
  UpdateTaskAssignmentRequest,
  TaskAssignmentResponse,
  TaskQueryParams,
  TaskStatistics,
  BulkTaskOperationRequest,
  BulkTaskOperation,
  TaskProgressUpdate,
  ApiResponse,
  PaginatedResponse
} from '../models/task.models';
import { EnhancedFormConfiguration } from '../models/form.models';
import { User } from '../models/user.models';

import { UserManagementService } from './user-management.service';
import { AuthBridgeService } from './auth-bridge.service';
import { NotificationService } from './notification.service';
import { EnhancedNotificationService } from './enhanced-notification.service';

/**
 * TaskDispatchService - Core service for managing task assignments
 * Implements proper separation of concerns and error handling
 */
@Injectable({
  providedIn: 'root'
})
export class TaskDispatchService {
  // Dependencies with proper injection
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserManagementService);
  private readonly authService = inject(AuthBridgeService);
  private notificationService = inject(NotificationService);
  private enhancedNotificationService = inject(EnhancedNotificationService);
  private readonly snackBar = inject(MatSnackBar);

  // State management with signals
  private readonly tasksSignal = signal<TaskAssignment[]>([]);
  private readonly statisticsSignal = signal<TaskStatistics | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Readonly public signals
  readonly tasks = this.tasksSignal.asReadonly();
  readonly statistics = this.statisticsSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed properties
  readonly pendingTasks = computed(() =>
    this.tasks().filter(task => task.status === TaskStatus.PENDING)
  );

  readonly inProgressTasks = computed(() =>
    this.tasks().filter(task => task.status === TaskStatus.IN_PROGRESS)
  );

  readonly overdueTasks = computed(() => {
    const now = new Date();
    return this.tasks().filter(task =>
      task.dueDate && new Date(task.dueDate) < now &&
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.CANCELLED
    );
  });

  readonly myTasks = computed(() => {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return [];

    return this.tasks().filter(task =>
      task.assignedTo.includes(currentUser.id)
    );
  });

  readonly urgentTasks = computed(() =>
    this.tasks().filter(task =>
      task.priority === TaskPriority.URGENT &&
      task.status !== TaskStatus.COMPLETED
    )
  );

  // API base URL - could be injected via configuration
  private readonly baseUrl = '/api/tasks';

  constructor() {
    // Initialize data on service creation
    this.loadInitialData();
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Load tasks with optional filtering
   */
  loadTasks(params: TaskQueryParams = {}): Observable<PaginatedResponse<TaskAssignment>> {
    this.setLoading(true);
    this.clearError();

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return this.handleError(new Error('User not authenticated'));
    }

    // Add company context if not super admin
    if (!this.authService.isSuperAdmin()) {
      params.companyId = currentUser.companyId;
    }

    return this.http.get<ApiResponse<PaginatedResponse<TaskAssignment>>>(this.baseUrl, {
      params: this.buildHttpParams(params)
    }).pipe(
      retry(2),
      map(response => response.data),
      tap(data => {
        this.tasksSignal.set(data.items);
        this.loadStatistics(); // Load stats after loading tasks
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Create a new task assignment
   */
  createTaskAssignment(request: CreateTaskAssignmentRequest): Observable<TaskAssignment> {
    this.setLoading(true);
    this.clearError();

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return this.handleError(new Error('User not authenticated'));
    }

    // Validate request
    const validationError = this.validateCreateRequest(request);
    if (validationError) {
      return this.handleError(new Error(validationError));
    }

    // Enrich request with current user context
    const enrichedRequest = {
      ...request,
      companyId: currentUser.companyId
    };

    return this.http.post<ApiResponse<TaskAssignmentResponse>>(this.baseUrl, enrichedRequest).pipe(
      retry(1),
      map(response => response.data.task),
      tap(task => {
        // Update local state
        this.tasksSignal.update(tasks => [task, ...tasks]);

        // Show success message
        this.showSuccess(`Task "${task.title}" assigned successfully`);

        // Send enhanced notification
        this.enhancedNotificationService.sendTaskAssignmentNotification(
          task.id,
          task.title,
          task.assignedTo,
          task.assignedBy,
          task.dueDate
        ).subscribe({
          next: () => console.log('Task assignment notification sent'),
          error: (error) => console.error('Failed to send notification:', error)
        });

        // Send notifications if enabled
        if (task.notifyOnAssignment) {
          this.sendTaskNotifications(task, 'ASSIGNED');
        }
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Update existing task assignment
   */
  updateTaskAssignment(request: UpdateTaskAssignmentRequest): Observable<TaskAssignment> {
    this.setLoading(true);
    this.clearError();

    if (!request.id) {
      return this.handleError(new Error('Task ID is required for update'));
    }

    return this.http.put<ApiResponse<TaskAssignment>>(`${this.baseUrl}/${request.id}`, request).pipe(
      retry(1),
      map(response => response.data),
      tap(updatedTask => {
        // Update local state
        this.tasksSignal.update(tasks =>
          tasks.map(task => task.id === updatedTask.id ? updatedTask : task)
        );

        this.showSuccess(`Task "${updatedTask.title}" updated successfully`);
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TaskStatus, notes?: string): Observable<TaskAssignment> {
    this.setLoading(true);
    this.clearError();

    const updateData = {
      status,
      notes,
      timestamp: new Date().toISOString()
    };

    return this.http.patch<ApiResponse<TaskAssignment>>(`${this.baseUrl}/${taskId}/status`, updateData).pipe(
      retry(1),
      map(response => response.data),
      tap(updatedTask => {
        // Update local state
        this.tasksSignal.update(tasks =>
          tasks.map(task => task.id === updatedTask.id ? updatedTask : task)
        );

        // Handle status-specific actions
        this.handleStatusChange(updatedTask, status);

        this.showSuccess(`Task status updated to ${status.toLowerCase()}`);
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Delete task assignment
   */
  deleteTaskAssignment(taskId: string): Observable<void> {
    this.setLoading(true);
    this.clearError();

    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${taskId}`).pipe(
      retry(1),
      map(response => response.data),
      tap(() => {
        // Update local state
        this.tasksSignal.update(tasks =>
          tasks.filter(task => task.id !== taskId)
        );

        this.showSuccess('Task assignment deleted successfully');
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Bulk operations on tasks
   */
  performBulkOperation(request: BulkTaskOperationRequest): Observable<TaskAssignment[]> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<TaskAssignment[]>>(`${this.baseUrl}/bulk`, request).pipe(
      retry(1),
      map(response => response.data),
      tap(updatedTasks => {
        // Update local state
        this.tasksSignal.update(tasks => {
          const updatedTasksMap = new Map(updatedTasks.map(t => [t.id, t]));
          return tasks.map(task => updatedTasksMap.get(task.id) || task);
        });

        this.showSuccess(`Bulk operation completed for ${updatedTasks.length} tasks`);
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * Get task by ID with full details
   */
  getTaskById(taskId: string): Observable<TaskAssignment> {
    return this.http.get<ApiResponse<TaskAssignment>>(`${this.baseUrl}/${taskId}`).pipe(
      map(response => response.data),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Load task statistics
   */
  loadStatistics(): Observable<TaskStatistics> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return this.handleError(new Error('User not authenticated'));
    }

    const params: any = {};
    if (!this.authService.isSuperAdmin()) {
      params.companyId = currentUser.companyId;
    }

    return this.http.get<ApiResponse<TaskStatistics>>(`${this.baseUrl}/statistics`, { params }).pipe(
      map(response => response.data),
      tap(stats => this.statisticsSignal.set(stats)),
      catchError(error => {
        console.error('Failed to load task statistics:', error);
        return of({
          totalTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          cancelledTasks: 0,
          averageCompletionTime: 0,
          completionRate: 0,
          onTimeDeliveryRate: 0,
          tasksThisWeek: 0,
          tasksThisMonth: 0,
          urgentTasks: 0,
          highPriorityTasks: 0,
          lastUpdated: new Date()
        } as TaskStatistics);
      })
    );
  }

  // ==================== ASSIGNMENT HELPER METHODS ====================

  /**
   * Assign task to specific users
   */
  assignToUsers(formId: string, userIds: string[], options: Partial<CreateTaskAssignmentRequest>): Observable<TaskAssignment> {
    return this.createTaskAssignment({
      formConfigurationId: formId,
      assignedTo: userIds,
      assignmentType: AssignmentType.USER,
      title: options.title || 'Form Assignment',
      priority: TaskPriority.MEDIUM,
      notifyOnAssignment: true,
      ...options
    });
  }

  /**
   * Assign task to users with specific role
   */
  assignToRole(formId: string, roleName: string, options: Partial<CreateTaskAssignmentRequest>): Observable<TaskAssignment> {
    // Get users with the specified role
    return this.userService.getUsersByRole(roleName).pipe(
      switchMap(users => {
        if (users.length === 0) {
          return this.handleError(new Error(`No users found with role: ${roleName}`));
        }

        const userIds = users.map(user => user.id);
        return this.createTaskAssignment({
          formConfigurationId: formId,
          assignedTo: userIds,
          assignmentType: AssignmentType.ROLE,
          title: options.title || `Form Assignment (${roleName})`,
          priority: TaskPriority.MEDIUM,
          notifyOnAssignment: true,
          ...options
        });
      })
    );
  }

  /**
   * Assign task to devices
   */
  assignToDevices(formId: string, deviceIds: string[], options: Partial<CreateTaskAssignmentRequest>): Observable<TaskAssignment> {
    return this.createTaskAssignment({
      formConfigurationId: formId,
      assignedTo: deviceIds,
      assignmentType: AssignmentType.DEVICE,
      title: options.title || 'Device Assignment',
      priority: TaskPriority.MEDIUM,
      notifyOnAssignment: true,
      ...options
    });
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private loadInitialData(): void {
    // Load tasks and statistics on service initialization
    this.loadTasks().subscribe();
  }

  private validateCreateRequest(request: CreateTaskAssignmentRequest): string | null {
    if (!request.formConfigurationId) {
      return 'Form configuration ID is required';
    }
    if (!request.title || request.title.trim().length === 0) {
      return 'Task title is required';
    }
    if (!request.assignedTo || request.assignedTo.length === 0) {
      return 'At least one assignee is required';
    }
    if (!Object.values(AssignmentType).includes(request.assignmentType)) {
      return 'Invalid assignment type';
    }
    return null;
  }

  private handleStatusChange(task: TaskAssignment, newStatus: TaskStatus): void {
    switch (newStatus) {
      case TaskStatus.IN_PROGRESS:
        this.onTaskStarted(task);
        break;
      case TaskStatus.COMPLETED:
        this.onTaskCompleted(task);
        break;
      case TaskStatus.OVERDUE:
        this.onTaskOverdue(task);
        break;
      case TaskStatus.CANCELLED:
        this.onTaskCancelled(task);
        break;
    }
  }

  private onTaskStarted(task: TaskAssignment): void {
    console.log(`Task started: ${task.title}`);
    // Could implement additional logic like time tracking
  }

  private onTaskCompleted(task: TaskAssignment): void {
    console.log(`Task completed: ${task.title}`);

    if (task.notifyOnCompletion) {
      this.sendTaskNotifications(task, 'COMPLETED');
    }

    // Could trigger workflow actions
  }

  private onTaskOverdue(task: TaskAssignment): void {
    console.log(`Task overdue: ${task.title}`);
    this.sendTaskNotifications(task, 'OVERDUE');
  }

  private onTaskCancelled(task: TaskAssignment): void {
    console.log(`Task cancelled: ${task.title}`);
  }

  private sendTaskNotifications(task: TaskAssignment, type: 'ASSIGNED' | 'COMPLETED' | 'OVERDUE'): void {
    // This will be implemented when we create the enhanced notification service
    console.log(`Sending ${type} notification for task: ${task.title}`);

    // For now, just show a snackbar
    const message = this.getNotificationMessage(task, type);
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }

  private getNotificationMessage(task: TaskAssignment, type: string): string {
    switch (type) {
      case 'ASSIGNED':
        return `Task "${task.title}" has been assigned`;
      case 'COMPLETED':
        return `Task "${task.title}" has been completed`;
      case 'OVERDUE':
        return `Task "${task.title}" is overdue`;
      default:
        return `Task "${task.title}" status updated`;
    }
  }

  private buildHttpParams(params: any): any {
    const httpParams: any = {};

    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        if (value instanceof Date) {
          httpParams[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          httpParams[key] = value.join(',');
        } else {
          httpParams[key] = value.toString();
        }
      }
    });

    return httpParams;
  }

  private setLoading(loading: boolean): void {
    this.isLoadingSignal.set(loading);
  }

  private clearError(): void {
    this.errorSignal.set(null);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('TaskDispatchService error:', error);

    let errorMessage = 'An unexpected error occurred';

    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.status === 403) {
        errorMessage = 'Access denied';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    this.errorSignal.set(errorMessage);
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });

    return throwError(() => error);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Refresh tasks data
   */
  refreshTasks(): Observable<PaginatedResponse<TaskAssignment>> {
    return this.loadTasks();
  }

  /**
   * Clear all local data
   */
  clearData(): void {
    this.tasksSignal.set([]);
    this.statisticsSignal.set(null);
    this.clearError();
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): TaskAssignment[] {
    return this.tasks().filter(task => task.status === status);
  }

  /**
   * Get tasks by priority
   */
  getTasksByPriority(priority: TaskPriority): TaskAssignment[] {
    return this.tasks().filter(task => task.priority === priority);
  }

  /**
   * Check if user can manage tasks
   */
  canManageTasks(): boolean {
    return this.authService.isCompanyAdmin() || this.authService.isSuperAdmin();
  }

  /**
   * Check if user can create tasks
   */
  canCreateTasks(): boolean {
    return this.canManageTasks();
  }

  /**
   * Check if user can delete tasks
   */
  canDeleteTasks(): boolean {
    return this.authService.isSuperAdmin();
  }
}
