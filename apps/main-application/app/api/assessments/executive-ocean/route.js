import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateQueryParams, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { api } from "@ioc/shared/data-access";

const { AssessmentService } = api.assessments;

// Schema for executive OCEAN assessment
const createExecutiveOceanSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).default('Executive OCEAN Leadership Assessment'),
  description: z.string().optional(),
  configuration: z.object({
    focusLevel: z.enum(['c-suite', 'senior', 'mid-level', 'emerging']).default('senior'),
    includeLeadershipStyles: z.boolean().default(true),
    includeDecisionMaking: z.boolean().default(true),
    includeTeamDynamics: z.boolean().default(true),
    includeStrategicThinking: z.boolean().default(true),
    industryContext: z.enum(['technology', 'finance', 'healthcare', 'manufacturing', 'retail', 'general']).default('general'),
    benchmarkGroup: z.enum(['fortune500', 'industry-leaders', 'high-growth', 'general-executive']).default('general-executive')
  }).optional(),
  settings: z.object({
    timeLimit: z.number().int().min(0).optional(), // in minutes
    includeCompetencyMapping: z.boolean().default(true),
    generateSuccessionScore: z.boolean().default(true),
    include360Comparison: z.boolean().default(false)
  }).optional()
});

const queryExecutiveOceanSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  focusLevel: z.enum(['c-suite', 'senior', 'mid-level', 'emerging']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

// Executive competency mappings to OCEAN traits
const EXECUTIVE_COMPETENCIES = {
  strategic_vision: {
    title: 'Strategic Vision',
    oceanWeights: { O: 0.5, C: 0.3, E: 0.2 },
    questions: [
    'I can envision long-term possibilities others might miss',
    'I translate complex strategies into actionable plans',
    'I anticipate market trends and industry disruptions']

  },
  decision_making: {
    title: 'Executive Decision Making',
    oceanWeights: { C: 0.4, O: 0.3, N: -0.3 },
    questions: [
    'I make timely decisions even with incomplete information',
    'I balance analytical thinking with intuitive judgment',
    'I take accountability for the outcomes of my decisions']

  },
  people_leadership: {
    title: 'People Leadership',
    oceanWeights: { E: 0.4, A: 0.3, C: 0.3 },
    questions: [
    'I inspire teams to exceed their own expectations',
    'I create psychological safety for innovation and risk-taking',
    'I develop future leaders within my organization']

  },
  change_management: {
    title: 'Change Management',
    oceanWeights: { O: 0.4, E: 0.3, N: -0.3 },
    questions: [
    'I champion transformational initiatives',
    'I help others navigate uncertainty and ambiguity',
    'I maintain momentum through organizational resistance']

  },
  stakeholder_influence: {
    title: 'Stakeholder Influence',
    oceanWeights: { E: 0.5, A: 0.3, O: 0.2 },
    questions: [
    'I build coalitions across diverse stakeholder groups',
    'I effectively communicate vision to boards and investors',
    'I navigate complex political environments']

  },
  resilience_adaptability: {
    title: 'Executive Resilience',
    oceanWeights: { N: -0.5, C: 0.3, O: 0.2 },
    questions: [
    'I maintain composure during organizational crises',
    'I quickly adapt strategies based on new information',
    'I model resilience for my leadership team']

  }
};

// Leadership style mappings
const LEADERSHIP_STYLES = {
  transformational: {
    oceanProfile: { O: 'high', E: 'high', A: 'moderate-high', C: 'moderate', N: 'low' },
    description: 'Inspirational leader who drives change through vision and motivation'
  },
  authentic: {
    oceanProfile: { O: 'moderate-high', E: 'moderate', A: 'high', C: 'high', N: 'low' },
    description: 'Values-driven leader who builds trust through transparency'
  },
  strategic: {
    oceanProfile: { O: 'high', E: 'moderate', A: 'moderate', C: 'high', N: 'low' },
    description: 'Analytical leader focused on long-term planning and execution'
  },
  servant: {
    oceanProfile: { O: 'moderate', E: 'moderate', A: 'high', C: 'moderate-high', N: 'low' },
    description: 'People-first leader who empowers others to succeed'
  },
  adaptive: {
    oceanProfile: { O: 'high', E: 'moderate-high', A: 'moderate', C: 'moderate', N: 'low' },
    description: 'Flexible leader who thrives in dynamic environments'
  }
};

// GET /api/assessments/executive-ocean
export const GET = createProtectedRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, queryExecutiveOceanSchema);
  if (validationError) return validationError;

  try {
    // Build query
    let query = context.supabase.
    from('assessments').
    select(`
        id,
        title,
        status,
        created_at,
        completed_at,
        settings,
        user:users!assessments_user_id_fkey(id, full_name, email, job_title),
        organization:organizations(id, name),
        results:assessment_results(
          id,
          ocean_scores,
          leadership_style,
          competency_scores,
          succession_readiness,
          benchmark_percentiles,
          created_at
        )
      `, { count: 'exact' }).
    eq('type', 'executive_ocean');

    // Apply filters
    if (params.organizationId) {
      query = query.eq('organization_id', params.organizationId);
    }
    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.focusLevel) {
      query = query.eq('settings->>focusLevel', params.focusLevel);
    }

    // Check organization access
    if (params.organizationId) {
      const { error: accessError } = await validateOrganizationAccess(
        context.supabase,
        context.userId,
        params.organizationId,
        ['owner', 'admin', 'member']
      );
      if (accessError) return accessError;
    }

    // Apply pagination
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching executive OCEAN assessments:', error);
      return ErrorResponses.internalError('Failed to fetch assessments');
    }

    // Process results to include executive insights
    const processedData = data.map((assessment) => {
      const result = assessment.results?.[0];
      const executiveSummary = result ? generateExecutiveSummary(result) : null;

      return {
        ...assessment,
        executiveSummary,
        benchmarkComparison: result?.benchmark_percentiles ? {
          overall: result.benchmark_percentiles.overall || 'N/A',
          byCompetency: result.benchmark_percentiles.competencies || {},
          peerGroup: assessment.settings?.benchmarkGroup || 'general-executive'
        } : null
      };
    });

    return NextResponse.json({
      assessments: processedData,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count,
        pages: Math.ceil(count / params.limit)
      }
    });

  } catch (error) {
    console.error('Error in executive OCEAN GET:', error);
    return ErrorResponses.internalError('Failed to retrieve assessments');
  }
});

// POST /api/assessments/executive-ocean
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createExecutiveOceanSchema);
  if (validationError) return validationError;

  // Validate organization access
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    body.organizationId,
    ['owner', 'admin']
  );
  if (accessError) return accessError;

  try {
    const config = body.configuration || {};
    const settings = body.settings || {};

    // Generate executive-focused OCEAN questions
    const questions = generateExecutiveOceanQuestions(config);

    // Create assessment data
    const assessmentData = {
      title: body.title,
      type: 'executive_ocean',
      organizationId: body.organizationId,
      description: body.description || `Executive leadership assessment tailored for ${config.focusLevel || 'senior'} level leaders`,
      questions,
      settings: {
        ...settings,
        ...config,
        assessmentType: 'executive_ocean',
        scoring: {
          method: 'executive_weighted',
          includeCompetencyMapping: settings.includeCompetencyMapping,
          generateSuccessionScore: settings.generateSuccessionScore,
          benchmarkGroup: config.benchmarkGroup
        }
      },
      metadata: {
        version: '2.0',
        questionCount: questions.length,
        estimatedDuration: Math.ceil(questions.length * 0.75), // 45 seconds per question for executives
        competenciesCovered: Object.keys(EXECUTIVE_COMPETENCIES),
        focusLevel: config.focusLevel,
        industryContext: config.industryContext
      }
    };

    // If userId is provided, create with assignment
    if (body.userId) {
      // Verify user is in executive role (optional check)
      const { data: userProfile } = await context.supabase.
      from('users').
      select('job_title, seniority_level').
      eq('id', body.userId).
      single();

      assessmentData.assignments = [{
        userId: body.userId,
        dueDate: null,
        customInstructions: `This executive assessment has been tailored for ${config.focusLevel} leadership level. Please complete thoughtfully, considering your leadership experiences and challenges.`
      }];

      // Add user context to metadata
      assessmentData.metadata.userContext = {
        jobTitle: userProfile?.job_title,
        seniorityLevel: userProfile?.seniority_level
      };
    }

    // Create the assessment
    const assessmentService = new AssessmentService(context.supabase);
    const assessment = await assessmentService.createAssessment(assessmentData, context.userId);

    // If 360 comparison is requested, set up the framework
    if (settings.include360Comparison && body.userId) {
      await setup360Framework(context.supabase, assessment.id, body.userId, body.organizationId);
    }

    // Log analytics event
    await context.supabase.from('analytics_events').insert({
      organization_id: body.organizationId,
      user_id: context.userId,
      event_type: 'executive_ocean_assessment_created',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessment.id,
        focus_level: config.focusLevel,
        industry_context: config.industryContext,
        question_count: questions.length,
        include_360: settings.include360Comparison
      }
    });

    return NextResponse.json({
      assessment,
      summary: {
        id: assessment.id,
        title: body.title,
        type: 'executive_ocean',
        focusLevel: config.focusLevel,
        questionCount: questions.length,
        competencies: Object.keys(EXECUTIVE_COMPETENCIES),
        estimatedDuration: assessmentData.metadata.estimatedDuration,
        features: {
          leadershipStyles: config.includeLeadershipStyles,
          competencyMapping: settings.includeCompetencyMapping,
          successionScoring: settings.generateSuccessionScore,
          '360Comparison': settings.include360Comparison
        }
      },
      message: 'Executive OCEAN assessment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating executive OCEAN assessment:', error);
    return ErrorResponses.internalError('Failed to create assessment');
  }
});

// Helper functions

function generateExecutiveOceanQuestions(config) {
  const questions = [];
  let questionId = 1;

  // Core OCEAN questions with executive context
  const executiveOceanQuestions = {
    openness: [
    'I actively seek diverse perspectives when making strategic decisions',
    'I encourage experimentation and calculated risk-taking in my organization',
    'I challenge traditional industry assumptions and practices',
    'I invest time in understanding emerging technologies and trends',
    'I create space for creative problem-solving in leadership meetings'],

    conscientiousness: [
    'I establish clear accountability structures across my organization',
    'I follow through on commitments to stakeholders and board members',
    'I maintain disciplined focus on strategic priorities',
    'I ensure robust governance and compliance frameworks',
    'I model excellence in execution for my leadership team'],

    extraversion: [
    'I energize large groups through compelling vision communication',
    'I build strong networks across industries and sectors',
    'I actively engage with media and public speaking opportunities',
    'I create high-energy environments that drive performance',
    'I seek out challenging conversations with stakeholders'],

    agreeableness: [
    'I balance stakeholder interests in complex decisions',
    'I build trust through transparent communication',
    'I mentor and develop high-potential leaders',
    'I create collaborative relationships with competitors when beneficial',
    'I prioritize employee wellbeing alongside business results'],

    neuroticism: [
    'I remain composed during organizational crises',
    'I manage stress without it affecting my team',
    'I make decisions confidently despite uncertainty',
    'I maintain optimism during challenging market conditions',
    'I demonstrate emotional stability in high-pressure situations']

  };

  // Add core OCEAN questions
  Object.entries(executiveOceanQuestions).forEach(([trait, traitQuestions]) => {
    traitQuestions.forEach((question, index) => {
      questions.push({
        id: `ocean_${trait}_${index + 1}`,
        type: 'likert',
        text: question,
        trait: trait.charAt(0).toUpperCase(),
        category: 'ocean_core',
        required: true,
        options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }],

        scoring: {
          trait: trait.charAt(0).toUpperCase(),
          weight: 1.2, // Higher weight for executive context
          reverse: trait === 'neuroticism' // Reverse score neuroticism items
        }
      });
    });
  });

  // Add competency-specific questions
  if (config.includeLeadershipStyles || config.includeDecisionMaking || config.includeTeamDynamics || config.includeStrategicThinking) {
    Object.entries(EXECUTIVE_COMPETENCIES).forEach(([competency, details]) => {
      // Check if this competency should be included
      if (
      competency === 'decision_making' && !config.includeDecisionMaking ||
      competency === 'people_leadership' && !config.includeTeamDynamics ||
      competency === 'strategic_vision' && !config.includeStrategicThinking)
      {
        return;
      }

      details.questions.forEach((question, index) => {
        questions.push({
          id: `comp_${competency}_${index + 1}`,
          type: 'likert',
          text: question,
          competency,
          category: 'executive_competency',
          required: true,
          options: [
          { value: 1, label: 'Rarely Demonstrate' },
          { value: 2, label: 'Sometimes Demonstrate' },
          { value: 3, label: 'Often Demonstrate' },
          { value: 4, label: 'Consistently Demonstrate' },
          { value: 5, label: 'Exemplify' }],

          scoring: {
            competency,
            oceanWeights: details.oceanWeights,
            weight: 1.0
          }
        });
      });
    });
  }

  // Add situational judgment questions for executives
  if (config.focusLevel === 'c-suite' || config.focusLevel === 'senior') {
    questions.push(
      {
        id: 'situation_board_conflict',
        type: 'select',
        text: 'When facing disagreement from your board on a strategic initiative you believe is critical, you:',
        category: 'situational_judgment',
        required: true,
        options: [
        { value: 'data', label: 'Present additional data and analysis to support your position' },
        { value: 'coalition', label: 'Build coalition with key board members individually' },
        { value: 'compromise', label: 'Seek middle ground that addresses board concerns' },
        { value: 'defer', label: 'Defer to board wisdom and adjust the strategy' },
        { value: 'escalate', label: 'Engage external advisors to mediate the discussion' }],

        scoring: {
          mapping: {
            data: { C: 0.4, O: 0.3 },
            coalition: { E: 0.4, A: 0.3 },
            compromise: { A: 0.5, C: 0.2 },
            defer: { A: 0.4, N: 0.3 },
            escalate: { O: 0.3, E: 0.3 }
          }
        }
      },
      {
        id: 'situation_crisis_response',
        type: 'select',
        text: 'During a major organizational crisis affecting reputation and operations, your first priority is:',
        category: 'situational_judgment',
        required: true,
        options: [
        { value: 'team', label: 'Gather leadership team for immediate action planning' },
        { value: 'communicate', label: 'Craft transparent communication to all stakeholders' },
        { value: 'analyze', label: 'Deep dive into root cause analysis' },
        { value: 'contain', label: 'Focus on immediate damage containment' },
        { value: 'reassure', label: 'Personally reassure key customers and investors' }],

        scoring: {
          mapping: {
            team: { E: 0.4, C: 0.3 },
            communicate: { A: 0.4, E: 0.3 },
            analyze: { C: 0.5, O: 0.2 },
            contain: { C: 0.4, N: -0.3 },
            reassure: { E: 0.4, A: 0.3 }
          }
        }
      }
    );
  }

  // Add industry-specific questions if not general
  if (config.industryContext !== 'general') {
    const industryQuestions = getIndustrySpecificQuestions(config.industryContext);
    questions.push(...industryQuestions);
  }

  return questions;
}

function getIndustrySpecificQuestions(industry) {
  const industryQuestions = {
    technology: [
    {
      id: 'tech_innovation',
      type: 'likert',
      text: 'I drive digital transformation initiatives across the organization',
      category: 'industry_specific',
      industry: 'technology'
    }],

    finance: [
    {
      id: 'finance_risk',
      type: 'likert',
      text: 'I balance risk management with growth opportunities effectively',
      category: 'industry_specific',
      industry: 'finance'
    }],

    healthcare: [
    {
      id: 'healthcare_patient',
      type: 'likert',
      text: 'I prioritize patient outcomes while managing operational efficiency',
      category: 'industry_specific',
      industry: 'healthcare'
    }]

  };

  return (industryQuestions[industry] || []).map((q) => ({
    ...q,
    required: true,
    options: [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' }],

    scoring: {
      industry: q.industry,
      weight: 0.8
    }
  }));
}

function generateExecutiveSummary(result) {
  const { ocean_scores, leadership_style, competency_scores, succession_readiness } = result;

  // Determine primary leadership style
  const primaryStyle = leadership_style?.primary || determineLeadershipStyle(ocean_scores);

  // Calculate overall executive effectiveness
  const effectiveness = calculateExecutiveEffectiveness(ocean_scores, competency_scores);

  // Identify development priorities
  const developmentAreas = identifyDevelopmentAreas(ocean_scores, competency_scores);

  return {
    leadershipProfile: {
      primaryStyle,
      styleDescription: LEADERSHIP_STYLES[primaryStyle]?.description || 'Executive leadership style',
      effectiveness: Math.round(effectiveness * 100) / 100,
      strengthCompetencies: getTopCompetencies(competency_scores, 3),
      developmentAreas
    },
    successionReadiness: {
      score: succession_readiness?.score || calculateSuccessionScore(ocean_scores, competency_scores),
      readinessLevel: getReadinessLevel(succession_readiness?.score || 0),
      gaps: succession_readiness?.gaps || []
    },
    executiveInsights: generateExecutiveInsights(ocean_scores, competency_scores)
  };
}

function determineLeadershipStyle(oceanScores) {
  if (!oceanScores) return 'adaptive';

  let bestMatch = 'adaptive';
  let bestScore = 0;

  Object.entries(LEADERSHIP_STYLES).forEach(([style, profile]) => {
    let matchScore = 0;
    Object.entries(profile.oceanProfile).forEach(([trait, expected]) => {
      const score = oceanScores[trait] || 50;
      if (expected === 'high' && score > 70) matchScore += 1;else
      if (expected === 'moderate-high' && score > 60) matchScore += 1;else
      if (expected === 'moderate' && score >= 40 && score <= 60) matchScore += 1;else
      if (expected === 'low' && score < 40) matchScore += 1;
    });

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = style;
    }
  });

  return bestMatch;
}

function calculateExecutiveEffectiveness(oceanScores, competencyScores) {
  const weights = {
    ocean: 0.4,
    competency: 0.6
  };

  const oceanAvg = oceanScores ? Object.values(oceanScores).reduce((a, b) => a + b, 0) / Object.values(oceanScores).length : 50;
  const competencyAvg = competencyScores ? Object.values(competencyScores).reduce((a, b) => a + b, 0) / Object.values(competencyScores).length : 50;

  return (oceanAvg * weights.ocean + competencyAvg * weights.competency) / 100;
}

function identifyDevelopmentAreas(oceanScores, competencyScores) {
  const areas = [];

  // Check OCEAN traits
  if (oceanScores) {
    Object.entries(oceanScores).forEach(([trait, score]) => {
      if (score < 40) {
        areas.push({
          type: 'trait',
          area: trait,
          score,
          priority: 'high'
        });
      } else if (score < 50) {
        areas.push({
          type: 'trait',
          area: trait,
          score,
          priority: 'medium'
        });
      }
    });
  }

  // Check competencies
  if (competencyScores) {
    Object.entries(competencyScores).forEach(([competency, score]) => {
      if (score < 60) {
        areas.push({
          type: 'competency',
          area: competency,
          score,
          priority: score < 50 ? 'high' : 'medium'
        });
      }
    });
  }

  return areas.sort((a, b) => a.score - b.score).slice(0, 3);
}

function getTopCompetencies(competencyScores, count = 3) {
  if (!competencyScores) return [];

  return Object.entries(competencyScores).
  sort(([, a], [, b]) => b - a).
  slice(0, count).
  map(([competency, score]) => ({
    competency,
    score,
    title: EXECUTIVE_COMPETENCIES[competency]?.title || competency
  }));
}

function calculateSuccessionScore(oceanScores, competencyScores) {
  // Simplified succession scoring
  const executiveEffectiveness = calculateExecutiveEffectiveness(oceanScores, competencyScores);
  const adaptabilityScore = oceanScores?.O || 50;
  const stabilityScore = 100 - (oceanScores?.N || 50);

  return (executiveEffectiveness * 0.5 + adaptabilityScore * 0.25 + stabilityScore * 0.25) / 100;
}

function getReadinessLevel(score) {
  if (score >= 0.8) return 'ready-now';
  if (score >= 0.65) return 'ready-1-year';
  if (score >= 0.5) return 'ready-2-years';
  return 'development-needed';
}

function generateExecutiveInsights(oceanScores, competencyScores) {
  const insights = [];

  // Strategic thinking insight
  if (oceanScores?.O > 70 && competencyScores?.strategic_vision > 70) {
    insights.push({
      type: 'strength',
      area: 'strategic_innovation',
      message: 'Exceptional strategic thinking combined with openness to innovation positions this leader well for transformational initiatives.'
    });
  }

  // Execution risk
  if (oceanScores?.C < 50) {
    insights.push({
      type: 'risk',
      area: 'execution',
      message: 'Lower conscientiousness scores may impact consistent execution. Consider structured accountability systems.'
    });
  }

  // Leadership presence
  if (oceanScores?.E > 70 && competencyScores?.stakeholder_influence > 70) {
    insights.push({
      type: 'strength',
      area: 'leadership_presence',
      message: 'Strong extraversion and stakeholder influence create compelling executive presence.'
    });
  }

  return insights;
}

async function setup360Framework(supabase, assessmentId, userId, organizationId) {
  // Create 360 feedback request framework
  try {
    await supabase.from('360_feedback_requests').insert({
      assessment_id: assessmentId,
      subject_user_id: userId,
      organization_id: organizationId,
      status: 'pending',
      rater_categories: ['direct_reports', 'peers', 'managers', 'stakeholders'],
      requested_raters: 0,
      completed_raters: 0
    });
  } catch (error) {
    console.error('Error setting up 360 framework:', error);
    // Non-critical error, continue
  }
}

/**
 * @swagger
 * /api/assessments/executive-ocean:
 *   get:
 *     summary: List executive OCEAN assessments
 *     tags: [Assessments, Executive, OCEAN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: focusLevel
 *         schema:
 *           type: string
 *           enum: [c-suite, senior, mid-level, emerging]
 *     responses:
 *       200:
 *         description: List of executive OCEAN assessments
 *   
 *   post:
 *     summary: Create executive OCEAN assessment
 *     tags: [Assessments, Executive, OCEAN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *               configuration:
 *                 type: object
 *                 properties:
 *                   focusLevel:
 *                     type: string
 *                     enum: [c-suite, senior, mid-level, emerging]
 *                   industryContext:
 *                     type: string
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */