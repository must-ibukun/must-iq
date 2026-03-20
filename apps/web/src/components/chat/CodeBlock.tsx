'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-5 rounded-xl overflow-hidden border border-white/10 shadow-xl bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
          </div>
          <span className="text-[10px] font-bold font-mono text-white/30 uppercase tracking-widest ml-2">{language || 'text'}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all hover:bg-white/10 flex items-center gap-1.5 active:scale-95"
          style={{ color: copied ? 'var(--primary)' : 'rgba(255,255,255,0.5)' }}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.85rem',
          lineHeight: '1.6',
          background: 'transparent',
          fontFamily: 'var(--font-mono, "Fira Code", monospace)',
        }}
        codeTagProps={{
            style: {
                fontFamily: 'inherit'
            }
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
