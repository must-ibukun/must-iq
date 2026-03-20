'use client';
import { useEffect, useRef, useState } from 'react';
import { TERMINAL_LINES } from '@must-iq-web/lib/constants/landing.constant';

export function Terminal() {
    const [shown, setShown] = useState(0);
    const [started, setStarted] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting && !started) setStarted(true); },
            { threshold: 0.3 }
        );
        if (sectionRef.current) obs.observe(sectionRef.current);
        return () => obs.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        TERMINAL_LINES.forEach((_, i) => {
            setTimeout(() => {
                setShown(i + 1);
                if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
            }, TERMINAL_LINES[i].delay);
        });
    }, [started]);

    return (
        <div ref={sectionRef} style={{ background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid #1d2b42', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ height: 38, background: '#0d1117', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 7, borderBottom: '1px solid #1a1a2e' }}>
                {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
                <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555', fontFamily: '"DM Mono",monospace' }}>must-iq — ingestion pipeline</span>
            </div>
            <div ref={bodyRef} style={{ padding: 20, fontFamily: '"DM Mono","Fira Code",monospace', fontSize: 12.5, lineHeight: 1.9, minHeight: 340, maxHeight: 380, overflowY: 'auto' }}>
                {TERMINAL_LINES.slice(0, shown).map((line, i) => (
                    <div key={i} style={{ color: line.color || 'transparent', minHeight: '1.9em' }}>
                        {line.text || '\u00a0'}
                        {i === shown - 1 && line.text === '$ _' && (
                            <span style={{ display: 'inline-block', width: 8, height: 14, background: '#00d4ff', verticalAlign: 'middle', marginLeft: 2, animation: 'blink 1s step-end infinite' }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
