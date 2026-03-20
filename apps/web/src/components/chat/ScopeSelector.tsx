'use client';
import { useState } from 'react';
import { useChatStore } from '@must-iq-web/store/chat.store';
import { IconLock, IconCheck, IconChevronLeft, IconChevronRight, IconSlack, IconGitHub, IconAudit } from '@must-iq-web/components/ui/MustIcons';

const WORKSPACE_ICONS: Record<string, any> = {
  jira: <IconAudit size={10} />,
  github: <IconGitHub size={10} />,
  slack: <IconSlack size={10} />,
};

export function ScopeSelector() {
  const { selectedTeams, availableTeams, toggleTeam } = useChatStore();
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(availableTeams.length / pageSize);
  const paginatedTeams = availableTeams.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      {/* Label */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-px w-3.5" style={{ background: 'var(--border-2)' }} />
          <span className="text-[9.5px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Search Scope
          </span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="p-0.5 hover:text-primary disabled:opacity-30 flex items-center justify-center bg-transparent border-0 cursor-pointer"
            ><IconChevronLeft size={10} /></button>
            <span className="text-[9px] font-mono">{page}/{totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="p-0.5 hover:text-primary disabled:opacity-30 flex items-center justify-center bg-transparent border-0 cursor-pointer"
            ><IconChevronRight size={10} /></button>
          </div>
        )}
      </div>

      {/* General — always on (only on page 1) */}
      {page === 1 && (
        <div
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md mb-1 cursor-default"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
            style={{ border: '1.5px solid var(--primary)', background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary)' }}
          >
            <IconLock size={10} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>General</div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>Global knowledge base</div>
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--primary)' }}>always</span>
        </div>
      )}

      {/* Team scopes */}
      {paginatedTeams.map((team) => {
        const isActive = selectedTeams.includes(team.id);

        return (
          <div key={team.id} className="mb-1">
            <div
              onClick={() => toggleTeam(team.id)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
              style={{ background: isActive ? 'rgba(255,255,255,0.03)' : undefined }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Checkbox */}
              <div
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px] transition-all"
                style={{
                  border: `1.5px solid ${isActive ? team.color : 'var(--border-2)'}`,
                  background: isActive ? `${team.color}22` : 'transparent',
                  color: team.color,
                }}
              >
                {isActive && <IconCheck size={10} />}
              </div>

              {/* Name + details */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[12.5px] truncate"
                  style={{ color: isActive ? 'var(--ink)' : 'var(--muted)', fontWeight: isActive ? 500 : 400 }}
                >
                  {team.name}
                </div>
              </div>
            </div>

            {/* Sub-workspace chips — shown when team is active */}
            {isActive && team.workspaces.length > 0 && (
              <div className="flex flex-wrap gap-1 px-7 pb-1">
                {team.workspaces.map((ws) => (
                  <span
                    key={ws.id}
                    className="text-[9.5px] px-2 py-0.5 rounded-full font-mono truncate max-w-full"
                    style={{
                      background: `${team.color}15`,
                      border: `1px solid ${team.color}35`,
                      color: team.color,
                    }}
                  >
                    {WORKSPACE_ICONS[ws.type] || <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />} {ws.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
