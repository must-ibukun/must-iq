// ============================================================
// Must-IQ Agent — Standalone Runner (non-streaming)
//
// Runs the agent for a single turn and returns the full text
// response. Use this for: CLI tools, background jobs, tests.
//
// For SSE / real-time frontends use agent.stream.ts instead.
// ============================================================

import { HumanMessage } from '@langchain/core/messages';
import { getSessionMemory } from '@must-iq/langchain/memory/session-memory';
import { buildMustIQAgent } from './agent.builder';

// ── STANDALONE RUNNER ──────────────────────────────────────────
export async function runAgent(
    message: string,
    userId: string,
    workspaces: string[],
    sessionId: string,
): Promise<string> {
    const agent = await buildMustIQAgent(sessionId, workspaces);
    const memory = getSessionMemory(sessionId);

    // Load chat history
    const history = await memory.chatHistory.getMessages();

    const result = await agent.invoke(
        {
            messages: [
                ...history,
                new HumanMessage(message),
            ],
        },
        { configurable: { thread_id: sessionId } },
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const response = String(lastMessage.content);

    // Persist turn to session memory
    await memory.chatHistory.addUserMessage(message);

    return response;
}
