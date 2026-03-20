import React, { ReactNode } from 'react';

export function StatCard({ label, value, delta, accent, icon }: { label: string; value: React.ReactNode; delta: string; accent: string; icon: React.ReactNode }) {
    return (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},transparent)` }} />
            <div style={{ position: 'absolute', right: 16, top: 16, fontSize: 22, opacity: 0.15 }}>{icon}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>{label}</div>
            <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 26, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--green)' }}>↑ {delta}</div>
        </div>
    );
}
