import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from '@ioc/shared/api-utils';

// Leadership competency model based on OCEAN
const LEADERSHIP_COMPETENCIES = {
  strategic: {
    name: 'Strategic Thinking',
    description: 'Ability to see the big picture and plan for the future',
    oceanWeights: { O: 0.5, C: 0.3, N: -0.2 },
    facetWeights: {
      O5: 0.4, // Ideas
      O6: 0.3, // Values
      C6: 0.3  // Deliberation
    },
    behaviors: [
      'Develops long-term vision',
      'Identifies market opportunities',
      'Anticipates challenges',
      'Creates innovative strategies'
    ]
  },
  execution: {
    name: 'Execution Excellence',
    description: 'Ability to deliver results and drive performance',
    oceanWeights: { C: 0.6, E: 0.2, N: -0.2 },
    facetWeights: {
      C4: 0.4, // Achievement Striving
      C5: 0.3, // Self-Discipline
      C1: 0.3  // Competence
    },
    behaviors: [
      'Meets deadlines consistently',
      'Drives accountability',
      'Focuses on results',
      'Maintains high standards'
    ]
  },
  people: {
    name: 'People Leadership',
    description: 'Ability to inspire, develop, and engage others',
    oceanWeights: { E: 0.4, A: 0.4, N: -0.2 },
    facetWeights: {
      E1: 0.3, // Warmth
      A3: 0.3, // Altruism
      E3: 0.4  // Assertiveness
    },
    behaviors: [
      'Builds strong relationships',
      'Develops talent',
      'Creates psychological safety',
      'Inspires teams'
    ]
  },
  influence: {
    name: 'Influence & Communication',
    description: 'Ability to persuade and align stakeholders',
    oceanWeights: { E: 0.5, O: 0.2, A: 0.3 },
    facetWeights: {
      E3: 0.4, // Assertiveness
      E6: 0.3, // Positive Emotions
      A2: 0.3  // Straightforwardness
    },
    behaviors: [
      'Communicates vision clearly',
      'Builds coalitions',
      'Negotiates effectively',
      'Manages stakeholders'
    ]
  },
  adaptability: {
    name: 'Change Leadership',
    description: 'Ability to lead through change and uncertainty',
    oceanWeights: { O: 0.5, N: -0.3, E: 0.2 },
    facetWeights: {
      O4: 0.4, // Actions
      N6: -0.3, // Vulnerability (reversed)
      E5: 0.3  // Excitement-Seeking
    },
    behaviors: [
      'Embraces change',
      'Manages ambiguity',
      'Takes calculated risks',
      'Drives innovation'
    ]
  },
  integrity: {
    name: 'Ethical Leadership',
    description: 'Ability to lead with integrity and build trust',
    oceanWeights: { A: 0.5, C: 0.4, N: -0.1 },
    facetWeights: {
      A2: 0.4, // Straightforwardness
      C3: 0.4, // Dutifulness
      A1: 0.2  // Trust
    },
    behaviors: [
      'Acts with integrity',
      'Makes ethical decisions',
      'Builds trust',
      'Takes responsibility'
    ]
  },
  resilience: {
    name: 'Resilient Leadership',
    description: 'Ability to maintain effectiveness under pressure',
    oceanWeights: { N: -0.6, C: 0.3, E: 0.1 },
    facetWeights: {
      N1: -0.3, // Anxiety (reversed)
      N3: -0.3, // Depression (reversed)
      C5: 0.4   // Self-Discipline
    },
    behaviors: [
      'Manages stress effectively',
      'Bounces back from setbacks',
      'Maintains composure',
      'Models resilience'
    ]
  }
};

// Leadership styles based on OCEAN profiles
const LEADERSHIP_STYLES = {
  visionary: {
    name: 'Visionary Leader',
    description: 'Inspires with compelling vision and innovation',
    oceanProfile: { O: 'high', E: 'high', N: 'low' },
    strengths: ['Innovation', 'Inspiration', 'Big-picture thinking'],
    watchouts: ['May overlook details', 'Can be too idealistic']
  },
  commander: {
    name: 'Commanding Leader',
    description: 'Drives results through decisive action',
    oceanProfile: { C: 'high', E: 'high', A: 'low', N: 'low' },
    strengths: ['Decisive', 'Results-focused', 'Clear direction'],
    watchouts: ['May be perceived as harsh', 'Could neglect team morale']
  },
  coach: {
    name: 'Coaching Leader',
    description: 'Develops others and builds capability',
    oceanProfile: { A: 'high', E: 'moderate', O: 'moderate' },
    strengths: ['People development', 'Empathy', 'Team building'],
    watchouts: ['May avoid tough decisions', 'Could be too accommodating']
  },
  democratic: {
    name: 'Democratic Leader',
    description: 'Builds consensus and empowers teams',
    oceanProfile: { A: 'high', O: 'high', E: 'moderate' },
    strengths: ['Inclusive', 'Collaborative', 'Team engagement'],
    watchouts: ['Decision-making can be slow', 'May lack clear direction']
  },
  pacesetter: {
    name: 'Pacesetting Leader',
    description: 'Sets high standards and leads by example',
    oceanProfile: { C: 'high', E: 'moderate', A: 'low' },
    strengths: ['High standards', 'Technical excellence', 'Self-motivated'],
    watchouts: ['May burn out team', 'Could micromanage']
  },
  affiliative: {
    name: 'Affiliative Leader',
    description: 'Creates harmony and builds relationships',
    oceanProfile: { A: 'high', E: 'high', N: 'low' },
    strengths: ['Relationship building', 'Team harmony', 'Emotional support'],
    watchouts: ['May avoid conflict', 'Could lack performance focus']
  }
};

// Leadership derailers based on extreme OCEAN scores
const LEADERSHIP_DERAILERS = {
  micromanagement: {
    name: 'Micromanagement',
    triggers: { C: '>85', A: '<30' },
    description: 'Excessive control and lack of delegation',
    mitigation: 'Build trust in team capabilities and focus on outcomes over process'
  },
  analysis_paralysis: {
    name: 'Analysis Paralysis',
    triggers: { C: '>85', N: '>70' },
    description: 'Over-analyzing and delayed decision-making',
    mitigation: 'Set decision deadlines and embrace "good enough" solutions'
  },
  conflict_avoidance: {
    name: 'Conflict Avoidance',
    triggers: { A: '>85', N: '>70' },
    description: 'Avoiding necessary confrontations',
    mitigation: 'Develop assertiveness and view conflict as productive'
  },
  impulsiveness: {
    name: 'Impulsiveness',
    triggers: { C: '<30', N: '>70' },
    description: 'Making hasty decisions without proper consideration',
    mitigation: 'Implement decision-making frameworks and seek input'
  },
  isolation: {
    name: 'Leadership Isolation',
    triggers: { E: '<30', A: '<30' },
    description: 'Disconnection from team and stakeholders',
    mitigation: 'Schedule regular interactions and build feedback loops'
  }
};

// GET /api/assessments/[id]/leadership-profile
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment
    const { data: assessment, error: assessmentError } = await context.supabase
      .from('assessments')
      .select(`
        id,
        type,
        organization_id,
        user_id,
        status,
        settings
      `)
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return ErrorResponses.notFound('Assessment not found');
    }

    // Verify organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin', 'member']
    );
    
    if (accessError) return accessError;

    // Get OCEAN scores
    const { data: results, error: resultsError } = await context.supabase
      .from('assessment_results')
      .select(`
        ocean_scores,
        facet_scores,
        percentile_ranks,
        created_at
      `)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resultsError || !results) {
      return NextResponse.json({
        assessment: { id: assessmentId, status: assessment.status },
        message: 'No results available yet',
        leadershipProfile: null
      });
    }

    // Get user profile for context
    const { data: userProfile } = await context.supabase
      .from('users')
      .select('job_title, seniority_level, years_experience')
      .eq('id', assessment.user_id)
      .single();

    // Calculate leadership competencies
    const competencyScores = calculateLeadershipCompetencies(
      results.ocean_scores,
      results.facet_scores
    );

    // Determine leadership style
    const leadershipStyle = determineLeadershipStyle(results.ocean_scores);

    // Identify potential derailers
    const derailers = identifyDerailers(results.ocean_scores);

    // Get 360 feedback if available
    const { data: feedback360 } = await context.supabase
      .from('360_feedback_aggregated')
      .select('competency_ratings, rater_count')
      .eq('assessment_id', assessmentId)
      .single();

    // Generate leadership profile
    const leadershipProfile = {
      overallScore: calculateOverallLeadershipScore(competencyScores),
      readinessLevel: determineLeadershipReadiness(competencyScores, userProfile),
      primaryStyle: leadershipStyle.primary,
      secondaryStyle: leadershipStyle.secondary,
      competencies: competencyScores,
      strengths: identifyLeadershipStrengths(competencyScores),
      developmentAreas: identifyDevelopmentAreas(competencyScores),
      derailers: derailers,
      leadershipBrand: generateLeadershipBrand(
        results.ocean_scores,
        competencyScores,
        leadershipStyle
      )
    };

    // Compare with benchmarks
    const benchmarkComparison = await compareWithBenchmarks(
      context.supabase,
      competencyScores,
      assessment.settings?.benchmarkGroup || 'general'
    );

    // Generate development plan
    const developmentPlan = generateDevelopmentPlan(
      leadershipProfile,
      results.ocean_scores,
      userProfile
    );

    // Store leadership profile
    await storeLeadershipProfile(context.supabase, {
      assessmentId,
      userId: assessment.user_id,
      organizationId: assessment.organization_id,
      profile: leadershipProfile
    });

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        userId: assessment.user_id
      },
      leadershipProfile,
      benchmarkComparison,
      developmentPlan,
      feedback360: feedback360 ? {
        hasMultiRater: true,
        raterCount: feedback360.rater_count,
        selfOthersGap: calculateSelfOthersGap(competencyScores, feedback360.competency_ratings)
      } : null,
      metadata: {
        profileVersion: '2.0',
        competencyModel: 'OCEAN-based Leadership',
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating leadership profile:', error);
    return ErrorResponses.internalError('Failed to generate leadership profile');
  }
});

// Helper functions

function calculateLeadershipCompetencies(oceanScores, facetScores) {
  const competencies = {};

  Object.entries(LEADERSHIP_COMPETENCIES).forEach(([key, competency]) => {
    let score = 50; // Base score

    // Apply OCEAN trait influences
    Object.entries(competency.oceanWeights).forEach(([trait, weight]) => {
      const traitScore = oceanScores[trait] || 50;
      score += (traitScore - 50) * weight;
    });

    // Apply facet influences if available
    if (facetScores && competency.facetWeights) {
      let facetInfluence = 0;
      let totalWeight = 0;

      Object.entries(competency.facetWeights).forEach(([facet, weight]) => {
        if (facetScores[facet] !== undefined) {
          const facetScore = facetScores[facet];
          facetInfluence += facetScore * Math.abs(weight);
          totalWeight += Math.abs(weight);
          
          // Handle negative weights (reversed scoring)
          if (weight < 0) {
            facetInfluence -= 2 * facetScore * Math.abs(weight);
          }
        }
      });

      if (totalWeight > 0) {
        const avgFacetScore = facetInfluence / totalWeight;
        score = score * 0.6 + avgFacetScore * 0.4; // 40% facet influence
      }
    }

    // Normalize to 0-100
    score = Math.max(0, Math.min(100, score));

    competencies[key] = {
      name: competency.name,
      description: competency.description,
      score: Math.round(score),
      level: getCompetencyLevel(score),
      behaviors: competency.behaviors
    };
  });

  return competencies;
}

function getCompetencyLevel(score) {
  if (score >= 80) return 'Exceptional';
  if (score >= 70) return 'Strong';
  if (score >= 60) return 'Proficient';
  if (score >= 50) return 'Developing';
  if (score >= 40) return 'Emerging';
  return 'Needs Development';
}

function calculateOverallLeadershipScore(competencies) {
  const scores = Object.values(competencies).map(c => c.score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Weight higher scores more heavily (excellence matters in leadership)
  const topScores = scores.sort((a, b) => b - a).slice(0, 3);
  const weightedScore = (average * 0.6) + (topScores.reduce((a, b) => a + b, 0) / 3 * 0.4);
  
  return Math.round(weightedScore);
}

function determineLeadershipReadiness(competencies, userProfile) {
  const overallScore = calculateOverallLeadershipScore(competencies);
  const experience = userProfile?.years_experience || 0;
  const currentLevel = userProfile?.seniority_level || 'individual';

  // Critical competencies for leadership
  const criticalCompetencies = ['people', 'execution', 'strategic'];
  const criticalScores = criticalCompetencies.map(key => competencies[key]?.score || 0);
  const minCritical = Math.min(...criticalScores);

  if (overallScore >= 75 && minCritical >= 60) {
    return {
      level: 'ready-now',
      description: 'Ready for leadership role immediately',
      nextLevel: getNextLevel(currentLevel)
    };
  } else if (overallScore >= 65 && minCritical >= 50) {
    return {
      level: 'ready-soon',
      description: 'Ready for leadership role within 6-12 months',
      gaps: criticalCompetencies.filter(key => competencies[key].score < 70)
    };
  } else if (overallScore >= 55) {
    return {
      level: 'developing',
      description: 'Developing leadership capabilities (1-2 years)',
      developmentPriorities: identifyDevelopmentPriorities(competencies)
    };
  } else {
    return {
      level: 'early-stage',
      description: 'Early stage leadership development needed',
      fundamentals: ['self-awareness', 'communication', 'teamwork']
    };
  }
}

function getNextLevel(currentLevel) {
  const progression = {
    'individual': 'team-lead',
    'team-lead': 'manager',
    'manager': 'senior-manager',
    'senior-manager': 'director',
    'director': 'vp',
    'vp': 'executive'
  };
  
  return progression[currentLevel] || 'senior-leadership';
}

function determineLeadershipStyle(oceanScores) {
  const styles = [];

  // Calculate fit for each leadership style
  Object.entries(LEADERSHIP_STYLES).forEach(([key, style]) => {
    let fitScore = 0;
    let matches = 0;

    Object.entries(style.oceanProfile).forEach(([trait, expected]) => {
      const score = oceanScores[trait] || 50;
      
      if (expected === 'high' && score >= 65) {
        fitScore += 30;
        matches++;
      } else if (expected === 'moderate' && score >= 40 && score <= 60) {
        fitScore += 30;
        matches++;
      } else if (expected === 'low' && score <= 35) {
        fitScore += 30;
        matches++;
      } else {
        // Partial credit for near matches
        if (expected === 'high' && score >= 55) fitScore += 15;
        else if (expected === 'moderate' && score >= 35 && score <= 65) fitScore += 15;
        else if (expected === 'low' && score <= 45) fitScore += 15;
      }
    });

    // Bonus for complete matches
    if (matches === Object.keys(style.oceanProfile).length) {
      fitScore += 10;
    }

    styles.push({
      key,
      style: style.name,
      fitScore,
      description: style.description,
      strengths: style.strengths,
      watchouts: style.watchouts
    });
  });

  // Sort by fit score
  styles.sort((a, b) => b.fitScore - a.fitScore);

  return {
    primary: styles[0],
    secondary: styles[1],
    all: styles
  };
}

function identifyDerailers(oceanScores) {
  const activeDerailers = [];

  Object.entries(LEADERSHIP_DERAILERS).forEach(([key, derailer]) => {
    let triggered = true;

    Object.entries(derailer.triggers).forEach(([trait, condition]) => {
      const score = oceanScores[trait] || 50;
      
      if (condition.startsWith('>')) {
        const threshold = parseInt(condition.substring(1));
        if (score <= threshold) triggered = false;
      } else if (condition.startsWith('<')) {
        const threshold = parseInt(condition.substring(1));
        if (score >= threshold) triggered = false;
      }
    });

    if (triggered) {
      activeDerailers.push({
        name: derailer.name,
        description: derailer.description,
        severity: calculateDerailerSeverity(oceanScores, derailer.triggers),
        mitigation: derailer.mitigation
      });
    }
  });

  return activeDerailers;
}

function calculateDerailerSeverity(scores, triggers) {
  let maxDeviation = 0;

  Object.entries(triggers).forEach(([trait, condition]) => {
    const score = scores[trait] || 50;
    
    if (condition.startsWith('>')) {
      const threshold = parseInt(condition.substring(1));
      if (score > threshold) {
        maxDeviation = Math.max(maxDeviation, score - threshold);
      }
    } else if (condition.startsWith('<')) {
      const threshold = parseInt(condition.substring(1));
      if (score < threshold) {
        maxDeviation = Math.max(maxDeviation, threshold - score);
      }
    }
  });

  if (maxDeviation > 20) return 'high';
  if (maxDeviation > 10) return 'moderate';
  return 'low';
}

function identifyLeadershipStrengths(competencies) {
  return Object.entries(competencies)
    .filter(([, comp]) => comp.score >= 70)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([key, comp]) => ({
      competency: key,
      name: comp.name,
      score: comp.score,
      level: comp.level,
      leverageOpportunities: getLeverageOpportunities(key)
    }));
}

function getLeverageOpportunities(competencyKey) {
  const opportunities = {
    strategic: ['Lead strategic planning', 'Drive innovation initiatives', 'Mentor on vision development'],
    execution: ['Lead critical projects', 'Drive operational excellence', 'Coach on results delivery'],
    people: ['Lead team development', 'Drive culture initiatives', 'Mentor other leaders'],
    influence: ['Represent organization externally', 'Lead change communication', 'Build partnerships'],
    adaptability: ['Lead transformation efforts', 'Navigate crisis situations', 'Pioneer new approaches'],
    integrity: ['Champion ethical practices', 'Build trust across organization', 'Lead by example'],
    resilience: ['Lead through challenges', 'Model stress management', 'Support team wellbeing']
  };

  return opportunities[competencyKey] || ['Leverage in appropriate contexts'];
}

function identifyDevelopmentAreas(competencies) {
  return Object.entries(competencies)
    .filter(([, comp]) => comp.score < 60)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([key, comp]) => ({
      competency: key,
      name: comp.name,
      score: comp.score,
      level: comp.level,
      developmentActions: getDevelopmentActions(key)
    }));
}

function getDevelopmentActions(competencyKey) {
  const actions = {
    strategic: [
      'Study industry trends and futures thinking',
      'Practice systems thinking',
      'Seek strategic planning assignments'
    ],
    execution: [
      'Improve project management skills',
      'Focus on results measurement',
      'Practice accountability conversations'
    ],
    people: [
      'Develop coaching skills',
      'Practice active listening',
      'Study team dynamics'
    ],
    influence: [
      'Improve presentation skills',
      'Practice stakeholder management',
      'Develop executive presence'
    ],
    adaptability: [
      'Seek stretch assignments',
      'Practice scenario planning',
      'Build change management skills'
    ],
    integrity: [
      'Study ethical decision-making',
      'Practice transparency',
      'Seek feedback on trust-building'
    ],
    resilience: [
      'Develop stress management techniques',
      'Build emotional regulation skills',
      'Practice mindfulness'
    ]
  };

  return actions[competencyKey] || ['Seek coaching and development opportunities'];
}

function generateLeadershipBrand(oceanScores, competencies, leadershipStyle) {
  // Create a unique leadership brand statement
  const topCompetencies = Object.entries(competencies)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 2)
    .map(([, comp]) => comp.name);

  const styleDescriptor = leadershipStyle.primary.style.toLowerCase().replace(' leader', '');
  
  const brand = {
    tagline: `The ${styleDescriptor} who ${getActionVerb(topCompetencies[0])} and ${getActionVerb(topCompetencies[1])}`,
    coreStrengths: leadershipStyle.primary.strengths,
    uniqueValue: generateUniqueValue(oceanScores, competencies),
    leadershipPhilosophy: generatePhilosophy(oceanScores, leadershipStyle)
  };

  return brand;
}

function getActionVerb(competencyName) {
  const verbs = {
    'Strategic Thinking': 'envisions the future',
    'Execution Excellence': 'delivers results',
    'People Leadership': 'inspires teams',
    'Influence & Communication': 'aligns stakeholders',
    'Change Leadership': 'drives transformation',
    'Ethical Leadership': 'builds trust',
    'Resilient Leadership': 'navigates challenges'
  };

  return verbs[competencyName] || 'leads effectively';
}

function generateUniqueValue(oceanScores, competencies) {
  const values = [];

  if (competencies.strategic?.score >= 70 && competencies.execution?.score >= 70) {
    values.push('Combines vision with execution');
  }
  
  if (competencies.people?.score >= 70 && competencies.influence?.score >= 70) {
    values.push('Builds and inspires high-performing teams');
  }

  if (oceanScores.O >= 70 && oceanScores.C >= 70) {
    values.push('Balances innovation with discipline');
  }

  if (values.length === 0) {
    values.push('Brings unique perspective and dedication');
  }

  return values.join('; ');
}

function generatePhilosophy(oceanScores, leadershipStyle) {
  const philosophies = {
    visionary: 'Leadership is about painting a compelling future and inspiring others to join the journey',
    commander: 'Leadership is about setting clear direction and driving excellence in execution',
    coach: 'Leadership is about unlocking the potential in others and building lasting capability',
    democratic: 'Leadership is about harnessing collective wisdom and empowering teams to succeed',
    pacesetter: 'Leadership is about setting the standard and inspiring others through example',
    affiliative: 'Leadership is about creating environments where people thrive and do their best work'
  };

  return philosophies[leadershipStyle.primary.key] || 'Leadership is about serving others and driving positive impact';
}

async function compareWithBenchmarks(supabase, competencies, benchmarkGroup) {
  try {
    const { data: benchmarks } = await supabase
      .from('leadership_benchmarks')
      .select('competency, percentiles')
      .eq('benchmark_group', benchmarkGroup);

    const comparison = {
      group: benchmarkGroup,
      competencies: {}
    };

    Object.entries(competencies).forEach(([key, comp]) => {
      const benchmark = benchmarks?.find(b => b.competency === key);
      if (benchmark) {
        comparison.competencies[key] = {
          score: comp.score,
          percentile: calculatePercentileFromBenchmark(comp.score, benchmark.percentiles),
          gap: comp.score - (benchmark.percentiles?.p50 || 50)
        };
      }
    });

    return comparison;
  } catch (error) {
    console.error('Error comparing with benchmarks:', error);
    return null;
  }
}

function calculatePercentileFromBenchmark(score, percentiles) {
  if (!percentiles) return 50;

  // Simple interpolation between known percentiles
  const points = [
    { p: 10, s: percentiles.p10 || 30 },
    { p: 25, s: percentiles.p25 || 40 },
    { p: 50, s: percentiles.p50 || 50 },
    { p: 75, s: percentiles.p75 || 60 },
    { p: 90, s: percentiles.p90 || 70 }
  ];

  for (let i = 0; i < points.length - 1; i++) {
    if (score >= points[i].s && score <= points[i + 1].s) {
      const ratio = (score - points[i].s) / (points[i + 1].s - points[i].s);
      return Math.round(points[i].p + ratio * (points[i + 1].p - points[i].p));
    }
  }

  if (score < points[0].s) return points[0].p;
  if (score > points[points.length - 1].s) return points[points.length - 1].p;

  return 50;
}

function generateDevelopmentPlan(profile, oceanScores, userProfile) {
  const plan = {
    summary: '',
    timeframe: '12-18 months',
    priorities: [],
    quickWins: [],
    longTermGoals: [],
    resources: []
  };

  // Set priorities based on readiness level
  if (profile.readinessLevel.level === 'ready-now') {
    plan.summary = 'Focus on maximizing strengths and preparing for next level leadership';
    plan.priorities = [
      {
        area: 'Executive Presence',
        actions: ['Seek visibility opportunities', 'Develop thought leadership', 'Build executive network']
      }
    ];
  } else if (profile.readinessLevel.level === 'ready-soon') {
    plan.summary = 'Close critical gaps while leveraging existing strengths';
    profile.developmentAreas.forEach(area => {
      plan.priorities.push({
        area: area.name,
        actions: area.developmentActions.slice(0, 3),
        timeline: '3-6 months'
      });
    });
  } else {
    plan.summary = 'Build foundational leadership capabilities systematically';
    plan.priorities = [
      {
        area: 'Self-Awareness',
        actions: ['Seek 360 feedback', 'Work with coach', 'Regular self-reflection']
      },
      {
        area: 'Core Leadership Skills',
        actions: ['Take leadership course', 'Seek stretch assignments', 'Find mentor']
      }
    ];
  }

  // Add quick wins
  if (profile.strengths.length > 0) {
    plan.quickWins = profile.strengths[0].leverageOpportunities.slice(0, 2).map(opp => ({
      action: opp,
      impact: 'high',
      effort: 'low'
    }));
  }

  // Add long-term goals
  plan.longTermGoals = [
    'Develop signature leadership style',
    'Build influential network',
    'Create lasting organizational impact'
  ];

  // Add resources
  plan.resources = [
    { type: 'coaching', description: 'Executive coach for personalized development' },
    { type: 'training', description: 'Leadership development program' },
    { type: 'experience', description: 'Stretch assignments in weak areas' },
    { type: 'feedback', description: '360-degree feedback process' }
  ];

  // Add derailer mitigation if needed
  if (profile.derailers.length > 0) {
    const highSeverityDerailers = profile.derailers.filter(d => d.severity === 'high');
    if (highSeverityDerailers.length > 0) {
      plan.priorities.unshift({
        area: 'Derailer Mitigation',
        actions: highSeverityDerailers.map(d => d.mitigation),
        timeline: 'Immediate',
        critical: true
      });
    }
  }

  return plan;
}

function calculateSelfOthersGap(selfScores, othersRatings) {
  if (!othersRatings) return null;

  const gaps = {};
  let totalGap = 0;
  let count = 0;

  Object.entries(selfScores).forEach(([key, comp]) => {
    if (othersRatings[key]) {
      const gap = comp.score - othersRatings[key];
      gaps[key] = {
        self: comp.score,
        others: othersRatings[key],
        gap,
        interpretation: interpretGap(gap)
      };
      totalGap += Math.abs(gap);
      count++;
    }
  });

  return {
    overallGap: count > 0 ? Math.round(totalGap / count) : 0,
    competencyGaps: gaps,
    selfAwareness: categorizeSelfAwareness(totalGap / count)
  };
}

function interpretGap(gap) {
  if (gap > 15) return 'Significant overestimation';
  if (gap > 5) return 'Mild overestimation';
  if (gap >= -5) return 'Aligned perception';
  if (gap >= -15) return 'Mild underestimation';
  return 'Significant underestimation';
}

function categorizeSelfAwareness(avgGap) {
  if (avgGap < 5) return 'High self-awareness';
  if (avgGap < 10) return 'Good self-awareness';
  if (avgGap < 15) return 'Moderate self-awareness';
  return 'Low self-awareness - development needed';
}

function identifyDevelopmentPriorities(competencies) {
  const priorities = [];
  
  // Find competencies below 60
  Object.entries(competencies).forEach(([key, comp]) => {
    if (comp.score < 60) {
      priorities.push({
        competency: key,
        currentScore: comp.score,
        targetScore: 70,
        gap: 70 - comp.score
      });
    }
  });

  // Sort by gap size
  priorities.sort((a, b) => b.gap - a.gap);

  return priorities.slice(0, 3);
}

async function storeLeadershipProfile(supabase, data) {
  try {
    await supabase.from('leadership_profiles').insert({
      assessment_id: data.assessmentId,
      user_id: data.userId,
      organization_id: data.organizationId,
      profile_data: data.profile,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing leadership profile:', error);
  }
}

/**
 * @swagger
 * /api/assessments/{id}/leadership-profile:
 *   get:
 *     summary: Get comprehensive leadership profile based on OCEAN
 *     description: Analyzes leadership competencies, styles, and development needs
 *     tags: [Assessments, Results, Leadership]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Leadership profile analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leadershipProfile:
 *                   type: object
 *                   properties:
 *                     overallScore:
 *                       type: number
 *                     readinessLevel:
 *                       type: object
 *                     primaryStyle:
 *                       type: object
 *                     competencies:
 *                       type: object
 *                 developmentPlan:
 *                   type: object
 */