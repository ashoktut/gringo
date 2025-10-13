import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * HTTP Interceptor for centralized error handling
 * Catches all HTTP errors and displays user-friendly messages
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Skip handling if it's an authentication error (handled by authInterceptor)
      if (error.status === 401) {
        return throwError(() => error);
      }

      // Log error for debugging
      console.error('HTTP Error:', error);

      // Extract and show user-friendly error message
      const errorMessage = extractErrorMessage(error);

      // Show notification based on error severity
      if (error.status >= 500) {
        notificationService.showError(
          errorMessage || 'A server error occurred. Please try again later.',
          { duration: 7000 }
        );
      } else if (error.status >= 400) {
        notificationService.showWarning(
          errorMessage || 'Your request could not be processed. Please check and try again.',
          { duration: 5000 }
        );
      } else if (error.status === 0) {
        // Network error
        notificationService.showError(
          'Network error. Please check your internet connection.',
          { duration: 7000 }
        );
      }

      return throwError(() => error);
    })
  );
};

/**
 * Extract user-friendly error message from HTTP error response
 */
function extractErrorMessage(error: HttpErrorResponse): string {
  // Check for error message in response body
  if (error.error) {
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error.message) {
      return error.error.message;
    }

    if (error.error.error) {
      return error.error.error;
    }

    if (error.error.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }
  }

  // Check for error message in response
  if (error.message) {
    return error.message;
  }

  // Fallback to status-based messages
  switch (error.status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. The resource may already exist.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'An internal server error occurred.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The request took too long to process.';
    default:
      return 'An unexpected error occurred.';
  }
}
