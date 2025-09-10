import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

export interface ErrorDetails {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userAgent?: string;
  url?: string;
  userId?: string;
  stackTrace?: string;
}

export interface ErrorHandlingOptions {
  showToUser?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
  redirectTo?: string;
  customMessage?: string;
  duration?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  private errorLog: ErrorDetails[] = [];
  private readonly MAX_LOG_SIZE = 100;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  /**
   * Handle errors with comprehensive logging and user feedback
   */
  handleError(
    error: any,
    context: string = 'Unknown',
    options: ErrorHandlingOptions = {}
  ): void {
    const defaultOptions: ErrorHandlingOptions = {
      showToUser: true,
      logToConsole: true,
      logToServer: false,
      duration: 5000
    };

    const config = { ...defaultOptions, ...options };

    const errorDetails = this.createErrorDetails(error, context);
    this.addToErrorLog(errorDetails);

    // Console logging
    if (config.logToConsole) {
      this.logToConsole(errorDetails, context);
    }

    // User notification
    if (config.showToUser) {
      this.showUserNotification(errorDetails, config);
    }

    // Server logging (if implemented)
    if (config.logToServer) {
      this.logToServer(errorDetails);
    }

    // Navigation
    if (config.redirectTo) {
      setTimeout(() => {
        this.router.navigate([config.redirectTo]);
      }, 1000);
    }
  }

  /**
   * Handle form validation errors
   */
  handleFormError(formErrors: any, context: string = 'Form Validation'): void {
    const errorMessages = this.extractFormErrorMessages(formErrors);

    this.handleError(
      { message: errorMessages.join(', '), formErrors },
      context,
      {
        showToUser: true,
        customMessage: 'Please fix the form errors and try again.',
        duration: 4000
      }
    );
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: any, context: string = 'Network Request'): void {
    let userMessage = 'Network error occurred. Please check your connection.';

    if (error.status === 0) {
      userMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.status >= 500) {
      userMessage = 'Server error occurred. Please try again later.';
    } else if (error.status === 404) {
      userMessage = 'Requested resource not found.';
    } else if (error.status === 403) {
      userMessage = 'Access denied. You may need to log in again.';
    }

    this.handleError(error, context, {
      customMessage: userMessage,
      severity: 'medium'
    });
  }

  /**
   * Handle file upload errors
   */
  handleFileError(error: any, fileName?: string): void {
    let message = 'File upload failed.';

    if (fileName) {
      message = `Failed to upload file: ${fileName}`;
    }

    if (error.message?.includes('size')) {
      message += ' File size too large.';
    } else if (error.message?.includes('type')) {
      message += ' File type not supported.';
    }

    this.handleError(error, 'File Upload', {
      customMessage: message,
      duration: 4000
    });
  }

  /**
   * Get recent error logs for debugging
   */
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; bySeverity: Record<string, number>; recent: number } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recent = this.errorLog.filter(error => error.timestamp > oneHourAgo).length;

    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errorLog.length,
      bySeverity,
      recent
    };
  }

  private createErrorDetails(error: any, context: string): ErrorDetails {
    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN_ERROR';
    let severity: ErrorDetails['severity'] = 'medium';

    if (error instanceof Error) {
      message = error.message;
      code = error.name;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
      code = error.code || error.status?.toString();
    }

    // Determine severity
    if (error?.status >= 500 || error?.name === 'ChunkLoadError') {
      severity = 'high';
    } else if (error?.status >= 400 || error?.name === 'ValidationError') {
      severity = 'medium';
    } else if (error?.status < 400) {
      severity = 'low';
    }

    return {
      message,
      code,
      severity,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: error?.stack || new Error().stack
    };
  }

  private addToErrorLog(errorDetails: ErrorDetails): void {
    this.errorLog.unshift(errorDetails);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  private logToConsole(errorDetails: ErrorDetails, context: string): void {
    const logMethod = this.getConsoleMethod(errorDetails.severity);

    console.group(`🚨 Error in ${context}`);
    console[logMethod]('Message:', errorDetails.message);
    console.log('Severity:', errorDetails.severity);
    console.log('Code:', errorDetails.code);
    console.log('Timestamp:', errorDetails.timestamp.toISOString());
    console.log('URL:', errorDetails.url);

    if (errorDetails.stackTrace) {
      console.log('Stack Trace:', errorDetails.stackTrace);
    }

    console.groupEnd();
  }

  private getConsoleMethod(severity: ErrorDetails['severity']): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low': return 'log';
      case 'medium': return 'warn';
      case 'high':
      case 'critical': return 'error';
      default: return 'warn';
    }
  }

  private showUserNotification(errorDetails: ErrorDetails, config: ErrorHandlingOptions): void {
    const message = config.customMessage || this.getUserFriendlyMessage(errorDetails);
    const panelClass = this.getSnackBarClass(errorDetails.severity);

    this.snackBar.open(message, 'Close', {
      duration: config.duration,
      panelClass: [panelClass],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private getUserFriendlyMessage(errorDetails: ErrorDetails): string {
    // Map technical errors to user-friendly messages
    const messageMap: Record<string, string> = {
      'ChunkLoadError': 'Application update detected. Please refresh the page.',
      'NetworkError': 'Connection problem. Please check your internet connection.',
      'ValidationError': 'Please check your input and try again.',
      'TimeoutError': 'Request timed out. Please try again.',
      'PermissionError': 'You don\'t have permission to perform this action.',
    };

    return messageMap[errorDetails.code || ''] ||
           `Something went wrong: ${errorDetails.message}`;
  }

  private getSnackBarClass(severity: ErrorDetails['severity']): string {
    switch (severity) {
      case 'low': return 'info-snackbar';
      case 'medium': return 'warning-snackbar';
      case 'high':
      case 'critical': return 'error-snackbar';
      default: return 'warning-snackbar';
    }
  }

  private extractFormErrorMessages(formErrors: any): string[] {
    const messages: string[] = [];

    if (typeof formErrors === 'object') {
      Object.keys(formErrors).forEach(key => {
        const error = formErrors[key];
        if (error?.message) {
          messages.push(error.message);
        } else if (typeof error === 'string') {
          messages.push(error);
        } else {
          messages.push(`${key}: Invalid value`);
        }
      });
    }

    return messages.length > 0 ? messages : ['Form validation failed'];
  }

  private async logToServer(errorDetails: ErrorDetails): Promise<void> {
    try {
      // Implement server-side error logging
      // await this.http.post('/api/errors', errorDetails).toPromise();
      console.log('Error logged to server:', errorDetails);
    } catch (serverError) {
      console.error('Failed to log error to server:', serverError);
    }
  }
}
