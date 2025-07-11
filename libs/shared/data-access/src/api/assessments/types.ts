/**
 * OCEAN Assessment Types and Interfaces
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

export interface ExecutiveOceanProfile {
  traits: OceanScoreDetails;
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

export interface DarkSideRiskProfile {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  traitRisks: {
    [trait: string]: {
      riskLevel: 'low' | 'moderate' | 'high' | 'critical';
      manifestationType: 'high_extreme' | 'low_extreme' | 'none';
      primaryConcerns: string[];
      impactAreas: string[];
    };
  };
  stressAmplification: number;
  compensatoryBehaviors: string[];
}

export interface AssessmentInterpretation {
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

export interface Multi360Results {
  aggregatedScores: OceanScoreDetails;
  observerAgreement: {
    overall: number;
    byTrait: { [trait: string]: number };
  };
  blindSpots: {
    traits: {
      [trait: string]: {
        selfScore: number;
        observerScore: number;
        difference: number;
        direction: 'overestimated' | 'underestimated';
      };
    };
    insights: string[];
  };
  raterCounts: { [raterType: string]: number };
}

export interface OrganizationalOceanProfile {
  collectiveTraits: OceanTraits;
  traitDiversity: OceanTraits;
  cultureType: 'innovation' | 'performance' | 'collaborative' | 'adaptive';
  emergentProperties: {
    collectiveIntelligence: number;
    teamCohesion: number;
    adaptiveCapacity: number;
    executionCapability: number;
  };
  healthMetrics: {
    psychologicalSafety: number;
    innovationClimate: number;
    resilience: number;
    performanceCulture: number;
  };
}

export interface TeamCompositionAnalysis {
  meanTraits: OceanTraits;
  traitDiversity: OceanTraits;
  roleFitScores: { [role: string]: number };
  dynamicPredictions: {
    collaborationPotential: number;
    innovationCapacity: number;
    executionReliability: number;
    conflictRisk: number;
  };
  optimalAdditions: OceanTraits;
}

export interface ExecutiveOrgFit {
  traitAlignment: { [trait: string]: number };
  complementaryFit: {
    leadershipGapFill: number;
    diversityContribution: number;
    balancePotential: number;
  };
  overallFitScore: number;
  recommendations: string[];
}

export interface AssessmentSubmissionData {
  responses: Array<{
    questionId: string;
    answer: any;
    metadata?: any;
  }>;
  timeSpent: number;
  metadata?: {
    currentStressLevel?: number;
    level?: string;
    function?: string;
    subjectUserId?: string;
    [key: string]: any;
  };
  raterType?: 'self' | 'manager' | 'peer' | 'direct-report' | 'external';
}

export interface NodeBasedAssessmentConfig {
  title: string;
  type: string;
  organizationId: string;
  description?: string;
  tier: 'individual' | 'executive' | 'organizational';
  nodes: string[];
  settings?: {
    enableDarkSideAnalysis?: boolean;
    enableEmotionalRegulation?: boolean;
    enable360Feedback?: boolean;
    maxAttempts?: number;
    [key: string]: any;
  };
  assignments?: Array<{
    userId: string;
    raterType?: string;
    subjectUserId?: string;
  }>;
  dueDate?: string;
}

export interface AssessmentRecommendation {
  type: string;
  tier: string;
  nodes: string[];
  estimatedQuestions: number;
  estimatedTime: number;
  enable360?: boolean;
  raterTypes?: string[];
}