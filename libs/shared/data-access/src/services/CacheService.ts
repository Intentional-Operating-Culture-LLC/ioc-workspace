export interface CacheConfig {
  defaultTTL: number; // Time to live in seconds
  checkInterval: number; // Cleanup interval in seconds
  maxKeys: number; // Maximum number of keys to store
  enableStats: boolean; // Enable cache statistics
}

export interface CacheEntry<T = any> {
  value: T;
  expiry: number;
  accessed: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: number;
  hitRate: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memoryUsage: 0,
    hitRate: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private config: CacheConfig = {
    defaultTTL: 300, // 5 minutes
    checkInterval: 60, // 1 minute
    maxKeys: 1000,
    enableStats: true,
  }) {
    this.startCleanup();
  }

  // Set a value in cache
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.config.defaultTTL) * 1000;
    
    // Remove oldest entries if we're at capacity
    if (this.cache.size >= this.config.maxKeys) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiry,
      accessed: Date.now(),
      hits: 0,
    });

    this.updateStats();
  }

  // Get a value from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access stats
    entry.accessed = Date.now();
    entry.hits++;
    this.stats.hits++;
    this.updateStats();

    return entry.value as T;
  }

  // Get or set pattern - useful for caching expensive operations
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  // Delete a key
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Set TTL for existing key
  expire(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiry = Date.now() + ttl * 1000;
    return true;
  }

  // Get TTL for a key
  ttl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    const remaining = entry.expiry - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : -1;
  }

  // Increment a numeric value
  increment(key: string, amount: number = 1, ttl?: number): number {
    const current = this.get<number>(key) || 0;
    const newValue = current + amount;
    this.set(key, newValue, ttl);
    return newValue;
  }

  // Cache with pattern matching
  getByPattern(pattern: RegExp): Array<{ key: string; value: any }> {
    const matches: Array<{ key: string; value: any }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key) && Date.now() <= entry.expiry) {
        matches.push({ key, value: entry.value });
      }
    }

    return matches;
  }

  // Delete by pattern
  deleteByPattern(pattern: RegExp): number {
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.updateStats();
    }

    return deleted;
  }

  // Create namespaced cache methods
  namespace(ns: string) {
    return {
      set: <T>(key: string, value: T, ttl?: number) => 
        this.set(`${ns}:${key}`, value, ttl),
      
      get: <T>(key: string) => 
        this.get<T>(`${ns}:${key}`),
      
      getOrSet: <T>(key: string, factory: () => Promise<T>, ttl?: number) => 
        this.getOrSet<T>(`${ns}:${key}`, factory, ttl),
      
      delete: (key: string) => 
        this.delete(`${ns}:${key}`),
      
      has: (key: string) => 
        this.has(`${ns}:${key}`),
      
      clear: () => 
        this.deleteByPattern(new RegExp(`^${ns}:`)),
      
      keys: () => 
        this.keys().filter(key => key.startsWith(`${ns}:`))
          .map(key => key.substring(`${ns}:`.length)),
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestAccess) {
        oldestAccess = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private updateStats(): void {
    if (!this.config.enableStats) return;

    this.stats.keys = this.cache.size;
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
    
    // Estimate memory usage (rough approximation)
    this.stats.memoryUsage = this.cache.size * 1000; // ~1KB per entry estimate
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.updateStats();
    }
  }

  // Stop the cleanup interval
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Singleton instance for global use
export const globalCache = new CacheService();

// Dashboard-specific cache with shorter TTL
export const dashboardCache = new CacheService({
  defaultTTL: 60, // 1 minute for dashboard data
  checkInterval: 30,
  maxKeys: 500,
  enableStats: true,
});

// Reports cache with longer TTL
export const reportsCache = new CacheService({
  defaultTTL: 1800, // 30 minutes for reports
  checkInterval: 300, // 5 minutes
  maxKeys: 200,
  enableStats: true,
});

// Metrics cache for aggregated data
export const metricsCache = new CacheService({
  defaultTTL: 300, // 5 minutes for metrics
  checkInterval: 60,
  maxKeys: 1000,
  enableStats: true,
});

// Helper functions for common caching patterns
export class CacheHelper {
  static dashboardKey(organizationId: string, type: string): string {
    return `dashboard:${organizationId}:${type}`;
  }

  static metricsKey(organizationId: string, metricType: string, period: string): string {
    return `metrics:${organizationId}:${metricType}:${period}`;
  }

  static reportKey(reportId: string): string {
    return `report:${reportId}`;
  }

  static aggregationKey(organizationId: string, type: string, period: string): string {
    return `aggregation:${organizationId}:${type}:${period}`;
  }

  static userActivityKey(userId: string, date: string): string {
    return `activity:${userId}:${date}`;
  }

  // Cache dashboard summary with automatic refresh
  static async getCachedDashboardSummary(
    organizationId: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const key = CacheHelper.dashboardKey(organizationId, 'summary');
    return dashboardCache.getOrSet(key, fetcher, 60); // 1 minute TTL
  }

  // Cache metrics with different TTL based on type
  static async getCachedMetrics(
    organizationId: string,
    metricType: string,
    period: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const key = CacheHelper.metricsKey(organizationId, metricType, period);
    const ttl = metricType === 'realtime' ? 30 : 300; // 30s for realtime, 5min for others
    return metricsCache.getOrSet(key, fetcher, ttl);
  }

  // Cache reports with long TTL since they don't change often
  static async getCachedReport(
    reportId: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const key = CacheHelper.reportKey(reportId);
    return reportsCache.getOrSet(key, fetcher, 1800); // 30 minutes
  }

  // Invalidate related caches when data changes
  static invalidateOrganizationCache(organizationId: string): void {
    dashboardCache.deleteByPattern(new RegExp(`dashboard:${organizationId}:`));
    metricsCache.deleteByPattern(new RegExp(`metrics:${organizationId}:`));
    metricsCache.deleteByPattern(new RegExp(`aggregation:${organizationId}:`));
  }

  // Invalidate user-specific caches
  static invalidateUserCache(userId: string): void {
    globalCache.deleteByPattern(new RegExp(`activity:${userId}:`));
  }

  // Get cache statistics across all cache instances
  static getAllCacheStats(): Record<string, CacheStats> {
    return {
      global: globalCache.getStats(),
      dashboard: dashboardCache.getStats(),
      reports: reportsCache.getStats(),
      metrics: metricsCache.getStats(),
    };
  }
}