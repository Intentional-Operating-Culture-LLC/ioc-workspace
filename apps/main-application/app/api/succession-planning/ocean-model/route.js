import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess } from "@ioc/shared/api-utils";
import { createSuccessionPlanningModel } from "@ioc/shared/data-access/scoring/ocean-executive-org-scoring";

// POST /api/succession-planning/ocean-model - Create succession planning model
export const POST = createProtectedRoute(async (request, context) => {
  try {
    const body = await request.json();
    const {
      organizationId,
      currentExecutiveId,
      futureNeeds,
      strategicContext,
      timeHorizon
    } = body;

    // Validate organization admin access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      organizationId,
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    // Get current executive's OCEAN profile
    const { data: currentExecProfile, error: execError } = await context.supabase.
    from('executive_ocean_profiles').
    select('*').
    eq('user_id', currentExecutiveId).
    order('profile_date', { ascending: false }).
    limit(1).
    maybeSingle();

    if (execError || !currentExecProfile) {
      return NextResponse.json(
        { error: 'Current executive OCEAN profile not found' },
        { status: 404 }
      );
    }

    // Get organizational OCEAN profile
    const { data: orgProfile, error: orgError } = await context.supabase.
    from('organizational_ocean_profiles').
    select('*').
    eq('organization_id', organizationId).
    order('assessment_date', { ascending: false }).
    limit(1).
    maybeSingle();

    if (orgError || !orgProfile) {
      return NextResponse.json(
        { error: 'Organizational OCEAN profile not found' },
        { status: 404 }
      );
    }

    // Prepare current executive profile
    const currentExecutive = {
      openness: currentExecProfile.openness,
      conscientiousness: currentExecProfile.conscientiousness,
      extraversion: currentExecProfile.extraversion,
      agreeableness: currentExecProfile.agreeableness,
      neuroticism: currentExecProfile.neuroticism
    };

    // Prepare organizational profile
    const orgTraits = {
      openness: orgProfile.collective_openness,
      conscientiousness: orgProfile.collective_conscientiousness,
      extraversion: orgProfile.collective_extraversion,
      agreeableness: orgProfile.collective_agreeableness,
      neuroticism: orgProfile.collective_neuroticism
    };

    // Create succession planning model
    const successionModel = createSuccessionPlanningModel(
      currentExecutive,
      orgTraits,
      futureNeeds
    );

    // Prepare data for database insertion
    const modelData = {
      organization_id: organizationId,
      current_executive_id: currentExecutiveId,
      ideal_successor_profile: successionModel.idealProfile,
      critical_traits: successionModel.criticalTraits,
      acceptable_ranges: successionModel.acceptableRanges,
      development_paths: successionModel.developmentPaths,
      development_timeline: successionModel.timeline,
      future_needs: futureNeeds,
      notes: strategicContext
    };

    // Save succession planning model
    const { data: savedModel, error: saveError } = await context.supabase.
    from('succession_planning_models').
    insert(modelData).
    select().
    single();

    if (saveError) {
      console.error('Error saving succession planning model:', saveError);
      return NextResponse.json(
        { error: 'Failed to save succession planning model' },
        { status: 500 }
      );
    }

    // Generate candidate recommendations
    const candidateRecommendations = await generateCandidateRecommendations(
      context.supabase,
      organizationId,
      successionModel.idealProfile,
      successionModel.acceptableRanges
    );

    return NextResponse.json({
      model: savedModel,
      analysis: successionModel,
      candidateRecommendations,
      implementation: {
        timeHorizon: timeHorizon || successionModel.timeline,
        criticalMilestones: generateCriticalMilestones(successionModel),
        riskMitigation: generateRiskMitigation(successionModel, currentExecutive)
      }
    });

  } catch (error) {
    console.error('Error creating succession planning model:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// GET /api/succession-planning/ocean-model?organizationId=xxx - Get existing models
export const GET = createProtectedRoute(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Validate organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      organizationId,
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    // Get succession planning models for the organization
    const { data: models, error } = await context.supabase.
    from('succession_planning_models').
    select(`
        *,
        current_executive:auth.users(
          id,
          email,
          raw_user_meta_data
        )
      `).
    eq('organization_id', organizationId).
    order('model_date', { ascending: false });

    if (error) {
      console.error('Error fetching succession planning models:', error);
      return NextResponse.json(
        { error: 'Failed to fetch succession planning models' },
        { status: 500 }
      );
    }

    // Enhance models with current status and progress
    const enhancedModels = await Promise.all(
      models.map(async (model) => {
        const progress = await calculateModelProgress(context.supabase, model);
        const candidates = await evaluateCurrentCandidates(
          context.supabase,
          organizationId,
          model.ideal_successor_profile
        );

        return {
          ...model,
          progress,
          candidates,
          status: determineModelStatus(model, progress)
        };
      })
    );

    return NextResponse.json({
      models: enhancedModels,
      summary: generateModelsSummary(enhancedModels)
    });

  } catch (error) {
    console.error('Error fetching succession planning models:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper functions

async function generateCandidateRecommendations(supabase, organizationId, idealProfile, acceptableRanges) {
  try {
    // Get all potential candidates (executives and high-potential employees)
    const { data: candidates, error } = await supabase.
    from('organization_members').
    select(`
        user_id,
        role,
        auth.users(
          id,
          email,
          raw_user_meta_data
        ),
        executive_ocean_profiles(
          openness,
          conscientiousness,
          extraversion,
          agreeableness,
          neuroticism,
          profile_date
        )
      `).
    eq('organization_id', organizationId).
    in('role', ['admin', 'manager', 'member']);

    if (error || !candidates) return [];

    // Score each candidate against the ideal profile
    const scoredCandidates = candidates.
    filter((candidate) =>
    candidate.executive_ocean_profiles &&
    candidate.executive_ocean_profiles.length > 0
    ).
    map((candidate) => {
      const profile = candidate.executive_ocean_profiles[0];
      const fitScore = calculateSuccessionFit(profile, idealProfile, acceptableRanges);

      return {
        userId: candidate.user_id,
        email: candidate.auth.users.email,
        name: candidate.auth.users.raw_user_meta_data?.name || 'Unknown',
        currentRole: candidate.role,
        fitScore: fitScore.overall,
        traitFits: fitScore.traits,
        developmentNeeds: identifyDevelopmentNeeds(profile, idealProfile),
        readinessLevel: determineReadinessLevel(fitScore.overall),
        estimatedTimeToReadiness: estimateTimeToReadiness(fitScore.overall, fitScore.gaps)
      };
    }).
    sort((a, b) => b.fitScore - a.fitScore);

    return scoredCandidates;

  } catch (error) {
    console.error('Error generating candidate recommendations:', error);
    return [];
  }
}

function calculateSuccessionFit(candidateProfile, idealProfile, acceptableRanges) {
  const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  const traitFits = {};
  let totalGap = 0;
  let criticalGaps = 0;

  for (const trait of traits) {
    const candidateScore = candidateProfile[trait];
    const idealScore = idealProfile[trait];
    const range = acceptableRanges[trait] || [idealScore - 0.5, idealScore + 0.5];

    let fit;
    if (candidateScore >= range[0] && candidateScore <= range[1]) {
      fit = 1.0; // Perfect fit within acceptable range
    } else {
      const gap = Math.min(
        Math.abs(candidateScore - range[0]),
        Math.abs(candidateScore - range[1])
      );
      fit = Math.max(0, 1 - gap / 2); // Scale gap to 0-1
      totalGap += gap;

      if (gap > 1.0) criticalGaps++;
    }

    traitFits[trait] = {
      score: fit,
      candidateValue: candidateScore,
      idealValue: idealScore,
      acceptable: fit === 1.0,
      gap: candidateScore - idealScore
    };
  }

  const overallFit = Object.values(traitFits).reduce((sum, t) => sum + t.score, 0) / traits.length;

  return {
    overall: overallFit,
    traits: traitFits,
    totalGap: totalGap,
    criticalGaps: criticalGaps
  };
}

function identifyDevelopmentNeeds(candidateProfile, idealProfile) {
  const needs = [];
  const traits = {
    openness: 'Innovation and adaptability',
    conscientiousness: 'Organization and reliability',
    extraversion: 'Leadership presence and communication',
    agreeableness: 'Collaboration and team building',
    neuroticism: 'Emotional regulation and stress management'
  };

  for (const [trait, description] of Object.entries(traits)) {
    const gap = idealProfile[trait] - candidateProfile[trait];

    if (trait === 'neuroticism') {
      // For neuroticism, lower is better
      if (gap < -0.5) {
        needs.push({
          area: description,
          priority: Math.abs(gap) > 1.0 ? 'high' : 'medium',
          currentLevel: candidateProfile[trait],
          targetLevel: idealProfile[trait],
          developmentFocus: 'Stress management and emotional regulation skills'
        });
      }
    } else {
      // For other traits, higher is generally better
      if (gap > 0.5) {
        needs.push({
          area: description,
          priority: gap > 1.0 ? 'high' : 'medium',
          currentLevel: candidateProfile[trait],
          targetLevel: idealProfile[trait],
          developmentFocus: getTraitDevelopmentFocus(trait)
        });
      }
    }
  }

  return needs;
}

function getTraitDevelopmentFocus(trait) {
  const focuses = {
    openness: 'Strategic thinking, innovation projects, and change leadership',
    conscientiousness: 'Process management, goal setting, and accountability systems',
    extraversion: 'Public speaking, network building, and team leadership',
    agreeableness: 'Conflict resolution, team building, and stakeholder management'
  };
  return focuses[trait] || 'General leadership development';
}

function determineReadinessLevel(fitScore) {
  if (fitScore >= 0.9) return 'Ready Now';
  if (fitScore >= 0.75) return 'Ready within 12 months';
  if (fitScore >= 0.6) return 'Ready within 24 months';
  if (fitScore >= 0.45) return 'Ready within 36 months';
  return 'Requires significant development';
}

function estimateTimeToReadiness(fitScore, gaps) {
  const baseTime = (1 - fitScore) * 36; // Up to 36 months for 0% fit
  const criticalGapPenalty = gaps.criticalGaps * 6; // 6 months per critical gap
  return Math.min(baseTime + criticalGapPenalty, 48); // Cap at 48 months
}

function generateCriticalMilestones(successionModel) {
  const milestones = [];
  const timeline = successionModel.timeline;

  milestones.push({
    month: Math.round(timeline * 0.25),
    title: 'Initial Assessment and Development Planning',
    description: 'Complete baseline assessments and create individual development plans'
  });

  milestones.push({
    month: Math.round(timeline * 0.5),
    title: 'Mid-point Progress Review',
    description: 'Assess development progress and adjust plans as needed'
  });

  milestones.push({
    month: Math.round(timeline * 0.75),
    title: 'Leadership Readiness Evaluation',
    description: 'Comprehensive leadership assessment and succession readiness review'
  });

  milestones.push({
    month: timeline,
    title: 'Succession Implementation',
    description: 'Execute succession plan with selected candidate'
  });

  return milestones;
}

function generateRiskMitigation(successionModel, currentExecutive) {
  const risks = [];

  // Knowledge transfer risk
  risks.push({
    risk: 'Knowledge Transfer Gap',
    probability: 'High',
    impact: 'High',
    mitigation: [
    'Implement comprehensive knowledge documentation',
    'Create mentoring relationships',
    'Establish overlapping responsibility periods']

  });

  // Development timeline risk
  if (successionModel.timeline > 24) {
    risks.push({
      risk: 'Extended Development Timeline',
      probability: 'Medium',
      impact: 'Medium',
      mitigation: [
      'Identify interim leadership options',
      'Accelerate development through intensive programs',
      'Consider external candidate supplementation']

    });
  }

  // Cultural fit risk
  risks.push({
    risk: 'Cultural Integration Challenges',
    probability: 'Medium',
    impact: 'High',
    mitigation: [
    'Provide cultural immersion experiences',
    'Assign cultural mentors',
    'Implement gradual integration process']

  });

  return risks;
}

async function calculateModelProgress(supabase, model) {
  // This would track actual development progress against the model
  // For now, return a placeholder calculation
  const monthsSinceCreation = Math.floor(
    (new Date() - new Date(model.model_date)) / (1000 * 60 * 60 * 24 * 30)
  );

  const progressPercentage = Math.min(
    monthsSinceCreation / model.development_timeline * 100,
    100
  );

  return {
    monthsElapsed: monthsSinceCreation,
    totalMonths: model.development_timeline,
    progressPercentage: Math.round(progressPercentage),
    onTrack: progressPercentage <= monthsSinceCreation / model.development_timeline * 110 // 10% buffer
  };
}

async function evaluateCurrentCandidates(supabase, organizationId, idealProfile) {
  // This would re-evaluate current candidates against the ideal profile
  // For now, return a placeholder
  return {
    totalCandidates: 0,
    readyCandidates: 0,
    developingCandidates: 0,
    averageFitScore: 0
  };
}

function determineModelStatus(model, progress) {
  if (progress.progressPercentage >= 100) return 'Completed';
  if (progress.progressPercentage >= 75) return 'Near Completion';
  if (progress.onTrack) return 'On Track';
  return 'Behind Schedule';
}

function generateModelsSummary(models) {
  return {
    totalModels: models.length,
    activeModels: models.filter((m) => m.status !== 'Completed').length,
    completedModels: models.filter((m) => m.status === 'Completed').length,
    averageTimeline: models.reduce((sum, m) => sum + m.development_timeline, 0) / models.length || 0,
    criticalTraitsFocus: extractCriticalTraitsFocus(models)
  };
}

function extractCriticalTraitsFocus(models) {
  const traitCount = {};

  models.forEach((model) => {
    if (model.critical_traits) {
      model.critical_traits.forEach((trait) => {
        traitCount[trait] = (traitCount[trait] || 0) + 1;
      });
    }
  });

  return Object.entries(traitCount).
  sort(([, a], [, b]) => b - a).
  slice(0, 3).
  map(([trait, count]) => ({ trait, frequency: count }));
}