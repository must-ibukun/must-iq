import React, { useState } from 'react';
import { Button } from '@must-iq-web/components/ui';
import { IconX } from '@must-iq-web/components/ui/MustIcons';
import { inviteUser } from '@must-iq-web/lib/api/admin/users';

interface Team {
  id: string;
  name: string;
}

interface InviteUserModalProps {
  teams: Team[];
  onClose: () => void;
  showToast: (msg: string) => void;
  onSuccess: () => void;
}

export function InviteUserModal({ teams, onClose, showToast, onSuccess }: InviteUserModalProps) {
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  async function handleInviteUser() {
    if (!inviteEmail) return showToast('Email is required');
    setIsInviting(true);
    try {
      await inviteUser({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole as any,
        teamIds: inviteTeamIds
      });
      showToast('✓ Invitation sent');
      onSuccess();
      onClose();
    } catch (e) {
      showToast('× Invitation failed');
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 480, maxWidth: '95vw', padding: 28, boxShadow: '0 40px 80px rgba(0,0,0,0.5)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Invite New User</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Add a team member to the platform</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 28 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Name</label>
            <input
              placeholder="Adeshina Ajewole"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Email Address</label>
            <input
              type="email"
              placeholder="adeshina@must.company"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none' }}
            >
              {['EMPLOYEE', 'MANAGER', 'VIEWER', 'ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Assign to Team(s)</label>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 10, padding: 12, maxHeight: 150, overflowY: 'auto' }}>
              {teams.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>No teams created yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {teams.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: inviteTeamIds.includes(t.id) ? 'rgba(var(--primary-rgb),0.06)' : 'transparent', borderRadius: 8, cursor: 'pointer', border: inviteTeamIds.includes(t.id) ? '1px solid var(--primary-20)' : '1px solid transparent', transition: 'all 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={inviteTeamIds.includes(t.id)}
                        onChange={() => setInviteTeamIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--ink)' }}>{t.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              {inviteTeamIds.length === 0 ? 'User will have General Access only' : `${inviteTeamIds.length} teams selected`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={isInviting} onClick={handleInviteUser}>
            {isInviting ? 'Sending...' : 'Send Invite →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
