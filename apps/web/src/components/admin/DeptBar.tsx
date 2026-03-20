import React from 'react';
import { ProgressBar } from '@must-iq-web/components/ui';

export function DeptBar({ label, pct, count, color }: { label: string; pct: number; count: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 90, fontSize: 12, color: 'var(--ink)', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1 }}><ProgressBar value={pct} color={color} /></div>
            <div style={{ width: 55, fontFamily: '"DM Mono",monospace', fontSize: 10.5, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{count}</div>
        </div>
    );
}
