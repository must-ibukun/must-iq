'use client';
import { ReactNode } from 'react';

import { BADGE_STYLES, BadgeVariant } from '@must-iq-web/lib/constants/admin.constants';

// ── BADGE ──────────────────────────────────────────────────────
export function Badge({ 
  variant, children, className = '', style 
}: { 
  variant: BadgeVariant; 
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium font-mono ${BADGE_STYLES[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = 'ghost', size = 'md', children, onClick, disabled, className = '',
  type = 'button', isLoading = false, title, style,
}: {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium font-body transition-all cursor-pointer border-0';
  const variants = {
    primary: 'bg-primary text-bg hover:bg-[#15b358] hover:-translate-y-px shadow-none',
    ghost: 'bg-card border border-border-2 text-ink hover:bg-white/5 hover:text-white',
    danger: 'bg-red/10 border border-red/30 text-red hover:bg-red/20',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-3.5 py-2 text-[12.5px]' };
  return (
    <button
      type={type}
      title={title}
      style={style}
      onClick={onClick} disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${(disabled || isLoading) ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? <span className="mr-1 animate-spin">⧗</span> : null}
      {children}
    </button>
  );
}

// ── INPUT ──────────────────────────────────────────────────────
// Pass `error` to show a red border + inline error text below the field.
export function Input({
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div className="w-full flex flex-col gap-1">
      <input
        {...props}
        className={`w-full h-10 px-3.5 rounded-lg border focus:outline-none transition-colors ${className}`}
        style={{
          background: 'var(--bg)',
          borderColor: error ? 'rgba(255,51,102,0.8)' : 'var(--border2)',
          color: 'var(--ink)',
          boxShadow: error ? '0 0 0 2px rgba(255,51,102,0.12)' : undefined,
        }}
      />
      {error && (
        <span className="text-[12px] font-medium" style={{ color: 'var(--red)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── FORM FIELD ─────────────────────────────────────────────────
// Convenience wrapper: label + input + inline error in one component.
// Usage: <FormField label="Email" error={errors.email} type="email" ... />
export function FormField({
  label,
  error,
  required,
  className = '',
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        className="text-[11.5px] font-semibold tracking-[0.05em] uppercase ml-0.5"
        style={{ color: 'var(--muted)' }}
      >
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      <Input error={error} required={required} {...inputProps} />
    </div>
  );
}


// ── TOGGLE ─────────────────────────────────────────────────────
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`toggle-track flex-shrink-0 ${on ? 'on' : ''}`}
      role="switch" aria-checked={on}
    />
  );
}

// ── PROGRESS BAR ───────────────────────────────────────────────
export function ProgressBar({ value, color = '#00d4ff' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border2)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}
// ── PAGINATOR ──────────────────────────────────────────────────
export function Paginator({ page, setPage, total }: { page: number; setPage: (n: number) => void; total: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 py-3 px-0.5 text-xs">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className={`px-2.5 py-1.5 rounded-md border border-border-2 bg-surface transition-colors ${page === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer text-ink'
          }`}
      >
        ‹ Prev
      </button>
      <span className="text-muted">Page {page} of {total}</span>
      <button
        onClick={() => setPage(Math.min(total, page + 1))}
        disabled={page === total}
        className={`px-2.5 py-1.5 rounded-md border border-border-2 bg-surface transition-colors ${page === total ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer text-ink'
          }`}
      >
        Next ›
      </button>
    </div>
  );
}

// ── MUST ICONS (Brand SVG library) ─────────────────────────────
export * from './MustIcons';
export * from './ConfirmModal';
