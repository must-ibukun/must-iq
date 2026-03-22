// ============================================================
// Must-IQ Conversational Chain — with Memory (LCEL-based)
// Active LLM + summary model both read from settings
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createLLM } from "@must-iq/config/llm.factory";
import { getSessionMemory } from "@must-iq/langchain/memory/session-memory";
import { MUST_IQ_CONVERSATIONAL_PROMPT } from "@must-iq/langchain/prompts/must-iq-conversational.prompt";

const BASE_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", MUST_IQ_CONVERSATIONAL_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

// ---------------------------------------------------------------
// Build a conversation chain for a specific session using LCEL.
// ConversationChain was removed in LangChain v0.3 — we now compose
// the chain explicitly and wrap it with RunnableWithMessageHistory.
// ---------------------------------------------------------------
export async function buildConversationalChain(sessionId: string) {
  const llm = await createLLM();

  // LCEL pipe: prompt → LLM → string
  const chain = BASE_PROMPT.pipe(llm).pipe(new StringOutputParser());

  return new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sid) => getSessionMemory(sid),
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });
}
