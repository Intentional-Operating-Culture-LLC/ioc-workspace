/**
 * Logger utility for the dual-AI system
 * Provides structured logging with different levels and context
 */

import { performance } from 'perf_hooks';

export interface LogContext {
  traceId?: string;
  requestId?: string;
  userId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  timer(label: string): () => number;
  child(context: LogContext): Logger;
}

class DualAILogger implements Logger {
  private baseContext: LogContext;

  constructor(baseContext: LogContext = {}) {
    this.baseContext = baseContext;
  }

  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.log('error', message, context);
  }

  timer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`Timer: ${label}`, { duration: Math.round(duration) });
      return duration;
    };
  }

  child(context: LogContext): Logger {
    return new DualAILogger({ ...this.baseContext, ...context });
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.baseContext,
      ...context,
      service: 'dual-ai-system'
    };

    // In production, this would integrate with your logging service
    // For now, we'll use console with structured output
    const logMethod = this.getConsoleMethod(level);
    logMethod(JSON.stringify(logEntry, null, process.env.NODE_ENV === 'development' ? 2 : 0));

    // Send to external logging service if configured
    if (process.env.LOG_ENDPOINT) {
      this.sendToExternalLogger(logEntry).catch(err => {
        console.error('Failed to send log to external service:', err);
      });
    }
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
      default:
        return console.log;
    }
  }

  private async sendToExternalLogger(logEntry: any): Promise<void> {
    try {
      await fetch(process.env.LOG_ENDPOINT!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOG_API_KEY || ''}`
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
    }
  }
}

// Create singleton logger instance
export const logger = new DualAILogger({
  component: 'dual-ai-system'
});

// Utility functions for common logging patterns
export const logRequestStart = (requestId: string, operation: string, context?: LogContext) => {
  logger.info(`Starting ${operation}`, {
    requestId,
    operation,
    phase: 'start',
    ...context
  });
};

export const logRequestEnd = (requestId: string, operation: string, duration: number, context?: LogContext) => {
  logger.info(`Completed ${operation}`, {
    requestId,
    operation,
    phase: 'end',
    duration: Math.round(duration),
    ...context
  });
};

export const logRequestError = (requestId: string, operation: string, error: Error, context?: LogContext) => {
  logger.error(`Failed ${operation}`, {
    requestId,
    operation,
    phase: 'error',
    error: error.message,
    stack: error.stack,
    ...context
  });
};

export const withLogging = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = logger.timer(operation);

    logRequestStart(requestId, operation);

    try {
      const result = await fn(...args);
      const duration = timer();
      logRequestEnd(requestId, operation, duration);
      return result;
    } catch (error) {
      timer();
      logRequestError(requestId, operation, error as Error);
      throw error;
    }
  };
};

// Context utilities
export const createLogContext = (partial: Partial<LogContext> = {}): LogContext => {
  return {
    timestamp: new Date().toISOString(),
    traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...partial
  };
};

export const addRequestContext = (logger: Logger, requestId: string, userId?: string): Logger => {
  return logger.child({
    requestId,
    userId
  });
};

// Performance logging utilities
export const logPerformance = (operation: string, startTime: number, context?: LogContext) => {
  const duration = performance.now() - startTime;
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: Math.round(duration),
    performance: true,
    ...context
  });
};

export const measureAsync = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    logPerformance(operation, startTime, { ...context, success: true });
    return result;
  } catch (error) {
    logPerformance(operation, startTime, { ...context, success: false, error: (error as Error).message });
    throw error;
  }
};

// Aggregation utilities for batch operations
export const createBatchLogger = (batchId: string, operation: string) => {
  const batchLogger = logger.child({ batchId, operation });
  const items: LogContext[] = [];

  return {
    addItem: (itemContext: LogContext) => {
      items.push(itemContext);
    },
    
    logStart: (totalItems: number) => {
      batchLogger.info(`Starting batch ${operation}`, {
        totalItems,
        phase: 'start'
      });
    },
    
    logProgress: (completed: number, total: number) => {
      batchLogger.info(`Batch ${operation} progress`, {
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
        phase: 'progress'
      });
    },
    
    logComplete: (successful: number, failed: number, duration: number) => {
      batchLogger.info(`Completed batch ${operation}`, {
        successful,
        failed,
        total: successful + failed,
        duration: Math.round(duration),
        successRate: Math.round((successful / (successful + failed)) * 100),
        phase: 'complete'
      });
    },
    
    logError: (error: Error) => {
      batchLogger.error(`Batch ${operation} failed`, {
        error: error.message,
        stack: error.stack,
        phase: 'error'
      });
    }
  };
};