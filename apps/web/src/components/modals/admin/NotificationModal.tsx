import React, { useState } from 'react';
import { Button } from '@must-iq-web/components/ui';
import { IconChevronDown } from '@must-iq-web/components/ui/MustIcons';
import { NotificationModalContent } from '@must-iq/shared-types';

interface NotificationModalProps {
  notification: NotificationModalContent | null;
  onClose: () => void;
}

export function NotificationModal({ notification, onClose }: NotificationModalProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!notification) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-in 0.2s ease' }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: `1px solid ${notification.type === 'success' ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 20, width: 440, padding: 32, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>{notification.type === 'success' ? '✨' : '⚠️'}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, fontFamily: '"DM Serif Display", serif' }}>{notification.title}</h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>{notification.message}</p>

        {notification.details && (
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {showTechnical ? <IconChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <IconChevronDown size={12} />}
                {showTechnical ? 'Hide technical details' : 'View technical details'}
              </div>
            </button>
            {showTechnical && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', maxHeight: 150, overflowY: 'auto', wordBreak: 'break-all' }}>
                {notification.details}
              </div>
            )}
          </div>
        )}

        <Button variant="primary" style={{ width: '100%', padding: '12px 0' }} onClick={onClose}>Got it, thanks!</Button>
      </div>
    </div>
  );
}
