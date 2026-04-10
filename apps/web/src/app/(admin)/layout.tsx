'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@must-iq-web/store/auth.store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [user, isAuthenticated, router]);

  if (isAuthenticated && user?.mustChangePassword) return null;

  return <>{children}</>;
}
