export type OceanTraits = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';

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
    angryHostility: number;
    depression: number;
    selfConsciousness: number;
    impulsiveness: number;
    vulnerability: number;
  };
}

export interface AssessmentNode {
  id: string;
  label: string;
  category: string;
  oceanTraits: OceanTraits[];
  facets?: string[];
  weight: number;
}

export interface OceanPrompt {
  id: string;
  text: string;
  trait: OceanTraits;
  facet?: string;
  reversed?: boolean;
  emotionalRegulation?: boolean;
  darkSide?: boolean;
  executiveContext?: boolean;
}

export interface OceanScore {
  raw: Record<OceanTraits, number>;
  percentile: Record<OceanTraits, number>;
  stanine: Record<OceanTraits, number>;
  facets?: OceanFacets;
  emotionalRegulation?: EmotionalRegulationScore;
  darkSideRisks?: DarkSideRisks;
  executiveProfile?: ExecutiveProfile;
}

export interface EmotionalRegulationScore {
  selfAwareness: number;
  selfManagement: number;
  socialAwareness: number;
  relationshipManagement: number;
  stressTolerance: number;
  impulseControl: number;
  emotionalStability: number;
}

export interface DarkSideRisks {
  narcissism: {
    score: number;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
  machiavellianism: {
    score: number;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
  psychopathy: {
    score: number;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
  perfectionism: {
    score: number;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
  micromanagement: {
    score: number;
    risk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
}

export interface ExecutiveProfile {
  strategicThinking: number;
  decisionMaking: number;
  changeLeadership: number;
  executivePresence: number;
  stakeholderManagement: number;
  teamDevelopment: number;
  resultsOrientation: number;
  innovationDrive: number;
}

export interface RaterFeedback {
  raterId: string;
  raterName: string;
  raterEmail: string;
  relationship: 'self' | 'peer' | 'direct_report' | 'manager' | 'other';
  status: 'invited' | 'in_progress' | 'completed';
  completedAt?: string;
  scores?: OceanScore;
  comments?: {
    strengths: string;
    improvements: string;
    additional: string;
  };
}