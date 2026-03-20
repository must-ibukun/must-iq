import React from 'react';

export function Panel({ title, dot, children, action }: { title: string; dot?: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}` }} />}
                    {title}
                </div>
                {action}
            </div>
            <div style={{ padding: 18 }}>{children}</div>
        </div>
    );
}
