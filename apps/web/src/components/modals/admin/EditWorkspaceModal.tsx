import React, { useState, useEffect } from 'react';
import { Button } from '@must-iq-web/components/ui';
import { IconX } from '@must-iq-web/components/ui/MustIcons';
import { updateWorkspace } from '@must-iq-web/lib/api/admin/workspaces';
import { TechStackPicker, TechStackDropdown } from '@must-iq-web/components/admin/TechStackPicker';

export interface EditWorkspaceModalProps {
  editWs: any;
  onClose: () => void;
  showToast: (msg: string) => void;
  onSuccess: (updatedWsId: string, tokenBudget: number, layer: string, techStack: string | null) => void;
}

export function EditWorkspaceModal({ editWs, onClose, showToast, onSuccess }: EditWorkspaceModalProps) {
  const [editWsBudget, setEditWsBudget] = useState('');
  const [editWsLayer, setEditWsLayer] = useState('docs');
  const [editWsTechStack, setEditWsTechStack] = useState('');
  const [editWsSaving, setEditWsSaving] = useState(false);

  useEffect(() => {
    if (editWs) {
      setEditWsBudget(String(editWs.tokenBudget ?? ''));
      setEditWsLayer(editWs.layer ?? 'docs');
      setEditWsTechStack(editWs.techStack ?? '');
    }
  }, [editWs]);

  const handleSave = async () => {
    setEditWsSaving(true);
    try {
      const budget = parseInt(editWsBudget);
      const stack = editWsTechStack.trim() ? editWsTechStack.trim() : null;
      await updateWorkspace(editWs.id, { tokenBudget: budget, layer: editWsLayer, techStack: stack as any });
      showToast('Workspace updated');
      onSuccess(editWs.id, budget, editWsLayer, stack);
      onClose();
    } catch {
      showToast('Save failed');
    } finally {
      setEditWsSaving(false);
    }
  };

  if (!editWs) return null;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 400, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Edit Integration</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{editWs.identifier || editWs.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
             <IconX size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Token Budget / day</label>
          <input
            type="number"
            value={editWsBudget}
            onChange={e => setEditWsBudget(e.target.value)}
            placeholder="e.g. 25000"
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Architectural Layer</label>
            <select
              value={editWsLayer}
              onChange={e => setEditWsLayer(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none' }}
            >
              <option value="docs">Docs / General</option>
              <option value="backend">Backend Logic</option>
              <option value="web">Web Frontend</option>
              <option value="mobile">Mobile App</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="ai">AI / Models</option>
              <option value="blockchain">Blockchain</option>
              <option value="lambda">Lambda Functions</option>
              <option value="crawler">Crawler Code</option>
              <option value="database">Database / Schema</option>
              <option value="qa">Quality Assurance</option>
              <option value="security">Security & Compliance</option>
              <option value="shared">Shared / Utilities</option>
            </select>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Assigned Tech Stack (Optional)</label>
            <TechStackDropdown value={editWsTechStack} onChange={setEditWsTechStack} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, justifyContent: 'flex-end', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            isLoading={editWsSaving}
            onClick={handleSave}
          >
            {editWsSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
