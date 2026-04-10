'use client';

import React, { useMemo, useState } from 'react';
import {
  IconBrain, IconSearch, IconSparkles, IconCheck, IconChevronDown, IconChevronUp, IconInfo
} from '@must-iq-web/components/ui/MustIcons';

interface Stage {
  id: number;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: Stage[] = [
  { id: 1, label: 'Intent Analysis', description: 'Classifying domain and extracting technical keywords', icon: <IconBrain size={14} /> },
  { id: 2, label: 'Hybrid Search', description: 'Retrieving relevant code via Vector + BM25 search', icon: <IconSearch size={14} /> },
  { id: 3, label: 'Reranking', description: 'Evaluating candidate relevance with Cross-Encoder', icon: <IconSparkles size={14} /> },
  { id: 4, label: 'Finalizing', description: 'Synthesizing knowledge into a concise response', icon: <IconCheck size={14} /> },
];

export function ProcessingStages({ thought }: { thought?: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentStageInfo = useMemo(() => {
    if (!thought) return { id: 0, text: '' };
    const match = thought.match(/^(\d)\/\d:\s*(.*)$/);
    if (!match) return { id: 1, text: thought };
    return { id: parseInt(match[1]), text: match[2] };
  }, [thought]);

  return (
    <div className="flex flex-col gap-3 py-4 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* ── Main Thought Card (Glassmorphic) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 dark:border-white/5 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl shadow-xl dark:shadow-2xl p-5 group">

        {/* Subtle Shimmer Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="relative ring-1 ring-primary/20 rounded-lg p-1.5 bg-primary/5">
              <IconBrain className="text-primary animate-pulse" size={20} />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-ping opacity-50" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-widest text-primary dark:text-primary/90">
                Must-IQ Reasoning
              </span>
              <span className="text-[10px] opacity-60 dark:opacity-40 font-medium tracking-tight">
                Autonomous Retrieval Engine v2.0
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted border border-border/50 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-tight opacity-70">
              {isExpanded ? 'Hide Trace' : 'Expand Trace'}
            </span>
            {isExpanded ? <IconChevronUp size={12} className="opacity-70" /> : <IconChevronDown size={12} className="opacity-70" />}
          </button>
        </div>

        {/* Vertical Trace List */}
        <div className="flex flex-col gap-5 relative">
          {/* Connecting Line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-border/30 z-0" />

          {STAGES.map((stage) => {
            const isCompleted = currentStageInfo.id > stage.id;
            const isActive = currentStageInfo.id === stage.id;
            const isPending = currentStageInfo.id < stage.id;

            return (
              <div key={stage.id} className={`flex items-start gap-4 transition-all duration-500 relative z-10 ${isPending ? 'opacity-20 translate-x-1' : 'opacity-100'
                }`}>
                {/* Status Indicator */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 ${isCompleted
                    ? 'bg-primary border-primary text-white scale-90'
                    : isActive
                      ? 'bg-primary/20 border-primary text-primary animate-pulse ring-4 ring-primary/5'
                      : 'bg-surface border-border text-muted-foreground'
                  }`}>
                  {isCompleted ? <IconCheck size={12} /> : stage.icon}
                </div>

                {/* Progress Detail */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-extrabold tracking-tight uppercase ${isActive ? 'text-primary' : isCompleted ? 'opacity-90 dark:opacity-80' : 'opacity-40'
                      }`}>
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                    )}
                  </div>

                  {/* Status Message / Description */}
                  <span className={`text-[11.5px] leading-relaxed transition-all duration-300 ${isActive ? 'text-foreground font-semibold line-shimmer' : 'text-muted-foreground opacity-80 dark:opacity-60'
                    }`}>
                    {isActive ? (currentStageInfo.text || stage.description) : stage.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Technical Reasoning Details (Expandable) ── */}
        {isExpanded && (
          <div className="mt-6 pt-5 border-t border-border/50 animate-in zoom-in-95 fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <IconInfo size={12} className="text-primary/70" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 dark:opacity-50">Technical Meta-Trace</span>
            </div>
            <div className="bg-muted/50 dark:bg-black/20 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-primary dark:text-primary/70 border border-primary/10 select-all overflow-x-auto whitespace-pre-wrap shadow-inner">
              {thought || 'Preparing technical trace...'}
            </div>
            <p className="mt-3 text-[9px] opacity-50 dark:opacity-30 italic leading-tight font-medium">
              Engine utilized HyDE (Hypothetical Document Embedding) and Cross-Encoder Reranking to pinpoint context across the selected workspaces.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .line-shimmer {
          background: linear-gradient(
            90deg,
            var(--foreground) 0%,
            rgba(var(--primary-rgb), 0.8) 50%,
            var(--foreground) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
