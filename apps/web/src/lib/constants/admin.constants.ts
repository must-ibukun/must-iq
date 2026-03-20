export type BadgeVariant = 'active' | 'warn' | 'error' | 'info' | 'muted' | 'jira' | 'slack' | 'kb';

export const BADGE_STYLES: Record<BadgeVariant, string> = {
    active: 'bg-green/10 border border-green/20 text-green',
    warn: 'bg-amber/10 border border-amber/20 text-amber',
    error: 'bg-red/10 border border-red/20 text-red',
    info: 'bg-primary-dim border border-primary/20 text-primary',
    muted: 'bg-white/5 border border-border-2 text-ink-muted',
    jira: 'bg-blue-900/30 border border-blue-700/40 text-blue-400',
    slack: 'bg-purple-900/30 border border-purple/40 text-purple',
    kb: 'bg-green/10 border border-green/20 text-green',
};

export const WORKSPACE_COLORS: Record<string, string> = {
    docs: 'var(--primary)',
    engineering: 'var(--primary)',
    hr: 'var(--green)',
    finance: 'var(--amber)',
    platform: 'var(--purple)',
    security: 'var(--red)',
    blockchain: 'var(--purple)',
    lambda: 'var(--amber)',
    crawler: 'var(--green)',
    database: 'var(--primary)',
    qa: 'var(--red)',
    shared: 'var(--muted)',
};

export type Section = 'overview' | 'teams' | 'users' | 'workspaces' | 'llm' | 'tokens' | 'audit' | 'settings' | 'knowledge' | 'profile' | 'docs';

export const NAV = [
    { section: 'overview' as Section, label: 'Dashboard', badge: null, badgeType: null },
    { section: 'teams' as Section, label: 'Teams', badge: '24', badgeType: 'cyan' },
    { section: 'users' as Section, label: 'Users', badge: null, badgeType: null },
    { section: 'workspaces' as Section, label: 'Workspace', badge: null, badgeType: null },
    { section: 'llm' as Section, label: 'LLM Settings', badge: null, badgeType: null },
    { section: 'tokens' as Section, label: 'Token Usage', badge: null, badgeType: null },
    { section: 'audit' as Section, label: 'Audit Log', badge: null, badgeType: null },
    { section: 'knowledge' as Section, label: 'Knowledge Base', badge: null, badgeType: null },
    { section: 'settings' as Section, label: 'System Settings', badge: null, badgeType: null },
    { section: 'docs' as Section, label: 'Internal docs', badge: 'MD', badgeType: 'info' },
];

export const AI_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', shortName: 'OpenAI', icon: 'openai', model: 'gpt-4o', modelId: 'gpt-4o', description: 'Advanced reasoning and versatility' },
    { id: 'anthropic', name: 'Anthropic', shortName: 'Claude', icon: 'anthropic', model: 'claude-3-5-sonnet-20240620', modelId: 'claude-3-5-sonnet-20240620', description: 'Excellent for complex logic and coding' },
    { id: 'gemini', name: 'Google Gemini', shortName: 'Gemini', icon: 'gemini', model: 'gemini-1.5-pro', modelId: 'gemini-1.5-pro', description: 'High context window and multimodal capabilities' },
    { id: 'ollama', name: 'Ollama', shortName: 'Ollama', icon: 'ollama', model: 'llama3', modelId: 'llama3', description: 'Privacy-focused local inference' },
    { id: 'xai', name: 'xAI (Grok)', shortName: 'xAI', icon: 'openai', model: 'grok-beta', modelId: 'grok-beta', description: 'Real-time knowledge from X' },
    { id: 'azure-openai', name: 'Azure OpenAI', shortName: 'Azure', icon: 'openai', model: 'gpt-4o', modelId: 'gpt-4o', description: 'Enterprise-grade OpenAI integration' },
];
