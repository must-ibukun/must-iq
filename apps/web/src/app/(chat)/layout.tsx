'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { Sidebar } from '@must-iq-web/components/chat/Sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [user, isAuthenticated, router]);

 if (isAuthenticated && user?.mustChangePassword) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <div className="bg-dots" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
