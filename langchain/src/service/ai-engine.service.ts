import { buildRAGChain } from "../chains/rag-chain";
import { runAgent } from "../agent/index";
import { getSessionMemory, loadMemoryFromHistory } from "../memory/session-memory";
import { getActiveSettings, createVectorStore, createEmbeddings, createFastClassifierLLM } from "@must-iq/config";
import { AIQueryParams, AIQueryResult } from "@must-iq/shared-types";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { resolveSearchScopes } from "./scope-resolution.helper";

export async function runAIQuery(params: AIQueryParams): Promise<AIQueryResult> {
  // Parallelize metadata resolution and initial settings fetch
  const [settings, workspaces] = await Promise.all([
    getActiveSettings(),
    resolveSearchScopes(params.workspaces || [params.workspace])
  ]);

  if (params.useAgent) {
    const response = await runAgent(
      params.query,
      params.userId,
      workspaces,
      params.sessionId
    );
    return { response, provider: settings.embeddingProvider, model: settings.embeddingModel, sessionId: params.sessionId };
  }

  // --- RAG Path ---
  let sources: any[] = [];
  let context = "";

  if (settings.ragEnabled !== false) {
    try {
      const vectorStore = await createVectorStore();
      const topK = settings.topK ?? 5;

      // Optimization: Dynamic Intent Classification
      let taskType: string | undefined = undefined;
      const threshold = settings.intentClassificationThreshold ?? 15;
      const shouldClassify = settings.intentClassificationEnabled !== false && params.query.length > threshold;
      const classifierPrompt = settings.intentClassificationPrompt || "Classify as 'GENERAL' or 'CODE'. Output one word.";


      if (shouldClassify) {
        const classifier = await createFastClassifierLLM(settings);
        const classificationResult = await classifier.invoke([
          new SystemMessage(classifierPrompt),
          new HumanMessage(params.query)
        ]);

        const label = (classificationResult.content as string).toUpperCase().trim();
        console.log(`Classifier Output: "${label}"`);

        // Dynamic mapping via intentMap (JSON string)
        try {
          const map = JSON.parse(settings.intentMap || '{}');
          // Find the value in the map that matches the output label
          const mappedType = Object.entries(map).find(([key]) => label.includes(key.toUpperCase()))?.[1];
          taskType = mappedType as string | undefined;
        } catch (e) {
          console.log(`Failed to parse intentMap: ${e.message}. Falling back to default.`);
          taskType = label.includes('CODE') ? 'CODE_RETRIEVAL_QUERY' : 'RETRIEVAL_QUERY';
        }
      }
      console.log(`Final Task type: ${taskType || 'default'}`);
      const embeddings = await createEmbeddings(taskType);
      const queryVector = await embeddings.embedQuery(params.query);

      // Perform retrieval using the specific queryVector (respects taskType)

      const docsWithScores = await vectorStore.similaritySearchVectorWithScore(
        queryVector,
        topK,
        { workspace: { in: workspaces } }
      );

      if (docsWithScores.length > 0) {
        context = docsWithScores.map(([d], i) => `[${i + 1}] (${d.metadata?.source || 'unknown'})\n${d.pageContent}`).join("\n\n");
        sources = docsWithScores.map(([d, score]) => {
          const sourceStr = typeof d.metadata?.source === 'string' ? d.metadata.source : '';
          const idStr = typeof d.metadata?.id === 'string' ? d.metadata.id : 'unknown';
          let sType = 'kb';
          if (sourceStr.toLowerCase().includes('.md') || sourceStr.toLowerCase().includes('doc')) sType = 'doc';
          if (idStr.toLowerCase().includes('jira') || sourceStr.toLowerCase().includes('jira')) sType = 'jira';
          if (idStr.toLowerCase().includes('slack') || sourceStr.toLowerCase().includes('slack')) sType = 'slack';

          return {
            chunkId: idStr,
            source: sourceStr,
            title: sourceStr ? sourceStr.split('/').pop() || 'Document' : 'Document',
            sourceType: sType,
            score,
            content: d.pageContent,
            meta: `Workspace: ${d.metadata?.workspace || 'general'}`
          };
        });
      }
    } catch (err) {
      console.warn(`RAG retrieval failed in unified engine: ${err.message}`);
    }
  }

  const chain = await buildRAGChain(workspaces);

  if (params.history.length > 0) {
    await loadMemoryFromHistory(params.sessionId, params.history);
  }

  const memory = await getSessionMemory(params.sessionId);
  const vars = await memory.loadMemoryVariables({});

  if (params.stream && params.onChunk) {
    let fullText = "";
    for await (const chunk of await chain.stream({
      question: params.query,
      chat_history: vars.chat_history ?? [],
      context: context
    } as any)) {
      fullText += chunk;
      params.onChunk(chunk);
    }
    await memory.saveContext({ question: params.query }, { answer: fullText });
    return { response: fullText, provider: settings.embeddingProvider, model: settings.embeddingModel, sessionId: params.sessionId, sources };
  }

  const response = await chain.invoke({
    question: params.query,
    chat_history: vars.chat_history ?? [],
    context: context
  } as any);

  await memory.saveContext({ question: params.query }, { answer: response });

  return { response, provider: settings.embeddingProvider, model: settings.embeddingModel, sessionId: params.sessionId, sources };
}
