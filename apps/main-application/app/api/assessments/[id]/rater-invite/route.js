import { NextResponse } from 'next/server';
import { createProtectedRoute, validateRequestBody, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Schema for inviting additional raters
const inviteRatersSchema = z.object({
  raters: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1).max(255),
    relationship: z.enum(['manager', 'peer', 'direct_report', 'stakeholder', 'other'])
  })).min(1).max(10),
  customMessage: z.string().max(1000).optional(),
  sendReminder: z.boolean().default(false)
});

// Schema for resending invitations
const resendInviteSchema = z.object({
  raterEmails: z.array(z.string().email()).min(1).max(20),
  updateMessage: z.string().max(1000).optional()
});

// POST /api/assessments/[id]/rater-invite - Invite or re-invite raters
export const POST = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    const body = await request.json();

    // Determine action type
    if (body.raterEmails) {
      return handleResendInvites(assessmentId, body, context);
    } else {
      return handleNewInvites(assessmentId, body, context);
    }

  } catch (error) {
    console.error('Error in rater invite:', error);
    return ErrorResponses.internalError('Failed to process rater invitation');
  }
});

// GET /api/assessments/[id]/rater-invite - Get invitation status
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get assessment
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
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    // Get 360 feedback request
    const { data: feedbackRequest } = await context.supabase.
    from('360_feedback_requests').
    select('id, status, deadline').
    eq('assessment_id', assessmentId).
    single();

    if (!feedbackRequest) {
      return NextResponse.json({
        hasRequest: false,
        message: 'No 360 feedback request exists for this assessment'
      });
    }

    // Get all invitations
    const { data: invitations, error: inviteError } = await context.supabase.
    from('360_rater_invitations').
    select(`
        id,
        rater_email,
        rater_name,
        relationship,
        status,
        invited_at,
        reminder_sent_at,
        completed_at,
        last_accessed_at
      `).
    eq('feedback_request_id', feedbackRequest.id).
    order('relationship', { ascending: true });

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError);
      return ErrorResponses.internalError('Failed to fetch invitation status');
    }

    // Calculate statistics
    const stats = calculateInvitationStats(invitations || []);

    // Generate invitation links (for display purposes)
    const invitationDetails = (invitations || []).map((inv) => ({
      ...inv,
      invitationUrl: generateInvitationUrl(inv.id, inv.access_token),
      daysElapsed: calculateDaysElapsed(inv.invited_at),
      reminderEligible: isReminderEligible(inv)
    }));

    return NextResponse.json({
      hasRequest: true,
      feedbackRequest: {
        id: feedbackRequest.id,
        status: feedbackRequest.status,
        deadline: feedbackRequest.deadline
      },
      invitations: invitationDetails,
      statistics: stats,
      actions: {
        canInviteMore: feedbackRequest.status === 'active',
        canSendReminders: stats.pending > 0,
        suggestedActions: getSuggestedActions(stats, feedbackRequest)
      }
    });

  } catch (error) {
    console.error('Error fetching invitation status:', error);
    return ErrorResponses.internalError('Failed to retrieve invitation status');
  }
});

// DELETE /api/assessments/[id]/rater-invite - Cancel invitations
export const DELETE = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    const { searchParams } = new URL(request.url);
    const raterEmail = searchParams.get('email');

    if (!raterEmail) {
      return ErrorResponses.badRequest('Rater email is required');
    }

    // Get assessment
    const { data: assessment } = await context.supabase.
    from('assessments').
    select('organization_id').
    eq('id', assessmentId).
    single();

    if (!assessment) {
      return ErrorResponses.notFound('Assessment not found');
    }

    // Verify organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin']
    );

    if (accessError) return accessError;

    // Get feedback request
    const { data: feedbackRequest } = await context.supabase.
    from('360_feedback_requests').
    select('id').
    eq('assessment_id', assessmentId).
    single();

    if (!feedbackRequest) {
      return ErrorResponses.notFound('No feedback request found');
    }

    // Check if invitation exists and is cancellable
    const { data: invitation } = await context.supabase.
    from('360_rater_invitations').
    select('id, status').
    eq('feedback_request_id', feedbackRequest.id).
    eq('rater_email', raterEmail).
    single();

    if (!invitation) {
      return ErrorResponses.notFound('Invitation not found');
    }

    if (invitation.status === 'completed') {
      return ErrorResponses.badRequest('Cannot cancel completed invitation');
    }

    // Cancel the invitation
    const { error: updateError } = await context.supabase.
    from('360_rater_invitations').
    update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: context.userId
    }).
    eq('id', invitation.id);

    if (updateError) {
      throw updateError;
    }

    // Update requested raters count
    await context.supabase.
    from('360_feedback_requests').
    update({
      requested_raters: context.supabase.raw('requested_raters - 1')
    }).
    eq('id', feedbackRequest.id);

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
      cancelledInvitation: {
        email: raterEmail,
        invitationId: invitation.id
      }
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return ErrorResponses.internalError('Failed to cancel invitation');
  }
});

// Handler functions

async function handleNewInvites(assessmentId, body, context) {
  const { data: validatedData, error: validationError } = await validateRequestBody(
    { json: async () => body },
    inviteRatersSchema
  );

  if (validationError) return validationError;

  // Get assessment and feedback request
  const { data: assessment } = await context.supabase.
  from('assessments').
  select('organization_id, user_id').
  eq('id', assessmentId).
  single();

  if (!assessment) {
    return ErrorResponses.notFound('Assessment not found');
  }

  // Verify access
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    assessment.organization_id,
    ['owner', 'admin']
  );

  if (accessError) return accessError;

  // Get feedback request
  const { data: feedbackRequest } = await context.supabase.
  from('360_feedback_requests').
  select('id, status, requested_raters').
  eq('assessment_id', assessmentId).
  single();

  if (!feedbackRequest) {
    return ErrorResponses.notFound('No 360 feedback request found');
  }

  if (feedbackRequest.status !== 'active') {
    return ErrorResponses.badRequest('Feedback request is not active');
  }

  // Check for duplicate invitations
  const emails = validatedData.raters.map((r) => r.email);
  const { data: existingInvites } = await context.supabase.
  from('360_rater_invitations').
  select('rater_email').
  eq('feedback_request_id', feedbackRequest.id).
  in('rater_email', emails);

  const existingEmails = (existingInvites || []).map((i) => i.rater_email);
  const newRaters = validatedData.raters.filter((r) => !existingEmails.includes(r.email));

  if (newRaters.length === 0) {
    return ErrorResponses.badRequest('All specified raters have already been invited');
  }

  try {
    // Create new invitations
    const invitations = newRaters.map((rater) => ({
      id: uuidv4(),
      feedback_request_id: feedbackRequest.id,
      rater_email: rater.email,
      rater_name: rater.name,
      relationship: rater.relationship,
      status: 'pending',
      access_token: generateAccessToken(),
      custom_message: validatedData.customMessage,
      invited_at: new Date().toISOString(),
      invited_by: context.userId
    }));

    const { error: insertError } = await context.supabase.
    from('360_rater_invitations').
    insert(invitations);

    if (insertError) {
      throw insertError;
    }

    // Update requested raters count
    await context.supabase.
    from('360_feedback_requests').
    update({
      requested_raters: feedbackRequest.requested_raters + newRaters.length
    }).
    eq('id', feedbackRequest.id);

    // Send invitation emails
    await sendInvitationEmails(invitations, assessment, assessmentId);

    // Log event
    await context.supabase.from('analytics_events').insert({
      organization_id: assessment.organization_id,
      user_id: context.userId,
      event_type: 'additional_raters_invited',
      event_category: 'assessments',
      event_data: {
        assessment_id: assessmentId,
        new_rater_count: newRaters.length,
        total_raters: feedbackRequest.requested_raters + newRaters.length
      }
    });

    return NextResponse.json({
      success: true,
      invited: newRaters.length,
      skipped: validatedData.raters.length - newRaters.length,
      invitations: invitations.map((inv) => ({
        email: inv.rater_email,
        name: inv.rater_name,
        relationship: inv.relationship,
        invitationUrl: generateInvitationUrl(inv.id, inv.access_token)
      })),
      message: `Successfully invited ${newRaters.length} new rater(s)`
    });

  } catch (error) {
    console.error('Error inviting raters:', error);
    return ErrorResponses.internalError('Failed to invite raters');
  }
}

async function handleResendInvites(assessmentId, body, context) {
  const { data: validatedData, error: validationError } = await validateRequestBody(
    { json: async () => body },
    resendInviteSchema
  );

  if (validationError) return validationError;

  // Get assessment
  const { data: assessment } = await context.supabase.
  from('assessments').
  select('organization_id').
  eq('id', assessmentId).
  single();

  if (!assessment) {
    return ErrorResponses.notFound('Assessment not found');
  }

  // Verify access
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    assessment.organization_id,
    ['owner', 'admin']
  );

  if (accessError) return accessError;

  // Get feedback request and invitations
  const { data: feedbackRequest } = await context.supabase.
  from('360_feedback_requests').
  select('id, status').
  eq('assessment_id', assessmentId).
  single();

  if (!feedbackRequest || feedbackRequest.status !== 'active') {
    return ErrorResponses.badRequest('No active feedback request found');
  }

  // Get invitations to resend
  const { data: invitations } = await context.supabase.
  from('360_rater_invitations').
  select('*').
  eq('feedback_request_id', feedbackRequest.id).
  in('rater_email', validatedData.raterEmails).
  eq('status', 'pending');

  if (!invitations || invitations.length === 0) {
    return ErrorResponses.badRequest('No pending invitations found for specified emails');
  }

  try {
    // Update reminder sent timestamp
    const invitationIds = invitations.map((i) => i.id);
    await context.supabase.
    from('360_rater_invitations').
    update({
      reminder_sent_at: new Date().toISOString(),
      reminder_count: context.supabase.raw('COALESCE(reminder_count, 0) + 1')
    }).
    in('id', invitationIds);

    // Resend emails with updated message if provided
    await sendReminderEmails(
      invitations,
      assessment,
      assessmentId,
      validatedData.updateMessage
    );

    return NextResponse.json({
      success: true,
      remindersSent: invitations.length,
      raters: invitations.map((i) => ({
        email: i.rater_email,
        name: i.rater_name,
        relationship: i.relationship
      })),
      message: `Successfully sent reminders to ${invitations.length} rater(s)`
    });

  } catch (error) {
    console.error('Error resending invitations:', error);
    return ErrorResponses.internalError('Failed to resend invitations');
  }
}

// Helper functions

function generateAccessToken() {
  return Buffer.from(uuidv4()).toString('base64').
  replace(/[^a-zA-Z0-9]/g, '').
  substring(0, 32);
}

function generateInvitationUrl(invitationId, accessToken) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  return `${baseUrl}/feedback/360/${invitationId}?token=${accessToken}`;
}

function calculateDaysElapsed(invitedAt) {
  const invited = new Date(invitedAt);
  const now = new Date();
  return Math.floor((now - invited) / (1000 * 60 * 60 * 24));
}

function isReminderEligible(invitation) {
  if (invitation.status !== 'pending') return false;

  const daysSinceInvite = calculateDaysElapsed(invitation.invited_at);
  if (daysSinceInvite < 3) return false; // Wait at least 3 days

  if (invitation.reminder_sent_at) {
    const daysSinceReminder = calculateDaysElapsed(invitation.reminder_sent_at);
    return daysSinceReminder >= 7; // Wait at least 7 days between reminders
  }

  return true;
}

function calculateInvitationStats(invitations) {
  const stats = {
    total: invitations.length,
    pending: 0,
    completed: 0,
    cancelled: 0,
    responseRate: 0,
    avgResponseTime: 0,
    byRelationship: {},
    reminderEligible: 0
  };

  const responseTimes = [];

  invitations.forEach((inv) => {
    // Status counts
    stats[inv.status]++;

    // By relationship
    if (!stats.byRelationship[inv.relationship]) {
      stats.byRelationship[inv.relationship] = {
        total: 0,
        completed: 0,
        pending: 0
      };
    }
    stats.byRelationship[inv.relationship].total++;
    stats.byRelationship[inv.relationship][inv.status]++;

    // Response time
    if (inv.status === 'completed' && inv.completed_at) {
      const responseTime = calculateDaysElapsed(inv.invited_at, inv.completed_at);
      responseTimes.push(responseTime);
    }

    // Reminder eligible
    if (isReminderEligible(inv)) {
      stats.reminderEligible++;
    }
  });

  // Calculate rates
  stats.responseRate = stats.total > 0 ?
  Math.round(stats.completed / stats.total * 100) :
  0;

  stats.avgResponseTime = responseTimes.length > 0 ?
  Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) :
  0;

  return stats;
}

function getSuggestedActions(stats, feedbackRequest) {
  const actions = [];

  // Low response rate
  if (stats.responseRate < 50 && stats.pending > 0) {
    actions.push({
      type: 'send_reminders',
      priority: 'high',
      message: `Response rate is ${stats.responseRate}%. Consider sending reminders to pending raters.`,
      eligibleCount: stats.reminderEligible
    });
  }

  // Approaching deadline
  if (feedbackRequest.deadline) {
    const daysUntilDeadline = calculateDaysElapsed(new Date(), feedbackRequest.deadline);
    if (daysUntilDeadline <= 7 && stats.pending > 0) {
      actions.push({
        type: 'deadline_reminder',
        priority: 'urgent',
        message: `Deadline is in ${daysUntilDeadline} days with ${stats.pending} pending responses.`
      });
    }
  }

  // Unbalanced responses
  const relationships = Object.keys(stats.byRelationship);
  const unbalanced = relationships.some((rel) => {
    const relStats = stats.byRelationship[rel];
    return relStats.total > 0 && relStats.completed === 0;
  });

  if (unbalanced) {
    actions.push({
      type: 'balance_responses',
      priority: 'medium',
      message: 'Some relationship categories have no completed responses yet.'
    });
  }

  // High completion
  if (stats.responseRate >= 80) {
    actions.push({
      type: 'close_request',
      priority: 'low',
      message: 'Consider closing the feedback request with 80%+ response rate.'
    });
  }

  return actions;
}

async function sendInvitationEmails(invitations, assessment, assessmentId) {
  // This would integrate with your email service
  console.log(`Sending ${invitations.length} invitation emails for assessment ${assessmentId}`);

  // In production:
  // 1. Use email template with invitation details
  // 2. Include personalized invitation URL
  // 3. Add deadline information
  // 4. Track email delivery
}

async function sendReminderEmails(invitations, assessment, assessmentId, customMessage) {
  // This would integrate with your email service
  console.log(`Sending ${invitations.length} reminder emails for assessment ${assessmentId}`);

  // In production:
  // 1. Use reminder template
  // 2. Include custom message if provided
  // 3. Emphasize deadline
  // 4. Track reminder effectiveness
}

/**
 * @swagger
 * /api/assessments/{id}/rater-invite:
 *   post:
 *     summary: Invite or remind raters for 360 feedback
 *     tags: [Assessments, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/InviteRaters'
 *               - $ref: '#/components/schemas/ResendInvites'
 *     responses:
 *       200:
 *         description: Invitations sent successfully
 *   
 *   get:
 *     summary: Get invitation status for all raters
 *     tags: [Assessments, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invitation status and statistics
 *   
 *   delete:
 *     summary: Cancel a rater invitation
 *     tags: [Assessments, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Invitation cancelled successfully
 */