// Persists conversation history in Redis so memory survives
// server restarts and works across multiple API instances.
// In development: use session-memory.ts (in-process Map)
// In production:  use this file (Redis)

import { BufferMemory } from "@langchain/classic/memory";
import { RedisChatMessageHistory } from "@langchain/community/stores/message/ioredis";
import { getRedis } from "@must-iq/config";

export function createRedisMemory(sessionId: string): BufferMemory {
  const ttlSeconds = parseInt(process.env.MEMORY_TTL_SECONDS ?? "604800"); // 7 days
  const redis = getRedis();

  if (!redis) {
    throw new Error("Redis is not available for RedisMemory. Check REDIS_URL.");
  }

  const messageHistory = new RedisChatMessageHistory({
    sessionId: `must-iq:memory:${sessionId}`,
    client: redis,
    sessionTTL: ttlSeconds,
  });

  return new BufferMemory({
    chatHistory: messageHistory,
    returnMessages: true,
    memoryKey: "chat_history",
    inputKey: "question",
    outputKey: "answer",
  });
}

export async function clearRedisMemory(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`must-iq:memory:${sessionId}`);
  }
}
