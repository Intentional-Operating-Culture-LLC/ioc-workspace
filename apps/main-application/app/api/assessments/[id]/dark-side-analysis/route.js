import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess } from "@ioc/shared/api-utils";
import {
  generateDarkSideAssessment,
  assessDarkSideRisk,
  DARK_SIDE_THRESHOLDS,
  DARK_SIDE_MANIFESTATIONS,
  STRESS_RESPONSE_PATTERNS } from
"@ioc/shared/data-access/scoring/ocean-dark-side-mapping";

// GET /api/assessments/[id]/dark-side-analysis - Get dark side analysis for assessment
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment and verify access
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('*').
    eq('id', assessmentId).
    single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin', 'member']
    );

    if (accessError) return accessError;

    // Get the OCEAN scores for this assessment
    const { data: oceanScores, error: scoresError } = await context.supabase.
    from('assessment_responses').
    select('trait, score').
    eq('assessment_id', assessmentId);

    if (scoresError) {
      console.error('Error fetching OCEAN scores:', scoresError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment scores' },
        { status: 500 }
      );
    }

    // Convert to OCEAN profile format
    const oceanProfile = {};
    for (const score of oceanScores) {
      oceanProfile[score.trait] = score.score;
    }

    // Check if we have existing dark side analysis
    const { data: existingAnalysis } = await context.supabase.
    from('dark_side_analyses').
    select('*').
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    maybeSingle();

    // Get current stress level (from recent surveys or default)
    const { data: stressData } = await context.supabase.
    from('stress_assessments').
    select('stress_level').
    eq('user_id', assessment.user_id).
    order('created_at', { ascending: false }).
    limit(1).
    maybeSingle();

    const currentStressLevel = stressData?.stress_level || 5;

    // Get observer ratings if available (360 feedback)
    const { data: observerRatings } = await context.supabase.
    from('360_feedback').
    select('trait, avg_rating').
    eq('subject_user_id', assessment.user_id).
    order('created_at', { ascending: false }).
    limit(5);

    const observerProfile = {};
    if (observerRatings && observerRatings.length > 0) {
      for (const rating of observerRatings) {
        observerProfile[rating.trait] = rating.avg_rating;
      }
    }

    // Get behavioral observations
    const { data: behavioralObs } = await context.supabase.
    from('behavioral_observations').
    select('observation_text').
    eq('user_id', assessment.user_id).
    order('created_at', { ascending: false }).
    limit(10);

    const observations = behavioralObs?.map((obs) => obs.observation_text) || [];

    // Generate comprehensive dark side analysis
    const darkSideAnalysis = generateDarkSideAssessment(
      oceanProfile,
      currentStressLevel,
      Object.keys(observerProfile).length > 0 ? observerProfile : undefined,
      observations
    );

    // Save the analysis to database if new or significantly different
    if (!existingAnalysis || hasSignificantChange(existingAnalysis, darkSideAnalysis)) {
      const { error: saveError } = await context.supabase.
      from('dark_side_analyses').
      insert({
        assessment_id: assessmentId,
        user_id: assessment.user_id,
        organization_id: assessment.organization_id,
        overall_risk_level: darkSideAnalysis.darkSideRisk.overallRisk,
        trait_risks: darkSideAnalysis.darkSideRisk.traitRisks,
        stress_level: currentStressLevel,
        stress_amplification: darkSideAnalysis.darkSideRisk.stressAmplification,
        team_impact: darkSideAnalysis.stressResponse.teamImpact,
        behavioral_indicators: darkSideAnalysis.behavioralIndicators.observedBehaviors,
        intervention_plan: darkSideAnalysis.interventionRecommendations,
        self_awareness_gap: darkSideAnalysis.behavioralIndicators.selfAwarenessGap,
        analysis_data: darkSideAnalysis
      });

      if (saveError) {
        console.error('Error saving dark side analysis:', saveError);
        // Continue anyway - return the analysis even if save fails
      }
    }

    // Generate insights and recommendations
    const insights = generateDarkSideInsights(darkSideAnalysis, oceanProfile);

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        userId: assessment.user_id,
        organizationId: assessment.organization_id
      },
      oceanProfile,
      darkSideAnalysis,
      insights,
      metadata: {
        stressLevel: currentStressLevel,
        hasObserverRatings: Object.keys(observerProfile).length > 0,
        observationCount: observations.length,
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in dark side analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/assessments/[id]/dark-side-analysis - Update stress level and regenerate analysis
export const POST = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    const body = await request.json();
    const { stressLevel, behavioralObservations, observerRatings } = body;

    // Validate input
    if (stressLevel && (stressLevel < 1 || stressLevel > 10)) {
      return NextResponse.json(
        { error: 'Stress level must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Get the assessment
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('*').
    eq('id', assessmentId).
    single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    // Update stress level if provided
    if (stressLevel) {
      await context.supabase.
      from('stress_assessments').
      insert({
        user_id: assessment.user_id,
        stress_level: stressLevel,
        assessor_id: context.userId
      });
    }

    // Add behavioral observations if provided
    if (behavioralObservations && Array.isArray(behavioralObservations)) {
      for (const observation of behavioralObservations) {
        await context.supabase.
        from('behavioral_observations').
        insert({
          user_id: assessment.user_id,
          observer_id: context.userId,
          observation_text: observation,
          observation_date: new Date().toISOString()
        });
      }
    }

    // Update observer ratings if provided
    if (observerRatings) {
      for (const [trait, rating] of Object.entries(observerRatings)) {
        await context.supabase.
        from('360_feedback').
        upsert({
          subject_user_id: assessment.user_id,
          rater_id: context.userId,
          trait,
          rating,
          feedback_date: new Date().toISOString()
        }, {
          onConflict: 'subject_user_id,rater_id,trait'
        });
      }
    }

    // Trigger regeneration by calling GET endpoint logic
    const url = new URL(request.url);
    const getResponse = await GET(
      new Request(url.toString(), { method: 'GET' }),
      context
    );

    return getResponse;

  } catch (error) {
    console.error('Error updating dark side analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper functions

function hasSignificantChange(existing, current) {
  // Compare overall risk levels
  if (existing.overall_risk_level !== current.darkSideRisk.overallRisk) {
    return true;
  }

  // Compare stress amplification (significant if change > 0.3)
  const stressChange = Math.abs(
    (existing.stress_amplification || 1.0) -
    current.darkSideRisk.stressAmplification
  );
  if (stressChange > 0.3) {
    return true;
  }

  // Compare team impact
  if (existing.team_impact !== current.stressResponse.teamImpact) {
    return true;
  }

  return false;
}

function generateDarkSideInsights(analysis, oceanProfile) {
  const insights = [];

  // Overall risk insight
  insights.push({
    type: 'overall_risk',
    title: `Dark Side Risk Level: ${analysis.darkSideRisk.overallRisk.toUpperCase()}`,
    description: getRiskDescription(analysis.darkSideRisk.overallRisk),
    severity: analysis.darkSideRisk.overallRisk,
    actionRequired: analysis.darkSideRisk.overallRisk === 'high' || analysis.darkSideRisk.overallRisk === 'critical'
  });

  // Trait-specific insights
  for (const [trait, risk] of Object.entries(analysis.darkSideRisk.traitRisks)) {
    if (risk.riskLevel !== 'low') {
      const manifestation = DARK_SIDE_MANIFESTATIONS[trait];
      const traitData = risk.manifestationType === 'high_extreme' ? manifestation?.high : manifestation?.low;

      insights.push({
        type: 'trait_risk',
        trait,
        title: `${trait.charAt(0).toUpperCase() + trait.slice(1)} ${risk.manifestationType.replace('_', ' ').toUpperCase()}`,
        description: traitData?.description || `${trait} showing extreme tendencies`,
        riskLevel: risk.riskLevel,
        primaryConcerns: risk.primaryConcerns,
        impactAreas: risk.impactAreas,
        manifestationType: risk.manifestationType
      });
    }
  }

  // Stress response insight
  if (analysis.stressResponse.currentStressLevel >= 7) {
    insights.push({
      type: 'stress_response',
      title: 'High Stress Level Detected',
      description: `Current stress level of ${analysis.stressResponse.currentStressLevel}/10 may amplify dark side tendencies`,
      stressLevel: analysis.stressResponse.currentStressLevel,
      teamImpact: analysis.stressResponse.teamImpact,
      adaptiveCapacity: analysis.stressResponse.adaptiveCapacity,
      maladaptivePatterns: analysis.stressResponse.maladaptivePatterns
    });
  }

  // Self-awareness insight
  if (analysis.behavioralIndicators.selfAwarenessGap > 1.0) {
    insights.push({
      type: 'self_awareness',
      title: 'Self-Awareness Gap Detected',
      description: `Significant difference between self-perception and others' observations`,
      gap: analysis.behavioralIndicators.selfAwarenessGap,
      recommendation: 'Consider 360-degree feedback and coaching support'
    });
  }

  // Team impact insight
  const teamMorale = analysis.behavioralIndicators.impactOnOthers.teamMorale;
  if (teamMorale < 60) {
    insights.push({
      type: 'team_impact',
      title: 'Negative Team Impact',
      description: 'Leadership behavior may be negatively affecting team performance and morale',
      teamMorale,
      turnoverRisk: analysis.behavioralIndicators.impactOnOthers.turnoverRisk,
      productivity: analysis.behavioralIndicators.impactOnOthers.productivity
    });
  }

  // Intervention urgency
  if (analysis.interventionRecommendations.immediateActions.length > 0) {
    insights.push({
      type: 'intervention',
      title: 'Immediate Action Required',
      description: 'Leadership intervention needed to prevent escalation',
      immediateActions: analysis.interventionRecommendations.immediateActions,
      urgency: 'high'
    });
  }

  return insights;
}

function getRiskDescription(riskLevel) {
  const descriptions = {
    low: 'Minimal dark side risk. Continue monitoring and maintain current development practices.',
    moderate: 'Some dark side tendencies present. Monitor closely and consider targeted development.',
    high: 'Significant dark side risk requiring immediate attention and intervention.',
    critical: 'Critical dark side manifestation requiring urgent intervention and support.'
  };

  return descriptions[riskLevel] || 'Risk level assessment pending.';
}