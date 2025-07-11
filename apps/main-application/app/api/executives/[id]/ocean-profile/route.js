import { NextResponse } from 'next/server';
import { createProtectedRoute } from "@ioc/shared/api-utils";
import { calculateExecutiveOceanProfile } from "@ioc/shared/data-access/scoring/ocean-executive-org-scoring";

// GET /api/executives/[id]/ocean-profile - Get executive OCEAN profile
export const GET = createProtectedRoute(async (request, context) => {
  const { id: executiveId } = context.params;

  try {
    // Get the latest executive OCEAN profile
    const { data: profile, error } = await context.supabase.
    from('executive_ocean_profiles').
    select(`
        *,
        assessments!inner(
          id,
          title,
          status,
          completed_at
        )
      `).
    eq('user_id', executiveId).
    order('profile_date', { ascending: false }).
    limit(1).
    single();

    if (error) {
      console.error('Error fetching executive OCEAN profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch executive profile' },
        { status: 404 }
      );
    }

    // Get team predictions and fit analysis if available
    const { data: orgFit } = await context.supabase.
    from('executive_org_fit').
    select('*').
    eq('executive_id', executiveId).
    order('fit_date', { ascending: false }).
    limit(1).
    maybeSingle();

    // Calculate leadership insights
    const leadershipInsights = generateLeadershipInsights(profile);

    return NextResponse.json({
      profile: {
        ...profile,
        organizationFit: orgFit,
        insights: leadershipInsights
      }
    });

  } catch (error) {
    console.error('Unexpected error in executive OCEAN profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/executives/[id]/ocean-profile - Create/update executive OCEAN profile
export const POST = createProtectedRoute(async (request, context) => {
  const { id: executiveId } = context.params;

  try {
    const body = await request.json();
    const { assessmentId, responses, roleContext } = body;

    // Validate that user has permission to create profile for this executive
    if (context.userId !== executiveId) {
      // Check if user is admin in the organization
      const { data: adminCheck } = await context.supabase.
      from('organization_members').
      select('role').
      eq('user_id', context.userId).
      eq('organization_id', body.organizationId).
      in('role', ['owner', 'admin']).
      single();

      if (!adminCheck) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Calculate the executive OCEAN profile
    const oceanProfile = calculateExecutiveOceanProfile(responses, roleContext);

    // Prepare data for database insertion
    const profileData = {
      user_id: executiveId,
      assessment_id: assessmentId,
      openness: oceanProfile.traits.openness,
      conscientiousness: oceanProfile.traits.conscientiousness,
      extraversion: oceanProfile.traits.extraversion,
      agreeableness: oceanProfile.traits.agreeableness,
      neuroticism: oceanProfile.traits.neuroticism,
      leadership_styles: oceanProfile.leadershipStyles,
      influence_tactics: oceanProfile.influenceTactics,
      team_predictions: oceanProfile.teamPredictions,
      stress_response: oceanProfile.stressResponse
    };

    // Insert or update the executive profile
    const { data: savedProfile, error: saveError } = await context.supabase.
    from('executive_ocean_profiles').
    upsert(profileData, {
      onConflict: 'user_id,assessment_id',
      ignoreDuplicates: false
    }).
    select().
    single();

    if (saveError) {
      console.error('Error saving executive OCEAN profile:', saveError);
      return NextResponse.json(
        { error: 'Failed to save executive profile' },
        { status: 500 }
      );
    }

    // Generate development recommendations
    const recommendations = generateDevelopmentRecommendations(oceanProfile);

    return NextResponse.json({
      profile: savedProfile,
      analysis: oceanProfile,
      recommendations
    });

  } catch (error) {
    console.error('Error creating executive OCEAN profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper functions

function generateLeadershipInsights(profile) {
  const insights = [];

  // Leadership style insights
  const dominantStyle = Object.entries(profile.leadership_styles).
  reduce((a, b) => parseFloat(a[1]) > parseFloat(b[1]) ? a : b);

  insights.push({
    type: 'leadership_style',
    title: `Primary Leadership Style: ${dominantStyle[0]}`,
    description: getStyleDescription(dominantStyle[0]),
    strength: parseFloat(dominantStyle[1])
  });

  // Influence tactics insights  
  const topTactic = Object.entries(profile.influence_tactics).
  reduce((a, b) => parseFloat(a[1]) > parseFloat(b[1]) ? a : b);

  insights.push({
    type: 'influence_tactic',
    title: `Preferred Influence Tactic: ${topTactic[0]}`,
    description: getTacticDescription(topTactic[0]),
    effectiveness: parseFloat(topTactic[1])
  });

  // Team prediction insights
  const teamPredictions = profile.team_predictions;
  const strongestPrediction = Object.entries(teamPredictions).
  reduce((a, b) => parseFloat(a[1]) > parseFloat(b[1]) ? a : b);

  insights.push({
    type: 'team_impact',
    title: `Greatest Team Impact: ${strongestPrediction[0]}`,
    description: getTeamImpactDescription(strongestPrediction[0]),
    score: parseFloat(strongestPrediction[1])
  });

  // Stress resilience insight
  if (profile.stress_response?.resilienceScore) {
    insights.push({
      type: 'stress_resilience',
      title: 'Stress Leadership Capability',
      description: getResilienceDescription(profile.stress_response),
      score: parseFloat(profile.stress_response.resilienceScore)
    });
  }

  return insights;
}

function generateDevelopmentRecommendations(oceanProfile) {
  const recommendations = [];

  // Leadership style development
  const styles = oceanProfile.leadershipStyles;
  const transformational = parseFloat(styles.transformational || 0);

  if (transformational < 20) {
    recommendations.push({
      area: 'Transformational Leadership',
      priority: 'high',
      description: 'Develop transformational leadership capabilities to inspire and motivate teams',
      activities: [
      'Vision creation workshops',
      'Inspirational communication training',
      'Change leadership certification']

    });
  }

  // Emotional stability development
  if (oceanProfile.emotionalStability < 3.5) {
    recommendations.push({
      area: 'Emotional Stability',
      priority: 'high',
      description: 'Enhance emotional regulation and stress management capabilities',
      activities: [
      'Executive coaching on stress management',
      'Mindfulness and resilience training',
      'Crisis leadership simulation']

    });
  }

  // Team engagement development
  const engagement = parseFloat(oceanProfile.teamPredictions.engagement || 0);
  if (engagement < 70) {
    recommendations.push({
      area: 'Team Engagement',
      priority: 'medium',
      description: 'Improve ability to engage and motivate team members',
      activities: [
      'Team building facilitation training',
      'Employee engagement strategies workshop',
      'One-on-one coaching skills development']

    });
  }

  return recommendations;
}

function getStyleDescription(style) {
  const descriptions = {
    transformational: 'Inspires and motivates through vision and personal charisma',
    transactional: 'Achieves results through clear expectations and rewards',
    servant: 'Leads by serving others and developing their potential',
    authentic: 'Leads with genuineness and consistency between values and actions',
    adaptive: 'Flexibly adjusts leadership approach based on situation'
  };
  return descriptions[style] || 'Leadership style focused on achieving organizational goals';
}

function getTacticDescription(tactic) {
  const descriptions = {
    inspirationalAppeals: 'Motivates through appealing to values and emotions',
    rationalPersuasion: 'Influences through logical arguments and evidence',
    consultation: 'Involves others in decision-making to gain buy-in',
    ingratiation: 'Uses praise and relationship-building to influence',
    exchange: 'Offers benefits or reciprocity for compliance',
    personalAppeals: 'Appeals to loyalty and friendship',
    coalition: 'Builds alliances to support initiatives',
    legitimating: 'References authority or policies to justify requests',
    pressure: 'Uses demands, threats, or persistent follow-up'
  };
  return descriptions[tactic] || 'Influence approach used to gain compliance and support';
}

function getTeamImpactDescription(impact) {
  const descriptions = {
    engagement: 'Strong ability to motivate and involve team members',
    innovation: 'Excellent at fostering creative thinking and new ideas',
    performance: 'Highly effective at driving results and achievement',
    cohesion: 'Exceptional at building team unity and collaboration'
  };
  return descriptions[impact] || 'Positive impact on team dynamics and outcomes';
}

function getResilienceDescription(stressResponse) {
  const score = parseFloat(stressResponse.resilienceScore || 0);

  if (score >= 80) {
    return 'Exceptional resilience with rapid recovery from setbacks';
  } else if (score >= 60) {
    return 'Good stress management with stable performance under pressure';
  } else if (score >= 40) {
    return 'Moderate resilience requiring some support during high stress';
  } else {
    return 'Lower resilience requiring development of stress management skills';
  }
}