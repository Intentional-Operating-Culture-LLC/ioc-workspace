/**
 * Caching Strategy Implementation
 * Multi-tier caching for dual-AI system with Redis and in-memory layers
 */

import { ICacheStrategy, CacheStats } from '../core/interfaces';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class DualAICacheStrategy implements ICacheStrategy {
  private memoryCache: Map<string, CacheEntry>;
  private redisClient?: RedisClient;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config: CacheConfig) {
    this.config = config;
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
      hitRate: 0
    };

    // Initialize Redis if configured
    if (config.redis?.enabled) {
      this.initializeRedis();
    }

    // Start cleanup processes
    this.startCleanupProcesses();
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Check memory cache first (L1)
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.recordHit('memory');
        metrics.histogram('cache_get_duration', Date.now() - startTime, { layer: 'memory', status: 'hit' });
        return memoryResult;
      }

      // Check Redis cache (L2)
      if (this.redisClient) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult !== null) {
          // Store in memory cache for faster future access
          this.setInMemory(key, redisResult, this.config.memory.ttl);
          this.recordHit('redis');
          metrics.histogram('cache_get_duration', Date.now() - startTime, { layer: 'redis', status: 'hit' });
          return redisResult;
        }
      }

      // Cache miss
      this.recordMiss();
      metrics.histogram('cache_get_duration', Date.now() - startTime, { layer: 'all', status: 'miss' });
      return null;

    } catch (error) {
      logger.error('Cache get failed', {
        key,
        error: error.message
      });
      metrics.histogram('cache_get_duration', Date.now() - startTime, { layer: 'all', status: 'error' });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      const effectiveTtl = ttl || this.config.defaultTtl;

      // Store in memory cache (L1)
      this.setInMemory(key, value, Math.min(effectiveTtl, this.config.memory.maxTtl));

      // Store in Redis cache (L2)
      if (this.redisClient) {
        await this.setInRedis(key, value, effectiveTtl);
      }

      this.stats.size = this.memoryCache.size;
      metrics.histogram('cache_set_duration', Date.now() - startTime, { layers: this.redisClient ? 'both' : 'memory' });

    } catch (error) {
      logger.error('Cache set failed', {
        key,
        error: error.message
      });
      metrics.histogram('cache_set_duration', Date.now() - startTime, { status: 'error' });
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Invalidate from memory cache
      const memoryInvalidated = this.invalidateMemoryPattern(pattern);

      // Invalidate from Redis cache
      let redisInvalidated = 0;
      if (this.redisClient) {
        redisInvalidated = await this.invalidateRedisPattern(pattern);
      }

      logger.info('Cache invalidation completed', {
        pattern,
        memoryInvalidated,
        redisInvalidated,
        duration: Date.now() - startTime
      });

      metrics.histogram('cache_invalidate_duration', Date.now() - startTime);
      metrics.record('cache_invalidated', memoryInvalidated + redisInvalidated, { pattern });

    } catch (error) {
      logger.error('Cache invalidation failed', {
        pattern,
        error: error.message
      });
    }
  }

  async clear(): Promise<void> {
    const startTime = Date.now();

    try {
      // Clear memory cache
      const memoryClearedCount = this.memoryCache.size;
      this.memoryCache.clear();

      // Clear Redis cache
      let redisClearedCount = 0;
      if (this.redisClient) {
        await this.redisClient.flushdb();
        redisClearedCount = 1; // Redis doesn't return count
      }

      this.stats.size = 0;
      this.stats.evictions += memoryClearedCount;

      logger.info('Cache cleared', {
        memoryClearedCount,
        redisClearedCount,
        duration: Date.now() - startTime
      });

      metrics.histogram('cache_clear_duration', Date.now() - startTime);

    } catch (error) {
      logger.error('Cache clear failed', {
        error: error.message
      });
    }
  }

  async getStats(): Promise<CacheStats> {
    const memoryStats = {
      entries: this.memoryCache.size,
      memoryUsage: this.calculateMemoryUsage()
    };

    let redisStats = {};
    if (this.redisClient) {
      try {
        redisStats = await this.getRedisStats();
      } catch (error) {
        logger.warn('Failed to get Redis stats', { error: error.message });
      }
    }

    // Update hit rate
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      layers: {
        memory: memoryStats,
        redis: redisStats
      }
    };
  }

  // Private methods

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      this.stats.evictions++;
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.value as T;
  }

  private setInMemory<T>(key: string, value: T, ttl: number): void {
    const entry: CacheEntry = {
      value,
      expiry: Date.now() + (ttl * 1000),
      lastAccessed: Date.now(),
      size: this.estimateSize(value)
    };

    // Check if we need to evict entries
    this.evictIfNeeded();

    this.memoryCache.set(key, entry);
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisClient) return null;

    try {
      const value = await this.redisClient.get(this.buildRedisKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Redis get failed', { key, error: error.message });
      return null;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.redisClient) return;

    try {
      const redisKey = this.buildRedisKey(key);
      const serializedValue = JSON.stringify(value);
      await this.redisClient.setex(redisKey, ttl, serializedValue);
    } catch (error) {
      logger.warn('Redis set failed', { key, error: error.message });
    }
  }

  private buildRedisKey(key: string): string {
    return `${this.config.redis?.keyPrefix || 'dual_ai'}:${key}`;
  }

  private invalidateMemoryPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let invalidated = 0;

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    this.stats.evictions += invalidated;
    return invalidated;
  }

  private async invalidateRedisPattern(pattern: string): Promise<number> {
    if (!this.redisClient) return 0;

    try {
      const redisPattern = this.buildRedisKey(pattern.replace(/\*/g, '*'));
      const keys = await this.redisClient.keys(redisPattern);
      
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
      
      return keys.length;
    } catch (error) {
      logger.warn('Redis pattern invalidation failed', { pattern, error: error.message });
      return 0;
    }
  }

  private evictIfNeeded(): void {
    const maxSize = this.config.memory.maxSize;
    
    while (this.memoryCache.size >= maxSize) {
      // LRU eviction - find least recently accessed
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.stats.evictions++;
      } else {
        break; // Safety break
      }
    }
  }

  private recordHit(layer: 'memory' | 'redis'): void {
    this.stats.hits++;
    metrics.increment('cache_hit', { layer });
  }

  private recordMiss(): void {
    this.stats.misses++;
    metrics.increment('cache_miss');
  }

  private estimateSize(value: any): number {
    // Rough estimation of memory usage
    return JSON.stringify(value).length * 2; // Approximate bytes
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size || 0;
    }
    return totalSize;
  }

  private async getRedisStats(): Promise<any> {
    if (!this.redisClient) return {};

    try {
      const info = await this.redisClient.info('memory');
      // Parse Redis memory info
      return {
        memoryUsage: this.parseRedisInfo(info, 'used_memory'),
        keyCount: await this.redisClient.dbsize()
      };
    } catch (error) {
      return {};
    }
  }

  private parseRedisInfo(info: string, key: string): string | null {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1];
      }
    }
    return null;
  }

  private async initializeRedis(): Promise<void> {
    try {
      // In a real implementation, you'd use a Redis client library
      // This is a placeholder for the interface
      this.redisClient = new RedisClientWrapper(this.config.redis!);
      await this.redisClient.connect();
      
      logger.info('Redis cache initialized', {
        url: this.config.redis?.url
      });
    } catch (error) {
      logger.error('Failed to initialize Redis cache', {
        error: error.message
      });
    }
  }

  private startCleanupProcesses(): void {
    // Memory cache cleanup interval
    setInterval(() => {
      this.cleanupExpiredMemoryEntries();
    }, this.config.memory.cleanupInterval || 60000);

    // Stats reporting interval
    setInterval(() => {
      this.reportStats();
    }, this.config.statsInterval || 300000);
  }

  private cleanupExpiredMemoryEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      logger.debug('Cleaned expired cache entries', { cleaned });
    }
  }

  private reportStats(): void {
    const stats = {
      memoryEntries: this.memoryCache.size,
      hitRate: this.stats.hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      evictions: this.stats.evictions
    };

    logger.info('Cache statistics', stats);
    
    // Record metrics
    metrics.gauge('cache_memory_entries', this.memoryCache.size);
    metrics.gauge('cache_hit_rate', this.stats.hitRate);
    metrics.gauge('cache_evictions_total', this.stats.evictions);
  }
}

// Supporting interfaces and types
interface CacheEntry {
  value: any;
  expiry: number;
  lastAccessed: number;
  size?: number;
}

interface CacheConfig {
  defaultTtl: number;
  memory: {
    maxSize: number;
    maxTtl: number;
    ttl: number;
    cleanupInterval?: number;
  };
  redis?: {
    enabled: boolean;
    url: string;
    keyPrefix?: string;
    maxRetries?: number;
  };
  statsInterval?: number;
}

// Redis client wrapper (placeholder interface)
interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushdb(): Promise<void>;
  info(section?: string): Promise<string>;
  dbsize(): Promise<number>;
}

class RedisClientWrapper implements RedisClient {
  constructor(private config: any) {}

  async connect(): Promise<void> {
    // Implementation would connect to Redis
  }

  async get(key: string): Promise<string | null> {
    // Implementation would get from Redis
    return null;
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    // Implementation would set in Redis with expiry
  }

  async del(...keys: string[]): Promise<number> {
    // Implementation would delete from Redis
    return 0;
  }

  async keys(pattern: string): Promise<string[]> {
    // Implementation would get keys matching pattern
    return [];
  }

  async flushdb(): Promise<void> {
    // Implementation would flush Redis database
  }

  async info(section?: string): Promise<string> {
    // Implementation would get Redis info
    return '';
  }

  async dbsize(): Promise<number> {
    // Implementation would get database size
    return 0;
  }
}

export { DualAICacheStrategy, CacheConfig };