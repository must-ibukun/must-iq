import React from 'react';
import { Badge } from '@must-iq-web/components/ui';

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    icon: string | React.ReactNode;
    description: string;
  };
  isSelected: boolean;
  isSystemActive: boolean;
  keyCount: number;
  onClick: () => void;
}

export function ProviderCard({
  provider,
  isSelected,
  isSystemActive,
  keyCount,
  onClick,
}: ProviderCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(var(--primary-rgb),0.05)' : 'var(--card)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 16,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: isSelected ? '0 8px 24px -8px rgba(var(--primary-rgb),0.2)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{provider.icon}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{provider.name}</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, height: 32, lineHeight: 1.4 }}>{provider.description}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Badge variant={isSelected ? "active" : "muted"}>
          {keyCount > 0 ? `${keyCount} KEY(S)` : 'NO KEYS'}
        </Badge>
        {isSystemActive && (
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--primary)',
            background: 'rgba(var(--primary-rgb),0.1)',
            padding: '4px 8px',
            borderRadius: 6,
            letterSpacing: '0.05em'
          }}>
            IN USE
          </span>
        )}
      </div>
    </div>
  );
}
