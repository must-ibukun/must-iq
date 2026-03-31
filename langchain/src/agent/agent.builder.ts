import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createLLM } from '@must-iq/config/llm.factory';
import { getActiveSettings } from '@must-iq/config/settings.service';
import { ALL_TOOLS } from '@must-iq/langchain/tools/internal-tools';
import { MUST_IQ_ASSISTANT_SYSTEM_PROMPT } from '../prompts/must-iq-assistance.prompt';

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
