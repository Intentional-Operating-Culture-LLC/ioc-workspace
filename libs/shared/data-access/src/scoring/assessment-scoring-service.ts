/**
 * Assessment Scoring Service
 * Integrates OCEAN scoring with the existing assessment system
 */

import { createClient } from '@supabase/supabase-js';
import { 
  calculateOceanScores, 
  aggregateOceanScores,
  interpretOceanProfile,
  OceanScoreDetails,
  QuestionTraitMapping
} from './ocean-scoring';
import { 
  generateQuestionMappings,
  IOC_OCEAN_MAPPINGS,
  adjustTraitScoreByConfidence
} from './ocean-mapping';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ScoringResult {
  responseId: string;
  assessmentId: string;
  scores: {
    ocean: OceanScoreDetails;
    pillars?: { [pillar: string]: number };
    domains?: { [domain: string]: number };
  };
  interpretation: {
    strengths: string[];
    challenges: string[];
    recommendations: string[];
  };
  metadata: {
    scoringVersion: string;
    scoredAt: string;
    confidenceLevel: number;
  };
}

/**
 * Score an assessment response
 */
export async function scoreAssessmentResponse(
  responseId: string
): Promise<ScoringResult> {
  try {
    // Fetch response with questions and assessment details
    const { data: response, error: responseError } = await supabase
      .from('assessment_responses')
      .select(`
        *,
        assessment:assessments!inner(
          id,
          type,
          settings,
          questions:assessment_questions(
            id,
            question_text,
            question_type,
            metadata
          )
        ),
        question_responses:assessment_question_responses(
          question_id,
          answer_value,
          answer_data,
          confidence_score,
          time_spent_seconds
        )
      `)
      .eq('id', responseId)
      .single();

    if (responseError) throw responseError;

    // Prepare question data with domains from metadata
    const questionsWithDomains = response.assessment.questions.map((q: any) => ({
      id: q.id,
      domain: q.metadata?.domain || 'general',
      question_text: q.question_text,
      question_type: q.question_type,
      metadata: q.metadata
    }));

    // Generate or use existing mappings
    const mappings = getOrGenerateMappings(
      response.assessment.type,
      questionsWithDomains
    );

    // Prepare responses for scoring
    const scorableResponses = response.question_responses.map((qr: any) => ({
      questionId: qr.question_id,
      answer: qr.answer_value || qr.answer_data,
      confidence: qr.confidence_score,
      metadata: qr.answer_data
    }));

    // Calculate OCEAN scores
    const oceanScores = calculateOceanScores(scorableResponses, mappings);

    // Adjust scores based on confidence if available
    const adjustedOceanScores = adjustScoresByConfidence(
      oceanScores,
      scorableResponses
    );

    // Calculate pillar and domain scores
    const pillarScores = calculatePillarScores(scorableResponses, questionsWithDomains);
    const domainScores = calculateDomainScores(scorableResponses, questionsWithDomains);

    // Generate interpretation
    const interpretation = interpretOceanProfile(adjustedOceanScores);

    // Save scores to database
    await saveScoresToDatabase({
      responseId,
      assessmentId: response.assessment_id,
      oceanScores: adjustedOceanScores,
      pillarScores,
      domainScores
    });

    return {
      responseId,
      assessmentId: response.assessment_id,
      scores: {
        ocean: adjustedOceanScores,
        pillars: pillarScores,
        domains: domainScores
      },
      interpretation,
      metadata: {
        scoringVersion: '1.0.0',
        scoredAt: new Date().toISOString(),
        confidenceLevel: calculateOverallConfidence(scorableResponses)
      }
    };
  } catch (error) {
    console.error('Error scoring assessment response:', error);
    throw error;
  }
}

/**
 * Score multiple responses (e.g., for 360 feedback)
 */
export async function scoreMultipleResponses(
  responseIds: string[],
  weights?: number[]
): Promise<ScoringResult> {
  try {
    // Score each response individually
    const individualScores = await Promise.all(
      responseIds.map(id => scoreAssessmentResponse(id))
    );

    // Extract OCEAN scores
    const oceanScores = individualScores.map(result => result.scores.ocean);

    // Aggregate OCEAN scores
    const aggregatedOcean = aggregateOceanScores(oceanScores, weights);

    // Aggregate other scores
    const aggregatedPillars = aggregateScoreObjects(
      individualScores.map(r => r.scores.pillars || {}),
      weights
    );

    const aggregatedDomains = aggregateScoreObjects(
      individualScores.map(r => r.scores.domains || {}),
      weights
    );

    // Generate combined interpretation
    const interpretation = interpretOceanProfile(aggregatedOcean);

    // Get assessment ID from first response
    const assessmentId = individualScores[0].assessmentId;

    return {
      responseId: `aggregated_${responseIds.join('_')}`,
      assessmentId,
      scores: {
        ocean: aggregatedOcean,
        pillars: aggregatedPillars,
        domains: aggregatedDomains
      },
      interpretation,
      metadata: {
        scoringVersion: '1.0.0',
        scoredAt: new Date().toISOString(),
        confidenceLevel: calculateAggregateConfidence(individualScores)
      }
    };
  } catch (error) {
    console.error('Error scoring multiple responses:', error);
    throw error;
  }
}

/**
 * Get or generate trait mappings for assessment type
 */
function getOrGenerateMappings(
  assessmentType: string,
  questions: any[]
): QuestionTraitMapping[] {
  // Check for predefined mappings
  const predefinedMappings = IOC_OCEAN_MAPPINGS[assessmentType];
  
  if (predefinedMappings && predefinedMappings.length > 0) {
    return predefinedMappings;
  }

  // Generate mappings based on question domains
  return generateQuestionMappings(questions);
}

/**
 * Adjust OCEAN scores based on confidence scores
 */
function adjustScoresByConfidence(
  scores: OceanScoreDetails,
  responses: any[]
): OceanScoreDetails {
  const avgConfidence = calculateOverallConfidence(responses);
  
  // If confidence is high, return scores as-is
  if (avgConfidence > 80) {
    return scores;
  }

  // Adjust raw scores toward neutral based on confidence
  const adjustedRaw = { ...scores.raw };
  Object.keys(adjustedRaw).forEach(trait => {
    adjustedRaw[trait as keyof typeof adjustedRaw] = adjustTraitScoreByConfidence(
      adjustedRaw[trait as keyof typeof adjustedRaw],
      avgConfidence
    );
  });

  // Recalculate percentiles and stanines
  return {
    ...scores,
    raw: adjustedRaw
  };
}

/**
 * Calculate pillar scores from responses
 */
function calculatePillarScores(
  responses: any[],
  questions: any[]
): { [pillar: string]: number } {
  const pillarScores: { [key: string]: number[] } = {
    sustainable: [],
    performance: [],
    potential: []
  };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question?.metadata?.pillar) return;

    const score = normalizeScore(response.answer);
    pillarScores[question.metadata.pillar]?.push(score);
  });

  const result: { [key: string]: number } = {};
  Object.entries(pillarScores).forEach(([pillar, scores]) => {
    if (scores.length > 0) {
      result[pillar] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });

  return result;
}

/**
 * Calculate domain scores from responses
 */
function calculateDomainScores(
  responses: any[],
  questions: any[]
): { [domain: string]: number } {
  const domainScores: { [key: string]: number[] } = {};

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    const domain = question?.domain || question?.metadata?.domain;
    
    if (!domain) return;

    if (!domainScores[domain]) {
      domainScores[domain] = [];
    }

    const score = normalizeScore(response.answer);
    domainScores[domain].push(score);
  });

  const result: { [key: string]: number } = {};
  Object.entries(domainScores).forEach(([domain, scores]) => {
    if (scores.length > 0) {
      result[domain] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });

  return result;
}

/**
 * Normalize answer to numeric score
 */
function normalizeScore(answer: any): number {
  if (typeof answer === 'number') {
    return Math.max(1, Math.min(5, answer));
  }
  
  if (typeof answer === 'string') {
    const numericValue = parseFloat(answer);
    if (!isNaN(numericValue)) {
      return Math.max(1, Math.min(5, numericValue));
    }
  }
  
  return 3; // Default to neutral
}

/**
 * Calculate overall confidence level
 */
function calculateOverallConfidence(responses: any[]): number {
  const confidenceScores = responses
    .map(r => r.confidence || 100)
    .filter(c => c > 0);

  if (confidenceScores.length === 0) return 100;

  return confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
}

/**
 * Calculate aggregate confidence
 */
function calculateAggregateConfidence(results: ScoringResult[]): number {
  const confidenceLevels = results.map(r => r.metadata.confidenceLevel);
  return confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;
}

/**
 * Aggregate score objects with weights
 */
function aggregateScoreObjects(
  scoreObjects: { [key: string]: number }[],
  weights?: number[]
): { [key: string]: number } {
  if (scoreObjects.length === 0) return {};

  const normalizedWeights = weights || new Array(scoreObjects.length).fill(1);
  const totalWeight = normalizedWeights.reduce((a, b) => a + b, 0);

  const aggregated: { [key: string]: number } = {};

  scoreObjects.forEach((scores, index) => {
    const weight = normalizedWeights[index] / totalWeight;
    
    Object.entries(scores).forEach(([key, value]) => {
      if (!aggregated[key]) {
        aggregated[key] = 0;
      }
      aggregated[key] += value * weight;
    });
  });

  return aggregated;
}

/**
 * Save scores to database
 */
async function saveScoresToDatabase(data: {
  responseId: string;
  assessmentId: string;
  oceanScores: OceanScoreDetails;
  pillarScores?: { [key: string]: number };
  domainScores?: { [key: string]: number };
}): Promise<void> {
  try {
    // Save OCEAN scores
    const oceanRecords = Object.entries(data.oceanScores.raw).map(([trait, score]) => ({
      assessment_id: data.assessmentId,
      response_id: data.responseId,
      dimension: `ocean_${trait}`,
      score: data.oceanScores.percentile[trait as keyof typeof data.oceanScores.percentile],
      raw_score: score,
      percentile: data.oceanScores.percentile[trait as keyof typeof data.oceanScores.percentile],
      stanine: data.oceanScores.stanine[trait as keyof typeof data.oceanScores.stanine],
      scoring_rules: {
        version: '1.0.0',
        type: 'ocean',
        trait
      }
    }));

    // Save pillar scores if available
    const pillarRecords = data.pillarScores
      ? Object.entries(data.pillarScores).map(([pillar, score]) => ({
          assessment_id: data.assessmentId,
          response_id: data.responseId,
          dimension: `pillar_${pillar}`,
          score,
          raw_score: score,
          scoring_rules: {
            version: '1.0.0',
            type: 'pillar',
            pillar
          }
        }))
      : [];

    // Save domain scores if available
    const domainRecords = data.domainScores
      ? Object.entries(data.domainScores).map(([domain, score]) => ({
          assessment_id: data.assessmentId,
          response_id: data.responseId,
          dimension: `domain_${domain}`,
          score,
          raw_score: score,
          scoring_rules: {
            version: '1.0.0',
            type: 'domain',
            domain
          }
        }))
      : [];

    // Combine all records
    const allRecords = [...oceanRecords, ...pillarRecords, ...domainRecords];

    // Delete existing scores for this response
    await supabase
      .from('assessment_scores')
      .delete()
      .eq('response_id', data.responseId);

    // Insert new scores
    const { error } = await supabase
      .from('assessment_scores')
      .insert(allRecords);

    if (error) throw error;

    // Update response with scoring timestamp
    await supabase
      .from('assessment_responses')
      .update({ 
        scored_at: new Date().toISOString(),
        scoring_metadata: {
          ocean_scores: data.oceanScores,
          version: '1.0.0'
        }
      })
      .eq('id', data.responseId);

  } catch (error) {
    console.error('Error saving scores to database:', error);
    throw error;
  }
}

/**
 * Get assessment scores
 */
export async function getAssessmentScores(
  responseId: string
): Promise<ScoringResult | null> {
  try {
    const { data: scores, error } = await supabase
      .from('assessment_scores')
      .select('*')
      .eq('response_id', responseId);

    if (error) throw error;
    if (!scores || scores.length === 0) return null;

    // Reconstruct OCEAN scores
    const oceanScores: any = {
      raw: {},
      percentile: {},
      stanine: {}
    };

    scores.forEach(score => {
      if (score.dimension.startsWith('ocean_')) {
        const trait = score.dimension.replace('ocean_', '');
        oceanScores.raw[trait] = score.raw_score;
        oceanScores.percentile[trait] = score.percentile || score.score;
        oceanScores.stanine[trait] = score.stanine || percentileToStanine(score.percentile || score.score);
      }
    });

    // Get interpretation
    const interpretation = interpretOceanProfile(oceanScores);

    return {
      responseId,
      assessmentId: scores[0].assessment_id,
      scores: {
        ocean: oceanScores
      },
      interpretation,
      metadata: {
        scoringVersion: '1.0.0',
        scoredAt: scores[0].created_at,
        confidenceLevel: 100
      }
    };
  } catch (error) {
    console.error('Error getting assessment scores:', error);
    throw error;
  }
}

function percentileToStanine(percentile: number): number {
  if (percentile < 4) return 1;
  if (percentile < 11) return 2;
  if (percentile < 23) return 3;
  if (percentile < 40) return 4;
  if (percentile < 60) return 5;
  if (percentile < 77) return 6;
  if (percentile < 89) return 7;
  if (percentile < 96) return 8;
  return 9;
}