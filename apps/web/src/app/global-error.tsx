'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    background: '#05080f',
                    color: '#c8d4e8',
                    fontFamily: 'Geist,system-ui,sans-serif',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <div style={{ maxWidth: 400 }}>
                    <svg
                        width="160"
                        height="160"
                        viewBox="0 0 160 160"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ marginBottom: 32, opacity: 0.9 }}
                    >
                        <circle cx="80" cy="80" r="72" stroke="#ff4d6d" strokeWidth="1" strokeDasharray="6 4" opacity="0.3" />
                        <circle cx="80" cy="80" r="54" fill="#0c1220" stroke="#1d2b42" strokeWidth="1.5" />
                        <path
                            d="M80 46 L108 98 L52 98 Z"
                            stroke="#ff4d6d"
                            strokeWidth="3"
                            fill="none"
                            strokeLinejoin="round"
                        />
                        <line x1="80" y1="62" x2="80" y2="78" stroke="#ff4d6d" strokeWidth="3.5" strokeLinecap="round" />
                        <circle cx="80" cy="86" r="2.5" fill="#ff4d6d" />
                        <circle cx="30" cy="50" r="2.5" fill="#ff4d6d" opacity="0.3" />
                        <circle cx="130" cy="108" r="2" fill="#9d6fff" opacity="0.4" />
                        <circle cx="120" cy="38" r="3" fill="#ff4d6d" opacity="0.2" />
                        <circle cx="40" cy="122" r="2" fill="#00ff9d" opacity="0.3" />
                    </svg>

                    <h1
                        style={{
                            fontSize: 60,
                            fontWeight: 700,
                            marginBottom: 12,
                            fontFamily: '"DM Serif Display",Georgia,serif',
                            color: '#f0f6ff',
                            lineHeight: 1,
                        }}
                    >
                        500
                    </h1>
                    <p style={{ fontSize: 18, marginBottom: 8, color: '#c8d4e8' }}>
                        Something went wrong
                    </p>
                    <p style={{ fontSize: 13, marginBottom: 32, color: '#4a5568', lineHeight: 1.6 }}>
                        {error?.message || 'An unexpected error occurred. Our team has been notified.'}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 24px',
                            background: '#ff4d6d',
                            color: '#05080f',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Geist,system-ui,sans-serif',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
