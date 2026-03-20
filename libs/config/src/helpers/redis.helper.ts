import Redis from "ioredis";
import { Logger } from "@nestjs/common";

const logger = new Logger("RedisHelper");

let redisClient: Redis | null = null;
let isRedisDisabled = false;

/**
 * Get or create a singleton Redis client.
 * Returns null if REDIS_URL is missing or connection fails.
 */
export function getRedis(): Redis | null {
  if (isRedisDisabled) return null;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (!isRedisDisabled) {
      logger.warn("REDIS_URL is not set. Redis caching will be disabled.");
      isRedisDisabled = true;
    }
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1, // Fail fast
        retryStrategy(times) {
          if (times > 3) {
            logger.error("Redis connection failed after 3 retries. Disabling Redis for this process.");
            isRedisDisabled = true;
            return null;
          }
          return Math.min(times * 200, 1000);
        },
      });

      redisClient.on("error", (err) => {
        logger.error(`Redis Error: ${err.message}`);
        // We don't nullify the client here, ioredis handles reconnection,
        // but if the retryStrategy above returns null, it stops retrying.
      });

      redisClient.on("connect", () => {
        logger.log("Successfully connected to Redis.");
      });
    } catch (err) {
      logger.error(`Failed to initialize Redis client: ${err.message}`);
      isRedisDisabled = true;
      return null;
    }
  }

  return isRedisDisabled ? null : redisClient;
}

/**
 * Check if Redis is currently available and healthy.
 */
export function isRedisAvailable(): boolean {
  const client = getRedis();
  return !!client && client.status === "ready";
}
