import { useRef, useEffect } from 'react';
import { useChatStore } from '@must-iq-web/store/chat.store';
import { useAuth } from '@must-iq-web/hooks/useAuth';
import { IconSend, IconPaperclip, IconZap, IconSearch } from '@must-iq-web/components/ui/MustIcons';

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function InputBar({ value, onChange, onSubmit, disabled }: InputBarProps) {
  const { selectedTeams, availableTeams, mode, setMode } = useChatStore();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize mode from user preference on mount/user load
  useEffect(() => {
    if (user) {
      const defaultMode = user.deepSearchEnabled ? 'agent' : 'rag';
      // Only set if we haven't manually changed it this session or if it's first load
      // For simplicity, we'll set it whenever user object definitively loads for the first time
      setMode(defaultMode);
    }
  }, [user?.id]);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [value]);

  const scopeLabel = selectedTeams
    .map((id) => {
        if (id === 'general') return 'General';
        const team = availableTeams.find(t => t.id === id);
        return team ? team.name : id;
    })
    .join(' · ');

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleFinalSubmit(); 
    }
  }

  const handleFinalSubmit = () => {
    if (disabled || !value.trim()) return;
    
    // Call original onSubmit
    onSubmit();

    // Reset mode to user default if it was manually toggled for this query
    if (user) {
      const defaultMode = user.deepSearchEnabled ? 'agent' : 'rag';
      if (mode !== defaultMode) {
        setMode(defaultMode);
      }
    }
  };

  return (
    <div
      className="flex-shrink-0 px-6 pb-5 pt-4 border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="max-w-3xl mx-auto rounded-xl overflow-hidden transition-all"
        style={{ background: 'var(--card)', border: '1px solid var(--border-2)' }}
        onFocus={() => { }}
      >
        {/* Textarea row */}
        <div className="flex items-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={mode === 'agent' ? 'Deep Search: Agentic reasoning over Jira, Slack, GitHub…' : 'Quick Search: Fast responses across your selected silos…'}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed px-4 py-3.5"
            style={{ color: 'var(--ink)', minHeight: 52, maxHeight: 180, fontFamily: 'Geist,system-ui,sans-serif' }}
          />
          {/* Action icons */}
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer border-0"
              style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--muted)' }}
              title="Attach file"
            ><IconPaperclip size={18} /></button>
            <button
              onClick={handleFinalSubmit}
              disabled={disabled || !value.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer border-0"
              style={{ background: disabled || !value.trim() ? 'rgba(var(--primary-rgb),0.3)' : 'var(--primary)', color: 'var(--bg)' }}
            >
              <IconSend size={15} />
            </button>
          </div>
        </div>

        {/* Footer row */}
        <div
          className="flex items-center justify-between px-3.5 py-2 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Scope + Mode */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-1 truncate max-w-[200px]">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
              <span className="text-[10.5px] font-medium tracking-wide uppercase opacity-70 truncate" style={{ color: 'var(--ink)' }}>{scopeLabel}</span>
            </div>

            {/* Mode toggle (Premium Sliding Version) */}
            <div 
              className="relative flex items-center p-1 rounded-lg" 
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border)',
                minWidth: '220px'
              }}
            >
              {/* Sliding Highlight */}
              <div 
                className="absolute top-1 bottom-1 transition-all duration-300 ease-out rounded-md"
                style={{ 
                  left: mode === 'rag' ? '4px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)',
                  background: 'rgba(var(--primary-rgb), 0.12)',
                  border: '1px solid rgba(var(--primary-rgb), 0.2)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
              />

              {(['rag', 'agent'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-semibold cursor-pointer border-0 transition-all"
                  style={{
                    color: mode === m ? 'var(--primary)' : 'var(--muted)',
                    fontFamily: 'Inter,system-ui,sans-serif',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: mode === m ? 1 : 0.6 }}>
                    {m === 'rag' ? <IconZap size={14} /> : <IconSearch size={14} />}
                  </span>
                  <span>
                    {m === 'rag' ? 'Quick Search' : 'Deep Search'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Char count */}
          <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
            {value.length} / 4000
          </span>
        </div>
      </div>
    </div>
  );
}
