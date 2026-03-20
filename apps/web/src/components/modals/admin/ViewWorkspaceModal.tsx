import { Button } from '@must-iq-web/components/ui';
import { IconX } from '@must-iq-web/components/ui/MustIcons';

export interface ViewWorkspaceModalProps {
  viewWs: any;
  onClose: () => void;
  onEditClick: () => void;
}

export function ViewWorkspaceModal({ viewWs, onClose, onEditClick }: ViewWorkspaceModalProps) {
  if (!viewWs) return null;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'monospace' }}>{viewWs.identifier || viewWs.id}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Integration Source · {viewWs.type}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {[
            { label: 'ID', value: viewWs.id },
            { label: 'Type', value: viewWs.type },
            ...(viewWs.type === 'SLACK' ? [{ label: 'Slack Channel', value: viewWs.identifier || '—' }] : []),
            ...(viewWs.type === 'GITHUB' ? [{ label: 'GitHub Repo', value: viewWs.identifier || '—' }] : []),
            ...(viewWs.type === 'JIRA' ? [{ label: 'Jira Project', value: viewWs.identifier || '—' }] : []),
            { label: 'Chunks Indexed', value: (viewWs.chunkCount ?? 0).toLocaleString() },
            { label: 'Token Budget / day', value: viewWs.tokenBudget ? `${viewWs.tokenBudget.toLocaleString()} tokens` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace', textAlign: 'right' }}>{String(value)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={onEditClick}>Edit Budget</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
