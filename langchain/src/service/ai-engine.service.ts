import { buildRAGChain } from "../chains/rag-chain";
import { runAgent } from "../agent/index";
import { getSessionMemory, loadMemoryFromHistory } from "../memory/session-memory";
import { getActiveSettings, createEmbeddings, createFastClassifierLLM, createUtilityLLM } from "@must-iq/config";
import { AIQueryParams, AIQueryResult } from "@must-iq/shared-types";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { retrieveChunks } from "@must-iq/db";

import { DOMAIN_CLASSIFIER_PROMPT, DOMAIN_TO_TASK_TYPE } from "../prompts/must-iq-classifier.prompt";
import * as fs from "fs";
import * as path from "path";

export async function runAIQuery(params: AIQueryParams): Promise<AIQueryResult> {
  let localDeletePath: string | null = null;
  try {
    if (params.image && params.image.includes('/chat/uploads/')) {
      const filename = params.image.split('/').pop();
      if (filename) {
        localDeletePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(localDeletePath)) {
          const ext = path.extname(filename).toLowerCase().replace('.', '');
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          params.image = `data:${mimeType};base64,${fs.readFileSync(localDeletePath).toString('base64')}`;
        }
      }
    }
    // Workspaces arrive pre-resolved from the frontend (identifiers, not team IDs)
    // No DB lookup needed — the chat page derives them from its availableTeams store.
    const workspaces = [
      ...new Set([...(params.workspaces || [params.workspace]), 'general', 'vault-v2'].filter(Boolean))
    ] as string[];

    const settings = await getActiveSettings();

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
    let taskType: string | undefined = undefined;

    if (settings.ragEnabled !== false) {
      try {
        // ── Optimization: Single Domain Classifier ─────────────────────
        // One fast LLM call determines both:
        //   1. domain → which RAG prompt template to use
        //   2. taskType → which embedding model to use (via static DOMAIN_TO_TASK_TYPE)
        const threshold = settings.intentClassificationThreshold ?? 15;
        const shouldClassify = settings.intentClassificationEnabled !== false && params.query.length > threshold;

        if (shouldClassify) {
          const classifier = await createFastClassifierLLM(settings);
          const domainResult = await classifier.invoke([
            new SystemMessage(DOMAIN_CLASSIFIER_PROMPT),
            new HumanMessage(params.query)
          ]);

          const domain = (domainResult.content as string).toLowerCase().trim();
          console.log(`Domain Classifier Output: "${domain}"`);

          // Store domain for prompt selection in buildRAGChain
          (params as any)._domain = domain;

          // Derive taskType from static map — no intentMap JSON parsing needed
          taskType = DOMAIN_TO_TASK_TYPE[domain] ?? 'RETRIEVAL_QUERY';
        }
        console.log(`Final Task type: ${taskType || 'default'}`);

        // ── Step 2: OCR/Vision Extraction (If Image Present) ─────────────
        let extractedText = "";
        if (params.image) {
          console.log("Image payload detected. Extracting UI text for RAG retrieval...");
          try {
            const visionModel = await createUtilityLLM(); // The active utility model (e.g. gpt-4o-mini or gemini-flash)
            const msg = new HumanMessage({
              content: [
                { type: "text", text: "Extract any visible text, labels, button names, menus, or variable data from this image. Output only the raw text you find." },
                { type: "image_url", image_url: { url: params.image } }
              ]
            });
            const result = await visionModel.invoke([msg]);
            extractedText = result.content as string;
            console.log(`OCR Extracted Text: ${extractedText.substring(0, 100)}...`);
          } catch (e: any) {
            console.error("OCR Extraction failed:", e.message);
          }
        }

        // ── Embed query → retrieve via Prisma (no second pg-pool) ────────
        // retrieveChunks uses the shared Prisma client, avoiding the
        // MaxClientsInSessionMode error caused by LangChain's own pg-pool.
        const embeddings = await createEmbeddings(taskType);

        const finalQueryForSearch = params.image && extractedText
          ? `${params.query}\n\nVisible Screen Elements:\n${extractedText}`
          : params.query;

        const queryVector = await embeddings.embedQuery(finalQueryForSearch);
        console.log(`Query Vector: ${queryVector}`);
        const topK = settings.topK ?? 5;

        const chunks = await retrieveChunks(queryVector, workspaces, topK);

        if (chunks.length > 0) {
          context = chunks
            .map((d, i) => {
              const layerLabel = d.layer ? `[Layer: ${d.layer}] ` : '';
              const langLabel = d.language && d.language !== 'text' ? `[Lang: ${d.language}] ` : '';
              const stackLabel = d.techStack ? `[Stack: ${d.techStack}] ` : '';
              return `[${i + 1}] ${layerLabel}${langLabel}${stackLabel}(${d.source || 'unknown'})\n${d.content}`;
            })
            .join("\n\n");

          sources = chunks.map((d) => {
            const sourceStr = d.source || '';
            const idStr = d.id || 'unknown';
            let sType = 'kb';
            if (sourceStr.toLowerCase().includes('.md') || sourceStr.toLowerCase().includes('doc')) sType = 'doc';
            if (idStr.toLowerCase().includes('jira') || sourceStr.toLowerCase().includes('jira')) sType = 'jira';
            if (idStr.toLowerCase().includes('slack') || sourceStr.toLowerCase().includes('slack')) sType = 'slack';

            return {
              chunkId: idStr,
              source: sourceStr,
              title: sourceStr ? sourceStr.split('/').pop() || 'Document' : 'Document',
              sourceType: sType,
              score: d.score,
              content: d.content,
              meta: `Workspace: ${d.workspace || 'general'}`
            };
          });
        }
      } catch (err) {
        console.warn(`RAG retrieval failed in unified engine: ${err.message}`);
      }
    }

    const chain = await buildRAGChain(workspaces, taskType, (params as any)._domain);

    if (params.history.length > 0) {
      await loadMemoryFromHistory(params.sessionId, params.history);
    }

    const memory = getSessionMemory(params.sessionId);
    const chatMessages = await memory.getMessages();

    // ── Ensure compatibility with Google GenAI (no stray SystemMessages) ──
    // Map any SystemMessage to HumanMessage so the adapter's validation passes.
    const safeChatHistory = chatMessages.map((msg: any) => {
      if (typeof msg._getType === 'function' && msg._getType() === "system") {
        return new HumanMessage(`[Conversation Summary]:\n${msg.content}`);
      }
      return msg;
    });

    if (params.stream && params.onChunk) {
      let fullText = "";
      for await (const chunk of await chain.stream({
        question: params.query,
        chat_history: safeChatHistory,
        context: context,
        image: params.image
      } as any)) {
        fullText += chunk;
        params.onChunk(chunk);
      }
      await memory.addUserMessage(params.query);
      await memory.addAIMessage(fullText);
      return { response: fullText, provider: settings.embeddingProvider, model: settings.embeddingModel, sessionId: params.sessionId, sources };
    }

    const response = await chain.invoke({
      question: params.query,
      chat_history: safeChatHistory,
      context: context,
      image: params.image
    } as any);

    await memory.addUserMessage(params.query);
    await memory.addAIMessage(response);

    return { response, provider: settings.embeddingProvider, model: settings.embeddingModel, sessionId: params.sessionId, sources };
  } finally {
    if (localDeletePath && fs.existsSync(localDeletePath)) {
      try {
        fs.unlinkSync(localDeletePath);
        console.log(`Wiped temp image: ${localDeletePath}`);
      } catch (e: any) {
        console.error(`Failed to wipe temp image:`, e.message);
      }
    }
  }
}
