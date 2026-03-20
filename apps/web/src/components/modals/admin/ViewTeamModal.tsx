import React from 'react';
import { IconX } from '@must-iq-web/components/ui/MustIcons';

export interface ViewTeamModalProps {
  viewTeam: any;
  onClose: () => void;
  onEditClick: () => void;
}

export function ViewTeamModal({ viewTeam, onClose, onEditClick }: ViewTeamModalProps) {
  if (!viewTeam) return null;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 480, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{viewTeam.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Team · {viewTeam.status ?? 'active'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {[
            { label: 'Team ID', value: viewTeam.id },
            { label: 'Status', value: viewTeam.status ?? 'active' },
            { 
              label: 'GitHub Repos', 
              value: viewTeam.workspaces?.filter((w: any) => w.type === 'GITHUB').map((w: any) => w.identifier).join(', ') || 'N/A' 
            },
            { 
              label: 'Slack Channels', 
              value: viewTeam.workspaces?.filter((w: any) => w.type === 'SLACK').map((w: any) => w.identifier).join(', ') || 'N/A' 
            },
            { 
              label: 'Jira Projects', 
              value: viewTeam.workspaces?.filter((w: any) => w.type === 'JIRA').map((w: any) => w.identifier).join(', ') || 'N/A' 
            },
            { 
              label: 'Total Sources', 
              value: viewTeam.workspaces?.length || 0 
            },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: typeof value === 'string' && value.startsWith('c') ? 'monospace' : undefined, maxWidth: 260, textAlign: 'right' }}>{String(value)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onEditClick} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit Team</button>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
