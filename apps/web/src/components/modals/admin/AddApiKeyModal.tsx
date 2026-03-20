import React, { useState } from 'react';
import { Button } from '@must-iq-web/components/ui';
import { IconX } from '@must-iq-web/components/ui/MustIcons';
import { AI_PROVIDERS } from '@must-iq-web/lib/constants/admin.constants';

interface AddApiKeyModalProps {
  initialProvider?: string;
  onClose: () => void;
  onSave: (provider: string, label: string, model: string, key: string) => void;
  isSaving: boolean;
  showToast: (msg: string) => void;
}

export function AddApiKeyModal({ initialProvider = 'anthropic', onClose, onSave, isSaving, showToast }: AddApiKeyModalProps) {
  const [newKeyProvider, setNewKeyProvider] = useState(initialProvider);
  const [newKeyLabel, setNewKeyLabel] = useState('My Key');
  const [newKeyModel, setNewKeyModel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const handleSave = () => {
    if (!newKeyValue) return showToast('Please enter an API Key');
    onSave(newKeyProvider, newKeyLabel, newKeyModel, newKeyValue);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 14, width: 480, maxWidth: '95vw', padding: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.5)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Add API Key</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Provider</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {AI_PROVIDERS.map(p => (
              <div key={p.id} onClick={() => setNewKeyProvider(p.id)} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: `1.5px solid ${newKeyProvider === p.id ? 'var(--primary)' : 'var(--border)'}`, background: newKeyProvider === p.id ? 'rgba(var(--primary-rgb),0.1)' : 'var(--surface)', color: newKeyProvider === p.id ? 'var(--primary)' : 'var(--ink)' }}>
                {p.shortName || p.name}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Label</label>
            <input placeholder="Production Key" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Specific Model ID (Optional)</label>
            <input placeholder="e.g. gpt-4-turbo-2024-04-09" title="Force this key to use a specific model version" value={newKeyModel} onChange={e => setNewKeyModel(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>API Key</label>
          <input type="password" placeholder={`Enter your ${newKeyProvider} key...`} value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={isSaving} onClick={handleSave}>{isSaving ? 'Saving...' : 'Save securely'}</Button>
        </div>
      </div>
    </div>
  );
}
