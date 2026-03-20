// ============================================================
// Must-IQ — Redis-Backed Memory (Production)
// Persists conversation history in Redis so memory survives
// server restarts and works across multiple API instances
//
// In development: use session-memory.ts (in-process Map)
// In production:  use this file (Redis)
// ============================================================

import { BufferMemory } from "@langchain/classic/memory";
import { RedisChatMessageHistory } from "@langchain/community/stores/message/ioredis";
import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  }
  return redisClient;
}

// ---------------------------------------------------------------
// Create Redis-backed memory for a session
// Messages stored as: must-iq:memory:{sessionId}
// TTL: 7 days (configurable)
// ---------------------------------------------------------------
export function createRedisMemory(sessionId: string): BufferMemory {
  const ttlSeconds = parseInt(process.env.MEMORY_TTL_SECONDS ?? "604800"); // 7 days

  const messageHistory = new RedisChatMessageHistory({
    sessionId: `must-iq:memory:${sessionId}`,
    client: getRedis(),
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

// ---------------------------------------------------------------
// Clear a session's memory from Redis
// ---------------------------------------------------------------
export async function clearRedisMemory(sessionId: string): Promise<void> {
  await getRedis().del(`must-iq:memory:${sessionId}`);
}
