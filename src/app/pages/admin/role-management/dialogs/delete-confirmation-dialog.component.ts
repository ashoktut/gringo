import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DeleteConfirmationData {
  title: string;
  message: string;
  itemName: string;
  warningMessage?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="warning-icon">warning</mat-icon>
      {{ data.title }}
    </h2>

    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>

      <div class="item-highlight">
        <strong>{{ data.itemName }}</strong>
      </div>

      @if (data.warningMessage) {
        <div class="warning-box">
          <mat-icon>info</mat-icon>
          <span>{{ data.warningMessage }}</span>
        </div>
      }

      <p class="confirmation-text">
        This action cannot be undone. Are you sure you want to continue?
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ data.cancelButtonText || 'Cancel' }}
      </button>
      <button mat-raised-button color="warn" (click)="onConfirm()">
        <mat-icon>delete</mat-icon>
        {{ data.confirmButtonText || 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 0.5rem; color: #d32f2f; }
    .warning-icon { color: #d32f2f; }
    .message { margin: 1rem 0; color: rgba(0, 0, 0, 0.87); }
    .item-highlight { padding: 1rem; background-color: rgba(211, 47, 47, 0.08); border-left: 4px solid #d32f2f; margin: 1rem 0; border-radius: 4px; }
    .warning-box { display: flex; align-items: flex-start; gap: 0.5rem; padding: 1rem; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin: 1rem 0; color: #856404; }
    .warning-box mat-icon { color: #ffc107; }
    .confirmation-text { margin: 1rem 0 0 0; font-weight: 500; color: rgba(0, 0, 0, 0.6); }
    mat-dialog-actions button { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class DeleteConfirmationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DeleteConfirmationDialogComponent>);
  readonly data: DeleteConfirmationData = inject(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
