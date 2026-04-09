import React from 'react';

export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return (
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                    <tr>
                        {headers.map(h => (
                            <th key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, j) => (
                        <tr key={j} style={{ borderBottom: j < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            {row.map((cell, k) => (
                                <td key={k} style={{ padding: '11px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
