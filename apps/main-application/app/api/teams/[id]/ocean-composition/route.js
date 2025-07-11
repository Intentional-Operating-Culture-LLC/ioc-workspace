import { NextResponse } from 'next/server';
import { createProtectedRoute } from "@ioc/shared/api-utils";
import { analyzeTeamComposition } from "@ioc/shared/data-access/scoring/ocean-executive-org-scoring";

// GET /api/teams/[id]/ocean-composition - Get team OCEAN composition analysis
export const GET = createProtectedRoute(async (request, context) => {
  const { id: teamId } = context.params;

  try {
    // Get the latest team composition analysis
    const { data: analysis, error } = await context.supabase.
    from('team_ocean_analyses').
    select('*').
    eq('team_id', teamId).
    order('analysis_date', { ascending: false }).
    limit(1).
    maybeSingle();

    if (error) {
      console.error('Error fetching team OCEAN analysis:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team analysis' },
        { status: 500 }
      );
    }

    if (!analysis) {
      return NextResponse.json(
        { message: 'No team OCEAN analysis found' },
        { status: 404 }
      );
    }

    // Get team member OCEAN profiles for detailed view
    const { data: memberProfiles, error: memberError } = await context.supabase.
    rpc('get_team_member_ocean_profiles', {
      team_id_param: teamId
    });

    if (memberError) {
      console.error('Error fetching team member profiles:', memberError);
    }

    // Generate team insights
    const insights = generateTeamInsights(analysis, memberProfiles || []);

    // Generate optimization recommendations
    const optimizations = generateOptimizationRecommendations(analysis);

    return NextResponse.json({
      analysis,
      memberProfiles: memberProfiles || [],
      insights,
      optimizations,
      riskFactors: identifyTeamRisks(analysis),
      strengthAreas: identifyTeamStrengths(analysis)
    });

  } catch (error) {
    console.error('Unexpected error in team OCEAN composition:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/teams/[id]/ocean-composition - Create/update team composition analysis
export const POST = createProtectedRoute(async (request, context) => {
  const { id: teamId } = context.params;

  try {
    const body = await request.json();
    const { memberProfiles, roleAssignments, organizationId } = body;

    // Validate input data
    if (!memberProfiles || !Array.isArray(memberProfiles) || memberProfiles.length === 0) {
      return NextResponse.json(
        { error: 'Member profiles are required' },
        { status: 400 }
      );
    }

    // Verify user has permission to analyze this team
    const hasPermission = await verifyTeamAnalysisPermission(
      context.supabase,
      context.userId,
      teamId,
      organizationId
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Analyze team composition
    const composition = analyzeTeamComposition(memberProfiles, roleAssignments);

    // Calculate additional team metrics
    const teamMetrics = calculateTeamMetrics(memberProfiles, composition);

    // Identify optimal team additions
    const optimalAdditions = identifyOptimalTeamAdditions(
      composition,
      roleAssignments,
      teamMetrics
    );

    // Prepare data for database insertion
    const analysisData = {
      team_id: teamId,
      organization_id: organizationId,
      mean_traits: composition.meanTraits,
      trait_diversity: composition.traitDiversity,
      role_fit_scores: composition.roleFitScores,
      dynamic_predictions: composition.dynamicPredictions,
      optimal_additions: optimalAdditions,
      risk_factors: teamMetrics.riskFactors,
      team_size: memberProfiles.length
    };

    // Insert team analysis
    const { data: savedAnalysis, error: saveError } = await context.supabase.
    from('team_ocean_analyses').
    insert(analysisData).
    select().
    single();

    if (saveError) {
      console.error('Error saving team OCEAN analysis:', saveError);
      return NextResponse.json(
        { error: 'Failed to save team analysis' },
        { status: 500 }
      );
    }

    // Generate comprehensive recommendations
    const recommendations = generateComprehensiveRecommendations(
      composition,
      teamMetrics,
      roleAssignments
    );

    return NextResponse.json({
      analysis: savedAnalysis,
      composition,
      metrics: teamMetrics,
      recommendations,
      optimalAdditions
    });

  } catch (error) {
    console.error('Error creating team OCEAN composition:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper functions

async function verifyTeamAnalysisPermission(supabase, userId, teamId, organizationId) {
  try {
    // Check if user is a member of the organization with appropriate role
    const { data: membership, error } = await supabase.
    from('organization_members').
    select('role').
    eq('user_id', userId).
    eq('organization_id', organizationId).
    in('role', ['owner', 'admin', 'manager']).
    single();

    return !error && membership;
  } catch (error) {
    console.error('Error verifying team analysis permission:', error);
    return false;
  }
}

function calculateTeamMetrics(memberProfiles, composition) {
  const metrics = {
    cohesionIndex: calculateCohesionIndex(memberProfiles),
    innovationPotential: calculateInnovationPotential(composition),
    conflictProbability: calculateConflictProbability(composition),
    adaptabilityScore: calculateAdaptabilityScore(composition),
    performanceCapability: calculatePerformanceCapability(composition),
    communicationEffectiveness: calculateCommunicationEffectiveness(composition),
    riskFactors: identifyRiskFactors(composition, memberProfiles.length)
  };

  return metrics;
}

function calculateCohesionIndex(memberProfiles) {
  // Calculate based on similarity in key traits that promote cohesion
  const agreeableness = memberProfiles.map((p) => p.agreeableness);
  const extraversion = memberProfiles.map((p) => p.extraversion);
  const neuroticism = memberProfiles.map((p) => p.neuroticism);

  // Lower variance in agreeableness and neuroticism = higher cohesion
  const agreeablenessVariance = calculateVariance(agreeableness);
  const neuroticismVariance = calculateVariance(neuroticism);
  const extraversionMean = calculateMean(extraversion);

  // Higher cohesion when:
  // - Low variance in agreeableness (everyone cooperative)
  // - Low variance in neuroticism (stable group)
  // - Moderate to high extraversion (good communication)
  const cohesionScore =
  (1 - agreeablenessVariance / 2) * 0.4 +
  (1 - neuroticismVariance / 2) * 0.4 +
  extraversionMean / 5 * 0.2;


  return Math.max(0, Math.min(1, cohesionScore)) * 100;
}

function calculateInnovationPotential(composition) {
  const openness = composition.meanTraits.openness;
  const opennessDiv = composition.traitDiversity.openness;
  const extraversion = composition.meanTraits.extraversion;

  // Innovation requires high openness, some diversity, and communication
  const potential =
  openness / 5 * 0.5 +
  Math.min(opennessDiv / 1.5, 1) * 0.3 + // Optimal diversity around 1.5
  extraversion / 5 * 0.2;


  return Math.max(0, Math.min(1, potential)) * 100;
}

function calculateConflictProbability(composition) {
  const agreeableness = composition.meanTraits.agreeableness;
  const agreeablenessDiv = composition.traitDiversity.agreeableness;
  const neuroticism = composition.meanTraits.neuroticism;
  const neuroticismDiv = composition.traitDiversity.neuroticism;

  // Higher conflict when:
  // - Low agreeableness
  // - High diversity in agreeableness (some very disagreeable people)
  // - High neuroticism
  // - High diversity in neuroticism (emotional instability)
  const conflictRisk =
  (5 - agreeableness) / 5 * 0.3 +
  agreeablenessDiv / 2 * 0.3 +
  neuroticism / 5 * 0.2 +
  neuroticismDiv / 2 * 0.2;


  return Math.max(0, Math.min(1, conflictRisk)) * 100;
}

function calculateAdaptabilityScore(composition) {
  const openness = composition.meanTraits.openness;
  const neuroticism = composition.meanTraits.neuroticism;
  const extraversion = composition.meanTraits.extraversion;

  // Adaptability requires openness, low neuroticism, some extraversion
  const adaptability =
  openness / 5 * 0.5 +
  (5 - neuroticism) / 5 * 0.3 +
  extraversion / 5 * 0.2;


  return Math.max(0, Math.min(1, adaptability)) * 100;
}

function calculatePerformanceCapability(composition) {
  const conscientiousness = composition.meanTraits.conscientiousness;
  const conscientiousnessDiv = composition.traitDiversity.conscientiousness;
  const neuroticism = composition.meanTraits.neuroticism;

  // Performance requires high conscientiousness, alignment, low neuroticism
  const performance =
  conscientiousness / 5 * 0.5 +
  (1 - conscientiousnessDiv / 2) * 0.3 + // Lower diversity better for execution
  (5 - neuroticism) / 5 * 0.2;


  return Math.max(0, Math.min(1, performance)) * 100;
}

function calculateCommunicationEffectiveness(composition) {
  const extraversion = composition.meanTraits.extraversion;
  const agreeableness = composition.meanTraits.agreeableness;
  const openness = composition.meanTraits.openness;

  // Effective communication needs extraversion, agreeableness, openness
  const communication =
  extraversion / 5 * 0.4 +
  agreeableness / 5 * 0.4 +
  openness / 5 * 0.2;


  return Math.max(0, Math.min(1, communication)) * 100;
}

function identifyRiskFactors(composition, teamSize) {
  const risks = [];

  // Size-related risks
  if (teamSize < 3) {
    risks.push({
      type: 'team_size',
      severity: 'medium',
      description: 'Small team size may limit perspective diversity and resilience'
    });
  } else if (teamSize > 12) {
    risks.push({
      type: 'team_size',
      severity: 'high',
      description: 'Large team size may reduce coordination and communication effectiveness'
    });
  }

  // Trait-specific risks
  if (composition.meanTraits.neuroticism > 3.5) {
    risks.push({
      type: 'emotional_instability',
      severity: 'high',
      description: 'High team neuroticism may lead to stress cascades and poor decision-making'
    });
  }

  if (composition.meanTraits.agreeableness < 2.5) {
    risks.push({
      type: 'low_cooperation',
      severity: 'high',
      description: 'Low team agreeableness may result in frequent conflicts and poor collaboration'
    });
  }

  if (composition.meanTraits.conscientiousness < 2.8) {
    risks.push({
      type: 'execution_risk',
      severity: 'medium',
      description: 'Low team conscientiousness may lead to missed deadlines and quality issues'
    });
  }

  // Diversity risks
  if (composition.traitDiversity.agreeableness > 1.5) {
    risks.push({
      type: 'cooperation_variance',
      severity: 'medium',
      description: 'High variance in agreeableness may create subgroups and coordination challenges'
    });
  }

  if (composition.traitDiversity.conscientiousness > 1.8) {
    risks.push({
      type: 'standards_variance',
      severity: 'medium',
      description: 'High variance in conscientiousness may create conflicts over work standards'
    });
  }

  return risks;
}

function identifyOptimalTeamAdditions(composition, roleAssignments, metrics) {
  const additions = {};
  const currentMean = composition.meanTraits;
  const currentDiv = composition.traitDiversity;

  // Identify gaps in current composition
  const gaps = [];

  // Check for low trait means that might need boosting
  if (currentMean.openness < 3.2) {
    gaps.push({ trait: 'openness', target: 4.0, priority: 'high' });
  }
  if (currentMean.conscientiousness < 3.5) {
    gaps.push({ trait: 'conscientiousness', target: 4.2, priority: 'high' });
  }
  if (currentMean.extraversion < 2.8) {
    gaps.push({ trait: 'extraversion', target: 3.5, priority: 'medium' });
  }
  if (currentMean.agreeableness < 3.0) {
    gaps.push({ trait: 'agreeableness', target: 3.8, priority: 'high' });
  }
  if (currentMean.neuroticism > 3.5) {
    gaps.push({ trait: 'neuroticism', target: 2.5, priority: 'high' });
  }

  // Check for diversity needs
  if (currentDiv.openness < 0.8 && metrics.innovationPotential < 70) {
    gaps.push({ trait: 'openness', target: 5.0, priority: 'medium', reason: 'diversity' });
  }

  // Generate ideal addition profile
  for (const gap of gaps) {
    additions[gap.trait] = gap.target;
  }

  // Fill any remaining traits with balanced values
  const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  for (const trait of traits) {
    if (!additions[trait]) {
      additions[trait] = trait === 'neuroticism' ? 2.5 : 3.8; // Default good values
    }
  }

  return additions;
}

function generateTeamInsights(analysis, memberProfiles) {
  const insights = [];

  // Team dynamics insight
  const dynamics = analysis.dynamic_predictions;
  insights.push({
    type: 'team_dynamics',
    title: 'Team Dynamics Overview',
    description: 'Predicted team performance across key dimensions',
    metrics: dynamics,
    interpretation: interpretDynamicsScores(dynamics)
  });

  // Diversity insight
  const diversity = analysis.trait_diversity;
  const avgDiversity = Object.values(diversity).reduce((sum, val) => sum + val, 0) / 5;
  insights.push({
    type: 'diversity_profile',
    title: 'Personality Diversity Analysis',
    description: `Average diversity index: ${avgDiversity.toFixed(2)}`,
    diversity,
    interpretation: interpretDiversityLevel(avgDiversity)
  });

  // Role fit insight
  if (analysis.role_fit_scores && Object.keys(analysis.role_fit_scores).length > 0) {
    insights.push({
      type: 'role_alignment',
      title: 'Role-Personality Fit Analysis',
      description: 'How well team members\' personalities align with their roles',
      roleFits: analysis.role_fit_scores,
      interpretation: interpretRoleFits(analysis.role_fit_scores)
    });
  }

  // Risk factors insight
  if (analysis.risk_factors && analysis.risk_factors.length > 0) {
    insights.push({
      type: 'risk_assessment',
      title: 'Team Risk Factors',
      description: 'Potential challenges based on personality composition',
      risks: analysis.risk_factors,
      severity: assessOverallRiskSeverity(analysis.risk_factors)
    });
  }

  return insights;
}

function generateOptimizationRecommendations(analysis) {
  const recommendations = [];
  const dynamics = analysis.dynamic_predictions;
  const meanTraits = analysis.mean_traits;

  // Collaboration improvements
  if (dynamics.collaborationPotential < 70) {
    recommendations.push({
      area: 'Team Collaboration',
      priority: 'high',
      description: 'Enhance team collaboration and cooperation',
      strategies: [
      'Implement regular team building activities',
      'Establish clear communication protocols',
      'Create shared goals and success metrics',
      'Provide conflict resolution training'],

      targetTraits: ['agreeableness', 'extraversion']
    });
  }

  // Innovation capacity
  if (dynamics.innovationCapacity < 65) {
    recommendations.push({
      area: 'Innovation Capability',
      priority: 'medium',
      description: 'Boost team\'s innovation and creative problem-solving',
      strategies: [
      'Introduce brainstorming and ideation sessions',
      'Encourage diverse perspective sharing',
      'Implement innovation time allocation',
      'Bring in external viewpoints and expertise'],

      targetTraits: ['openness']
    });
  }

  // Execution reliability
  if (dynamics.executionReliability < 75) {
    recommendations.push({
      area: 'Execution Excellence',
      priority: 'high',
      description: 'Improve team\'s ability to deliver consistent results',
      strategies: [
      'Establish clear processes and standards',
      'Implement project management tools',
      'Create accountability systems',
      'Provide organization and planning training'],

      targetTraits: ['conscientiousness']
    });
  }

  // Conflict management
  if (dynamics.conflictRisk > 40) {
    recommendations.push({
      area: 'Conflict Prevention',
      priority: 'high',
      description: 'Reduce potential for team conflicts and tensions',
      strategies: [
      'Establish team norms and expectations',
      'Provide emotional intelligence training',
      'Create structured decision-making processes',
      'Implement regular team retrospectives'],

      targetTraits: ['agreeableness', 'neuroticism']
    });
  }

  return recommendations;
}

function generateComprehensiveRecommendations(composition, metrics, roleAssignments) {
  const recommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };

  // Immediate actions (0-30 days)
  if (metrics.conflictProbability > 60) {
    recommendations.immediate.push({
      action: 'Conduct team dynamics workshop',
      rationale: 'High conflict probability requires immediate attention',
      expectedOutcome: 'Reduced tension and improved communication'
    });
  }

  if (metrics.cohesionIndex < 50) {
    recommendations.immediate.push({
      action: 'Implement daily standups and check-ins',
      rationale: 'Low cohesion needs immediate relationship building',
      expectedOutcome: 'Increased team connection and alignment'
    });
  }

  // Short-term actions (1-6 months)
  if (metrics.innovationPotential < 60) {
    recommendations.shortTerm.push({
      action: 'Launch innovation challenge or hackathon',
      rationale: 'Team needs structured innovation opportunities',
      expectedOutcome: 'Enhanced creative thinking and collaboration'
    });
  }

  if (metrics.performanceCapability < 70) {
    recommendations.shortTerm.push({
      action: 'Implement performance management system',
      rationale: 'Team lacks consistent execution standards',
      expectedOutcome: 'Improved delivery reliability and quality'
    });
  }

  // Long-term actions (6+ months)
  recommendations.longTerm.push({
    action: 'Consider strategic team composition changes',
    rationale: 'Optimize personality mix for team goals',
    expectedOutcome: 'Enhanced overall team effectiveness'
  });

  if (composition.traitDiversity.openness < 0.8) {
    recommendations.longTerm.push({
      action: 'Recruit high-openness team members',
      rationale: 'Increase cognitive diversity and adaptability',
      expectedOutcome: 'Better innovation and change management'
    });
  }

  return recommendations;
}

// Utility functions

function calculateMean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateVariance(values) {
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return calculateMean(squaredDiffs);
}

function interpretDynamicsScores(dynamics) {
  const interpretations = [];

  if (dynamics.collaborationPotential > 80) {
    interpretations.push('Excellent collaboration capability');
  } else if (dynamics.collaborationPotential < 50) {
    interpretations.push('Collaboration challenges likely');
  }

  if (dynamics.innovationCapacity > 75) {
    interpretations.push('Strong innovation potential');
  } else if (dynamics.innovationCapacity < 40) {
    interpretations.push('Limited innovation capability');
  }

  if (dynamics.conflictRisk > 60) {
    interpretations.push('High risk of team conflicts');
  } else if (dynamics.conflictRisk < 30) {
    interpretations.push('Low conflict risk, harmonious team');
  }

  return interpretations;
}

function interpretDiversityLevel(avgDiversity) {
  if (avgDiversity > 1.3) {
    return 'High diversity - rich perspectives but coordination challenges';
  } else if (avgDiversity > 0.8) {
    return 'Optimal diversity - balanced perspectives and cohesion';
  } else if (avgDiversity > 0.5) {
    return 'Moderate diversity - good alignment with some perspective limitations';
  } else {
    return 'Low diversity - strong alignment but groupthink risk';
  }
}

function interpretRoleFits(roleFits) {
  const avgFit = Object.values(roleFits).reduce((sum, fit) => sum + fit, 0) / Object.keys(roleFits).length;

  if (avgFit > 0.8) {
    return 'Excellent role-personality alignment across the team';
  } else if (avgFit > 0.6) {
    return 'Good role fit with some optimization opportunities';
  } else {
    return 'Significant role-personality misalignment requiring attention';
  }
}

function assessOverallRiskSeverity(riskFactors) {
  const highRisks = riskFactors.filter((r) => r.severity === 'high').length;
  const mediumRisks = riskFactors.filter((r) => r.severity === 'medium').length;

  if (highRisks > 2) return 'Critical';
  if (highRisks > 0 || mediumRisks > 3) return 'High';
  if (mediumRisks > 0) return 'Medium';
  return 'Low';
}

function identifyTeamRisks(analysis) {
  return analysis.risk_factors || [];
}

function identifyTeamStrengths(analysis) {
  const strengths = [];
  const dynamics = analysis.dynamic_predictions;
  const meanTraits = analysis.mean_traits;

  if (dynamics.collaborationPotential > 75) {
    strengths.push({
      area: 'Collaboration',
      score: dynamics.collaborationPotential,
      description: 'Team works exceptionally well together'
    });
  }

  if (dynamics.innovationCapacity > 70) {
    strengths.push({
      area: 'Innovation',
      score: dynamics.innovationCapacity,
      description: 'Strong capacity for creative problem-solving'
    });
  }

  if (dynamics.executionReliability > 80) {
    strengths.push({
      area: 'Execution',
      score: dynamics.executionReliability,
      description: 'Highly reliable delivery and performance'
    });
  }

  if (meanTraits.conscientiousness > 4.0) {
    strengths.push({
      area: 'Organization',
      score: meanTraits.conscientiousness * 20,
      description: 'Excellent planning and organizational skills'
    });
  }

  if (meanTraits.agreeableness > 4.0) {
    strengths.push({
      area: 'Team Harmony',
      score: meanTraits.agreeableness * 20,
      description: 'Supportive and cooperative team environment'
    });
  }

  return strengths;
}