/**
 * Lambda Function: Assessment Data Anonymization
 * Memory: 128MB (upgradeable to 256MB at $1K MRR)
 * Timeout: 30 seconds
 * Trigger: S3 PUT events on raw assessment bucket
 */

import { Context, S3Event, S3EventRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AssessmentData, AnonymizedAssessment } from '../types/assessment';
import { performanceOptimizer } from '../utils/performance';
import { errorHandler } from '../utils/error-handler';
import { costTracker } from '../utils/cost-tracker';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

// Configuration based on MRR tier
const getMemoryConfig = (): number => {
  const mrr = parseInt(process.env.CURRENT_MRR || '0');
  if (mrr >= 1000) return 256;
  return 128;
};

export const handler = performanceOptimizer(async (event: S3Event, context: Context) => {
  const startTime = Date.now();
  const processedRecords: string[] = [];
  
  try {
    // Track function invocation
    await costTracker.trackInvocation('assessment-anonymizer', getMemoryConfig());
    
    // Process each S3 record in the event
    for (const record of event.Records) {
      try {
        await processAssessmentRecord(record);
        processedRecords.push(record.s3.object.key);
      } catch (error) {
        await errorHandler.handle(error, {
          function: 'assessment-anonymizer',
          record: record.s3.object.key
        });
      }
    }
    
    // Send metrics to CloudWatch
    await sendMetrics({
      processed: processedRecords.length,
      failed: event.Records.length - processedRecords.length,
      duration: Date.now() - startTime
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Assessments anonymized successfully',
        processed: processedRecords.length,
        records: processedRecords
      })
    };
  } catch (error) {
    await errorHandler.handleCritical(error, context);
    throw error;
  }
});

async function processAssessmentRecord(record: S3EventRecord): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  // Get the assessment data from S3
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(getCommand);
  const rawData = await response.Body?.transformToString();
  
  if (!rawData) {
    throw new Error(`No data found for key: ${key}`);
  }
  
  const assessmentData: AssessmentData = JSON.parse(rawData);
  
  // Anonymize the assessment data
  const anonymizedData = anonymizeAssessment(assessmentData);
  
  // Store anonymized data
  const anonymizedKey = key.replace('/raw/', '/anonymized/');
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: anonymizedKey,
    Body: JSON.stringify(anonymizedData),
    ContentType: 'application/json',
    Metadata: {
      'anonymized-at': new Date().toISOString(),
      'anonymization-version': '1.0',
      'original-key': key
    }
  });
  
  await s3Client.send(putCommand);
}

function anonymizeAssessment(data: AssessmentData): AnonymizedAssessment {
  // Generate deterministic anonymous ID based on user data
  const userHash = createHash('sha256')
    .update(data.userId + data.email + process.env.ANONYMIZATION_SALT)
    .digest('hex');
  
  // Generate session-specific anonymous ID
  const sessionId = uuidv4();
  
  return {
    anonymousUserId: userHash.substring(0, 16), // Short hash for efficiency
    sessionId,
    assessmentId: data.assessmentId,
    timestamp: data.timestamp,
    
    // Preserve assessment data without PII
    scores: data.scores,
    responses: data.responses.map(r => ({
      questionId: r.questionId,
      answer: r.answer,
      responseTime: r.responseTime,
      confidence: r.confidence
    })),
    
    // Anonymized demographics
    demographics: {
      ageRange: getAgeRange(data.demographics?.age),
      industry: data.demographics?.industry,
      role: generalizeRole(data.demographics?.role),
      experience: getExperienceRange(data.demographics?.yearsExperience),
      region: data.demographics?.country // Country level only
    },
    
    // Metadata
    metadata: {
      assessmentType: data.assessmentType,
      version: data.version,
      completionTime: data.completionTime,
      device: generalizeDevice(data.metadata?.userAgent),
      platform: data.metadata?.platform
    }
  };
}

function getAgeRange(age?: number): string | undefined {
  if (!age) return undefined;
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

function getExperienceRange(years?: number): string | undefined {
  if (!years) return undefined;
  if (years < 2) return '0-2';
  if (years < 5) return '2-5';
  if (years < 10) return '5-10';
  if (years < 15) return '10-15';
  return '15+';
}

function generalizeRole(role?: string): string | undefined {
  if (!role) return undefined;
  
  const roleMap: Record<string, string> = {
    'ceo': 'executive',
    'cto': 'executive',
    'cfo': 'executive',
    'vp': 'senior-management',
    'director': 'senior-management',
    'manager': 'management',
    'lead': 'senior-contributor',
    'senior': 'senior-contributor',
    'junior': 'contributor',
    'intern': 'contributor'
  };
  
  const lowerRole = role.toLowerCase();
  for (const [key, value] of Object.entries(roleMap)) {
    if (lowerRole.includes(key)) return value;
  }
  
  return 'contributor';
}

function generalizeDevice(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  
  if (userAgent.includes('Mobile')) return 'mobile';
  if (userAgent.includes('Tablet')) return 'tablet';
  return 'desktop';
}

async function sendMetrics(metrics: {
  processed: number;
  failed: number;
  duration: number;
}): Promise<void> {
  const command = new PutMetricDataCommand({
    Namespace: 'IOC/Lambda/Analytics',
    MetricData: [
      {
        MetricName: 'AssessmentsAnonymized',
        Value: metrics.processed,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'AnonymizationDuration',
        Value: metrics.duration,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      },
      {
        MetricName: 'AnonymizationErrors',
        Value: metrics.failed,
        Unit: 'Count',
        Timestamp: new Date()
      }
    ]
  });
  
  await cloudWatchClient.send(command);
}