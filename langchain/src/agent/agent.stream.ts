// ============================================================
// Must-IQ Agent — Streaming Runner
//
// Runs the agent and yields step-by-step AgentStreamEvents
// as they are produced. Used by the NestJS API to stream
// Server-Sent Events (SSE) back to the frontend.
//
// Event types:
//   · thinking   — the LLM is composing a response
//   · tool_call  — a tool was invoked (with metadata)
//   · done       — all steps complete (includes token count)
//   · error      — something went wrong
// ============================================================

import { HumanMessage } from '@langchain/core/messages';
import { getSessionMemory } from '@must-iq/langchain/memory/session-memory';
import { EXTERNAL_TOOLS } from '@must-iq/langchain/tools/internal-tools';
import { buildMustIQAgent } from './agent.builder';
import { AgentStreamEvent } from './agent.types';

// ── STREAM RUNNER ──────────────────────────────────────────────
export async function* runAgentStream(
    message: string,
    sessionId: string,
    selectedWorkspaces: string[],
): AsyncGenerator<AgentStreamEvent> {
    const agent = await buildMustIQAgent(sessionId, selectedWorkspaces);
    const memory = getSessionMemory(sessionId);

    // Load chat history
    const history = await memory.chatHistory.getMessages();

    // Track which external tools were called (for audit log)
    const externalToolNames = new Set(EXTERNAL_TOOLS.map(t => t.name));
    const toolsUsed: string[] = [];
    let tokensUsed = 0;

    try {
        const stream = await agent.stream(
            {
                messages: [
                    ...history,
                    new HumanMessage(message),
                ],
            },
            { configurable: { thread_id: sessionId } },
        );

        for await (const chunk of stream) {
            // ── Agent thinking / composing ──────────────────────────
            if (chunk.agent?.messages) {
                for (const msg of chunk.agent.messages) {
                    if (msg.content) {
                        yield { type: 'thinking', content: String(msg.content) };
                    }
                    // Track token usage from LLM response metadata
                    if (msg.usage_metadata) {
                        tokensUsed += msg.usage_metadata.total_tokens ?? 0;
                    }
                }
            }

            // ── Tool being called ───────────────────────────────────
            if (chunk.tools?.messages) {
                for (const msg of chunk.tools.messages) {
                    const toolName = (msg as any).name ?? 'unknown';
                    toolsUsed.push(toolName);

                    const isExternal = externalToolNames.has(toolName);
                    const isIngest = toolName === 'ingest_to_mustiq';

                    yield {
                        type: 'tool_call',
                        toolName,
                        isExternal,
                        isIngest,
                        content: isIngest
                            ? `💾 Saving to knowledge base…`
                            : isExternal
                                ? `🔍 Reading from ${toolName.replace(/_/g, ' ')}…`
                                : `🧠 Searching Must-IQ knowledge base…`,
                    };
                }
            }
        }

        // Persist turn to session memory
        await memory.chatHistory.addUserMessage(message);

        yield { type: 'done', toolsUsed, tokensUsed };

    } catch (err) {
        yield { type: 'error', content: (err as Error).message };
    }
}
