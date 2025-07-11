import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/succession-readiness - Evaluate succession readiness
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const roleLevel = searchParams.get('roleLevel') || 'senior'; // senior, executive, c-suite
  const includeGapAnalysis = searchParams.get('includeGapAnalysis') !== 'false';
  const includeDevelopmentPath = searchParams.get('includeDevelopmentPath') !== 'false';
  const timeHorizon = searchParams.get('timeHorizon') || '24'; // months

  try {
    // Get assessment details
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select(`
        id,
        type,
        organization_id,
        user_id,
        settings
      `).
    eq('id', assessmentId).
    single();

    if (assessmentError || !assessment) {
      return ErrorResponses.notFound('Assessment not found');
    }

    // Verify organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin', 'hr_manager']
    );

    if (accessError) return accessError;

    // Get user profile and current role
    const { data: userProfile } = await context.supabase.
    from('users').
    select(`
        id,
        full_name,
        job_title,
        department,
        years_experience,
        years_in_role,
        career_goals,
        direct_reports
      `).
    eq('id', assessment.user_id).
    single();

    // Get assessment results
    const { data: results } = await context.supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        facet_scores,
        leadership_profile,
        emotional_spectrum,
        validity_indicators
      `).
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (!results) {
      return ErrorResponses.notFound('No results found for this assessment');
    }

    // Get 360 feedback if available
    const multiRaterData = await get360FeedbackForSuccession(context.supabase, assessmentId);

    // Get performance history
    const performanceHistory = await getPerformanceHistory(
      context.supabase,
      assessment.user_id,
      assessment.organization_id
    );

    // Get organizational succession requirements
    const successionRequirements = await getSuccessionRequirements(
      context.supabase,
      assessment.organization_id,
      roleLevel
    );

    // Evaluate succession readiness
    const readinessEvaluation = evaluateSuccessionReadiness({
      userProfile,
      results,
      multiRaterData,
      performanceHistory,
      roleLevel,
      timeHorizon: parseInt(timeHorizon),
      successionRequirements
    });

    // Generate gap analysis if requested
    let gapAnalysis = null;
    if (includeGapAnalysis) {
      gapAnalysis = generateGapAnalysis(
        readinessEvaluation,
        results,
        successionRequirements,
        roleLevel
      );
    }

    // Generate development path if requested
    let developmentPath = null;
    if (includeDevelopmentPath) {
      developmentPath = generateSuccessionDevelopmentPath(
        readinessEvaluation,
        gapAnalysis,
        userProfile,
        parseInt(timeHorizon)
      );
    }

    // Store succession readiness evaluation
    await storeSuccessionEvaluation(context.supabase, {
      assessmentId,
      userId: assessment.user_id,
      organizationId: assessment.organization_id,
      evaluation: readinessEvaluation,
      roleLevel
    });

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        userId: assessment.user_id
      },
      candidate: {
        name: userProfile.full_name,
        currentRole: userProfile.job_title,
        experience: {
          total: userProfile.years_experience,
          inRole: userProfile.years_in_role,
          leadership: userProfile.direct_reports > 0
        }
      },
      successionReadiness: readinessEvaluation,
      gapAnalysis,
      developmentPath,
      metadata: {
        evaluationDate: new Date().toISOString(),
        roleLevel,
        timeHorizon: `${timeHorizon} months`,
        evaluationVersion: '1.0'
      }
    });

  } catch (error) {
    console.error('Error evaluating succession readiness:', error);
    return ErrorResponses.internalError('Failed to evaluate succession readiness');
  }
});

// Helper functions

async function get360FeedbackForSuccession(supabase, assessmentId) {
  const { data: aggregated } = await supabase.
  from('360_feedback_aggregated').
  select(`
      overall_ratings,
      self_others_gaps,
      key_themes,
      leadership_effectiveness
    `).
  eq('assessment_id', assessmentId).
  single();

  return aggregated;
}

async function getPerformanceHistory(supabase, userId, organizationId) {
  // Get performance reviews
  const { data: reviews } = await supabase.
  from('performance_reviews').
  select(`
      id,
      review_period,
      overall_rating,
      achievements,
      areas_for_improvement,
      reviewer_comments
    `).
  eq('user_id', userId).
  eq('organization_id', organizationId).
  order('review_period', { ascending: false }).
  limit(3);

  // Get promotions and role changes
  const { data: roleHistory } = await supabase.
  from('user_role_history').
  select(`
      role_title,
      level,
      start_date,
      end_date,
      promotion
    `).
  eq('user_id', userId).
  order('start_date', { ascending: false }).
  limit(5);

  // Get achievements and recognitions
  const { data: achievements } = await supabase.
  from('user_achievements').
  select(`
      title,
      description,
      impact_level,
      date
    `).
  eq('user_id', userId).
  order('date', { ascending: false }).
  limit(10);

  return {
    performanceReviews: reviews || [],
    roleHistory: roleHistory || [],
    achievements: achievements || [],
    summary: generatePerformanceSummary(reviews, roleHistory, achievements)
  };
}

async function getSuccessionRequirements(supabase, organizationId, roleLevel) {
  // Get organization's succession criteria
  const { data: criteria } = await supabase.
  from('succession_criteria').
  select('*').
  eq('organization_id', organizationId).
  eq('role_level', roleLevel).
  single();

  // Use default criteria if none exist
  if (!criteria) {
    return getDefaultSuccessionCriteria(roleLevel);
  }

  return criteria;
}

function getDefaultSuccessionCriteria(roleLevel) {
  const criteria = {
    senior: {
      minExperience: 5,
      minLeadershipExperience: 2,
      requiredCompetencies: [
      'strategic_thinking',
      'decision_making',
      'team_leadership',
      'business_acumen',
      'communication'],

      oceanProfile: {
        O: { min: 55, ideal: 65 },
        C: { min: 60, ideal: 70 },
        E: { min: 50, ideal: 60 },
        A: { min: 45, ideal: 55 },
        N: { max: 45, ideal: 35 }
      },
      criticalExperiences: [
      'led_cross_functional_team',
      'managed_budget',
      'stakeholder_management',
      'change_management']

    },
    executive: {
      minExperience: 10,
      minLeadershipExperience: 5,
      requiredCompetencies: [
      'visionary_leadership',
      'strategic_execution',
      'organizational_savvy',
      'executive_presence',
      'innovation',
      'financial_acumen'],

      oceanProfile: {
        O: { min: 60, ideal: 70 },
        C: { min: 65, ideal: 75 },
        E: { min: 55, ideal: 65 },
        A: { min: 50, ideal: 60 },
        N: { max: 40, ideal: 30 }
      },
      criticalExperiences: [
      'p&l_responsibility',
      'led_major_initiative',
      'board_presentation',
      'crisis_management',
      'merger_acquisition']

    },
    'c-suite': {
      minExperience: 15,
      minLeadershipExperience: 10,
      requiredCompetencies: [
      'enterprise_leadership',
      'board_management',
      'market_insight',
      'transformation_leadership',
      'stakeholder_influence',
      'cultural_stewardship'],

      oceanProfile: {
        O: { min: 65, ideal: 75 },
        C: { min: 70, ideal: 80 },
        E: { min: 60, ideal: 70 },
        A: { min: 55, ideal: 65 },
        N: { max: 35, ideal: 25 }
      },
      criticalExperiences: [
      'ceo_direct_report',
      'industry_recognition',
      'turnaround_experience',
      'international_experience',
      'external_board_service']

    }
  };

  return criteria[roleLevel] || criteria.senior;
}

function evaluateSuccessionReadiness(data) {
  const {
    userProfile,
    results,
    multiRaterData,
    performanceHistory,
    roleLevel,
    timeHorizon,
    successionRequirements
  } = data;

  const evaluation = {
    overallReadiness: 'not_ready', // not_ready, developing, ready_with_development, ready_now
    readinessScore: 0,
    timeline: {
      currentReadiness: 0,
      projectedReadiness: 0,
      estimatedTimeToReady: 0 // months
    },
    strengths: [],
    developmentAreas: [],
    risks: [],
    opportunities: [],
    competencyReadiness: {},
    experienceReadiness: {},
    leadershipReadiness: {},
    potentialScore: 0
  };

  // Evaluate experience readiness
  const experienceScore = evaluateExperience(
    userProfile,
    performanceHistory,
    successionRequirements
  );
  evaluation.experienceReadiness = experienceScore;

  // Evaluate personality fit
  const personalityScore = evaluatePersonalityFit(
    results.ocean_scores,
    successionRequirements.oceanProfile
  );

  // Evaluate competencies
  const competencyScore = evaluateCompetencies(
    results,
    multiRaterData,
    successionRequirements.requiredCompetencies
  );
  evaluation.competencyReadiness = competencyScore;

  // Evaluate leadership readiness
  const leadershipScore = evaluateLeadershipReadiness(
    results.leadership_profile,
    multiRaterData,
    performanceHistory,
    roleLevel
  );
  evaluation.leadershipReadiness = leadershipScore;

  // Evaluate performance trajectory
  const trajectoryScore = evaluatePerformanceTrajectory(
    performanceHistory,
    roleLevel
  );

  // Calculate potential score
  evaluation.potentialScore = calculatePotentialScore({
    personalityScore,
    competencyScore,
    leadershipScore,
    trajectoryScore,
    age: calculateAge(userProfile),
    learningAgility: results.ocean_scores.O
  });

  // Calculate overall readiness score
  evaluation.readinessScore = calculateReadinessScore({
    experience: experienceScore.score,
    personality: personalityScore.score,
    competency: competencyScore.overallScore,
    leadership: leadershipScore.score,
    trajectory: trajectoryScore,
    potential: evaluation.potentialScore
  });

  // Determine readiness level
  evaluation.overallReadiness = determineReadinessLevel(
    evaluation.readinessScore,
    timeHorizon
  );

  // Calculate timeline
  evaluation.timeline = calculateReadinessTimeline(
    evaluation.readinessScore,
    evaluation.potentialScore,
    timeHorizon
  );

  // Identify strengths
  evaluation.strengths = identifySuccessionStrengths({
    experienceScore,
    personalityScore,
    competencyScore,
    leadershipScore,
    performanceHistory
  });

  // Identify development areas
  evaluation.developmentAreas = identifyDevelopmentAreas({
    experienceScore,
    personalityScore,
    competencyScore,
    leadershipScore,
    successionRequirements
  });

  // Identify risks
  evaluation.risks = identifySuccessionRisks({
    results,
    multiRaterData,
    performanceHistory,
    evaluation
  });

  // Identify opportunities
  evaluation.opportunities = identifyOpportunities({
    userProfile,
    evaluation,
    roleLevel,
    timeHorizon
  });

  return evaluation;
}

function evaluateExperience(userProfile, performanceHistory, requirements) {
  const score = {
    score: 0,
    totalExperience: {
      years: userProfile.years_experience || 0,
      required: requirements.minExperience,
      met: (userProfile.years_experience || 0) >= requirements.minExperience
    },
    leadershipExperience: {
      years: userProfile.years_in_role || 0,
      required: requirements.minLeadershipExperience,
      met: (userProfile.years_in_role || 0) >= requirements.minLeadershipExperience
    },
    criticalExperiences: {},
    promotionVelocity: calculatePromotionVelocity(performanceHistory.roleHistory),
    roleProgression: analyzeRoleProgression(performanceHistory.roleHistory)
  };

  // Score total experience
  if (score.totalExperience.met) {
    score.score += 25;
  } else {
    const ratio = score.totalExperience.years / score.totalExperience.required;
    score.score += Math.round(25 * ratio);
  }

  // Score leadership experience
  if (score.leadershipExperience.met) {
    score.score += 25;
  } else {
    const ratio = score.leadershipExperience.years / score.leadershipExperience.required;
    score.score += Math.round(25 * ratio);
  }

  // Evaluate critical experiences
  const criticalExpMet = evaluateCriticalExperiences(
    performanceHistory,
    requirements.criticalExperiences
  );
  score.criticalExperiences = criticalExpMet;
  score.score += Math.round(25 * (criticalExpMet.score / 100));

  // Bonus for exceptional trajectory
  if (score.promotionVelocity === 'accelerated') {
    score.score += 15;
  } else if (score.promotionVelocity === 'above_average') {
    score.score += 10;
  }

  // Cap at 100
  score.score = Math.min(100, score.score);

  return score;
}

function evaluatePersonalityFit(oceanScores, requirements) {
  const score = {
    score: 0,
    traitFit: {},
    overallFit: 'poor', // poor, moderate, good, excellent
    analysis: []
  };

  let totalFit = 0;
  let criticalMisses = 0;

  Object.keys(requirements).forEach((trait) => {
    const actual = oceanScores[trait];
    const req = requirements[trait];

    let traitScore = 0;
    let status = 'not_met';
    let gap = 0;

    if (trait === 'N') {
      // For neuroticism, lower is better
      if (actual <= req.ideal) {
        traitScore = 100;
        status = 'ideal';
      } else if (actual <= req.max) {
        const range = req.max - req.ideal;
        const diff = actual - req.ideal;
        traitScore = 100 - Math.round(diff / range * 50);
        status = 'acceptable';
      } else {
        gap = actual - req.max;
        traitScore = Math.max(0, 50 - gap);
        status = 'not_met';
        criticalMisses++;
      }
    } else {
      // For other traits, higher can be better up to ideal
      if (actual >= req.ideal - 5 && actual <= req.ideal + 10) {
        traitScore = 100;
        status = 'ideal';
      } else if (actual >= req.min) {
        if (actual < req.ideal) {
          const range = req.ideal - req.min;
          const diff = actual - req.min;
          traitScore = 50 + Math.round(diff / range * 50);
        } else {
          // Over ideal
          const excess = actual - req.ideal;
          traitScore = Math.max(70, 100 - excess);
        }
        status = 'acceptable';
      } else {
        gap = req.min - actual;
        traitScore = Math.max(0, 50 - gap * 2);
        status = 'not_met';
        criticalMisses++;
      }
    }

    score.traitFit[trait] = {
      actual,
      required: req,
      score: traitScore,
      status,
      gap
    };

    totalFit += traitScore;

    // Add analysis
    if (status === 'not_met') {
      score.analysis.push({
        trait,
        issue: `${getTraitName(trait)} below minimum requirement`,
        severity: 'high'
      });
    }
  });

  // Calculate overall score
  score.score = Math.round(totalFit / Object.keys(requirements).length);

  // Determine overall fit
  if (criticalMisses === 0 && score.score >= 85) {
    score.overallFit = 'excellent';
  } else if (criticalMisses <= 1 && score.score >= 70) {
    score.overallFit = 'good';
  } else if (score.score >= 50) {
    score.overallFit = 'moderate';
  } else {
    score.overallFit = 'poor';
  }

  return score;
}

function evaluateCompetencies(results, multiRaterData, requiredCompetencies) {
  const competencyMap = {
    strategic_thinking: {
      ocean: ['O', 'C'],
      facets: ['O5', 'C5', 'C6'],
      weight: 0.9
    },
    decision_making: {
      ocean: ['C', 'N'],
      facets: ['C1', 'C6', 'N1'],
      weight: 0.85
    },
    team_leadership: {
      ocean: ['E', 'A', 'C'],
      facets: ['E3', 'A3', 'C3'],
      weight: 0.9
    },
    business_acumen: {
      ocean: ['C', 'O'],
      facets: ['C2', 'O4', 'C5'],
      weight: 0.8
    },
    communication: {
      ocean: ['E', 'A'],
      facets: ['E1', 'E4', 'A2'],
      weight: 0.85
    },
    visionary_leadership: {
      ocean: ['O', 'E'],
      facets: ['O1', 'O5', 'E3'],
      weight: 0.95
    },
    strategic_execution: {
      ocean: ['C', 'E'],
      facets: ['C3', 'C4', 'E3'],
      weight: 0.9
    },
    organizational_savvy: {
      ocean: ['A', 'E'],
      facets: ['A2', 'E2', 'A4'],
      weight: 0.85
    },
    executive_presence: {
      ocean: ['E', 'C', 'N'],
      facets: ['E3', 'C1', 'N2'],
      weight: 0.9
    },
    innovation: {
      ocean: ['O'],
      facets: ['O1', 'O3', 'O5'],
      weight: 0.85
    },
    financial_acumen: {
      ocean: ['C'],
      facets: ['C2', 'C5', 'C6'],
      weight: 0.8
    }
  };

  const competencyScores = {};
  let totalScore = 0;
  let totalWeight = 0;

  requiredCompetencies.forEach((comp) => {
    if (competencyMap[comp]) {
      const mapping = competencyMap[comp];
      let compScore = 0;

      // Ocean trait contribution (60%)
      const oceanAvg = mapping.ocean.reduce((sum, trait) => {
        const score = trait === 'N' ? 100 - results.ocean_scores[trait] : results.ocean_scores[trait];
        return sum + score;
      }, 0) / mapping.ocean.length;

      compScore += oceanAvg * 0.6;

      // Facet contribution (40%)
      if (results.facet_scores && mapping.facets) {
        const facetAvg = mapping.facets.reduce((sum, facet) => {
          return sum + (results.facet_scores[facet] || 50);
        }, 0) / mapping.facets.length;

        compScore += facetAvg * 0.4;
      } else {
        compScore += oceanAvg * 0.4; // Use ocean if no facets
      }

      // Apply 360 feedback adjustment if available
      if (multiRaterData?.leadership_effectiveness?.[comp]) {
        const raterScore = multiRaterData.leadership_effectiveness[comp];
        compScore = compScore * 0.7 + raterScore * 0.3;
      }

      competencyScores[comp] = {
        score: Math.round(compScore),
        level: categorizeCompetencyLevel(compScore),
        source: multiRaterData ? 'combined' : 'self-assessment'
      };

      totalScore += compScore * mapping.weight;
      totalWeight += mapping.weight;
    }
  });

  return {
    competencies: competencyScores,
    overallScore: Math.round(totalScore / totalWeight),
    readinessLevel: categorizeOverallCompetency(totalScore / totalWeight),
    strongCompetencies: Object.entries(competencyScores).
    filter(([_, score]) => score.score >= 75).
    map(([comp]) => comp),
    developmentNeeded: Object.entries(competencyScores).
    filter(([_, score]) => score.score < 60).
    map(([comp]) => comp)
  };
}

function evaluateLeadershipReadiness(leadershipProfile, multiRaterData, performanceHistory, roleLevel) {
  const score = {
    score: 0,
    style: leadershipProfile?.style || 'unknown',
    effectiveness: {},
    readinessIndicators: {},
    leadershipGaps: []
  };

  // Base leadership score from profile
  if (leadershipProfile) {
    // Competency scores
    const competencyAvg = Object.values(leadershipProfile.competencies || {}).
    reduce((sum, val) => sum + val, 0) / Object.keys(leadershipProfile.competencies || {}).length;

    score.effectiveness.competency = competencyAvg || 50;

    // 360 feedback integration
    if (multiRaterData?.leadership_effectiveness) {
      score.effectiveness.multi_rater = multiRaterData.leadership_effectiveness.overall || 50;
      score.effectiveness.combined = (competencyAvg + multiRaterData.leadership_effectiveness.overall) / 2;
    } else {
      score.effectiveness.combined = competencyAvg;
    }
  }

  // Performance history contribution
  const performanceScore = calculateLeadershipPerformance(performanceHistory);
  score.effectiveness.performance = performanceScore;

  // Readiness indicators based on role level
  score.readinessIndicators = evaluateLeadershipIndicators(roleLevel, {
    leadershipProfile,
    multiRaterData,
    performanceHistory
  });

  // Calculate overall leadership score
  const weights = {
    competency: 0.35,
    performance: 0.35,
    indicators: 0.3
  };

  score.score = Math.round(
    score.effectiveness.combined * weights.competency +
    score.effectiveness.performance * weights.performance +
    score.readinessIndicators.score * weights.indicators
  );

  // Identify leadership gaps
  if (score.score < 70) {
    if (score.effectiveness.competency < 60) {
      score.leadershipGaps.push('Core leadership competencies need development');
    }
    if (score.effectiveness.performance < 60) {
      score.leadershipGaps.push('Leadership performance track record needs strengthening');
    }
    if (multiRaterData && Math.abs(score.effectiveness.competency - score.effectiveness.multi_rater) > 20) {
      score.leadershipGaps.push('Self-perception gap in leadership effectiveness');
    }
  }

  return score;
}

function evaluatePerformanceTrajectory(performanceHistory, roleLevel) {
  let trajectoryScore = 50; // Base score

  // Analyze performance ratings trend
  if (performanceHistory.performanceReviews.length > 0) {
    const ratings = performanceHistory.performanceReviews.map((r) => r.overall_rating || 0);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    // Check for upward trend
    if (ratings.length >= 2) {
      const recentAvg = ratings.slice(0, Math.ceil(ratings.length / 2)).
      reduce((a, b) => a + b, 0) / Math.ceil(ratings.length / 2);
      const olderAvg = ratings.slice(Math.ceil(ratings.length / 2)).
      reduce((a, b) => a + b, 0) / Math.floor(ratings.length / 2);

      if (recentAvg > olderAvg) {
        trajectoryScore += 20; // Upward trajectory
      } else if (recentAvg < olderAvg) {
        trajectoryScore -= 10; // Downward trajectory
      }
    }

    // Absolute performance level
    if (avgRating >= 4.5) {
      trajectoryScore += 25;
    } else if (avgRating >= 4.0) {
      trajectoryScore += 15;
    } else if (avgRating >= 3.5) {
      trajectoryScore += 5;
    }
  }

  // Analyze role progression
  const progression = analyzeRoleProgression(performanceHistory.roleHistory);
  if (progression === 'rapid') {
    trajectoryScore += 15;
  } else if (progression === 'steady') {
    trajectoryScore += 10;
  }

  // Achievement impact
  const highImpactAchievements = performanceHistory.achievements.
  filter((a) => a.impact_level === 'high').length;

  if (highImpactAchievements >= 3) {
    trajectoryScore += 15;
  } else if (highImpactAchievements >= 1) {
    trajectoryScore += 10;
  }

  return Math.min(100, trajectoryScore);
}

function calculatePotentialScore(factors) {
  const {
    personalityScore,
    competencyScore,
    leadershipScore,
    trajectoryScore,
    age,
    learningAgility
  } = factors;

  let potentialScore = 0;

  // Base potential from current capabilities (40%)
  const currentCapability = (personalityScore.score + competencyScore.overallScore + leadershipScore.score) / 3;
  potentialScore += currentCapability * 0.4;

  // Growth trajectory (30%)
  potentialScore += trajectoryScore * 0.3;

  // Learning agility (20%)
  potentialScore += learningAgility * 0.2;

  // Age factor (10%) - younger candidates have more runway
  let ageFactor = 50;
  if (age < 35) {
    ageFactor = 100;
  } else if (age < 45) {
    ageFactor = 80;
  } else if (age < 55) {
    ageFactor = 60;
  }
  potentialScore += ageFactor * 0.1;

  return Math.round(potentialScore);
}

function calculateReadinessScore(components) {
  const weights = {
    experience: 0.2,
    personality: 0.15,
    competency: 0.25,
    leadership: 0.25,
    trajectory: 0.1,
    potential: 0.05
  };

  let totalScore = 0;
  Object.entries(weights).forEach(([component, weight]) => {
    totalScore += (components[component] || 0) * weight;
  });

  return Math.round(totalScore);
}

function determineReadinessLevel(readinessScore, timeHorizon) {
  if (readinessScore >= 85) {
    return 'ready_now';
  } else if (readinessScore >= 70) {
    return 'ready_with_development';
  } else if (readinessScore >= 55 && timeHorizon >= 24) {
    return 'developing';
  } else {
    return 'not_ready';
  }
}

function calculateReadinessTimeline(readinessScore, potentialScore, timeHorizon) {
  const timeline = {
    currentReadiness: readinessScore,
    projectedReadiness: readinessScore,
    estimatedTimeToReady: 0,
    developmentVelocity: 'slow'
  };

  // Calculate development velocity based on potential
  if (potentialScore >= 80) {
    timeline.developmentVelocity = 'rapid';
  } else if (potentialScore >= 65) {
    timeline.developmentVelocity = 'moderate';
  } else if (potentialScore >= 50) {
    timeline.developmentVelocity = 'steady';
  }

  // Project readiness growth
  const monthlyGrowth = {
    rapid: 1.5,
    moderate: 1.0,
    steady: 0.7,
    slow: 0.4
  };

  const growth = monthlyGrowth[timeline.developmentVelocity];
  timeline.projectedReadiness = Math.min(100, readinessScore + growth * timeHorizon);

  // Calculate time to ready (85% threshold)
  if (readinessScore < 85) {
    const gapToReady = 85 - readinessScore;
    timeline.estimatedTimeToReady = Math.ceil(gapToReady / growth);
  }

  return timeline;
}

function identifySuccessionStrengths(data) {
  const strengths = [];

  // Experience strengths
  if (data.experienceScore.score >= 80) {
    strengths.push({
      area: 'experience',
      strength: 'Extensive relevant experience',
      impact: 'Strong foundation for next role'
    });
  }

  if (data.experienceScore.promotionVelocity === 'accelerated') {
    strengths.push({
      area: 'trajectory',
      strength: 'Rapid career progression',
      impact: 'Demonstrates high potential'
    });
  }

  // Personality strengths
  Object.entries(data.personalityScore.traitFit).forEach(([trait, fit]) => {
    if (fit.status === 'ideal') {
      strengths.push({
        area: 'personality',
        strength: `Ideal ${getTraitName(trait)} for role`,
        impact: getTraitSuccessionImpact(trait)
      });
    }
  });

  // Competency strengths
  if (data.competencyScore.strongCompetencies.length > 0) {
    strengths.push({
      area: 'competencies',
      strength: `Strong in ${data.competencyScore.strongCompetencies.join(', ')}`,
      impact: 'Key capabilities already developed'
    });
  }

  // Leadership strengths
  if (data.leadershipScore.score >= 80) {
    strengths.push({
      area: 'leadership',
      strength: 'Proven leadership effectiveness',
      impact: 'Ready for increased responsibility'
    });
  }

  // Performance strengths
  if (data.performanceHistory.summary?.consistentHighPerformer) {
    strengths.push({
      area: 'performance',
      strength: 'Consistent high performance',
      impact: 'Reliable delivery track record'
    });
  }

  return strengths;
}

function identifyDevelopmentAreas(data) {
  const developmentAreas = [];

  // Experience gaps
  if (!data.experienceScore.totalExperience.met) {
    const gap = data.experienceScore.totalExperience.required - data.experienceScore.totalExperience.years;
    developmentAreas.push({
      area: 'experience',
      gap: `${gap} years below experience requirement`,
      priority: 'high',
      developmentApproach: 'Accelerate through stretch assignments'
    });
  }

  if (data.experienceScore.criticalExperiences.score < 50) {
    developmentAreas.push({
      area: 'critical_experiences',
      gap: 'Missing key experiences for role',
      priority: 'high',
      developmentApproach: 'Target specific developmental assignments'
    });
  }

  // Personality development
  Object.entries(data.personalityScore.traitFit).forEach(([trait, fit]) => {
    if (fit.status === 'not_met') {
      developmentAreas.push({
        area: 'personality',
        gap: `${getTraitName(trait)} below requirement`,
        priority: fit.gap > 15 ? 'high' : 'medium',
        developmentApproach: getTraitDevelopmentApproach(trait, fit.gap)
      });
    }
  });

  // Competency gaps
  data.competencyScore.developmentNeeded.forEach((comp) => {
    developmentAreas.push({
      area: 'competency',
      gap: `${comp.replace(/_/g, ' ')} needs development`,
      priority: 'high',
      developmentApproach: getCompetencyDevelopmentApproach(comp)
    });
  });

  // Leadership gaps
  data.leadershipScore.leadershipGaps.forEach((gap) => {
    developmentAreas.push({
      area: 'leadership',
      gap,
      priority: 'high',
      developmentApproach: 'Executive coaching and leadership development program'
    });
  });

  return developmentAreas;
}

function identifySuccessionRisks(data) {
  const risks = [];

  // Retention risk
  if (data.evaluation.readinessScore >= 70 && data.evaluation.overallReadiness === 'not_ready') {
    risks.push({
      type: 'retention',
      description: 'High performer may seek opportunities elsewhere',
      severity: 'high',
      mitigation: 'Create clear development path and timeline'
    });
  }

  // Derailment risks from personality
  if (data.results.ocean_scores.N > 65) {
    risks.push({
      type: 'derailment',
      description: 'High neuroticism may impact leadership under pressure',
      severity: 'medium',
      mitigation: 'Stress management and emotional regulation coaching'
    });
  }

  if (data.results.ocean_scores.A < 35) {
    risks.push({
      type: 'derailment',
      description: 'Low agreeableness may harm stakeholder relationships',
      severity: 'medium',
      mitigation: 'Relationship building and diplomatic skills training'
    });
  }

  // Performance plateau risk
  if (data.performanceHistory.summary?.plateaued) {
    risks.push({
      type: 'development',
      description: 'Performance has plateaued in recent years',
      severity: 'medium',
      mitigation: 'New challenges and expanded responsibilities needed'
    });
  }

  // 360 perception gaps
  if (data.multiRaterData?.self_others_gaps) {
    const significantGaps = Object.entries(data.multiRaterData.self_others_gaps).
    filter(([_, gap]) => Math.abs(gap) > 20);

    if (significantGaps.length > 0) {
      risks.push({
        type: 'perception',
        description: 'Significant self-awareness gaps',
        severity: 'medium',
        mitigation: 'Regular 360 feedback and coaching'
      });
    }
  }

  // Age/timeline risk
  if (data.evaluation.timeline.estimatedTimeToReady > 36) {
    risks.push({
      type: 'timeline',
      description: 'Long development timeline may miss succession window',
      severity: 'high',
      mitigation: 'Accelerated development program or alternative candidates'
    });
  }

  return risks;
}

function identifyOpportunities(data) {
  const opportunities = [];

  // High potential opportunity
  if (data.evaluation.potentialScore >= 80) {
    opportunities.push({
      type: 'high_potential',
      description: 'Exceptional potential for accelerated development',
      action: 'Fast-track development program',
      timeframe: 'immediate'
    });
  }

  // Cross-functional opportunity
  if (data.evaluation.experienceReadiness.criticalExperiences.score < 70) {
    opportunities.push({
      type: 'experience_building',
      description: 'Cross-functional rotation to build critical experiences',
      action: 'Identify rotation opportunities in key areas',
      timeframe: '6-12 months'
    });
  }

  // Mentorship opportunity
  if (data.roleLevel === 'executive' || data.roleLevel === 'c-suite') {
    opportunities.push({
      type: 'mentorship',
      description: 'Executive mentorship from current role incumbent',
      action: 'Pair with senior executive mentor',
      timeframe: 'immediate'
    });
  }

  // Stretch assignment opportunity
  if (data.evaluation.readinessScore >= 60 && data.evaluation.readinessScore < 85) {
    opportunities.push({
      type: 'stretch_assignment',
      description: 'Ready for stretch assignments to close readiness gap',
      action: 'Lead strategic initiative or transformation project',
      timeframe: '3-6 months'
    });
  }

  // External visibility opportunity
  if (data.roleLevel === 'c-suite' && data.evaluation.readinessScore >= 70) {
    opportunities.push({
      type: 'external_visibility',
      description: 'Build external presence and industry recognition',
      action: 'Speaking engagements, board service, industry leadership',
      timeframe: '12-24 months'
    });
  }

  return opportunities;
}

function generateGapAnalysis(evaluation, results, requirements, roleLevel) {
  const gapAnalysis = {
    summary: '',
    criticalGaps: [],
    developmentPriorities: [],
    closureTimeline: {},
    investmentRequired: 'moderate' // low, moderate, high, extensive
  };

  // Identify critical gaps
  evaluation.developmentAreas.forEach((area) => {
    if (area.priority === 'high') {
      gapAnalysis.criticalGaps.push({
        dimension: area.area,
        currentState: area.gap,
        requiredState: getRequiredState(area.area, requirements),
        gapSize: calculateGapSize(area),
        closureComplexity: assessClosureComplexity(area)
      });
    }
  });

  // Prioritize development areas
  gapAnalysis.developmentPriorities = prioritizeDevelopment(
    evaluation.developmentAreas,
    evaluation.timeline.estimatedTimeToReady
  );

  // Create closure timeline
  gapAnalysis.closureTimeline = createClosureTimeline(
    gapAnalysis.criticalGaps,
    evaluation.potentialScore
  );

  // Assess investment required
  const totalGaps = gapAnalysis.criticalGaps.length;
  const complexGaps = gapAnalysis.criticalGaps.filter((g) => g.closureComplexity === 'high').length;

  if (totalGaps >= 5 || complexGaps >= 3) {
    gapAnalysis.investmentRequired = 'extensive';
  } else if (totalGaps >= 3 || complexGaps >= 2) {
    gapAnalysis.investmentRequired = 'high';
  } else if (totalGaps >= 1) {
    gapAnalysis.investmentRequired = 'moderate';
  } else {
    gapAnalysis.investmentRequired = 'low';
  }

  // Generate summary
  gapAnalysis.summary = generateGapSummary(gapAnalysis, evaluation, roleLevel);

  return gapAnalysis;
}

function generateSuccessionDevelopmentPath(evaluation, gapAnalysis, userProfile, timeHorizon) {
  const developmentPath = {
    phases: [],
    keyMilestones: [],
    developmentExperiences: [],
    successMetrics: [],
    supportRequired: [],
    estimatedInvestment: {}
  };

  // Phase 1: Foundation (0-6 months)
  developmentPath.phases.push({
    phase: 1,
    name: 'Foundation Building',
    duration: '0-6 months',
    focus: 'Assessment, planning, and immediate gaps',
    objectives: [
    'Complete comprehensive assessment',
    'Create development plan',
    'Address critical skill gaps',
    'Establish mentor relationships'],

    actions: generatePhaseActions(1, evaluation, gapAnalysis)
  });

  // Phase 2: Capability Development (6-18 months)
  developmentPath.phases.push({
    phase: 2,
    name: 'Capability Development',
    duration: '6-18 months',
    focus: 'Build core competencies and experiences',
    objectives: [
    'Develop critical competencies',
    'Gain key experiences',
    'Build leadership effectiveness',
    'Expand network and visibility'],

    actions: generatePhaseActions(2, evaluation, gapAnalysis)
  });

  // Phase 3: Advanced Readiness (18+ months)
  if (timeHorizon >= 24) {
    developmentPath.phases.push({
      phase: 3,
      name: 'Advanced Readiness',
      duration: '18-24 months',
      focus: 'Polish and prepare for transition',
      objectives: [
      'Master executive competencies',
      'Build external profile',
      'Shadow current role',
      'Lead major initiatives'],

      actions: generatePhaseActions(3, evaluation, gapAnalysis)
    });
  }

  // Define key milestones
  developmentPath.keyMilestones = generateDevelopmentMilestones(
    evaluation,
    timeHorizon
  );

  // Identify development experiences
  developmentPath.developmentExperiences = identifyDevelopmentExperiences(
    evaluation,
    gapAnalysis,
    userProfile
  );

  // Define success metrics
  developmentPath.successMetrics = defineSuccessionMetrics(evaluation);

  // Identify support required
  developmentPath.supportRequired = identifyRequiredSupport(
    evaluation,
    gapAnalysis
  );

  // Estimate investment
  developmentPath.estimatedInvestment = estimateDevelopmentInvestment(
    developmentPath,
    gapAnalysis
  );

  return developmentPath;
}