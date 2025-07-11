import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Schema for 360 feedback submission
const submit360FeedbackSchema = z.object({
  raterEmail: z.string().email(),
  raterName: z.string().min(1).max(255),
  relationship: z.enum(['manager', 'peer', 'direct_report', 'stakeholder', 'other']),
  ratings: z.object({
    // OCEAN trait ratings
    openness: z.number().min(1).max(5),
    conscientiousness: z.number().min(1).max(5),
    extraversion: z.number().min(1).max(5),
    agreeableness: z.number().min(1).max(5),
    neuroticism: z.number().min(1).max(5),

    // Leadership competency ratings (optional)
    strategic: z.number().min(1).max(5).optional(),
    execution: z.number().min(1).max(5).optional(),
    people: z.number().min(1).max(5).optional(),
    influence: z.number().min(1).max(5).optional(),
    adaptability: z.number().min(1).max(5).optional(),
    integrity: z.number().min(1).max(5).optional(),
    resilience: z.number().min(1).max(5).optional()
  }),
  behaviors: z.object({
    // Observed behaviors
    strengths: z.array(z.string()).max(5).optional(),
    improvements: z.array(z.string()).max(5).optional(),
    criticalIncidents: z.array(z.object({
      situation: z.string().max(500),
      behavior: z.string().max(500),
      impact: z.string().max(500)
    })).max(3).optional()
  }).optional(),
  qualitativeFeedback: z.object({
    overallComments: z.string().max(1000).optional(),
    leadershipEffectiveness: z.string().max(500).optional(),
    workingRelationship: z.string().max(500).optional(),
    developmentSuggestions: z.string().max(500).optional()
  }).optional(),
  confidenceLevel: z.enum(['very_confident', 'confident', 'somewhat_confident', 'not_confident']).default('confident')
});

// Schema for creating 360 feedback request
const create360RequestSchema = z.object({
  requestedRaters: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    relationship: z.enum(['manager', 'peer', 'direct_report', 'stakeholder', 'other'])
  })).min(1).max(20),
  deadline: z.string().datetime().optional(),
  customMessage: z.string().max(1000).optional(),
  anonymityLevel: z.enum(['full', 'relationship_only', 'identified']).default('relationship_only')
});

// POST /api/assessments/[id]/360-feedback - Submit 360 feedback
export const POST = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    const body = await request.json();

    // Check if this is a request creation or feedback submission
    if (body.requestedRaters) {
      return handleCreate360Request(assessmentId, body, context);
    } else {
      return handleSubmit360Feedback(assessmentId, body, context);
    }
  } catch (error) {
    console.error('Error in 360 feedback POST:', error);
    return ErrorResponses.internalError('Failed to process 360 feedback request');
  }
});

// GET /api/assessments/[id]/360-feedback - Get 360 feedback status and results
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('id, organization_id, user_id, status').
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

    // Get 360 feedback request
    const { data: feedbackRequest, error: requestError } = await context.supabase.
    from('360_feedback_requests').
    select(`
        id,
        status,
        anonymity_level,
        deadline,
        created_at,
        requested_raters,
        completed_raters
      `).
    eq('assessment_id', assessmentId).
    single();

    if (requestError || !feedbackRequest) {
      return NextResponse.json({
        assessment: { id: assessmentId },
        has360Feedback: false,
        message: 'No 360 feedback request found for this assessment'
      });
    }

    // Get submitted feedback (anonymized based on settings)
    const { data: feedback, error: feedbackError } = await context.supabase.
    from('360_feedback_submissions').
    select(`
        id,
        relationship,
        ratings,
        behaviors,
        qualitative_feedback,
        confidence_level,
        submitted_at
      `).
    eq('feedback_request_id', feedbackRequest.id).
    eq('status', 'completed');

    // Calculate aggregated results
    const aggregatedResults = aggregate360Feedback(feedback || [], feedbackRequest.anonymity_level);

    // Get rater status (for request owner only)
    let raterStatus = null;
    if (context.userId === assessment.user_id || ['owner', 'admin'].includes(context.userRole)) {
      raterStatus = await getRaterStatus(context.supabase, feedbackRequest.id);
    }

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        userId: assessment.user_id
      },
      has360Feedback: true,
      request: {
        id: feedbackRequest.id,
        status: feedbackRequest.status,
        deadline: feedbackRequest.deadline,
        createdAt: feedbackRequest.created_at,
        progress: {
          requested: feedbackRequest.requested_raters,
          completed: feedbackRequest.completed_raters,
          completionRate: Math.round(feedbackRequest.completed_raters / feedbackRequest.requested_raters * 100)
        }
      },
      results: aggregatedResults,
      raterStatus,
      metadata: {
        anonymityLevel: feedbackRequest.anonymity_level,
        feedbackCount: feedback?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching 360 feedback:', error);
    return ErrorResponses.internalError('Failed to retrieve 360 feedback');
  }
});

// Handler for creating 360 feedback request
async function handleCreate360Request(assessmentId, body, context) {
  const { data: validatedData, error: validationError } = await validateRequestBody(
    { json: async () => body },
    create360RequestSchema
  );

  if (validationError) return validationError;

  // Get assessment details
  const { data: assessment, error: assessmentError } = await context.supabase.
  from('assessments').
  select('organization_id, user_id, status').
  eq('id', assessmentId).
  single();

  if (assessmentError || !assessment) {
    return ErrorResponses.notFound('Assessment not found');
  }

  // Verify organization access (only admins can create 360 requests)
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    assessment.organization_id,
    ['owner', 'admin']
  );

  if (accessError) return accessError;

  // Check if 360 request already exists
  const { data: existingRequest } = await context.supabase.
  from('360_feedback_requests').
  select('id').
  eq('assessment_id', assessmentId).
  single();

  if (existingRequest) {
    return ErrorResponses.badRequest('360 feedback request already exists for this assessment');
  }

  try {
    // Create the 360 feedback request
    const feedbackRequestId = uuidv4();
    const { error: createError } = await context.supabase.
    from('360_feedback_requests').
    insert({
      id: feedbackRequestId,
      assessment_id: assessmentId,
      subject_user_id: assessment.user_id,
      organization_id: assessment.organization_id,
      status: 'active',
      anonymity_level: validatedData.anonymityLevel,
      deadline: validatedData.deadline,
      requested_raters: validatedData.requestedRaters.length,
      completed_raters: 0,
      created_by: context.userId
    });

    if (createError) {
      throw createError;
    }

    // Create rater invitations
    const raterInvitations = validatedData.requestedRaters.map((rater) => ({
      id: uuidv4(),
      feedback_request_id: feedbackRequestId,
      rater_email: rater.email,
      rater_name: rater.name,
      relationship: rater.relationship,
      status: 'pending',
      access_token: generateAccessToken(),
      custom_message: validatedData.customMessage
    }));

    const { error: inviteError } = await context.supabase.
    from('360_rater_invitations').
    insert(raterInvitations);

    if (inviteError) {
      throw inviteError;
    }

    // Send invitation emails (async, don't wait)
    sendRaterInvitations(raterInvitations, assessment, validatedData.customMessage);

    // Log event
    await context.supabase.from('analytics_events').insert({
      organization_id: assessment.organization_id,
      user_id: context.userId,
      event_type: '360_feedback_requested',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessmentId,
        feedback_request_id: feedbackRequestId,
        rater_count: validatedData.requestedRaters.length,
        anonymity_level: validatedData.anonymityLevel
      }
    });

    return NextResponse.json({
      success: true,
      feedbackRequest: {
        id: feedbackRequestId,
        assessmentId,
        status: 'active',
        ratersInvited: validatedData.requestedRaters.length,
        deadline: validatedData.deadline
      },
      message: '360 feedback request created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating 360 feedback request:', error);
    return ErrorResponses.internalError('Failed to create 360 feedback request');
  }
}

// Handler for submitting 360 feedback
async function handleSubmit360Feedback(assessmentId, body, context) {
  const { data: validatedData, error: validationError } = await validateRequestBody(
    { json: async () => body },
    submit360FeedbackSchema
  );

  if (validationError) return validationError;

  // Get assessment and verify it exists
  const { data: assessment, error: assessmentError } = await context.supabase.
  from('assessments').
  select('organization_id, user_id').
  eq('id', assessmentId).
  single();

  if (assessmentError || !assessment) {
    return ErrorResponses.notFound('Assessment not found');
  }

  // Get 360 feedback request
  const { data: feedbackRequest, error: requestError } = await context.supabase.
  from('360_feedback_requests').
  select('id, status, deadline, anonymity_level').
  eq('assessment_id', assessmentId).
  eq('status', 'active').
  single();

  if (requestError || !feedbackRequest) {
    return ErrorResponses.notFound('No active 360 feedback request found');
  }

  // Check deadline
  if (feedbackRequest.deadline && new Date(feedbackRequest.deadline) < new Date()) {
    return ErrorResponses.badRequest('360 feedback deadline has passed');
  }

  // Verify rater is invited (by email)
  const { data: invitation, error: inviteError } = await context.supabase.
  from('360_rater_invitations').
  select('id, status').
  eq('feedback_request_id', feedbackRequest.id).
  eq('rater_email', validatedData.raterEmail).
  single();

  if (inviteError || !invitation) {
    return ErrorResponses.forbidden('You are not authorized to provide feedback for this assessment');
  }

  if (invitation.status === 'completed') {
    return ErrorResponses.badRequest('You have already submitted feedback for this assessment');
  }

  try {
    // Submit the feedback
    const { error: submitError } = await context.supabase.
    from('360_feedback_submissions').
    insert({
      feedback_request_id: feedbackRequest.id,
      invitation_id: invitation.id,
      rater_email: validatedData.raterEmail,
      rater_name: feedbackRequest.anonymity_level === 'identified' ? validatedData.raterName : null,
      relationship: validatedData.relationship,
      ratings: validatedData.ratings,
      behaviors: validatedData.behaviors,
      qualitative_feedback: validatedData.qualitativeFeedback,
      confidence_level: validatedData.confidenceLevel,
      status: 'completed',
      submitted_at: new Date().toISOString()
    });

    if (submitError) {
      throw submitError;
    }

    // Update invitation status
    await context.supabase.
    from('360_rater_invitations').
    update({ status: 'completed', completed_at: new Date().toISOString() }).
    eq('id', invitation.id);

    // Update completed count
    await context.supabase.
    from('360_feedback_requests').
    update({ completed_raters: feedbackRequest.completed_raters + 1 }).
    eq('id', feedbackRequest.id);

    // Log event
    await context.supabase.from('analytics_events').insert({
      organization_id: assessment.organization_id,
      user_id: context.userId,
      event_type: '360_feedback_submitted',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessmentId,
        feedback_request_id: feedbackRequest.id,
        relationship: validatedData.relationship,
        confidence_level: validatedData.confidenceLevel
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for submitting your feedback',
      confirmation: {
        assessmentId,
        relationship: validatedData.relationship,
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error submitting 360 feedback:', error);
    return ErrorResponses.internalError('Failed to submit feedback');
  }
}

// Helper functions

function generateAccessToken() {
  return Buffer.from(uuidv4()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

async function sendRaterInvitations(invitations, assessment, customMessage) {
  // This would integrate with your email service
  // For now, just log the action
  console.log(`Sending ${invitations.length} 360 feedback invitations for assessment ${assessment.id}`);

  // In production, you would:
  // 1. Generate unique URLs for each rater
  // 2. Send personalized emails
  // 3. Track email delivery status
}

function aggregate360Feedback(submissions, anonymityLevel) {
  if (submissions.length === 0) {
    return { hasData: false };
  }

  const results = {
    hasData: true,
    responseCount: submissions.length,
    byRelationship: {},
    overall: {
      ratings: {},
      themes: {
        strengths: [],
        improvements: [],
        behaviors: []
      }
    },
    confidenceDistribution: {}
  };

  // Group by relationship
  const relationshipGroups = {};
  submissions.forEach((submission) => {
    const rel = submission.relationship;
    if (!relationshipGroups[rel]) {
      relationshipGroups[rel] = [];
    }
    relationshipGroups[rel].push(submission);
  });

  // Calculate ratings by relationship and overall
  const allRatings = {};

  Object.entries(relationshipGroups).forEach(([relationship, subs]) => {
    const relationshipRatings = {};

    subs.forEach((sub) => {
      Object.entries(sub.ratings).forEach(([trait, rating]) => {
        if (!relationshipRatings[trait]) {
          relationshipRatings[trait] = [];
        }
        relationshipRatings[trait].push(rating);

        if (!allRatings[trait]) {
          allRatings[trait] = [];
        }
        allRatings[trait].push(rating);
      });
    });

    // Calculate averages for this relationship
    results.byRelationship[relationship] = {
      count: subs.length,
      ratings: {}
    };

    Object.entries(relationshipRatings).forEach(([trait, ratings]) => {
      results.byRelationship[relationship].ratings[trait] = {
        average: calculateAverage(ratings),
        stdDev: calculateStdDev(ratings),
        range: { min: Math.min(...ratings), max: Math.max(...ratings) }
      };
    });
  });

  // Calculate overall averages
  Object.entries(allRatings).forEach(([trait, ratings]) => {
    results.overall.ratings[trait] = {
      average: calculateAverage(ratings),
      stdDev: calculateStdDev(ratings),
      range: { min: Math.min(...ratings), max: Math.max(...ratings) },
      distribution: calculateDistribution(ratings)
    };
  });

  // Aggregate qualitative feedback (anonymized)
  const allStrengths = [];
  const allImprovements = [];
  const allBehaviors = [];

  submissions.forEach((sub) => {
    if (sub.behaviors?.strengths) {
      allStrengths.push(...sub.behaviors.strengths);
    }
    if (sub.behaviors?.improvements) {
      allImprovements.push(...sub.behaviors.improvements);
    }
    if (sub.behaviors?.criticalIncidents) {
      allBehaviors.push(...sub.behaviors.criticalIncidents);
    }

    // Track confidence levels
    const confidence = sub.confidence_level || 'confident';
    results.confidenceDistribution[confidence] = (results.confidenceDistribution[confidence] || 0) + 1;
  });

  // Identify themes
  results.overall.themes.strengths = identifyThemes(allStrengths);
  results.overall.themes.improvements = identifyThemes(allImprovements);
  results.overall.themes.behaviors = summarizeBehaviors(allBehaviors);

  // Add comparison insights
  results.insights = generate360Insights(results);

  return results;
}

function calculateAverage(numbers) {
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length * 100) / 100;
}

function calculateStdDev(numbers) {
  const avg = calculateAverage(numbers);
  const squaredDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  const variance = calculateAverage(squaredDiffs);
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

function calculateDistribution(ratings) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => {
    distribution[Math.round(rating)] = (distribution[Math.round(rating)] || 0) + 1;
  });
  return distribution;
}

function identifyThemes(items) {
  // Simple theme identification - in production, use NLP
  const themeCounts = {};

  items.forEach((item) => {
    const words = item.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 4) {// Skip short words
        themeCounts[word] = (themeCounts[word] || 0) + 1;
      }
    });
  });

  // Return top themes
  return Object.entries(themeCounts).
  sort((a, b) => b[1] - a[1]).
  slice(0, 5).
  map(([theme, count]) => ({ theme, count, examples: items.filter((i) => i.toLowerCase().includes(theme)).slice(0, 2) }));
}

function summarizeBehaviors(behaviors) {
  // Group behaviors by impact type
  const impactTypes = {
    positive: [],
    negative: [],
    neutral: []
  };

  behaviors.forEach((incident) => {
    // Simple sentiment analysis - in production, use NLP
    const impactLower = incident.impact.toLowerCase();
    if (impactLower.includes('positive') || impactLower.includes('good') || impactLower.includes('excellent')) {
      impactTypes.positive.push(incident);
    } else if (impactLower.includes('negative') || impactLower.includes('poor') || impactLower.includes('bad')) {
      impactTypes.negative.push(incident);
    } else {
      impactTypes.neutral.push(incident);
    }
  });

  return {
    totalIncidents: behaviors.length,
    byImpact: {
      positive: impactTypes.positive.length,
      negative: impactTypes.negative.length,
      neutral: impactTypes.neutral.length
    },
    examples: behaviors.slice(0, 3) // Top 3 examples
  };
}

function generate360Insights(results) {
  const insights = [];

  // Check for high agreement (low std dev)
  Object.entries(results.overall.ratings).forEach(([trait, data]) => {
    if (data.stdDev < 0.5) {
      insights.push({
        type: 'consensus',
        trait,
        message: `Strong agreement among raters on ${trait} (low variability)`,
        confidence: 'high'
      });
    } else if (data.stdDev > 1.0) {
      insights.push({
        type: 'divergence',
        trait,
        message: `Significant disagreement on ${trait} - may vary by context`,
        confidence: 'medium'
      });
    }
  });

  // Check for relationship differences
  const traits = Object.keys(results.overall.ratings);
  traits.forEach((trait) => {
    const relRatings = Object.entries(results.byRelationship).
    map(([rel, data]) => ({ relationship: rel, rating: data.ratings[trait]?.average })).
    filter((r) => r.rating !== undefined);

    if (relRatings.length >= 2) {
      const ratings = relRatings.map((r) => r.rating);
      const range = Math.max(...ratings) - Math.min(...ratings);

      if (range > 1.0) {
        insights.push({
          type: 'relationship_variance',
          trait,
          message: `${trait} ratings vary significantly by relationship type`,
          details: relRatings
        });
      }
    }
  });

  // Check for extreme ratings
  Object.entries(results.overall.ratings).forEach(([trait, data]) => {
    if (data.average >= 4.5) {
      insights.push({
        type: 'strength',
        trait,
        message: `${trait} is consistently rated as a major strength`,
        score: data.average
      });
    } else if (data.average <= 2.5) {
      insights.push({
        type: 'development_area',
        trait,
        message: `${trait} is identified as a key development area`,
        score: data.average
      });
    }
  });

  return insights;
}

async function getRaterStatus(supabase, feedbackRequestId) {
  const { data: invitations, error } = await supabase.
  from('360_rater_invitations').
  select('rater_email, rater_name, relationship, status, invited_at, completed_at').
  eq('feedback_request_id', feedbackRequestId).
  order('relationship', { ascending: true });

  if (error || !invitations) {
    return null;
  }

  const byStatus = {
    pending: invitations.filter((i) => i.status === 'pending'),
    completed: invitations.filter((i) => i.status === 'completed'),
    declined: invitations.filter((i) => i.status === 'declined')
  };

  return {
    total: invitations.length,
    byStatus,
    completionDetails: invitations.map((i) => ({
      relationship: i.relationship,
      status: i.status,
      daysElapsed: i.completed_at ?
      Math.floor((new Date(i.completed_at) - new Date(i.invited_at)) / (1000 * 60 * 60 * 24)) :
      Math.floor((new Date() - new Date(i.invited_at)) / (1000 * 60 * 60 * 24))
    }))
  };
}

/**
 * @swagger
 * /api/assessments/{id}/360-feedback:
 *   post:
 *     summary: Create 360 feedback request or submit feedback
 *     tags: [Assessments, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Create360Request'
 *               - $ref: '#/components/schemas/Submit360Feedback'
 *     responses:
 *       201:
 *         description: 360 feedback request created
 *       200:
 *         description: Feedback submitted successfully
 *   
 *   get:
 *     summary: Get 360 feedback results
 *     tags: [Assessments, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 360 feedback results
 */