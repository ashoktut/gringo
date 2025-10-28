import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, combineLatest } from 'rxjs';
import { map, catchError, switchMap, tap, filter } from 'rxjs/operators';
import {
  WorkflowRule,
  WorkflowAction,
  WorkflowCondition,
  WorkflowTrigger,
  TaskAssignment,
  AssignmentType,
  LocationContext,
  WorkflowExecution,
  TaskStatus,
  TaskPriority
} from '../models/task.models';
import { Form } from '../models/form.models';
import { UserManagementService } from './user-management.service';
import { TaskDispatchService } from './task-dispatch.service';
import { NotificationService } from './notification.service';
import { EnhancedNotificationService } from './enhanced-notification.service';
import { AuthBridgeService } from './auth-bridge.service';

@Injectable({
  providedIn: 'root'
})
export class WorkflowEngineService {
  private userManagementService = inject(UserManagementService);
  private taskDispatchService = inject(TaskDispatchService);
  private notificationService = inject(NotificationService);
  private enhancedNotificationService = inject(EnhancedNotificationService);
  private authBridgeService = inject(AuthBridgeService);

  // State management
  private workflowRulesSubject = new BehaviorSubject<WorkflowRule[]>([]);
  private workflowExecutionsSubject = new BehaviorSubject<WorkflowExecution[]>([]);
  private isProcessingSubject = new BehaviorSubject<boolean>(false);

  // Signals for reactive state
  private workflowRulesSignal = signal<WorkflowRule[]>([]);
  private workflowExecutionsSignal = signal<WorkflowExecution[]>([]);
  private isProcessingSignal = signal<boolean>(false);

  // Computed properties
  activeRules = computed(() =>
    this.workflowRulesSignal().filter(rule => rule.isActive)
  );

  recentExecutions = computed(() =>
    this.workflowExecutionsSignal()
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, 50)
  );

  processingCount = computed(() =>
    this.workflowExecutionsSignal().filter(exec => exec.status === 'processing').length
  );

  // Storage keys
  private readonly WORKFLOW_RULES_KEY = 'workflow_rules';
  private readonly WORKFLOW_EXECUTIONS_KEY = 'workflow_executions';

  constructor() {
    this.initializeFromStorage();
    this.setupSubscriptions();
  }

  private initializeFromStorage(): void {
    try {
      const rulesData = localStorage.getItem(this.WORKFLOW_RULES_KEY);
      if (rulesData) {
        const rules = JSON.parse(rulesData);
        this.workflowRulesSubject.next(rules);
        this.workflowRulesSignal.set(rules);
      }

      const executionsData = localStorage.getItem(this.WORKFLOW_EXECUTIONS_KEY);
      if (executionsData) {
        const executions = JSON.parse(executionsData);
        this.workflowExecutionsSubject.next(executions);
        this.workflowExecutionsSignal.set(executions);
      }
    } catch (error) {
      console.error('Error loading workflow data from storage:', error);
    }
  }

  private setupSubscriptions(): void {
    // Sync subjects with signals
    this.workflowRulesSubject.subscribe(rules => {
      this.workflowRulesSignal.set(rules);
      localStorage.setItem(this.WORKFLOW_RULES_KEY, JSON.stringify(rules));
    });

    this.workflowExecutionsSubject.subscribe(executions => {
      this.workflowExecutionsSignal.set(executions);
      localStorage.setItem(this.WORKFLOW_EXECUTIONS_KEY, JSON.stringify(executions));
    });

    this.isProcessingSubject.subscribe(processing => {
      this.isProcessingSignal.set(processing);
    });
  }

  /**
   * Create a new workflow rule
   */
  createWorkflowRule(rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'executionCount'>): Observable<WorkflowRule> {
    try {
      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const newRule: WorkflowRule = {
        id: this.generateId(),
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        isActive: rule.isActive,
        priority: rule.priority,
        companyId: session.user.companyId || '',
        formTypes: rule.formTypes,
        createdBy: session.user.id,
        executionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const currentRules = this.workflowRulesSubject.value;
      const updatedRules = [...currentRules, newRule];
      this.workflowRulesSubject.next(updatedRules);

      this.notificationService.showSuccess('Workflow rule created successfully');
      return new Observable(observer => {
        observer.next(newRule);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Update workflow rule
   */
  updateWorkflowRule(ruleId: string, updates: Partial<Omit<WorkflowRule, 'id' | 'createdAt' | 'companyId'>>): Observable<WorkflowRule> {
    try {
      const currentRules = this.workflowRulesSubject.value;
      const ruleIndex = currentRules.findIndex(rule => rule.id === ruleId);

      if (ruleIndex === -1) {
        return throwError(() => new Error('Workflow rule not found'));
      }

      const updatedRule: WorkflowRule = {
        ...currentRules[ruleIndex],
        ...updates,
        updatedAt: new Date()
      };

      const updatedRules = [...currentRules];
      updatedRules[ruleIndex] = updatedRule;
      this.workflowRulesSubject.next(updatedRules);

      this.notificationService.showSuccess('Workflow rule updated successfully');
      return new Observable(observer => {
        observer.next(updatedRule);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Delete workflow rule
   */
  deleteWorkflowRule(ruleId: string): Observable<void> {
    try {
      const currentRules = this.workflowRulesSubject.value;
      const updatedRules = currentRules.filter(rule => rule.id !== ruleId);
      this.workflowRulesSubject.next(updatedRules);

      this.notificationService.showSuccess('Workflow rule deleted successfully');
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Get workflow rules
   */
  getWorkflowRules(): Observable<WorkflowRule[]> {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) {
      return throwError(() => new Error('No active session'));
    }

    return this.workflowRulesSubject.pipe(
      map(rules => rules.filter(rule =>
        session.user.role === 'super-admin' || rule.companyId === session.user.companyId
      ))
    );
  }

  /**
   * Process form submission through workflow engine
   */
  processFormSubmission(form: Form, locationContext?: LocationContext): Observable<TaskAssignment[]> {
    this.isProcessingSubject.next(true);

    return this.getWorkflowRules().pipe(
      switchMap(rules => {
        const applicableRules = this.findApplicableRules(form, rules, locationContext);
        return this.executeWorkflowRules(form, applicableRules, locationContext);
      }),
      tap(() => this.isProcessingSubject.next(false)),
      catchError(error => {
        this.isProcessingSubject.next(false);
        this.notificationService.showError(`Workflow processing failed: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Find applicable workflow rules for a form submission
   */
  private findApplicableRules(
    form: Form,
    rules: WorkflowRule[],
    locationContext?: LocationContext
  ): WorkflowRule[] {
    return rules.filter(rule => {
      if (!rule.isActive) return false;

      // Check trigger
      if (rule.trigger.type === 'form_submission' &&
          rule.trigger.formId &&
          rule.trigger.formId !== form.id) {
        return false;
      }

      // Check conditions
      return this.evaluateConditions(form, rule.conditions, locationContext);
    });
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(
    form: Form,
    conditions: WorkflowCondition[],
    locationContext?: LocationContext
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      switch (condition.field) {
        case 'form_type':
          return this.evaluateCondition(form.type || '', condition);

        case 'form_category':
          return this.evaluateCondition(form.category || '', condition);

        case 'priority':
          return this.evaluateCondition(form.priority || 'medium', condition);

        case 'location':
          if (!locationContext) return false;
          return this.evaluateLocationCondition(locationContext, condition);

        case 'user_role':
          const session = this.authBridgeService.getCurrentSession();
          return session ? this.evaluateCondition(session.user.role, condition) : false;

        default:
          // Check form fields
          const fieldValue = this.getFormFieldValue(form, condition.field);
          return fieldValue !== null ? this.evaluateCondition(fieldValue, condition) : false;
      }
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: any, condition: WorkflowCondition): boolean {
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === conditionValue;
      case 'not_equals':
        return value !== conditionValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'not_contains':
        return !String(value).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(conditionValue);
      case 'less_than':
        return Number(value) < Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(value);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(value);
      default:
        return false;
    }
  }

  /**
   * Evaluate location-based condition
   */
  private evaluateLocationCondition(
    locationContext: LocationContext,
    condition: WorkflowCondition
  ): boolean {
    switch (condition.operator) {
      case 'within_radius':
        return this.isWithinRadius(locationContext.coordinates, condition.value);
      case 'in_region':
        return locationContext.address?.region === condition.value;
      case 'in_city':
        return locationContext.address?.city === condition.value;
      default:
        return false;
    }
  }

  /**
   * Get form field value by path
   */
  private getFormFieldValue(form: Form, fieldPath: string): any {
    const fields = form.fields || [];
    const field = fields.find(f => f.name === fieldPath || f.id === fieldPath);
    return field ? field.value : null;
  }

  /**
   * Check if coordinates are within radius (simplified implementation)
   */
  private isWithinRadius(coordinates: [number, number], radiusConfig: any): boolean {
    // This would require proper geospatial calculation
    // For now, return true as placeholder
    return true;
  }

  /**
   * Execute workflow rules and create task assignments
   */
  private executeWorkflowRules(
    form: Form,
    rules: WorkflowRule[],
    locationContext?: LocationContext
  ): Observable<TaskAssignment[]> {
    const taskAssignments: TaskAssignment[] = [];
    const executions: WorkflowExecution[] = [];

    rules.forEach(rule => {
      rule.actions.forEach(action => {
        const execution = this.createWorkflowExecution(rule, action, form);
        executions.push(execution);

        switch (action.type) {
          case 'assign_task':
            const taskAssignment = this.createTaskAssignmentFromAction(form, action, locationContext);
            if (taskAssignment) {
              taskAssignments.push(taskAssignment);
            }
            break;

          case 'send_notification':
            this.sendNotificationFromAction(action);
            break;

          case 'escalate':
            // Handle escalation logic
            break;

          case 'update_status':
            // Handle status update logic
            break;
        }
      });
    });

    // Store executions
    const currentExecutions = this.workflowExecutionsSubject.value;
    this.workflowExecutionsSubject.next([...currentExecutions, ...executions]);

    // Create task assignments
    if (taskAssignments.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return combineLatest(
      taskAssignments.map(assignment =>
        this.taskDispatchService.createTaskAssignment({
          formConfigurationId: form.id,
          title: assignment.title,
          description: assignment.description,
          assignmentType: assignment.assignmentType,
          assignedTo: assignment.assignedTo,
          priority: assignment.priority,
          dueDate: assignment.dueDate
        })
      )
    ).pipe(
      map(() => taskAssignments),
      catchError(error => {
        this.notificationService.showError(`Task creation failed: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create workflow execution record
   */
  private createWorkflowExecution(
    rule: WorkflowRule,
    action: WorkflowAction,
    form: Form
  ): WorkflowExecution {
    return {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      actionType: action.type,
      formId: form.id,
      status: 'completed',
      executedAt: new Date().toISOString(),
      executionTime: 0, // Would be calculated in real implementation
      result: { success: true }
    };
  }

  /**
   * Create task assignment from workflow action
   */
  private createTaskAssignmentFromAction(
    form: Form,
    action: WorkflowAction,
    locationContext?: LocationContext
  ): TaskAssignment | null {
    if (action.type !== 'assign_task' || !action.parameters) {
      return null;
    }

    const session = this.authBridgeService.getCurrentSession();
    if (!session) return null;

    return {
      id: this.generateId(),
      formConfigurationId: form.id,
      title: action.parameters['title'] || `Review ${form.title}`,
      description: action.parameters['description'] || `Review submitted form: ${form.title}`,
      assignmentType: (action.parameters['assignmentType'] as AssignmentType) || AssignmentType.USER,
      assignedTo: action.parameters['assignedTo'] || [],
      assignedBy: session.user.id,
      companyId: session.user.companyId || '',
      priority: action.parameters['priority'] || TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      dueDate: action.parameters['dueDate'],
      assignedAt: new Date(),
      notifyOnAssignment: true,
      notifyOnCompletion: true,
      notifyOnOverdue: true,
      locationContext,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Send notification from workflow action
   */
  private sendNotificationFromAction(action: WorkflowAction): void {
    if (action.type === 'send_notification' && action.parameters) {
      const message = action.parameters['message'];
      const recipients = action.parameters['recipients'];
      const type = action.parameters['type'];

      // This would integrate with the notification service
      this.notificationService.showInfo(message || 'Workflow notification');
    }
  }

  /**
   * Get workflow executions
   */
  getWorkflowExecutions(): Observable<WorkflowExecution[]> {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) {
      return throwError(() => new Error('No active session'));
    }

    if (session.user.role === 'super-admin') {
      return this.workflowExecutionsSubject.asObservable();
    }

    // Filter by company - would need to join with rules
    return this.getWorkflowRules().pipe(
      switchMap(rules => {
        const companyRuleIds = rules.map(rule => rule.id);
        return this.workflowExecutionsSubject.pipe(
          map(executions => executions.filter(exec => companyRuleIds.includes(exec.ruleId)))
        );
      })
    );
  }

  /**
   * Toggle workflow rule active status
   */
  toggleRuleStatus(ruleId: string): Observable<WorkflowRule> {
    return this.updateWorkflowRule(ruleId, {}).pipe(
      switchMap(() => {
        const rule = this.workflowRulesSignal().find(r => r.id === ruleId);
        if (!rule) {
          return throwError(() => new Error('Rule not found'));
        }
        return this.updateWorkflowRule(ruleId, { isActive: !rule.isActive });
      })
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Getter methods for observables (for components that prefer observables)
  get workflowRules$(): Observable<WorkflowRule[]> {
    return this.workflowRulesSubject.asObservable();
  }

  get workflowExecutions$(): Observable<WorkflowExecution[]> {
    return this.workflowExecutionsSubject.asObservable();
  }

  get isProcessing$(): Observable<boolean> {
    return this.isProcessingSubject.asObservable();
  }
}
