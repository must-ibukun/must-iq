// ============================================================
// Must-IQ — LLM Settings Types
// @must-iq/config
// The active model is controlled from a settings table in DB,
// not hardcoded imports. Admins change it from the UI.
// ============================================================

export type LLMProvider = "anthropic" | "openai" | "gemini" | "ollama" | "azure-openai" | "xai";
export type EmbeddingProvider = "openai" | "gemini" | "ollama";
export type VectorProvider = "pgvector" | "weaviate";

export interface APIKeyEntry {
  id: string;
  provider: LLMProvider;
  label: string;
  model: string;
  key: string;
  isActive: boolean;
}

// ---------------------------------------------------------------
// Shape stored in the `settings` table (one row, id = "llm")
// and also readable from .env as fallback
// ---------------------------------------------------------------
export interface LLMSettings {
  provider: LLMProvider;
  model: string;
  utilityModel: string; // The "cheaper" model for background tasks like classification
  temperature: number;       // 0.0 – 1.0
  maxTokens: number;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingDimensions: number; // MUST match vector(N) in schema.prisma
  vectorProvider: VectorProvider;
  vectorIndex: string;         // tableName for pgvector, className for weaviate
  streamingEnabled: boolean;
  // API keys stored securely in the database (encrypted) or fallen back to env
  apiKeys: APIKeyEntry[];
  ragEnabled?: boolean;
  topK?: number;

  // Ingestion Settings (Pull Mode)
  slackIngestionEnabled: boolean;
  repoIngestionEnabled: boolean;
  jiraIngestionEnabled: boolean;
  agenticReasoningEnabled: boolean;
  slackBotToken?: string;
  githubToken?: string;
  jiraApiToken?: string;
  jiraUserEmail?: string;
  jiraBaseUrl?: string;
  ollamaBaseUrl?: string;
  ollamaClassifierModel?: string; // e.g. 'llama3' or 'gemma:2b'
  autoCreateTeams?: boolean;

  // Intent Classification Settings
  intentClassificationEnabled?: boolean;
  intentClassificationThreshold?: number;
  
  // Cache Settings
  cacheL1Ttl?: number; // In-memory TTL (ms)
  cacheL2Ttl?: number; // Redis TTL (seconds)
  cacheL2Key?: string; // Redis key
}

// ---------------------------------------------------------------
// Supported models per provider (used by settings UI dropdown)
// ---------------------------------------------------------------
export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
  ],
  gemini: [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
  ],
  ollama: [
    "llama3",
    "llama3:70b",
    "gemma3:4b",
    "gemma3:27b",
    "mistral",
    "mixtral",
    "phi3",
  ],
  "azure-openai": [
    "gpt-4o",
    "gpt-4-turbo",
  ],
  xai: [
    "grok-3-mini",
    "grok-beta",
  ],
};

export const EMBEDDING_MODELS: Record<EmbeddingProvider, { model: string; dimensions: number }[]> = {
  openai: [
    { model: "text-embedding-3-small", dimensions: 1536 },
    { model: "text-embedding-3-large", dimensions: 3072 },
  ],
  gemini: [
    { model: "gemini-embedding-001", dimensions: 768 },
    { model: "gemini-embedding-2-preview", dimensions: 768 },
  ],
  ollama: [
    { model: "nomic-embed-text", dimensions: 768 },
    { model: "mxbai-embed-large", dimensions: 1024 },
    { model: "llama3", dimensions: 4096 },
  ],
};

// ---------------------------------------------------------------
// Default settings (used when no DB row exists yet)
// ---------------------------------------------------------------
export const DEFAULT_LLM_SETTINGS: Omit<LLMSettings, "apiKeys"> = {
  provider: (process.env.LLM_PROVIDER as LLMProvider) ?? "gemini",
  model: process.env.LLM_MODEL ?? "gemini-1.5-flash",
  utilityModel: process.env.LLM_UTILITY_MODEL ?? "gemini-1.5-flash",
  temperature: parseFloat(process.env.LLM_TEMPERATURE ?? "0.3"),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? "2048"),
  embeddingProvider: (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) ?? "gemini",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "gemini-embedding-2-preview",
  embeddingDimensions: parseInt(process.env.VECTOR_DIMENSIONS ?? "768"),
  vectorProvider: (process.env.VECTOR_PROVIDER as VectorProvider) ?? "pgvector",
  vectorIndex: process.env.VECTOR_INDEX ?? "document_chunks",
  streamingEnabled: true,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaClassifierModel: process.env.OLLAMA_CLASSIFIER_MODEL ?? "llama3",

  // Default Ingestion Settings
  slackIngestionEnabled: process.env.SLACK_INGESTION_ENABLED === "true",
  repoIngestionEnabled: process.env.REPO_INGESTION_ENABLED === "true",
  jiraIngestionEnabled: process.env.JIRA_INGESTION_ENABLED === "true",
  agenticReasoningEnabled: process.env.AGENTIC_REASONING_ENABLED === "true",
  autoCreateTeams: process.env.AUTO_CREATE_PROJECTS === "true",

  // Default Intent Classification
  intentClassificationEnabled: true,
  intentClassificationThreshold: 15,

  // Cache Defaults
  cacheL1Ttl: parseInt(process.env.CACHE_L1_TTL ?? "60000"),
  cacheL2Ttl: parseInt(process.env.CACHE_L2_TTL ?? "600"),
  cacheL2Key: process.env.CACHE_L2_KEY ?? "must-iq:settings:llm",
};
