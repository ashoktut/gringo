import { Injectable } from '@angular/core';
import { FormSubmissionStatus } from '../models/form.models';

/**
 * UNIFIED Utility Service
 *
 * Consolidates helper methods that were duplicated across multiple components:
 * - forms-dashboard.component.ts
 * - submission-approval.component.ts
 * - form-submission.component.ts
 * - And 5+ other components
 *
 * Provides shared utility functions for:
 * - Date/time formatting
 * - Status styling
 * - File operations
 * - Text manipulation
 * - Common helpers
 *
 * @version 1.0.0
 * @author Consolidated Service
 */
@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  // ==================== Date/Time Formatting ====================

  /**
   * Format a date to a readable string (e.g., "Jan 15, 2025")
   */
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  }

  /**
   * Format a date and time to a readable string (e.g., "Jan 15, 2025, 2:30 PM")
   */
  formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  }

  /**
   * Format a date to a relative time string (e.g., "2 hours ago", "3 days ago")
   */
  formatRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return this.formatDate(dateObj);
    }
  }

  /**
   * Format a date to ISO string for form inputs (YYYY-MM-DD)
   */
  formatDateForInput(date: Date | string | null | undefined): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '';

    return dateObj.toISOString().split('T')[0];
  }

  // ==================== Status Styling ====================

  /**
   * Get color for submission status
   */
  getStatusColor(status: FormSubmissionStatus): string {
    const statusColors: Record<FormSubmissionStatus, string> = {
      [FormSubmissionStatus.DRAFT]: 'accent',
      [FormSubmissionStatus.SUBMITTED]: 'primary',
      [FormSubmissionStatus.UNDER_REVIEW]: 'primary',
      [FormSubmissionStatus.APPROVED]: 'success',
      [FormSubmissionStatus.REJECTED]: 'warn',
      [FormSubmissionStatus.COMPLETED]: 'success'
    };

    return statusColors[status] || 'primary';
  }

  /**
   * Get icon for submission status
   */
  getStatusIcon(status: FormSubmissionStatus): string {
    const statusIcons: Record<FormSubmissionStatus, string> = {
      [FormSubmissionStatus.DRAFT]: 'edit',
      [FormSubmissionStatus.SUBMITTED]: 'send',
      [FormSubmissionStatus.UNDER_REVIEW]: 'hourglass_empty',
      [FormSubmissionStatus.APPROVED]: 'check_circle',
      [FormSubmissionStatus.REJECTED]: 'cancel',
      [FormSubmissionStatus.COMPLETED]: 'done_all'
    };

    return statusIcons[status] || 'info';
  }

  /**
   * Get label for submission status
   */
  getStatusLabel(status: FormSubmissionStatus): string {
    const statusLabels: Record<FormSubmissionStatus, string> = {
      [FormSubmissionStatus.DRAFT]: 'Draft',
      [FormSubmissionStatus.SUBMITTED]: 'Submitted',
      [FormSubmissionStatus.UNDER_REVIEW]: 'Under Review',
      [FormSubmissionStatus.APPROVED]: 'Approved',
      [FormSubmissionStatus.REJECTED]: 'Rejected',
      [FormSubmissionStatus.COMPLETED]: 'Completed'
    };

    return statusLabels[status] || status;
  }

  // ==================== File Operations ====================

  /**
   * Format file size to human-readable string (e.g., "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format bytes (backward compatibility)
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Open a blob in a new browser tab
   */
  openBlobInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: URL will be revoked when the window is closed
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Check if file type is allowed
   */
  isFileTypeAllowed(filename: string, allowedTypes: string[]): boolean {
    const extension = this.getFileExtension(filename);
    return allowedTypes.includes(extension);
  }

  // ==================== Text Manipulation ====================

  /**
   * Truncate text to a maximum length with ellipsis
   */
  truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert string to title case (e.g., "hello world" -> "Hello World")
   */
  toTitleCase(str: string): string {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  /**
   * Convert camelCase or PascalCase to readable string
   */
  camelToReadable(str: string): string {
    if (!str) return '';
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Slugify a string (e.g., "Hello World!" -> "hello-world")
   */
  slugify(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // ==================== Array/Object Helpers ====================

  /**
   * Deep clone an object or array
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone((obj as any)[key]);
        }
      }
      return clonedObj;
    }

    throw new Error('Unable to clone object');
  }

  /**
   * Check if value is empty (null, undefined, empty string, empty array, empty object)
   */
  isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Remove duplicate items from an array
   */
  removeDuplicates<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Group array items by a property
   */
  groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  // ==================== Validation Helpers ====================

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (basic US format)
   */
  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Number Helpers ====================

  /**
   * Format number with commas (e.g., 1000 -> "1,000")
   */
  formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  /**
   * Format currency (e.g., 1000 -> "$1,000.00")
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Generate a random number within a range
   */
  randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ==================== ID/UUID Generation ====================

  /**
   * Generate a simple unique ID
   */
  generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a UUID v4
   */
  generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ==================== Debounce/Throttle ====================

  /**
   * Create a debounced function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: any;
    return function (this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Create a throttled function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function (this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ==================== Local Storage Helpers ====================

  /**
   * Save data to local storage with JSON serialization
   */
  saveToStorage(key: string, data: any): void {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  /**
   * Load data from local storage with JSON deserialization
   */
  loadFromStorage<T>(key: string): T | null {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) return null;
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error('Error loading from local storage:', error);
      return null;
    }
  }

  /**
   * Remove data from local storage
   */
  removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from local storage:', error);
    }
  }

  /**
   * Clear all local storage
   */
  clearStorage(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  }

  // ==================== Color Helpers ====================

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Generate a random hex color
   */
  randomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  // ==================== Async Helpers ====================

  /**
   * Sleep/delay for a specified number of milliseconds
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function a specified number of times
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await this.sleep(delay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }
}
