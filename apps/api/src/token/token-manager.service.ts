// ============================================================
// Token Manager Service
// Tracks daily token usage per user via Redis
// Enforces budgets. Caches responses. Compresses prompts.
// ============================================================

import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { UserRole, TokenUsage } from "@must-iq/shared-types";
import { getSystemSettings } from "@must-iq/config";

@Injectable()
export class TokenManagerService {
  constructor(@InjectRedis() private readonly redis: Redis) { }

  // -------------------------------------------------------------------
  // Get today's usage key for a user
  // -------------------------------------------------------------------
  private usageKey(userId: string): string {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `token:usage:${userId}:${today}`;
  }

  // -------------------------------------------------------------------
  // Get cache key for a query (for response caching)
  // -------------------------------------------------------------------
  private cacheKey(query: string): string {
    // Simple hash — in production use a proper hash function
    const hash = Buffer.from(query).toString("base64").slice(0, 32);
    return `token:cache:${hash}`;
  }

  // -------------------------------------------------------------------
  // Check if user has budget remaining. Throws 429 if over limit.
  // -------------------------------------------------------------------
  async checkBudget(
    userId: string,
    role: UserRole,
    budgetOverride?: number
  ): Promise<TokenUsage> {
    const sys = await getSystemSettings();
    const budget = budgetOverride ?? (role === 'ADMIN' ? -1 : sys.baseUserDailyTokenLimit);

    const today = new Date().toISOString().split("T")[0];
    
    // 1. Global limit check (Fail-safe for entire system)
    const globalKey = `token:usage:global:${today}`;
    const globalUsed = parseInt((await this.redis.get(globalKey)) ?? "0");
    if (sys.globalDailyTokenCap > 0 && globalUsed >= sys.globalDailyTokenCap) {
      throw new HttpException({
          statusCode: 429,
          message: `System-wide daily API token limit (${sys.globalDailyTokenCap.toLocaleString()}) exceeded. Please try again tomorrow.`,
          code: "GLOBAL_TOKEN_BUDGET_EXCEEDED",
        }, HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 2. User-level check
    // Admins with unlimited budget skip the check
    if (budget === -1) {
      return {
        userId,
        date: new Date().toISOString().split("T")[0],
        tokensUsed: 0,
        tokenBudget: -1,
        percentUsed: 0,
        remainingTokens: Infinity,
      };
    }

    const used = parseInt((await this.redis.get(this.usageKey(userId))) ?? "0");
    const percentUsed = used / budget;
    const remaining = budget - used;

    if (remaining <= 0) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Daily token budget of ${budget.toLocaleString()} tokens exhausted. Resets at midnight.`,
          code: "TOKEN_BUDGET_EXCEEDED",
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return {
      userId,
      date: new Date().toISOString().split("T")[0],
      tokensUsed: used,
      tokenBudget: budget,
      percentUsed,
      remainingTokens: remaining,
    };
  }

  // -------------------------------------------------------------------
  // Record token usage after a successful LLM call
  // -------------------------------------------------------------------
  async recordUsage(userId: string, tokensUsed: number): Promise<void> {
    const key = this.usageKey(userId);
    const today = new Date().toISOString().split("T")[0];
    const globalKey = `token:usage:global:${today}`;

    await this.redis.incrby(key, tokensUsed);
    await this.redis.incrby(globalKey, tokensUsed);

    // Expire at end of day (86400 seconds max, set TTL if not already set)
    const ttl = await this.redis.ttl(key);
    if (ttl < 0) {
      // Set to expire in 25 hours (buffer for timezone differences)
      await this.redis.expire(key, 90_000);
    }
    const ttlGlobal = await this.redis.ttl(globalKey);
    if (ttlGlobal < 0) {
      await this.redis.expire(globalKey, 90_000);
    }
  }

  // -------------------------------------------------------------------
  // Try to get a cached response for this query
  // -------------------------------------------------------------------
  async getCachedResponse(query: string): Promise<{ response: string, sources?: any[] } | null> {
    const ttl = parseInt(process.env.TOKEN_CACHE_TTL_SECONDS ?? "0");
    if (ttl === 0) return null;
    const str = await this.redis.get(this.cacheKey(query));
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        // Fallback for old cache format
        return { response: str, sources: [] };
    }
  }

  // -------------------------------------------------------------------
  // Cache a response for future identical queries
  // -------------------------------------------------------------------
  async cacheResponse(query: string, response: string, sources: any[] = []): Promise<void> {
    const ttl = parseInt(process.env.TOKEN_CACHE_TTL_SECONDS ?? "0");
    if (ttl === 0) return;
    const payload = JSON.stringify({ response, sources });
    await this.redis.setex(this.cacheKey(query), ttl, payload);
  }

  // -------------------------------------------------------------------
  // Warn threshold check (e.g. at 80% budget, frontend shows warning)
  // -------------------------------------------------------------------
  isApproachingLimit(usage: TokenUsage): boolean {
    const threshold = parseFloat(
      process.env.TOKEN_WARNING_THRESHOLD ?? "0.8"
    );
    return usage.tokenBudget !== -1 && usage.percentUsed >= threshold;
  }
}
