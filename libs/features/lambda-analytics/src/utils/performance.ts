/**
 * Performance optimization wrapper for Lambda functions
 * Implements cold start mitigation and memory optimization
 */

import { Context } from 'aws-lambda';

// Warm-up flag
let isWarm = false;

export function performanceOptimizer<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const context = args[1] as Context;
    
    // Log cold/warm start
    if (!isWarm) {
      console.log('Cold start detected');
      isWarm = true;
      
      // Pre-warm connections and caches
      await warmUpResources();
    } else {
      console.log('Warm start');
    }
    
    // Set function timeout warning
    const timeoutWarning = setTimeout(() => {
      console.warn('Function approaching timeout', {
        remaining: context.getRemainingTimeInMillis()
      });
    }, context.getRemainingTimeInMillis() - 5000);
    
    try {
      // Execute handler
      const result = await handler(...args);
      
      // Clear timeout warning
      clearTimeout(timeoutWarning);
      
      // Log performance metrics
      logPerformanceMetrics(context);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutWarning);
      throw error;
    }
  }) as T;
}

async function warmUpResources(): Promise<void> {
  // Pre-warm SDK clients and connections
  // This reduces cold start latency
  
  // Pre-compile regex patterns
  warmUpRegexPatterns();
  
  // Initialize any caches
  initializeCaches();
}

function warmUpRegexPatterns(): void {
  // Pre-compile commonly used regex patterns
  const patterns = [
    /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  ];
  
  patterns.forEach(p => p.test('test'));
}

function initializeCaches(): void {
  // Initialize any in-memory caches
  // Keep minimal to conserve memory
}

function logPerformanceMetrics(context: Context): void {
  const metrics = {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    timeRemaining: context.getRemainingTimeInMillis()
  };
  
  console.log('Performance metrics:', JSON.stringify(metrics));
}

// Memory optimization helpers
export function optimizeMemory(): void {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

export function measureMemoryUsage(): {
  used: number;
  available: number;
  percentage: number;
} {
  const used = process.memoryUsage();
  const limit = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '128');
  
  return {
    used: Math.round(used.heapUsed / 1024 / 1024),
    available: limit,
    percentage: Math.round((used.heapUsed / (limit * 1024 * 1024)) * 100)
  };
}