import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { api } from "@ioc/shared/data-access";

const { AssessmentService } = api.assessments;

// Schema for node-based assessment creation
const createFromNodesSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assessmentType: z.enum([
  'ocean-full',
  'ocean-brief',
  'emotional-regulation',
  'executive-ocean',
  'dark-side-analysis',
  'leadership-360']
  ),
  nodePattern: z.enum([
  'comprehensive', // All nodes
  'core-facets', // Primary facets only
  'emotional', // Emotional regulation focus
  'executive', // Executive function focus
  'adaptive', // Adaptive behavior focus
  'custom' // Custom node selection
  ]),
  tier: z.enum(['basic', 'professional', 'enterprise']).default('professional'),
  configuration: z.object({
    promptCount: z.number().int().min(10).max(300).default(120),
    coverage: z.enum(['minimal', 'standard', 'comprehensive', 'exhaustive']).default('standard'),
    includeFacets: z.boolean().default(true),
    includeSubfacets: z.boolean().default(false),
    randomizeOrder: z.boolean().default(true),
    adaptiveDifficulty: z.boolean().default(false),
    timeLimit: z.number().int().min(0).optional(), // in minutes, 0 = no limit
    selectedNodes: z.array(z.string()).optional(), // For custom pattern
    weightingProfile: z.object({
      openness: z.number().min(0.5).max(2.0).default(1.0),
      conscientiousness: z.number().min(0.5).max(2.0).default(1.0),
      extraversion: z.number().min(0.5).max(2.0).default(1.0),
      agreeableness: z.number().min(0.5).max(2.0).default(1.0),
      neuroticism: z.number().min(0.5).max(2.0).default(1.0)
    }).optional()
  }),
  assignments: z.array(z.object({
    userId: z.string().uuid(),
    dueDate: z.string().datetime().optional(),
    customInstructions: z.string().optional()
  })).optional(),
  settings: z.object({
    allowAnonymous: z.boolean().default(false),
    requiresApproval: z.boolean().default(false),
    showResults: z.boolean().default(true),
    maxAttempts: z.number().int().min(1).max(5).default(1),
    feedbackType: z.enum(['none', 'basic', 'detailed', 'comprehensive']).default('detailed'),
    includeNorms: z.boolean().default(true),
    normGroup: z.enum(['general', 'executive', 'professional', 'industry-specific']).default('professional')
  }).optional()
});

// Node pattern definitions
const NODE_PATTERNS = {
  comprehensive: {
    nodes: ['O', 'C', 'E', 'A', 'N'],
    facets: {
      O: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'],
      C: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
      E: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
      A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
      N: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6']
    },
    promptDistribution: 'balanced'
  },
  'core-facets': {
    nodes: ['O', 'C', 'E', 'A', 'N'],
    facets: {
      O: ['O1', 'O3', 'O5'], // Fantasy, Ideas, Values
      C: ['C1', 'C3', 'C5'], // Competence, Dutifulness, Self-Discipline
      E: ['E1', 'E3', 'E5'], // Warmth, Assertiveness, Positive Emotions
      A: ['A1', 'A2', 'A4'], // Trust, Straightforwardness, Compliance
      N: ['N1', 'N3', 'N6'] // Anxiety, Depression, Vulnerability
    },
    promptDistribution: 'focused'
  },
  emotional: {
    nodes: ['N', 'A', 'E'],
    facets: {
      N: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'], // All neuroticism facets
      A: ['A1', 'A2', 'A3', 'A6'], // Trust, Straightforwardness, Altruism, Tender-Mindedness
      E: ['E1', 'E5', 'E6'] // Warmth, Positive Emotions, Excitement-Seeking
    },
    promptDistribution: 'weighted',
    weights: { N: 0.5, A: 0.3, E: 0.2 }
  },
  executive: {
    nodes: ['C', 'O', 'E'],
    facets: {
      C: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], // All conscientiousness facets
      O: ['O2', 'O3', 'O4', 'O5'], // Aesthetics, Ideas, Actions, Values
      E: ['E3', 'E4'] // Assertiveness, Activity
    },
    promptDistribution: 'weighted',
    weights: { C: 0.5, O: 0.3, E: 0.2 }
  },
  adaptive: {
    nodes: ['O', 'C', 'E', 'A'],
    facets: {
      O: ['O3', 'O4', 'O5'], // Ideas, Actions, Values
      C: ['C1', 'C3', 'C5'], // Competence, Dutifulness, Self-Discipline
      E: ['E1', 'E3', 'E5'], // Warmth, Assertiveness, Positive Emotions
      A: ['A2', 'A4', 'A5'] // Straightforwardness, Compliance, Modesty
    },
    promptDistribution: 'balanced'
  }
};

// Tier-based configurations
const TIER_CONFIGS = {
  basic: {
    maxPrompts: 50,
    maxNodes: 5,
    maxFacets: 15,
    features: ['basic-scoring', 'simple-report']
  },
  professional: {
    maxPrompts: 150,
    maxNodes: 5,
    maxFacets: 30,
    features: ['advanced-scoring', 'detailed-report', 'norm-comparison', 'facet-analysis']
  },
  enterprise: {
    maxPrompts: 300,
    maxNodes: 5,
    maxFacets: 30,
    features: ['advanced-scoring', 'comprehensive-report', 'norm-comparison', 'facet-analysis', 'subfacet-analysis', 'custom-norms', 'team-analysis']
  }
};

// POST /api/assessments/create-from-nodes
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createFromNodesSchema);
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
    // Get tier configuration
    const tierConfig = TIER_CONFIGS[body.tier];

    // Validate prompt count against tier limits
    if (body.configuration.promptCount > tierConfig.maxPrompts) {
      return ErrorResponses.badRequest(`Prompt count exceeds ${body.tier} tier limit of ${tierConfig.maxPrompts}`);
    }

    // Build node selection based on pattern
    let selectedNodes, selectedFacets, promptDistribution;

    if (body.nodePattern === 'custom') {
      // Custom selection validation
      if (!body.configuration.selectedNodes || body.configuration.selectedNodes.length === 0) {
        return ErrorResponses.badRequest('Custom node pattern requires selectedNodes');
      }
      selectedNodes = body.configuration.selectedNodes;
      selectedFacets = {};
      promptDistribution = 'balanced';
    } else {
      // Use predefined pattern
      const pattern = NODE_PATTERNS[body.nodePattern];
      selectedNodes = pattern.nodes;
      selectedFacets = pattern.facets;
      promptDistribution = pattern.promptDistribution;
    }

    // Generate assessment questions based on nodes
    const questions = await generateOCEANQuestions({
      nodes: selectedNodes,
      facets: selectedFacets,
      promptCount: body.configuration.promptCount,
      coverage: body.configuration.coverage,
      distribution: promptDistribution,
      includeFacets: body.configuration.includeFacets,
      includeSubfacets: body.configuration.includeSubfacets && body.tier === 'enterprise',
      randomize: body.configuration.randomizeOrder,
      weights: body.configuration.weightingProfile
    });

    // Create assessment structure
    const assessmentData = {
      title: body.title,
      type: 'ocean_assessment',
      organizationId: body.organizationId,
      description: body.description || `${body.assessmentType} assessment using ${body.nodePattern} pattern`,
      questions,
      settings: {
        ...body.settings,
        assessmentType: body.assessmentType,
        nodePattern: body.nodePattern,
        tier: body.tier,
        configuration: {
          ...body.configuration,
          actualPromptCount: questions.length,
          nodesCovered: selectedNodes,
          facetsCovered: Object.values(selectedFacets).flat()
        }
      },
      assignments: body.assignments,
      metadata: {
        createdFrom: 'node-based',
        version: '2.0',
        scoringAlgorithm: 'ocean-v2',
        tierFeatures: tierConfig.features
      }
    };

    // Create the assessment
    const assessmentService = new AssessmentService(context.supabase);
    const assessment = await assessmentService.createAssessment(assessmentData, context.userId);

    // Log analytics event
    await context.supabase.from('analytics_events').insert({
      organization_id: body.organizationId,
      user_id: context.userId,
      event_type: 'ocean_assessment_created',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessment.id,
        assessment_type: body.assessmentType,
        node_pattern: body.nodePattern,
        tier: body.tier,
        prompt_count: questions.length,
        node_count: selectedNodes.length
      }
    });

    return NextResponse.json({
      assessment,
      summary: {
        id: assessment.id,
        title: body.title,
        type: body.assessmentType,
        pattern: body.nodePattern,
        tier: body.tier,
        questionCount: questions.length,
        nodesCovered: selectedNodes,
        facetsCovered: Object.values(selectedFacets).flat().length,
        estimatedDuration: Math.ceil(questions.length * 0.5), // 30 seconds per question
        features: tierConfig.features
      },
      message: 'OCEAN assessment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating node-based assessment:', error);
    return ErrorResponses.internalError('Failed to create assessment');
  }
});

// Helper function to generate OCEAN questions
async function generateOCEANQuestions(config) {
  const questions = [];
  const { nodes, facets, promptCount, coverage, distribution, includeFacets, includeSubfacets, randomize, weights } = config;

  // Calculate prompts per node based on distribution
  const promptsPerNode = calculatePromptDistribution(nodes, promptCount, distribution, weights);

  // Generate questions for each node
  for (const node of nodes) {
    const nodePrompts = promptsPerNode[node];
    const nodeFacets = facets[node] || [];

    // Distribute prompts across facets if included
    if (includeFacets && nodeFacets.length > 0) {
      const promptsPerFacet = Math.floor(nodePrompts / nodeFacets.length);
      const remainder = nodePrompts % nodeFacets.length;

      for (let i = 0; i < nodeFacets.length; i++) {
        const facet = nodeFacets[i];
        const facetPromptCount = promptsPerFacet + (i < remainder ? 1 : 0);

        // Generate facet questions
        for (let j = 0; j < facetPromptCount; j++) {
          questions.push(generateFacetQuestion(node, facet, j, coverage, includeSubfacets));
        }
      }
    } else {
      // Generate node-level questions only
      for (let i = 0; i < nodePrompts; i++) {
        questions.push(generateNodeQuestion(node, i, coverage));
      }
    }
  }

  // Randomize order if requested
  if (randomize) {
    shuffleArray(questions);
  }

  return questions;
}

function calculatePromptDistribution(nodes, totalPrompts, distribution, weights) {
  const result = {};

  if (distribution === 'balanced') {
    const promptsPerNode = Math.floor(totalPrompts / nodes.length);
    const remainder = totalPrompts % nodes.length;

    nodes.forEach((node, index) => {
      result[node] = promptsPerNode + (index < remainder ? 1 : 0);
    });
  } else if (distribution === 'weighted' && weights) {
    const totalWeight = nodes.reduce((sum, node) => sum + (weights[node] || 1), 0);
    let allocated = 0;

    nodes.forEach((node, index) => {
      const weight = weights[node] || 1;
      const prompts = index === nodes.length - 1 ?
      totalPrompts - allocated :
      Math.round(weight / totalWeight * totalPrompts);
      result[node] = prompts;
      allocated += prompts;
    });
  } else {
    // Default to balanced if distribution type not recognized
    return calculatePromptDistribution(nodes, totalPrompts, 'balanced');
  }

  return result;
}

function generateNodeQuestion(node, index, coverage) {
  const nodeDescriptions = {
    O: 'Openness to Experience',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Neuroticism'
  };

  // This is a simplified version - in production, you'd have a comprehensive question bank
  return {
    id: `${node}_${index + 1}`,
    type: 'likert',
    text: `Sample question for ${nodeDescriptions[node]} #${index + 1}`,
    trait: node,
    facet: null,
    required: true,
    options: [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' }],

    scoring: {
      trait: node,
      weight: 1.0,
      reverse: false
    }
  };
}

function generateFacetQuestion(node, facet, index, coverage, includeSubfacets) {
  const facetDescriptions = {
    O1: 'Fantasy', O2: 'Aesthetics', O3: 'Feelings', O4: 'Actions', O5: 'Ideas', O6: 'Values',
    C1: 'Competence', C2: 'Order', C3: 'Dutifulness', C4: 'Achievement Striving', C5: 'Self-Discipline', C6: 'Deliberation',
    E1: 'Warmth', E2: 'Gregariousness', E3: 'Assertiveness', E4: 'Activity', E5: 'Excitement-Seeking', E6: 'Positive Emotions',
    A1: 'Trust', A2: 'Straightforwardness', A3: 'Altruism', A4: 'Compliance', A5: 'Modesty', A6: 'Tender-Mindedness',
    N1: 'Anxiety', N2: 'Angry Hostility', N3: 'Depression', N4: 'Self-Consciousness', N5: 'Impulsiveness', N6: 'Vulnerability'
  };

  return {
    id: `${facet}_${index + 1}`,
    type: 'likert',
    text: `Sample question for ${facetDescriptions[facet]} #${index + 1}`,
    trait: node,
    facet: facet,
    subfacet: includeSubfacets ? `${facet}.${index % 3 + 1}` : null,
    required: true,
    options: [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' }],

    scoring: {
      trait: node,
      facet: facet,
      weight: 1.0,
      reverse: Math.random() > 0.7 // 30% reverse scored items
    }
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * @swagger
 * /api/assessments/create-from-nodes:
 *   post:
 *     summary: Create OCEAN assessment from node configuration
 *     description: Creates a new OCEAN personality assessment based on selected nodes and patterns
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
 *               - title
 *               - assessmentType
 *               - nodePattern
 *             properties:
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assessmentType:
 *                 type: string
 *                 enum: [ocean-full, ocean-brief, emotional-regulation, executive-ocean, dark-side-analysis, leadership-360]
 *               nodePattern:
 *                 type: string
 *                 enum: [comprehensive, core-facets, emotional, executive, adaptive, custom]
 *               tier:
 *                 type: string
 *                 enum: [basic, professional, enterprise]
 *                 default: professional
 *               configuration:
 *                 type: object
 *                 properties:
 *                   promptCount:
 *                     type: integer
 *                     minimum: 10
 *                     maximum: 300
 *                   coverage:
 *                     type: string
 *                     enum: [minimal, standard, comprehensive, exhaustive]
 *                   includeFacets:
 *                     type: boolean
 *                   includeSubfacets:
 *                     type: boolean
 *                   selectedNodes:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: Assessment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessment:
 *                   $ref: '#/components/schemas/Assessment'
 *                 summary:
 *                   type: object
 *                 message:
 *                   type: string
 */