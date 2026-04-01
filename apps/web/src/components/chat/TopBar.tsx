'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState, Suspense } from 'react';
import { useChatStore } from '@must-iq-web/store/chat.store';
import { TokenUsage } from '@must-iq-web/types/chat.types';
import { WORKSPACE_COLORS } from '@must-iq-web/lib/constants/admin.constants';
import { useSearchParams, useRouter } from 'next/navigation';

function TopBarContent({ title }: { title: string }) {
  const selectedTeams = useChatStore(s => s.selectedTeams);
  const availableTeams = useChatStore(s => s.availableTeams);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromAdmin = searchParams?.get('from') === 'admin';

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  
  // Map IDs to names and colors
  // Only compute and show if mounted
  const resolvedTeams = mounted ? selectedTeams.map(id => {
    if (id === 'general') return { id, name: 'General', color: 'var(--primary)' };
    const team = availableTeams.find(t => t.id === id);
    return team 
      ? { id, name: team.name, color: team.color || 'var(--primary)' } 
      : { id, name: id.length > 15 ? `${id.slice(0, 8)}...` : id, color: 'var(--primary)' };
  }) : [];

  const displayTeams = resolvedTeams.slice(0, 3);
  const remainingCount = resolvedTeams.length - 3;

  return (
    <div
      className="flex-shrink-0 h-[52px] flex items-center px-6 gap-3 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)', backdropFilter: 'blur(10px)' }}
    >
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 15, color: 'var(--ink)' }} className="truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Scope:</span>
        {displayTeams.map((team) => (
          <span
            key={team.id}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
            style={{
              border: `1px solid ${team.color}55`,
              color: team.color,
              background: `${team.color.startsWith('var') ? 'rgba(var(--primary-rgb), 0.1)' : team.color + '11'}`,
            }}
          >
            {team.name}
          </span>
        ))}
        {remainingCount > 0 && (
          <span 
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ 
              background: 'rgba(var(--primary-rgb), 0.05)', 
              color: 'var(--muted)',
              border: '1px solid var(--border-2)',
              letterSpacing: '1px'
            }}
          >
            ...
          </span>
        )}
      </div>

      {fromAdmin && (
        <button
          onClick={() => router.push('/admin')}
          className="px-3 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border-0 cursor-pointer"
          style={{
            background: 'rgba(var(--primary-rgb),0.1)',
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          ← Back
        </button>
      )}

      {mounted && (
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="px-3 h-8 rounded-lg flex items-center justify-center gap-2 transition-all flex-shrink-0 border-0 cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-2)',
            color: 'var(--muted)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      )}
    </div>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <Suspense fallback={<div className="flex-shrink-0 h-[52px] border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />}>
      <TopBarContent title={title} />
    </Suspense>
  );
}
