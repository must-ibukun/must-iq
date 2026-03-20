'use client';
import { ReactNode } from 'react';
import { THEME_COLORS } from '@must-iq-web/lib/constants/landing.constant';

export function Tag({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: THEME_COLORS.primary, marginBottom: 16 }}>
            <div style={{ width: 24, height: 1, background: THEME_COLORS.primary }} />{children}
        </div>
    );
}

export function H2({ children }: { children: ReactNode }) {
    return <h2 style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 'clamp(34px,5vw,54px)', color: THEME_COLORS.text, lineHeight: 1.08, marginBottom: 16 }}>{children}</h2>;
}

export function Sub({ children }: { children: ReactNode }) {
    return <p style={{ fontSize: 16, color: THEME_COLORS.muted, maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}>{children}</p>;
}
