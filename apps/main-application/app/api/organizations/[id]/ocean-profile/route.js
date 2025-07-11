import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess } from "@ioc/shared/api-utils";
import { calculateOrganizationalOceanProfile } from "@ioc/shared/data-access/scoring/ocean-executive-org-scoring";

// GET /api/organizations/[id]/ocean-profile - Get organizational OCEAN profile
export const GET = createProtectedRoute(async (request, context) => {
  const { id: organizationId } = context.params;

  try {
    // Validate organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      organizationId,
      ['owner', 'admin', 'member']
    );

    if (accessError) return accessError;

    // Get the latest organizational OCEAN profile
    const { data: profile, error } = await context.supabase.
    from('organizational_ocean_profiles').
    select('*').
    eq('organization_id', organizationId).
    order('assessment_date', { ascending: false }).
    limit(1).
    maybeSingle();

    if (error) {
      console.error('Error fetching organizational OCEAN profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizational profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { message: 'No organizational OCEAN profile found' },
        { status: 404 }
      );
    }

    // Get team analyses for the organization
    const { data: teamAnalyses, error: teamError } = await context.supabase.
    from('team_ocean_analyses').
    select('*').
    eq('organization_id', organizationId).
    order('analysis_date', { ascending: false }).
    limit(10);

    if (teamError) {
      console.error('Error fetching team analyses:', teamError);
    }

    // Get executive-org fit data
    const { data: executiveFits, error: fitError } = await context.supabase.
    from('executive_org_fit_summary').
    select('*').
    eq('organization_id', organizationId).
    order('overall_fit_score', { ascending: false });

    if (fitError) {
      console.error('Error fetching executive fits:', fitError);
    }

    // Generate organizational insights
    const insights = generateOrganizationalInsights(profile, teamAnalyses, executiveFits);

    return NextResponse.json({
      profile,
      teamAnalyses: teamAnalyses || [],
      executiveFits: executiveFits || [],
      insights
    });

  } catch (error) {
    console.error('Unexpected error in organizational OCEAN profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/organizations/[id]/ocean-profile - Create/update organizational OCEAN profile
export const POST = createProtectedRoute(async (request, context) => {
  const { id: organizationId } = context.params;

  try {
    // Validate organization admin access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      organizationId,
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    const body = await request.json();
    const { individualProfiles, interactionMatrix, assessmentContext } = body;

    // Validate input data
    if (!individualProfiles || !Array.isArray(individualProfiles) || individualProfiles.length === 0) {
      return NextResponse.json(
        { error: 'Individual profiles are required' },
        { status: 400 }
      );
    }

    // Calculate the organizational OCEAN profile
    const orgProfile = calculateOrganizationalOceanProfile(
      individualProfiles,
      interactionMatrix
    );

    // Prepare data for database insertion
    const profileData = {
      organization_id: organizationId,
      collective_openness: orgProfile.collectiveTraits.openness,
      collective_conscientiousness: orgProfile.collectiveTraits.conscientiousness,
      collective_extraversion: orgProfile.collectiveTraits.extraversion,
      collective_agreeableness: orgProfile.collectiveTraits.agreeableness,
      collective_neuroticism: orgProfile.collectiveTraits.neuroticism,
      openness_diversity: orgProfile.traitDiversity.openness,
      conscientiousness_diversity: orgProfile.traitDiversity.conscientiousness,
      extraversion_diversity: orgProfile.traitDiversity.extraversion,
      agreeableness_diversity: orgProfile.traitDiversity.agreeableness,
      neuroticism_diversity: orgProfile.traitDiversity.neuroticism,
      culture_type: orgProfile.cultureType,
      emergence_factors: orgProfile.emergentProperties,
      health_metrics: orgProfile.healthMetrics,
      sample_size: individualProfiles.length
    };

    // Insert the organizational profile
    const { data: savedProfile, error: saveError } = await context.supabase.
    from('organizational_ocean_profiles').
    insert(profileData).
    select().
    single();

    if (saveError) {
      console.error('Error saving organizational OCEAN profile:', saveError);
      return NextResponse.json(
        { error: 'Failed to save organizational profile' },
        { status: 500 }
      );
    }

    // Generate culture development recommendations
    const recommendations = generateCultureRecommendations(orgProfile);

    // Update existing executive-org fit analyses
    await updateExecutiveOrgFits(context.supabase, organizationId, orgProfile);

    return NextResponse.json({
      profile: savedProfile,
      analysis: orgProfile,
      recommendations
    });

  } catch (error) {
    console.error('Error creating organizational OCEAN profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper functions

function generateOrganizationalInsights(profile, teamAnalyses = [], executiveFits = []) {
  const insights = [];

  // Culture type insight
  insights.push({
    type: 'culture_type',
    title: `Organizational Culture: ${profile.culture_type}`,
    description: getCultureDescription(profile.culture_type),
    metrics: {
      openness: profile.collective_openness,
      conscientiousness: profile.collective_conscientiousness,
      extraversion: profile.collective_extraversion,
      agreeableness: profile.collective_agreeableness,
      stability: 5.0 - profile.collective_neuroticism
    }
  });

  // Health metrics insights
  const healthMetrics = profile.health_metrics || {};
  const psychSafety = parseFloat(healthMetrics.psychologicalSafety || 0);
  const innovation = parseFloat(healthMetrics.innovationClimate || 0);
  const resilience = parseFloat(healthMetrics.resilience || 0);
  const performance = parseFloat(healthMetrics.performanceCulture || 0);

  insights.push({
    type: 'health_metrics',
    title: 'Organizational Health Overview',
    description: 'Key indicators of organizational psychological and performance health',
    metrics: {
      psychologicalSafety: psychSafety,
      innovationClimate: innovation,
      resilience: resilience,
      performanceCulture: performance
    },
    recommendations: generateHealthRecommendations({
      psychSafety,
      innovation,
      resilience,
      performance
    })
  });

  // Emergent properties insight
  const emergentProps = profile.emergence_factors || {};
  insights.push({
    type: 'emergent_properties',
    title: 'Collective Intelligence & Capabilities',
    description: 'Properties that emerge from team interactions beyond individual traits',
    properties: emergentProps
  });

  // Team diversity insight
  const avgDiversity = (
  profile.openness_diversity +
  profile.conscientiousness_diversity +
  profile.extraversion_diversity +
  profile.agreeableness_diversity +
  profile.neuroticism_diversity) /
  5;

  insights.push({
    type: 'diversity_analysis',
    title: 'Personality Diversity Profile',
    description: getDiversityDescription(avgDiversity),
    diversity: {
      average: avgDiversity,
      openness: profile.openness_diversity,
      conscientiousness: profile.conscientiousness_diversity,
      extraversion: profile.extraversion_diversity,
      agreeableness: profile.agreeableness_diversity,
      neuroticism: profile.neuroticism_diversity
    }
  });

  // Executive fit summary
  if (executiveFits.length > 0) {
    const avgFit = executiveFits.reduce((sum, fit) =>
    sum + parseFloat(fit.overall_fit_score || 0), 0
    ) / executiveFits.length;

    insights.push({
      type: 'executive_alignment',
      title: 'Leadership-Culture Alignment',
      description: getAlignmentDescription(avgFit),
      averageFit: avgFit,
      executiveCount: executiveFits.length,
      topFits: executiveFits.slice(0, 3)
    });
  }

  return insights;
}

function generateCultureRecommendations(orgProfile) {
  const recommendations = [];
  const health = orgProfile.healthMetrics;

  // Innovation climate recommendations
  if (health.innovationClimate < 60) {
    recommendations.push({
      area: 'Innovation Climate',
      priority: 'high',
      description: 'Enhance organizational support for innovation and creative thinking',
      initiatives: [
      'Innovation time allocation programs',
      'Cross-functional collaboration initiatives',
      'Idea generation and evaluation processes',
      'Risk tolerance development workshops'],

      targetTraits: ['openness', 'extraversion']
    });
  }

  // Psychological safety recommendations
  if (health.psychologicalSafety < 70) {
    recommendations.push({
      area: 'Psychological Safety',
      priority: 'high',
      description: 'Create environment where team members feel safe to express ideas and concerns',
      initiatives: [
      'Leadership vulnerability training',
      'Conflict resolution skill development',
      'Open communication protocols',
      'Error learning and growth mindset programs'],

      targetTraits: ['agreeableness', 'emotional_stability']
    });
  }

  // Performance culture recommendations
  if (health.performanceCulture < 65) {
    recommendations.push({
      area: 'Performance Excellence',
      priority: 'medium',
      description: 'Strengthen focus on high standards and achievement',
      initiatives: [
      'Goal setting and tracking systems',
      'Performance feedback mechanisms',
      'Recognition and reward programs',
      'Continuous improvement processes'],

      targetTraits: ['conscientiousness', 'extraversion']
    });
  }

  // Diversity optimization
  const traits = orgProfile.collectiveTraits;
  if (traits.openness < 3.0) {
    recommendations.push({
      area: 'Innovation Capacity',
      priority: 'medium',
      description: 'Increase organizational openness to new ideas and approaches',
      initiatives: [
      'Diverse hiring practices',
      'External innovation partnerships',
      'Change management training',
      'Creative problem-solving workshops'],

      targetTraits: ['openness']
    });
  }

  if (traits.agreeableness < 3.2) {
    recommendations.push({
      area: 'Collaboration Enhancement',
      priority: 'medium',
      description: 'Foster more collaborative and supportive team dynamics',
      initiatives: [
      'Team building activities',
      'Collaborative decision-making training',
      'Mentorship programs',
      'Cross-team project assignments'],

      targetTraits: ['agreeableness', 'extraversion']
    });
  }

  return recommendations;
}

async function updateExecutiveOrgFits(supabase, organizationId, orgProfile) {
  try {
    // Get all executives in the organization
    const { data: executives, error } = await supabase.
    from('organization_members').
    select('user_id').
    eq('organization_id', organizationId).
    in('role', ['owner', 'admin', 'manager']);

    if (error || !executives) return;

    // Update fit calculations for each executive
    for (const exec of executives) {
      const { data: execProfile } = await supabase.
      from('executive_ocean_profiles').
      select('*').
      eq('user_id', exec.user_id).
      order('profile_date', { ascending: false }).
      limit(1).
      maybeSingle();

      if (execProfile) {
        // Calculate new fit metrics
        const fitAnalysis = calculateExecutiveOrgFit(
          {
            openness: execProfile.openness,
            conscientiousness: execProfile.conscientiousness,
            extraversion: execProfile.extraversion,
            agreeableness: execProfile.agreeableness,
            neuroticism: execProfile.neuroticism
          },
          orgProfile.collectiveTraits
        );

        // Update or insert fit record
        await supabase.
        from('executive_org_fit').
        upsert({
          executive_id: exec.user_id,
          organization_id: organizationId,
          trait_alignment: fitAnalysis.traitAlignment,
          complementary_fit: fitAnalysis.complementaryFit,
          overall_fit_score: fitAnalysis.overallFitScore,
          recommendations: fitAnalysis.recommendations
        }, {
          onConflict: 'executive_id,organization_id',
          ignoreDuplicates: false
        });
      }
    }
  } catch (error) {
    console.error('Error updating executive-org fits:', error);
  }
}

function getCultureDescription(cultureType) {
  const descriptions = {
    innovation: 'Highly creative and experimental culture that embraces change and new ideas',
    performance: 'Results-driven culture focused on high standards and achievement',
    collaborative: 'Team-oriented culture emphasizing cooperation and shared decision-making',
    adaptive: 'Flexible culture that readily adjusts to changing circumstances and opportunities'
  };
  return descriptions[cultureType] || 'Balanced organizational culture';
}

function getDiversityDescription(avgDiversity) {
  if (avgDiversity > 1.2) {
    return 'High personality diversity providing rich perspective mix but may require more coordination';
  } else if (avgDiversity > 0.8) {
    return 'Optimal personality diversity balancing different perspectives with team cohesion';
  } else if (avgDiversity > 0.5) {
    return 'Moderate personality diversity with good team alignment but limited perspective range';
  } else {
    return 'Low personality diversity indicating strong alignment but potential groupthink risk';
  }
}

function getAlignmentDescription(avgFit) {
  if (avgFit > 0.8) {
    return 'Excellent alignment between leadership and organizational culture';
  } else if (avgFit > 0.6) {
    return 'Good leadership-culture fit with some areas for improvement';
  } else if (avgFit > 0.4) {
    return 'Moderate alignment requiring attention to leadership development or culture change';
  } else {
    return 'Low alignment indicating significant leadership-culture mismatch';
  }
}

function generateHealthRecommendations(metrics) {
  const recommendations = [];

  if (metrics.psychSafety < 70) {
    recommendations.push('Implement psychological safety workshops and open communication training');
  }
  if (metrics.innovation < 60) {
    recommendations.push('Create innovation time and idea-sharing platforms');
  }
  if (metrics.resilience < 65) {
    recommendations.push('Develop organizational resilience through stress management and adaptability training');
  }
  if (metrics.performance < 70) {
    recommendations.push('Strengthen performance culture through goal clarity and recognition systems');
  }

  return recommendations;
}

// Import the calculateExecutiveOrgFit function
function calculateExecutiveOrgFit(executiveProfile, orgProfile) {
  // This would use the actual function from ocean-executive-org-scoring.ts
  // Simplified implementation for this example
  const traitAlignment = {};

  for (const trait of ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']) {
    const difference = Math.abs(executiveProfile[trait] - orgProfile[trait]);
    traitAlignment[trait] = 1 - difference / 5;
  }

  const overallFitScore = Object.values(traitAlignment).reduce((sum, fit) => sum + fit, 0) / 5;

  return {
    traitAlignment,
    complementaryFit: {
      leadershipGapFill: 0.5,
      diversityContribution: 0.6,
      balancePotential: 0.7
    },
    overallFitScore,
    recommendations: ['Develop areas of misalignment', 'Leverage complementary strengths']
  };
}