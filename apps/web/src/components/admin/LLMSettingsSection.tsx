'use client';

import React from 'react';
import { Toggle, Button, Badge } from '@must-iq-web/components/ui';
import { Table, ProviderCard } from '@must-iq-web/components/admin';
import { AI_PROVIDERS } from '@must-iq-web/lib/constants/admin.constants';
import { IconAI, IconBrain, IconSparkles, IconZap, IconEye, IconLock } from '@must-iq-web/components/ui/MustIcons';

interface LLMSettingsSectionProps {
  ragEnabled: boolean;
  setRagEnabled: (v: boolean) => void;
  agenticReasoningEnabled: boolean;
  setAgenticReasoningEnabled: (v: boolean) => void;
  llmSettings: any;
  setLlmSettings: (s: any) => void;
  llmMeta: any;
  llmSaving: boolean;
  handleSaveLLM: (updates?: any, updatedApiKeys?: any[], newProvider?: string, newModel?: string, silentSave?: boolean) => Promise<void>;
  activeProvider: string;
  setActiveProvider: (p: string) => void;
  onAddKeyClick: (provider: string) => void;
  visibleKeys: Record<string, boolean>;
  toggleKey: (id: string) => void;
  handleActivateKey: (id: string, provider: string) => void;
  handleDeleteKey: (id: string) => void;
}

export function LLMSettingsSection({
  ragEnabled,
  setRagEnabled,
  agenticReasoningEnabled,
  setAgenticReasoningEnabled,
  llmSettings,
  setLlmSettings,
  llmMeta,
  llmSaving,
  handleSaveLLM,
  activeProvider,
  setActiveProvider,
  onAddKeyClick,
  visibleKeys,
  toggleKey,
  handleActivateKey,
  handleDeleteKey,
}: LLMSettingsSectionProps) {
  const [budgetEnabled, setBudgetEnabled] = React.useState(llmSettings?.contextTokenBudget != null);
  const [maxTokensEnabled, setMaxTokensEnabled] = React.useState(llmSettings?.maxTokens != null);

  React.useEffect(() => {
    setBudgetEnabled(llmSettings?.contextTokenBudget != null);
    setMaxTokensEnabled(llmSettings?.maxTokens != null);
  }, [llmSettings?.contextTokenBudget, llmSettings?.maxTokens]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>

      {/* RAG Settings */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Retrieval-Augmented Generation</div>
          <Toggle on={ragEnabled} onToggle={() => setRagEnabled(!ragEnabled)} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, paddingRight: 80 }}>
          Toggle whether the AI should fetch historical patterns from past days to inform the coaching analysis. Turning this off acts like a stateless AI.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Agentic Reasoning (Deep Search)</div>
          <Toggle on={agenticReasoningEnabled} onToggle={() => setAgenticReasoningEnabled(!agenticReasoningEnabled)} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, paddingRight: 80 }}>
          Enable advanced agentic reasoning (Deep Search) for complex queries. This allows the AI to perform multiple search steps and reason more deeply about the results.
        </div>

        {/* HyDE Query Expansion */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(139,92,246,1)' }}>
              <IconZap size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>HyDE Query Expansion</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Generates a hypothetical answer to bridge vocabulary gaps before querying the knowledge base. Improves recall for abstract queries.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {llmSettings?.hydeEnabled && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>ACTIVE</span>}
            <Toggle on={llmSettings?.hydeEnabled ?? false} onToggle={() => setLlmSettings({ ...llmSettings, hydeEnabled: !llmSettings?.hydeEnabled })} />
          </div>
        </div>

        {/* Cross-Encoder Reranking */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(245,158,11,1)' }}>
              <IconBrain size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Cross-Encoder Reranking</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Re-scores retrieved chunks with a local cross-encoder model (ms-marco-MiniLM-L-6-v2) before sending to the LLM. Improves answer quality at ~200ms extra latency.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {llmSettings?.rerankEnabled && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>ACTIVE</span>}
            <Toggle on={llmSettings?.rerankEnabled ?? false} onToggle={() => setLlmSettings({ ...llmSettings, rerankEnabled: !llmSettings?.rerankEnabled })} />
          </div>
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Embedding Provider</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Provider for vector generation</div>
            <select
              value={llmSettings?.embeddingProvider || 'gemini'}
              onChange={e => {
                const provider = e.target.value as any;
                const models = llmMeta?.embeddingProviders[provider] || [];
                const firstModel = models[0];
                setLlmSettings({
                  ...llmSettings,
                  embeddingProvider: provider,
                  embeddingModel: firstModel?.model || '',
                  embeddingDimensions: firstModel?.dimensions || 768
                });
              }}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
            >
              {Object.keys(llmMeta?.embeddingProviders || {}).map(p => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Embedding Model</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Specific model and dimensions</div>
            <select
              value={llmSettings?.embeddingModel || ''}
              onChange={e => {
                const modelName = e.target.value;
                const provider = llmSettings?.embeddingProvider || 'gemini';
                const models = llmMeta?.embeddingProviders[provider] || [];
                const match = models.find((m: any) => m.model === modelName);
                setLlmSettings({
                  ...llmSettings,
                  embeddingModel: modelName,
                  embeddingDimensions: match?.dimensions ?? llmSettings.embeddingDimensions
                });
              }}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
            >
              {(llmMeta?.embeddingProviders[llmSettings?.embeddingProvider || 'gemini'] || []).map((m: any) => (
                <option key={m.model} value={m.model}>
                  {m.model} ({m.dimensions}d){m.model === 'nomic-embed-text' ? ' — Recommended' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Vector Dimensions</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Dimensions for the current model (auto-set)</div>
            <select
              disabled
              value={llmSettings?.embeddingDimensions || 768}
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, opacity: 0.7, cursor: 'not-allowed' }}
            >
              <option value={llmSettings?.embeddingDimensions || 768}>{llmSettings?.embeddingDimensions || 768} Dimensions</option>
            </select>
          </div>
        </div>

        {(llmSettings?.provider === 'ollama' || llmSettings?.embeddingProvider === 'ollama') && (
          <div style={{ marginBottom: 24, maxWidth: '33.3%' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Ollama Base URL</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Custom endpoint for your local Ollama instance</div>
            <input
              value={llmSettings?.ollamaBaseUrl || 'http://localhost:11434'}
              onChange={e => setLlmSettings({ ...llmSettings, ollamaBaseUrl: e.target.value })}
              placeholder="http://localhost:11434"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Primary Model Override</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Forces a specific model for this provider</div>
            <select
              value={llmSettings?.model || ''}
              onChange={e => setLlmSettings({ ...llmSettings, model: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
            >
              {(llmMeta?.providers[llmSettings?.provider?.toLowerCase() || 'gemini'] || []).map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Utility Model</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Cheaper model for classification & summaries</div>
            <select
              value={llmSettings?.utilityModel || ''}
              onChange={e => setLlmSettings({ ...llmSettings, utilityModel: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
            >
              {(llmMeta?.providers[llmSettings?.provider?.toLowerCase() || 'gemini'] || []).map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>



          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {/* Temperature */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Temperature</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Controls randomness: 0 is focused, 1 is creative</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={llmSettings?.temperature ?? 0.3}
                  onChange={e => setLlmSettings({ ...llmSettings, temperature: parseFloat(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', minWidth: 24 }}>{llmSettings?.temperature ?? 0.3}</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Max Output Tokens</div>
                <Toggle
                  on={maxTokensEnabled}
                  onToggle={() => {
                    const next = !maxTokensEnabled;
                    setMaxTokensEnabled(next);
                    setLlmSettings({ ...llmSettings, maxTokens: next ? (llmSettings?.maxTokens ?? 4096) : null });
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                {maxTokensEnabled ? 'Cap LLM response length' : 'No limit — model default applies'}
              </div>
              {maxTokensEnabled && (
                <input
                  type="number"
                  min="256"
                  max="32000"
                  step="256"
                  value={llmSettings?.maxTokens ?? 4096}
                  onChange={e => setLlmSettings({ ...llmSettings, maxTokens: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                />
              )}
            </div>

            {/* Context Token Budget */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Context Token Budget</div>
                <Toggle
                  on={budgetEnabled}
                  onToggle={() => {
                    const next = !budgetEnabled;
                    setBudgetEnabled(next);
                    setLlmSettings({ ...llmSettings, contextTokenBudget: next ? (llmSettings?.contextTokenBudget ?? 16000) : null });
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                {budgetEnabled ? 'Max tokens of RAG context sent to LLM' : 'No limit — all retrieved chunks are sent'}
              </div>
              {budgetEnabled && (
                <input
                  type="number"
                  min="1000"
                  max="128000"
                  step="1000"
                  value={llmSettings?.contextTokenBudget ?? 16000}
                  onChange={e => setLlmSettings({ ...llmSettings, contextTokenBudget: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                />
              )}
            </div>
          </div>

        <Button variant="primary" onClick={() => handleSaveLLM()} isLoading={llmSaving}>
          {llmSaving ? 'Saving…' : 'Save LLM Settings'}
        </Button>
      </div>

      {/* Providers Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>AI Provider</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Manage API keys and choose which AI provider powers your analyses, reviews, and coaching chat.
          </div>
        </div>
        <Button variant="primary" onClick={() => onAddKeyClick(activeProvider)} style={{ marginBottom: 16 }}>
          + Add API Key
        </Button>
      </div>

      {/* Active Provider Summary */}
      {llmSettings?.provider && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 40, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const icon = AI_PROVIDERS.find(p => p.id === llmSettings.provider.toLowerCase())?.icon;
                if (icon === 'anthropic') return <IconBrain size={44} />;
                if (icon === 'gemini') return <IconSparkles size={44} />;
                if (icon === 'ollama') return <IconZap size={44} />;
                return <IconAI size={44} />;
              })()}
            </span>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                {AI_PROVIDERS.find(p => p.id === llmSettings.provider.toLowerCase())?.name ?? llmSettings.provider}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>
                Active provider — all AI calls route through this
              </p>
            </div>
          </div>
          <Badge variant="active">ACTIVE</Badge>
        </div>
      )}

      {/* Provider Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {AI_PROVIDERS.map((p) => {
          const isCurrentSystemProvider = llmSettings?.provider?.toLowerCase() === p.id;
          const isSelectedForViewing = activeProvider === p.id;
          const keys = Array.isArray(llmSettings?.apiKeys) ? llmSettings.apiKeys.filter((k: any) => k.provider === p.id) : [];

          return (
            <ProviderCard
              key={p.id}
              provider={p}
              isSelected={isSelectedForViewing}
              isSystemActive={isCurrentSystemProvider}
              keyCount={keys.length}
              onClick={() => setActiveProvider(p.id)}
            />
          );
        })}
      </div>

      {/* API Keys Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <Table headers={['PROVIDER', 'LABEL', 'API KEY', 'MODEL', 'STATUS', 'ACTIONS']} rows={
          (Array.isArray(llmSettings?.apiKeys) ? llmSettings.apiKeys : [])
            .map((k: any) => {
              const providerData = AI_PROVIDERS.find(p => p.id === k.provider);
              const provIcon = providerData?.icon;
              const IconComponent = provIcon === 'anthropic' ? <IconBrain size={18} /> : 
                                    provIcon === 'gemini' ? <IconSparkles size={18} /> : 
                                    provIcon === 'ollama' ? <IconZap size={18} /> : 
                                    <IconAI size={18} />;
              return [
                <div key={`prov-${k.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex', color: 'var(--primary)' }}>{IconComponent}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{providerData?.name ?? k.provider}</span>
                </div>,
                <span key={`label-${k.id}`} style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 500 }}>{k.label}</span>,
                <div key={`key-${k.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)', background: 'var(--bg)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-2)', width: 'fit-content' }}>
                  <span>{visibleKeys[k.id] ? k.key : k.key.slice(0, 8) + '••••••••••••••••' + k.key.slice(-4)}</span>
                  <button onClick={() => toggleKey(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, display: 'flex', color: 'var(--ink)' }}>
                    {visibleKeys[k.id] ? <IconEye size={14} /> : <IconLock size={14} />}
                  </button>
                </div>,
                <span key={`model-${k.id}`} style={{ color: 'var(--muted)', fontSize: 13 }}>{k.model}</span>,
                <Badge variant={k.isActive ? 'active' : 'muted'} key={`status-${k.id}`}>
                  {k.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>,
                <div key={`actions-${k.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!k.isActive && (
                    <button
                      onClick={() => handleActivateKey(k.id, k.provider)}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.08)', border: '1px solid rgba(var(--primary-rgb),0.2)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    >
                      Use This
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Delete
                  </button>
                </div>
              ];
            })}
        />
      </div>
    </div>
  );
}
