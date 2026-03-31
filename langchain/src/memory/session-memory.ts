import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// In-process store: sessionId → message history instance
// In production, swap for a Redis-backed message history store
const memoryStore = new Map<string, InMemoryChatMessageHistory>();

export function getSessionMemory(sessionId: string): InMemoryChatMessageHistory {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, new InMemoryChatMessageHistory());
  }
  return memoryStore.get(sessionId)!;
}

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

export function clearSessionMemory(sessionId: string): void {
  memoryStore.delete(sessionId);
}

export async function getMemorySnapshot(sessionId: string): Promise<{
  messages: BaseMessage[];
}> {
  const mem = memoryStore.get(sessionId);
  if (!mem) return { messages: [] };
  return { messages: await mem.getMessages() };
}
