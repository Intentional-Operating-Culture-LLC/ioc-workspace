import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateQueryParams, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { api } from "@ioc/shared/data-access";

const { AssessmentService } = api.assessments;

// Schema for full OCEAN assessment
const createOceanFullSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).default('Comprehensive OCEAN Personality Assessment'),
  description: z.string().optional(),
  configuration: z.object({
    assessmentVersion: z.enum(['standard', 'research', 'clinical']).default('standard'),
    itemCount: z.enum(['120', '240', '300']).default('240'), // NEO-PI-R standard
    includeFacets: z.boolean().default(true),
    includeValidity: z.boolean().default(true),
    includeStyleScales: z.boolean().default(false),
    normGroup: z.enum(['general', 'college', 'adult', 'clinical', 'professional']).default('adult'),
    language: z.enum(['en', 'es', 'fr', 'de', 'zh']).default('en'),
    adaptiveTesting: z.boolean().default(false)
  }).optional(),
  settings: z.object({
    timeLimit: z.number().int().min(0).optional(), // 0 = unlimited
    forcedChoice: z.boolean().default(false),
    allowSkip: z.boolean().default(false),
    showProgress: z.boolean().default(true),
    randomizeItems: z.boolean().default(true),
    includeAttentionChecks: z.boolean().default(true)
  }).optional()
});

const queryOceanFullSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  version: z.enum(['standard', 'research', 'clinical']).optional(),
  hasResults: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

// Full OCEAN facet definitions
const OCEAN_FACETS = {
  O: {
    name: 'Openness to Experience',
    facets: {
      O1: { name: 'Fantasy', description: 'Imaginative and creative thinking' },
      O2: { name: 'Aesthetics', description: 'Appreciation for art and beauty' },
      O3: { name: 'Feelings', description: 'Receptivity to inner feelings' },
      O4: { name: 'Actions', description: 'Willingness to try new activities' },
      O5: { name: 'Ideas', description: 'Intellectual curiosity' },
      O6: { name: 'Values', description: 'Readiness to reexamine values' }
    }
  },
  C: {
    name: 'Conscientiousness',
    facets: {
      C1: { name: 'Competence', description: 'Belief in one\'s efficacy' },
      C2: { name: 'Order', description: 'Personal organization' },
      C3: { name: 'Dutifulness', description: 'Adherence to ethical principles' },
      C4: { name: 'Achievement Striving', description: 'Ambition and motivation' },
      C5: { name: 'Self-Discipline', description: 'Ability to complete tasks' },
      C6: { name: 'Deliberation', description: 'Tendency to think before acting' }
    }
  },
  E: {
    name: 'Extraversion',
    facets: {
      E1: { name: 'Warmth', description: 'Interest in and friendliness toward others' },
      E2: { name: 'Gregariousness', description: 'Preference for company' },
      E3: { name: 'Assertiveness', description: 'Social dominance and confidence' },
      E4: { name: 'Activity', description: 'Pace of living and energy level' },
      E5: { name: 'Excitement-Seeking', description: 'Need for stimulation' },
      E6: { name: 'Positive Emotions', description: 'Tendency to experience joy' }
    }
  },
  A: {
    name: 'Agreeableness',
    facets: {
      A1: { name: 'Trust', description: 'Belief in others\' sincerity' },
      A2: { name: 'Straightforwardness', description: 'Frankness and sincerity' },
      A3: { name: 'Altruism', description: 'Active concern for others' },
      A4: { name: 'Compliance', description: 'Response to interpersonal conflict' },
      A5: { name: 'Modesty', description: 'Tendency to downplay achievements' },
      A6: { name: 'Tender-Mindedness', description: 'Sympathy for others' }
    }
  },
  N: {
    name: 'Neuroticism',
    facets: {
      N1: { name: 'Anxiety', description: 'Level of anxiety and tension' },
      N2: { name: 'Angry Hostility', description: 'Tendency to experience anger' },
      N3: { name: 'Depression', description: 'Tendency to feel sad and discouraged' },
      N4: { name: 'Self-Consciousness', description: 'Sensitivity to ridicule' },
      N5: { name: 'Impulsiveness', description: 'Inability to control cravings' },
      N6: { name: 'Vulnerability', description: 'Ability to cope with stress' }
    }
  }
};

// Validity scales for full assessment
const VALIDITY_SCALES = {
  acquiescence: {
    name: 'Acquiescence',
    description: 'Tendency to agree with statements',
    threshold: 0.7
  },
  infrequency: {
    name: 'Infrequency',
    description: 'Endorsement of unlikely statements',
    threshold: 3
  },
  socialDesirability: {
    name: 'Social Desirability',
    description: 'Tendency to present oneself favorably',
    threshold: 0.8
  }
};

// GET /api/assessments/ocean-full
export const GET = createProtectedRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, queryOceanFullSchema);
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
        user:users!assessments_user_id_fkey(id, full_name, email),
        organization:organizations(id, name),
        results:assessment_results(
          id,
          ocean_scores,
          facet_scores,
          validity_indicators,
          norm_percentiles,
          interpretation_text,
          created_at
        )
      `, { count: 'exact' }).
    eq('type', 'ocean_full');

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
    if (params.version) {
      query = query.eq('settings->>assessmentVersion', params.version);
    }
    if (params.hasResults !== undefined) {
      if (params.hasResults) {
        query = query.not('results', 'is', null);
      } else {
        query = query.is('results', null);
      }
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
      console.error('Error fetching OCEAN full assessments:', error);
      return ErrorResponses.internalError('Failed to fetch assessments');
    }

    // Process results to include comprehensive analysis
    const processedData = data.map((assessment) => {
      const result = assessment.results?.[0];
      if (!result) return assessment;

      const analysis = generateComprehensiveOceanAnalysis(result);
      return {
        ...assessment,
        analysis,
        validity: result.validity_indicators ? {
          isValid: checkValidityStatus(result.validity_indicators),
          flags: getValidityFlags(result.validity_indicators)
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
    console.error('Error in OCEAN full GET:', error);
    return ErrorResponses.internalError('Failed to retrieve assessments');
  }
});

// POST /api/assessments/ocean-full
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createOceanFullSchema);
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

    // Generate comprehensive OCEAN questions
    const questions = generateFullOceanQuestions(config);

    // Add validity check items if enabled
    if (config.includeValidity) {
      const validityItems = generateValidityCheckItems();
      questions.push(...validityItems);
    }

    // Create assessment data
    const assessmentData = {
      title: body.title,
      type: 'ocean_full',
      organizationId: body.organizationId,
      description: body.description || `Comprehensive ${config.itemCount}-item OCEAN personality assessment based on the Five-Factor Model`,
      questions,
      settings: {
        ...settings,
        ...config,
        assessmentType: 'ocean_full',
        scoring: {
          method: 'ipsative_and_normative',
          normGroup: config.normGroup,
          includeConfidenceIntervals: true,
          generateTextInterpretation: true
        }
      },
      metadata: {
        version: '3.0',
        itemCount: questions.length,
        theoreticalBasis: 'Five-Factor Model (Costa & McCrae)',
        estimatedDuration: Math.ceil(questions.length * 0.5), // 30 seconds per item
        facetsCovered: Object.values(OCEAN_FACETS).flatMap((trait) => Object.keys(trait.facets)),
        validityScales: config.includeValidity ? Object.keys(VALIDITY_SCALES) : []
      }
    };

    // If userId is provided, create with assignment
    if (body.userId) {
      assessmentData.assignments = [{
        userId: body.userId,
        dueDate: null,
        customInstructions: `This is a comprehensive personality assessment. Please answer all questions honestly and thoughtfully. There are no right or wrong answers. The assessment will take approximately ${assessmentData.metadata.estimatedDuration} minutes to complete.`
      }];
    }

    // Create the assessment
    const assessmentService = new AssessmentService(context.supabase);
    const assessment = await assessmentService.createAssessment(assessmentData, context.userId);

    // Set up research tracking if research version
    if (config.assessmentVersion === 'research') {
      await setupResearchTracking(context.supabase, assessment.id, body.organizationId);
    }

    // Log analytics event
    await context.supabase.from('analytics_events').insert({
      organization_id: body.organizationId,
      user_id: context.userId,
      event_type: 'ocean_full_assessment_created',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessment.id,
        version: config.assessmentVersion,
        item_count: config.itemCount,
        norm_group: config.normGroup,
        include_validity: config.includeValidity
      }
    });

    return NextResponse.json({
      assessment,
      summary: {
        id: assessment.id,
        title: body.title,
        type: 'ocean_full',
        version: config.assessmentVersion,
        itemCount: questions.length,
        traits: Object.keys(OCEAN_FACETS),
        facets: Object.values(OCEAN_FACETS).flatMap((trait) => Object.keys(trait.facets)).length,
        estimatedDuration: assessmentData.metadata.estimatedDuration,
        features: {
          validity: config.includeValidity,
          facets: config.includeFacets,
          adaptive: config.adaptiveTesting,
          normComparison: true,
          textInterpretation: true
        }
      },
      message: 'Comprehensive OCEAN assessment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating OCEAN full assessment:', error);
    return ErrorResponses.internalError('Failed to create assessment');
  }
});

// Helper functions

function generateFullOceanQuestions(config) {
  const questions = [];
  const itemsPerFacet = Math.floor(parseInt(config.itemCount) / 30); // 30 facets total

  // Generate questions for each trait and facet
  Object.entries(OCEAN_FACETS).forEach(([trait, traitInfo]) => {
    Object.entries(traitInfo.facets).forEach(([facetCode, facetInfo]) => {
      // Generate items for this facet
      for (let i = 0; i < itemsPerFacet; i++) {
        const isReverse = Math.random() > 0.5; // 50% reverse-scored items
        questions.push(generateFacetItem(trait, facetCode, facetInfo, i, isReverse));
      }
    });
  });

  // Add style scales if requested
  if (config.includeStyleScales) {
    questions.push(...generateStyleScaleItems());
  }

  // Randomize if requested
  if (config.settings?.randomizeItems) {
    shuffleArray(questions);
  }

  return questions;
}

function generateFacetItem(trait, facetCode, facetInfo, index, isReverse) {
  // This would connect to a comprehensive item bank in production
  // For now, generating structured items
  const itemTemplates = {
    O1: [
    'I have a vivid imagination',
    'I enjoy daydreaming and fantasizing',
    'I prefer realistic to imaginative ideas'],

    C1: [
    'I feel confident in my abilities',
    'I complete tasks successfully',
    'I doubt my abilities'],

    E1: [
    'I make friends easily',
    'I feel comfortable around people',
    'I prefer to keep people at a distance'],

    A1: [
    'I believe that others have good intentions',
    'I trust what people say',
    'I am suspicious of others\' motives'],

    N1: [
    'I worry about things',
    'I get stressed out easily',
    'I rarely feel anxious']

  };

  const templates = itemTemplates[facetCode] || [`I demonstrate ${facetInfo.name.toLowerCase()}`];
  const template = templates[index % templates.length];

  return {
    id: `${facetCode}_${index + 1}`,
    type: 'likert',
    text: isReverse && !template.includes('rarely') && !template.includes('doubt') && !template.includes('suspicious') ?
    template.replace('I ', 'I rarely ').replace('have', 'have').replace('am', 'am not') :
    template,
    trait,
    facet: facetCode,
    required: true,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }],

    scoring: {
      trait,
      facet: facetCode,
      weight: 1.0,
      reverse: isReverse
    }
  };
}

function generateValidityCheckItems() {
  return [
  {
    id: 'validity_infreq_1',
    type: 'likert',
    text: 'I have never felt sad in my entire life',
    category: 'validity',
    scale: 'infrequency',
    required: true,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }]

  },
  {
    id: 'validity_social_1',
    type: 'likert',
    text: 'I always tell the truth',
    category: 'validity',
    scale: 'socialDesirability',
    required: true,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }]

  },
  {
    id: 'validity_attention_1',
    type: 'likert',
    text: 'Please select "Moderately Accurate" for this item',
    category: 'validity',
    scale: 'attention',
    required: true,
    expectedValue: 4,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }]

  }];

}

function generateStyleScaleItems() {
  return [
  {
    id: 'style_pace_1',
    type: 'likert',
    text: 'I prefer to work at a steady, moderate pace',
    category: 'style',
    scale: 'pace',
    required: true,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }]

  },
  {
    id: 'style_thinking_1',
    type: 'likert',
    text: 'I prefer concrete facts to abstract theories',
    category: 'style',
    scale: 'thinking',
    required: true,
    options: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Moderately Inaccurate' },
    { value: 3, label: 'Neither Accurate nor Inaccurate' },
    { value: 4, label: 'Moderately Accurate' },
    { value: 5, label: 'Very Accurate' }]

  }];

}

function generateComprehensiveOceanAnalysis(result) {
  const { ocean_scores, facet_scores, norm_percentiles } = result;

  return {
    profile: generatePersonalityProfile(ocean_scores, facet_scores),
    strengths: identifyStrengths(ocean_scores, facet_scores),
    growthAreas: identifyGrowthAreas(ocean_scores, facet_scores),
    interpersonalStyle: deriveInterpersonalStyle(ocean_scores),
    workStyle: deriveWorkStyle(ocean_scores, facet_scores),
    stressResponse: predictStressResponse(ocean_scores, facet_scores),
    normComparison: analyzeNormComparison(norm_percentiles)
  };
}

function generatePersonalityProfile(oceanScores, facetScores) {
  const profiles = [];

  Object.entries(oceanScores).forEach(([trait, score]) => {
    let level;
    if (score >= 70) level = 'Very High';else
    if (score >= 60) level = 'High';else
    if (score >= 40) level = 'Average';else
    if (score >= 30) level = 'Low';else
    level = 'Very Low';

    profiles.push({
      trait,
      score,
      level,
      description: getTraitDescription(trait, level),
      facetPattern: analyzeFacetPattern(trait, facetScores)
    });
  });

  return profiles;
}

function getTraitDescription(trait, level) {
  const descriptions = {
    O: {
      'Very High': 'Exceptionally open to new experiences, highly creative and imaginative',
      'High': 'Open-minded, curious, and appreciative of novelty',
      'Average': 'Balanced between tradition and innovation',
      'Low': 'Practical, conventional, and focused on concrete matters',
      'Very Low': 'Strongly prefers familiar routines and traditional approaches'
    },
    C: {
      'Very High': 'Extremely organized, disciplined, and achievement-oriented',
      'High': 'Reliable, hardworking, and goal-directed',
      'Average': 'Moderately organized with flexible approach to tasks',
      'Low': 'Spontaneous, flexible, and less concerned with order',
      'Very Low': 'Very spontaneous, may struggle with structure and deadlines'
    },
    E: {
      'Very High': 'Highly energetic, very socially active, and seeks excitement',
      'High': 'Outgoing, enthusiastic, and enjoys social interaction',
      'Average': 'Balanced between social and solitary activities',
      'Low': 'Reserved, prefers smaller groups or solitary activities',
      'Very Low': 'Very introverted, strongly prefers solitude'
    },
    A: {
      'Very High': 'Extremely cooperative, trusting, and helpful',
      'High': 'Compassionate, cooperative, and considerate',
      'Average': 'Balanced between cooperation and competition',
      'Low': 'Skeptical, competitive, and direct',
      'Very Low': 'Very competitive, skeptical, and confrontational'
    },
    N: {
      'Very High': 'Experiences intense emotional reactions and stress',
      'High': 'Emotionally reactive and prone to stress',
      'Average': 'Typical emotional responses and stress levels',
      'Low': 'Emotionally stable and resilient',
      'Very Low': 'Exceptionally calm and emotionally stable'
    }
  };

  return descriptions[trait]?.[level] || `${level} ${trait}`;
}

function analyzeFacetPattern(trait, facetScores) {
  const traitFacets = Object.entries(facetScores).
  filter(([facet]) => facet.startsWith(trait)).
  map(([facet, score]) => ({ facet, score })).
  sort((a, b) => b.score - a.score);

  return {
    highest: traitFacets[0],
    lowest: traitFacets[traitFacets.length - 1],
    variability: calculateVariability(traitFacets.map((f) => f.score))
  };
}

function calculateVariability(scores) {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

function identifyStrengths(oceanScores, facetScores) {
  const strengths = [];

  // Trait-based strengths
  Object.entries(oceanScores).forEach(([trait, score]) => {
    if (score >= 65) {
      strengths.push({
        type: 'trait',
        trait,
        score,
        implication: getStrengthImplication(trait, score)
      });
    }
  });

  // Facet-based strengths
  Object.entries(facetScores).forEach(([facet, score]) => {
    if (score >= 70) {
      const trait = facet[0];
      const facetInfo = OCEAN_FACETS[trait]?.facets[facet];
      if (facetInfo) {
        strengths.push({
          type: 'facet',
          facet,
          name: facetInfo.name,
          score,
          implication: `Strong ${facetInfo.name}: ${facetInfo.description}`
        });
      }
    }
  });

  return strengths.sort((a, b) => b.score - a.score).slice(0, 5);
}

function getStrengthImplication(trait, score) {
  const implications = {
    O: 'Creative problem-solving and innovative thinking',
    C: 'Strong execution and reliability',
    E: 'Leadership presence and team energization',
    A: 'Team collaboration and trust-building',
    N: 'Emotional awareness and empathy' // Reframe for high N
  };

  return implications[trait] || `High ${trait}`;
}

function identifyGrowthAreas(oceanScores, facetScores) {
  const growthAreas = [];

  // Check for extreme scores that might be problematic
  Object.entries(oceanScores).forEach(([trait, score]) => {
    if (score <= 35 || score >= 85) {
      growthAreas.push({
        trait,
        score,
        issue: score <= 35 ? 'low' : 'extreme',
        recommendation: getGrowthRecommendation(trait, score)
      });
    }
  });

  // Check for facet imbalances
  Object.keys(OCEAN_FACETS).forEach((trait) => {
    const traitFacets = Object.entries(facetScores).
    filter(([facet]) => facet.startsWith(trait)).
    map(([, score]) => score);

    const variability = calculateVariability(traitFacets);
    if (variability > 20) {
      growthAreas.push({
        trait,
        issue: 'imbalance',
        variability,
        recommendation: `Work on balancing different aspects of ${OCEAN_FACETS[trait].name}`
      });
    }
  });

  return growthAreas;
}

function getGrowthRecommendation(trait, score) {
  if (score <= 35) {
    const recommendations = {
      O: 'Consider exploring new perspectives and creative activities',
      C: 'Develop organizational systems and goal-setting practices',
      E: 'Practice social skills and seek energizing activities',
      A: 'Work on empathy and collaborative approaches',
      N: 'Build stress management and emotional regulation skills'
    };
    return recommendations[trait];
  } else {
    const recommendations = {
      O: 'Balance innovation with practical implementation',
      C: 'Allow for flexibility and spontaneity',
      E: 'Create space for reflection and deep work',
      A: 'Practice assertiveness and boundary-setting',
      N: 'Develop coping strategies for emotional intensity'
    };
    return recommendations[trait];
  }
}

function deriveInterpersonalStyle(oceanScores) {
  const { E, A, N } = oceanScores;

  let style = '';
  if (E >= 60 && A >= 60) style = 'Warm and Engaging';else
  if (E >= 60 && A < 40) style = 'Assertive and Direct';else
  if (E < 40 && A >= 60) style = 'Supportive and Reserved';else
  if (E < 40 && A < 40) style = 'Independent and Task-Focused';else
  style = 'Balanced and Adaptive';

  return {
    style,
    communication: E >= 50 ? 'Expressive and verbal' : 'Thoughtful and written',
    conflictApproach: A >= 50 ? 'Collaborative' : 'Competitive',
    emotionalExpression: N >= 50 ? 'Open and expressive' : 'Controlled and stable'
  };
}

function deriveWorkStyle(oceanScores, facetScores) {
  const { O, C, E } = oceanScores;

  return {
    preferredEnvironment: E >= 50 ? 'Collaborative and dynamic' : 'Quiet and focused',
    workApproach: C >= 50 ? 'Structured and planned' : 'Flexible and adaptive',
    innovationStyle: O >= 50 ? 'Creative and experimental' : 'Practical and proven',
    leadershipStyle: determineLeadershipStyle(oceanScores),
    teamRole: determineTeamRole(oceanScores, facetScores)
  };
}

function determineLeadershipStyle(oceanScores) {
  const { O, C, E, A, N } = oceanScores;

  if (E >= 60 && O >= 60) return 'Visionary';
  if (C >= 60 && A >= 60) return 'Servant Leader';
  if (C >= 60 && E >= 60) return 'Executive';
  if (A >= 60 && N <= 40) return 'Coach';
  return 'Situational';
}

function determineTeamRole(oceanScores, facetScores) {
  const roles = [];

  if (oceanScores.O >= 60) roles.push('Innovator');
  if (oceanScores.C >= 60) roles.push('Implementer');
  if (oceanScores.E >= 60) roles.push('Coordinator');
  if (oceanScores.A >= 60) roles.push('Team Builder');
  if (facetScores.C6 >= 60) roles.push('Quality Assurer');

  return roles.length > 0 ? roles : ['Flexible Contributor'];
}

function predictStressResponse(oceanScores, facetScores) {
  const { N, C, E } = oceanScores;

  return {
    stressReactivity: N >= 50 ? 'High' : 'Low',
    copingStyle: C >= 50 ? 'Problem-focused' : 'Emotion-focused',
    socialSupport: E >= 50 ? 'Seeks support actively' : 'Prefers self-reliance',
    resilience: (100 - N + C) / 2,
    vulnerabilities: identifyStressVulnerabilities(facetScores)
  };
}

function identifyStressVulnerabilities(facetScores) {
  const vulnerabilities = [];

  if (facetScores.N1 >= 65) vulnerabilities.push('Anxiety');
  if (facetScores.N3 >= 65) vulnerabilities.push('Depression');
  if (facetScores.N5 >= 65) vulnerabilities.push('Impulsivity');
  if (facetScores.C5 <= 35) vulnerabilities.push('Procrastination');

  return vulnerabilities;
}

function analyzeNormComparison(normPercentiles) {
  if (!normPercentiles) return null;

  const analysis = {
    overallPosition: 'average',
    notableDeviations: [],
    strengthsVsPeers: [],
    areasVsPeers: []
  };

  Object.entries(normPercentiles).forEach(([trait, percentile]) => {
    if (percentile >= 85) {
      analysis.strengthsVsPeers.push({ trait, percentile });
      analysis.notableDeviations.push(`Very high ${trait} (top ${100 - percentile}%)`);
    } else if (percentile <= 15) {
      analysis.areasVsPeers.push({ trait, percentile });
      analysis.notableDeviations.push(`Very low ${trait} (bottom ${percentile}%)`);
    }
  });

  const avgPercentile = Object.values(normPercentiles).reduce((a, b) => a + b, 0) / Object.values(normPercentiles).length;
  if (avgPercentile >= 70) analysis.overallPosition = 'above average';else
  if (avgPercentile <= 30) analysis.overallPosition = 'below average';

  return analysis;
}

function checkValidityStatus(validityIndicators) {
  if (!validityIndicators) return true;

  const { acquiescence, infrequency, socialDesirability, attentionChecks } = validityIndicators;

  if (acquiescence > VALIDITY_SCALES.acquiescence.threshold) return false;
  if (infrequency > VALIDITY_SCALES.infrequency.threshold) return false;
  if (socialDesirability > VALIDITY_SCALES.socialDesirability.threshold) return false;
  if (attentionChecks?.failed > 0) return false;

  return true;
}

function getValidityFlags(validityIndicators) {
  const flags = [];

  if (validityIndicators.acquiescence > VALIDITY_SCALES.acquiescence.threshold) {
    flags.push('High acquiescence - may be agreeing indiscriminately');
  }
  if (validityIndicators.infrequency > VALIDITY_SCALES.infrequency.threshold) {
    flags.push('Infrequent responses - possible random responding');
  }
  if (validityIndicators.socialDesirability > VALIDITY_SCALES.socialDesirability.threshold) {
    flags.push('High social desirability - may be presenting overly favorable image');
  }

  return flags;
}

async function setupResearchTracking(supabase, assessmentId, organizationId) {
  try {
    await supabase.from('research_assessments').insert({
      assessment_id: assessmentId,
      organization_id: organizationId,
      research_protocol: 'ocean_validation_v3',
      consent_obtained: false,
      irb_approved: false
    });
  } catch (error) {
    console.error('Error setting up research tracking:', error);
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * @swagger
 * /api/assessments/ocean-full:
 *   get:
 *     summary: List comprehensive OCEAN assessments
 *     tags: [Assessments, OCEAN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *           enum: [standard, research, clinical]
 *       - in: query
 *         name: hasResults
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of OCEAN assessments with comprehensive analysis
 *   
 *   post:
 *     summary: Create comprehensive OCEAN assessment
 *     tags: [Assessments, OCEAN]
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
 *                   assessmentVersion:
 *                     type: string
 *                     enum: [standard, research, clinical]
 *                   itemCount:
 *                     type: string
 *                     enum: ['120', '240', '300']
 *                   normGroup:
 *                     type: string
 *                     enum: [general, college, adult, clinical, professional]
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */