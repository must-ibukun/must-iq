import React from 'react';

const TECH_OPTIONS = [
  // Languages
  { label: 'TypeScript', group: 'Language' },
  { label: 'JavaScript', group: 'Language' },
  { label: 'Python', group: 'Language' },
  { label: 'Swift', group: 'Language' },
  { label: 'Kotlin', group: 'Language' },
  { label: 'Solidity', group: 'Language' },
  { label: 'Go', group: 'Language' },
  { label: 'Rust', group: 'Language' },
  { label: 'Dart', group: 'Language' },
  { label: 'Flutter', group: 'Language' },
  // Frameworks / Libraries
  { label: 'NestJS', group: 'Framework' },
  { label: 'React', group: 'Framework' },
  { label: 'Next.js', group: 'Framework' },
  { label: 'Vite', group: 'Framework' },
  { label: 'React Native', group: 'Framework' },
  { label: 'FastAPI', group: 'Framework' },
  { label: 'Express', group: 'Framework' },
  // ORM / DB
  { label: 'Prisma', group: 'ORM / DB' },
  { label: 'PostgreSQL', group: 'ORM / DB' },
  { label: 'Redis', group: 'ORM / DB' },
  { label: 'MongoDB', group: 'ORM / DB' },
  { label: 'MySQL', group: 'ORM / DB' },
  { label: 'DynamoDB', group: 'ORM / DB' },
  // Platforms
  { label: 'iOS', group: 'Platform' },
  { label: 'Android', group: 'Platform' },
  { label: 'Ethereum', group: 'Platform' },
  { label: 'AWS Lambda', group: 'Platform' },
  { label: 'Docker', group: 'Platform' },
];

const GROUP_ORDER = ['Language', 'Framework', 'ORM / DB', 'Platform'];

interface TechStackPickerProps {
  /** Comma-separated string value, e.g. "TypeScript, NestJS, Prisma" */
  value: string;
  onChange: (value: string) => void;
  small?: boolean;
}

export function TechStackPicker({ value, onChange, small }: TechStackPickerProps) {
  const selected = new Set(
    value ? value.split(',').map(t => t.trim()).filter(Boolean) : []
  );

  function toggle(label: string) {
    const next = new Set(selected);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    onChange([...next].join(', '));
  }

  const chipH = small ? 26 : 30;
  const chipFont = small ? 11 : 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: small ? 8 : 12 }}>
      {GROUP_ORDER.map(group => {
        const options = TECH_OPTIONS.filter(o => o.group === group);
        return (
          <div key={group}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>
              {group}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {options.map(opt => {
                const active = selected.has(opt.label);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => toggle(opt.label)}
                    style={{
                      height: chipH,
                      padding: '0 10px',
                      fontSize: chipFont,
                      fontWeight: 600,
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-2)'}`,
                      borderRadius: 20,
                      background: active ? 'var(--primary)' : 'var(--bg)',
                      color: active ? '#fff' : 'var(--ink)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      opacity: active ? 1 : 0.75,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {selected.size > 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Selected:</span> {[...selected].join(', ')}
        </div>
      )}
    </div>
  );
}

// Wrapper that shows the picker inside a popover dropdown

import { useState, useRef, useEffect } from 'react';

export function TechStackDropdown({ value, onChange }: TechStackPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedCount = value ? value.split(',').filter(Boolean).length : 0;
  const firstLabel = value ? value.split(',')[0].trim() : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 12px',
          background: 'var(--bg)',
          border: '1px solid var(--border-2)',
          borderRadius: 8,
          color: value ? 'var(--ink)' : 'var(--muted)',
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span>
          {selectedCount === 0 ? 'Select Tech Stack (Optional)' :
            selectedCount === 1 ? firstLabel :
              `${firstLabel} + ${selectedCount - 1} more`}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          marginTop: 4,
          padding: 16,
          background: 'var(--card)',
          border: '1px solid var(--border-2)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          minWidth: 400
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Assign Tech Stack</span>
            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          <TechStackPicker value={value} onChange={onChange} small />
        </div>
      )}
    </div>
  );
}
