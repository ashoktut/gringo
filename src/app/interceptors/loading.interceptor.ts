import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/**
 * HTTP Interceptor for managing global loading state
 * Shows/hides loading indicator for HTTP requests
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip loading indicator for certain requests (e.g., polling, background requests)
  const skipLoading = req.headers.has('X-Skip-Loading') || req.params.has('skipLoading');

  if (!skipLoading) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loadingService.hide();
      }
    })
  );
};
