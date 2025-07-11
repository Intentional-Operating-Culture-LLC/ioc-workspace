/**
 * Scoring module exports
 */

// OCEAN scoring functions
export {
  calculateOceanScores,
  aggregateOceanScores,
  interpretOceanProfile,
  validateOceanScores,
  type OceanTraits,
  type OceanScoreDetails,
  type OceanFacets,
  type QuestionTraitMapping
} from './ocean-scoring';

// OCEAN mapping configurations
export {
  IOC_OCEAN_MAPPINGS,
  PROMPT_TYPE_OCEAN_MAPPING,
  DOMAIN_TRAIT_CORRELATIONS,
  PILLAR_OCEAN_MAPPING,
  COMPLEX_QUESTION_MAPPINGS,
  generateQuestionMappings,
  getPillarDomainTraitWeight,
  adjustTraitScoreByConfidence
} from './ocean-mapping';

// Assessment scoring service
export {
  scoreAssessmentResponse,
  scoreMultipleResponses,
  getAssessmentScores,
  type ScoringResult
} from './assessment-scoring-service';

// Dark side analysis and trait extremes
export {
  DARK_SIDE_THRESHOLDS,
  DARK_SIDE_MANIFESTATIONS,
  STRESS_RESPONSE_PATTERNS,
  EARLY_WARNING_INDICATORS,
  assessDarkSideRisk,
  generateDarkSideAssessment,
  type DarkSideAssessment,
  type DarkSideRiskProfile,
  type StressResponseAssessment,
  type BehavioralIndicatorReport,
  type InterventionPlan
} from './ocean-dark-side-mapping';