/**
 * Performance testing helpers for IOC Core
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsed: number;
  cpuUsage?: number;
}

/**
 * Performance measurement utility
 */
export class PerformanceMeasurer {
  private startTime: number;
  private startMemory: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  end(): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      duration: endTime - this.startTime,
      memoryUsed: endMemory - this.startMemory,
    };
  }

  log(): PerformanceMetrics {
    const metrics = this.end();
    console.log(`[Performance] ${this.name}:`, {
      duration: `${metrics.duration.toFixed(2)}ms`,
      memoryUsed: `${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`,
    });
    return metrics;
  }
}

/**
 * Measure async function performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const measurer = new PerformanceMeasurer(name);
  const result = await fn();
  const metrics = measurer.end();
  return { result, metrics };
}

/**
 * Performance test assertions
 */
export function expectPerformance(metrics: PerformanceMetrics) {
  return {
    toBeFasterThan(maxDuration: number) {
      expect(metrics.duration).toBeLessThan(maxDuration);
    },
    toUseMemoryLessThan(maxMemoryMB: number) {
      const memoryMB = metrics.memoryUsed / 1024 / 1024;
      expect(memoryMB).toBeLessThan(maxMemoryMB);
    },
  };
}

/**
 * Load test helper
 */
export async function loadTest<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    iterations?: number;
    concurrency?: number;
    warmup?: number;
  } = {}
): Promise<{
  results: T[];
  metrics: {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    throughput: number;
  };
}> {
  const { iterations = 100, concurrency = 10, warmup = 5 } = options;

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  const results: T[] = [];
  const durations: number[] = [];
  const startTime = performance.now();

  // Run load test
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = Array(Math.min(concurrency, iterations - i))
      .fill(null)
      .map(async () => {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        durations.push(duration);
        return result;
      });

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const totalDuration = performance.now() - startTime;

  return {
    results,
    metrics: {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration,
      throughput: iterations / (totalDuration / 1000), // ops/sec
    },
  };
}

/**
 * Memory leak detector
 */
export class MemoryLeakDetector {
  private measurements: number[] = [];
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs = 100) {
    this.interval = setInterval(() => {
      this.measurements.push(process.memoryUsage().heapUsed);
    }, intervalMs);
  }

  stop(): { hasLeak: boolean; growth: number } {
    if (this.interval) {
      clearInterval(this.interval);
    }

    if (this.measurements.length < 10) {
      return { hasLeak: false, growth: 0 };
    }

    // Calculate memory growth trend
    const firstHalf = this.measurements.slice(0, Math.floor(this.measurements.length / 2));
    const secondHalf = this.measurements.slice(Math.floor(this.measurements.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const growth = (avgSecond - avgFirst) / avgFirst;

    // Consider it a leak if memory grew by more than 20%
    return {
      hasLeak: growth > 0.2,
      growth: growth * 100,
    };
  }
}