import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { TaskDispatchService } from '../../services/task-dispatch.service';
import { WorkflowEngineService } from '../../services/workflow-engine.service';
import { DeviceManagementService } from '../../services/device-management.service';
import { TaskAssignment, WorkflowExecution, DeviceAssignment, TaskStatus, TaskPriority } from '../../models/task.models';

@Component({
  selector: 'app-task-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatBadgeModule,
    MatMenuModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="task-dashboard">
      <div class="dashboard-header">
        <h1>Task Management Dashboard</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createNewTask()">
            <mat-icon>add</mat-icon>
            Create Task
          </button>
          <button mat-stroked-button (click)="refreshDashboard()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-value">{{ taskStats().total }}</div>
              <div class="stat-label">Total Tasks</div>
              <mat-icon class="stat-icon">assignment</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-value">{{ taskStats().pending }}</div>
              <div class="stat-label">Pending</div>
              <mat-icon class="stat-icon pending">schedule</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-value">{{ taskStats().inProgress }}</div>
              <div class="stat-label">In Progress</div>
              <mat-icon class="stat-icon in-progress">play_circle</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-value">{{ taskStats().completed }}</div>
              <div class="stat-label">Completed</div>
              <mat-icon class="stat-icon completed">check_circle</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Content Tabs -->
      <mat-tab-group class="dashboard-tabs" animationDuration="300ms">
        <!-- Task Assignments Tab -->
        <mat-tab label="Task Assignments">
          <div class="tab-content">
            <div class="tasks-grid">
              @for (task of tasks(); track task.id) {
                <mat-card class="task-card" [class.overdue]="isOverdue(task)">
                  <mat-card-header>
                    <mat-card-title>{{ task.title }}</mat-card-title>
                    <mat-card-subtitle>
                      <mat-chip [color]="getPriorityColor(task.priority)" selected>
                        {{ task.priority.toUpperCase() }}
                      </mat-chip>
                    </mat-card-subtitle>
                    <div class="spacer"></div>
                    <button mat-icon-button [matMenuTriggerFor]="taskMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #taskMenu="matMenu">
                      <button mat-menu-item (click)="viewTask(task)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-menu-item (click)="editTask(task)">
                        <mat-icon>edit</mat-icon>
                        Edit
                      </button>
                      <button mat-menu-item (click)="reassignTask(task)">
                        <mat-icon>person_add</mat-icon>
                        Reassign
                      </button>
                      <button mat-menu-item (click)="deleteTask(task)" class="delete-action">
                        <mat-icon>delete</mat-icon>
                        Delete
                      </button>
                    </mat-menu>
                  </mat-card-header>

                  <mat-card-content>
                    <p class="task-description">{{ task.description }}</p>

                    <div class="task-meta">
                      <div class="assignee">
                        <mat-icon>person</mat-icon>
                        <span>{{ getAssigneeNames(task.assignedTo) }}</span>
                      </div>

                      @if (task.dueDate) {
                        <div class="due-date" [class.overdue]="isOverdue(task)">
                          <mat-icon>schedule</mat-icon>
                          <span>{{ task.dueDate | date:'medium' }}</span>
                        </div>
                      }
                    </div>

                    <div class="task-status">
                      <mat-chip
                        [color]="getStatusColor(task.status)"
                        selected
                        class="status-chip">
                        {{ getStatusLabel(task.status) }}
                      </mat-chip>
                    </div>
                  </mat-card-content>

                  <mat-card-actions>
                    @if (task.status === TaskStatus.PENDING) {
                      <button mat-button color="primary" (click)="startTask(task)">
                        Start Task
                      </button>
                    }
                    @if (task.status === TaskStatus.IN_PROGRESS) {
                      <button mat-button color="accent" (click)="completeTask(task)">
                        Complete
                      </button>
                      <button mat-button (click)="pauseTask(task)">
                        Pause
                      </button>
                    }
                  </mat-card-actions>
                </mat-card>
              }
            </div>

            @if (tasks().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">assignment</mat-icon>
                <h3>No tasks assigned</h3>
                <p>Create your first task to get started.</p>
                <button mat-raised-button color="primary" (click)="createNewTask()">
                  Create Task
                </button>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Workflow Executions Tab -->
        <mat-tab label="Workflow History">
          <div class="tab-content">
            <div class="workflow-list">
              @for (execution of workflowExecutions(); track execution.id) {
                <mat-card class="workflow-card">
                  <mat-card-header>
                    <mat-card-title>{{ execution.ruleName }}</mat-card-title>
                    <mat-card-subtitle>{{ execution.executedAt | date:'medium' }}</mat-card-subtitle>
                    <div class="spacer"></div>
                    <mat-chip
                      [color]="execution.status === 'completed' ? 'primary' : execution.status === 'failed' ? 'warn' : 'accent'"
                      selected>
                      {{ execution.status.toUpperCase() }}
                    </mat-chip>
                  </mat-card-header>

                  <mat-card-content>
                    <div class="workflow-details">
                      <div class="detail-item">
                        <strong>Action:</strong> {{ execution.actionType }}
                      </div>
                      <div class="detail-item">
                        <strong>Form ID:</strong> {{ execution.formId }}
                      </div>
                      <div class="detail-item">
                        <strong>Execution Time:</strong> {{ execution.executionTime }}ms
                      </div>
                      @if (execution.error) {
                        <div class="detail-item error">
                          <strong>Error:</strong> {{ execution.error }}
                        </div>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>

            @if (workflowExecutions().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">timeline</mat-icon>
                <h3>No workflow executions</h3>
                <p>Workflow automation history will appear here.</p>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Device Management Tab -->
        <mat-tab label="Devices">
          <div class="tab-content">
            <div class="devices-grid">
              @for (device of devices(); track device.id) {
                <mat-card class="device-card">
                  <mat-card-header>
                    <mat-card-title>{{ device.deviceName }}</mat-card-title>
                    <mat-card-subtitle>{{ device.platform }}</mat-card-subtitle>
                    <div class="spacer"></div>
                    <mat-chip
                      [color]="device.status === 'online' ? 'primary' : 'warn'"
                      selected>
                      {{ device.status.toUpperCase() }}
                    </mat-chip>
                  </mat-card-header>

                  <mat-card-content>
                    <div class="device-info">
                      <div class="info-item">
                        <mat-icon>smartphone</mat-icon>
                        <span>{{ device.deviceType }}</span>
                      </div>

                      @if (device.assignedUserId) {
                        <div class="info-item">
                          <mat-icon>person</mat-icon>
                          <span>{{ device.assignedUserName || 'Assigned User' }}</span>
                        </div>
                      }

                      @if (device.lastSeen) {
                        <div class="info-item">
                          <mat-icon>schedule</mat-icon>
                          <span>Last seen: {{ device.lastSeen | date:'short' }}</span>
                        </div>
                      }
                    </div>
                  </mat-card-content>

                  <mat-card-actions>
                    <button mat-button (click)="viewDeviceDetails(device)">
                      View Details
                    </button>
                    @if (!device.assignedUserId) {
                      <button mat-button color="primary" (click)="assignDevice(device)">
                        Assign User
                      </button>
                    }
                  </mat-card-actions>
                </mat-card>
              }
            </div>

            @if (devices().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">devices</mat-icon>
                <h3>No devices registered</h3>
                <p>Register devices to start field data collection.</p>
                <button mat-raised-button color="primary" (click)="registerDevice()">
                  Register Device
                </button>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Loading indicator -->
      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate" class="loading-bar"></mat-progress-bar>
      }
    </div>
  `,
  styles: [`
    .task-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .stat-value {
          font-size: 2.5rem;
          font-weight: 600;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: rgba(0, 0, 0, 0.6);
          margin-top: 4px;
        }

        .stat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          opacity: 0.6;

          &.pending { color: #ff9800; }
          &.in-progress { color: #2196f3; }
          &.completed { color: #4caf50; }
        }
      }
    }

    .dashboard-tabs {
      .mat-mdc-tab-body-wrapper {
        padding-top: 24px;
      }
    }

    .tab-content {
      min-height: 500px;
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .task-card {
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      &.overdue {
        border-left: 4px solid #f44336;
      }

      .mat-mdc-card-header {
        .spacer {
          flex: 1;
        }
      }

      .task-description {
        margin: 12px 0;
        color: rgba(0, 0, 0, 0.7);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .task-meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 16px 0;

        .assignee, .due-date {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: rgba(0, 0, 0, 0.6);

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }

          &.overdue {
            color: #f44336;
          }
        }
      }

      .task-status {
        margin-top: 16px;
      }
    }

    .workflow-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .workflow-card {
      .workflow-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;

        .detail-item {
          font-size: 0.875rem;

          &.error {
            color: #f44336;
            grid-column: 1 / -1;
          }
        }
      }
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .device-card {
      .device-info {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.875rem;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: rgba(0, 0, 0, 0.6);
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: rgba(0, 0, 0, 0.3);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        color: rgba(0, 0, 0, 0.6);
      }

      p {
        margin: 0 0 24px 0;
        color: rgba(0, 0, 0, 0.4);
      }
    }

    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    .delete-action {
      color: #f44336 !important;
    }

    .status-chip {
      font-size: 0.75rem;
      height: 24px;
    }

    mat-chip {
      font-size: 0.75rem;
    }
  `]
})
export class TaskDashboardComponent implements OnInit {
  private taskDispatchService = inject(TaskDispatchService);
  private workflowEngineService = inject(WorkflowEngineService);
  private deviceManagementService = inject(DeviceManagementService);
  private dialog = inject(MatDialog);

  // Expose enums to template
  readonly TaskStatus = TaskStatus;

  // Signals for reactive state
  tasks = signal<TaskAssignment[]>([]);
  workflowExecutions = this.workflowEngineService.recentExecutions;
  devices = this.deviceManagementService.activeDevices;
  isLoading = signal(false);

  // Computed statistics
  taskStats = computed(() => {
    const allTasks = this.tasks();
    return {
      total: allTasks.length,
      pending: allTasks.filter((t: TaskAssignment) => t.status === TaskStatus.PENDING).length,
      inProgress: allTasks.filter((t: TaskAssignment) => t.status === TaskStatus.IN_PROGRESS).length,
      completed: allTasks.filter((t: TaskAssignment) => t.status === TaskStatus.COMPLETED).length,
      overdue: allTasks.filter((t: TaskAssignment) => this.isOverdue(t)).length
    };
  });

  deviceStats = computed(() => {
    const allDevices = this.devices();
    return {
      total: allDevices.length,
      online: allDevices.filter(d => d.status === 'online').length,
      offline: allDevices.filter(d => d.status === 'offline').length
    };
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.isLoading.set(true);

    // Load initial data - in a real implementation, these would load data into signals
    this.isLoading.set(false);
  }

  refreshDashboard() {
    this.loadDashboardData();
  }

  // Task methods
  createNewTask() {
    // Open task creation dialog
    console.log('Create new task');
  }

  viewTask(task: TaskAssignment) {
    console.log('View task:', task);
  }

  editTask(task: TaskAssignment) {
    console.log('Edit task:', task);
  }

  startTask(task: TaskAssignment) {
    this.taskDispatchService.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS).subscribe({
      next: () => console.log('Task started'),
      error: (error) => console.error('Failed to start task:', error)
    });
  }

  completeTask(task: TaskAssignment) {
    this.taskDispatchService.updateTaskStatus(task.id, TaskStatus.COMPLETED).subscribe({
      next: () => console.log('Task completed'),
      error: (error) => console.error('Failed to complete task:', error)
    });
  }

  pauseTask(task: TaskAssignment) {
    this.taskDispatchService.updateTaskStatus(task.id, TaskStatus.PENDING).subscribe({
      next: () => console.log('Task paused'),
      error: (error) => console.error('Failed to pause task:', error)
    });
  }

  reassignTask(task: TaskAssignment) {
    console.log('Reassign task:', task);
  }

  deleteTask(task: TaskAssignment) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskDispatchService.deleteTaskAssignment(task.id).subscribe({
        next: () => console.log('Task deleted'),
        error: (error) => console.error('Failed to delete task:', error)
      });
    }
  }

  // Device methods
  viewDeviceDetails(device: DeviceAssignment) {
    console.log('View device:', device);
  }

  assignDevice(device: DeviceAssignment) {
    console.log('Assign device:', device);
  }

  registerDevice() {
    console.log('Register new device');
  }

  // Utility methods
  isOverdue(task: TaskAssignment): boolean {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED;
  }

  getPriorityColor(priority: TaskPriority): 'primary' | 'accent' | 'warn' {
    switch (priority) {
      case TaskPriority.HIGH:
      case TaskPriority.URGENT:
        return 'warn';
      case TaskPriority.MEDIUM:
        return 'accent';
      default:
        return 'primary';
    }
  }

  getStatusColor(status: TaskStatus): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'primary';
      case TaskStatus.IN_PROGRESS:
        return 'accent';
      case TaskStatus.OVERDUE:
        return 'warn';
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Pending';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.OVERDUE:
        return 'Overdue';
      case TaskStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getAssigneeNames(assignedTo: string[]): string {
    // In a real implementation, you would resolve user IDs to names
    return assignedTo.length > 0 ? `${assignedTo.length} assignee(s)` : 'Unassigned';
  }
}
