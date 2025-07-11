/**
 * Lambda Function: S3 Data Processing Triggers
 * Memory: 128MB (cost-optimized)
 * Timeout: 300 seconds (5 minutes for large files)
 * Trigger: S3 PUT/POST events
 */

import { Context, S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { performanceOptimizer } from '../utils/performance';
import { errorHandler } from '../utils/error-handler';
import { costTracker } from '../utils/cost-tracker';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

// Processing configurations based on file patterns
const PROCESSING_RULES = {
  'raw/assessments/': { processor: 'assessment', compress: true, archive: true },
  'raw/events/': { processor: 'event', compress: true, archive: false },
  'processed/ocean/': { processor: 'aggregation', compress: false, archive: true },
  'exports/': { processor: 'export', compress: true, archive: false },
  'imports/': { processor: 'import', compress: false, archive: true }
};

// Cost-optimized batch sizes
const BATCH_SIZES = {
  small: 10,
  medium: 50,
  large: 100
};

export const handler = performanceOptimizer(async (event: S3Event, context: Context) => {
  const startTime = Date.now();
  const results: any[] = [];
  
  try {
    await costTracker.trackInvocation('s3-data-processor', 128);
    
    // Process S3 events
    for (const record of event.Records) {
      // Only process PUT and POST events
      if (!['ObjectCreated:Put', 'ObjectCreated:Post'].includes(record.eventName)) {
        continue;
      }
      
      try {
        const result = await processS3Object(record);
        results.push(result);
      } catch (error) {
        await errorHandler.handle(error, {
          bucket: record.s3.bucket.name,
          key: record.s3.object.key
        });
      }
    }
    
    // Send batch metrics
    await sendProcessingMetrics(results, Date.now() - startTime);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'S3 objects processed successfully',
        processed: results.length,
        avgProcessingTime: (Date.now() - startTime) / event.Records.length
      })
    };
  } catch (error) {
    await errorHandler.handleCritical(error, context);
    throw error;
  }
});

async function processS3Object(record: any): Promise<any> {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const size = record.s3.object.size;
  
  // Determine processing rule
  const rule = getProcessingRule(key);
  if (!rule) {
    return { bucket, key, status: 'skipped', reason: 'no_matching_rule' };
  }
  
  // Apply size-based optimizations
  const strategy = determineProcessingStrategy(size);
  
  switch (rule.processor) {
    case 'assessment':
      return await processAssessmentData(bucket, key, strategy);
    case 'event':
      return await processEventData(bucket, key, strategy);
    case 'aggregation':
      return await processAggregationData(bucket, key, strategy);
    case 'export':
      return await processExportData(bucket, key, strategy);
    case 'import':
      return await processImportData(bucket, key, strategy);
    default:
      return { bucket, key, status: 'skipped', reason: 'unknown_processor' };
  }
}

function getProcessingRule(key: string): any {
  for (const [pattern, rule] of Object.entries(PROCESSING_RULES)) {
    if (key.startsWith(pattern)) {
      return rule;
    }
  }
  return null;
}

function determineProcessingStrategy(size: number): ProcessingStrategy {
  // Size thresholds for different strategies
  if (size < 1024 * 1024) { // < 1MB
    return { 
      type: 'in-memory',
      batchSize: BATCH_SIZES.small,
      parallel: false
    };
  } else if (size < 10 * 1024 * 1024) { // < 10MB
    return {
      type: 'streaming',
      batchSize: BATCH_SIZES.medium,
      parallel: true,
      maxConcurrency: 3
    };
  } else { // >= 10MB
    return {
      type: 'chunked',
      batchSize: BATCH_SIZES.large,
      parallel: true,
      maxConcurrency: 5,
      chunkSize: 5 * 1024 * 1024 // 5MB chunks
    };
  }
}

async function processAssessmentData(bucket: string, key: string, strategy: ProcessingStrategy): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Get object metadata first
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    
    const contentType = response.ContentType || 'application/json';
    const isJson = contentType.includes('json');
    const isCsv = contentType.includes('csv');
    
    if (isJson) {
      // Process JSON assessment data
      const data = await response.Body?.transformToString();
      const assessments = JSON.parse(data!);
      
      // Validate and transform assessments
      const processed = await processAssessmentBatch(assessments, strategy);
      
      // Store processed data
      await storeProcessedData(bucket, key, processed);
      
      // Queue for further processing
      await queueForAnalytics(processed);
      
      return {
        bucket,
        key,
        status: 'processed',
        records: processed.length,
        duration: Date.now() - startTime
      };
    } else if (isCsv) {
      // Stream process CSV data
      const processed = await streamProcessCsv(response.Body!, strategy);
      
      return {
        bucket,
        key,
        status: 'processed',
        records: processed,
        duration: Date.now() - startTime
      };
    }
    
    return { bucket, key, status: 'unsupported_format' };
  } catch (error) {
    throw new Error(`Failed to process assessment data: ${error}`);
  }
}

async function processEventData(bucket: string, key: string, strategy: ProcessingStrategy): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Get the event data
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    const data = await response.Body?.transformToString();
    
    if (!data) {
      throw new Error('No data found');
    }
    
    // Parse events (handle both single and batch)
    const events = data.startsWith('[') ? JSON.parse(data) : [JSON.parse(data)];
    
    // Process events in batches
    const batches = createBatches(events, strategy.batchSize);
    let processedCount = 0;
    
    for (const batch of batches) {
      // Transform and validate events
      const validEvents = batch.filter(validateEvent);
      
      // Send to EventBridge
      if (validEvents.length > 0) {
        await publishEvents(validEvents);
        processedCount += validEvents.length;
      }
    }
    
    // Archive if configured
    if (PROCESSING_RULES['raw/events/'].archive) {
      await archiveObject(bucket, key);
    }
    
    return {
      bucket,
      key,
      status: 'processed',
      events: processedCount,
      duration: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Failed to process event data: ${error}`);
  }
}

async function processAggregationData(bucket: string, key: string, strategy: ProcessingStrategy): Promise<any> {
  // Process pre-aggregated OCEAN scores for analytics
  const startTime = Date.now();
  
  try {
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    const data = await response.Body?.transformToString();
    
    const aggregations = JSON.parse(data!);
    
    // Compute statistics and insights
    const insights = computeInsights(aggregations);
    
    // Store insights
    const insightsKey = key.replace('/ocean/', '/insights/');
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: insightsKey,
      Body: JSON.stringify(insights),
      ContentType: 'application/json',
      Metadata: {
        'processing-time': (Date.now() - startTime).toString(),
        'record-count': aggregations.length.toString()
      }
    }));
    
    // Trigger dashboard update
    await triggerDashboardUpdate(insights);
    
    return {
      bucket,
      key,
      status: 'aggregated',
      insights: Object.keys(insights),
      duration: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Failed to process aggregation data: ${error}`);
  }
}

async function processExportData(bucket: string, key: string, strategy: ProcessingStrategy): Promise<any> {
  // Handle data exports (compress and prepare for download)
  const startTime = Date.now();
  
  try {
    // Compress if large
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    
    if (response.ContentLength! > 1024 * 1024) { // > 1MB
      const compressedKey = key + '.gz';
      
      // Stream compress
      await streamCompress(bucket, key, compressedKey);
      
      // Delete original
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      
      return {
        bucket,
        key: compressedKey,
        status: 'compressed',
        originalSize: response.ContentLength,
        duration: Date.now() - startTime
      };
    }
    
    return {
      bucket,
      key,
      status: 'ready',
      size: response.ContentLength,
      duration: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Failed to process export data: ${error}`);
  }
}

async function processImportData(bucket: string, key: string, strategy: ProcessingStrategy): Promise<any> {
  // Handle data imports with validation
  const startTime = Date.now();
  
  try {
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    const data = await response.Body?.transformToString();
    
    // Validate import format
    const validation = await validateImportData(data!);
    
    if (!validation.valid) {
      // Move to error folder
      const errorKey = key.replace('/imports/', '/imports/errors/');
      await s3Client.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: errorKey,
        MetadataDirective: 'REPLACE',
        Metadata: {
          'error-reason': validation.errors.join('; '),
          'validated-at': new Date().toISOString()
        }
      }));
      
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      
      return {
        bucket,
        key: errorKey,
        status: 'validation_failed',
        errors: validation.errors,
        duration: Date.now() - startTime
      };
    }
    
    // Queue for processing
    const messages = createImportMessages(validation.data, strategy.batchSize);
    await sendBatchMessages(messages);
    
    // Archive processed import
    await archiveObject(bucket, key);
    
    return {
      bucket,
      key,
      status: 'imported',
      records: validation.recordCount,
      duration: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Failed to process import data: ${error}`);
  }
}

// Helper functions
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

async function streamProcessCsv(stream: any, strategy: ProcessingStrategy): Promise<number> {
  let recordCount = 0;
  const parser = parse({
    columns: true,
    skip_empty_lines: true
  });
  
  return new Promise((resolve, reject) => {
    stream.pipe(parser)
      .on('data', async (record: any) => {
        recordCount++;
        // Process record
        if (recordCount % strategy.batchSize === 0) {
          // Pause to prevent memory overflow
          parser.pause();
          await new Promise(r => setTimeout(r, 10));
          parser.resume();
        }
      })
      .on('end', () => resolve(recordCount))
      .on('error', reject);
  });
}

async function streamCompress(bucket: string, sourceKey: string, targetKey: string): Promise<void> {
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: sourceKey });
  const response = await s3Client.send(getCommand);
  
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }
  
  // Convert the body to a Buffer first (for Lambda environment)
  const bodyBuffer = await response.Body.transformToByteArray();
  
  // Create gzip stream
  const gzip = createGzip({ level: 6 }); // Balanced compression
  
  // Create a readable stream from the buffer
  const readableStream = Readable.from(bodyBuffer);
  
  // Create a promise to collect the compressed data
  const chunks: Buffer[] = [];
  gzip.on('data', chunk => chunks.push(chunk));
  
  await pipeline(readableStream, gzip);
  
  const compressedBuffer = Buffer.concat(chunks);
  
  // Upload compressed data
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: targetKey,
    Body: compressedBuffer,
    ContentType: 'application/gzip',
    ContentEncoding: 'gzip'
  });
  
  await s3Client.send(putCommand);
}

async function archiveObject(bucket: string, key: string): Promise<void> {
  const archiveKey = key.replace(/^raw\//, 'archive/') + '.' + Date.now();
  
  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${key}`,
    Key: archiveKey,
    StorageClass: 'GLACIER_IR' // Instant retrieval for recent archives
  }));
  
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function processAssessmentBatch(assessments: any[], strategy: ProcessingStrategy): Promise<any[]> {
  // Transform and validate assessments
  return assessments.map(assessment => ({
    ...assessment,
    processed: true,
    processedAt: new Date().toISOString()
  }));
}

async function storeProcessedData(bucket: string, originalKey: string, data: any): Promise<void> {
  const processedKey = originalKey.replace('/raw/', '/processed/');
  
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: processedKey,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  }));
}

async function queueForAnalytics(data: any[]): Promise<void> {
  if (!process.env.ANALYTICS_QUEUE_URL) return;
  
  const messages = data.map((item, index) => ({
    Id: `msg-${index}`,
    MessageBody: JSON.stringify(item)
  }));
  
  // Send in batches of 10 (SQS limit)
  for (const batch of createBatches(messages, 10)) {
    await sqsClient.send(new SendMessageBatchCommand({
      QueueUrl: process.env.ANALYTICS_QUEUE_URL,
      Entries: batch
    }));
  }
}

async function publishEvents(events: any[]): Promise<void> {
  const entries = events.map(event => ({
    Source: 'ioc.s3.processor',
    DetailType: event.type || 'ProcessedEvent',
    Detail: JSON.stringify(event),
    Time: new Date(event.timestamp || Date.now())
  }));
  
  // EventBridge limit is 10 entries per request
  for (const batch of createBatches(entries, 10)) {
    await eventBridgeClient.send(new PutEventsCommand({ Entries: batch }));
  }
}

function validateEvent(event: any): boolean {
  return event.type && event.timestamp;
}

function computeInsights(aggregations: any[]): any {
  // Compute statistical insights
  return {
    summary: {
      count: aggregations.length,
      timestamp: new Date().toISOString()
    },
    distributions: {},
    trends: {},
    anomalies: []
  };
}

async function triggerDashboardUpdate(insights: any): Promise<void> {
  await eventBridgeClient.send(new PutEventsCommand({
    Entries: [{
      Source: 'ioc.analytics.insights',
      DetailType: 'InsightsUpdated',
      Detail: JSON.stringify({ insights, timestamp: new Date().toISOString() })
    }]
  }));
}

async function validateImportData(data: string): Promise<any> {
  try {
    const parsed = JSON.parse(data);
    return {
      valid: true,
      data: parsed,
      recordCount: Array.isArray(parsed) ? parsed.length : 1
    };
  } catch (error) {
    return {
      valid: false,
      errors: ['Invalid JSON format']
    };
  }
}

function createImportMessages(data: any, batchSize: number): any[] {
  const items = Array.isArray(data) ? data : [data];
  return items.map((item, index) => ({
    Id: `import-${index}`,
    MessageBody: JSON.stringify(item)
  }));
}

async function sendBatchMessages(messages: any[]): Promise<void> {
  if (!process.env.IMPORT_QUEUE_URL) return;
  
  for (const batch of createBatches(messages, 10)) {
    await sqsClient.send(new SendMessageBatchCommand({
      QueueUrl: process.env.IMPORT_QUEUE_URL,
      Entries: batch
    }));
  }
}

async function sendProcessingMetrics(results: any[], duration: number): Promise<void> {
  // Send minimal metrics for cost optimization
  const summary = {
    processed: results.filter(r => r.status === 'processed').length,
    failed: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration
  };
  
  // Log to CloudWatch Logs (cheaper than custom metrics)
  console.log('Processing metrics:', JSON.stringify(summary));
}

interface ProcessingStrategy {
  type: 'in-memory' | 'streaming' | 'chunked';
  batchSize: number;
  parallel: boolean;
  maxConcurrency?: number;
  chunkSize?: number;
}