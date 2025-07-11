import { Pinpoint } from 'aws-sdk';
import crypto from 'crypto';

// Initialize Pinpoint client
const pinpointClient = new Pinpoint({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Event types for type safety
export enum EventType {
  USER_REGISTERED = 'user.registered',
  ASSESSMENT_STARTED = 'assessment.started',
  ASSESSMENT_COMPLETED = 'assessment.completed',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  PAYMENT_FAILED = 'payment.failed',
}

// Event attributes interface
export interface EventAttributes {
  [key: string]: string;
}

// Event metrics interface
export interface EventMetrics {
  [key: string]: number;
}

// Main event interface
export interface AnalyticsEvent {
  eventType: EventType | string;
  userId: string;
  attributes?: EventAttributes;
  metrics?: EventMetrics;
  timestamp?: number;
}

// Event anonymizer for privacy
export class EventAnonymizer {
  private static readonly PII_FIELDS = ['email', 'name', 'phone', 'address', 'ssn', 'credit_card'];
  
  static hashUserId(identifier: string): string {
    return crypto
      .createHash('sha256')
      .update(identifier.toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }
  
  static sanitizeAttributes(attrs: Record<string, any>): EventAttributes {
    const sanitized: EventAttributes = {};
    
    for (const [key, value] of Object.entries(attrs)) {
      const lowerKey = key.toLowerCase();
      
      // Skip PII fields
      if (this.PII_FIELDS.some(pii => lowerKey.includes(pii))) {
        continue;
      }
      
      // Convert to string and truncate
      sanitized[key] = String(value).substring(0, 100);
    }
    
    return sanitized;
  }
  
  static sanitizeMetrics(metrics: Record<string, any>): EventMetrics {
    const sanitized: EventMetrics = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'number' && !isNaN(value)) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Cost control through event filtering
export class EventFilter {
  private static eventCounts = new Map<string, number>();
  private static lastReset = new Date().toDateString();
  
  // Daily limits by event type (adjust based on MRR)
  private static dailyLimits: Record<string, number> = {
    [EventType.USER_REGISTERED]: 100,
    [EventType.ASSESSMENT_STARTED]: 500,
    [EventType.ASSESSMENT_COMPLETED]: 500,
    [EventType.SUBSCRIPTION_CREATED]: 50,
    [EventType.SUBSCRIPTION_CANCELLED]: 50,
    [EventType.PAYMENT_FAILED]: 100,
  };
  
  static setDailyLimits(limits: Record<string, number>): void {
    this.dailyLimits = { ...this.dailyLimits, ...limits };
  }
  
  static shouldSendEvent(eventType: string): boolean {
    // Reset counts daily
    const today = new Date().toDateString();
    if (today !== this.lastReset) {
      this.eventCounts.clear();
      this.lastReset = today;
    }
    
    const countKey = `${eventType}_${today}`;
    const currentCount = this.eventCounts.get(countKey) || 0;
    const limit = this.dailyLimits[eventType] || 1000;
    
    if (currentCount < limit) {
      this.eventCounts.set(countKey, currentCount + 1);
      return true;
    }
    
    // Log when limits are reached
    if (currentCount === limit) {
      console.warn(`Daily event limit reached for ${eventType}: ${limit}`);
    }
    
    // Sample 10% of events over the limit
    return Math.random() < 0.1;
  }
  
  static getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.eventCounts.forEach((count, key) => {
      const [eventType] = key.split('_');
      stats[eventType] = count;
    });
    return stats;
  }
}

// Main event tracking class
export class PinpointEventTracker {
  private applicationId: string;
  private batchQueue: any[] = [];
  private batchInterval: NodeJS.Timer | null = null;
  private readonly batchSize = 100;
  private readonly batchDelayMs = 300000; // 5 minutes
  
  // Events that should be sent immediately
  private readonly realTimeEvents = new Set([
    EventType.SUBSCRIPTION_CREATED,
    EventType.SUBSCRIPTION_CANCELLED,
    EventType.PAYMENT_FAILED,
  ]);
  
  constructor(applicationId: string) {
    this.applicationId = applicationId;
    this.startBatchTimer();
  }
  
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Check if we should send this event
    if (!EventFilter.shouldSendEvent(event.eventType)) {
      return;
    }
    
    // Anonymize user ID
    const anonymizedUserId = EventAnonymizer.hashUserId(event.userId);
    
    // Sanitize attributes and metrics
    const sanitizedAttributes = event.attributes 
      ? EventAnonymizer.sanitizeAttributes(event.attributes) 
      : {};
    const sanitizedMetrics = event.metrics 
      ? EventAnonymizer.sanitizeMetrics(event.metrics)
      : {};
    
    // Create Pinpoint event
    const pinpointEvent = {
      EventType: event.eventType,
      Timestamp: new Date(event.timestamp || Date.now()).toISOString(),
      Attributes: {
        ...sanitizedAttributes,
        app_version: process.env.APP_VERSION || '1.0.0',
        platform: 'web',
      },
      Metrics: sanitizedMetrics,
    };
    
    // Create endpoint if needed
    const endpoint = {
      EndpointId: anonymizedUserId,
      ChannelType: 'CUSTOM',
      Address: anonymizedUserId,
      Attributes: {
        anonymized: ['true'],
      },
      Metrics: {},
      User: {
        UserId: anonymizedUserId,
      },
    };
    
    // Decide whether to send immediately or batch
    if (this.realTimeEvents.has(event.eventType as EventType)) {
      await this.sendImmediately(anonymizedUserId, endpoint, pinpointEvent);
    } else {
      this.addToBatch(anonymizedUserId, endpoint, pinpointEvent);
    }
  }
  
  private async sendImmediately(
    endpointId: string, 
    endpoint: any, 
    event: any
  ): Promise<void> {
    try {
      await pinpointClient.putEvents({
        ApplicationId: this.applicationId,
        EventsRequest: {
          BatchItem: {
            [endpointId]: {
              Endpoint: endpoint,
              Events: {
                [event.EventType]: event,
              },
            },
          },
        },
      }).promise();
    } catch (error) {
      console.error('Failed to send Pinpoint event:', error);
      // Could implement retry logic here
    }
  }
  
  private addToBatch(endpointId: string, endpoint: any, event: any): void {
    this.batchQueue.push({ endpointId, endpoint, event });
    
    // Flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flushBatch();
    }
  }
  
  private startBatchTimer(): void {
    this.batchInterval = setInterval(() => {
      this.flushBatch();
    }, this.batchDelayMs);
  }
  
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    // Group events by endpoint
    const batchItem: any = {};
    
    for (const { endpointId, endpoint, event } of this.batchQueue) {
      if (!batchItem[endpointId]) {
        batchItem[endpointId] = {
          Endpoint: endpoint,
          Events: {},
        };
      }
      
      // Add event with timestamp as key to ensure uniqueness
      const eventKey = `${event.EventType}_${Date.now()}_${Math.random()}`;
      batchItem[endpointId].Events[eventKey] = event;
    }
    
    // Clear the queue
    this.batchQueue = [];
    
    try {
      await pinpointClient.putEvents({
        ApplicationId: this.applicationId,
        EventsRequest: {
          BatchItem: batchItem,
        },
      }).promise();
      
      console.log(`Flushed ${Object.keys(batchItem).length} endpoints to Pinpoint`);
    } catch (error) {
      console.error('Failed to flush batch to Pinpoint:', error);
      // Could implement retry logic or dead letter queue here
    }
  }
  
  // Clean up resources
  destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    
    // Flush any remaining events
    this.flushBatch();
  }
  
  // Get current stats
  getStats(): {
    queueSize: number;
    dailyEventCounts: Record<string, number>;
  } {
    return {
      queueSize: this.batchQueue.length,
      dailyEventCounts: EventFilter.getEventStats(),
    };
  }
}

// Singleton instance
let trackerInstance: PinpointEventTracker | null = null;

export function initializePinpointTracker(applicationId: string): PinpointEventTracker {
  if (!trackerInstance) {
    trackerInstance = new PinpointEventTracker(applicationId);
  }
  return trackerInstance;
}

export function getPinpointTracker(): PinpointEventTracker {
  if (!trackerInstance) {
    throw new Error('PinpointEventTracker not initialized. Call initializePinpointTracker first.');
  }
  return trackerInstance;
}