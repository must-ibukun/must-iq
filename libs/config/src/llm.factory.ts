// ============================================================
// Must-IQ — LLM Factory
// Returns the correct BaseChatModel based on active DB settings
// No hardcoded imports — the active provider drives everything
//
// Usage (anywhere in the codebase):
//   const llm = await createLLM();
//   const embeddings = await createEmbeddings();
// ============================================================

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI, AzureChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { getActiveSettings } from "./settings.service";
import {
  LLMSettings,
  LLMProvider,
  EmbeddingProvider,
  DEFAULT_LLM_SETTINGS,
  APIKeyEntry,
} from "./llm.settings.types";
import { Logger } from "@nestjs/common";
const logger = new Logger("LLMFactory");

// L2 normalization — required for Gemini embeddings at < 3072 dims.
// The API pre-normalizes 3072-dim output only; truncated sizes must be normalized manually
// or cosine similarity scores will be inaccurate (compares magnitude, not direction).
function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

/**
 * Custom extension of GoogleGenerativeAIEmbeddings to support outputDimensionality (Matryoshka Representation Learning).
 * This is needed because the current LangChain wrapper does not expose this parameter,
 * which results in gemini-embedding-2-preview defaulting to 3072 dimensions when the DB expects 768.
 */
class CustomGoogleGenerativeAIEmbeddings extends GoogleGenerativeAIEmbeddings {
  outputDimensionality?: number;

  constructor(fields?: any) {
    super(fields);
    this.outputDimensionality = fields?.outputDimensionality;

    // We need to inject outputDimensionality into the request.
    // Since _convertToContent is private in the base class, we patch it on the instance 
    // to bypass TypeScript's private member override restrictions.
    const self = this as any;
    const originalMethod = self._convertToContent.bind(this);
    self._convertToContent = (text: string) => {
      const content = originalMethod(text);
      return {
        ...content,
        outputDimensionality: this.outputDimensionality,
      };
    };
  }

  private maybeNormalize(v: number[]): number[] {
    // Gemini pre-normalizes 3072-dim output only; all other sizes require manual L2 normalization
    if (!this.outputDimensionality || this.outputDimensionality === 3072) return v;
    return normalizeVector(v);
  }

  // Override to prevent LangChain from swallowing errors or returning empty vectors on failure
  protected async _embedDocumentsContent(documents: string[]): Promise<number[][]> {
    const self = this as any;

    // Simple chunking helper since we can't easily import internal ones
    const chunkArray = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    const batchEmbedChunks = chunkArray(documents, this.maxBatchSize);
    const batchEmbedRequests = batchEmbedChunks.map((chunk) => ({
      requests: chunk.map((doc) => self._convertToContent(doc))
    }));

    try {
      // Use Promise.all instead of Promise.allSettled so the first failure (like 429 or dimension error) throws immediately
      const responses = await Promise.all(
        batchEmbedRequests.map((req) => self.client.batchEmbedContents(req))
      );

      return responses.flatMap((res) => {
        return res.embeddings.map((e: any) => this.maybeNormalize(e.values || []));
      });
    } catch (err: any) {
      logger.error(`Gemini Embedding Error (Direct Batch): ${err.message}`);
      throw err;
    }
  }

  protected async _embedQueryContent(text: string): Promise<number[]> {
    const self = this as any;
    try {
      const req = self._convertToContent(text);
      const res = await self.client.embedContent(req);
      return this.maybeNormalize(res.embedding.values ?? []);
    } catch (err: any) {
      logger.error(`Gemini Embedding Error (Direct Query): ${err.message}`);
      throw err;
    }
  }

  // Embeds text + image together into a single unified vector.
  // Only works with gemini-embedding-2-preview (multimodal embedding model).
  async embedMultimodalQuery(text: string, imageDataUrl: string): Promise<number[]> {
    const self = this as any;
    const commaIdx = imageDataUrl.indexOf(',');
    const mimeType = imageDataUrl.substring(5, imageDataUrl.indexOf(';'));
    const base64Data = imageDataUrl.substring(commaIdx + 1);
    try {
      const textReq = self._convertToContent(text);
      const req = {
        ...textReq,
        content: {
          parts: [
            ...textReq.content.parts,
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      };
      const res = await self.client.embedContent(req);
      return this.maybeNormalize(res.embedding?.values ?? []);
    } catch (err: any) {
      logger.error(`Gemini Multimodal Embedding Error: ${err.message}`);
      throw err;
    }
  }
}
// ---------------------------------------------------------------
// Create the active LLM — driven by settings, not hardcoded
// ---------------------------------------------------------------
export async function createLLM(overrides?: {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}): Promise<BaseChatModel> {
  const settings = await getActiveSettings();

  const temperature = overrides?.temperature ?? settings.temperature;
  const maxTokens = overrides?.maxTokens ?? settings.maxTokens;

  return buildLLM(settings, temperature, maxTokens);
}

// ---------------------------------------------------------------
// Create a cheaper "utility" LLM for tasks like summarization
// Uses the smallest/cheapest model from the active provider
// ---------------------------------------------------------------
export async function createUtilityLLM(): Promise<BaseChatModel> {
  const settings = await getActiveSettings();
  logger.log(`Building Utility LLM for provider: ${settings.provider} (model: ${settings.utilityModel})`);
  const utilitySettings: LLMSettings = {
    ...settings,
    model: settings.utilityModel,
    temperature: 0.1,
    maxTokens: 512,
  };

  return buildLLM(utilitySettings, 0.1, 512);
}

// ---------------------------------------------------------------
// Create the fastest possible classifier LLM
// Attempts to use local Ollama first to save API latency & cost.
// Falls back to the standard Provider Utility LLM if Ollama is down.
// ---------------------------------------------------------------
export async function createFastClassifierLLM(settings: LLMSettings) {
  const utilityLLM = await createUtilityLLM();

  if (settings.provider !== "ollama") {
    return utilityLLM;
  }

  try {
    const localOllama = new ChatOllama({
      model: settings.ollamaClassifierModel || "llama3", // standard small, fast model
      temperature: 0,
      maxRetries: 0, // Fail fast
      baseUrl: settings.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });

    // Use LangChain's native fallback mechanism
    return localOllama.withFallbacks({
      fallbacks: [utilityLLM],
    });
  } catch (err) {
    return utilityLLM;
  }
}

// ---------------------------------------------------------------
// Create the active Embeddings model
// ---------------------------------------------------------------
export async function createEmbeddings(taskType?: string): Promise<Embeddings> {
  const settings = await getActiveSettings();
  // Query path: default to RETRIEVAL_QUERY if caller didn't specify.
  return buildEmbeddings(settings, taskType ?? 'RETRIEVAL_QUERY');
}

export async function createDocumentEmbeddings(): Promise<Embeddings> {
  const settings = await getActiveSettings();
  // Ingestion path: always RETRIEVAL_DOCUMENT so stored vectors use the correct Gemini hint.
  return buildEmbeddings(settings, 'RETRIEVAL_DOCUMENT');
}

/**
 * Embeds text + image into a single vector using gemini-embedding-2-preview's
 * native multimodal capability. Returns null if the active embedding model
 * does not support multimodal input (non-Gemini or older Gemini models).
 */
export async function createMultimodalQueryVector(
  text: string,
  imageDataUrl: string,
  taskType?: string
): Promise<number[] | null> {
  const settings = await getActiveSettings();
  if (settings.embeddingProvider !== 'gemini') return null;
  if (!settings.embeddingModel.includes('embedding-2-preview')) return null;
  const embeddings = await buildEmbeddings(settings, taskType) as CustomGoogleGenerativeAIEmbeddings;
  return embeddings.embedMultimodalQuery(text, imageDataUrl);
}

// ---------------------------------------------------------------
// Internal builders — switched on provider
// ---------------------------------------------------------------
async function buildLLM(
  settings: LLMSettings,
  temperature: number,
  maxTokens: number
): Promise<BaseChatModel> {
  const { provider, apiKeys } = settings;
  const modelName = settings.model;

  const findActiveKey = (p: LLMProvider) => {
    const raw = apiKeys.find(k => k.provider === p && k.isActive)?.key;
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (trimmed.includes("...") || trimmed.includes("••") || trimmed.includes("***")) {
      logger.warn(`Found masked API key for ${p} in DB. Please re-enter the full key in settings.`);
      return undefined;
    }
    return trimmed;
  };

  logger.log(`Building LLM for provider: ${provider} (model: ${modelName})`);


  switch (provider) {
    case "anthropic": {
      const apiKey = findActiveKey("anthropic");
      if (!apiKey) throw new Error("Anthropic API key not found or not active");
      return new ChatAnthropic({
        model: settings.model,
        temperature,
        maxTokens,
        apiKey,
      });
    }

    case "openai": {
      const apiKey = findActiveKey("openai");
      if (!apiKey) throw new Error("OpenAI API key not found or not active");
      return new ChatOpenAI({
        model: settings.model,
        temperature,
        maxTokens,
        apiKey,
      });
    }

    case "gemini": {
      const apiKey = findActiveKey("gemini");
      if (!apiKey) throw new Error("Gemini API key not found or not active (it may be masked in DB)");
      return new ChatGoogleGenerativeAI({
        model: settings.model,
        temperature,
        maxOutputTokens: maxTokens,
        apiKey,
      });
    }

    case "ollama": {
      return new ChatOllama({
        model: settings.model,
        temperature,
        baseUrl: settings.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      });
    }

    case "azure-openai": {
      const apiKey = findActiveKey("azure-openai");
      if (!apiKey) throw new Error("Azure OpenAI API key not found or not active");
      return new AzureChatOpenAI({
        model: settings.model,
        temperature,
        maxTokens,
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
      });
    }

    case "xai": {
      const apiKey = findActiveKey("xai");
      if (!apiKey) throw new Error("xAI API key not found or not active");
      return new ChatOpenAI({
        model: settings.model,
        temperature,
        maxTokens,
        apiKey,
        configuration: {
          baseURL: "https://api.x.ai/v1",
        }
      });
    }

    default:
      throw new Error(`Unknown LLM provider: "${provider}". Check settings in DB or LLM_PROVIDER in .env`);
  }
}

async function buildEmbeddings(settings: LLMSettings, taskType?: string): Promise<Embeddings> {
  const { embeddingProvider, apiKeys, embeddingDimensions } = settings;
  const findActiveKey = (p: LLMProvider) => {
    const raw = apiKeys.find(k => k.provider === p && k.isActive)?.key;
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (trimmed.includes("...") || trimmed.includes("••") || trimmed.includes("***")) {
      logger.warn(`Found masked API key for ${p} in DB. Please re-enter the full key in settings.`);
      return undefined;
    }
    return trimmed;
  };

  logger.log(`Building Embeddings for provider: ${embeddingProvider} (model: ${settings.embeddingModel})`);

  switch (embeddingProvider) {
    case "openai": {
      const apiKey = findActiveKey("openai");
      if (!apiKey) throw new Error("OpenAI API key for embeddings not found or not active");
      return new OpenAIEmbeddings({
        model: settings.embeddingModel,
        apiKey,
        dimensions: embeddingDimensions || 768,
      });
    }

    case "gemini": {
      const apiKey = findActiveKey("gemini");
      if (!apiKey) throw new Error("Gemini API key for embeddings not found or not active (it may be masked in DB)");

      const maskedKey = apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4);
      logger.debug(`Using Gemini Key: ${maskedKey} for embeddings`);

      // Use our custom class to force the dimensions if needed
      return new CustomGoogleGenerativeAIEmbeddings({
        model: settings.embeddingModel,
        apiKey,
        taskType: (taskType ?? "RETRIEVAL_QUERY") as any,
        outputDimensionality: embeddingDimensions || 768,
      });
    }

    case "ollama": {
      return new OllamaEmbeddings({
        model: settings.embeddingModel,
        baseUrl: settings.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      });
    }

    default:
      throw new Error(`Unknown embedding provider: "${embeddingProvider}"`);
  }
}
