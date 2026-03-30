import { buildRAGChain } from "../chains/rag-chain";
import { runAgent } from "../agent/index";
import { getSessionMemory, loadMemoryFromHistory } from "../memory/session-memory";
import { getActiveSettings, createEmbeddings, createUtilityLLM, createMultimodalQueryVector } from "@must-iq/config";
import { AIQueryParams, AIQueryResult } from "@must-iq/shared-types";
import { HumanMessage } from "@langchain/core/messages";
import { retrieveChunks, retrieveChunksKeyword, reciprocalRankFusion, DocumentChunk } from "@must-iq/db";
import { generateHypotheticalDocument } from "../rag/hyde";
import { buildContext } from "../utils/context-builder";

import { DOMAIN_TO_TASK_TYPE } from "../prompts/must-iq-classifier.prompt";
import { extractIntent, ExtractedIntent } from "../intent/intent-extractor";
import { rerank } from "../rag/reranker";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "@nestjs/common";

const logger = new Logger("AIEngine");

// Structured ticket tags from Jira/Slack templates — detected via string match,
// no LLM call needed. Presence means the query is always an operational request.
export const TICKET_TAG_MARKERS = ['[Requester]', '[Department]', '[Expected Result]', '[Description]', '[Due Date]', '[Assigned to]', '[Solution]'];

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
          const data = await fs.promises.readFile(localDeletePath);
          params.image = `data:${mimeType};base64,${data.toString('base64')}`;
        }
      }
    }
    // Workspaces arrive pre-resolved from the frontend (identifiers, not team IDs)
    // No DB lookup needed — the chat page derives them from its availableTeams store.
    const workspaces = [
      ...new Set([...(params.workspaces || [params.workspace])].filter(Boolean))
    ] as string[];
    if (params.useAgent) {
      const agentSettings = await getActiveSettings();
      const response = await runAgent(
        params.query,
        params.userId,
        workspaces,
        params.sessionId
      );
      return { response, provider: agentSettings.embeddingProvider, model: agentSettings.embeddingModel, sessionId: params.sessionId };
    }

    const settings = await getActiveSettings();

    // --- RAG Path ---
    let sources: any[] = [];
    let context = "";
    let taskType: string | undefined = undefined;

    if (settings.ragEnabled !== false) {
      try {
        // ── Step 0: Ticket-tag short-circuit (no LLM cost) ────────────────
        // Structured Jira/Slack ticket templates always signal an operational request.
        // A regex-free string check is 100% reliable and skips the classifier LLM call.
        const hasTicketTags = TICKET_TAG_MARKERS.some((tag) => params.query.includes(tag));
        if (hasTicketTags) {
          (params as any)._domain = 'operations';
          taskType = 'RETRIEVAL_QUERY';
          logger.log('Domain Classifier: ticket tags detected → operations (short-circuit)');
        }

        // ── Intent Extraction (replaces single-word domain classifier) ──
        // One fast LLM call now produces:
        //   1. domain       → RAG prompt template + embedding task type
        //   2. issue_type   → informs reranker what answer shape to prefer
        //   3. resources    → keyword boost terms fed to BM25 sparse retrieval
        //   4. actors       → who is involved
        //   5. enriched_query → technical rewrite embedded instead of raw query,
        //                       closing the gap between casual language and code vocabulary
        //
        // Example: "CS team needs inquiry access"
        //   → enriched: "grant CS team inquiry.show inquiry.create permissions
        //                MSQ Admin platform users roleValidationMiddleware permissionKeys"
        const threshold = settings.intentClassificationThreshold ?? 15;
        const shouldClassify = !hasTicketTags && settings.intentClassificationEnabled !== false && params.query.length > threshold;

        let extractedIntent: ExtractedIntent | undefined;

        if (shouldClassify) {
          extractedIntent = await extractIntent(params.query, settings);

          // Store domain on params for buildRAGChain prompt selection
          (params as any)._domain = extractedIntent.domain;
          (params as any)._intent = extractedIntent;

          taskType = DOMAIN_TO_TASK_TYPE[extractedIntent.domain] ?? 'RETRIEVAL_QUERY';
        }

        // ── Step 2: Image Handling ────────────────────────────────────────
        // gemini-embedding-2-preview embeds image + text natively in one vector — no OCR needed.
        // For all other providers/models, fall back to OCR → extracted text appended to query.
        const useMultimodalEmbed = !!(params.image &&
          settings.embeddingProvider === 'gemini' &&
          settings.embeddingModel === 'gemini-embedding-2-preview');

        let extractedText = "";
        if (params.image && !useMultimodalEmbed) {
          logger.log("Image payload detected. Extracting UI text for RAG retrieval...");
          try {
            const visionModel = await createUtilityLLM();
            const msg = new HumanMessage({
              content: [
                { type: "text", text: "Extract any visible text, labels, button names, menus, or variable data from this image. Output only the raw text you find." },
                { type: "image_url", image_url: { url: params.image } }
              ]
            });
            const result = await visionModel.invoke([msg]);
            extractedText = result.content as string;
            logger.log(`OCR extracted text: ${extractedText.substring(0, 100)}...`);
          } catch (e: any) {
            logger.error(`OCR extraction failed: ${e.message}`);
          }
        } else if (useMultimodalEmbed) {
          logger.log("Image payload detected. Using native multimodal embedding (gemini-embedding-2-preview)...");
        }

        // ── Embed query → retrieve via Prisma (no second pg-pool) ────────
        // retrieveChunks uses the shared Prisma client, avoiding the
        // MaxClientsInSessionMode error caused by LangChain's own pg-pool.
        const embeddings = await createEmbeddings(taskType);

        // ── Build search queries from extracted intent ─────────────────
        // enrichedQuery: used for dense embedding + reranking.
        //   Prefers intent.enriched_query (technical rewrite) over raw query.
        //   Falls back to raw query when intent extraction was skipped or failed.
        //
        // bm25Query: used for BM25 sparse retrieval.
        //   Appends resource keywords from intent to the enriched query so that
        //   exact technical terms (e.g. "inquiry", "roleValidationMiddleware")
        //   get strong BM25 hits even if phrased differently in enriched_query.
        const enrichedQuery = extractedIntent?.enriched_query ?? params.query;
        const bm25ResourceBoost = extractedIntent?.resources?.length
          ? ` ${extractedIntent.resources.join(' ')}`
          : '';


        const finalQueryForSearch = params.image && extractedText
          ? `${enrichedQuery}\n\nVisible Screen Elements:\n${extractedText}`
          : enrichedQuery;

        const bm25Query = `${finalQueryForSearch}${bm25ResourceBoost}`;
        // ── HyDE: Hypothetical Document Embedding ─────────────────────
        // If enabled, generate a synthetic code/doc snippet that "looks like"
        // the answer — then embed THAT instead of the enriched query.
        // HyDE runs on top of the already-enriched query for maximum specificity.
        let queryText = finalQueryForSearch;
        if (settings.hydeEnabled) {
          logger.log(`HyDE: generating hypothetical document for query...`);
          queryText = await generateHypotheticalDocument(finalQueryForSearch, taskType);
          logger.log(`HyDE: using hypothetical document (${queryText.length} chars) for embedding.`);
        }

        let queryVector: number[];
        if (useMultimodalEmbed) {
          const vec = await createMultimodalQueryVector(queryText, params.image!, taskType);
          queryVector = vec ?? await embeddings.embedQuery(queryText);
        } else {
          queryVector = await embeddings.embedQuery("queryText");
        }

        // ── Stage 1: Broad Retrieval ─────────────────────────
        // If hybridSearchEnabled: run dense (pgvector) + sparse (BM25) in parallel
        // and merge via Reciprocal Rank Fusion (K=60).
        // Otherwise: pure dense search only.
        // topK=60 feeds the reranker pool; reranker narrows to top-20 for context.
        const topK = settings.topK ?? 60;

        let chunks: DocumentChunk[];
        if (settings.hybridSearchEnabled) {
          logger.log(`Hybrid search: running dense + BM25 in parallel (topK=${topK})...`);
          logger.log(`Hybrid search: BM25 query="${bm25Query.substring(0, 120)}"`);
          const [denseChunks, keywordChunks] = await Promise.all([
            retrieveChunks(queryVector, workspaces, topK),
            retrieveChunksKeyword(bm25Query, workspaces, topK),
          ]);
          logger.log(`Hybrid search: dense=${denseChunks.length}, BM25=${keywordChunks.length}. Merging via RRF...`);
          chunks = reciprocalRankFusion(denseChunks, keywordChunks);
          logger.log(`Hybrid search: merged pool = ${chunks.length} unique chunks.`);
        } else {
          chunks = await retrieveChunks(queryVector, workspaces, topK);
          logger.log(`Stage 1: retrieved ${chunks.length} chunks (topK=${topK})`);
        }

        // ── Stage 2: Cross-Encoder Rerank ─────────────────────────────
        // Reranks the broad pool with ms-marco-MiniLM-L-6-v2 (local ONNX, ~90 MB).
        // Reranks against finalQueryForSearch (enriched) not the raw query,
        // so the cross-encoder scores relevance against technical vocabulary.
        if (chunks.length > 0 && settings.rerankEnabled !== false) {
          const before = chunks.length;
          chunks = await rerank(finalQueryForSearch, chunks, settings.rerankTopN ?? 50);
          logger.log(`Reranker: ${before} → ${chunks.length} chunks after cross-encoder.`);
        }

        if (chunks.length > 0) {
          context = await buildContext(chunks, settings.contextTokenBudget ?? undefined);

          if (params.includeSources !== false) {
            sources = chunks.map((d) => {
              const sourceStr = d.source || '';
              const idStr = d.id || 'unknown';
              let sType = 'kb';
              if (sourceStr.toLowerCase().includes('.md') || sourceStr.toLowerCase().includes('doc')) sType = 'doc';
              if (idStr.toLowerCase().includes('jira') || sourceStr.toLowerCase().includes('jira')) sType = 'jira';
              if (idStr.toLowerCase().includes('slack') || sourceStr.toLowerCase().includes('slack')) sType = 'slack';
              if (idStr.toLowerCase().includes('github') || sourceStr.toLowerCase().includes('github')) sType = 'github';

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
        }
      } catch (err) {
        logger.warn(`RAG retrieval failed: ${err.message}`);
      }
    }

    const chain = await buildRAGChain(workspaces, taskType, (params as any)._domain, (params as any)._intent?.issue_type);

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

    // Use enriched query for the LLM so it stays coherent with the retrieved context.
    // Fall back to raw query if intent extraction was skipped (short queries, ticket tags).
    const llmQuestion = (params as any)._intent?.enriched_query ?? params.query;

    if (params.stream && params.onChunk) {
      let fullText = "";
      for await (const chunk of await chain.stream({
        question: llmQuestion,
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
      question: llmQuestion,
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
        logger.log(`Wiped temp image: ${localDeletePath}`);
      } catch (e: any) {
        logger.error(`Failed to wipe temp image: ${e.message}`);
      }
    }
  }
}
