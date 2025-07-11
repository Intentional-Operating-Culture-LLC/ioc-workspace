/**
 * OCEAN Trait Mapping Configuration
 * Maps assessment questions to Big Five personality traits
 */

import { QuestionTraitMapping } from './ocean-scoring';

// IOC-specific trait mappings for different assessment types
export const IOC_OCEAN_MAPPINGS: { [assessmentType: string]: QuestionTraitMapping[] } = {
  individual: [
    // Self-awareness questions → Openness & Neuroticism
    {
      questionId: 'ind_001',
      traits: {
        openness: 0.6,
        neuroticism: -0.3
      },
      facets: {
        openness: { feelings: 0.8, ideas: 0.4 },
        neuroticism: { selfConsciousness: -0.4 }
      }
    },
    // Execution questions → Conscientiousness
    {
      questionId: 'ind_002',
      traits: {
        conscientiousness: 0.9
      },
      facets: {
        conscientiousness: { 
          achievementStriving: 1.0,
          competence: 0.8,
          selfDiscipline: 0.7
        }
      }
    },
    // Adaptability questions → Openness & Extraversion
    {
      questionId: 'ind_003',
      traits: {
        openness: 0.8,
        extraversion: 0.4
      },
      facets: {
        openness: { actions: 0.9, ideas: 0.7 },
        extraversion: { activity: 0.5, excitementSeeking: 0.3 }
      }
    }
  ],

  executive: [
    // Strategic thinking → Openness & Conscientiousness
    {
      questionId: 'exec_001',
      traits: {
        openness: 0.7,
        conscientiousness: 0.6
      },
      facets: {
        openness: { ideas: 0.9, values: 0.5 },
        conscientiousness: { deliberation: 0.8, competence: 0.5 }
      }
    },
    // Decision-making → Conscientiousness & Neuroticism
    {
      questionId: 'exec_002',
      traits: {
        conscientiousness: 0.8,
        neuroticism: -0.4
      },
      facets: {
        conscientiousness: { deliberation: 0.9, order: 0.6 },
        neuroticism: { impulsiveness: -0.6, anxiety: -0.3 }
      }
    }
  ],

  organizational: [
    // Culture questions → Agreeableness & Openness
    {
      questionId: 'org_001',
      traits: {
        agreeableness: 0.7,
        openness: 0.5
      },
      facets: {
        agreeableness: { trust: 0.8, cooperation: 0.6 },
        openness: { values: 0.7 }
      }
    },
    // Process questions → Conscientiousness
    {
      questionId: 'org_002',
      traits: {
        conscientiousness: 0.9
      },
      facets: {
        conscientiousness: { order: 1.0, dutifulness: 0.7 }
      }
    }
  ]
};

// Mapping for progressive prompt types to OCEAN traits
export const PROMPT_TYPE_OCEAN_MAPPING = {
  // Likert scale mappings
  likert: {
    defaultMapping: (response: number, reverse: boolean = false) => {
      return reverse ? 6 - response : response;
    },
    traitIndicators: {
      'strongly_agree': 5,
      'agree': 4,
      'neutral': 3,
      'disagree': 2,
      'strongly_disagree': 1
    }
  },

  // Multiple choice mappings
  multiple_choice: {
    // Map choice patterns to trait levels
    patterns: {
      conservative: { openness: 2, conscientiousness: 4 },
      innovative: { openness: 5, conscientiousness: 3 },
      systematic: { conscientiousness: 5, openness: 3 },
      flexible: { openness: 4, conscientiousness: 2 }
    }
  },

  // Scenario-based mappings
  scenario: {
    // Map response patterns to trait combinations
    responses: {
      collaborative: { agreeableness: 5, extraversion: 4 },
      independent: { agreeableness: 2, extraversion: 2 },
      analytical: { conscientiousness: 5, openness: 4 },
      intuitive: { openness: 5, conscientiousness: 3 }
    }
  },

  // Ranking mappings
  ranking: {
    // Weight traits based on ranking priorities
    priorities: {
      'data_analytics': { conscientiousness: 0.8, openness: 0.3 },
      'team_consensus': { agreeableness: 0.9, extraversion: 0.6 },
      'strategic_alignment': { openness: 0.7, conscientiousness: 0.7 },
      'risk_assessment': { neuroticism: -0.5, conscientiousness: 0.6 },
      'speed_execution': { extraversion: 0.6, conscientiousness: 0.4 }
    }
  }
};

// Domain to OCEAN trait correlations
export const DOMAIN_TRAIT_CORRELATIONS = {
  // Individual domains
  'self-awareness': {
    primary: ['openness', 'neuroticism'],
    weights: { openness: 0.7, neuroticism: -0.3 }
  },
  'adaptability': {
    primary: ['openness', 'extraversion'],
    weights: { openness: 0.8, extraversion: 0.4 }
  },
  'collaboration': {
    primary: ['agreeableness', 'extraversion'],
    weights: { agreeableness: 0.9, extraversion: 0.6 }
  },
  'innovation': {
    primary: ['openness'],
    weights: { openness: 1.0 }
  },
  'execution': {
    primary: ['conscientiousness'],
    weights: { conscientiousness: 1.0 }
  },

  // Executive domains
  'strategic-thinking': {
    primary: ['openness', 'conscientiousness'],
    weights: { openness: 0.7, conscientiousness: 0.6 }
  },
  'decision-making': {
    primary: ['conscientiousness', 'neuroticism'],
    weights: { conscientiousness: 0.8, neuroticism: -0.4 }
  },
  'team-building': {
    primary: ['agreeableness', 'extraversion'],
    weights: { agreeableness: 0.7, extraversion: 0.8 }
  },
  'influence': {
    primary: ['extraversion', 'agreeableness'],
    weights: { extraversion: 0.9, agreeableness: 0.4 }
  },
  'vision': {
    primary: ['openness', 'extraversion'],
    weights: { openness: 0.9, extraversion: 0.5 }
  },

  // Organizational domains
  'culture': {
    primary: ['agreeableness', 'openness'],
    weights: { agreeableness: 0.7, openness: 0.5 }
  },
  'processes': {
    primary: ['conscientiousness'],
    weights: { conscientiousness: 1.0 }
  },
  'talent': {
    primary: ['agreeableness', 'openness'],
    weights: { agreeableness: 0.6, openness: 0.7 }
  },
  'strategy': {
    primary: ['openness', 'conscientiousness'],
    weights: { openness: 0.8, conscientiousness: 0.6 }
  }
};

// Reverse-scored items (high scores indicate low trait levels)
export const REVERSE_SCORED_PATTERNS = [
  // Neuroticism reverse indicators
  /calm|relaxed|stable|confident|secure/i,
  // Low openness indicators
  /traditional|conventional|routine|practical/i,
  // Low extraversion indicators
  /quiet|reserved|solitary|independent/i,
  // Low agreeableness indicators
  /competitive|assertive|challenging|critical/i,
  // Low conscientiousness indicators
  /flexible|spontaneous|adaptable|improvis/i
];

/**
 * Generate question-trait mappings for an assessment
 */
export function generateQuestionMappings(
  questions: Array<{
    id: string;
    domain: string;
    question_text: string;
    question_type: string;
    metadata?: any;
  }>
): QuestionTraitMapping[] {
  return questions.map(question => {
    const domainCorrelations = DOMAIN_TRAIT_CORRELATIONS[question.domain];
    
    if (!domainCorrelations) {
      // Default mapping if domain not found
      return {
        questionId: question.id,
        traits: {
          openness: 0.2,
          conscientiousness: 0.2,
          extraversion: 0.2,
          agreeableness: 0.2,
          neuroticism: 0.2
        }
      };
    }

    // Check if question is reverse-scored
    const isReverse = REVERSE_SCORED_PATTERNS.some(pattern => 
      pattern.test(question.question_text)
    );

    // Build trait weights from domain correlations
    const traits: any = {};
    Object.entries(domainCorrelations.weights).forEach(([trait, weight]) => {
      traits[trait] = weight;
    });

    return {
      questionId: question.id,
      traits,
      reverse: isReverse
    };
  });
}

/**
 * Map IOC pillars to OCEAN traits
 */
export const PILLAR_OCEAN_MAPPING = {
  sustainable: {
    primary: ['conscientiousness', 'neuroticism'],
    weights: {
      conscientiousness: 0.7,
      neuroticism: -0.6  // Low neuroticism = high emotional stability
    }
  },
  performance: {
    primary: ['conscientiousness', 'extraversion'],
    weights: {
      conscientiousness: 0.9,
      extraversion: 0.5
    }
  },
  potential: {
    primary: ['openness', 'extraversion'],
    weights: {
      openness: 0.8,
      extraversion: 0.6
    }
  }
};

/**
 * Get trait weight for a specific pillar-domain combination
 */
export function getPillarDomainTraitWeight(
  pillar: string,
  domain: string,
  trait: string
): number {
  const pillarWeights = PILLAR_OCEAN_MAPPING[pillar]?.weights || {};
  const domainWeights = DOMAIN_TRAIT_CORRELATIONS[domain]?.weights || {};
  
  // Combine pillar and domain weights
  const pillarWeight = pillarWeights[trait] || 0;
  const domainWeight = domainWeights[trait] || 0;
  
  // Average the weights, giving slightly more importance to domain
  return (pillarWeight * 0.4 + domainWeight * 0.6);
}

/**
 * Enhanced mapping for complex question types
 */
export const COMPLEX_QUESTION_MAPPINGS = {
  // AI triangulation questions
  ai_triangulation: {
    responsePatterns: {
      analytical: { conscientiousness: 0.8, openness: 0.5 },
      creative: { openness: 0.9, conscientiousness: 0.3 },
      practical: { conscientiousness: 0.7, openness: 0.2 },
      theoretical: { openness: 0.8, conscientiousness: 0.4 }
    }
  },

  // 360 feedback mappings
  feedback_360: {
    raterPerspectives: {
      self: 1.0,         // Full weight for self-assessments
      peer: 0.8,         // Slightly reduced weight for peer feedback
      manager: 0.9,      // High weight for manager perspective
      direct_report: 0.7 // Moderate weight for subordinate feedback
    }
  }
};

/**
 * Map confidence scores to trait reliability
 */
export function adjustTraitScoreByConfidence(
  traitScore: number,
  confidenceScore: number
): number {
  // Confidence affects how much we trust extreme scores
  const deviation = traitScore - 3; // Distance from neutral
  const confidenceMultiplier = 0.5 + (confidenceScore / 100) * 0.5; // 0.5 to 1.0
  
  return 3 + (deviation * confidenceMultiplier);
}