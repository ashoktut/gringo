import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Role, RoleAssignmentRequest } from '../../../../models/role.models';
import { RoleManagementService } from '../../../../services/role-management.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-assign-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>people</mat-icon>
      Assign Users to Role
    </h2>

    <mat-dialog-content>
      <div class="role-info-card">
        <h3>{{ role.name }}</h3>
        <p>{{ role.description }}</p>
        <div class="role-meta">
          <span class="meta-item">
            <mat-icon>business</mat-icon>
            {{ role.scope }}
          </span>
          <span class="meta-item">
            <mat-icon>security</mat-icon>
            {{ role.permissions.length }} permissions
          </span>
        </div>
      </div>

      <form [formGroup]="assignForm" class="assign-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Search Users</mat-label>
          <input
            matInput
            formControlName="userSearch"
            placeholder="Type to search users by name or email"
            [matAutocomplete]="auto">
          <mat-icon matSuffix>search</mat-icon>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onUserSelected($event.option.value)">
            @for (user of filteredUsers$ | async; track user.id) {
              <mat-option [value]="user">
                <div class="user-option">
                  <div class="user-info">
                    <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
                    <span class="user-email">{{ user.email }}</span>
                  </div>
                  @if (isUserSelected(user.id)) {
                    <mat-icon class="selected-icon">check_circle</mat-icon>
                  }
                </div>
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <div class="selected-users-section">
          <h4>Selected Users ({{ selectedUsers().length }})</h4>

          @if (selectedUsers().length === 0) {
            <div class="empty-state">
              <mat-icon>person_add</mat-icon>
              <p>No users selected. Search and select users to assign this role.</p>
            </div>
          } @else {
            <div class="selected-users-list">
              @for (user of selectedUsers(); track user.id) {
                <div class="user-chip">
                  <div class="user-chip-info">
                    <span class="user-chip-name">{{ user.firstName }} {{ user.lastName }}</span>
                    <span class="user-chip-email">{{ user.email }}</span>
                  </div>
                  <button mat-icon-button (click)="removeUser(user.id)" type="button">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <div class="assignment-options">
          <mat-checkbox formControlName="notifyUsers">
            <span>Send email notification to users</span>
          </mat-checkbox>
          <mat-checkbox formControlName="activateImmediately">
            <span>Activate role assignment immediately</span>
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isSubmitting()">
        Cancel
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="selectedUsers().length === 0 || isSubmitting()">
        @if (isSubmitting()) {
          <mat-spinner diameter="20"></mat-spinner>
          <span>Assigning...</span>
        } @else {
          <ng-container>
            <mat-icon>person_add</mat-icon>
            <span>Assign to {{ selectedUsers().length }} User(s)</span>
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .role-info-card { padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; margin-bottom: 1.5rem; }
    .role-info-card h3 { margin: 0 0 0.5rem 0; font-size: 1.25rem; }
    .role-info-card p { margin: 0 0 1rem 0; opacity: 0.9; }
    .role-meta { display: flex; gap: 1rem; }
    .meta-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; }
    .assign-form { display: flex; flex-direction: column; gap: 1rem; min-width: 500px; max-width: 600px; }
    .full-width { width: 100%; }
    .user-option { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-weight: 500; font-size: 0.875rem; }
    .user-email { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); }
    .selected-icon { color: #4caf50; }
    .selected-users-section { margin-top: 1rem; }
    .selected-users-section h4 { margin: 0 0 1rem 0; font-size: 0.875rem; font-weight: 500; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; background-color: rgba(0, 0, 0, 0.04); border-radius: 8px; text-align: center; color: rgba(0, 0, 0, 0.6); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5; }
    .selected-users-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
    .user-chip { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background-color: rgba(0, 0, 0, 0.04); border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; transition: background-color 0.2s; }
    .user-chip:hover { background-color: rgba(0, 0, 0, 0.08); }
    .user-chip-info { display: flex; flex-direction: column; }
    .user-chip-name { font-weight: 500; font-size: 0.875rem; }
    .user-chip-email { font-size: 0.75rem; color: rgba(0, 0, 0, 0.6); }
    .assignment-options { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; background-color: rgba(0, 0, 0, 0.04); border-radius: 4px; }
    mat-dialog-actions button { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class AssignRoleDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<AssignRoleDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleManagementService);
  readonly role: Role = inject(MAT_DIALOG_DATA);

  readonly isSubmitting = signal(false);
  readonly selectedUsers = signal<User[]>([]);
  readonly availableUsers = signal<User[]>([]);

  assignForm!: FormGroup;
  filteredUsers$!: Observable<User[]>;

  ngOnInit(): void {
    this.assignForm = this.fb.group({
      userSearch: [''],
      notifyUsers: [true],
      activateImmediately: [true]
    });

    // Mock users data - replace with actual API call
    this.loadAvailableUsers();

    // Setup autocomplete filtering
    this.filteredUsers$ = this.assignForm.get('userSearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterUsers(typeof value === 'string' ? value : ''))
    );
  }

  private loadAvailableUsers(): void {
    // Mock data - replace with actual API call
    const mockUsers: User[] = [
      { id: '1', email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe', isActive: true },
      { id: '2', email: 'jane.smith@example.com', firstName: 'Jane', lastName: 'Smith', isActive: true },
      { id: '3', email: 'bob.johnson@example.com', firstName: 'Bob', lastName: 'Johnson', isActive: true },
      { id: '4', email: 'alice.williams@example.com', firstName: 'Alice', lastName: 'Williams', isActive: true }
    ];
    this.availableUsers.set(mockUsers);
  }

  private _filterUsers(value: string): User[] {
    const filterValue = value.toLowerCase();
    return this.availableUsers().filter(user =>
      !this.isUserSelected(user.id) &&
      (user.firstName.toLowerCase().includes(filterValue) ||
       user.lastName.toLowerCase().includes(filterValue) ||
       user.email.toLowerCase().includes(filterValue))
    );
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers().some(u => u.id === userId);
  }

  onUserSelected(user: User): void {
    if (!this.isUserSelected(user.id)) {
      this.selectedUsers.update(users => [...users, user]);
      this.assignForm.get('userSearch')?.setValue('');
    }
  }

  removeUser(userId: string): void {
    this.selectedUsers.update(users => users.filter(u => u.id !== userId));
  }

  onSubmit(): void {
    if (this.selectedUsers().length === 0 || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const assignmentData: RoleAssignmentRequest = {
      roleId: this.role.id,
      userIds: this.selectedUsers().map(u => u.id),
      action: 'assign'
    };

    this.roleService.manageRoleAssignment(assignmentData).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => {
        console.error('Error assigning role:', error);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
