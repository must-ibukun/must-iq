// ============================================================
// Must-IQ — Session Memory
// Per-session conversation message history using LangChain's
// InMemoryChatMessageHistory.
//
// RunnableWithMessageHistory requires a BaseChatMessageHistory
// (a message list store), NOT the legacy ConversationSummaryBufferMemory.
//
// Why this approach:
//   - Employees ask follow-up questions across long sessions
//   - Without memory, every question feels like a fresh chat
//   - InMemoryChatMessageHistory is the correct type for LCEL chains
// ============================================================

import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// In-process store: sessionId → message history instance
// In production, swap for a Redis-backed message history store
const memoryStore = new Map<string, InMemoryChatMessageHistory>();

// ---------------------------------------------------------------
// Get or create message history for a session
// ---------------------------------------------------------------
export function getSessionMemory(sessionId: string): InMemoryChatMessageHistory {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, new InMemoryChatMessageHistory());
  }
  return memoryStore.get(sessionId)!;
}

// ---------------------------------------------------------------
// Load existing messages into history (on session resume)
// Called when a user reopens an old chat session
// ---------------------------------------------------------------
export async function loadMemoryFromHistory(
  sessionId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<InMemoryChatMessageHistory> {
  const mem = getSessionMemory(sessionId);

  const messages: BaseMessage[] = history.map(h =>
    h.role === "user" ? new HumanMessage(h.content) : new AIMessage(h.content)
  );

  await mem.addMessages(messages);
  return mem;
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
  messages: BaseMessage[];
}> {
  const mem = memoryStore.get(sessionId);
  if (!mem) return { messages: [] };
  return { messages: await mem.getMessages() };
}
