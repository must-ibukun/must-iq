'use client';

export default function NotFound() {
    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen p-8 text-center"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
        >
            <svg
                width="160"
                height="160"
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mb-8"
                style={{ opacity: 0.85 }}
            >
                <circle cx="80" cy="80" r="72" stroke="var(--primary)" strokeWidth="1" strokeDasharray="6 4" opacity="0.3" />
                <circle cx="80" cy="80" r="54" fill="var(--card)" stroke="var(--border-2)" strokeWidth="1.5" />
                <circle cx="72" cy="72" r="24" stroke="var(--primary)" strokeWidth="3" fill="none" />
                <line x1="90" y1="90" x2="106" y2="106" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
                <text x="72" y="79" fontSize="22" fontWeight="700" fill="var(--primary)" textAnchor="middle" fontFamily="monospace">?</text>
                <circle cx="30" cy="50" r="2.5" fill="var(--primary)" opacity="0.4" />
                <circle cx="130" cy="110" r="2" fill="var(--purple)" opacity="0.4" />
                <circle cx="120" cy="40" r="3" fill="var(--primary)" opacity="0.25" />
                <circle cx="40" cy="120" r="2" fill="var(--green)" opacity="0.35" />
            </svg>

            <h1
                className="text-6xl font-bold mb-3"
                style={{ fontFamily: '"DM Serif Display",Georgia,serif', color: 'var(--ink)' }}
            >
                404
            </h1>
            <p className="text-lg mb-2" style={{ color: 'var(--ink-muted)', fontFamily: 'Geist,system-ui,sans-serif' }}>
                Page not found
            </p>
            <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--ink-muted)', opacity: 0.6 }}>
                We couldn't find what you were looking for. It may have been moved or deleted.
            </p>
            <a
                href="/"
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                    background: 'var(--primary)',
                    color: 'var(--bg)',
                    fontFamily: 'Geist,system-ui,sans-serif',
                    textDecoration: 'none',
                }}
            >
                ← Back to Home
            </a>
        </div>
    );
}
