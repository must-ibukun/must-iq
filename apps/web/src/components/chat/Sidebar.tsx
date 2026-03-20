'use client';
import { useChatStore } from '@must-iq-web/store/chat.store';
import { IconChat, IconTrash, IconEdit, IconSearch, IconX, IconRefresh, IconChevronRight, IconZap, IconPaperclip, IconSend } from '@must-iq-web/components/ui/MustIcons';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { AuthUser } from '@must-iq-web/types/auth.types';
import { ChatSession } from '@must-iq-web/types/chat.types';
import { ScopeSelector } from '@must-iq-web/components/chat/ScopeSelector';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const { sessions, activeSessionId, tokenUsage, setActiveSession, newSession } = useChatStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromAdmin = searchParams?.get('from') === 'admin';
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);

  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === 'dark';

  const pct = Math.round((tokenUsage.used / tokenUsage.limit) * 100);

  // Paginate sessions
  const paginatedSessions = sessions.slice((sessionPage - 1) * 10, sessionPage * 10);
  const totalSessionPages = Math.ceil(sessions.length / 10);

  function handleLogout() { logout(); router.push('/login'); }

  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden"
      style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm relative"
          style={{ border: '1.5px solid var(--primary)', background: 'rgba(var(--primary-rgb),0.07)', color: 'var(--primary)', fontFamily: '"DM Serif Display",Georgia,serif' }}
        >
          <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="4" height="20" fill="var(--ink)" />
            <rect x="10" y="2" width="4" height="20" fill="var(--ink)" />
            <rect x="17" y="2" width="4" height="20" fill="var(--primary)" />
          </svg>
        </div>
        <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 18, color: 'var(--ink)' }}>
          must<span style={{ color: 'var(--primary)' }}>-iq</span>
        </div>
      </div>

      {/* New Chat */}
      <button
        onClick={newSession}
        className="mx-3.5 my-3 flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] transition-all"
        style={{ background: 'rgba(var(--primary-rgb),0.08)', border: '1px solid rgba(var(--primary-rgb),0.22)', color: 'var(--primary)' }}
      >
        <span className="text-base font-light">+</span> New conversation
      </button>

      {/* Scope Selector */}
      <ScopeSelector />

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col">
        <div className="text-[9.5px] font-bold tracking-widest uppercase px-2 py-1.5 mb-1" style={{ color: 'var(--muted)' }}>History</div>
        <div className="flex-1">
          {paginatedSessions.map((s) => (
            <SessionItem key={s.id} session={s} active={s.id === activeSessionId} onSelect={() => setActiveSession(s.id)} />
          ))}
          {sessions.length === 0 && <div className="px-2 py-4 text-[11px] text-center opacity-40">No conversations yet</div>}
        </div>

        <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-2 text-[10px] text-muted mb-1">
            <span>{sessions.length} sessions</span>
            <span>Page {sessionPage}/{Math.max(1, totalSessionPages)}</span>
          </div>
          <div className="flex gap-1">
            <button
              disabled={sessionPage === 1}
              onClick={() => setSessionPage(p => p - 1)}
              className="flex-1 py-1.5 rounded bg-black/5 dark:bg-white/5 border border-border-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 transition-colors text-[10px]"
            >Prev</button>
            <button
              disabled={sessionPage >= totalSessionPages}
              onClick={() => setSessionPage(p => p + 1)}
              className="flex-1 py-1.5 rounded bg-black/5 dark:bg-white/5 border border-border-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 transition-colors text-[10px]"
            >Next</button>
          </div>
        </div>
      </div>

      {/* Admin shortcut — visible to ADMIN and MANAGER users */}
      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <button
          onClick={() => router.push('/admin')}
          className="mx-3.5 mb-2 flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all hover:brightness-110"
          style={{
            background: 'rgba(255,183,64,0.08)',
            border: '1px solid rgba(255,183,64,0.3)',
            color: 'var(--amber)',
          }}
        >
          <span>⚙</span> Go to Admin Dashboard
        </button>
      )}

      {/* User Footer */}
      <div className="px-3.5 py-3 border-t flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
        <div
          onClick={() => {
            const dest = (pathname.startsWith('/admin') || fromAdmin) ? '/profile?from=admin' : '/profile';
            router.push(dest);
          }}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors"
        >
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg,rgba(var(--primary-rgb),0.3),rgba(157,111,255,0.3))', border: '1px solid var(--border-2)', color: 'var(--primary)' }}
          >
            {user?.initials || (user?.role === 'ADMIN' ? 'AD' : 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>{user?.name || (user?.role === 'ADMIN' ? 'Must Admin' : 'User')}</div>
            <div className="text-[10.5px] capitalize truncate" style={{ color: 'var(--muted)' }}>
              {user?.teamNames?.[0] || (user?.role === 'ADMIN' ? 'Super Admin' : 'No team assigned')}
            </div>
          </div>
        </div>
        <div
          className="text-[9.5px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ border: '1px solid rgba(var(--primary-rgb),0.25)', color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.08)' }}
        >
          {(tokenUsage.used / 1000).toFixed(1)}k / {(tokenUsage.limit / 1000).toFixed(0)}k
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="text-[13px] opacity-40 hover:opacity-80 transition-opacity bg-transparent border-0 cursor-pointer"
          style={{ color: 'var(--ink)' }}
        >⏻</button>
      </div>
    </aside>
  );
}

function SessionItem({ session, active, onSelect }: { session: any; active: boolean; onSelect: () => void }) {
  const shortId = session.id.slice(0, 4).toUpperCase();
  const timeStr = new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={onSelect}
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors mb-0.5"
      style={{ background: active ? 'rgba(var(--primary-rgb),0.07)' : undefined }}
    >
      <IconChat size={13} className="mt-0.5 opacity-60" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] truncate flex items-center justify-between gap-2" style={{ color: active ? 'var(--ink)' : 'var(--ink)' }}>
          <span className="truncate">{session.title}</span>
          <span className="text-[9px] font-mono opacity-30 text-nowrap">#{shortId}</span>
        </div>
        <div className="text-[10.5px] mt-0.5 flex items-center justify-between" style={{ color: 'var(--muted)' }}>
          <span>{session.messageCount} messages</span>
          <span className="opacity-60">{timeStr}</span>
        </div>
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />}
    </div>
  );
}
