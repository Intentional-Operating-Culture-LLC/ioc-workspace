/**
 * OCEAN Dark Side Mapping Framework
 * Maps trait extremes, personality derailers, and stress-induced behavioral changes
 * Comprehensive framework for identifying when strengths become weaknesses
 */

import { OceanScore } from './ocean-scoring';

// Dark side trait thresholds and mapping
export const DARK_SIDE_THRESHOLDS = {
  HIGH_EXTREME: 4.5,
  LOW_EXTREME: 1.5,
  STRESS_AMPLIFIER: 0.5, // How much stress amplifies dark side tendencies
  WARNING_THRESHOLD: 3.8 // When to start monitoring for overuse
};

// Dark side manifestations for each trait extreme
export const DARK_SIDE_MANIFESTATIONS = {
  openness: {
    high: {
      name: 'Chaotic Visionary',
      description: 'Unrealistic, impractical, scattered thinking',
      behaviors: [
        'Constantly pursuing new ideas without follow-through',
        'Dismissing practical constraints as "limiting"',
        'Creating confusion with too many initiatives',
        'Neglecting operational details for "big picture"',
        'Overwhelming teams with constant change'
      ],
      stressAmplifiers: [
        'Becomes increasingly erratic under pressure',
        'Abandons current projects for "better" ideas',
        'Creates chaos in attempt to find breakthrough solutions'
      ],
      impactOnOthers: [
        'Team exhaustion from constant pivoting',
        'Loss of confidence in leadership direction',
        'Operational instability and missed deadlines',
        'Decreased morale from lack of closure'
      ],
      compensatoryBehaviors: [
        'Over-intellectualizing to avoid practical decisions',
        'Using complexity to mask lack of focus',
        'Constant learning as avoidance of execution'
      ]
    },
    low: {
      name: 'Rigid Traditionalist',
      description: 'Inflexible, closed-minded, change-resistant',
      behaviors: [
        'Automatically rejecting new ideas or approaches',
        'Insisting on traditional methods regardless of context',
        'Punishing innovation attempts',
        'Creating overly restrictive policies',
        'Micromanaging to prevent any deviation'
      ],
      stressAmplifiers: [
        'Becomes increasingly controlling when threatened',
        'Escalates resistance to necessary changes',
        'Creates toxic environment for creative thinking'
      ],
      impactOnOthers: [
        'Stifled innovation and creative problem-solving',
        'Talented employees leaving for more dynamic environments',
        'Organizational stagnation and competitive decline',
        'Culture of fear around suggesting improvements'
      ],
      compensatoryBehaviors: [
        'Claiming superior experience to justify inflexibility',
        'Finding fault with any new approach',
        'Creating complex approval processes to prevent change'
      ]
    }
  },
  conscientiousness: {
    high: {
      name: 'Perfectionist Controller',
      description: 'Rigid, perfectionist, workaholic micromanager',
      behaviors: [
        'Setting impossibly high standards for self and others',
        'Obsessing over minor details while missing deadlines',
        'Unable to delegate due to trust issues',
        'Working excessive hours and expecting same from team',
        'Paralysis from fear of making imperfect decisions'
      ],
      stressAmplifiers: [
        'Standards become even more unrealistic under pressure',
        'Micromanagement intensifies to control outcomes',
        'Sleep deprivation leads to poor judgment'
      ],
      impactOnOthers: [
        'Team burnout from unrealistic expectations',
        'Decreased productivity from excessive checking',
        'Innovation stifled by fear of imperfection',
        'High turnover from unsustainable pressure'
      ],
      compensatoryBehaviors: [
        'Staying late to redo others\' work',
        'Creating excessive documentation and processes',
        'Becoming the bottleneck for all decisions'
      ]
    },
    low: {
      name: 'Chaotic Underperformer',
      description: 'Disorganized, unreliable, lacks follow-through',
      behaviors: [
        'Consistently missing deadlines and commitments',
        'Poor planning and preparation for important events',
        'Ignoring details that lead to quality problems',
        'Procrastinating on difficult or unpleasant tasks',
        'Making impulsive decisions without considering consequences'
      ],
      stressAmplifiers: [
        'Organization completely breaks down under pressure',
        'Abandons responsibilities when overwhelmed',
        'Makes increasingly poor decisions when rushed'
      ],
      impactOnOthers: [
        'Team frustration from unreliable leadership',
        'Increased workload as others compensate',
        'Loss of stakeholder confidence',
        'Culture of low accountability develops'
      ],
      compensatoryBehaviors: [
        'Blaming external factors for poor performance',
        'Over-promising to compensate for past failures',
        'Avoiding accountability through deflection'
      ]
    }
  },
  extraversion: {
    high: {
      name: 'Attention-Seeking Dominator',
      description: 'Attention-seeking, poor listening, impulsively dominant',
      behaviors: [
        'Monopolizing conversations and meetings',
        'Making decisions quickly without gathering input',
        'Seeking recognition and credit for team achievements',
        'Interrupting others and finishing their sentences',
        'Creating drama to stay at center of attention'
      ],
      stressAmplifiers: [
        'Becomes increasingly loud and dominant when challenged',
        'Seeks even more attention when feeling insecure',
        'Makes rash decisions to appear decisive'
      ],
      impactOnOthers: [
        'Quieter team members become disengaged',
        'Poor decision quality from lack of input',
        'Resentment from feeling unheard and undervalued',
        'Groupthink as dissenting voices are suppressed'
      ],
      compensatoryBehaviors: [
        'Constant networking to maintain energy and attention',
        'Taking on too many commitments to stay visible',
        'Using humor or charm to deflect from poor performance'
      ]
    },
    low: {
      name: 'Withdrawn Avoider',
      description: 'Socially withdrawn, communication-avoidant, isolated',
      behaviors: [
        'Avoiding necessary difficult conversations',
        'Failing to communicate vision or expectations clearly',
        'Isolating from team during critical periods',
        'Under-communicating changes or important information',
        'Avoiding public speaking or presentation opportunities'
      ],
      stressAmplifiers: [
        'Becomes increasingly isolated when pressure mounts',
        'Communication becomes even more minimal',
        'Avoids confrontation even when critical'
      ],
      impactOnOthers: [
        'Team confusion from lack of clear direction',
        'Missed opportunities due to poor external relationships',
        'Low morale from feeling disconnected from leadership',
        'Important issues go unaddressed due to avoidance'
      ],
      compensatoryBehaviors: [
        'Over-relying on written communication to avoid face-to-face',
        'Delegating all external relationship building',
        'Creating barriers to avoid unwanted social interaction'
      ]
    }
  },
  agreeableness: {
    high: {
      name: 'Conflict-Avoidant Pushover',
      description: 'Pushover, conflict-avoidant, naively trusting',
      behaviors: [
        'Avoiding all conflict even when necessary for progress',
        'Being unable to say no to unreasonable requests',
        'Trusting others despite clear evidence of poor performance',
        'Prioritizing harmony over results and accountability',
        'Taking on others\' work to avoid disappointing them'
      ],
      stressAmplifiers: [
        'Becomes even more accommodating when pressured',
        'Sacrifices important goals to maintain relationships',
        'Allows poor performers to continue unchecked'
      ],
      impactOnOthers: [
        'High performers frustrated by lack of accountability',
        'Standards drift lower as poor performance is tolerated',
        'Team loses respect for leadership effectiveness',
        'Important decisions delayed to avoid upsetting anyone'
      ],
      compensatoryBehaviors: [
        'Working excessive hours to avoid burdening others',
        'Making excuses for poor performers',
        'Seeking consensus even when quick decisions are needed'
      ]
    },
    low: {
      name: 'Ruthless Competitor',
      description: 'Cold, competitive, lacks empathy',
      behaviors: [
        'Prioritizing personal success over team welfare',
        'Being dismissive of others\' concerns or emotions',
        'Creating competitive rather than collaborative environment',
        'Lacking empathy for personal circumstances',
        'Using others as stepping stones for advancement'
      ],
      stressAmplifiers: [
        'Becomes increasingly self-focused under pressure',
        'Blames others for failures and takes credit for successes',
        'Views every interaction as zero-sum competition'
      ],
      impactOnOthers: [
        'Team members feel undervalued and dispensable',
        'Collaboration breaks down as people protect themselves',
        'High turnover as people seek more supportive environments',
        'Toxic culture of internal competition develops'
      ],
      compensatoryBehaviors: [
        'Justifying harsh treatment as "business necessity"',
        'Surrounding self with sycophants who won\'t challenge',
        'Using intimidation to maintain control'
      ]
    }
  },
  neuroticism: {
    high: {
      name: 'Anxious Overwhelmer',
      description: 'Chronically anxious, emotionally volatile, stress-spreading',
      behaviors: [
        'Reacting emotionally to minor setbacks or criticism',
        'Creating crisis atmosphere around normal challenges',
        'Making decisions based on fear rather than strategy',
        'Constantly seeking reassurance from others',
        'Transmitting stress and anxiety to entire team'
      ],
      stressAmplifiers: [
        'Emotional reactions become more extreme under pressure',
        'Catastrophic thinking spirals out of control',
        'Decision-making paralyzed by overwhelming anxiety'
      ],
      impactOnOthers: [
        'Team walks on eggshells to avoid triggering reactions',
        'Stress levels elevated throughout organization',
        'Decision quality suffers from emotional interference',
        'Talented people leave to escape toxic emotional environment'
      ],
      compensatoryBehaviors: [
        'Over-preparing for meetings due to anxiety',
        'Seeking constant validation and reassurance',
        'Avoiding high-stakes situations that trigger anxiety'
      ]
    },
    low: {
      name: 'Complacent Risk-Taker',
      description: 'Complacent, insensitive, overconfident risk-taker',
      behaviors: [
        'Ignoring warning signs of potential problems',
        'Making risky decisions without adequate consideration',
        'Being insensitive to others\' stress and concerns',
        'Failing to prepare for potential negative outcomes',
        'Overconfidence leading to poor risk assessment'
      ],
      stressAmplifiers: [
        'Becomes even more dismissive of concerns under pressure',
        'Takes increasingly risky shortcuts when rushed',
        'Fails to recognize severity of crisis situations'
      ],
      impactOnOthers: [
        'Team stress increases as leader appears unconcerned',
        'Important risks overlooked leading to preventable failures',
        'Others feel unsupported during difficult periods',
        'Culture of complacency develops around risk management'
      ],
      compensatoryBehaviors: [
        'Dismissing others\' concerns as "overreaction"',
        'Using past successes to justify continued risk-taking',
        'Avoiding situations that might challenge confidence'
      ]
    }
  }
};

// Stress response patterns for each trait
export const STRESS_RESPONSE_PATTERNS = {
  openness: {
    high: {
      triggers: ['Routine tasks', 'Micromanagement', 'Rigid processes'],
      adaptiveResponse: 'Finding creative solutions within constraints',
      maladaptiveResponse: 'Creating unnecessary complexity to feel engaged',
      recoveryFactors: ['Variety in tasks', 'Creative challenges', 'Autonomy'],
      warningSignals: ['Increasing boredom complaints', 'Over-complicating simple tasks', 'Constant idea generation without execution']
    },
    low: {
      triggers: ['Frequent changes', 'Ambiguous instructions', 'New technologies'],
      adaptiveResponse: 'Seeking clarity and structure in chaos',
      maladaptiveResponse: 'Rigidly resisting all change regardless of merit',
      recoveryFactors: ['Clear procedures', 'Stable environment', 'Predictable routine'],
      warningSignals: ['Increasing complaints about changes', 'Passive resistance to new initiatives', 'Excessive focus on "how we\'ve always done it"']
    }
  },
  conscientiousness: {
    high: {
      triggers: ['Unclear deadlines', 'Incomplete information', 'Delegating tasks'],
      adaptiveResponse: 'Creating structure and processes to manage uncertainty',
      maladaptiveResponse: 'Paralysis from inability to achieve perfection',
      recoveryFactors: ['Clear expectations', 'Adequate time for thoroughness', 'Recognition of quality work'],
      warningSignals: ['Increasing time spent on minor details', 'Difficulty delegating', 'Working excessive hours']
    },
    low: {
      triggers: ['Tight deadlines', 'Detail-oriented tasks', 'High accountability'],
      adaptiveResponse: 'Leveraging others\' organizational strengths',
      maladaptiveResponse: 'Completely abandoning planning and preparation',
      recoveryFactors: ['Flexible deadlines', 'Support with organization', 'Focus on big picture'],
      warningSignals: ['Increasing missed deadlines', 'Avoidance of detailed tasks', 'Blaming external factors for poor performance']
    }
  },
  extraversion: {
    high: {
      triggers: ['Social isolation', 'Solo work', 'Lack of recognition'],
      adaptiveResponse: 'Seeking appropriate social stimulation and collaboration',
      maladaptiveResponse: 'Creating drama or conflict to generate stimulation',
      recoveryFactors: ['Team interaction', 'Public recognition', 'Collaborative projects'],
      warningSignals: ['Excessive meeting scheduling', 'Attention-seeking behaviors', 'Difficulty with solo work']
    },
    low: {
      triggers: ['Public speaking', 'Large group meetings', 'High visibility roles'],
      adaptiveResponse: 'Preparing thoroughly for social interactions',
      maladaptiveResponse: 'Complete withdrawal from necessary social leadership',
      recoveryFactors: ['Quiet workspace', 'Small group interactions', 'Written communication options'],
      warningSignals: ['Avoiding team meetings', 'Delegating all external communication', 'Increased isolation']
    }
  },
  agreeableness: {
    high: {
      triggers: ['Conflict situations', 'Difficult personnel decisions', 'Competitive environments'],
      adaptiveResponse: 'Finding collaborative solutions to conflicts',
      maladaptiveResponse: 'Avoiding all conflict even when necessary',
      recoveryFactors: ['Supportive team environment', 'Clear conflict resolution processes', 'Training in difficult conversations'],
      warningSignals: ['Increasing avoidance of difficult decisions', 'Tolerance of poor performance', 'Taking on others\' responsibilities']
    },
    low: {
      triggers: ['Team-building activities', 'Collaborative decision-making', 'Emotional discussions'],
      adaptiveResponse: 'Recognizing value of others\' input and emotions',
      maladaptiveResponse: 'Becoming increasingly cold and dismissive',
      recoveryFactors: ['Individual achievement recognition', 'Structured interaction formats', 'Clear role boundaries'],
      warningSignals: ['Increasing dismissiveness of others', 'Reduced empathy in interactions', 'Focus only on personal success']
    }
  },
  neuroticism: {
    high: {
      triggers: ['High-pressure situations', 'Uncertainty', 'Criticism'],
      adaptiveResponse: 'Using anxiety as motivation for thorough preparation',
      maladaptiveResponse: 'Emotional volatility disrupting team function',
      recoveryFactors: ['Stress management support', 'Clear communication', 'Predictable environment'],
      warningSignals: ['Increasing emotional reactions', 'Sleep problems', 'Catastrophic thinking']
    },
    low: {
      triggers: ['Crisis situations requiring emotional sensitivity', 'Team stress', 'Risk assessment needs'],
      adaptiveResponse: 'Providing calm stability during turbulent times',
      maladaptiveResponse: 'Dangerous overconfidence and risk-taking',
      recoveryFactors: ['Regular risk assessment prompts', 'Diverse advisory input', 'Structured stress monitoring'],
      warningSignals: ['Dismissing others\' concerns', 'Taking unnecessary risks', 'Lack of stress response in critical situations']
    }
  }
};

// Early warning indicators for trait derailment
export const EARLY_WARNING_INDICATORS = {
  behavioral: {
    openness: {
      high: ['Starts multiple projects without finishing previous ones', 'Constantly reorganizes team structure', 'Dismisses practical concerns as "limiting creativity"'],
      low: ['Responds to all suggestions with "we tried that before"', 'Creates increasingly detailed procedures', 'Punishes any deviation from established process']
    },
    conscientiousness: {
      high: ['Staying significantly later than team', 'Redoing others\' completed work', 'Creating elaborate backup plans for low-risk situations'],
      low: ['Missing previously reliable deadlines', 'Showing up unprepared to important meetings', 'Making commitments without checking calendar']
    },
    extraversion: {
      high: ['Talking significantly more in meetings', 'Scheduling back-to-back social interactions', 'Becoming agitated during quiet work periods'],
      low: ['Declining optional team activities', 'Communicating primarily through written channels', 'Avoiding one-on-one conversations']
    },
    agreeableness: {
      high: ['Taking on others\' work responsibilities', 'Agreeing to conflicting commitments', 'Avoiding giving negative feedback'],
      low: ['Making unilateral decisions without consultation', 'Showing impatience with others\' emotions', 'Focusing only on personal metrics']
    },
    neuroticism: {
      high: ['Visible physical stress symptoms', 'Overreacting to minor setbacks', 'Seeking excessive reassurance'],
      low: ['Dismissing team stress concerns', 'Making decisions without risk analysis', 'Showing no concern during crisis situations']
    }
  },
  cognitive: {
    openness: {
      high: ['Abstract thinking interferes with practical decisions', 'Difficulty prioritizing among many interesting options', 'Boredom with operational details'],
      low: ['Black-and-white thinking about new proposals', 'Inability to see alternative perspectives', 'Focus only on immediate practical concerns']
    },
    conscientiousness: {
      high: ['Perfectionism prevents completion', 'Analysis paralysis on decisions', 'Inability to distinguish important from trivial details'],
      low: ['Lack of planning for known challenges', 'Difficulty learning from mistakes', 'Short-term thinking dominates']
    },
    extraversion: {
      high: ['External processing interferes with reflection', 'Difficulty with independent analysis', 'Need for constant stimulation affects focus'],
      low: ['Overthinking social interactions', 'Difficulty reading group dynamics', 'Missing opportunities for influence']
    },
    agreeableness: {
      high: ['Conflict avoidance impairs judgment', 'Inability to see others\' ulterior motives', 'Difficulty making tough but necessary decisions'],
      low: ['Cynical interpretation of others\' motives', 'Zero-sum thinking about relationships', 'Difficulty building coalitions']
    },
    neuroticism: {
      high: ['Catastrophic thinking patterns', 'Difficulty distinguishing real from imagined threats', 'Emotional reasoning overrides logic'],
      low: ['Underestimating real risks', 'Overconfidence in uncertain situations', 'Difficulty processing negative feedback']
    }
  },
  interpersonal: {
    openness: {
      high: ['Team confusion from constantly changing direction', 'Frustration from unfinished initiatives', 'Feeling overwhelmed by leader\'s ideas'],
      low: ['Team stops suggesting improvements', 'Innovation decreases across organization', 'Talented people leave for more dynamic environments']
    },
    conscientiousness: {
      high: ['Team burnout from unrealistic standards', 'Reduced risk-taking due to fear of imperfection', 'Bottlenecks from micromanagement'],
      low: ['Team loses confidence in leader reliability', 'Others compensate by taking on additional responsibilities', 'Stakeholders express concern about commitments']
    },
    extraversion: {
      high: ['Quieter team members become disengaged', 'Decision quality suffers from lack of input', 'Meeting efficiency decreases'],
      low: ['Team seeks direction from other sources', 'External relationships deteriorate', 'Communication gaps increase']
    },
    agreeableness: {
      high: ['High performers frustrated by lack of accountability', 'Standards drift lower', 'Difficult decisions get postponed'],
      low: ['Team members become defensive', 'Collaboration breaks down', 'Culture becomes competitive rather than collaborative']
    },
    neuroticism: {
      high: ['Team stress levels increase', 'Others avoid bringing problems forward', 'Decision-making becomes reactive'],
      low: ['Team feels unsupported during difficult times', 'Others increase their own stress responses to compensate', 'Important concerns get dismissed']
    }
  }
};

// Measurement framework for dark side traits
export interface DarkSideAssessment {
  traitScores: OceanScore;
  darkSideRisk: DarkSideRiskProfile;
  stressResponse: StressResponseAssessment;
  behavioralIndicators: BehavioralIndicatorReport;
  interventionRecommendations: InterventionPlan;
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
  stressAmplification: number; // 1.0-3.0 multiplier
  compensatoryBehaviors: string[];
}

export interface StressResponseAssessment {
  currentStressLevel: number; // 1-10 scale
  stressorsIdentified: string[];
  adaptiveCapacity: number; // 0-100
  maladaptivePatterns: string[];
  recoveryFactors: string[];
  teamImpact: 'positive' | 'neutral' | 'negative' | 'toxic';
}

export interface BehavioralIndicatorReport {
  observedBehaviors: {
    [category: string]: {
      frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
      severity: 'minor' | 'moderate' | 'significant' | 'severe';
      trend: 'improving' | 'stable' | 'worsening';
      examples: string[];
    };
  };
  selfAwarenessGap: number; // Difference between self and observer ratings
  impactOnOthers: {
    teamMorale: number;
    productivity: number;
    turnoverRisk: number;
    stakeholderConfidence: number;
  };
}

export interface InterventionPlan {
  immediateActions: {
    action: string;
    priority: 'urgent' | 'high' | 'medium';
    timeframe: string;
    responsibility: string[];
  }[];
  developmentGoals: {
    trait: string;
    targetBehavior: string;
    methods: string[];
    timeline: string;
    successMetrics: string[];
  }[];
  supportStructures: {
    coaching: string[];
    mentoring: string[];
    training: string[];
    systemicChanges: string[];
  };
  monitoringPlan: {
    indicators: string[];
    frequency: string;
    reviewers: string[];
    escalationTriggers: string[];
  };
}

/**
 * Assess dark side risk for given OCEAN profile
 */
export function assessDarkSideRisk(
  profile: OceanScore,
  stressLevel: number = 5,
  observerRatings?: OceanScore
): DarkSideRiskProfile {
  const traitRisks: { [trait: string]: any } = {};
  let totalRisk = 0;
  const compensatoryBehaviors: string[] = [];

  for (const [trait, score] of Object.entries(profile)) {
    const riskAssessment = assessTraitRisk(trait, score, stressLevel);
    traitRisks[trait] = riskAssessment;
    
    // Add to total risk calculation
    const riskWeights = { low: 1, moderate: 2, high: 3, critical: 4 };
    totalRisk += riskWeights[riskAssessment.riskLevel];

    // Identify compensatory behaviors
    if (riskAssessment.riskLevel !== 'low') {
      const behaviors = identifyCompensatoryBehaviors(trait, score);
      compensatoryBehaviors.push(...behaviors);
    }
  }

  // Calculate overall risk level
  const avgRisk = totalRisk / Object.keys(profile).length;
  let overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  if (avgRisk >= 3.5) overallRisk = 'critical';
  else if (avgRisk >= 2.5) overallRisk = 'high';
  else if (avgRisk >= 1.5) overallRisk = 'moderate';
  else overallRisk = 'low';

  // Calculate stress amplification
  const stressAmplification = 1.0 + (stressLevel / 10) * 2.0;

  return {
    overallRisk,
    traitRisks,
    stressAmplification,
    compensatoryBehaviors: [...new Set(compensatoryBehaviors)]
  };
}

/**
 * Assess risk for individual trait
 */
function assessTraitRisk(trait: string, score: number, stressLevel: number): any {
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let manifestationType: 'high_extreme' | 'low_extreme' | 'none' = 'none';
  let primaryConcerns: string[] = [];
  let impactAreas: string[] = [];

  // Determine if trait is at extreme
  if (score >= DARK_SIDE_THRESHOLDS.HIGH_EXTREME) {
    manifestationType = 'high_extreme';
    const manifestation = DARK_SIDE_MANIFESTATIONS[trait as keyof typeof DARK_SIDE_MANIFESTATIONS]?.high;
    if (manifestation) {
      primaryConcerns = manifestation.behaviors.slice(0, 3);
      impactAreas = manifestation.impactOnOthers.slice(0, 3);
    }
  } else if (score <= DARK_SIDE_THRESHOLDS.LOW_EXTREME) {
    manifestationType = 'low_extreme';
    const manifestation = DARK_SIDE_MANIFESTATIONS[trait as keyof typeof DARK_SIDE_MANIFESTATIONS]?.low;
    if (manifestation) {
      primaryConcerns = manifestation.behaviors.slice(0, 3);
      impactAreas = manifestation.impactOnOthers.slice(0, 3);
    }
  } else if (score >= DARK_SIDE_THRESHOLDS.WARNING_THRESHOLD) {
    // High but not extreme - watch for overuse
    primaryConcerns = [`Watch for overuse of ${trait} strengths`];
    impactAreas = ['Potential team dynamics issues'];
  }

  // Determine risk level based on extremeness and stress
  if (manifestationType !== 'none') {
    const extremeness = Math.abs(score - 3.0);
    const stressMultiplier = stressLevel / 5.0;
    const riskScore = extremeness * stressMultiplier;

    if (riskScore >= 2.0) riskLevel = 'critical';
    else if (riskScore >= 1.5) riskLevel = 'high';
    else if (riskScore >= 1.0) riskLevel = 'moderate';
  }

  return {
    riskLevel,
    manifestationType,
    primaryConcerns,
    impactAreas
  };
}

/**
 * Identify compensatory behaviors for trait extremes
 */
function identifyCompensatoryBehaviors(trait: string, score: number): string[] {
  const behaviors: string[] = [];
  
  if (score >= DARK_SIDE_THRESHOLDS.HIGH_EXTREME || score <= DARK_SIDE_THRESHOLDS.LOW_EXTREME) {
    const manifestations = DARK_SIDE_MANIFESTATIONS[trait as keyof typeof DARK_SIDE_MANIFESTATIONS];
    if (score >= DARK_SIDE_THRESHOLDS.HIGH_EXTREME && manifestations?.high) {
      behaviors.push(...manifestations.high.compensatoryBehaviors);
    } else if (score <= DARK_SIDE_THRESHOLDS.LOW_EXTREME && manifestations?.low) {
      behaviors.push(...manifestations.low.compensatoryBehaviors);
    }
  }

  return behaviors;
}

/**
 * Generate comprehensive dark side assessment
 */
export function generateDarkSideAssessment(
  profile: OceanScore,
  stressLevel: number = 5,
  observerRatings?: OceanScore,
  behavioralObservations?: string[]
): DarkSideAssessment {
  const darkSideRisk = assessDarkSideRisk(profile, stressLevel, observerRatings);
  const stressResponse = assessStressResponse(profile, stressLevel);
  const behavioralIndicators = analyzeBehavioralIndicators(profile, observerRatings, behavioralObservations);
  const interventionRecommendations = generateInterventionPlan(darkSideRisk, stressResponse, behavioralIndicators);

  return {
    traitScores: profile,
    darkSideRisk,
    stressResponse,
    behavioralIndicators,
    interventionRecommendations
  };
}

/**
 * Assess stress response patterns
 */
function assessStressResponse(profile: OceanScore, currentStressLevel: number): StressResponseAssessment {
  const stressorsIdentified: string[] = [];
  const maladaptivePatterns: string[] = [];
  const recoveryFactors: string[] = [];

  // Analyze each trait's stress response
  for (const [trait, score] of Object.entries(profile)) {
    const patterns = STRESS_RESPONSE_PATTERNS[trait as keyof typeof STRESS_RESPONSE_PATTERNS];
    if (patterns) {
      const traitPattern = score >= 3.5 ? patterns.high : patterns.low;
      stressorsIdentified.push(...traitPattern.triggers);
      recoveryFactors.push(...traitPattern.recoveryFactors);
      
      if (currentStressLevel >= 7) {
        maladaptivePatterns.push(traitPattern.maladaptiveResponse);
      }
    }
  }

  // Calculate adaptive capacity
  const emotionalStability = 6 - profile.neuroticism;
  const conscientiousness = profile.conscientiousness;
  const openness = profile.openness;
  
  const adaptiveCapacity = Math.min(100, Math.max(0, 
    (emotionalStability * 30 + conscientiousness * 25 + openness * 20 + 25) / 100 * 100
  ));

  // Determine team impact
  let teamImpact: 'positive' | 'neutral' | 'negative' | 'toxic';
  if (currentStressLevel >= 8 && profile.neuroticism >= 4) {
    teamImpact = 'toxic';
  } else if (currentStressLevel >= 6 && (profile.neuroticism >= 3.5 || profile.agreeableness <= 2.5)) {
    teamImpact = 'negative';
  } else if (emotionalStability >= 4 && profile.agreeableness >= 3.5) {
    teamImpact = 'positive';
  } else {
    teamImpact = 'neutral';
  }

  return {
    currentStressLevel,
    stressorsIdentified: [...new Set(stressorsIdentified)],
    adaptiveCapacity,
    maladaptivePatterns: [...new Set(maladaptivePatterns)],
    recoveryFactors: [...new Set(recoveryFactors)],
    teamImpact
  };
}

/**
 * Analyze behavioral indicators from observations
 */
function analyzeBehavioralIndicators(
  profile: OceanScore,
  observerRatings?: OceanScore,
  observations?: string[]
): BehavioralIndicatorReport {
  const observedBehaviors: { [category: string]: any } = {};

  // Analyze each trait category
  for (const trait of Object.keys(profile)) {
    const indicators = EARLY_WARNING_INDICATORS.behavioral[trait as keyof typeof EARLY_WARNING_INDICATORS.behavioral];
    const score = profile[trait as keyof OceanScore];
    
    let behaviors: string[] = [];
    if (score >= DARK_SIDE_THRESHOLDS.HIGH_EXTREME && indicators?.high) {
      behaviors = indicators.high;
    } else if (score <= DARK_SIDE_THRESHOLDS.LOW_EXTREME && indicators?.low) {
      behaviors = indicators.low;
    }

    if (behaviors.length > 0) {
      observedBehaviors[trait] = {
        frequency: score >= 4.5 || score <= 1.5 ? 'frequent' : 'occasional',
        severity: score >= 4.7 || score <= 1.3 ? 'significant' : 'moderate',
        trend: 'stable', // Would be determined from longitudinal data
        examples: behaviors
      };
    }
  }

  // Calculate self-awareness gap
  const selfAwarenessGap = observerRatings ? calculateAwarenessGap(profile, observerRatings) : 0;

  // Estimate impact on others
  const impactOnOthers = {
    teamMorale: estimateTeamMorale(profile),
    productivity: estimateProductivity(profile),
    turnoverRisk: estimateTurnoverRisk(profile),
    stakeholderConfidence: estimateStakeholderConfidence(profile)
  };

  return {
    observedBehaviors,
    selfAwarenessGap,
    impactOnOthers
  };
}

/**
 * Generate intervention plan based on assessment
 */
function generateInterventionPlan(
  riskProfile: DarkSideRiskProfile,
  stressResponse: StressResponseAssessment,
  behavioralReport: BehavioralIndicatorReport
): InterventionPlan {
  const immediateActions: any[] = [];
  const developmentGoals: any[] = [];
  const supportStructures = {
    coaching: [] as string[],
    mentoring: [] as string[],
    training: [] as string[],
    systemicChanges: [] as string[]
  };

  // Generate immediate actions based on risk level
  if (riskProfile.overallRisk === 'critical' || stressResponse.teamImpact === 'toxic') {
    immediateActions.push({
      action: 'Emergency leadership coaching and stress management intervention',
      priority: 'urgent' as const,
      timeframe: 'Within 48 hours',
      responsibility: ['Executive coach', 'HR Director', 'CEO']
    });
  }

  if (riskProfile.overallRisk === 'high') {
    immediateActions.push({
      action: '360-degree feedback and leadership assessment',
      priority: 'high' as const,
      timeframe: 'Within 2 weeks',
      responsibility: ['HR Director', 'Direct reports']
    });
  }

  // Generate development goals for each high-risk trait
  for (const [trait, risk] of Object.entries(riskProfile.traitRisks)) {
    if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
      developmentGoals.push({
        trait,
        targetBehavior: `Manage ${trait} extremes and reduce negative impact`,
        methods: generateDevelopmentMethods(trait, risk.manifestationType),
        timeline: '3-6 months',
        successMetrics: [`Reduced behavioral indicators`, `Improved team feedback`, `Better stress management`]
      });
    }
  }

  // Add support structures
  if (stressResponse.currentStressLevel >= 7) {
    supportStructures.coaching.push('Stress management coaching', 'Executive wellness program');
  }

  if (behavioralReport.selfAwarenessGap > 1.0) {
    supportStructures.training.push('Self-awareness development', '360-degree feedback training');
  }

  // Monitoring plan
  const monitoringPlan = {
    indicators: [
      'Team engagement scores',
      'Stress level assessments',
      'Behavioral observation reports',
      '360-degree feedback scores'
    ],
    frequency: 'Monthly for 6 months, then quarterly',
    reviewers: ['Executive coach', 'HR Director', 'Direct supervisor'],
    escalationTriggers: [
      'Team engagement drops below 60%',
      'Stress level exceeds 8/10',
      'Multiple behavioral concerns reported',
      'Turnover in direct reports'
    ]
  };

  return {
    immediateActions,
    developmentGoals,
    supportStructures,
    monitoringPlan
  };
}

// Helper functions
function calculateAwarenessGap(selfRating: OceanScore, observerRating: OceanScore): number {
  let totalGap = 0;
  let count = 0;

  for (const trait of Object.keys(selfRating)) {
    const gap = Math.abs(selfRating[trait as keyof OceanScore] - observerRating[trait as keyof OceanScore]);
    totalGap += gap;
    count++;
  }

  return totalGap / count;
}

function estimateTeamMorale(profile: OceanScore): number {
  // High neuroticism and low agreeableness reduce morale
  const moraleFactor = (6 - profile.neuroticism) * 0.4 + profile.agreeableness * 0.6;
  return Math.min(100, Math.max(0, moraleFactor * 20));
}

function estimateProductivity(profile: OceanScore): number {
  // Extreme conscientiousness can hurt productivity through perfectionism
  let productivityScore = profile.conscientiousness;
  if (profile.conscientiousness >= 4.5) {
    productivityScore = 5.5 - profile.conscientiousness; // Diminishing returns
  }
  
  // High neuroticism also reduces productivity
  productivityScore -= (profile.neuroticism - 2.5) * 0.3;
  
  return Math.min(100, Math.max(0, productivityScore * 20));
}

function estimateTurnoverRisk(profile: OceanScore): number {
  // High neuroticism and low agreeableness increase turnover risk
  let riskScore = 0;
  if (profile.neuroticism >= 4) riskScore += (profile.neuroticism - 3) * 30;
  if (profile.agreeableness <= 2.5) riskScore += (3 - profile.agreeableness) * 25;
  if (profile.extraversion >= 4.5) riskScore += (profile.extraversion - 4) * 20; // Dominating behavior
  
  return Math.min(100, Math.max(0, riskScore));
}

function estimateStakeholderConfidence(profile: OceanScore): number {
  // Extreme traits reduce stakeholder confidence
  let confidenceScore = 80; // Base confidence
  
  for (const score of Object.values(profile)) {
    if (score >= 4.5 || score <= 1.5) {
      confidenceScore -= 15; // Penalty for extremes
    }
  }
  
  return Math.min(100, Math.max(0, confidenceScore));
}

function generateDevelopmentMethods(trait: string, manifestationType: string): string[] {
  const methods: { [key: string]: { [key: string]: string[] } } = {
    openness: {
      high_extreme: [
        'Project completion accountability',
        'Structured innovation processes',
        'Operational excellence training',
        'Focus and prioritization coaching'
      ],
      low_extreme: [
        'Change management training',
        'Innovation workshops',
        'Perspective-taking exercises',
        'Cross-functional assignments'
      ]
    },
    conscientiousness: {
      high_extreme: [
        'Delegation training',
        'Good enough decision-making',
        'Time management coaching',
        'Stress management techniques'
      ],
      low_extreme: [
        'Project management training',
        'Accountability partnerships',
        'Planning and organization systems',
        'Follow-through coaching'
      ]
    },
    extraversion: {
      high_extreme: [
        'Active listening training',
        'Meeting facilitation skills',
        'Introvert appreciation workshops',
        'Communication balance coaching'
      ],
      low_extreme: [
        'Public speaking training',
        'Relationship building skills',
        'Communication confidence building',
        'Network development coaching'
      ]
    },
    agreeableness: {
      high_extreme: [
        'Difficult conversations training',
        'Assertiveness coaching',
        'Conflict resolution skills',
        'Performance management training'
      ],
      low_extreme: [
        'Empathy development',
        'Collaborative leadership training',
        'Team building skills',
        'Emotional intelligence coaching'
      ]
    },
    neuroticism: {
      high_extreme: [
        'Stress management training',
        'Mindfulness and meditation',
        'Cognitive behavioral coaching',
        'Resilience building programs'
      ],
      low_extreme: [
        'Risk assessment training',
        'Emotional intelligence development',
        'Crisis management skills',
        'Empathy and sensitivity training'
      ]
    }
  };

  return methods[trait]?.[manifestationType] || ['General leadership development'];
}

export default {
  DARK_SIDE_THRESHOLDS,
  DARK_SIDE_MANIFESTATIONS,
  STRESS_RESPONSE_PATTERNS,
  EARLY_WARNING_INDICATORS,
  assessDarkSideRisk,
  generateDarkSideAssessment
};