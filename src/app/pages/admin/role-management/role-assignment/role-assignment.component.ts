import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Role, Company } from '../../../../models/auth.models';

interface DialogData {
  role: Role;
  company: Company | null;
}

@Component({
  selector: 'app-role-assignment',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="role-assignment-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>person_add</mat-icon>
          Assign Role: {{ data.role.name }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <div class="coming-soon">
          <mat-icon class="coming-soon-icon">construction</mat-icon>
          <h3>Role Assignment</h3>
          <p>This feature is coming soon! You'll be able to assign roles to users here.</p>
          <p>Role: {{ data.role.name }}</p>
          <p *ngIf="data.company">Company: {{ data.company.name }}</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-button mat-dialog-close>Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .role-assignment-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .coming-soon {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #666;
    }

    .coming-soon-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #ff9800;
      margin-bottom: 16px;
    }

    .coming-soon h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .coming-soon p {
      margin: 8px 0;
      color: #666;
    }

    mat-dialog-actions {
      padding: 16px 24px 24px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class RoleAssignmentComponent {
  constructor(
    private dialogRef: MatDialogRef<RoleAssignmentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}
}