import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map } from 'rxjs/operators';

export const publicGuard: CanActivateFn = () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  return supabaseService.currentUser.pipe(
    map(user => {
      if (user) {
        router.navigate(['/home']);
        return false;
      } else {
        return true;
      }
    })
  );
};
