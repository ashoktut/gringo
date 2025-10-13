import { Injectable, signal } from '@angular/core';

/**
 * Service for managing global loading state
 * Used by loading interceptor and can be used manually by components
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly _isLoading = signal(false);
  private requestCount = 0;

  /**
   * Public readonly signal for loading state
   */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Show loading indicator
   */
  show(): void {
    this.requestCount++;
    if (this.requestCount > 0) {
      this._isLoading.set(true);
    }
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this._isLoading.set(false);
    }
  }

  /**
   * Force hide loading indicator (resets request count)
   */
  forceHide(): void {
    this.requestCount = 0;
    this._isLoading.set(false);
  }

  /**
   * Check if currently loading
   */
  getLoadingState(): boolean {
    return this._isLoading();
  }
}
