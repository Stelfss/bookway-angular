import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../supabase';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const client = (supabaseService as any).client || (supabaseService as any).supabaseClient || supabaseService;
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};