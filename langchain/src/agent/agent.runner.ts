import { HumanMessage } from '@langchain/core/messages';
import { getSessionMemory } from '@must-iq/langchain/memory/session-memory';
import { buildMustIQAgent } from './agent.builder';

export async function runAgent(
    message: string,
    userId: string,
    workspaces: string[],
    sessionId: string,
): Promise<string> {
    const agent = await buildMustIQAgent(sessionId, workspaces);
    const memory = getSessionMemory(sessionId);

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

    await memory.chatHistory.addUserMessage(message);

    return response;
}
