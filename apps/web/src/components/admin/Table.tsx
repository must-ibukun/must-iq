import React from 'react';

export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr>
                    {headers.map(h => (
                        <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        {row.map((cell, j) => (
                            <td key={j} style={{ padding: '11px 14px', fontSize: 12.5 }}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
