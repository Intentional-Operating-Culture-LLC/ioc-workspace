/**
 * Lambda Function: Event Transformation for AWS Pinpoint
 * Memory: 128MB (minimal for cost optimization)
 * Timeout: 15 seconds
 * Trigger: EventBridge rules, Direct invocation
 */

import { Context, EventBridgeEvent, DynamoDBStreamEvent } from 'aws-lambda';
import { PinpointClient, PutEventsCommand, Event as PinpointEvent } from '@aws-sdk/client-pinpoint';
import { performanceOptimizer } from '../utils/performance';
import { errorHandler } from '../utils/error-handler';
import { costTracker } from '../utils/cost-tracker';
import { AssessmentEvent, UserEngagementEvent, SystemEvent } from '../types/events';

const pinpointClient = new PinpointClient({ region: process.env.AWS_REGION });

const PINPOINT_APP_ID = process.env.PINPOINT_APP_ID!;
const BATCH_SIZE = 100; // Pinpoint batch limit

// Event type mappings for cost-efficient processing
const EVENT_MAPPINGS = {
  'assessment.started': { category: 'engagement', monetization: false },
  'assessment.completed': { category: 'engagement', monetization: true },
  'assessment.abandoned': { category: 'engagement', monetization: false },
  'user.registered': { category: 'acquisition', monetization: false },
  'user.upgraded': { category: 'revenue', monetization: true },
  'report.generated': { category: 'engagement', monetization: true },
  'system.error': { category: 'technical', monetization: false }
};

export const handler = performanceOptimizer(async (event: any, context: Context) => {
  const startTime = Date.now();
  let processedEvents = 0;
  
  try {
    await costTracker.trackInvocation('pinpoint-transformer', 128);
    
    // Determine event source and process accordingly
    const events = extractEvents(event);
    
    // Batch events for efficient processing
    const batches = createBatches(events, BATCH_SIZE);
    
    // Process batches in parallel (up to 5 concurrent)
    const results = await Promise.allSettled(
      batches.slice(0, 5).map(batch => processBatch(batch))
    );
    
    // Count successful events
    processedEvents = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r: any) => sum + r.value, 0);
    
    // Log any failures for monitoring
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      await errorHandler.handle(new Error('Batch processing failures'), {
        failures: failures.length,
        total: batches.length
      });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Events transformed and sent to Pinpoint',
        processed: processedEvents,
        batches: batches.length,
        duration: Date.now() - startTime
      })
    };
  } catch (error) {
    await errorHandler.handleCritical(error, context);
    throw error;
  }
});

function extractEvents(event: any): any[] {
  // Handle different event sources
  if (event.Records) {
    // DynamoDB Stream events
    if (event.Records[0]?.dynamodb) {
      return extractDynamoDBEvents(event as DynamoDBStreamEvent);
    }
    // S3 events
    if (event.Records[0]?.s3) {
      return extractS3Events(event);
    }
  }
  
  // Direct EventBridge events
  if (event.source && event['detail-type']) {
    return [event];
  }
  
  // Direct invocation with array of events
  if (Array.isArray(event)) {
    return event;
  }
  
  // Single event
  return [event];
}

function extractDynamoDBEvents(event: DynamoDBStreamEvent): any[] {
  return event.Records
    .filter(record => record.eventName === 'INSERT' || record.eventName === 'MODIFY')
    .map(record => {
      const image = record.dynamodb?.NewImage;
      if (!image) return null;
      
      return {
        eventType: image.eventType?.S || 'unknown',
        userId: image.userId?.S,
        timestamp: image.timestamp?.S || new Date().toISOString(),
        attributes: parseAttributes(image.attributes?.M)
      };
    })
    .filter(e => e !== null);
}

function extractS3Events(event: any): any[] {
  return event.Records.map((record: any) => ({
    eventType: 's3.object.created',
    timestamp: record.eventTime,
    attributes: {
      bucket: record.s3.bucket.name,
      key: record.s3.object.key,
      size: record.s3.object.size
    }
  }));
}

function parseAttributes(attributeMap: any): Record<string, any> {
  if (!attributeMap) return {};
  
  const attributes: Record<string, any> = {};
  Object.entries(attributeMap).forEach(([key, value]: [string, any]) => {
    if (value.S) attributes[key] = value.S;
    else if (value.N) attributes[key] = parseFloat(value.N);
    else if (value.BOOL) attributes[key] = value.BOOL;
    else if (value.M) attributes[key] = parseAttributes(value.M);
  });
  
  return attributes;
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

async function processBatch(events: any[]): Promise<number> {
  const pinpointEvents: Record<string, PinpointEvent[]> = {};
  
  // Transform events to Pinpoint format
  events.forEach(event => {
    const transformed = transformToPinpointEvent(event);
    if (transformed) {
      const { endpointId, pinpointEvent } = transformed;
      if (!pinpointEvents[endpointId]) {
        pinpointEvents[endpointId] = [];
      }
      pinpointEvents[endpointId].push(pinpointEvent);
    }
  });
  
  // Send events to Pinpoint
  let successCount = 0;
  
  for (const [endpointId, eventList] of Object.entries(pinpointEvents)) {
    try {
      const command = new PutEventsCommand({
        ApplicationId: PINPOINT_APP_ID,
        EventsRequest: {
          BatchItem: {
            [endpointId]: {
              Endpoint: {},
              Events: eventList.reduce((acc, evt) => {
                acc[evt.EventType + '_' + Date.now()] = evt;
                return acc;
              }, {} as Record<string, PinpointEvent>)
            }
          }
        }
      });
      
      await pinpointClient.send(command);
      successCount += eventList.length;
    } catch (error) {
      await errorHandler.handle(error, {
        endpointId,
        eventCount: eventList.length
      });
    }
  }
  
  return successCount;
}

function transformToPinpointEvent(event: any): { endpointId: string; pinpointEvent: PinpointEvent } | null {
  const eventMapping = EVENT_MAPPINGS[event.eventType as keyof typeof EVENT_MAPPINGS];
  if (!eventMapping) return null;
  
  // Generate endpoint ID (anonymous if no userId)
  const endpointId = event.userId || generateAnonymousEndpointId(event);
  
  // Build Pinpoint event
  const pinpointEvent: PinpointEvent = {
    EventType: event.eventType,
    Timestamp: event.timestamp || new Date().toISOString(),
    
    // Add attributes
    Attributes: {
      category: eventMapping.category,
      ...flattenAttributes(event.attributes || {})
    },
    
    // Add metrics
    Metrics: extractMetrics(event)
  };
  
  // Add session info if available
  if (event.sessionId) {
    pinpointEvent.Session = {
      Id: event.sessionId,
      StartTimestamp: event.sessionStart || event.timestamp
    };
  }
  
  // Add monetization data if applicable
  if (eventMapping.monetization && event.revenue) {
    pinpointEvent.Attributes!['revenue'] = event.revenue.toString();
    pinpointEvent.Metrics!['revenue_amount'] = event.revenue;
  }
  
  return { endpointId, pinpointEvent };
}

function generateAnonymousEndpointId(event: any): string {
  // Use consistent anonymous ID based on event attributes
  const seed = event.sessionId || event.timestamp || Date.now().toString();
  return `anon_${Buffer.from(seed).toString('base64').substring(0, 16)}`;
}

function flattenAttributes(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      return;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenAttributes(value, fullKey));
    } else if (Array.isArray(value)) {
      flattened[fullKey] = value.join(',');
    } else {
      flattened[fullKey] = String(value);
    }
  });
  
  return flattened;
}

function extractMetrics(event: any): Record<string, number> {
  const metrics: Record<string, number> = {};
  
  // Standard metrics
  if (event.duration) metrics['duration_ms'] = event.duration;
  if (event.score) metrics['score'] = event.score;
  if (event.progress) metrics['progress_percent'] = event.progress;
  
  // Assessment-specific metrics
  if (event.eventType === 'assessment.completed') {
    if (event.attributes?.questionsAnswered) {
      metrics['questions_answered'] = event.attributes.questionsAnswered;
    }
    if (event.attributes?.completionTime) {
      metrics['completion_time_ms'] = event.attributes.completionTime;
    }
  }
  
  // Extract numeric values from attributes
  if (event.attributes) {
    Object.entries(event.attributes).forEach(([key, value]) => {
      if (typeof value === 'number' && !key.includes('id')) {
        metrics[`attr_${key}`] = value;
      }
    });
  }
  
  return metrics;
}

// Event builder helpers for common event types
export const eventBuilders = {
  assessmentStarted: (userId: string, assessmentId: string, type: string): AssessmentEvent => ({
    eventType: 'assessment.started',
    userId,
    timestamp: new Date().toISOString(),
    attributes: {
      assessmentId,
      assessmentType: type,
      platform: 'web'
    }
  }),
  
  assessmentCompleted: (userId: string, assessmentId: string, scores: any, duration: number): AssessmentEvent => ({
    eventType: 'assessment.completed',
    userId,
    timestamp: new Date().toISOString(),
    attributes: {
      assessmentId,
      completionTime: duration,
      questionsAnswered: 120 // Standard OCEAN
    },
    score: scores.overall || 0,
    duration
  }),
  
  userEngagement: (userId: string, action: string, metadata?: any): UserEngagementEvent => ({
    eventType: `user.${action}`,
    userId,
    timestamp: new Date().toISOString(),
    attributes: {
      action,
      ...metadata
    }
  })
};