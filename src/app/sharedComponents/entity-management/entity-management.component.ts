import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, startWith, map } from 'rxjs/operators';

/**
 * Generic interface for entities managed by this component
 */
export interface ManagedEntity {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Configuration for entity management
 */
export interface EntityManagementConfig<T extends ManagedEntity> {
  entityName: string;
  entityNamePlural: string;
  icon: string;
  columns: EntityColumn[];
  actions: EntityAction<T>[];
  createFormFields: FormFieldConfig[];
  editFormFields: FormFieldConfig[];
  filters?: FilterConfig[];
  sorting?: SortConfig[];
  pagination?: PaginationConfig;
  permissions?: EntityPermissions;
}

/**
 * Column configuration for the data table
 */
export interface EntityColumn {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'chip' | 'custom';
  sortable?: boolean;
  width?: string;
  format?: (value: any) => string;
  customTemplate?: string;
}

/**
 * Action configuration for entity operations
 */
export interface EntityAction<T> {
  id: string;
  label: string;
  icon: string;
  color?: 'primary' | 'accent' | 'warn';
  type: 'button' | 'menu-item';
  visible?: (entity: T) => boolean;
  disabled?: (entity: T) => boolean;
  handler: (entity: T) => void | Promise<void>;
}

/**
 * Form field configuration for create/edit forms
 */
export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  validators?: any[];
  options?: { value: any, label: string }[];
  hint?: string;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date-range';
  options?: { value: any, label: string }[];
}

/**
 * Sort configuration
 */
export interface SortConfig {
  key: string;
  label: string;
  direction?: 'asc' | 'desc';
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  pageSize: number;
  pageSizeOptions: number[];
  showFirstLastButtons?: boolean;
}

/**
 * Permission configuration
 */
export interface EntityPermissions {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
}

/**
 * Service interface that entity services should implement
 */
export interface EntityService<T extends ManagedEntity> {
  getAll(): Observable<T[]>;
  getById(id: string): Observable<T | null>;
  create(entity: Partial<T>): Observable<T>;
  update(id: string, entity: Partial<T>): Observable<T>;
  delete(id: string): Observable<boolean>;
  search?(query: string): Observable<T[]>;
  getStatistics?(): Observable<Record<string, number>>;
}

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatCheckboxModule
  ],
  templateUrl: './entity-management.component.html',
  styleUrls: ['./entity-management.component.css']
})
export class EntityManagementComponent<T extends ManagedEntity> implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');
  private filterSubject = new BehaviorSubject<Record<string, any>>({});

  // Reference to global Object for template use
  Object = Object;

  // Inputs
  @Input({ required: true }) config!: EntityManagementConfig<T>;
  @Input({ required: true }) service!: EntityService<T>;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() showStatistics = true;
  @Input() enableSearch = true;
  @Input() enableFilters = true;
  @Input() enableBulkActions = false;

  // Outputs
  @Output() entityCreated = new EventEmitter<T>();
  @Output() entityUpdated = new EventEmitter<T>();
  @Output() entityDeleted = new EventEmitter<string>();
  @Output() selectionChanged = new EventEmitter<T[]>();

  // Signals
  entities = signal<T[]>([]);
  filteredEntities = signal<T[]>([]);
  selectedEntities = signal<T[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  statistics = signal<Record<string, number>>({});
  searchQuery = signal('');
  activeFilters = signal<Record<string, any>>({});

  // Computed values
  displayedColumns = computed(() => {
    const columns = this.config?.columns.map(col => col.key) || [];
    if (this.enableBulkActions) {
      columns.unshift('select');
    }
    columns.push('actions');
    return columns;
  });

  hasPermission = computed(() => ({
    canCreate: this.config?.permissions?.canCreate ?? true,
    canEdit: this.config?.permissions?.canEdit ?? true,
    canDelete: this.config?.permissions?.canDelete ?? true,
    canView: this.config?.permissions?.canView ?? true
  }));

  // Data source for Material Table
  dataSource = new MatTableDataSource<T>([]);

  // Forms
  createForm!: FormGroup;
  editForm!: FormGroup;
  filterForm!: FormGroup;

  // Dialog states
  showCreateDialog = signal(false);
  showEditDialog = signal(false);
  showFilterDialog = signal(false);
  editingEntity = signal<T | null>(null);

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.setupSubscriptions();
    this.loadEntities();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.createForm = this.buildForm(this.config.createFormFields);
    this.editForm = this.buildForm(this.config.editFormFields);
    this.filterForm = this.buildFilterForm();
  }

  private buildForm(fields: FormFieldConfig[]): FormGroup {
    const formControls: Record<string, any> = {};

    fields.forEach(field => {
      const validators = field.validators || [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.maxLength) {
        validators.push(Validators.maxLength(field.maxLength));
      }
      if (field.minLength) {
        validators.push(Validators.minLength(field.minLength));
      }

      formControls[field.key] = [
        { value: '', disabled: field.disabled || false },
        validators
      ];
    });

    return this.fb.group(formControls);
  }

  private buildFilterForm(): FormGroup {
    const formControls: Record<string, any> = {};

    (this.config.filters || []).forEach(filter => {
      formControls[filter.key] = [''];
    });

    return this.fb.group(formControls);
  }

  private setupSubscriptions(): void {
    // Search functionality
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.applyFilters();
    });

    // Filter functionality
    this.filterSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      this.activeFilters.set(filters);
      this.applyFilters();
    });

    // Filter form changes
    if (this.filterForm) {
      this.filterForm.valueChanges.pipe(
        startWith(this.filterForm.value),
        takeUntil(this.destroy$)
      ).subscribe(filters => {
        this.filterSubject.next(filters);
      });
    }
  }

  private loadEntities(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve) => {
      this.service.getAll().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (entities) => {
          this.entities.set(entities);
          this.applyFilters();
          this.isLoading.set(false);
          resolve();
        },
        error: (error) => {
          this.error.set('Failed to load entities');
          this.isLoading.set(false);
          this.showErrorMessage('Failed to load entities');
          resolve();
        }
      });
    });
  }

  private loadStatistics(): void {
    if (this.service.getStatistics && this.showStatistics) {
      this.service.getStatistics().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (stats) => this.statistics.set(stats),
        error: () => this.statistics.set({})
      });
    }
  }

  private applyFilters(): void {
    let filtered = [...this.entities()];
    const query = this.searchQuery().toLowerCase();
    const filters = this.activeFilters();

    // Apply search filter
    if (query) {
      filtered = filtered.filter(entity =>
        entity.name.toLowerCase().includes(query) ||
        (entity.description && entity.description.toLowerCase().includes(query))
      );
    }

    // Apply custom filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(entity => {
          const entityValue = entity[key];
          if (typeof value === 'string') {
            return entityValue?.toString().toLowerCase().includes(value.toLowerCase());
          }
          return entityValue === value;
        });
      }
    });

    this.filteredEntities.set(filtered);
    this.dataSource.data = filtered;
  }

  // Public methods for external use
  onSearch(query: string): void {
    this.searchSubject.next(query);
  }

  onCreateEntity(): void {
    this.createForm.reset();
    this.showCreateDialog.set(true);
  }

  onEditEntity(entity: T): void {
    this.editingEntity.set(entity);
    this.editForm.patchValue(entity);
    this.showEditDialog.set(true);
  }

  onDeleteEntity(entity: T): void {
    if (confirm(`Are you sure you want to delete ${entity.name}?`)) {
      this.isLoading.set(true);
      this.service.delete(entity.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (success) => {
          if (success) {
            this.loadEntities().then(() => {
              this.showSuccessMessage(`${entity.name} deleted successfully`);
              this.entityDeleted.emit(entity.id);
            });
          } else {
            this.showErrorMessage('Failed to delete entity');
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.showErrorMessage('Failed to delete entity');
        }
      });
    }
  }

  onSubmitCreate(): void {
    if (this.createForm.valid) {
      this.isLoading.set(true);
      const entityData = this.createForm.value;

      this.service.create(entityData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (created) => {
          this.loadEntities().then(() => {
            this.showCreateDialog.set(false);
            this.showSuccessMessage(`${created.name} created successfully`);
            this.entityCreated.emit(created);
          });
        },
        error: () => {
          this.isLoading.set(false);
          this.showErrorMessage('Failed to create entity');
        }
      });
    }
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.editingEntity()) {
      this.isLoading.set(true);
      const entityData = this.editForm.value;
      const entityId = this.editingEntity()!.id;

      this.service.update(entityId, entityData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (updated) => {
          this.loadEntities().then(() => {
            this.showEditDialog.set(false);
            this.editingEntity.set(null);
            this.showSuccessMessage(`${updated.name} updated successfully`);
            this.entityUpdated.emit(updated);
          });
        },
        error: () => {
          this.isLoading.set(false);
          this.showErrorMessage('Failed to update entity');
        }
      });
    }
  }

  onCancelCreate(): void {
    this.showCreateDialog.set(false);
    this.createForm.reset();
  }

  onCancelEdit(): void {
    this.showEditDialog.set(false);
    this.editForm.reset();
    this.editingEntity.set(null);
  }

  onRefresh(): void {
    this.loadEntities();
    this.loadStatistics();
  }

  getColumnValue(entity: T, column: EntityColumn): string {
    const value = entity[column.key];

    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return value?.toString() || '0';
      default:
        return value?.toString() || '';
    }
  }

  isActionVisible(action: EntityAction<T>, entity: T): boolean {
    return action.visible ? action.visible(entity) : true;
  }

  isActionDisabled(action: EntityAction<T>, entity: T): boolean {
    return action.disabled ? action.disabled(entity) : false;
  }

  executeAction(action: EntityAction<T>, entity: T): void {
    try {
      const result = action.handler(entity);
      if (result instanceof Promise) {
        result.catch(() => {
          this.showErrorMessage(`Failed to execute ${action.label}`);
        });
      }
    } catch (error) {
      this.showErrorMessage(`Failed to execute ${action.label}`);
    }
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper methods for template
  clearFilter(filterKey: string): void {
    const currentValue = this.filterForm.value;
    currentValue[filterKey] = '';
    this.filterForm.patchValue(currentValue);
  }

  clearAllFilters(): void {
    this.onSearch('');
    this.filterForm.reset();
  }

  hasActiveFilters(): boolean {
    const filters = this.activeFilters();
    return Object.keys(filters).some(k => filters[k]);
  }

  hasMenuActions(entity: T): boolean {
    return this.config.actions.some(a => a.type === 'menu-item' && this.isActionVisible(a, entity));
  }
}
