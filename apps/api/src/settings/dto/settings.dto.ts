import { LLMProvider, EmbeddingProvider } from "@must-iq/config";

export class UpdateLLMSettingsDto {
    provider?: LLMProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    embeddingProvider?: EmbeddingProvider;
    embeddingModel?: string;
    embeddingDimensions?: number;
    apiKeys?: Record<LLMProvider, string | undefined>;
    ragEnabled?: boolean;
    topK?: number;
    rerankEnabled?: boolean;
    intentClassificationEnabled?: boolean;
    intentClassificationThreshold?: number;

    // Ingestion Fields
    slackIngestionEnabled?: boolean;
    repoIngestionEnabled?: boolean;
    jiraIngestionEnabled?: boolean;
    slackBotToken?: string;
    githubToken?: string;
    jiraApiToken?: string;
    jiraUserEmail?: string;
    jiraBaseUrl?: string;
    autoCreateProjects?: boolean;
    ollamaBaseUrl?: string;
}
