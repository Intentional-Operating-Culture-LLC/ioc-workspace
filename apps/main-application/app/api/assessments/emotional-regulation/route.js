import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateQueryParams, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { api } from "@ioc/shared/data-access";

const { AssessmentService } = api.assessments;

// Schema for emotional regulation assessment
const createEmotionalRegulationSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(), // Target user for assessment
  title: z.string().min(1).max(255).default('Emotional Regulation Assessment'),
  description: z.string().optional(),
  configuration: z.object({
    assessmentDepth: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
    includeStrategies: z.boolean().default(true),
    includeTriggers: z.boolean().default(true),
    includeContextual: z.boolean().default(true),
    focusAreas: z.array(z.enum([
    'anxiety_management',
    'anger_control',
    'stress_resilience',
    'emotional_awareness',
    'impulse_control',
    'mood_regulation',
    'interpersonal_regulation',
    'cognitive_reappraisal']
    )).optional()
  }).optional(),
  settings: z.object({
    timeLimit: z.number().int().min(0).optional(),
    allowPause: z.boolean().default(true),
    provideFeedback: z.boolean().default(true),
    includeExercises: z.boolean().default(false)
  }).optional()
});

const queryEmotionalRegulationSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

// Emotional regulation question templates
const EMOTIONAL_REGULATION_DIMENSIONS = {
  awareness: {
    title: 'Emotional Awareness',
    description: 'Ability to recognize and understand emotions',
    questions: [
    {
      text: 'I am aware of my emotions as they arise',
      dimension: 'awareness',
      subdimension: 'recognition'
    },
    {
      text: 'I can identify what triggers specific emotions in me',
      dimension: 'awareness',
      subdimension: 'triggers'
    },
    {
      text: 'I notice physical sensations associated with my emotions',
      dimension: 'awareness',
      subdimension: 'somatic'
    }]

  },
  acceptance: {
    title: 'Emotional Acceptance',
    description: 'Ability to accept emotions without judgment',
    questions: [
    {
      text: 'I allow myself to feel emotions without trying to suppress them',
      dimension: 'acceptance',
      subdimension: 'non-suppression'
    },
    {
      text: 'I accept that negative emotions are a normal part of life',
      dimension: 'acceptance',
      subdimension: 'normalization'
    }]

  },
  strategies: {
    title: 'Regulation Strategies',
    description: 'Techniques used to manage emotions',
    questions: [
    {
      text: 'I use breathing techniques to calm myself when upset',
      dimension: 'strategies',
      subdimension: 'physiological'
    },
    {
      text: 'I reframe negative situations to see them more positively',
      dimension: 'strategies',
      subdimension: 'cognitive'
    },
    {
      text: 'I engage in physical activity to manage stress',
      dimension: 'strategies',
      subdimension: 'behavioral'
    }]

  },
  expression: {
    title: 'Emotional Expression',
    description: 'Appropriate expression of emotions',
    questions: [
    {
      text: 'I express my emotions in ways that are appropriate to the situation',
      dimension: 'expression',
      subdimension: 'appropriateness'
    },
    {
      text: 'I can communicate my feelings clearly to others',
      dimension: 'expression',
      subdimension: 'communication'
    }]

  },
  resilience: {
    title: 'Emotional Resilience',
    description: 'Ability to recover from emotional distress',
    questions: [
    {
      text: 'I bounce back quickly from emotional setbacks',
      dimension: 'resilience',
      subdimension: 'recovery'
    },
    {
      text: 'I maintain emotional balance during stressful periods',
      dimension: 'resilience',
      subdimension: 'stability'
    }]

  }
};

// GET /api/assessments/emotional-regulation
export const GET = createProtectedRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, queryEmotionalRegulationSchema);
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
          dimension_scores,
          strategy_effectiveness,
          risk_areas,
          created_at
        )
      `, { count: 'exact' }).
    eq('type', 'emotional_regulation');

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
    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }
    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo);
    }

    // Check organization access if filtering by org
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
      console.error('Error fetching emotional regulation assessments:', error);
      return ErrorResponses.internalError('Failed to fetch assessments');
    }

    // Process results to include summary statistics
    const processedData = data.map((assessment) => ({
      ...assessment,
      summary: assessment.results?.[0] ? {
        overallScore: calculateOverallEmotionalRegulationScore(assessment.results[0].dimension_scores),
        riskLevel: determineEmotionalRiskLevel(assessment.results[0].risk_areas),
        topStrategies: getTopStrategies(assessment.results[0].strategy_effectiveness),
        completedAt: assessment.results[0].created_at
      } : null
    }));

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
    console.error('Error in emotional regulation GET:', error);
    return ErrorResponses.internalError('Failed to retrieve assessments');
  }
});

// POST /api/assessments/emotional-regulation
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createEmotionalRegulationSchema);
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

    // Generate emotional regulation questions
    const questions = generateEmotionalRegulationQuestions(config);

    // Create assessment data
    const assessmentData = {
      title: body.title,
      type: 'emotional_regulation',
      organizationId: body.organizationId,
      description: body.description || 'Comprehensive emotional regulation assessment measuring awareness, strategies, and resilience',
      questions,
      settings: {
        ...settings,
        assessmentType: 'emotional_regulation',
        configuration: config,
        scoring: {
          method: 'dimensional',
          dimensions: Object.keys(EMOTIONAL_REGULATION_DIMENSIONS)
        }
      },
      metadata: {
        version: '1.0',
        questionCount: questions.length,
        estimatedDuration: Math.ceil(questions.length * 0.5), // 30 seconds per question
        dimensionsCovered: Object.keys(EMOTIONAL_REGULATION_DIMENSIONS)
      }
    };

    // If userId is provided, create with assignment
    if (body.userId) {
      assessmentData.assignments = [{
        userId: body.userId,
        dueDate: null,
        customInstructions: 'Please complete this emotional regulation assessment at your earliest convenience.'
      }];
    }

    // Create the assessment
    const assessmentService = new AssessmentService(context.supabase);
    const assessment = await assessmentService.createAssessment(assessmentData, context.userId);

    // Log analytics event
    await context.supabase.from('analytics_events').insert({
      organization_id: body.organizationId,
      user_id: context.userId,
      event_type: 'emotional_regulation_assessment_created',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessment.id,
        configuration: config,
        question_count: questions.length,
        target_user: body.userId
      }
    });

    return NextResponse.json({
      assessment,
      summary: {
        id: assessment.id,
        title: body.title,
        questionCount: questions.length,
        dimensions: Object.keys(EMOTIONAL_REGULATION_DIMENSIONS),
        estimatedDuration: assessmentData.metadata.estimatedDuration,
        configuration: config
      },
      message: 'Emotional regulation assessment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating emotional regulation assessment:', error);
    return ErrorResponses.internalError('Failed to create assessment');
  }
});

// Helper functions

function generateEmotionalRegulationQuestions(config) {
  const questions = [];
  const depth = config.assessmentDepth || 'standard';
  const focusAreas = config.focusAreas || Object.keys(EMOTIONAL_REGULATION_DIMENSIONS);

  // Question counts based on depth
  const questionCounts = {
    basic: 3,
    standard: 5,
    comprehensive: 8
  };

  const questionsPerDimension = questionCounts[depth];

  // Generate questions for each dimension
  Object.entries(EMOTIONAL_REGULATION_DIMENSIONS).forEach(([key, dimension]) => {
    // Skip if not in focus areas
    if (!focusAreas.includes(key) && config.focusAreas) return;

    // Add dimension questions
    const dimensionQuestions = dimension.questions.slice(0, questionsPerDimension);

    dimensionQuestions.forEach((q, index) => {
      questions.push({
        id: `${key}_${index + 1}`,
        type: 'likert',
        text: q.text,
        dimension: q.dimension,
        subdimension: q.subdimension,
        required: true,
        options: [
        { value: 1, label: 'Never' },
        { value: 2, label: 'Rarely' },
        { value: 3, label: 'Sometimes' },
        { value: 4, label: 'Often' },
        { value: 5, label: 'Always' }],

        scoring: {
          dimension: q.dimension,
          weight: 1.0,
          reverse: false
        }
      });
    });

    // Add strategy questions if enabled
    if (config.includeStrategies && key === 'strategies') {
      questions.push({
        id: `strategy_effectiveness`,
        type: 'multiselect',
        text: 'Which emotional regulation strategies do you find most effective?',
        required: false,
        options: [
        { value: 'breathing', label: 'Deep breathing' },
        { value: 'mindfulness', label: 'Mindfulness meditation' },
        { value: 'reframing', label: 'Cognitive reframing' },
        { value: 'exercise', label: 'Physical exercise' },
        { value: 'social_support', label: 'Seeking social support' },
        { value: 'journaling', label: 'Journaling' },
        { value: 'distraction', label: 'Healthy distraction' },
        { value: 'progressive_relaxation', label: 'Progressive muscle relaxation' }]

      });
    }

    // Add trigger questions if enabled
    if (config.includeTriggers && key === 'awareness') {
      questions.push({
        id: 'emotional_triggers',
        type: 'text',
        text: 'Describe situations that typically trigger strong emotional responses for you',
        required: false,
        maxLength: 500
      });
    }
  });

  // Add contextual questions if enabled
  if (config.includeContextual) {
    questions.push(
      {
        id: 'work_regulation',
        type: 'likert',
        text: 'I effectively manage my emotions in professional settings',
        dimension: 'contextual',
        subdimension: 'work',
        required: true,
        options: [
        { value: 1, label: 'Never' },
        { value: 2, label: 'Rarely' },
        { value: 3, label: 'Sometimes' },
        { value: 4, label: 'Often' },
        { value: 5, label: 'Always' }]

      },
      {
        id: 'relationship_regulation',
        type: 'likert',
        text: 'I maintain emotional balance in personal relationships',
        dimension: 'contextual',
        subdimension: 'relationships',
        required: true,
        options: [
        { value: 1, label: 'Never' },
        { value: 2, label: 'Rarely' },
        { value: 3, label: 'Sometimes' },
        { value: 4, label: 'Often' },
        { value: 5, label: 'Always' }]

      }
    );
  }

  return questions;
}

function calculateOverallEmotionalRegulationScore(dimensionScores) {
  if (!dimensionScores || typeof dimensionScores !== 'object') return 0;

  const scores = Object.values(dimensionScores);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length * 100) / 100;
}

function determineEmotionalRiskLevel(riskAreas) {
  if (!riskAreas || !Array.isArray(riskAreas)) return 'low';

  if (riskAreas.length === 0) return 'low';
  if (riskAreas.length <= 2) return 'moderate';
  if (riskAreas.length <= 4) return 'elevated';
  return 'high';
}

function getTopStrategies(strategyEffectiveness) {
  if (!strategyEffectiveness || typeof strategyEffectiveness !== 'object') return [];

  return Object.entries(strategyEffectiveness).
  sort(([, a], [, b]) => b - a).
  slice(0, 3).
  map(([strategy]) => strategy);
}

/**
 * @swagger
 * /api/assessments/emotional-regulation:
 *   get:
 *     summary: List emotional regulation assessments
 *     tags: [Assessments, Emotional Regulation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *     responses:
 *       200:
 *         description: List of emotional regulation assessments
 *   
 *   post:
 *     summary: Create emotional regulation assessment
 *     tags: [Assessments, Emotional Regulation]
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
 *               userId:
 *                 type: string
 *                 format: uuid
 *               configuration:
 *                 type: object
 *                 properties:
 *                   assessmentDepth:
 *                     type: string
 *                     enum: [basic, standard, comprehensive]
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */