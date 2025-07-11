/**
 * Metrics collection and monitoring for the dual-AI system
 * Tracks performance, quality, and operational metrics
 */

import { performance } from 'perf_hooks';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, any>;
  type: MetricType;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricsCollector {
  record(name: string, value: number, tags?: Record<string, any>): void;
  increment(name: string, tags?: Record<string, any>): void;
  gauge(name: string, value: number, tags?: Record<string, any>): void;
  histogram(name: string, value: number, tags?: Record<string, any>): void;
  timer(name: string): () => void;
  getMetrics(name?: string, timeRange?: TimeRange): Metric[];
  getAggregatedMetrics(name: string, aggregation: AggregationType, timeRange?: TimeRange): number;
  getErrorRate(operation: string, timeRangeSeconds: number): number;
  flush(): Promise<void>;
}

export interface TimeRange {
  start: number;
  end: number;
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';

class DualAIMetrics implements MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private maxRetentionMs: number = 24 * 60 * 60 * 1000; // 24 hours
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-flush metrics every 60 seconds
    this.flushInterval = setInterval(() => {
      this.cleanup();
      this.flush().catch(err => console.error('Metrics flush failed:', err));
    }, 60000);

    // Cleanup on process exit
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  record(name: string, value: number, tags: Record<string, any> = {}): void {
    this.addMetric(name, value, 'gauge', tags);
  }

  increment(name: string, tags: Record<string, any> = {}): void {
    this.addMetric(name, 1, 'counter', tags);
  }

  gauge(name: string, value: number, tags: Record<string, any> = {}): void {
    this.addMetric(name, value, 'gauge', tags);
  }

  histogram(name: string, value: number, tags: Record<string, any> = {}): void {
    this.addMetric(name, value, 'histogram', tags);
  }

  timer(name: string, tags: Record<string, any> = {}): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.addMetric(name, duration, 'timer', tags);
    };
  }

  getMetrics(name?: string, timeRange?: TimeRange): Metric[] {
    const now = Date.now();
    const start = timeRange?.start || (now - this.maxRetentionMs);
    const end = timeRange?.end || now;

    if (name) {
      const metrics = this.metrics.get(name) || [];
      return metrics.filter(m => m.timestamp >= start && m.timestamp <= end);
    }

    const allMetrics: Metric[] = [];
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...metricList.filter(m => m.timestamp >= start && m.timestamp <= end));
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  getAggregatedMetrics(name: string, aggregation: AggregationType, timeRange?: TimeRange): number {
    const metrics = this.getMetrics(name, timeRange);
    const values = metrics.map(m => m.value);

    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.percentile(values, 0.5);
      case 'p95':
        return this.percentile(values, 0.95);
      case 'p99':
        return this.percentile(values, 0.99);
      default:
        return 0;
    }
  }

  getErrorRate(operation: string, timeRangeSeconds: number): number {
    const now = Date.now();
    const timeRange = {
      start: now - (timeRangeSeconds * 1000),
      end: now
    };

    const successMetrics = this.getMetrics(`${operation}_success`, timeRange);
    const errorMetrics = this.getMetrics(`${operation}_error`, timeRange);

    const total = successMetrics.length + errorMetrics.length;
    return total > 0 ? errorMetrics.length / total : 0;
  }

  async flush(): Promise<void> {
    if (!process.env.METRICS_ENDPOINT) return;

    try {
      const recentMetrics = this.getMetrics(undefined, {
        start: Date.now() - 60000, // Last minute
        end: Date.now()
      });

      if (recentMetrics.length === 0) return;

      await fetch(process.env.METRICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.METRICS_API_KEY || ''}`
        },
        body: JSON.stringify({
          metrics: recentMetrics,
          source: 'dual-ai-system',
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private addMetric(name: string, value: number, type: MetricType, tags: Record<string, any>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: { ...tags, type },
      type
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.maxRetentionMs;
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    }
  }

  private shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush().catch(err => console.error('Final metrics flush failed:', err));
  }
}

// Create singleton metrics instance
export const metrics = new DualAIMetrics();

// Utility functions for common metrics patterns
export const recordDualAIMetrics = {
  // Generation metrics
  generationStarted: (type: string, tags?: Record<string, any>) => {
    metrics.increment('generation_started', { type, ...tags });
  },

  generationCompleted: (type: string, duration: number, confidence: number, tags?: Record<string, any>) => {
    metrics.timer('generation_duration')();
    metrics.histogram('generation_duration', duration, { type, ...tags });
    metrics.gauge('generation_confidence', confidence, { type, ...tags });
    metrics.increment('generation_success', { type, ...tags });
  },

  generationFailed: (type: string, error: string, tags?: Record<string, any>) => {
    metrics.increment('generation_error', { type, error, ...tags });
  },

  // Validation metrics
  validationStarted: (contentType: string, tags?: Record<string, any>) => {
    metrics.increment('validation_started', { contentType, ...tags });
  },

  validationCompleted: (contentType: string, status: string, duration: number, scores: any, tags?: Record<string, any>) => {
    metrics.histogram('validation_duration', duration, { contentType, status, ...tags });
    metrics.gauge('validation_ethical_score', scores.ethical, { contentType, ...tags });
    metrics.gauge('validation_bias_score', scores.bias, { contentType, ...tags });
    metrics.gauge('validation_quality_score', scores.quality, { contentType, ...tags });
    metrics.gauge('validation_overall_score', scores.overall, { contentType, ...tags });
    metrics.increment('validation_success', { contentType, status, ...tags });
  },

  validationFailed: (contentType: string, error: string, tags?: Record<string, any>) => {
    metrics.increment('validation_error', { contentType, error, ...tags });
  },

  // Disagreement metrics
  disagreementDetected: (type: string, severity: string, tags?: Record<string, any>) => {
    metrics.increment('disagreement_detected', { type, severity, ...tags });
  },

  disagreementResolved: (type: string, method: string, duration: number, tags?: Record<string, any>) => {
    metrics.histogram('disagreement_resolution_time', duration, { type, method, ...tags });
    metrics.increment('disagreement_resolved', { type, method, ...tags });
  },

  // Learning metrics
  learningEventRecorded: (type: string, impact: number, tags?: Record<string, any>) => {
    metrics.increment('learning_event', { type, ...tags });
    metrics.gauge('learning_impact', impact, { type, ...tags });
  },

  modelRetrained: (model: string, improvement: number, tags?: Record<string, any>) => {
    metrics.increment('model_retrained', { model, ...tags });
    metrics.gauge('model_improvement', improvement, { model, ...tags });
  },

  // System metrics
  queueDepth: (queue: string, depth: number) => {
    metrics.gauge('queue_depth', depth, { queue });
  },

  cacheHit: (operation: string) => {
    metrics.increment('cache_hit', { operation });
  },

  cacheMiss: (operation: string) => {
    metrics.increment('cache_miss', { operation });
  },

  apiCall: (provider: string, model: string, tokens: number, cost?: number) => {
    metrics.increment('api_call', { provider, model });
    metrics.histogram('api_tokens', tokens, { provider, model });
    if (cost !== undefined) {
      metrics.histogram('api_cost', cost, { provider, model });
    }
  }
};

// Performance monitoring utilities
export const withMetrics = <T extends any[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>,
  extractTags?: (...args: T) => Record<string, any>
) => {
  return async (...args: T): Promise<R> => {
    const tags = extractTags ? extractTags(...args) : {};
    const timer = metrics.timer(`${operationName}_duration`);
    
    metrics.increment(`${operationName}_started`, tags);

    try {
      const result = await fn(...args);
      timer();
      metrics.increment(`${operationName}_success`, tags);
      return result;
    } catch (error) {
      timer();
      metrics.increment(`${operationName}_error`, { 
        ...tags, 
        error: (error as Error).constructor.name 
      });
      throw error;
    }
  };
};

// Dashboard metrics aggregation
export const getDashboardMetrics = (timeRangeHours: number = 24) => {
  const timeRange = {
    start: Date.now() - (timeRangeHours * 60 * 60 * 1000),
    end: Date.now()
  };

  return {
    generation: {
      total: metrics.getAggregatedMetrics('generation_success', 'count', timeRange) + 
             metrics.getAggregatedMetrics('generation_error', 'count', timeRange),
      successful: metrics.getAggregatedMetrics('generation_success', 'count', timeRange),
      failed: metrics.getAggregatedMetrics('generation_error', 'count', timeRange),
      avgDuration: metrics.getAggregatedMetrics('generation_duration', 'avg', timeRange),
      avgConfidence: metrics.getAggregatedMetrics('generation_confidence', 'avg', timeRange)
    },
    validation: {
      total: metrics.getAggregatedMetrics('validation_success', 'count', timeRange) + 
             metrics.getAggregatedMetrics('validation_error', 'count', timeRange),
      successful: metrics.getAggregatedMetrics('validation_success', 'count', timeRange),
      failed: metrics.getAggregatedMetrics('validation_error', 'count', timeRange),
      avgDuration: metrics.getAggregatedMetrics('validation_duration', 'avg', timeRange),
      avgEthicalScore: metrics.getAggregatedMetrics('validation_ethical_score', 'avg', timeRange),
      avgBiasScore: metrics.getAggregatedMetrics('validation_bias_score', 'avg', timeRange)
    },
    disagreements: {
      total: metrics.getAggregatedMetrics('disagreement_detected', 'count', timeRange),
      resolved: metrics.getAggregatedMetrics('disagreement_resolved', 'count', timeRange),
      avgResolutionTime: metrics.getAggregatedMetrics('disagreement_resolution_time', 'avg', timeRange)
    },
    learning: {
      events: metrics.getAggregatedMetrics('learning_event', 'count', timeRange),
      avgImpact: metrics.getAggregatedMetrics('learning_impact', 'avg', timeRange),
      retrainings: metrics.getAggregatedMetrics('model_retrained', 'count', timeRange)
    },
    system: {
      cacheHitRate: metrics.getAggregatedMetrics('cache_hit', 'count', timeRange) / 
                   (metrics.getAggregatedMetrics('cache_hit', 'count', timeRange) + 
                    metrics.getAggregatedMetrics('cache_miss', 'count', timeRange)),
      apiCalls: metrics.getAggregatedMetrics('api_call', 'count', timeRange),
      totalTokens: metrics.getAggregatedMetrics('api_tokens', 'sum', timeRange),
      totalCost: metrics.getAggregatedMetrics('api_cost', 'sum', timeRange)
    }
  };
};