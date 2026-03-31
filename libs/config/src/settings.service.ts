import { PrismaClient } from "../../db/src/generated-client";
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
import { getRedis } from "./helpers/redis.helper";

const logger = new Logger('SettingsService');

const prisma = new PrismaClient();

// In-memory cache (L1) so every chat message doesn't hit the DB or Redis
let cachedSettings: LLMSettings | null = null;
let lastLoadTime = 0;

export async function getActiveSettings(): Promise<LLMSettings> {
  const now = Date.now();
  const l1Ttl = cachedSettings?.cacheL1Ttl ?? DEFAULT_LLM_SETTINGS.cacheL1Ttl ?? 60000;

  if (cachedSettings && (now - lastLoadTime < l1Ttl)) {
    return cachedSettings;
  }

  const redis = getRedis();
  const l2Key = cachedSettings?.cacheL2Key ?? DEFAULT_LLM_SETTINGS.cacheL2Key ?? "must-iq:settings:llm";

  if (redis) {
    try {
      const cached = await redis.get(l2Key);
      if (cached) {
        const stored = JSON.parse(cached) as Partial<LLMSettings>;
        const settings = await processAndMergeSettings(stored);

        cachedSettings = settings;
        lastLoadTime = now;
        return settings;
      }
    } catch (err) {
      logger.warn(`Redis Get failed: ${err.message}. Falling back to DB.`);
    }
  }

  try {
    const row = await prisma.setting.findUnique({ where: { key: "llm" } });
    const stored = row ? (JSON.parse(row.value) as Partial<LLMSettings>) : {};
    const settings = await processAndMergeSettings(stored);

    if (redis) {
      try {
        const l2Ttl = settings.cacheL2Ttl ?? DEFAULT_LLM_SETTINGS.cacheL2Ttl ?? 600;
        await redis.set(l2Key, JSON.stringify(stored), "EX", l2Ttl);
      } catch (err) {
        logger.warn(`Redis Set failed: ${err.message}`);
      }
    }

    cachedSettings = settings;
    lastLoadTime = now;
    return settings;
  } catch (err) {
    logger.error("Error in getActiveSettings (DB fetch):", err);
    return getEnvFallbackSettings();
  }
}

async function processAndMergeSettings(stored: Partial<LLMSettings>): Promise<LLMSettings> {
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

  const slackBotToken = stored.slackBotToken ? tryDecrypt(stored.slackBotToken) : undefined;
  const githubToken = stored.githubToken ? tryDecrypt(stored.githubToken) : undefined;
  const jiraApiToken = stored.jiraApiToken ? tryDecrypt(stored.jiraApiToken) : undefined;
  const jiraUserEmail = stored.jiraUserEmail ? tryDecrypt(stored.jiraUserEmail) : undefined;
  const jiraBaseUrl = stored.jiraBaseUrl ? tryDecrypt(stored.jiraBaseUrl) : undefined;

  // If DB has no keys, populate from ENV as defaults
  if (dbApiKeys.length === 0) {
    const providers: LLMProvider[] = ["anthropic", "openai", "gemini", "azure-openai", "xai"];
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

  return {
    ...DEFAULT_LLM_SETTINGS,
    ...stored,
    apiKeys: dbApiKeys,
    slackBotToken: slackBotToken || process.env.SLACK_BOT_TOKEN,
    githubToken: githubToken || process.env.GITHUB_TOKEN,
    jiraApiToken: jiraApiToken || process.env.JIRA_API_TOKEN,
    jiraUserEmail: jiraUserEmail || process.env.JIRA_USER_EMAIL,
    jiraBaseUrl: jiraBaseUrl || process.env.JIRA_BASE_URL,
  } as LLMSettings;
}

function getEnvFallbackSettings(): LLMSettings {
  const envApiKeys: APIKeyEntry[] = [];
  const providers: LLMProvider[] = ["anthropic", "openai", "gemini", "azure-openai", "xai"];

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

export async function saveActiveSettings(
  patch: Partial<LLMSettings>
): Promise<void> {
  const current = await getActiveSettings();
  const updated = { ...current, ...patch };

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

  const encryptedApiKeys: APIKeyEntry[] = [];
  if (Array.isArray(updated.apiKeys)) {
    for (const entry of updated.apiKeys) {
      if (!entry.key) continue;

      const isMasked = entry.key.includes("...") || entry.key.includes("•") || entry.key.includes("*");

      if (isMasked) {
        let existingEntry = current.apiKeys.find(k => k.id === entry.id);

        // If ID mismatch (e.g. seed vs env), try matching by provider + model if it was active
        if (!existingEntry) {
          existingEntry = current.apiKeys.find(k => k.provider === entry.provider && k.model === entry.model && k.isActive);
        }

        // Fallback: match by provider only if only one key exists
        if (!existingEntry) {
          const providerKeys = current.apiKeys.filter(k => k.provider === entry.provider);
          if (providerKeys.length === 1) {
            existingEntry = providerKeys[0];
          }
        }

        if (existingEntry && existingEntry.key && !existingEntry.key.includes("...")) {
          encryptedApiKeys.push({
            ...entry,
            key: encryptText(existingEntry.key)
          });
          logger.debug(`Preserved existing encrypted key for ${entry.provider} (Target ID: ${entry.id})`);
        } else {
          // CRITICAL: If we can't find a matching unmasked key, DO NOT DROP IT if it was previously there.
          // But if we truly can't find it, we skip with a loud warning.
          logger.error(`MASKED KEY LOSS PREVENTED: Received masked key for ${entry.provider} but no unmasked original found in DB. Keeping DB version.`);
          if (existingEntry) {
             encryptedApiKeys.push({ ...existingEntry, key: encryptText(existingEntry.key) });
          }
        }
      } else {
        encryptedApiKeys.push({
          ...entry,
          key: encryptText(entry.key.trim())
        });
        logger.log(`Encrypted brand new key for provider: ${entry.provider}`);
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

  const redis = getRedis();
  if (redis) {
    try {
      const l2Key = updated.cacheL2Key ?? DEFAULT_LLM_SETTINGS.cacheL2Key ?? "must-iq:settings:llm";
      await redis.del(l2Key);
    } catch (err) {
      logger.warn(`Redis Delete failed during invalidation: ${err.message}`);
    }
  }

  // Clear L1 cache to force a fresh reload from DB (with decrypted keys) on next request.
  // We DO NOT set cachedSettings = updated because 'updated' might contain masked keys from the frontend.
  cachedSettings = null;
  lastLoadTime = 0;
}

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

  cachedSystemSettings = updated;
}

export async function getActiveProvider(): Promise<LLMProvider> {
  return (await getActiveSettings()).provider;
}

export async function getActiveModel(): Promise<string> {
  return (await getActiveSettings()).model;
}

export async function getActiveEmbeddingProvider(): Promise<EmbeddingProvider> {
  return (await getActiveSettings()).embeddingProvider;
}
