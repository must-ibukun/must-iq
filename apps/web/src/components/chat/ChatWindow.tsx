'use client';
import { useEffect, useRef, useState } from 'react';
import { Message, Source } from '@must-iq-web/types/chat.types';
import { SUGGESTED_PROMPTS } from '@must-iq-web/lib/constants/landing.constant';
import { Badge } from '@must-iq-web/components/ui';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  IconBrain, IconChat, IconKnowledge, IconAudit, IconPlus, 
  IconSparkles, IconZap, IconPaperclip, IconSend, IconSearch,
  IconBug, IconClipboard, IconCalendar
} from '@must-iq-web/components/ui/MustIcons';
import remarkGfm from 'remark-gfm';
import { getLocalImage } from '@must-iq-web/lib/utils/idb';
import { ProcessingStages } from './ProcessingStages';

function SourceBadge({ type }: { type: Source['sourceType'] }) {
  const icons: Record<string, any> = {
    jira: <IconAudit size={11} />,
    slack: <IconChat size={11} />,
    doc: <IconKnowledge size={11} />,
    kb: <IconBrain size={11} />
  };
  return (
    <div 
      className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold"
      style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb),0.2)' }}
    >
      {icons[type] || <IconPlus size={11} />}
    </div>
  );
}

function SourceCitations({ sources }: { sources: Source[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 relative">
      <div className="w-full flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">Sources</span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      {sources.map((src, i) => (
        <div 
          key={i} 
          className="group relative cursor-help"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:scale-105"
            style={{ 
              background: 'var(--card)', 
              border: '1px solid var(--border)',
              boxShadow: hoveredIndex === i ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <SourceBadge type={src.sourceType} />
            <span className="text-[10px] font-mono opacity-60">{(src.score || 0).toFixed(2)}</span>
          </div>

          {hoveredIndex === i && (
            <div 
              className="absolute bottom-full left-0 mb-2 w-80 p-3 rounded-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{ 
                background: 'var(--surface)', 
                border: '1px solid var(--border)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-[11px] font-bold truncate max-w-[180px]" style={{ color: 'var(--ink)' }}>{src.title}</div>
                <Badge variant="muted" style={{ fontSize: '9px' }}>{src.sourceType}</Badge>
              </div>
              <div className="mt-2 rounded-md overflow-hidden border max-h-[200px] overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                <SyntaxHighlighter
                  language={src.title?.split('.').pop() || 'text'}
                  style={atomDark}
                  customStyle={{
                    margin: 0,
                    padding: '0.75rem',
                    fontSize: '0.7rem',
                    lineHeight: '1.4',
                    background: '#1e1e1e',
                  }}
                  wrapLongLines={true}
                >
                  {src.content && src.content.length > 500 ? src.content.slice(0, 500) + '...' : src.content}
                </SyntaxHighlighter>
              </div>
              {src.meta && (
                <div className="mt-2 pt-2 border-t text-[9px] opacity-40 uppercase tracking-tighter" style={{ borderColor: 'var(--border)' }}>
                  {src.meta}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg, streaming }: { msg: Message; streaming: boolean }) {
  const isUser = msg.role === 'user';
  const [localImg, setLocalImg] = useState<string | null>(null);

  useEffect(() => {
    if (msg.localImageId) {
      getLocalImage(msg.localImageId).then(setLocalImg).catch(console.error);
    }
  }, [msg.localImageId]);

  return (
    <div className="flex gap-3.5 px-7 py-1.5 max-w-3xl mx-auto w-full animate-fade-up">
      <div
        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[12px] mt-1"
        style={
          isUser
            ? { background: 'linear-gradient(135deg,rgba(var(--primary-rgb),0.25),rgba(157,111,255,0.25))', border: '1px solid var(--border-2)', color: 'var(--primary)', fontWeight: 700, fontSize: 10 }
            : { background: 'rgba(var(--primary-rgb),0.06)', border: '1px solid rgba(var(--primary-rgb),0.18)' }
        }
      >
        {isUser ? 'JD' : <IconBrain size={18} color="var(--primary)" />}
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <div
          className="text-[11px] font-semibold tracking-widest uppercase mb-1.5"
          style={{ color: isUser ? 'var(--primary)' : 'var(--muted)' }}
        >
          {isUser ? 'You' : 'Must-IQ'}
        </div>

        {localImg && (
          <div className="mb-3 mt-1">
            <img 
              src={localImg} 
              alt="Uploaded context" 
              className="max-w-sm max-h-[300px] w-auto rounded-lg border shadow-sm" 
              style={{ borderColor: 'var(--border-2)', objectFit: 'contain' }} 
            />
          </div>
        )}

        <div className="text-[14px] leading-relaxed markdown-content" style={{ color: 'var(--ink)' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    language={match[1]}
                    value={String(children).replace(/\n$/, '')}
                  />
                ) : (
                  <code
                    className="font-mono text-[12.5px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p className="mb-4 last:mb-0">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>;
              },
              li({ children }) {
                return <li className="leading-relaxed">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-bold text-ink">{children}</strong>;
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
          {streaming && msg.role === 'assistant' && <span className="cursor-blink" />}
        </div>
        {!streaming && msg.sources && msg.sources.length > 0 && (
          <SourceCitations sources={msg.sources} />
        )}
      </div>
    </div>
  );
}


function TypingIndicator({ thought }: { thought?: string | null }) {
  return (
    <div className="flex gap-3.5 px-7 py-5 max-w-3xl mx-auto w-full">
      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-1"
        style={{ background: 'rgba(var(--primary-rgb),0.06)', border: '1px solid rgba(var(--primary-rgb),0.18)' }}>
        <IconBrain size={18} color="var(--primary)" />
      </div>
      <div className="flex-1">
        <ProcessingStages thought={thought} />
      </div>
    </div>
  );
}


function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
      <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 40, color: 'var(--ink)' }}>
        must<span style={{ color: 'var(--primary)' }}>-iq</span>
      </div>
      <div className="text-[13.5px] max-w-xs leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
        Ask anything about Must Company’s projects, policies, and knowledge base.
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggest(s.text)}
            className="text-left p-3 rounded-xl transition-all cursor-pointer border-0"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.5 }}
            onMouseEnter={(e) => { (e.currentTarget).style.borderColor = 'var(--border-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.borderColor = 'var(--border)'; }}
          >
            <span className="block mb-1.5" style={{ opacity: 0.8 }}>
              {s.icon === 'clipboard' ? <IconClipboard size={18} color="var(--primary)" /> : 
               s.icon === 'zap' ? <IconZap size={18} color="var(--primary)" /> : 
               s.icon === 'bug' ? <IconBug size={18} color="var(--primary)" /> : 
               s.icon === 'calendar' ? <IconCalendar size={18} color="var(--primary)" /> : 
               <IconSearch size={18} color="var(--primary)" />}
            </span>
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({
  messages, isStreaming, isWaiting, thought, onSuggest,
}: {
  messages: Message[];
  isStreaming: boolean;
  isWaiting: boolean;
  thought?: string | null;
  onSuggest: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return <EmptyState onSuggest={onSuggest} />;
  }

  return (
    <div className="flex-1 overflow-y-auto py-7">
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          streaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
        />
      ))}
      {(isWaiting || (isStreaming && messages[messages.length - 1]?.role === 'user')) && <TypingIndicator thought={thought} />}
      <div ref={bottomRef} />
    </div>
  );
}

export { EmptyState };
