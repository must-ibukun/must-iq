import React, { useState } from 'react';
import { IconInfo } from './MustIcons';

export function InfoTooltip({ title, desc }: { title: string; desc: string }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div style={{ cursor: 'help', color: 'var(--muted)' }}><IconInfo size={14} /></div>
      {show && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 12,
          width: 300,
          background: 'var(--card)',
          border: '1px solid var(--primary)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(var(--primary-rgb), 0.2)', background: 'rgba(var(--primary-rgb), 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <IconInfo size={14} style={{ color: 'var(--primary)' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Feature Details</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
             <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'normal', fontStyle: 'italic', textAlign: 'center' }}>{desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}
