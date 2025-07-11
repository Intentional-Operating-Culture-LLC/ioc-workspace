/**
 * OCEAN Scoring for Executive and Organizational Tiers
 * Implements the comprehensive framework for leadership and collective personality assessment
 */

import { 
  OceanScore, 
  QuestionResponse, 
  calculateTraitScore,
  normalizeScore 
} from './ocean-scoring';

// Executive-specific trait weights
const EXECUTIVE_TRAIT_WEIGHTS = {
  openness: 1.2,
  conscientiousness: 1.15,
  extraversion: 1.25,
  agreeableness: 1.0,
  neuroticism: 1.3
};

// Leadership style mapping coefficients
const LEADERSHIP_STYLE_COEFFICIENTS = {
  transformational: {
    openness: 0.35,
    extraversion: 0.35,
    emotionalStability: 0.30
  },
  transactional: {
    conscientiousness: 0.50,
    agreeableness: 0.30,
    extraversion: 0.20
  },
  servant: {
    agreeableness: 0.45,
    conscientiousness: 0.30,
    emotionalStability: 0.25
  },
  authentic: {
    openness: 0.30,
    agreeableness: 0.35,
    emotionalStability: 0.35
  },
  adaptive: {
    openness: 0.40,
    extraversion: 0.30,
    emotionalStability: 0.30
  }
};

// Influence tactic correlations
const INFLUENCE_TACTIC_MAPPING = {
  inspirationalAppeals: {
    extraversion: 0.90,
    openness: 0.70,
    agreeableness: 0.55
  },
  rationalPersuasion: {
    conscientiousness: 0.85,
    openness: 0.55
  },
  consultation: {
    agreeableness: 0.90,
    extraversion: 0.65
  },
  ingratiation: {
    agreeableness: 0.75,
    extraversion: 0.60
  },
  exchange: {
    conscientiousness: 0.60,
    extraversion: 0.50
  },
  personalAppeals: {
    agreeableness: 0.70,
    extraversion: 0.80
  },
  coalition: {
    extraversion: 0.75,
    agreeableness: 0.85
  },
  legitimating: {
    conscientiousness: 0.80,
    agreeableness: 0.40
  },
  pressure: {
    extraversion: 0.70,
    agreeableness: -0.40,
    conscientiousness: 0.65
  }
};

// Team outcome prediction coefficients
const TEAM_OUTCOME_COEFFICIENTS = {
  engagement: {
    extraversion: 0.30,
    agreeableness: 0.35,
    emotionalStability: 0.35
  },
  innovation: {
    openness: 0.50,
    extraversion: 0.25,
    emotionalStability: 0.25
  },
  performance: {
    conscientiousness: 0.45,
    extraversion: 0.30,
    emotionalStability: 0.25
  },
  cohesion: {
    agreeableness: 0.40,
    emotionalStability: 0.35,
    extraversion: 0.25
  }
};

// Organizational culture type mapping
const CULTURE_TYPE_PROFILES = {
  innovation: {
    openness: 0.90,
    conscientiousness: 0.50,
    extraversion: 0.70,
    agreeableness: 0.55,
    neuroticism: 0.30
  },
  performance: {
    openness: 0.55,
    conscientiousness: 0.90,
    extraversion: 0.65,
    agreeableness: 0.45,
    neuroticism: 0.40
  },
  collaborative: {
    openness: 0.55,
    conscientiousness: 0.60,
    extraversion: 0.70,
    agreeableness: 0.85,
    neuroticism: 0.35
  },
  adaptive: {
    openness: 0.80,
    conscientiousness: 0.60,
    extraversion: 0.60,
    agreeableness: 0.65,
    neuroticism: 0.30
  }
};

export interface ExecutiveOceanProfile {
  traits: OceanScore;
  emotionalStability: number;
  leadershipStyles: LeadershipStyleScores;
  influenceTactics: InfluenceTacticScores;
  teamPredictions: TeamOutcomePredictions;
  stressResponse: StressResponseProfile;
}

export interface LeadershipStyleScores {
  transformational: number;
  transactional: number;
  servant: number;
  authentic: number;
  adaptive: number;
}

export interface InfluenceTacticScores {
  inspirationalAppeals: number;
  rationalPersuasion: number;
  consultation: number;
  ingratiation: number;
  exchange: number;
  personalAppeals: number;
  coalition: number;
  legitimating: number;
  pressure: number;
}

export interface TeamOutcomePredictions {
  engagement: number;
  innovation: number;
  performance: number;
  cohesion: number;
}

export interface StressResponseProfile {
  resilienceScore: number;
  recoverySpeed: 'rapid' | 'moderate' | 'slow';
  teamImpact: 'stabilizing' | 'energizing' | 'calming' | 'variable';
  copingStrategies: string[];
}

export interface OrganizationalOceanProfile {
  collectiveTraits: OceanScore;
  traitDiversity: OceanScore;
  cultureType: 'innovation' | 'performance' | 'collaborative' | 'adaptive';
  emergentProperties: EmergentProperties;
  healthMetrics: OrganizationalHealthMetrics;
}

export interface EmergentProperties {
  collectiveIntelligence: number;
  teamCohesion: number;
  adaptiveCapacity: number;
  executionCapability: number;
}

export interface OrganizationalHealthMetrics {
  psychologicalSafety: number;
  innovationClimate: number;
  resilience: number;
  performanceCulture: number;
}

export interface TeamCompositionAnalysis {
  meanTraits: OceanScore;
  traitDiversity: OceanScore;
  roleFitScores: { [role: string]: number };
  dynamicPredictions: TeamDynamicPredictions;
  optimalAdditions: OceanScore;
}

export interface TeamDynamicPredictions {
  collaborationPotential: number;
  innovationCapacity: number;
  executionReliability: number;
  conflictRisk: number;
}

export interface ExecutiveOrgFit {
  traitAlignment: { [trait: string]: number };
  complementaryFit: ComplementaryFit;
  overallFitScore: number;
  recommendations: string[];
}

export interface ComplementaryFit {
  leadershipGapFill: number;
  diversityContribution: number;
  balancePotential: number;
}

/**
 * Calculate comprehensive executive OCEAN profile
 */
export function calculateExecutiveOceanProfile(
  responses: QuestionResponse[],
  roleContext?: { level: string; function: string }
): ExecutiveOceanProfile {
  // Calculate base OCEAN scores
  const baseTraits = calculateOceanScores(responses);
  
  // Apply executive weights
  const weightedTraits: OceanScore = {
    openness: baseTraits.openness * EXECUTIVE_TRAIT_WEIGHTS.openness,
    conscientiousness: baseTraits.conscientiousness * EXECUTIVE_TRAIT_WEIGHTS.conscientiousness,
    extraversion: baseTraits.extraversion * EXECUTIVE_TRAIT_WEIGHTS.extraversion,
    agreeableness: baseTraits.agreeableness * EXECUTIVE_TRAIT_WEIGHTS.agreeableness,
    neuroticism: baseTraits.neuroticism * EXECUTIVE_TRAIT_WEIGHTS.neuroticism
  };
  
  // Calculate emotional stability (inverse of neuroticism)
  const emotionalStability = (5 - weightedTraits.neuroticism) * EXECUTIVE_TRAIT_WEIGHTS.neuroticism;
  
  // Derive leadership styles
  const leadershipStyles = calculateLeadershipStyles(weightedTraits, emotionalStability);
  
  // Calculate influence tactics
  const influenceTactics = calculateInfluenceTactics(weightedTraits, emotionalStability);
  
  // Predict team outcomes
  const teamPredictions = predictTeamOutcomes(weightedTraits, emotionalStability);
  
  // Assess stress response
  const stressResponse = assessStressResponse(weightedTraits, emotionalStability);
  
  return {
    traits: normalizeExecutiveTraits(weightedTraits),
    emotionalStability: normalizeScore(emotionalStability),
    leadershipStyles,
    influenceTactics,
    teamPredictions,
    stressResponse
  };
}

/**
 * Calculate leadership style preferences from OCEAN scores
 */
function calculateLeadershipStyles(
  traits: OceanScore,
  emotionalStability: number
): LeadershipStyleScores {
  const scores: LeadershipStyleScores = {
    transformational: 0,
    transactional: 0,
    servant: 0,
    authentic: 0,
    adaptive: 0
  };
  
  // Calculate each leadership style score
  for (const [style, coefficients] of Object.entries(LEADERSHIP_STYLE_COEFFICIENTS)) {
    let score = 0;
    
    if ('openness' in coefficients && coefficients.openness) {
      score += traits.openness * coefficients.openness;
    }
    if ('conscientiousness' in coefficients && coefficients.conscientiousness) {
      score += traits.conscientiousness * coefficients.conscientiousness;
    }
    if ('extraversion' in coefficients && coefficients.extraversion) {
      score += traits.extraversion * coefficients.extraversion;
    }
    if ('agreeableness' in coefficients && coefficients.agreeableness) {
      score += traits.agreeableness * coefficients.agreeableness;
    }
    if ('emotionalStability' in coefficients && coefficients.emotionalStability) {
      score += emotionalStability * coefficients.emotionalStability;
    }
    
    scores[style as keyof LeadershipStyleScores] = score;
  }
  
  // Normalize to percentages
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  for (const style in scores) {
    scores[style as keyof LeadershipStyleScores] = 
      (scores[style as keyof LeadershipStyleScores] / total) * 100;
  }
  
  return scores;
}

/**
 * Calculate influence tactic preferences
 */
function calculateInfluenceTactics(
  traits: OceanScore,
  emotionalStability: number
): InfluenceTacticScores {
  const scores: InfluenceTacticScores = {
    inspirationalAppeals: 0,
    rationalPersuasion: 0,
    consultation: 0,
    ingratiation: 0,
    exchange: 0,
    personalAppeals: 0,
    coalition: 0,
    legitimating: 0,
    pressure: 0
  };
  
  for (const [tactic, mapping] of Object.entries(INFLUENCE_TACTIC_MAPPING)) {
    let score = 0;
    let weightSum = 0;
    
    if ('openness' in mapping && mapping.openness) {
      score += traits.openness * Math.abs(mapping.openness);
      weightSum += Math.abs(mapping.openness);
    }
    if ('conscientiousness' in mapping && mapping.conscientiousness) {
      score += traits.conscientiousness * Math.abs(mapping.conscientiousness);
      weightSum += Math.abs(mapping.conscientiousness);
    }
    if ('extraversion' in mapping && mapping.extraversion) {
      score += traits.extraversion * Math.abs(mapping.extraversion);
      weightSum += Math.abs(mapping.extraversion);
    }
    if ('agreeableness' in mapping && mapping.agreeableness) {
      // Handle negative correlations
      if (mapping.agreeableness < 0) {
        score += (5 - traits.agreeableness) * Math.abs(mapping.agreeableness);
      } else {
        score += traits.agreeableness * mapping.agreeableness;
      }
      weightSum += Math.abs(mapping.agreeableness);
    }
    
    scores[tactic as keyof InfluenceTacticScores] = 
      weightSum > 0 ? (score / weightSum) * 20 : 0; // Scale to 0-100
  }
  
  return scores;
}

/**
 * Predict team outcomes based on executive OCEAN profile
 */
function predictTeamOutcomes(
  traits: OceanScore,
  emotionalStability: number
): TeamOutcomePredictions {
  const predictions: TeamOutcomePredictions = {
    engagement: 0,
    innovation: 0,
    performance: 0,
    cohesion: 0
  };
  
  for (const [outcome, coefficients] of Object.entries(TEAM_OUTCOME_COEFFICIENTS)) {
    let score = 0;
    
    if ('openness' in coefficients && coefficients.openness) {
      score += traits.openness * coefficients.openness;
    }
    if ('conscientiousness' in coefficients && coefficients.conscientiousness) {
      score += traits.conscientiousness * coefficients.conscientiousness;
    }
    if ('extraversion' in coefficients && coefficients.extraversion) {
      score += traits.extraversion * coefficients.extraversion;
    }
    if ('agreeableness' in coefficients && coefficients.agreeableness) {
      score += traits.agreeableness * coefficients.agreeableness;
    }
    if ('emotionalStability' in coefficients && coefficients.emotionalStability) {
      score += emotionalStability * coefficients.emotionalStability;
    }
    
    predictions[outcome as keyof TeamOutcomePredictions] = (score / 5) * 100;
  }
  
  return predictions;
}

/**
 * Assess stress response profile
 */
function assessStressResponse(
  traits: OceanScore,
  emotionalStability: number
): StressResponseProfile {
  // Calculate resilience score
  const resilienceScore = (
    emotionalStability * 0.45 +
    traits.conscientiousness * 0.30 +
    traits.openness * 0.15 +
    traits.extraversion * 0.10
  ) / 5 * 100;
  
  // Determine recovery speed
  let recoverySpeed: 'rapid' | 'moderate' | 'slow';
  if (resilienceScore > 70) {
    recoverySpeed = 'rapid';
  } else if (resilienceScore > 40) {
    recoverySpeed = 'moderate';
  } else {
    recoverySpeed = 'slow';
  }
  
  // Determine team impact
  let teamImpact: 'stabilizing' | 'energizing' | 'calming' | 'variable';
  if (emotionalStability > 3.5 && traits.agreeableness > 3.5) {
    teamImpact = 'stabilizing';
  } else if (traits.extraversion > 4 && emotionalStability > 3) {
    teamImpact = 'energizing';
  } else if (traits.agreeableness > 4 && traits.conscientiousness > 3.5) {
    teamImpact = 'calming';
  } else {
    teamImpact = 'variable';
  }
  
  // Identify coping strategies
  const copingStrategies: string[] = [];
  if (traits.conscientiousness > 3.5) {
    copingStrategies.push('Structured problem-solving');
  }
  if (traits.extraversion > 3.5) {
    copingStrategies.push('Social support seeking');
  }
  if (traits.openness > 3.5) {
    copingStrategies.push('Creative reframing');
  }
  if (emotionalStability > 3.5) {
    copingStrategies.push('Emotional regulation');
  }
  if (traits.agreeableness > 3.5) {
    copingStrategies.push('Collaborative solutions');
  }
  
  return {
    resilienceScore,
    recoverySpeed,
    teamImpact,
    copingStrategies
  };
}

/**
 * Calculate organizational collective OCEAN profile
 */
export function calculateOrganizationalOceanProfile(
  individualProfiles: OceanScore[],
  interactionMatrix?: number[][]
): OrganizationalOceanProfile {
  // Calculate mean traits
  const collectiveTraits = calculateCollectiveTraits(individualProfiles, interactionMatrix);
  
  // Calculate trait diversity
  const traitDiversity = calculateTraitDiversity(individualProfiles);
  
  // Determine culture type
  const cultureType = determineCultureType(collectiveTraits);
  
  // Calculate emergent properties
  const emergentProperties = calculateEmergentProperties(
    collectiveTraits,
    traitDiversity,
    individualProfiles.length
  );
  
  // Assess organizational health
  const healthMetrics = assessOrganizationalHealth(
    collectiveTraits,
    traitDiversity,
    emergentProperties
  );
  
  return {
    collectiveTraits,
    traitDiversity,
    cultureType,
    emergentProperties,
    healthMetrics
  };
}

/**
 * Calculate collective traits with emergence factors
 */
function calculateCollectiveTraits(
  profiles: OceanScore[],
  interactionMatrix?: number[][]
): OceanScore {
  const n = profiles.length;
  const collective: OceanScore = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };
  
  // Calculate centrality weights if interaction matrix provided
  const weights = interactionMatrix 
    ? calculateCentralityWeights(interactionMatrix)
    : new Array(n).fill(1 / n);
  
  // Calculate weighted means with emergence factors
  for (const trait of Object.keys(collective) as (keyof OceanScore)[]) {
    const traitScores = profiles.map(p => p[trait]);
    const weightedMean = traitScores.reduce((sum, score, i) => 
      sum + score * weights[i], 0
    );
    
    // Apply emergence factor based on trait
    let emergenceFactor = 1.0;
    const stdDev = calculateStandardDeviation(traitScores);
    
    switch (trait) {
      case 'openness':
        // Diversity amplifies openness
        emergenceFactor = 1.1 + (stdDev * 0.2);
        break;
      case 'conscientiousness':
        // Alignment enhances conscientiousness
        emergenceFactor = 1.0 + ((1 - stdDev / 2) * 0.15);
        break;
      case 'extraversion':
        // Network effects for extraversion
        const highEProportion = traitScores.filter(s => s > 3.5).length / n;
        emergenceFactor = 1.0 + (highEProportion * 0.25);
        break;
      case 'agreeableness':
        // Positive spirals for high agreeableness
        emergenceFactor = weightedMean > 3.5 ? 1.15 : 0.95;
        break;
      case 'neuroticism':
        // Negative cascades for neuroticism
        const highNProportion = traitScores.filter(s => s > 3.5).length / n;
        emergenceFactor = 1.0 + (highNProportion * 0.3);
        break;
    }
    
    collective[trait] = Math.min(weightedMean * emergenceFactor, 5.0);
  }
  
  return collective;
}

/**
 * Calculate trait diversity in the organization
 */
function calculateTraitDiversity(profiles: OceanScore[]): OceanScore {
  const diversity: OceanScore = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };
  
  for (const trait of Object.keys(diversity) as (keyof OceanScore)[]) {
    const scores = profiles.map(p => p[trait]);
    diversity[trait] = calculateStandardDeviation(scores);
  }
  
  return diversity;
}

/**
 * Determine organizational culture type
 */
function determineCultureType(
  traits: OceanScore
): 'innovation' | 'performance' | 'collaborative' | 'adaptive' {
  let bestMatch: 'innovation' | 'performance' | 'collaborative' | 'adaptive' = 'adaptive';
  let bestScore = -Infinity;
  
  for (const [culture, profile] of Object.entries(CULTURE_TYPE_PROFILES)) {
    let score = 0;
    for (const trait of Object.keys(traits) as (keyof OceanScore)[]) {
      const difference = Math.abs(traits[trait] - profile[trait]);
      score -= difference; // Lower difference = better match
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = culture as typeof bestMatch;
    }
  }
  
  return bestMatch;
}

/**
 * Calculate emergent organizational properties
 */
function calculateEmergentProperties(
  traits: OceanScore,
  diversity: OceanScore,
  orgSize: number
): EmergentProperties {
  return {
    collectiveIntelligence: (
      traits.openness * 0.4 +
      diversity.openness * 0.3 +
      traits.conscientiousness * 0.3
    ) / 5 * 100,
    
    teamCohesion: (
      traits.agreeableness * 0.5 +
      (5 - diversity.agreeableness) * 0.3 +
      traits.extraversion * 0.2
    ) / 5 * 100,
    
    adaptiveCapacity: (
      traits.openness * 0.4 +
      diversity.extraversion * 0.3 +
      (5 - traits.neuroticism) * 0.3
    ) / 5 * 100,
    
    executionCapability: (
      traits.conscientiousness * 0.5 +
      (5 - diversity.conscientiousness) * 0.3 +
      (5 - traits.neuroticism) * 0.2
    ) / 5 * 100
  };
}

/**
 * Assess organizational health metrics
 */
function assessOrganizationalHealth(
  traits: OceanScore,
  diversity: OceanScore,
  emergent: EmergentProperties
): OrganizationalHealthMetrics {
  return {
    psychologicalSafety: (
      traits.agreeableness * 0.4 +
      (5 - traits.neuroticism) * 0.35 +
      traits.openness * 0.25
    ) / 5 * 100,
    
    innovationClimate: (
      traits.openness * 0.5 +
      traits.extraversion * 0.3 +
      traits.agreeableness * 0.2
    ) / 5 * 100,
    
    resilience: (
      (5 - traits.neuroticism) * 0.45 +
      traits.openness * 0.30 +
      traits.conscientiousness * 0.25
    ) / 5 * 100,
    
    performanceCulture: (
      traits.conscientiousness * 0.45 +
      traits.extraversion * 0.30 +
      (5 - traits.neuroticism) * 0.25
    ) / 5 * 100
  };
}

/**
 * Analyze team composition and dynamics
 */
export function analyzeTeamComposition(
  teamProfiles: OceanScore[],
  roleAssignments?: { [memberId: number]: string }
): TeamCompositionAnalysis {
  // Calculate mean traits
  const meanTraits = calculateMeanTraits(teamProfiles);
  
  // Calculate diversity
  const traitDiversity = calculateTraitDiversity(teamProfiles);
  
  // Assess role fit if assignments provided
  const roleFitScores = roleAssignments
    ? assessRoleFit(teamProfiles, roleAssignments)
    : {};
  
  // Predict team dynamics
  const dynamicPredictions = predictTeamDynamics(meanTraits, traitDiversity);
  
  // Identify optimal additions
  const optimalAdditions = identifyOptimalAdditions(meanTraits, traitDiversity);
  
  return {
    meanTraits,
    traitDiversity,
    roleFitScores,
    dynamicPredictions,
    optimalAdditions
  };
}

/**
 * Calculate executive-organization fit
 */
export function calculateExecutiveOrgFit(
  executiveProfile: OceanScore,
  orgProfile: OceanScore
): ExecutiveOrgFit {
  // Calculate trait alignment
  const traitAlignment: { [trait: string]: number } = {};
  
  for (const trait of Object.keys(executiveProfile) as (keyof OceanScore)[]) {
    const difference = Math.abs(executiveProfile[trait] - orgProfile[trait]);
    traitAlignment[trait] = 1 - (difference / 5); // Convert to 0-1 fit score
  }
  
  // Calculate complementary fit
  const complementaryFit = calculateComplementaryFit(executiveProfile, orgProfile);
  
  // Overall fit score
  const alignmentScore = Object.values(traitAlignment).reduce((sum, fit) => 
    sum + fit, 0
  ) / Object.keys(traitAlignment).length;
  
  const complementaryScore = (
    complementaryFit.leadershipGapFill +
    complementaryFit.diversityContribution +
    complementaryFit.balancePotential
  ) / 3;
  
  const overallFitScore = alignmentScore * 0.6 + complementaryScore * 0.4;
  
  // Generate recommendations
  const recommendations = generateFitRecommendations(
    executiveProfile,
    orgProfile,
    traitAlignment,
    complementaryFit
  );
  
  return {
    traitAlignment,
    complementaryFit,
    overallFitScore,
    recommendations
  };
}

// Helper functions

function calculateOceanScores(responses: QuestionResponse[]): OceanScore {
  // Implementation would use the existing ocean-scoring.ts functions
  // This is a placeholder
  return {
    openness: 3.5,
    conscientiousness: 3.5,
    extraversion: 3.5,
    agreeableness: 3.5,
    neuroticism: 3.5
  };
}

function normalizeExecutiveTraits(traits: OceanScore): OceanScore {
  const normalized: OceanScore = { ...traits };
  
  for (const trait of Object.keys(normalized) as (keyof OceanScore)[]) {
    normalized[trait] = normalizeScore(normalized[trait]);
  }
  
  return normalized;
}

function calculateCentralityWeights(matrix: number[][]): number[] {
  const n = matrix.length;
  const centrality = new Array(n).fill(0);
  
  // Simple degree centrality
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      centrality[i] += matrix[i][j];
    }
  }
  
  // Normalize
  const sum = centrality.reduce((a, b) => a + b, 0);
  return centrality.map(c => c / sum);
}

function calculateStandardDeviation(scores: number[]): number {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => 
    sum + Math.pow(score - mean, 2), 0
  ) / scores.length;
  return Math.sqrt(variance);
}

function calculateMeanTraits(profiles: OceanScore[]): OceanScore {
  const n = profiles.length;
  const mean: OceanScore = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };
  
  for (const profile of profiles) {
    for (const trait of Object.keys(mean) as (keyof OceanScore)[]) {
      mean[trait] += profile[trait];
    }
  }
  
  for (const trait of Object.keys(mean) as (keyof OceanScore)[]) {
    mean[trait] /= n;
  }
  
  return mean;
}

function predictTeamDynamics(
  meanTraits: OceanScore,
  diversity: OceanScore
): TeamDynamicPredictions {
  return {
    collaborationPotential: (
      meanTraits.agreeableness * 0.4 +
      meanTraits.extraversion * 0.3 +
      (1 - diversity.agreeableness / 5) * 0.3
    ) * 20,
    
    innovationCapacity: (
      meanTraits.openness * 0.5 +
      diversity.openness * 0.3 +
      meanTraits.extraversion * 0.2
    ) * 20,
    
    executionReliability: (
      meanTraits.conscientiousness * 0.5 +
      (1 - diversity.conscientiousness / 5) * 0.3 +
      (5 - meanTraits.neuroticism) * 0.2
    ) * 20,
    
    conflictRisk: (
      diversity.agreeableness * 0.4 +
      meanTraits.neuroticism * 0.3 +
      (5 - meanTraits.agreeableness) * 0.3
    ) * 20
  };
}

function identifyOptimalAdditions(
  currentMean: OceanScore,
  currentDiversity: OceanScore
): OceanScore {
  // Identify traits that would benefit the team
  const optimal: OceanScore = {
    openness: 3.5,
    conscientiousness: 3.5,
    extraversion: 3.5,
    agreeableness: 3.5,
    neuroticism: 2.5
  };
  
  // Adjust based on current profile
  if (currentMean.openness < 3.0) optimal.openness = 4.5;
  if (currentMean.conscientiousness < 3.5) optimal.conscientiousness = 4.5;
  if (currentMean.extraversion < 3.0) optimal.extraversion = 4.0;
  if (currentMean.agreeableness < 3.5) optimal.agreeableness = 4.0;
  if (currentMean.neuroticism > 3.5) optimal.neuroticism = 2.0;
  
  // Consider diversity needs
  if (currentDiversity.openness < 0.8) optimal.openness = 5.0;
  if (currentDiversity.extraversion < 1.0) optimal.extraversion = 1.0;
  
  return optimal;
}

function assessRoleFit(
  profiles: OceanScore[],
  assignments: { [memberId: number]: string }
): { [role: string]: number } {
  const roleFits: { [role: string]: number } = {};
  
  // Define ideal profiles for common roles
  const roleProfiles: { [role: string]: OceanScore } = {
    leader: {
      openness: 3.5,
      conscientiousness: 4.0,
      extraversion: 4.0,
      agreeableness: 3.5,
      neuroticism: 2.0
    },
    analyst: {
      openness: 3.5,
      conscientiousness: 4.5,
      extraversion: 2.5,
      agreeableness: 3.0,
      neuroticism: 2.5
    },
    creative: {
      openness: 4.5,
      conscientiousness: 3.0,
      extraversion: 3.5,
      agreeableness: 3.5,
      neuroticism: 3.0
    }
  };
  
  for (const [memberId, role] of Object.entries(assignments)) {
    const memberProfile = profiles[parseInt(memberId)];
    const idealProfile = roleProfiles[role] || roleProfiles.leader;
    
    let fitScore = 0;
    for (const trait of Object.keys(memberProfile) as (keyof OceanScore)[]) {
      const difference = Math.abs(memberProfile[trait] - idealProfile[trait]);
      fitScore += (5 - difference) / 5;
    }
    
    roleFits[role] = (roleFits[role] || 0) + fitScore / 5;
  }
  
  return roleFits;
}

function calculateComplementaryFit(
  executive: OceanScore,
  org: OceanScore
): ComplementaryFit {
  // Leadership gap fill - executive brings what org lacks
  let gapFill = 0;
  if (org.openness < 3.0 && executive.openness > 4.0) gapFill += 0.25;
  if (org.conscientiousness < 3.5 && executive.conscientiousness > 4.0) gapFill += 0.25;
  if (org.extraversion < 3.0 && executive.extraversion > 4.0) gapFill += 0.25;
  if (org.neuroticism > 3.5 && executive.neuroticism < 2.5) gapFill += 0.25;
  
  // Diversity contribution
  let diversityContribution = 0;
  for (const trait of Object.keys(executive) as (keyof OceanScore)[]) {
    const difference = Math.abs(executive[trait] - org[trait]);
    if (difference > 1.0 && difference < 2.5) {
      diversityContribution += 0.2; // Moderate differences are beneficial
    }
  }
  
  // Balance potential
  const executiveBalance = calculateTraitBalance(executive);
  const orgBalance = calculateTraitBalance(org);
  const balancePotential = executiveBalance > orgBalance ? 0.8 : 0.5;
  
  return {
    leadershipGapFill: Math.min(gapFill, 1.0),
    diversityContribution: Math.min(diversityContribution, 1.0),
    balancePotential
  };
}

function calculateTraitBalance(profile: OceanScore): number {
  const traits = Object.values(profile);
  const mean = traits.reduce((sum, t) => sum + t, 0) / traits.length;
  const variance = traits.reduce((sum, t) => 
    sum + Math.pow(t - mean, 2), 0
  ) / traits.length;
  
  // Lower variance = better balance
  return 1 - (Math.sqrt(variance) / 2.5);
}

function generateFitRecommendations(
  executive: OceanScore,
  org: OceanScore,
  alignment: { [trait: string]: number },
  complementary: ComplementaryFit
): string[] {
  const recommendations: string[] = [];
  
  // Alignment recommendations
  for (const [trait, fit] of Object.entries(alignment)) {
    if (fit < 0.6) {
      const execScore = executive[trait as keyof OceanScore];
      const orgScore = org[trait as keyof OceanScore];
      
      if (execScore > orgScore) {
        recommendations.push(
          `High ${trait} may clash with organizational culture. ` +
          `Focus on gradual culture shift or adjust leadership style.`
        );
      } else {
        recommendations.push(
          `Lower ${trait} than organization norm. ` +
          `Develop ${trait}-related competencies or leverage team strengths.`
        );
      }
    }
  }
  
  // Complementary fit recommendations
  if (complementary.leadershipGapFill > 0.6) {
    recommendations.push(
      'Strong potential to fill organizational capability gaps. ' +
      'Leverage unique strengths to drive positive change.'
    );
  }
  
  if (complementary.diversityContribution > 0.7) {
    recommendations.push(
      'Valuable diversity of perspective. ' +
      'Use different viewpoint to challenge groupthink and drive innovation.'
    );
  }
  
  if (complementary.balancePotential > 0.7) {
    recommendations.push(
      'Well-balanced profile can stabilize organizational extremes. ' +
      'Act as a moderating influence in decision-making.'
    );
  }
  
  return recommendations;
}

/**
 * Create succession planning model based on OCEAN
 */
export function createSuccessionPlanningModel(
  currentExecutive: OceanScore,
  orgProfile: OceanScore,
  futureNeeds: { [trait: string]: number }
): {
  idealProfile: OceanScore;
  criticalTraits: string[];
  developmentPaths: { [trait: string]: string[] };
  timeline: number; // months
} {
  // Calculate ideal successor profile
  const idealProfile: OceanScore = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };
  
  for (const trait of Object.keys(idealProfile) as (keyof OceanScore)[]) {
    // Weighted combination of factors
    const orgWeight = 0.3;
    const futureWeight = 0.4;
    const continuityWeight = 0.2;
    const improvementWeight = 0.1;
    
    const orgTarget = orgProfile[trait];
    const futureTarget = futureNeeds[trait] || 3.5;
    const continuityTarget = currentExecutive[trait] * 0.7 + 1.05; // Regression to mean
    
    let improvementTarget: number;
    if (trait === 'neuroticism') {
      improvementTarget = Math.max(currentExecutive[trait] - 0.5, 1);
    } else if (trait === 'agreeableness') {
      improvementTarget = 3.5; // Moderate is often optimal
    } else {
      improvementTarget = Math.min(currentExecutive[trait] + 0.5, 5);
    }
    
    idealProfile[trait] = 
      orgTarget * orgWeight +
      futureTarget * futureWeight +
      continuityTarget * continuityWeight +
      improvementTarget * improvementWeight;
  }
  
  // Identify critical traits
  const criticalTraits: string[] = [];
  for (const [trait, requirement] of Object.entries(futureNeeds)) {
    if (Math.abs(requirement - currentExecutive[trait as keyof OceanScore]) > 1.5) {
      criticalTraits.push(trait);
    }
  }
  
  // Create development paths
  const developmentPaths: { [trait: string]: string[] } = {};
  
  developmentPaths.openness = [
    'Cross-functional project leadership',
    'Innovation workshop facilitation',
    'Strategic partnership development',
    'Emerging technology exploration'
  ];
  
  developmentPaths.conscientiousness = [
    'Process improvement initiatives',
    'Quality management certification',
    'Project management leadership',
    'Operational excellence programs'
  ];
  
  developmentPaths.extraversion = [
    'Public speaking engagements',
    'Network leadership roles',
    'Team building facilitation',
    'Executive coaching practice'
  ];
  
  developmentPaths.agreeableness = [
    'Conflict resolution training',
    'Collaborative leadership programs',
    'Mentoring relationships',
    'Cross-cultural team experiences'
  ];
  
  developmentPaths.neuroticism = [
    'Stress management coaching',
    'Mindfulness practice',
    'Crisis simulation training',
    'Executive resilience programs'
  ];
  
  // Estimate timeline based on gap size
  const maxGap = Math.max(
    ...Object.keys(idealProfile).map(trait => 
      Math.abs(idealProfile[trait as keyof OceanScore] - 
               currentExecutive[trait as keyof OceanScore])
    )
  );
  
  const timeline = Math.round(maxGap * 12); // Rough estimate: 12 months per point
  
  return {
    idealProfile,
    criticalTraits,
    developmentPaths,
    timeline
  };
}