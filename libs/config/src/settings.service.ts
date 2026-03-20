// ============================================================
// Must-IQ — Settings Service
// Reads active LLM config from the `settings` table in Postgres
// Falls back to .env if no DB row exists
// Cached in memory (TTL: 60s) — avoids a DB hit on every request
// ============================================================

import { PrismaClient } from "@prisma/client";
import {
  LLMSettings,
  LLMProvider,
  EmbeddingProvider,
  DEFAULT_LLM_SETTINGS,
  APIKeyEntry,
} from "./llm.settings.types";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "./system.settings.types";
import { Logger } from "@nestjs/common";
import { tryDecrypt, encryptText } from "./helpers/crypto.helper";

const logger = new Logger('SettingsService');

const prisma = new PrismaClient();

// In-memory cache so every chat message doesn't hit the DB
let cachedSettings: LLMSettings | null = null;

// ---------------------------------------------------------------
// Get active LLM settings (DB → cache → .env fallback)
// ---------------------------------------------------------------
export async function getActiveSettings(): Promise<LLMSettings> {
  // Return cached value if it exists
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    // Load from DB settings table
    const row = await prisma.setting.findUnique({ where: { key: "llm" } });

    const stored = row ? (JSON.parse(row.value) as Partial<LLMSettings>) : {};

    // Decrypt API keys if they exist in DB
    const dbApiKeys: APIKeyEntry[] = [];
    if (Array.isArray(stored.apiKeys)) {
      for (const entry of stored.apiKeys) {
        if (entry.key) {
          dbApiKeys.push({ ...entry, key: tryDecrypt(entry.key) });
        } else {
          dbApiKeys.push(entry);
        }
      }
    }

    // Decrypt ingestion tokens if they exist
    const slackBotToken = stored.slackBotToken ? tryDecrypt(stored.slackBotToken) : undefined;
    const githubToken = stored.githubToken ? tryDecrypt(stored.githubToken) : undefined;
    const jiraApiToken = stored.jiraApiToken ? tryDecrypt(stored.jiraApiToken) : undefined;
    const jiraUserEmail = stored.jiraUserEmail ? tryDecrypt(stored.jiraUserEmail) : undefined;
    const jiraBaseUrl = stored.jiraBaseUrl ? tryDecrypt(stored.jiraBaseUrl) : undefined;

    // Merge logic: If DB has no keys, populate from ENV as defaults
    if (dbApiKeys.length === 0) {
      const providers: LLMProvider[] = ["anthropic", "openai", "gemini", "azure-openai"];
      providers.forEach(p => {
        const envKey = process.env[`${p.toUpperCase().replace("-", "_")}_API_KEY`];
        if (envKey) {
          dbApiKeys.push({
            id: `env-${p}`,
            provider: p,
            label: "Environment Default",
            model: "unknown",
            key: envKey,
            isActive: stored.provider === p || (!stored.provider && p === "anthropic")
          });
        }
      });
    }

    const settings: LLMSettings = {
      ...DEFAULT_LLM_SETTINGS,
      ...stored,
      apiKeys: dbApiKeys,
      slackBotToken: slackBotToken || process.env.SLACK_BOT_TOKEN,
      githubToken: githubToken || process.env.GITHUB_TOKEN,
      jiraApiToken: jiraApiToken || process.env.JIRA_API_TOKEN,
      jiraUserEmail: jiraUserEmail || process.env.JIRA_USER_EMAIL,
      jiraBaseUrl: jiraBaseUrl || process.env.JIRA_BASE_URL,
    } as LLMSettings;

    cachedSettings = settings;
    return settings;
  } catch (err) {
    logger.error("Error in getActiveSettings:", err);
    // If DB is unavailable, fall back to env-only settings
    const envApiKeys: APIKeyEntry[] = [];
    const providers: LLMProvider[] = ["anthropic", "openai", "gemini", "azure-openai"];
    providers.forEach(p => {
      const envKey = process.env[`${p.toUpperCase().replace("-", "_")}_API_KEY`];
      if (envKey) {
        envApiKeys.push({
          id: `env-${p}`,
          provider: p,
          label: "Environment Default",
          model: "unknown",
          key: envKey,
          isActive: p === (process.env.LLM_PROVIDER as LLMProvider || "anthropic")
        });
      }
    });

    return {
      ...DEFAULT_LLM_SETTINGS,
      apiKeys: envApiKeys,
    } as LLMSettings;
  }
}

// ---------------------------------------------------------------
// Save active settings to DB (called from admin settings UI)
// Invalidates the cache immediately so next request picks up change
// ---------------------------------------------------------------
export async function saveActiveSettings(
  patch: Partial<LLMSettings>
): Promise<void> {
  const current = await getActiveSettings();
  const updated = { ...current, ...patch };

  // Encrypt ingestion tokens
  let encryptedSlackToken = updated.slackBotToken;
  let encryptedGithubToken = updated.githubToken;
  let encryptedJiraToken = updated.jiraApiToken;
  let encryptedJiraEmail = updated.jiraUserEmail;
  let encryptedJiraBaseUrl = updated.jiraBaseUrl;

  if (updated.slackBotToken) {
    encryptedSlackToken = encryptText(updated.slackBotToken);
  }
  if (updated.githubToken) {
    encryptedGithubToken = encryptText(updated.githubToken);
  }
  if (updated.jiraApiToken) {
    encryptedJiraToken = encryptText(updated.jiraApiToken);
  }
  if (updated.jiraUserEmail) {
    encryptedJiraEmail = encryptText(updated.jiraUserEmail);
  }
  if (updated.jiraBaseUrl) {
    encryptedJiraBaseUrl = encryptText(updated.jiraBaseUrl);
  }

  // Encrypt API keys before storing
  const encryptedApiKeys: APIKeyEntry[] = [];
  if (Array.isArray(updated.apiKeys)) {
    for (const entry of updated.apiKeys) {
      if (entry.key) {
        // Did the frontend send us a masked key (e.g., "sk-abc...1234" or "AI...••••••4")?
        if (entry.key.includes("...") || entry.key.includes("•") || entry.key.includes("*")) {
          // If so, retrieve the real, unmasked key from the current config so we don't overwrite it with mask
          const existingKey = current.apiKeys.find(k => k.id === entry.id);
          if (existingKey && existingKey.key) {
            encryptedApiKeys.push({
              ...entry,
              key: encryptText(existingKey.key)
            });
          }
        } else {
          // It's a brand new plain-text key submitted by the user
          encryptedApiKeys.push({
            ...entry,
            key: encryptText(entry.key)
          });
        }
      }
    }
  }

  const safeToStore = {
    ...updated,
    apiKeys: encryptedApiKeys,
    slackBotToken: encryptedSlackToken,
    githubToken: encryptedGithubToken,
    jiraApiToken: encryptedJiraToken,
    jiraUserEmail: encryptedJiraEmail,
    jiraBaseUrl: encryptedJiraBaseUrl,
  };

  await prisma.setting.upsert({
    where: { key: "llm" },
    update: { value: JSON.stringify(safeToStore) },
    create: { key: "llm", value: JSON.stringify(safeToStore) },
  });

  // Update cache immediately to avoid DB hit on next request
  cachedSettings = updated;
}

// ---------------------------------------------------------------
// SYSTEM SETTINGS
// ---------------------------------------------------------------
let cachedSystemSettings: SystemSettings | null = null;

export async function getSystemSettings(): Promise<SystemSettings> {
  if (cachedSystemSettings) {
    return cachedSystemSettings;
  }

  try {
    const row = await prisma.setting.findUnique({ where: { key: "system" } });
    if (row) {
      const stored = JSON.parse(row.value) as Partial<SystemSettings>;
      const settings = { ...DEFAULT_SYSTEM_SETTINGS, ...stored };
      cachedSystemSettings = settings;
      return settings;
    }
  } catch (err) {
    logger.error("Failed to load system settings from DB", err instanceof Error ? err.stack : String(err));
  }

  return DEFAULT_SYSTEM_SETTINGS;
}

export async function saveSystemSettings(patch: Partial<SystemSettings>): Promise<void> {
  const current = await getSystemSettings();
  const updated = { ...current, ...patch };

  await prisma.setting.upsert({
    where: { key: "system" },
    update: { value: JSON.stringify(updated) },
    create: { key: "system", value: JSON.stringify(updated) },
  });

  // Update cache immediately
  cachedSystemSettings = updated;
}

// ---------------------------------------------------------------
// Quick helper used by API controllers
// ---------------------------------------------------------------
export async function getActiveProvider(): Promise<LLMProvider> {
  return (await getActiveSettings()).provider;
}

export async function getActiveModel(): Promise<string> {
  return (await getActiveSettings()).model;
}

export async function getActiveEmbeddingProvider(): Promise<EmbeddingProvider> {
  return (await getActiveSettings()).embeddingProvider;
}
