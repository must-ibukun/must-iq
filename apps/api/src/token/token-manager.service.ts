// ============================================================
// Token Manager Service
// Tracks daily token usage per user via Redis
// Enforces budgets. Caches responses. Compresses prompts.
// ============================================================

import { Injectable, HttpException, HttpStatus, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { UserRole, TokenUsage } from "@must-iq/shared-types";
import { getSystemSettings } from "@must-iq/config";

@Injectable()
export class TokenManagerService implements OnModuleDestroy {
  private readonly logger = new Logger('TokenManagerService');
  private redis?: Redis;
  private memoryCache = new Map<string, { value: string | number, expiresAt: number }>();

  constructor() {
    if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== "") {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          retryStrategy: () => null // don't retry forever, fallback instantly
        });
        this.redis.on('error', (err) => {
          this.logger.warn(`Redis error: ${err.message}. Falling back to in-memory cache.`);
          this.redis = undefined; // Nullify redis so it falls back to memory
        });
        this.logger.log('Connected to Redis for token management & caching');
      } catch (e) {
        this.logger.warn('Failed to connect to Redis, using in-memory cache.');
      }
    } else {
      this.logger.log('No REDIS_URL provided, using in-memory cache.');
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  // --- Map Fallback Helpers ---
  private _get(key: string): string | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return String(item.value);
  }

  private _setex(key: string, ttlSeconds: number, value: string) {
    this.memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private _incrby(key: string, value: number): number {
    const current = Number(this._get(key)) || 0;
    const next = current + value;
    // Keep existing expiry if present
    const existing = this.memoryCache.get(key);
    this.memoryCache.set(key, { value: next, expiresAt: existing?.expiresAt || 0 });
    return next;
  }

  private _ttl(key: string): number {
    const item = this.memoryCache.get(key);
    if (!item) return -2; // key does not exist
    if (item.expiresAt === 0) return -1; // no expiry
    const left = item.expiresAt - Date.now();
    return left > 0 ? Math.floor(left / 1000) : -2;
  }

  private _expire(key: string, ttlSeconds: number) {
    const item = this.memoryCache.get(key);
    if (item) {
      item.expiresAt = Date.now() + ttlSeconds * 1000;
      this.memoryCache.set(key, item);
    }
  }

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
    const globalUsedStr = this.redis ? await this.redis.get(globalKey).catch(() => this._get(globalKey)) : this._get(globalKey);
    const globalUsed = parseInt(globalUsedStr ?? "0");
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

    const usedStr = this.redis ? await this.redis.get(this.usageKey(userId)).catch(() => this._get(this.usageKey(userId))) : this._get(this.usageKey(userId));
    const used = parseInt(usedStr ?? "0");
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

    if (this.redis) {
      try {
        await this.redis.incrby(key, tokensUsed);
        await this.redis.incrby(globalKey, tokensUsed);

        const ttl = await this.redis.ttl(key);
        if (ttl < 0) await this.redis.expire(key, 90_000);

        const ttlGlobal = await this.redis.ttl(globalKey);
        if (ttlGlobal < 0) await this.redis.expire(globalKey, 90_000);
        return;
      } catch (e) {
        // silently fallback to memory if redis fails during request
      }
    }

    // Fallback to memory
    this._incrby(key, tokensUsed);
    this._incrby(globalKey, tokensUsed);
    if (this._ttl(key) < 0) this._expire(key, 90_000);
    if (this._ttl(globalKey) < 0) this._expire(globalKey, 90_000);
  }

  // -------------------------------------------------------------------
  // Try to get a cached response for this query
  // -------------------------------------------------------------------
  async getCachedResponse(query: string): Promise<{ response: string, sources?: any[] } | null> {
    const ttl = parseInt(process.env.TOKEN_CACHE_TTL_SECONDS || "0");
    if (isNaN(ttl) || ttl <= 0) return null;
    
    const k = this.cacheKey(query);
    const str = this.redis ? await this.redis.get(k).catch(() => this._get(k)) : this._get(k);
    
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
    const ttl = parseInt(process.env.TOKEN_CACHE_TTL_SECONDS || "0");
    if (isNaN(ttl) || ttl <= 0) return;
    const payload = JSON.stringify({ response, sources });
    const k = this.cacheKey(query);
    
    if (this.redis) {
      await this.redis.setex(k, ttl, payload).catch(() => this._setex(k, ttl, payload));
    } else {
      this._setex(k, ttl, payload);
    }
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
