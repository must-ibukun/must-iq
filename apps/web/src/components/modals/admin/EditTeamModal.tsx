import React, { useState, useEffect } from 'react';
import { Button } from '@must-iq-web/components/ui';
import { IconSearch, IconX } from '@must-iq-web/components/ui/MustIcons';
import { updateTeam } from '@must-iq-web/lib/api/admin/teams';

export interface EditTeamModalProps {
  editTeam: any;
  availableWorkspaces: any[];
  onClose: () => void;
  showToast: (msg: string) => void;
  onSuccess: (updatedTeamId: string, identifiers: string[], status: string) => void;
}

export function EditTeamModal({ editTeam, availableWorkspaces, onClose, showToast, onSuccess }: EditTeamModalProps) {
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamStatus, setEditTeamStatus] = useState<'active' | 'inactive'>('active');
  const [editTeamSlackIds, setEditTeamSlackIds] = useState<string[]>([]);
  const [editTeamGithubIds, setEditTeamGithubIds] = useState<string[]>([]);
  const [editTeamJiraIds, setEditTeamJiraIds] = useState<string[]>([]);
  const [editTeamSlackSearch, setEditTeamSlackSearch] = useState('');
  const [editTeamGithubSearch, setEditTeamGithubSearch] = useState('');
  const [editTeamJiraSearch, setEditTeamJiraSearch] = useState('');
  const [editTeamSaving, setEditTeamSaving] = useState(false);

  // Initialize state based on the team being edited
  useEffect(() => {
    if (editTeam) {
      setEditTeamName(editTeam.name || '');
      setEditTeamStatus(editTeam.status === 'inactive' ? 'inactive' : 'active');
      
      const slackWorkspaceIds = editTeam.workspaces?.filter((w: any) => w.type === 'SLACK').map((w: any) => w.id) || [];
      const githubWorkspaceIds = editTeam.workspaces?.filter((w: any) => w.type === 'GITHUB').map((w: any) => w.id) || [];
      const jiraWorkspaceIds = editTeam.workspaces?.filter((w: any) => w.type === 'JIRA').map((w: any) => w.id) || [];
      
      setEditTeamSlackIds(slackWorkspaceIds);
      setEditTeamGithubIds(githubWorkspaceIds);
      setEditTeamJiraIds(jiraWorkspaceIds);
    }
  }, [editTeam]);

  const handleSave = async () => {
    setEditTeamSaving(true);
    try {
      const workspaceIds = [...editTeamSlackIds, ...editTeamGithubIds, ...editTeamJiraIds];
      const allPossible = [...(editTeam.workspaces || []), ...availableWorkspaces];
      const selectedWs = allPossible.filter(w => workspaceIds.includes(w.id));
      const identifiers = [...new Set(selectedWs.map(w => w.identifier).filter(Boolean))];
      await updateTeam(editTeam.id, { identifiers, status: editTeamStatus, workspaceIds });
      
      showToast(`Team ${editTeamStatus === 'active' ? 'activated' : 'disabled'} and integrations updated`);
      onSuccess(editTeam.id, identifiers, editTeamStatus);
      onClose();
    } catch {
      showToast('Save failed');
    } finally {
      setEditTeamSaving(false);
    }
  };

  if (!editTeam) return null;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 480, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Edit Team</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Update team integrations</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Team Name</label>
            <div style={{ width: '100%', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink-muted)', fontSize: 14, boxSizing: 'border-box' }}>
              {editTeamName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Team name cannot be changed after creation.</div>
          </div>

          <hr style={{ border: '0 none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: editTeamStatus === 'active' ? 'rgba(22,163,74,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${editTeamStatus === 'active' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setEditTeamStatus(s => s === 'active' ? 'inactive' : 'active')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Team Status</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{editTeamStatus === 'active' ? 'Team is active and accessible to members.' : 'Team is disabled — members cannot access it.'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: editTeamStatus === 'active' ? 'var(--green, #16a34a)' : 'var(--red, #ef4444)' }}>
                {editTeamStatus === 'active' ? 'ACTIVE' : 'DISABLED'}
              </span>
              <div style={{ width: 38, height: 22, borderRadius: 11, background: editTeamStatus === 'active' ? 'var(--primary)' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: editTeamStatus === 'active' ? 18 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          </div>

          <hr style={{ border: '0 none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />

          {(() => {
            const wsType = 'SLACK';
            const teamWs = editTeam.workspaces?.filter((w: any) => w.type === wsType) || [];
            const avail = availableWorkspaces.filter(w => w.type === wsType);
            const all = Array.from(new Map([...teamWs, ...avail].map(w => [w.id, w])).values());
            const filtered = all.filter(w => w.identifier?.toLowerCase().includes(editTeamSlackSearch.toLowerCase()));
            return (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Slack Channels</label>
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex' }}><IconSearch size={13} color="var(--ink)" /></span>
                  <input value={editTeamSlackSearch} onChange={e => setEditTeamSlackSearch(e.target.value)} placeholder="Search channels..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 150, overflowY: 'auto', padding: 4 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{editTeamSlackSearch ? 'No matches' : 'No Slack channels available'}</div>
                    : filtered.map((w: any) => { const on = editTeamSlackIds.includes(w.id); return (
                      <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: on ? 'rgba(var(--primary-rgb),0.06)' : 'transparent' }}>
                        <input type="checkbox" checked={on} onChange={() => setEditTeamSlackIds(p => on ? p.filter(id => id !== w.id) : [...p, w.id])} style={{ accentColor: 'var(--primary)', width: 14, height: 14, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace', flex: 1 }}>{w.identifier}</span>
                      </label>
                    ); })
                  }
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{editTeamSlackIds.length === 0 ? 'None selected' : `${editTeamSlackIds.length} selected`}</div>
              </div>
            );
          })()}

          {(() => {
            const wsType = 'GITHUB';
            const teamWs = editTeam.workspaces?.filter((w: any) => w.type === wsType) || [];
            const avail = availableWorkspaces.filter(w => w.type === wsType);
            const all = Array.from(new Map([...teamWs, ...avail].map(w => [w.id, w])).values());
            const filtered = all.filter(w => w.identifier?.toLowerCase().includes(editTeamGithubSearch.toLowerCase()));
            return (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>GitHub Repos</label>
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex' }}><IconSearch size={13} color="var(--ink)" /></span>
                  <input value={editTeamGithubSearch} onChange={e => setEditTeamGithubSearch(e.target.value)} placeholder="Search repos..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 150, overflowY: 'auto', padding: 4 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{editTeamGithubSearch ? 'No matches' : 'No GitHub repos available'}</div>
                    : filtered.map((w: any) => { const on = editTeamGithubIds.includes(w.id); return (
                      <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: on ? 'rgba(var(--primary-rgb),0.06)' : 'transparent' }}>
                        <input type="checkbox" checked={on} onChange={() => setEditTeamGithubIds(p => on ? p.filter(id => id !== w.id) : [...p, w.id])} style={{ accentColor: 'var(--primary)', width: 14, height: 14, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace', flex: 1 }}>{w.identifier}</span>
                      </label>
                    ); })
                  }
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{editTeamGithubIds.length === 0 ? 'None selected' : `${editTeamGithubIds.length} selected`}</div>
              </div>
            );
          })()}

          {(() => {
            const wsType = 'JIRA';
            const teamWs = editTeam.workspaces?.filter((w: any) => w.type === wsType) || [];
            const avail = availableWorkspaces.filter(w => w.type === wsType);
            const all = Array.from(new Map([...teamWs, ...avail].map(w => [w.id, w])).values());
            const filtered = all.filter(w => w.identifier?.toLowerCase().includes(editTeamJiraSearch.toLowerCase()));
            return (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Jira Projects</label>
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex' }}><IconSearch size={13} color="var(--ink)" /></span>
                  <input value={editTeamJiraSearch} onChange={e => setEditTeamJiraSearch(e.target.value)} placeholder="Search projects..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 150, overflowY: 'auto', padding: 4 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{editTeamJiraSearch ? 'No matches' : 'No Jira projects available'}</div>
                    : filtered.map((w: any) => { const on = editTeamJiraIds.includes(w.id); return (
                      <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: on ? 'rgba(var(--primary-rgb),0.06)' : 'transparent' }}>
                        <input type="checkbox" checked={on} onChange={() => setEditTeamJiraIds(p => on ? p.filter(id => id !== w.id) : [...p, w.id])} style={{ accentColor: 'var(--primary)', width: 14, height: 14, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'monospace', flex: 1 }}>{w.identifier}</span>
                      </label>
                    ); })
                  }
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{editTeamJiraIds.length === 0 ? 'None selected' : `${editTeamJiraIds.length} selected`}</div>
              </div>
            );
          })()}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            isLoading={editTeamSaving}
            onClick={handleSave}
          >
            {editTeamSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
