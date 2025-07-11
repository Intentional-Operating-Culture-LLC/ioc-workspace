/**
 * Log Optimizer for CloudWatch Cost Reduction
 * Implements intelligent log filtering and batching
 */

import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { LOG_FILTER_PATTERNS } from './cloudwatch-config';

interface LogEvent {
  timestamp: number;
  message: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  metadata?: Record<string, any>;
}

interface StructuredLog {
  timestamp: string;
  level: string;
  event_type: string;
  user_id?: string;
  assessment_id?: string;
  ocean_scores?: Record<string, number>;
  error_type?: string;
  error_message?: string;
  duration_ms?: number;
  cost?: number;
  [key: string]: any;
}

export class LogOptimizer {
  private logBuffer: LogEvent[] = [];
  private logClient: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;
  private flushInterval: NodeJS.Timeout;
  private maxBufferSize = 100; // Batch logs
  private maxBufferAge = 60000; // 1 minute
  
  constructor(
    logGroupName: string,
    logStreamName: string,
    region: string = 'us-east-1'
  ) {
    this.logClient = new CloudWatchLogsClient({ region });
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;
    
    // Auto-flush logs periodically
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.maxBufferAge);
  }
  
  /**
   * Log a structured event (filtered for cost optimization)
   */
  log(event: StructuredLog): void {
    // Apply filtering rules
    if (!this.shouldLog(event)) {
      return;
    }
    
    // Create compact log message
    const message = this.formatCompactMessage(event);
    
    this.logBuffer.push({
      timestamp: Date.now(),
      message,
      level: this.getLogLevel(event.level || 'INFO'),
      metadata: event
    });
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  /**
   * Determine if event should be logged (cost optimization)
   */
  private shouldLog(event: StructuredLog): boolean {
    // Always log errors
    if (event.level === 'ERROR') {
      return true;
    }
    
    // Check if event type is in essential list
    if (event.event_type && LOG_FILTER_PATTERNS.essential.includes(event.event_type)) {
      return true;
    }
    
    // Exclude verbose logs
    if (event.event_type && LOG_FILTER_PATTERNS.exclude.some(pattern => 
      event.event_type.includes(pattern) || event.message?.includes(pattern)
    )) {
      return false;
    }
    
    // Sample INFO logs (10% sampling rate for non-essential)
    if (event.level === 'INFO' && Math.random() > 0.1) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Format log message for compact storage
   */
  private formatCompactMessage(event: StructuredLog): string {
    // Remove null/undefined values and create compact JSON
    const compactEvent = Object.entries(event).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        // Shorten common keys
        const shortKey = this.shortenKey(key);
        acc[shortKey] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return JSON.stringify(compactEvent);
  }
  
  /**
   * Shorten common keys to reduce log size
   */
  private shortenKey(key: string): string {
    const keyMap: Record<string, string> = {
      'timestamp': 'ts',
      'event_type': 'et',
      'user_id': 'uid',
      'assessment_id': 'aid',
      'error_type': 'err',
      'error_message': 'msg',
      'duration_ms': 'dur',
      'ocean_scores': 'ocean'
    };
    
    return keyMap[key] || key;
  }
  
  /**
   * Get log level enum
   */
  private getLogLevel(level: string): 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' {
    const upperLevel = level.toUpperCase();
    if (['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(upperLevel)) {
      return upperLevel as 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
    }
    return 'INFO';
  }
  
  /**
   * Flush logs to CloudWatch
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const events = this.logBuffer.map(event => ({
      timestamp: event.timestamp,
      message: event.message
    }));
    
    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: events,
        sequenceToken: this.sequenceToken
      });
      
      const response = await this.logClient.send(command);
      this.sequenceToken = response.nextSequenceToken;
      
      // Clear buffer after successful send
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to send logs to CloudWatch:', error);
      
      // If buffer is too large, clear oldest entries
      if (this.logBuffer.length > this.maxBufferSize * 2) {
        this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
      }
    }
  }
  
  /**
   * Log business event with optimization
   */
  logBusinessEvent(type: string, data: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event_type: type,
      ...data
    });
  }
  
  /**
   * Log error with context
   */
  logError(error: Error, context: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event_type: 'ERROR',
      error_type: error.name,
      error_message: error.message,
      stack: error.stack,
      ...context
    });
  }
  
  /**
   * Log assessment completion (essential event)
   */
  logAssessmentCompleted(data: {
    userId: string;
    assessmentId: string;
    oceanScores: Record<string, number>;
    dualAIValidated: boolean;
    duration: number;
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event_type: 'ASSESSMENT_COMPLETED',
      user_id: data.userId,
      assessment_id: data.assessmentId,
      ocean_scores: data.oceanScores,
      dual_ai_validated: data.dualAIValidated,
      duration_ms: data.duration
    });
  }
  
  /**
   * Log revenue event (essential)
   */
  logRevenueEvent(data: {
    userId: string;
    amount: number;
    type: 'subscription' | 'one-time';
    plan?: string;
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event_type: 'REVENUE_TRACKED',
      user_id: data.userId,
      amount: data.amount,
      revenue_type: data.type,
      plan: data.plan
    });
  }
  
  /**
   * Create log insights query
   */
  createInsightsQuery(queryType: 'business' | 'errors' | 'performance'): string {
    const queries = {
      business: `
        fields @timestamp, et as event_type, uid as user_id, amount, ocean_scores
        | filter et in ["ASSESSMENT_COMPLETED", "REVENUE_TRACKED", "TRIAL_CONVERTED"]
        | stats count() by et
        | sort count desc
      `,
      errors: `
        fields @timestamp, err as error_type, msg as error_message, uid as user_id
        | filter level = "ERROR"
        | stats count() by err
        | sort count desc
        | limit 20
      `,
      performance: `
        fields @timestamp, dur as duration_ms, et as event_type
        | filter dur > 0
        | stats avg(dur) as avg_duration, max(dur) as max_duration, count() as requests by et
        | sort avg_duration desc
      `
    };
    
    return queries[queryType];
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush(); // Final flush
  }
}

/**
 * Log aggregator for batch processing
 */
export class LogAggregator {
  private logs: Map<string, StructuredLog[]> = new Map();
  
  /**
   * Add log for aggregation
   */
  addLog(category: string, log: StructuredLog): void {
    if (!this.logs.has(category)) {
      this.logs.set(category, []);
    }
    this.logs.get(category)!.push(log);
  }
  
  /**
   * Get aggregated summary
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    this.logs.forEach((logs, category) => {
      summary[category] = {
        count: logs.length,
        errors: logs.filter(l => l.level === 'ERROR').length,
        avgDuration: this.calculateAverage(logs.map(l => l.duration_ms).filter((d): d is number => d !== undefined))
      };
      
      // Special handling for assessments
      if (category === 'assessments') {
        const oceanScores = logs
          .map(l => l.ocean_scores)
          .filter(Boolean) as Record<string, number>[];
          
        summary[category].oceanAverages = this.calculateOceanAverages(oceanScores);
      }
    });
    
    return summary;
  }
  
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  private calculateOceanAverages(scores: Record<string, number>[]): Record<string, number> {
    if (scores.length === 0) return { O: 0, C: 0, E: 0, A: 0, N: 0 };
    
    const totals = scores.reduce((acc, score) => {
      Object.keys(score).forEach(trait => {
        acc[trait] = (acc[trait] || 0) + score[trait];
      });
      return acc;
    }, {} as Record<string, number>);
    
    Object.keys(totals).forEach(trait => {
      totals[trait] = totals[trait] / scores.length;
    });
    
    return totals;
  }
  
  /**
   * Clear aggregated logs
   */
  clear(): void {
    this.logs.clear();
  }
}