export const TERMINAL_LINES = [
    { text: '$ nx run api:ingest-pipeline', color: '#f0f6ff', delay: 0 },
    { text: '', color: '', delay: 200 },
    { text: '🔗 Webhook — INFRA-441 [Jira · status: Done]', color: '#00d4ff', delay: 600 },
    { text: '📥 Fetching full ticket + 6 comments…', color: '#4a5568', delay: 1200 },
    { text: '', color: '', delay: 1400 },
    { text: '🧠 Analysing with claude-haiku (utility model)…', color: '#4a5568', delay: 1600 },
    { text: '   knowledge_type    → solution', color: '#00ff9d', delay: 2200 },
    { text: '   knowledge_value   → 0.91  ✓ above threshold', color: '#00ff9d', delay: 2500 },
    { text: '   root_cause        → ALB health check path mismatch', color: '#4a5568', delay: 2900 },
    { text: '   solution          → change path to /api/health', color: '#4a5568', delay: 3100 },
    { text: '   technologies      → [ecs, alb, aws]', color: '#9d6fff', delay: 3300 },
    { text: '', color: '', delay: 3500 },
    { text: '💾 Embedding chunk [problem]  → pgvector…  ✓', color: '#00ff9d', delay: 3700 },
    { text: '💾 Embedding chunk [solution] → pgvector…  ✓', color: '#00ff9d', delay: 4100 },
    { text: '', color: '', delay: 4300 },
    { text: '✓  INFRA-441 → engineering KB · 2 chunks stored', color: '#00ff9d', delay: 4500 },
    { text: '', color: '', delay: 4700 },
    { text: '>>  Slack webhook — #backend-help [✓ reacted]', color: '#00d4ff', delay: 5200 },
    { text: '🧠 Analysing…  knowledge_value → 0.74  ✓', color: '#00ff9d', delay: 6300 },
    { text: '💾 Stored → engineering KB', color: '#00ff9d', delay: 6800 },
    { text: '', color: '', delay: 7000 },
    { text: '$ _', color: '#f0f6ff', delay: 7200 },
];

export const THEME_COLORS = {
    primary: 'var(--primary)',
    green: 'var(--green)',
    amber: 'var(--amber)',
    purple: 'var(--purple)',
    red: 'var(--red)',
    white: 'var(--white)',
    muted: 'var(--ink-muted)',
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    card: 'var(--card)',
    border: 'var(--border)',
    border2: 'var(--border-2)',
    text: 'var(--ink)'
};

export const SEARCH_SCOPE_ITEMS = [
    { n: 'General', on: true, locked: true, c: THEME_COLORS.primary },
    { n: 'Engineering', on: true, locked: false, c: THEME_COLORS.primary },
    { n: 'HR', on: false, locked: false, c: THEME_COLORS.green },
    { n: 'Finance', on: false, locked: false, c: THEME_COLORS.amber }
];

export const MOCK_SOURCES = [
    ['JIRA', 'rgba(0,82,204,0.2)', 'rgba(0,82,204,0.4)', '#4c9aff', 'INFRA-441 — ECS health check', '0.91'],
    ['SLACK', 'rgba(140,40,150,0.2)', 'rgba(140,40,150,0.4)', '#e879f9', '#backend-help · solved', '0.87'],
    ['DOC', 'rgba(var(--primary-rgb),0.07)', 'rgba(var(--primary-rgb),0.2)', THEME_COLORS.primary, 'ECS Runbook § 4.2', '0.74']
];

/** Suggested prompts shown on the chat empty state */
export const SUGGESTED_PROMPTS: { icon: string; text: string }[] = [
    { icon: 'bug', text: 'Has anyone seen a 502 error on ECS deployments?' },
    { icon: 'clipboard', text: 'Who owns the Payments API and what stack does it use?' },
    { icon: 'calendar', text: "What's the annual leave policy for new joiners?" },
    { icon: 'zap', text: 'What Jira tickets are open for the Redis timeout issue?' },
];
