// ============================================================
// Must-IQ Agent — Shared Types
// All event shapes emitted by the streaming agent runner
// ============================================================

export type AgentStreamEvent =
    | { type: 'thinking'; content: string }
    | { type: 'tool_call'; toolName: string; isExternal: boolean; isIngest: boolean; content: string }
    | { type: 'done'; toolsUsed: string[]; tokensUsed: number }
    | { type: 'error'; content: string };
