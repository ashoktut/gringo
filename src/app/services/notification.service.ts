import { Injectable, signal, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { AppError, ErrorSeverity } from '../models/role.models';

export interface NotificationConfig extends MatSnackBarConfig {
  type?: 'success' | 'error' | 'warning' | 'info';
  showCloseButton?: boolean;
  autoClose?: boolean;
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly _errors = signal<AppError[]>([]);

  readonly errors = this._errors.asReadonly();

  /**
   * Show a success notification
   */
  showSuccess(message: string, config?: NotificationConfig): void {
    this.showNotification(message, {
      ...config,
      type: 'success',
      duration: config?.duration ?? 4000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show an error notification
   */
  showError(message: string, config?: NotificationConfig): void {
    this.showNotification(message, {
      ...config,
      type: 'error',
      duration: config?.duration ?? 6000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(message: string, config?: NotificationConfig): void {
    this.showNotification(message, {
      ...config,
      type: 'warning',
      duration: config?.duration ?? 5000,
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Show an info notification
   */
  showInfo(message: string, config?: NotificationConfig): void {
    this.showNotification(message, {
      ...config,
      type: 'info',
      duration: config?.duration ?? 4000,
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Handle and display application errors
   */
  handleError(error: AppError): void {
    this._errors.update(errors => [...errors, error]);

    let message = error.message;
    if (error.details?.validationErrors) {
      message += ': ' + Object.values(error.details.validationErrors).join(', ');
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.showError(`Critical Error: ${message}`, { duration: 0 });
        break;
      case ErrorSeverity.ERROR:
        this.showError(message);
        break;
      case ErrorSeverity.WARNING:
        this.showWarning(message);
        break;
      case ErrorSeverity.INFO:
        this.showInfo(message);
        break;
    }
  }

  /**
   * Show confirmation dialog
   */
  showConfirmDialog(data: ConfirmDialogData): Observable<boolean> {
    // For now, return a simple confirm dialog
    // In a full implementation, you'd create a custom dialog component
    const result = confirm(`${data.title}\n\n${data.message}`);
    return of(result);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this._errors.set([]);
  }

  /**
   * Clear specific error by index
   */
  clearError(index: number): void {
    this._errors.update(errors => errors.filter((_, i) => i !== index));
  }

  private showNotification(message: string, config: NotificationConfig): void {
    const defaultConfig: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      ...config
    };

    let action = undefined;
    if (config.showCloseButton !== false) {
      action = 'Close';
    }

    this.snackBar.open(message, action, defaultConfig);
  }
}
