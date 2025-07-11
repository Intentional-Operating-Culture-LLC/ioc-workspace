/**
 * OCEAN Trait Scoring System
 * Calculates Big Five personality traits from assessment responses
 */

export interface OceanTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface OceanScoreDetails {
  raw: OceanTraits;
  percentile: OceanTraits;
  stanine: OceanTraits;
  facets?: OceanFacets;
}

export interface OceanScore extends OceanScoreDetails {
  interpretation?: string;
}

export interface QuestionResponse {
  questionId: string;
  response: number;
  trait: keyof OceanTraits;
  reversed?: boolean;
}

export interface OceanFacets {
  openness: {
    fantasy: number;
    aesthetics: number;
    feelings: number;
    actions: number;
    ideas: number;
    values: number;
  };
  conscientiousness: {
    competence: number;
    order: number;
    dutifulness: number;
    achievementStriving: number;
    selfDiscipline: number;
    deliberation: number;
  };
  extraversion: {
    warmth: number;
    gregariousness: number;
    assertiveness: number;
    activity: number;
    excitementSeeking: number;
    positiveEmotions: number;
  };
  agreeableness: {
    trust: number;
    straightforwardness: number;
    altruism: number;
    compliance: number;
    modesty: number;
    tenderMindedness: number;
  };
  neuroticism: {
    anxiety: number;
    hostility: number;
    depression: number;
    selfConsciousness: number;
    impulsiveness: number;
    vulnerability: number;
  };
}

// Question-trait mapping with weights
export interface QuestionTraitMapping {
  questionId: string;
  traits: {
    openness?: number;
    conscientiousness?: number;
    extraversion?: number;
    agreeableness?: number;
    neuroticism?: number;
  };
  facets?: {
    [trait: string]: {
      [facet: string]: number;
    };
  };
  reverse?: boolean;
}

// Normative data for percentile conversion
const OCEAN_NORMS = {
  openness: {
    mean: 3.92,
    sd: 0.66,
    percentiles: [2.64, 3.04, 3.34, 3.58, 3.78, 3.96, 4.14, 4.32, 4.52, 4.8, 5.0]
  },
  conscientiousness: {
    mean: 3.81,
    sd: 0.69,
    percentiles: [2.44, 2.88, 3.2, 3.46, 3.68, 3.88, 4.08, 4.28, 4.5, 4.76, 5.0]
  },
  extraversion: {
    mean: 3.39,
    sd: 0.86,
    percentiles: [1.68, 2.26, 2.72, 3.08, 3.38, 3.64, 3.9, 4.18, 4.48, 4.82, 5.0]
  },
  agreeableness: {
    mean: 3.94,
    sd: 0.63,
    percentiles: [2.7, 3.08, 3.36, 3.58, 3.78, 3.96, 4.14, 4.32, 4.52, 4.76, 5.0]
  },
  neuroticism: {
    mean: 2.96,
    sd: 0.87,
    percentiles: [1.22, 1.82, 2.3, 2.68, 2.98, 3.26, 3.54, 3.84, 4.18, 4.58, 5.0]
  }
};

/**
 * Calculate OCEAN scores from assessment responses
 */
export function calculateOceanScores(
  responses: Array<{
    questionId: string;
    answer: any;
    metadata?: any;
  }>,
  mappings: QuestionTraitMapping[]
): OceanScoreDetails {
  // Initialize trait scores and counts
  const traitScores: { [trait: string]: number[] } = {
    openness: [],
    conscientiousness: [],
    extraversion: [],
    agreeableness: [],
    neuroticism: []
  };

  const facetScores: { [trait: string]: { [facet: string]: number[] } } = {
    openness: {},
    conscientiousness: {},
    extraversion: {},
    agreeableness: {},
    neuroticism: {}
  };

  // Process each response
  responses.forEach(response => {
    const mapping = mappings.find(m => m.questionId === response.questionId);
    if (!mapping) return;

    const score = normalizeResponseScore(response.answer, mapping.reverse);
    
    // Apply trait weights
    Object.entries(mapping.traits).forEach(([trait, weight]) => {
      if (weight && traitScores[trait]) {
        traitScores[trait].push(score * weight);
      }
    });

    // Apply facet weights if available
    if (mapping.facets) {
      Object.entries(mapping.facets).forEach(([trait, facets]) => {
        Object.entries(facets).forEach(([facet, weight]) => {
          if (!facetScores[trait][facet]) {
            facetScores[trait][facet] = [];
          }
          facetScores[trait][facet].push(score * weight);
        });
      });
    }
  });

  // Calculate raw scores (weighted averages)
  const rawScores: OceanTraits = {
    openness: calculateWeightedAverage(traitScores.openness),
    conscientiousness: calculateWeightedAverage(traitScores.conscientiousness),
    extraversion: calculateWeightedAverage(traitScores.extraversion),
    agreeableness: calculateWeightedAverage(traitScores.agreeableness),
    neuroticism: calculateWeightedAverage(traitScores.neuroticism)
  };

  // Convert to percentiles
  const percentileScores = convertToPercentiles(rawScores);

  // Convert to stanines
  const stanineScores = convertToStanines(percentileScores);

  // Calculate facet scores if applicable
  const facets = calculateFacetScores(facetScores);

  return {
    raw: rawScores,
    percentile: percentileScores,
    stanine: stanineScores,
    facets
  };
}

/**
 * Normalize response score to 1-5 scale
 */
function normalizeResponseScore(answer: any, reverse: boolean = false): number {
  let score: number;

  // Handle different answer types
  if (typeof answer === 'number') {
    score = answer;
  } else if (typeof answer === 'string') {
    // Map string responses to numeric scores
    const stringMappings: { [key: string]: number } = {
      'strongly_disagree': 1,
      'disagree': 2,
      'neutral': 3,
      'agree': 4,
      'strongly_agree': 5,
      'never': 1,
      'rarely': 2,
      'sometimes': 3,
      'often': 4,
      'always': 5,
      'a': 1,
      'b': 2,
      'c': 3,
      'd': 4,
      'e': 5
    };
    score = stringMappings[answer.toLowerCase()] || 3;
  } else if (answer && typeof answer === 'object') {
    // Handle complex answer objects
    score = answer.value || answer.score || 3;
  } else {
    score = 3; // Default to neutral
  }

  // Ensure score is within 1-5 range
  score = Math.max(1, Math.min(5, score));

  // Apply reverse scoring if needed
  if (reverse) {
    score = 6 - score;
  }

  return score;
}

/**
 * Calculate weighted average of scores
 */
function calculateWeightedAverage(scores: number[]): number {
  if (scores.length === 0) return 3; // Return neutral if no scores
  
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Convert raw scores to percentiles using normative data
 */
function convertToPercentiles(rawScores: OceanTraits): OceanTraits {
  const percentiles: OceanTraits = {} as OceanTraits;

  Object.entries(rawScores).forEach(([trait, score]) => {
    const norms = OCEAN_NORMS[trait as keyof typeof OCEAN_NORMS];
    percentiles[trait as keyof OceanTraits] = calculatePercentile(score, norms);
  });

  return percentiles;
}

/**
 * Calculate percentile from raw score using z-score method
 */
function calculatePercentile(score: number, norms: typeof OCEAN_NORMS.openness): number {
  // Calculate z-score
  const zScore = (score - norms.mean) / norms.sd;
  
  // Convert z-score to percentile using normal distribution approximation
  const percentile = normalCDF(zScore) * 100;
  
  return Math.round(Math.max(1, Math.min(99, percentile)));
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Convert percentiles to stanines (1-9 scale)
 */
function convertToStanines(percentiles: OceanTraits): OceanTraits {
  const stanines: OceanTraits = {} as OceanTraits;

  Object.entries(percentiles).forEach(([trait, percentile]) => {
    stanines[trait as keyof OceanTraits] = percentileToStanine(percentile);
  });

  return stanines;
}

/**
 * Convert percentile to stanine
 */
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

/**
 * Calculate facet scores
 */
function calculateFacetScores(
  facetScores: { [trait: string]: { [facet: string]: number[] } }
): OceanFacets | undefined {
  const hasAnyFacets = Object.values(facetScores).some(
    traitFacets => Object.keys(traitFacets).length > 0
  );

  if (!hasAnyFacets) return undefined;

  const facets: any = {};

  Object.entries(facetScores).forEach(([trait, traitFacets]) => {
    facets[trait] = {};
    Object.entries(traitFacets).forEach(([facet, scores]) => {
      facets[trait][facet] = calculateWeightedAverage(scores);
    });
  });

  return facets as OceanFacets;
}

/**
 * Aggregate multiple OCEAN assessments
 */
export function aggregateOceanScores(
  assessments: OceanScoreDetails[],
  weights?: number[]
): OceanScoreDetails {
  if (assessments.length === 0) {
    throw new Error('No assessments to aggregate');
  }

  // Use equal weights if not provided
  const assessmentWeights = weights || new Array(assessments.length).fill(1);

  // Initialize aggregated scores
  const aggregated: { [trait: string]: number } = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };

  // Weight and sum raw scores
  assessments.forEach((assessment, index) => {
    const weight = assessmentWeights[index] / assessmentWeights.reduce((a, b) => a + b, 0);
    
    Object.entries(assessment.raw).forEach(([trait, score]) => {
      aggregated[trait] += score * weight;
    });
  });

  // Convert aggregated raw scores to percentiles and stanines
  const rawScores = aggregated as OceanTraits;
  const percentileScores = convertToPercentiles(rawScores);
  const stanineScores = convertToStanines(percentileScores);

  return {
    raw: rawScores,
    percentile: percentileScores,
    stanine: stanineScores
  };
}

/**
 * Generate OCEAN profile interpretation
 */
export function interpretOceanProfile(scores: OceanScoreDetails): {
  strengths: string[];
  challenges: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const challenges: string[] = [];
  const recommendations: string[] = [];

  // Interpret each trait
  Object.entries(scores.stanine).forEach(([trait, stanine]) => {
    const interpretation = getTraitInterpretation(trait as keyof OceanTraits, stanine);
    
    if (stanine >= 7 && interpretation.strength) {
      strengths.push(interpretation.strength);
      recommendations.push(interpretation.recommendation);
    } else if (stanine <= 3 && interpretation.challenge) {
      challenges.push(interpretation.challenge);
      recommendations.push(interpretation.recommendation);
    }
  });

  return { strengths, challenges, recommendations };
}

/**
 * Get trait-specific interpretation
 */
function getTraitInterpretation(
  trait: keyof OceanTraits,
  stanine: number
): { strength?: string; challenge?: string; recommendation: string } {
  const interpretations = {
    openness: {
      high: {
        strength: 'Highly creative and innovative with strong intellectual curiosity',
        recommendation: 'Leverage creativity in strategic roles and innovation projects'
      },
      low: {
        challenge: 'May resist change and new approaches',
        recommendation: 'Develop comfort with ambiguity through structured experimentation'
      }
    },
    conscientiousness: {
      high: {
        strength: 'Exceptional reliability and attention to detail',
        recommendation: 'Take on leadership roles requiring systematic execution'
      },
      low: {
        challenge: 'May struggle with organization and follow-through',
        recommendation: 'Implement structured planning tools and accountability systems'
      }
    },
    extraversion: {
      high: {
        strength: 'Natural leader with strong communication and networking abilities',
        recommendation: 'Excel in roles requiring public presence and team motivation'
      },
      low: {
        challenge: 'May avoid necessary networking and visibility',
        recommendation: 'Practice structured networking and prepare for social interactions'
      }
    },
    agreeableness: {
      high: {
        strength: 'Excellent team player with strong collaborative skills',
        recommendation: 'Serve as mediator and team harmony builder'
      },
      low: {
        challenge: 'May come across as overly critical or competitive',
        recommendation: 'Develop empathy and diplomatic communication skills'
      }
    },
    neuroticism: {
      high: {
        challenge: 'May experience stress and emotional volatility',
        recommendation: 'Develop stress management and emotional regulation techniques'
      },
      low: {
        strength: 'Exceptional emotional stability and resilience',
        recommendation: 'Take on high-pressure roles requiring calm under stress'
      }
    }
  };

  const isHigh = stanine >= 7;
  const interpretation = interpretations[trait][isHigh ? 'high' : 'low'];

  return {
    strength: isHigh && trait !== 'neuroticism' ? (interpretation as any).strength : undefined,
    challenge: !isHigh || trait === 'neuroticism' ? (interpretation as any).challenge : undefined,
    recommendation: interpretation.recommendation
  };
}

/**
 * Validate OCEAN scores
 */
export function validateOceanScores(scores: OceanTraits): boolean {
  const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  
  return traits.every(trait => {
    const score = scores[trait as keyof OceanTraits];
    return typeof score === 'number' && score >= 1 && score <= 5;
  });
}

/**
 * Calculate trait score from responses
 */
export function calculateTraitScore(responses: QuestionResponse[], trait: keyof OceanTraits): number {
  const traitResponses = responses.filter(r => r.trait === trait);
  if (traitResponses.length === 0) return 0;
  
  const sum = traitResponses.reduce((acc, response) => {
    const value = response.reversed ? (6 - response.response) : response.response;
    return acc + value;
  }, 0);
  
  return sum / traitResponses.length;
}

/**
 * Normalize score to percentile
 */
export function normalizeScore(rawScore: number, trait: keyof OceanTraits): number {
  // Convert 1-5 scale to 0-100 percentile
  const normalized = ((rawScore - 1) / 4) * 100;
  return Math.max(0, Math.min(100, normalized));
}