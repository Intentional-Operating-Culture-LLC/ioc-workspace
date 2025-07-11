/**
 * Base AI Component - Shared functionality for A1 Generator and B1 Validator
 * Provides common infrastructure, utilities, and patterns
 */

import { v4 as uuidv4 } from 'uuid';
import { ModelProvider, ModelConfig, ICacheStrategy, IQueueManager } from './interfaces';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export abstract class BaseAIComponent {
  protected config: BaseComponentConfig;
  protected cacheStrategy?: ICacheStrategy;
  protected queueManager?: IQueueManager;
  protected providers: Map<ModelProvider, AIProvider>;

  constructor(config: BaseComponentConfig) {
    this.config = config;
    this.providers = new Map();
    this.initializeProviders();
  }

  protected generateTraceId(): string {
    return `trace_${uuidv4()}`;
  }

  protected generateBatchId(): string {
    return `batch_${uuidv4()}`;
  }

  protected async initializeProviders(): Promise<void> {
    // Provider initialization temporarily disabled for core build
    // TODO: Re-enable when provider modules are available
    
    // // Initialize OpenAI provider
    // if (this.config.providers?.openai) {
    //   const OpenAIProvider = await import('../providers/openai-provider');
    //   this.providers.set('openai', new OpenAIProvider.default(this.config.providers.openai));
    // }

    // // Initialize Anthropic provider
    // if (this.config.providers?.anthropic) {
    //   const AnthropicProvider = await import('../providers/anthropic-provider');
    //   this.providers.set('anthropic', new AnthropicProvider.default(this.config.providers.anthropic));
    // }

    // // Initialize Google provider
    // if (this.config.providers?.google) {
    //   const GoogleProvider = await import('../providers/google-provider');
    //   this.providers.set('google', new GoogleProvider.default(this.config.providers.google));
    // }

    // // Initialize local provider if configured
    // if (this.config.providers?.local) {
    //   const LocalProvider = await import('../providers/local-provider');
    //   this.providers.set('local', new LocalProvider.default(this.config.providers.local));
    // }
  }

  protected getProvider(provider: ModelProvider): AIProvider {
    const aiProvider = this.providers.get(provider);
    if (!aiProvider) {
      throw new Error(`Provider ${provider} not initialized`);
    }
    return aiProvider;
  }

  protected async cacheGet<T>(key: string): Promise<T | null> {
    if (!this.cacheStrategy) return null;
    
    try {
      return await this.cacheStrategy.get<T>(key);
    } catch (error) {
      logger.warn('Cache get failed', { key, error: error.message });
      return null;
    }
  }

  protected async cacheSet<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.cacheStrategy) return;
    
    try {
      await this.cacheStrategy.set(key, value, ttl);
    } catch (error) {
      logger.warn('Cache set failed', { key, error: error.message });
    }
  }

  protected generateCacheKey(parts: string[]): string {
    return parts.join(':');
  }

  protected async enqueueTask<T>(queue: string, task: T, options?: any): Promise<string> {
    if (!this.queueManager) {
      throw new Error('Queue manager not initialized');
    }

    return await this.queueManager.enqueue(queue, task, options);
  }

  protected recordMetric(name: string, value: number, tags?: Record<string, any>): void {
    metrics.record(name, value, tags);
  }

  protected logInfo(message: string, context?: any): void {
    logger.info(message, context);
  }

  protected logWarn(message: string, context?: any): void {
    logger.warn(message, context);
  }

  protected logError(message: string, context?: any): void {
    logger.error(message, context);
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        logger.warn('Operation failed, retrying', {
          attempt,
          maxRetries,
          error: error.message,
          delay
        });
      }
    }

    throw lastError!;
  }

  protected validateConfig(): void {
    if (!this.config) {
      throw new Error('Configuration is required');
    }

    if (!this.config.providers || Object.keys(this.config.providers).length === 0) {
      throw new Error('At least one AI provider must be configured');
    }
  }

  protected async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check providers
    for (const [name, provider] of this.providers) {
      try {
        await provider.healthCheck();
      } catch (error) {
        issues.push(`Provider ${name}: ${error.message}`);
      }
    }

    // Check cache
    if (this.cacheStrategy) {
      try {
        await this.cacheStrategy.get('health-check');
      } catch (error) {
        issues.push(`Cache: ${error.message}`);
      }
    }

    // Check queue
    if (this.queueManager) {
      try {
        await this.queueManager.getQueueStats('health-check');
      } catch (error) {
        issues.push(`Queue: ${error.message}`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// Supporting interfaces and types
export interface BaseComponentConfig {
  providers: Record<ModelProvider, ProviderConfig>;
  cache?: CacheConfig;
  queue?: QueueConfig;
  retry?: RetryConfig;
  monitoring?: MonitoringConfig;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  fallback?: {
    provider: ModelProvider;
    model: string;
  };
}

export interface CacheConfig {
  type: 'memory' | 'redis';
  url?: string;
  ttl: number;
  maxSize?: string;
}

export interface QueueConfig {
  type: 'memory' | 'redis' | 'sqs';
  url?: string;
  concurrency: number;
  retries: number;
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  exponential: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsEndpoint?: string;
  alerting?: {
    webhook?: string;
    email?: string[];
  };
}

// AI Provider interface
export interface AIProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  healthCheck(): Promise<void>;
  getRateLimit(): RateLimitStatus;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  finishReason: string;
}

export interface RateLimitStatus {
  remaining: number;
  reset: Date;
  limit: number;
}