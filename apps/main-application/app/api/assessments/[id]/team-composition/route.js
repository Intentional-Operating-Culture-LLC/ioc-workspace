import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/team-composition - Analyze team composition based on OCEAN profiles
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const includeRecommendations = searchParams.get('includeRecommendations') !== 'false';

  try {
    // Get assessment details
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('organization_id, user_id').
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
      ['owner', 'admin', 'member']
    );

    if (accessError) return accessError;

    // Get the subject's OCEAN profile
    const { data: subjectResults } = await context.supabase.
    from('assessment_results').
    select('ocean_scores, facet_scores').
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (!subjectResults) {
      return ErrorResponses.notFound('No results found for this assessment');
    }

    // Get team members' OCEAN profiles
    let teamProfiles;
    if (teamId) {
      teamProfiles = await getTeamProfiles(context.supabase, teamId, assessment.user_id);
    } else {
      // Get colleagues from the same organization
      teamProfiles = await getOrganizationProfiles(
        context.supabase,
        assessment.organization_id,
        assessment.user_id
      );
    }

    // Analyze team composition
    const teamAnalysis = analyzeTeamComposition(
      subjectResults,
      teamProfiles,
      assessment.user_id
    );

    // Generate recommendations if requested
    let recommendations = null;
    if (includeRecommendations) {
      recommendations = generateTeamRecommendations(teamAnalysis);
    }

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        userId: assessment.user_id
      },
      teamComposition: teamAnalysis,
      recommendations,
      metadata: {
        teamSize: teamProfiles.length + 1, // Including the subject
        analysisDate: new Date().toISOString(),
        teamId: teamId || 'organization'
      }
    });

  } catch (error) {
    console.error('Error analyzing team composition:', error);
    return ErrorResponses.internalError('Failed to analyze team composition');
  }
});

// Helper functions

async function getTeamProfiles(supabase, teamId, excludeUserId) {
  const { data: teamMembers } = await supabase.
  from('team_members').
  select('user_id').
  eq('team_id', teamId).
  neq('user_id', excludeUserId);

  if (!teamMembers || teamMembers.length === 0) return [];

  const userIds = teamMembers.map((tm) => tm.user_id);

  const { data: profiles } = await supabase.
  from('assessment_results').
  select(`
      user_id,
      ocean_scores,
      assessment:assessments!inner(type),
      user:users!inner(full_name, job_title)
    `).
  in('user_id', userIds).
  eq('assessment.type', 'ocean_full').
  order('created_at', { ascending: false });

  // Get the latest profile for each user
  const latestProfiles = {};
  profiles?.forEach((profile) => {
    if (!latestProfiles[profile.user_id]) {
      latestProfiles[profile.user_id] = {
        userId: profile.user_id,
        name: profile.user.full_name,
        role: profile.user.job_title,
        oceanScores: profile.ocean_scores
      };
    }
  });

  return Object.values(latestProfiles);
}

async function getOrganizationProfiles(supabase, organizationId, excludeUserId) {
  // Get recent assessments from the organization
  const { data: profiles } = await supabase.
  from('assessment_results').
  select(`
      user_id,
      ocean_scores,
      assessment:assessments!inner(organization_id, type),
      user:users!inner(full_name, job_title)
    `).
  eq('assessment.organization_id', organizationId).
  eq('assessment.type', 'ocean_full').
  neq('user_id', excludeUserId).
  order('created_at', { ascending: false }).
  limit(20); // Limit to prevent large datasets

  // Get unique users with their latest profiles
  const uniqueProfiles = {};
  profiles?.forEach((profile) => {
    if (!uniqueProfiles[profile.user_id]) {
      uniqueProfiles[profile.user_id] = {
        userId: profile.user_id,
        name: profile.user.full_name,
        role: profile.user.job_title,
        oceanScores: profile.ocean_scores
      };
    }
  });

  return Object.values(uniqueProfiles);
}

function analyzeTeamComposition(subjectResults, teamProfiles, subjectId) {
  const analysis = {
    subject: {
      userId: subjectId,
      oceanScores: subjectResults.ocean_scores,
      profile: determinePersonalityProfile(subjectResults.ocean_scores)
    },
    teamMembers: [],
    teamDynamics: {
      balance: {},
      diversity: {},
      gaps: [],
      strengths: [],
      risks: []
    },
    roleRecommendations: [],
    collaborationInsights: []
  };

  // Add subject to team for overall analysis
  const allProfiles = [
  { oceanScores: subjectResults.ocean_scores, isSubject: true },
  ...teamProfiles.map((p) => ({ ...p, isSubject: false }))];


  // Analyze each team member
  teamProfiles.forEach((member) => {
    const compatibility = analyzeCompatibility(
      subjectResults.ocean_scores,
      member.oceanScores
    );

    analysis.teamMembers.push({
      ...member,
      profile: determinePersonalityProfile(member.oceanScores),
      compatibilityWithSubject: compatibility,
      complementaryTraits: identifyComplementaryTraits(
        subjectResults.ocean_scores,
        member.oceanScores
      )
    });
  });

  // Analyze overall team dynamics
  analysis.teamDynamics = analyzeOverallDynamics(allProfiles);

  // Generate role recommendations
  analysis.roleRecommendations = generateRoleRecommendations(
    subjectResults.ocean_scores,
    analysis.teamDynamics
  );

  // Generate collaboration insights
  analysis.collaborationInsights = generateCollaborationInsights(
    subjectResults.ocean_scores,
    teamProfiles
  );

  return analysis;
}

function determinePersonalityProfile(oceanScores) {
  const profiles = [
  {
    type: 'Innovator',
    criteria: { O: 65 },
    description: 'Creative and open to new ideas'
  },
  {
    type: 'Executor',
    criteria: { C: 65 },
    description: 'Organized and results-driven'
  },
  {
    type: 'Energizer',
    criteria: { E: 65 },
    description: 'Outgoing and team motivator'
  },
  {
    type: 'Harmonizer',
    criteria: { A: 65 },
    description: 'Collaborative and supportive'
  },
  {
    type: 'Stabilizer',
    criteria: { N: 35 }, // Low neuroticism
    description: 'Calm and emotionally stable'
  }];


  const matchingProfiles = [];

  profiles.forEach((profile) => {
    let matches = true;
    Object.entries(profile.criteria).forEach(([trait, threshold]) => {
      if (trait === 'N') {
        if (oceanScores[trait] > threshold) matches = false;
      } else {
        if (oceanScores[trait] < threshold) matches = false;
      }
    });

    if (matches) {
      matchingProfiles.push(profile);
    }
  });

  // Return primary profile or balanced
  if (matchingProfiles.length > 0) {
    return {
      primary: matchingProfiles[0].type,
      secondary: matchingProfiles[1]?.type,
      description: matchingProfiles[0].description
    };
  }

  return {
    primary: 'Balanced',
    description: 'Well-rounded personality profile'
  };
}

function analyzeCompatibility(scores1, scores2) {
  const compatibility = {
    overall: 0,
    byTrait: {},
    workingStyle: '',
    potentialConflicts: [],
    synergies: []
  };

  let totalCompatibility = 0;
  const traits = ['O', 'C', 'E', 'A', 'N'];

  traits.forEach((trait) => {
    const diff = Math.abs(scores1[trait] - scores2[trait]);
    const traitCompatibility = 100 - diff;

    compatibility.byTrait[trait] = {
      score: traitCompatibility,
      difference: diff,
      interpretation: interpretTraitCompatibility(trait, diff, scores1[trait], scores2[trait])
    };

    totalCompatibility += traitCompatibility;

    // Identify potential conflicts
    if (diff > 40) {
      compatibility.potentialConflicts.push({
        trait,
        issue: getConflictIssue(trait, scores1[trait], scores2[trait])
      });
    }

    // Identify synergies
    if (diff < 20 && scores1[trait] >= 60 && scores2[trait] >= 60) {
      compatibility.synergies.push({
        trait,
        benefit: getSynergyBenefit(trait)
      });
    }
  });

  compatibility.overall = Math.round(totalCompatibility / traits.length);

  // Determine working style compatibility
  compatibility.workingStyle = determineWorkingStyleCompatibility(scores1, scores2);

  return compatibility;
}

function interpretTraitCompatibility(trait, difference, score1, score2) {
  if (difference < 15) return 'Highly compatible - similar perspectives';
  if (difference < 30) return 'Compatible - complementary differences';
  if (difference < 45) return 'Moderate compatibility - requires understanding';
  return 'Low compatibility - significant differences to bridge';
}

function getConflictIssue(trait, score1, score2) {
  const issues = {
    O: score1 > score2 ? 'Innovator vs traditionalist clash' : 'Practical vs theoretical disconnect',
    C: score1 > score2 ? 'Structured vs flexible approach conflict' : 'Different organizational standards',
    E: score1 > score2 ? 'Social energy mismatch' : 'Communication style differences',
    A: score1 > score2 ? 'Cooperation vs competition tension' : 'Trust and skepticism gap',
    N: score1 > score2 ? 'Emotional expression differences' : 'Stress response mismatch'
  };

  return issues[trait];
}

function getSynergyBenefit(trait) {
  const benefits = {
    O: 'Shared creativity and innovation',
    C: 'Mutual commitment to excellence',
    E: 'Energetic collaboration',
    A: 'Strong team cohesion',
    N: 'Emotional stability (if both low)'
  };

  return benefits[trait];
}

function identifyComplementaryTraits(scores1, scores2) {
  const complementary = [];

  // Look for beneficial differences
  if (scores1.O < 40 && scores2.O > 60) {
    complementary.push({
      trait: 'O',
      benefit: 'Balances innovation with practicality'
    });
  }

  if (scores1.C < 40 && scores2.C > 60) {
    complementary.push({
      trait: 'C',
      benefit: 'Combines flexibility with structure'
    });
  }

  if (scores1.E < 40 && scores2.E > 60) {
    complementary.push({
      trait: 'E',
      benefit: 'Balances reflection with action'
    });
  }

  return complementary;
}

function analyzeOverallDynamics(allProfiles) {
  const dynamics = {
    balance: {},
    diversity: {},
    gaps: [],
    strengths: [],
    risks: []
  };

  // Calculate team averages and diversity
  const traits = ['O', 'C', 'E', 'A', 'N'];

  traits.forEach((trait) => {
    const scores = allProfiles.map((p) => p.oceanScores[trait]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = calculateStandardDeviation(scores);

    dynamics.balance[trait] = {
      average: Math.round(avg),
      stdDev: Math.round(stdDev),
      range: Math.max(...scores) - Math.min(...scores),
      distribution: categorizeDistribution(scores)
    };

    dynamics.diversity[trait] = {
      level: stdDev > 20 ? 'high' : stdDev > 10 ? 'moderate' : 'low',
      interpretation: interpretDiversity(trait, stdDev)
    };

    // Identify gaps
    if (avg < 40) {
      dynamics.gaps.push({
        trait,
        severity: 'high',
        description: `Team lacks ${getTraitName(trait)}`,
        impact: getGapImpact(trait)
      });
    }

    // Identify strengths
    if (avg > 65) {
      dynamics.strengths.push({
        trait,
        description: `Strong team ${getTraitName(trait)}`,
        leverage: getStrengthLeverage(trait)
      });
    }
  });

  // Identify team risks
  dynamics.risks = identifyTeamRisks(dynamics.balance, dynamics.diversity);

  return dynamics;
}

function calculateStandardDeviation(numbers) {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  return Math.sqrt(variance);
}

function categorizeDistribution(scores) {
  const high = scores.filter((s) => s >= 65).length;
  const low = scores.filter((s) => s <= 35).length;
  const medium = scores.length - high - low;

  if (high > scores.length * 0.6) return 'skewed-high';
  if (low > scores.length * 0.6) return 'skewed-low';
  if (medium > scores.length * 0.6) return 'clustered-middle';
  return 'distributed';
}

function interpretDiversity(trait, stdDev) {
  if (stdDev > 20) {
    return `High diversity in ${getTraitName(trait)} - leverage different perspectives`;
  } else if (stdDev < 10) {
    return `Low diversity in ${getTraitName(trait)} - may lead to groupthink`;
  }
  return `Moderate diversity in ${getTraitName(trait)} - balanced team`;
}

function getGapImpact(trait) {
  const impacts = {
    O: 'May struggle with innovation and adaptation',
    C: 'Risk of poor execution and missed deadlines',
    E: 'Low team energy and external engagement',
    A: 'Potential for conflict and poor collaboration',
    N: 'Team may be too emotionally reactive'
  };

  return impacts[trait];
}

function getStrengthLeverage(trait) {
  const leverage = {
    O: 'Excel at innovation and creative problem-solving',
    C: 'Strong execution and project delivery',
    E: 'High energy and excellent external relationships',
    A: 'Exceptional collaboration and team harmony',
    N: 'High emotional awareness (reframe if high N)'
  };

  return leverage[trait];
}

function identifyTeamRisks(balance, diversity) {
  const risks = [];

  // Check for extreme homogeneity
  const homogeneousTraits = Object.entries(diversity).
  filter(([, d]) => d.level === 'low').
  map(([trait]) => trait);

  if (homogeneousTraits.length >= 3) {
    risks.push({
      type: 'homogeneity',
      severity: 'high',
      description: 'Team lacks cognitive diversity',
      mitigation: 'Consider adding team members with different profiles'
    });
  }

  // Check for missing critical traits
  if (balance.C.average < 45 && balance.O.average < 45) {
    risks.push({
      type: 'execution_innovation_gap',
      severity: 'high',
      description: 'Team lacks both execution and innovation capabilities',
      mitigation: 'Critical need for balanced team members'
    });
  }

  // Check for potential conflict
  if (diversity.A.level === 'high' && balance.A.average < 50) {
    risks.push({
      type: 'conflict_potential',
      severity: 'medium',
      description: 'Wide range in agreeableness may lead to conflicts',
      mitigation: 'Establish clear collaboration norms'
    });
  }

  return risks;
}

function generateRoleRecommendations(subjectScores, teamDynamics) {
  const recommendations = [];

  // Based on individual strengths
  if (subjectScores.O >= 70) {
    recommendations.push({
      role: 'Innovation Lead',
      rationale: 'High openness makes you ideal for driving innovation',
      teamBenefit: 'Brings creative solutions to the team'
    });
  }

  if (subjectScores.C >= 70) {
    recommendations.push({
      role: 'Project Manager',
      rationale: 'High conscientiousness ensures strong execution',
      teamBenefit: 'Keeps team organized and on track'
    });
  }

  if (subjectScores.E >= 70) {
    recommendations.push({
      role: 'Team Spokesperson',
      rationale: 'High extraversion for external representation',
      teamBenefit: 'Energizes team and builds relationships'
    });
  }

  // Based on team gaps
  Object.entries(teamDynamics.balance).forEach(([trait, balance]) => {
    if (balance.average < 50 && subjectScores[trait] > 60) {
      recommendations.push({
        role: `${getTraitName(trait)} Champion`,
        rationale: `Your ${getTraitName(trait)} fills a team gap`,
        teamBenefit: `Provides needed ${getTraitName(trait)} to the team`
      });
    }
  });

  return recommendations;
}

function generateCollaborationInsights(subjectScores, teamProfiles) {
  const insights = [];

  // Communication style insight
  const avgExtraversion = teamProfiles.reduce((sum, p) => sum + p.oceanScores.E, 0) / teamProfiles.length;

  if (subjectScores.E > avgExtraversion + 20) {
    insights.push({
      area: 'Communication',
      insight: 'You are more extraverted than the team average',
      recommendation: 'Allow space for quieter team members to contribute'
    });
  } else if (subjectScores.E < avgExtraversion - 20) {
    insights.push({
      area: 'Communication',
      insight: 'You are more introverted than the team average',
      recommendation: 'Prepare thoughts in advance and speak up in meetings'
    });
  }

  // Working style insight
  const avgConscientiousness = teamProfiles.reduce((sum, p) => sum + p.oceanScores.C, 0) / teamProfiles.length;

  if (Math.abs(subjectScores.C - avgConscientiousness) > 20) {
    insights.push({
      area: 'Working Style',
      insight: subjectScores.C > avgConscientiousness ?
      'You prefer more structure than the team average' :
      'You prefer more flexibility than the team average',
      recommendation: 'Communicate your working preferences clearly'
    });
  }

  // Conflict resolution insight
  if (subjectScores.A < 40) {
    insights.push({
      area: 'Conflict Resolution',
      insight: 'Your direct style may clash with high-agreeableness team members',
      recommendation: 'Practice diplomatic communication'
    });
  }

  // Stress management insight
  if (subjectScores.N > 60) {
    const teamAvgN = teamProfiles.reduce((sum, p) => sum + p.oceanScores.N, 0) / teamProfiles.length;
    if (teamAvgN < 40) {
      insights.push({
        area: 'Stress Management',
        insight: 'You may experience stress differently than your team',
        recommendation: 'Communicate your needs and seek support when needed'
      });
    }
  }

  return insights;
}

function generateTeamRecommendations(analysis) {
  const recommendations = {
    composition: [],
    dynamics: [],
    development: [],
    recruitment: []
  };

  // Composition recommendations
  if (analysis.teamDynamics.gaps.length > 0) {
    recommendations.composition.push({
      priority: 'high',
      title: 'Address Team Gaps',
      description: `Team lacks ${analysis.teamDynamics.gaps.map((g) => getTraitName(g.trait)).join(', ')}`,
      actions: [
      'Recruit team members with these traits',
      'Develop these capabilities in existing team',
      'Partner with others who have these strengths']

    });
  }

  // Dynamics recommendations
  if (analysis.teamDynamics.risks.some((r) => r.type === 'homogeneity')) {
    recommendations.dynamics.push({
      priority: 'high',
      title: 'Increase Cognitive Diversity',
      description: 'Team lacks diverse perspectives',
      actions: [
      'Actively seek different viewpoints',
      'Use structured devil\'s advocate processes',
      'Rotate team roles to develop range']

    });
  }

  // Development recommendations
  const lowTraits = Object.entries(analysis.teamDynamics.balance).
  filter(([, balance]) => balance.average < 45).
  map(([trait]) => trait);

  if (lowTraits.length > 0) {
    recommendations.development.push({
      priority: 'medium',
      title: 'Team Development Focus',
      description: `Develop team capabilities in ${lowTraits.map((t) => getTraitName(t)).join(', ')}`,
      actions: [
      'Team workshops on these areas',
      'Cross-training and mentoring',
      'External training programs']

    });
  }

  // Recruitment recommendations
  const idealProfiles = determineIdealRecruitmentProfiles(analysis.teamDynamics);
  if (idealProfiles.length > 0) {
    recommendations.recruitment.push({
      priority: 'medium',
      title: 'Strategic Recruitment',
      description: 'Add team members with specific profiles',
      profiles: idealProfiles
    });
  }

  return recommendations;
}

function determineIdealRecruitmentProfiles(teamDynamics) {
  const profiles = [];

  // Check for specific needs
  if (teamDynamics.balance.O.average < 45 && teamDynamics.balance.C.average > 65) {
    profiles.push({
      type: 'Creative Disruptor',
      traits: { O: 'high', C: 'moderate' },
      value: 'Brings innovation to execution-focused team'
    });
  }

  if (teamDynamics.balance.E.average < 45) {
    profiles.push({
      type: 'Team Energizer',
      traits: { E: 'high', A: 'high' },
      value: 'Adds energy and external focus'
    });
  }

  if (teamDynamics.diversity.C.level === 'low' && teamDynamics.balance.C.average > 50) {
    profiles.push({
      type: 'Flexible Innovator',
      traits: { C: 'low-moderate', O: 'high' },
      value: 'Balances team rigidity with adaptability'
    });
  }

  return profiles;
}

function getTraitName(trait) {
  const names = {
    O: 'Openness',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Neuroticism'
  };
  return names[trait] || trait;
}

function determineWorkingStyleCompatibility(scores1, scores2) {
  const style1 = categorizeWorkingStyle(scores1);
  const style2 = categorizeWorkingStyle(scores2);

  if (style1 === style2) return 'Highly compatible - similar working styles';

  const compatibility = {
    'structured-flexible': 'Complementary - balance structure with adaptability',
    'social-independent': 'Different but manageable - respect work preferences',
    'innovative-traditional': 'Creative tension - can drive better solutions'
  };

  const key = [style1, style2].sort().join('-');
  return compatibility[key] || 'Different styles - requires mutual understanding';
}

function categorizeWorkingStyle(scores) {
  if (scores.C >= 65 && scores.O < 50) return 'structured';
  if (scores.C < 50 && scores.O >= 65) return 'flexible';
  if (scores.E >= 65 && scores.A >= 65) return 'social';
  if (scores.E < 50) return 'independent';
  if (scores.O >= 65) return 'innovative';
  if (scores.O < 40) return 'traditional';
  return 'balanced';
}

/**
 * @swagger
 * /api/assessments/{id}/team-composition:
 *   get:
 *     summary: Analyze team composition based on OCEAN profiles
 *     description: Provides team dynamics analysis and recommendations
 *     tags: [Assessments, Team Analysis, Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Specific team ID (optional)
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Team composition analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teamComposition:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: object
 *                     teamMembers:
 *                       type: array
 *                     teamDynamics:
 *                       type: object
 *                     collaborationInsights:
 *                       type: array
 *                 recommendations:
 *                   type: object
 */