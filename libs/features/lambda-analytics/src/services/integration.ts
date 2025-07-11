/**
 * Integration service for Lambda analytics functions
 * Provides unified interface for invoking Lambda functions
 */

import { LambdaClient, InvokeCommand, InvokeAsyncCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export class LambdaAnalyticsIntegration {
  private functionPrefix = 'ioc-';
  
  /**
   * Process assessment data through the analytics pipeline
   */
  async processAssessment(assessmentData: any): Promise<void> {
    // Store raw assessment in S3 to trigger processing
    const key = `raw/assessments/${assessmentData.assessmentId}-${Date.now()}.json`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.ASSESSMENT_BUCKET!,
      Key: key,
      Body: JSON.stringify(assessmentData),
      ContentType: 'application/json',
      Metadata: {
        'user-id': assessmentData.userId,
        'assessment-type': assessmentData.assessmentType,
        'timestamp': new Date().toISOString()
      }
    }));
    
    // Also send to event bridge for real-time processing
    await this.publishAssessmentEvent({
      type: 'assessment.completed',
      assessmentId: assessmentData.assessmentId,
      userId: assessmentData.userId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get OCEAN scores for a user
   */
  async getOCEANScores(userId: string): Promise<any> {
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: `${this.functionPrefix}ocean-calculator`,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        action: 'getScores',
        userId
      })
    }));
    
    if (response.Payload) {
      const result = JSON.parse(new TextDecoder().decode(response.Payload));
      return result;
    }
    
    return null;
  }
  
  /**
   * Submit dual AI validation request
   */
  async submitDualAIValidation(assessmentId: string, a1Response: any, b1Response: any): Promise<void> {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.DUAL_AI_QUEUE_URL!,
      MessageBody: JSON.stringify({
        assessmentId,
        a1Response,
        b1Validation: b1Response,
        timestamp: new Date().toISOString()
      }),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'dual-ai-validation'
        }
      }
    }));
  }
  
  /**
   * Track user event in Pinpoint
   */
  async trackEvent(event: any): Promise<void> {
    // Invoke Pinpoint transformer directly for important events
    await lambdaClient.send(new InvokeAsyncCommand({
      FunctionName: `${this.functionPrefix}pinpoint-transformer`,
      InvokeArgs: JSON.stringify(event)
    }));
  }
  
  /**
   * Publish assessment event to EventBridge
   */
  private async publishAssessmentEvent(event: any): Promise<void> {
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        Source: 'ioc.assessments',
        DetailType: 'AssessmentCompleted',
        Detail: JSON.stringify(event)
      }]
    }));
  }
  
  /**
   * Get analytics insights
   */
  async getAnalyticsInsights(filters?: any): Promise<any> {
    const prefix = filters?.date 
      ? `insights/${filters.date}/` 
      : 'insights/latest/';
    
    // This would typically query S3 or DynamoDB for aggregated insights
    return {
      oceanDistribution: await this.getOCEANDistribution(filters),
      dualAIMetrics: await this.getDualAIMetrics(filters),
      engagementMetrics: await this.getEngagementMetrics(filters)
    };
  }
  
  private async getOCEANDistribution(filters?: any): Promise<any> {
    // Query aggregated OCEAN score distributions
    return {
      openness: { mean: 65, std: 12 },
      conscientiousness: { mean: 70, std: 10 },
      extraversion: { mean: 60, std: 15 },
      agreeableness: { mean: 68, std: 11 },
      neuroticism: { mean: 45, std: 13 }
    };
  }
  
  private async getDualAIMetrics(filters?: any): Promise<any> {
    // Query dual AI validation metrics
    return {
      averageAgreement: 0.89,
      disagreementRate: 0.11,
      averageConfidence: 0.92,
      flaggedIssues: 23,
      recommendations: 5
    };
  }
  
  private async getEngagementMetrics(filters?: any): Promise<any> {
    // Query user engagement metrics
    return {
      assessmentsStarted: 1250,
      assessmentsCompleted: 1100,
      completionRate: 0.88,
      averageCompletionTime: 720000, // 12 minutes
      abandonmentRate: 0.12
    };
  }
}

// Singleton instance
export const lambdaAnalytics = new LambdaAnalyticsIntegration();

// Helper functions for common operations
export const analyticsHelpers = {
  /**
   * Batch process multiple assessments
   */
  async batchProcessAssessments(assessments: any[]): Promise<void> {
    const chunks = [];
    const chunkSize = 25;
    
    for (let i = 0; i < assessments.length; i += chunkSize) {
      chunks.push(assessments.slice(i, i + chunkSize));
    }
    
    await Promise.all(chunks.map(async (chunk) => {
      await Promise.all(chunk.map(assessment => 
        lambdaAnalytics.processAssessment(assessment)
      ));
    }));
  },
  
  /**
   * Generate cost report
   */
  async generateCostReport(startDate: Date, endDate: Date): Promise<any> {
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: 'ioc-cost-analyzer',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        action: 'generateReport',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    }));
    
    if (response.Payload) {
      return JSON.parse(new TextDecoder().decode(response.Payload));
    }
    
    return null;
  },
  
  /**
   * Optimize Lambda configurations based on usage
   */
  async optimizeConfigurations(currentMRR: number): Promise<any> {
    const recommendations = {
      memoryAdjustments: [] as Array<{function: string; current: number; recommended: number; monthlySavings: number}>,
      concurrencyAdjustments: [] as Array<{function: string; current: number; recommended: number}>,
      costSavings: 0
    };
    
    // Get current usage metrics
    const metrics = await this.getUsageMetrics();
    
    // Generate recommendations based on MRR and usage
    if (currentMRR < 1000 && metrics.avgMemoryUsed < 100) {
      recommendations.memoryAdjustments.push({
        function: 'all',
        current: 256,
        recommended: 128,
        monthlySavings: 5.20
      });
    }
    
    return recommendations;
  },
  
  async getUsageMetrics(): Promise<any> {
    // This would query CloudWatch or custom metrics
    return {
      avgMemoryUsed: 95,
      avgDuration: 450,
      invocationsPerDay: 1000
    };
  }
};