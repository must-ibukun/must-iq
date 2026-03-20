// ============================================================
// Must-IQ — Session Memory
// Per-session conversation memory using LangChain's
// ConversationSummaryBufferMemory
//
// Behaviour:
//   - Keeps recent turns verbatim (fast, no tokens wasted)
//   - When history exceeds maxTokenLimit, OLD turns are
//     summarized via a cheap utility LLM (Haiku / gpt-4o-mini)
//   - Summary replaces the old turns — context stays compact
//
// Why this matters for Must-IQ:
//   - Employees ask follow-up questions across long sessions
//   - Without memory, every question feels like a fresh chat
//   - Without summarization, long sessions blow token budgets
// ============================================================

import { ConversationSummaryBufferMemory } from "@langchain/classic/memory";
import { createUtilityLLM } from "../../../libs/config/src/llm.factory";

// In-process store: sessionId → memory instance
// In production, swap for a Redis-backed memory store
const memoryStore = new Map<string, ConversationSummaryBufferMemory>();

// ---------------------------------------------------------------
// Get or create memory for a session
// The memory LLM (for summarization) uses the cheapest model
// from the active provider — keeps summarization costs minimal
// ---------------------------------------------------------------
export async function getSessionMemory(
  sessionId: string
): Promise<ConversationSummaryBufferMemory> {
  if (memoryStore.has(sessionId)) {
    return memoryStore.get(sessionId)!;
  }

  // Use cheapest model for summarization (Haiku, gpt-4o-mini, flash)
  const utilityLLM = await createUtilityLLM();

  const memory = new ConversationSummaryBufferMemory({
    llm: utilityLLM,
    maxTokenLimit: 2000,        // summarize once history exceeds this
    returnMessages: true,       // return Message objects, not a string
    memoryKey: "chat_history",  // must match MessagesPlaceholder key in prompt
    inputKey: "question",
    outputKey: "answer",
  });

  memoryStore.set(sessionId, memory);
  return memory;
}

// ---------------------------------------------------------------
// Load existing messages into memory (on session resume)
// Called when a user reopens an old chat session
// ---------------------------------------------------------------
export async function loadMemoryFromHistory(
  sessionId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ConversationSummaryBufferMemory> {
  const memory = await getSessionMemory(sessionId);

  // Replay history pairs into memory
  for (let i = 0; i < history.length - 1; i += 2) {
    const userTurn = history[i];
    const assistantTurn = history[i + 1];
    if (userTurn && assistantTurn) {
      await memory.saveContext(
        { question: userTurn.content },
        { answer: assistantTurn.content }
      );
    }
  }

  return memory;
}

// ---------------------------------------------------------------
// Clear session memory (on logout or explicit clear)
// ---------------------------------------------------------------
export function clearSessionMemory(sessionId: string): void {
  memoryStore.delete(sessionId);
}

// ---------------------------------------------------------------
// Get a snapshot of current memory (for debugging / admin view)
// ---------------------------------------------------------------
export async function getMemorySnapshot(sessionId: string): Promise<{
  messages: any[];
  summary: string;
}> {
  const memory = memoryStore.get(sessionId);
  if (!memory) return { messages: [], summary: "" };

  const vars = await memory.loadMemoryVariables({});
  return {
    messages: vars.chat_history ?? [],
    summary: (memory as any).movingSummary ?? "",
  };
}
