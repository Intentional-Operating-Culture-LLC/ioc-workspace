/**
 * Lambda Function: Dual-AI Metrics Processing
 * Memory: 128MB (cost-optimized)
 * Timeout: 45 seconds
 * Trigger: SQS Queue from assessment completion
 */

import { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DualAIMetrics, AIValidationResult, DisagreementAnalysis } from '../types/dual-ai';
import { performanceOptimizer } from '../utils/performance';
import { errorHandler } from '../utils/error-handler';
import { costTracker } from '../utils/cost-tracker';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

// Thresholds for cost-based scaling
const CONFIDENCE_THRESHOLD = 0.85;
const DISAGREEMENT_THRESHOLD = 0.15;

export const handler = performanceOptimizer(async (event: SQSEvent, context: Context) => {
  const startTime = Date.now();
  const metrics: DualAIMetrics[] = [];
  
  try {
    await costTracker.trackInvocation('dual-ai-processor', 128);
    
    // Process SQS messages in batches for efficiency
    const batchResults = await processBatch(event.Records);
    
    // Aggregate metrics
    for (const result of batchResults) {
      if (result.success) {
        metrics.push(result.metrics!);
        
        // Only trigger events for significant disagreements
        if (result.metrics!.combinedMetrics.disagreementRate > DISAGREEMENT_THRESHOLD) {
          await triggerDisagreementAnalysis(result.metrics!);
        }
      }
    }
    
    // Store aggregated metrics
    if (metrics.length > 0) {
      await storeMetricsBatch(metrics);
    }
    
    // Send performance metrics
    await sendPerformanceMetrics({
      processed: metrics.length,
      failed: batchResults.filter(r => !r.success).length,
      avgConfidence: metrics.reduce((sum, m) => sum + m.combinedMetrics.averageConfidence, 0) / metrics.length,
      duration: Date.now() - startTime
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Dual-AI metrics processed successfully',
        processed: metrics.length,
        avgProcessingTime: (Date.now() - startTime) / event.Records.length
      })
    };
  } catch (error) {
    await errorHandler.handleCritical(error, context);
    throw error;
  }
});

async function processBatch(records: SQSRecord[]): Promise<Array<{
  success: boolean;
  metrics?: DualAIMetrics;
  error?: Error;
}>> {
  return Promise.all(records.map(async (record) => {
    try {
      const data = JSON.parse(record.body);
      const metrics = await processDualAIValidation(data);
      return { success: true, metrics };
    } catch (error) {
      await errorHandler.handle(error, {
        function: 'dual-ai-processor',
        messageId: record.messageId
      });
      return { success: false, error: error as Error };
    }
  }));
}

async function processDualAIValidation(data: any): Promise<DualAIMetrics> {
  const { assessmentId, a1Response, b1Validation, timestamp } = data;
  
  // Calculate validation metrics
  const validationResult = analyzeValidation(a1Response, b1Validation);
  
  // Calculate cost-efficient metrics
  const metrics: DualAIMetrics = {
    assessmentId,
    timestamp: new Date(timestamp),
    
    // A1 Generator Metrics
    a1Metrics: {
      responseTime: a1Response.processingTime,
      confidence: a1Response.confidence,
      tokensUsed: a1Response.tokensUsed || 0,
      modelVersion: a1Response.modelVersion,
      costEstimate: calculateA1Cost(a1Response.tokensUsed || 0)
    },
    
    // B1 Validator Metrics
    b1Metrics: {
      validationTime: b1Validation.processingTime,
      agreementScore: validationResult.agreementScore,
      flaggedIssues: validationResult.issues.length,
      modelVersion: b1Validation.modelVersion,
      costEstimate: calculateB1Cost(b1Validation.tokensUsed || 0)
    },
    
    // Combined Metrics
    combinedMetrics: {
      totalProcessingTime: a1Response.processingTime + b1Validation.processingTime,
      disagreementRate: validationResult.disagreementRate,
      averageConfidence: (a1Response.confidence + validationResult.confidence) / 2,
      qualityScore: calculateQualityScore(validationResult),
      totalCost: calculateTotalCost(a1Response, b1Validation)
    },
    
    // Disagreement Analysis
    disagreements: validationResult.disagreements,
    
    // Performance Indicators
    performance: {
      withinSLA: (a1Response.processingTime + b1Validation.processingTime) < 5000,
      highConfidence: validationResult.confidence > CONFIDENCE_THRESHOLD,
      costEfficient: calculateTotalCost(a1Response, b1Validation) < 0.01
    }
  };
  
  return metrics;
}

function analyzeValidation(a1Response: any, b1Validation: any): AIValidationResult {
  const issues: string[] = [];
  const disagreements: DisagreementAnalysis[] = [];
  
  // Compare OCEAN scores
  const scoreComparison = compareOCEANScores(
    a1Response.oceanScores,
    b1Validation.oceanScores
  );
  
  // Analyze facet-level disagreements
  Object.entries(scoreComparison.facetDifferences).forEach(([facet, diff]) => {
    if (Math.abs(diff as number) > 10) {
      disagreements.push({
        facet,
        a1Score: a1Response.oceanScores.facets[facet],
        b1Score: b1Validation.oceanScores.facets[facet],
        difference: diff as number,
        severity: Math.abs(diff as number) > 20 ? 'high' : 'medium'
      });
    }
  });
  
  // Check for systematic biases
  const biasIndicators = detectBiases(a1Response, b1Validation);
  if (biasIndicators.length > 0) {
    issues.push(...biasIndicators);
  }
  
  // Calculate agreement score
  const agreementScore = calculateAgreementScore(scoreComparison);
  
  return {
    agreementScore,
    disagreementRate: 1 - agreementScore,
    confidence: calculateValidationConfidence(a1Response, b1Validation),
    issues,
    disagreements,
    recommendations: generateRecommendations(disagreements, issues)
  };
}

function compareOCEANScores(a1Scores: any, b1Scores: any): any {
  const dimensionDifferences: Record<string, number> = {};
  const facetDifferences: Record<string, number> = {};
  
  // Compare main dimensions
  ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'].forEach(dim => {
    dimensionDifferences[dim] = a1Scores[dim] - b1Scores[dim];
  });
  
  // Compare facets
  if (a1Scores.facets && b1Scores.facets) {
    Object.keys(a1Scores.facets).forEach(facet => {
      if (b1Scores.facets[facet]) {
        facetDifferences[facet] = 
          a1Scores.facets[facet].score - b1Scores.facets[facet].score;
      }
    });
  }
  
  return { dimensionDifferences, facetDifferences };
}

function detectBiases(a1Response: any, b1Validation: any): string[] {
  const biases: string[] = [];
  
  // Check for systematic over/under estimation
  const avgDiff = calculateAverageDifference(a1Response.oceanScores, b1Validation.oceanScores);
  if (Math.abs(avgDiff) > 5) {
    biases.push(`Systematic ${avgDiff > 0 ? 'over' : 'under'}-estimation detected`);
  }
  
  // Check for response pattern biases
  if (a1Response.patternAnalysis?.centralTendency > 0.7) {
    biases.push('Central tendency bias detected in A1 responses');
  }
  
  // Check for extreme response bias
  if (hasExtremeResponseBias(a1Response.oceanScores)) {
    biases.push('Extreme response bias detected');
  }
  
  return biases;
}

function calculateAgreementScore(comparison: any): number {
  const weights = { dimension: 0.6, facet: 0.4 };
  
  // Calculate dimension agreement
  const dimScores = Object.values(comparison.dimensionDifferences)
    .map((diff: any) => 1 - Math.min(Math.abs(diff) / 20, 1));
  const dimAgreement = dimScores.reduce((a: number, b: number) => a + b, 0) / dimScores.length;
  
  // Calculate facet agreement
  const facetScores = Object.values(comparison.facetDifferences)
    .map((diff: any) => 1 - Math.min(Math.abs(diff) / 20, 1));
  const facetAgreement = facetScores.length > 0 
    ? facetScores.reduce((a: number, b: number) => a + b, 0) / facetScores.length
    : dimAgreement;
  
  return weights.dimension * dimAgreement + weights.facet * facetAgreement;
}

function calculateValidationConfidence(a1Response: any, b1Validation: any): number {
  const factors = {
    modelConfidence: (a1Response.confidence + b1Validation.confidence) / 2,
    processingTimeRatio: Math.min(a1Response.processingTime / b1Validation.processingTime, 2) / 2,
    consistencyScore: b1Validation.consistencyScore || 0.5
  };
  
  return Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
}

function calculateQualityScore(validationResult: AIValidationResult): number {
  const weights = {
    agreement: 0.4,
    confidence: 0.3,
    issueCount: 0.2,
    disagreementSeverity: 0.1
  };
  
  const issueScore = Math.max(0, 1 - (validationResult.issues.length / 10));
  const severityScore = validationResult.disagreements.length > 0
    ? 1 - (validationResult.disagreements.filter(d => d.severity === 'high').length / validationResult.disagreements.length)
    : 1;
  
  return (
    weights.agreement * validationResult.agreementScore +
    weights.confidence * validationResult.confidence +
    weights.issueCount * issueScore +
    weights.disagreementSeverity * severityScore
  );
}

function generateRecommendations(disagreements: DisagreementAnalysis[], issues: string[]): string[] {
  const recommendations: string[] = [];
  
  // High disagreement recommendations
  const highDisagreements = disagreements.filter(d => d.severity === 'high');
  if (highDisagreements.length > 0) {
    recommendations.push('Consider human review for high-disagreement facets');
  }
  
  // Pattern-based recommendations
  if (disagreements.length > 5) {
    recommendations.push('Multiple disagreements detected - consider model recalibration');
  }
  
  // Bias recommendations
  if (issues.some(i => i.includes('bias'))) {
    recommendations.push('Bias detected - review training data distribution');
  }
  
  return recommendations;
}

function calculateAverageDifference(a1Scores: any, b1Scores: any): number {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  const diffs = dimensions.map(dim => a1Scores[dim] - b1Scores[dim]);
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

function hasExtremeResponseBias(scores: any): boolean {
  const values = Object.values(scores).filter(v => typeof v === 'number') as number[];
  const extremeCount = values.filter(v => v < 20 || v > 80).length;
  return extremeCount / values.length > 0.6;
}

// Cost calculation functions (simplified for MVP)
function calculateA1Cost(tokens: number): number {
  const costPer1kTokens = 0.002; // Adjust based on model
  return (tokens / 1000) * costPer1kTokens;
}

function calculateB1Cost(tokens: number): number {
  const costPer1kTokens = 0.001; // Validation is cheaper
  return (tokens / 1000) * costPer1kTokens;
}

function calculateTotalCost(a1Response: any, b1Response: any): number {
  return calculateA1Cost(a1Response.tokensUsed || 0) + 
         calculateB1Cost(b1Response.tokensUsed || 0);
}

async function storeMetricsBatch(metrics: DualAIMetrics[]): Promise<void> {
  const timestamp = new Date().toISOString();
  const key = `dual-ai-metrics/${timestamp.split('T')[0]}/batch-${Date.now()}.json`;
  
  const putCommand = new PutObjectCommand({
    Bucket: process.env.METRICS_BUCKET!,
    Key: key,
    Body: JSON.stringify({
      batchId: `batch-${Date.now()}`,
      timestamp,
      metrics,
      summary: {
        count: metrics.length,
        avgConfidence: metrics.reduce((sum, m) => sum + m.combinedMetrics.averageConfidence, 0) / metrics.length,
        avgDisagreement: metrics.reduce((sum, m) => sum + m.combinedMetrics.disagreementRate, 0) / metrics.length,
        totalCost: metrics.reduce((sum, m) => sum + m.combinedMetrics.totalCost, 0)
      }
    }),
    ContentType: 'application/json',
    Metadata: {
      'metric-type': 'dual-ai-validation',
      'batch-size': metrics.length.toString()
    }
  });
  
  await s3Client.send(putCommand);
}

async function triggerDisagreementAnalysis(metrics: DualAIMetrics): Promise<void> {
  if (metrics.combinedMetrics.disagreementRate <= DISAGREEMENT_THRESHOLD) {
    return;
  }
  
  const putEventsCommand = new PutEventsCommand({
    Entries: [{
      Source: 'ioc.analytics.dual-ai',
      DetailType: 'HighDisagreementDetected',
      Detail: JSON.stringify({
        assessmentId: metrics.assessmentId,
        disagreementRate: metrics.combinedMetrics.disagreementRate,
        disagreements: metrics.disagreements,
        timestamp: metrics.timestamp
      })
    }]
  });
  
  await eventBridgeClient.send(putEventsCommand);
}

async function sendPerformanceMetrics(metrics: any): Promise<void> {
  // CloudWatch metrics would be sent here
  // Keeping minimal for cost optimization
}