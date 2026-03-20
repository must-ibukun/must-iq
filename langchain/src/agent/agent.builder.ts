// ============================================================
// Must-IQ Agent — Builder
//
// Creates a LangGraph ReAct agent configured with:
//   · The active LLM (driven by DB settings)
//   · All internal + external tools
//   · The Must-IQ assistant system prompt
//
// Integration philosophy:
//   External systems (Jira, Slack, GitHub, Confluence) are
//   READ-ONLY sources. The agent pulls data IN to Must-IQ.
//   It NEVER creates tickets, posts messages, or modifies
//   anything outside of Must-IQ's own knowledge base.
//
//   The only "write" the agent can do:
//   → ingest_to_mustiq: save a knowledge entry into pgvector
// ============================================================

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createLLM } from '@must-iq/config/llm.factory';
import { getActiveSettings } from '@must-iq/config/settings.service';
import { ALL_TOOLS } from '@must-iq/langchain/tools/internal-tools';
import { MUST_IQ_ASSISTANT_SYSTEM_PROMPT } from '../prompts/must-iq-assistance.prompt';

// ── AGENT BUILDER ──────────────────────────────────────────────
export async function buildMustIQAgent(
    sessionId: string,
    selectedWorkspaces: string[] = ['general'],
) {
    const [llm, settings] = await Promise.all([
        createLLM({ maxTokens: 4096 }),
        getActiveSettings(),
    ]);

    const agent = createReactAgent({
        llm,
        tools: ALL_TOOLS,
        messageModifier: [
            MUST_IQ_ASSISTANT_SYSTEM_PROMPT,
            `Active model: ${settings.provider}/${settings.model}`,
            `Selected workspaces: ${selectedWorkspaces.join(', ')}`,
        ].join('\n\n'),
    });

    return agent;
}
