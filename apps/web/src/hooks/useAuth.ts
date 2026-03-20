'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { AuthUser } from '@must-iq-web/types/auth.types';

/**
 * useAuth — call at the top of any page that requires authentication.
 * Redirects to /login if the user is not authenticated.
 * Pass `adminOnly: true` for admin-only pages.
 */
export function useAuth(options?: { adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (options?.adminOnly) {
      const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER';
      if (!isAuthorized) {
        router.replace('/chat');
      }
    }
  }, [isAuthenticated, user, options?.adminOnly]);

  return { user, isAuthenticated };
}
