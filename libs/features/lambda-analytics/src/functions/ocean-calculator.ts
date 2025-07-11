/**
 * Lambda Function: OCEAN Score Calculation and Aggregation
 * Memory: 128MB (upgradeable based on MRR)
 * Timeout: 60 seconds
 * Trigger: S3 PUT events on anonymized assessment bucket
 */

import { Context, S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AnonymizedAssessment, OCEANScores, FacetScores } from '../types/assessment';
import { performanceOptimizer } from '../utils/performance';
import { errorHandler } from '../utils/error-handler';
import { costTracker } from '../utils/cost-tracker';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// OCEAN scoring weights and mappings
const OCEAN_WEIGHTS = {
  openness: {
    facets: ['imagination', 'artistic_interests', 'emotionality', 'adventurousness', 'intellect', 'liberalism'],
    weights: [0.17, 0.17, 0.16, 0.17, 0.17, 0.16]
  },
  conscientiousness: {
    facets: ['self_efficacy', 'orderliness', 'dutifulness', 'achievement_striving', 'self_discipline', 'cautiousness'],
    weights: [0.17, 0.17, 0.16, 0.17, 0.17, 0.16]
  },
  extraversion: {
    facets: ['friendliness', 'gregariousness', 'assertiveness', 'activity_level', 'excitement_seeking', 'cheerfulness'],
    weights: [0.17, 0.17, 0.16, 0.17, 0.17, 0.16]
  },
  agreeableness: {
    facets: ['trust', 'morality', 'altruism', 'cooperation', 'modesty', 'sympathy'],
    weights: [0.17, 0.17, 0.16, 0.17, 0.17, 0.16]
  },
  neuroticism: {
    facets: ['anxiety', 'anger', 'depression', 'self_consciousness', 'immoderation', 'vulnerability'],
    weights: [0.17, 0.17, 0.16, 0.17, 0.17, 0.16]
  }
};

export const handler = performanceOptimizer(async (event: S3Event, context: Context) => {
  const startTime = Date.now();
  const results: Array<{ key: string; scores: OCEANScores }> = [];
  
  try {
    await costTracker.trackInvocation('ocean-calculator', 128);
    
    // Process each anonymized assessment
    for (const record of event.Records) {
      try {
        const scores = await processAssessment(record);
        results.push(scores);
        
        // Send to aggregation queue for batch processing
        if (process.env.AGGREGATION_QUEUE_URL) {
          await sendToAggregationQueue(scores);
        }
      } catch (error) {
        await errorHandler.handle(error, {
          function: 'ocean-calculator',
          record: record.s3.object.key
        });
      }
    }
    
    // Batch update metrics
    await updateMetrics(results, Date.now() - startTime);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'OCEAN scores calculated successfully',
        processed: results.length,
        avgProcessingTime: (Date.now() - startTime) / results.length
      })
    };
  } catch (error) {
    await errorHandler.handleCritical(error, context);
    throw error;
  }
});

async function processAssessment(record: any): Promise<{ key: string; scores: OCEANScores }> {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  // Get anonymized assessment data
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(getCommand);
  const data = await response.Body?.transformToString();
  
  if (!data) {
    throw new Error(`No data found for key: ${key}`);
  }
  
  const assessment: AnonymizedAssessment = JSON.parse(data);
  
  // Calculate OCEAN scores
  const oceanScores = calculateOCEANScores(assessment);
  
  // Store calculated scores
  const scoresKey = key.replace('/anonymized/', '/scores/');
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: scoresKey,
    Body: JSON.stringify({
      anonymousUserId: assessment.anonymousUserId,
      sessionId: assessment.sessionId,
      assessmentId: assessment.assessmentId,
      timestamp: assessment.timestamp,
      scores: oceanScores,
      metadata: {
        calculatedAt: new Date().toISOString(),
        scoringVersion: '2.0',
        confidenceLevel: calculateConfidence(assessment)
      }
    }),
    ContentType: 'application/json'
  });
  
  await s3Client.send(putCommand);
  
  return { key: scoresKey, scores: oceanScores };
}

function calculateOCEANScores(assessment: AnonymizedAssessment): OCEANScores {
  const facetScores: FacetScores = calculateFacetScores(assessment.responses);
  
  const scores: OCEANScores = {
    openness: calculateDimensionScore('openness', facetScores),
    conscientiousness: calculateDimensionScore('conscientiousness', facetScores),
    extraversion: calculateDimensionScore('extraversion', facetScores),
    agreeableness: calculateDimensionScore('agreeableness', facetScores),
    neuroticism: calculateDimensionScore('neuroticism', facetScores),
    
    // Additional metrics
    consistency: calculateConsistency(assessment.responses),
    completeness: calculateCompleteness(assessment.responses),
    
    // Facet breakdown
    facets: facetScores,
    
    // Dark side indicators (if applicable)
    darkSideIndicators: calculateDarkSideIndicators(facetScores)
  };
  
  return scores;
}

function calculateFacetScores(responses: any[]): FacetScores {
  const facetScores: FacetScores = {};
  
  // Group responses by facet
  const facetResponses: Record<string, number[]> = {};
  
  responses.forEach(response => {
    const facet = mapQuestionToFacet(response.questionId);
    if (facet) {
      if (!facetResponses[facet]) {
        facetResponses[facet] = [];
      }
      facetResponses[facet].push(normalizeResponse(response.answer));
    }
  });
  
  // Calculate average score for each facet
  Object.entries(facetResponses).forEach(([facet, scores]) => {
    facetScores[facet] = {
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
      responses: scores.length,
      standardDeviation: calculateStandardDeviation(scores)
    };
  });
  
  return facetScores;
}

function calculateDimensionScore(dimension: string, facetScores: FacetScores): number {
  const config = OCEAN_WEIGHTS[dimension as keyof typeof OCEAN_WEIGHTS];
  if (!config) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  config.facets.forEach((facet, index) => {
    const facetData = facetScores[facet];
    if (facetData && facetData.responses > 0) {
      weightedSum += facetData.score * config.weights[index];
      totalWeight += config.weights[index];
    }
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function calculateDarkSideIndicators(facetScores: FacetScores): Record<string, number> {
  // Calculate dark side personality indicators based on extreme facet scores
  const indicators: Record<string, number> = {};
  
  // Machiavellianism indicators
  const machScore = (
    (100 - (facetScores.morality?.score || 50)) * 0.3 +
    (100 - (facetScores.altruism?.score || 50)) * 0.3 +
    (facetScores.assertiveness?.score || 50) * 0.2 +
    (100 - (facetScores.modesty?.score || 50)) * 0.2
  ) / 100;
  
  // Narcissism indicators  
  const narcScore = (
    (100 - (facetScores.modesty?.score || 50)) * 0.3 +
    (facetScores.assertiveness?.score || 50) * 0.2 +
    (facetScores.self_efficacy?.score || 50) * 0.2 +
    (100 - (facetScores.sympathy?.score || 50)) * 0.3
  ) / 100;
  
  // Psychopathy indicators
  const psychScore = (
    (100 - (facetScores.sympathy?.score || 50)) * 0.3 +
    (100 - (facetScores.anxiety?.score || 50)) * 0.2 +
    (facetScores.excitement_seeking?.score || 50) * 0.2 +
    (100 - (facetScores.morality?.score || 50)) * 0.3
  ) / 100;
  
  if (machScore > 0.6) indicators.machiavellianism = machScore;
  if (narcScore > 0.6) indicators.narcissism = narcScore;
  if (psychScore > 0.6) indicators.psychopathy = psychScore;
  
  return indicators;
}

function mapQuestionToFacet(questionId: string): string | null {
  // This would be loaded from a configuration or database
  // For now, using a simple mapping
  const questionFacetMap: Record<string, string> = {
    'q1': 'imagination',
    'q2': 'artistic_interests',
    'q3': 'emotionality',
    'q4': 'adventurousness',
    'q5': 'intellect',
    'q6': 'liberalism',
    // ... more mappings
  };
  
  return questionFacetMap[questionId] || null;
}

function normalizeResponse(answer: any): number {
  // Normalize response to 0-100 scale
  if (typeof answer === 'number') {
    return Math.max(0, Math.min(100, answer));
  }
  
  // Handle Likert scale responses
  const likertMap: Record<string, number> = {
    'strongly_disagree': 0,
    'disagree': 25,
    'neutral': 50,
    'agree': 75,
    'strongly_agree': 100
  };
  
  return likertMap[answer.toLowerCase()] || 50;
}

function calculateConsistency(responses: any[]): number {
  // Calculate internal consistency (simplified Cronbach's alpha)
  // In production, this would use proper psychometric calculations
  const reversePairs = findReversePairs(responses);
  if (reversePairs.length === 0) return 1;
  
  const correlations = reversePairs.map(pair => {
    const diff = Math.abs(pair[0] - (100 - pair[1]));
    return 1 - (diff / 100);
  });
  
  return correlations.reduce((a, b) => a + b, 0) / correlations.length;
}

function calculateCompleteness(responses: any[]): number {
  const expectedQuestions = 120; // Standard OCEAN assessment
  return Math.min(1, responses.length / expectedQuestions);
}

function calculateConfidence(assessment: AnonymizedAssessment): number {
  const completeness = calculateCompleteness(assessment.responses);
  const avgResponseTime = assessment.responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / assessment.responses.length;
  
  // Penalize very fast responses (likely not thoughtful)
  const timePenalty = avgResponseTime < 2000 ? 0.5 : 1;
  
  return completeness * timePenalty;
}

function findReversePairs(responses: any[]): number[][] {
  // Find reverse-coded question pairs for consistency checking
  // This would be configured based on the assessment design
  return [];
}

function calculateStandardDeviation(scores: number[]): number {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

async function sendToAggregationQueue(result: { key: string; scores: OCEANScores }): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: process.env.AGGREGATION_QUEUE_URL!,
    MessageBody: JSON.stringify({
      type: 'ocean_scores',
      data: result,
      timestamp: new Date().toISOString()
    }),
    MessageAttributes: {
      scoreType: {
        DataType: 'String',
        StringValue: 'ocean'
      }
    }
  });
  
  await sqsClient.send(command);
}

async function updateMetrics(results: any[], duration: number): Promise<void> {
  // CloudWatch metrics update would go here
  // Keeping it simple for cost optimization
}