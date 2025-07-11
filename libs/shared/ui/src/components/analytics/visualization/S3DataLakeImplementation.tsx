// S3 Data Lake Implementation for IOC Assessment Data
// This provides the actual code implementation for the data lake architecture

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';
import { AthenaClient, StartQueryExecutionCommand, GetQueryResultsCommand } from '@aws-sdk/client-athena';

// ===========================
// Phase 1: Direct S3 Upload Implementation ($0-5/month)
// ===========================

interface AssessmentData {
  id: string;
  userId: string;
  type: 'personality' | 'skills' | 'cognitive' | 'behavioral';
  responses: Record<string, any>;
  score: number;
  duration: number;
  completedAt: string;
}

export class S3DataLakeUploader {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(region: string = 'us-east-1') {
    this.s3Client = new S3Client({ region });
    this.bucketName = process.env.S3_DATA_LAKE_BUCKET || 'ioc-data-lake-prod';
  }

  // Generate S3 key with date partitioning
  private generateS3Key(assessmentData: AssessmentData): string {
    const date = new Date(assessmentData.completedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `raw/assessments/year=${year}/month=${month}/day=${day}/assessment_${assessmentData.id}.json`;
  }

  // Upload assessment data to S3
  async uploadAssessment(assessmentData: AssessmentData): Promise<string> {
    const enrichedData = {
      ...assessmentData,
      uploadTimestamp: new Date().toISOString(),
      dataVersion: '1.0',
      processed: false,
      // Add anonymization
      anonymizedData: this.anonymizeData(assessmentData)
    };

    const key = this.generateS3Key(assessmentData);
    
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(enrichedData),
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256',
        Metadata: {
          'assessment-type': assessmentData.type,
          'user-id': assessmentData.userId,
          'upload-source': 'direct-api'
        }
      }));

      console.log(`Assessment uploaded to S3: ${key}`);
      return key;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  // Anonymize sensitive data
  private anonymizeData(data: AssessmentData): Record<string, any> {
    return {
      assessmentId: data.id,
      type: data.type,
      score: data.score,
      duration: data.duration,
      completionDate: data.completedAt.split('T')[0],
      // Hash user ID for privacy
      hashedUserId: this.hashUserId(data.userId),
      // Remove any PII from responses
      sanitizedResponses: this.sanitizeResponses(data.responses)
    };
  }

  private hashUserId(userId: string): string {
    // Simple hash for demo - use proper hashing in production
    return Buffer.from(userId).toString('base64').substring(0, 16);
  }

  private sanitizeResponses(responses: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(responses)) {
      // Remove any fields that might contain PII
      if (!['email', 'name', 'phone', 'address'].some(pii => key.toLowerCase().includes(pii))) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// ===========================
// Phase 2: Lambda Processing Functions
// ===========================

export const processAssessmentHandler = async (event: any) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  
  // Process S3 event
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    try {
      // Get the raw data
      const getObjectResponse = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }));
      
      const rawData = await getObjectResponse.Body?.transformToString();
      if (!rawData) continue;
      
      const assessment = JSON.parse(rawData);
      
      // Transform to analytics format
      const processedData = {
        assessmentId: assessment.id,
        userId: assessment.anonymizedData.hashedUserId,
        type: assessment.type,
        score: assessment.score,
        duration: assessment.duration,
        completionDate: assessment.completedAt,
        // Add calculated metrics
        scorePercentile: calculatePercentile(assessment.score, assessment.type),
        durationCategory: categorizeDuration(assessment.duration),
        // Add metadata for analytics
        processedAt: new Date().toISOString(),
        dataVersion: '1.0'
      };
      
      // Save processed data
      const processedKey = key.replace('raw/', 'processed/').replace('.json', '_processed.json');
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: processedKey,
        Body: JSON.stringify(processedData),
        ContentType: 'application/json'
      }));
      
      console.log(`Processed assessment: ${processedKey}`);
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
    }
  }
};

function calculatePercentile(score: number, type: string): number {
  // Simplified percentile calculation - replace with actual logic
  const maxScores: Record<string, number> = {
    personality: 100,
    skills: 150,
    cognitive: 200,
    behavioral: 100
  };
  
  return Math.round((score / (maxScores[type] || 100)) * 100);
}

function categorizeDuration(duration: number): string {
  if (duration < 300) return 'fast'; // < 5 minutes
  if (duration < 900) return 'normal'; // 5-15 minutes
  if (duration < 1800) return 'slow'; // 15-30 minutes
  return 'very_slow'; // > 30 minutes
}

// ===========================
// Phase 3: Kinesis Firehose Integration (Add at $1K MRR)
// ===========================

export class FirehoseDataStreamer {
  private firehoseClient: FirehoseClient;
  private streamName: string;

  constructor(region: string = 'us-east-1') {
    this.firehoseClient = new FirehoseClient({ region });
    this.streamName = process.env.FIREHOSE_STREAM_NAME || 'ioc-assessment-stream';
  }

  async streamAssessment(assessmentData: AssessmentData): Promise<void> {
    const record = {
      Data: Buffer.from(JSON.stringify({
        ...assessmentData,
        streamTimestamp: new Date().toISOString()
      }))
    };

    try {
      await this.firehoseClient.send(new PutRecordCommand({
        DeliveryStreamName: this.streamName,
        Record: record
      }));
      
      console.log(`Assessment streamed to Firehose: ${assessmentData.id}`);
    } catch (error) {
      console.error('Error streaming to Firehose:', error);
      // Fall back to direct S3 upload
      const uploader = new S3DataLakeUploader();
      await uploader.uploadAssessment(assessmentData);
    }
  }
}

// ===========================
// Phase 4: Athena Query Interface (Add at $5K MRR)
// ===========================

export class AthenaQueryService {
  private athenaClient: AthenaClient;
  private s3OutputLocation: string;
  private database: string;

  constructor(region: string = 'us-east-1') {
    this.athenaClient = new AthenaClient({ region });
    this.s3OutputLocation = `s3://${process.env.S3_DATA_LAKE_BUCKET}/athena-results/`;
    this.database = 'ioc_data_lake';
  }

  async queryAssessments(
    startDate: string,
    endDate: string,
    assessmentType?: string
  ): Promise<any[]> {
    let query = `
      SELECT 
        assessmentId,
        type,
        score,
        scorePercentile,
        duration,
        durationCategory,
        completionDate
      FROM assessments
      WHERE completionDate BETWEEN '${startDate}' AND '${endDate}'
    `;

    if (assessmentType) {
      query += ` AND type = '${assessmentType}'`;
    }

    query += ' ORDER BY completionDate DESC LIMIT 1000';

    try {
      // Start query execution
      const startQueryResponse = await this.athenaClient.send(
        new StartQueryExecutionCommand({
          QueryString: query,
          QueryExecutionContext: {
            Database: this.database
          },
          ResultConfiguration: {
            OutputLocation: this.s3OutputLocation
          }
        })
      );

      const queryExecutionId = startQueryResponse.QueryExecutionId;
      if (!queryExecutionId) throw new Error('No query execution ID returned');

      // Wait for query to complete
      await this.waitForQueryCompletion(queryExecutionId);

      // Get results
      const results = await this.getQueryResults(queryExecutionId);
      return results;
    } catch (error) {
      console.error('Athena query error:', error);
      throw error;
    }
  }

  private async waitForQueryCompletion(queryExecutionId: string): Promise<void> {
    // Implement query status checking
    // This is simplified - add proper polling logic
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async getQueryResults(queryExecutionId: string): Promise<any[]> {
    const response = await this.athenaClient.send(
      new GetQueryResultsCommand({
        QueryExecutionId: queryExecutionId
      })
    );

    // Parse results
    const results: any[] = [];
    const rows = response.ResultSet?.Rows || [];
    const headers = rows[0]?.Data?.map(col => col.VarCharValue) || [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj: any = {};
      row.Data?.forEach((col, index) => {
        obj[headers[index] || ''] = col.VarCharValue;
      });
      results.push(obj);
    }

    return results;
  }
}

// ===========================
// Cost Optimization Utilities
// ===========================

export class S3CostOptimizer {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(region: string = 'us-east-1') {
    this.s3Client = new S3Client({ region });
    this.bucketName = process.env.S3_DATA_LAKE_BUCKET || 'ioc-data-lake-prod';
  }

  // Archive old data to Glacier
  async archiveOldData(daysOld: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      // List objects in processed folder
      const listResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'processed/',
        MaxKeys: 1000
      }));

      const objects = listResponse.Contents || [];
      
      for (const object of objects) {
        if (object.LastModified && object.LastModified < cutoffDate && object.Key) {
          // Move to archive with Glacier storage class
          console.log(`Archiving ${object.Key} to Glacier`);
          // Implementation would include copy with new storage class
        }
      }
    } catch (error) {
      console.error('Error archiving data:', error);
    }
  }

  // Calculate current storage costs
  async calculateStorageCosts(): Promise<{
    totalSizeGB: number;
    estimatedMonthlyCost: number;
    breakdown: Record<string, number>;
  }> {
    const storagePrices = {
      STANDARD: 0.023,        // per GB per month
      STANDARD_IA: 0.0125,    // per GB per month
      GLACIER: 0.004,         // per GB per month
      INTELLIGENT_TIERING: 0.0125  // per GB per month (frequent access tier)
    };

    let totalSize = 0;
    const breakdown: Record<string, number> = {};

    // Calculate sizes for each prefix
    const prefixes = ['raw/', 'processed/', 'archive/'];
    
    for (const prefix of prefixes) {
      const size = await this.calculatePrefixSize(prefix);
      breakdown[prefix] = size;
      totalSize += size;
    }

    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    const estimatedMonthlyCost = totalSizeGB * storagePrices.STANDARD;

    return {
      totalSizeGB,
      estimatedMonthlyCost,
      breakdown
    };
  }

  private async calculatePrefixSize(prefix: string): Promise<number> {
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken
      }));

      const objects = response.Contents || [];
      totalSize += objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return totalSize;
  }
}

// ===========================
// React Component for Monitoring
// ===========================

import React, { useState, useEffect } from 'react';

export const DataLakeMonitor: React.FC = () => {
  const [costs, setCosts] = useState<any>(null);
  const [recentUploads, setRecentUploads] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const optimizer = new S3CostOptimizer();
        const costData = await optimizer.calculateStorageCosts();
        setCosts(costData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading metrics:', error);
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return <div>Loading data lake metrics...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">S3 Data Lake Monitor</h2>
      
      {costs && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-700">Total Storage</h3>
            <p className="text-2xl">{costs.totalSizeGB.toFixed(2)} GB</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-700">Monthly Cost</h3>
            <p className="text-2xl">${costs.estimatedMonthlyCost.toFixed(2)}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded">
            <h3 className="font-semibold text-purple-700">Cost per GB</h3>
            <p className="text-2xl">$0.023</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Storage Breakdown</h3>
        {costs?.breakdown && (
          <div className="space-y-2">
            {Object.entries(costs.breakdown).map(([prefix, size]) => (
              <div key={prefix} className="flex justify-between">
                <span>{prefix}</span>
                <span>{((size as number) / (1024 * 1024 * 1024)).toFixed(3)} GB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 p-4 rounded">
        <h3 className="font-semibold text-yellow-700 mb-2">Cost Optimization Tips</h3>
        <ul className="list-disc list-inside text-sm">
          <li>Enable Intelligent Tiering for automatic cost optimization</li>
          <li>Archive data older than 1 year to Glacier</li>
          <li>Use Parquet format for 70% storage reduction</li>
          <li>Implement lifecycle policies for automatic transitions</li>
        </ul>
      </div>
    </div>
  );
};

export default DataLakeMonitor;