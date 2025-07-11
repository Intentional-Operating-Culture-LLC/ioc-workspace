import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/rater-status - Get detailed rater status
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get assessment
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('organization_id, user_id, title').
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

    // Determine access level
    const isSubject = context.userId === assessment.user_id;
    const isAdmin = ['owner', 'admin'].includes(context.userRole);
    const fullAccess = isSubject || isAdmin;

    // Get 360 feedback request
    const { data: feedbackRequest } = await context.supabase.
    from('360_feedback_requests').
    select(`
        id,
        status,
        deadline,
        requested_raters,
        completed_raters,
        anonymity_level,
        created_at,
        created_by
      `).
    eq('assessment_id', assessmentId).
    single();

    if (!feedbackRequest) {
      return NextResponse.json({
        hasRequest: false,
        assessment: {
          id: assessmentId,
          title: assessment.title
        },
        message: 'No 360 feedback request exists for this assessment'
      });
    }

    // Get rater invitations with detailed status
    const { data: invitations } = await context.supabase.
    from('360_rater_invitations').
    select(`
        id,
        rater_email,
        rater_name,
        relationship,
        status,
        invited_at,
        last_accessed_at,
        reminder_sent_at,
        reminder_count,
        completed_at
      `).
    eq('feedback_request_id', feedbackRequest.id).
    order('relationship', { ascending: true });

    // Get submission quality metrics
    const { data: submissions } = await context.supabase.
    from('360_feedback_submissions').
    select(`
        invitation_id,
        confidence_level,
        submitted_at,
        ratings,
        qualitative_feedback
      `).
    eq('feedback_request_id', feedbackRequest.id);

    // Process rater data
    const raterDetails = processRaterDetails(
      invitations || [],
      submissions || [],
      feedbackRequest,
      fullAccess
    );

    // Calculate progress metrics
    const progressMetrics = calculateProgressMetrics(
      feedbackRequest,
      invitations || [],
      submissions || []
    );

    // Generate timeline
    const timeline = generateTimeline(
      feedbackRequest,
      invitations || [],
      submissions || []
    );

    // Get completion predictions
    const predictions = generateCompletionPredictions(
      progressMetrics,
      feedbackRequest.deadline
    );

    return NextResponse.json({
      hasRequest: true,
      assessment: {
        id: assessmentId,
        title: assessment.title,
        subject: fullAccess ? assessment.user_id : null
      },
      request: {
        id: feedbackRequest.id,
        status: feedbackRequest.status,
        deadline: feedbackRequest.deadline,
        createdAt: feedbackRequest.created_at,
        anonymityLevel: feedbackRequest.anonymity_level
      },
      raterStatus: raterDetails,
      progress: progressMetrics,
      timeline,
      predictions,
      actions: {
        availableActions: getAvailableActions(feedbackRequest, progressMetrics, isAdmin),
        recommendations: getRecommendations(progressMetrics, predictions)
      }
    });

  } catch (error) {
    console.error('Error fetching rater status:', error);
    return ErrorResponses.internalError('Failed to retrieve rater status');
  }
});

// Helper functions

function processRaterDetails(invitations, submissions, feedbackRequest, fullAccess) {
  const submissionMap = new Map(
    submissions.map((s) => [s.invitation_id, s])
  );

  const raterDetails = {
    summary: {
      total: invitations.length,
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      byRelationship: {}
    },
    raters: []
  };

  invitations.forEach((invitation) => {
    const submission = submissionMap.get(invitation.id);

    // Update summary counts
    raterDetails.summary.byStatus[invitation.status]++;

    if (!raterDetails.summary.byRelationship[invitation.relationship]) {
      raterDetails.summary.byRelationship[invitation.relationship] = {
        total: 0,
        completed: 0,
        pending: 0,
        responseRate: 0
      };
    }

    const relSummary = raterDetails.summary.byRelationship[invitation.relationship];
    relSummary.total++;
    relSummary[invitation.status]++;

    // Calculate individual rater details
    const raterInfo = {
      id: invitation.id,
      relationship: invitation.relationship,
      status: invitation.status,
      invitedAt: invitation.invited_at,
      daysElapsed: calculateDaysElapsed(invitation.invited_at),
      lastActivity: getLastActivity(invitation, submission),
      engagement: calculateEngagement(invitation, submission)
    };

    // Add identifiable info only if full access
    if (fullAccess) {
      raterInfo.email = invitation.rater_email;
      raterInfo.name = invitation.rater_name;
      raterInfo.reminders = {
        sent: invitation.reminder_count || 0,
        lastSent: invitation.reminder_sent_at,
        eligible: isReminderEligible(invitation)
      };
    }

    // Add completion details if completed
    if (submission) {
      raterInfo.completion = {
        completedAt: submission.submitted_at,
        responseTime: calculateDaysElapsed(invitation.invited_at, submission.submitted_at),
        confidence: submission.confidence_level,
        completeness: calculateCompleteness(submission)
      };
    }

    raterDetails.raters.push(raterInfo);
  });

  // Calculate response rates by relationship
  Object.keys(raterDetails.summary.byRelationship).forEach((rel) => {
    const relData = raterDetails.summary.byRelationship[rel];
    relData.responseRate = relData.total > 0 ?
    Math.round(relData.completed / relData.total * 100) :
    0;
  });

  return raterDetails;
}

function calculateProgressMetrics(feedbackRequest, invitations, submissions) {
  const now = new Date();
  const created = new Date(feedbackRequest.created_at);
  const deadline = feedbackRequest.deadline ? new Date(feedbackRequest.deadline) : null;

  const metrics = {
    overall: {
      requested: feedbackRequest.requested_raters,
      completed: feedbackRequest.completed_raters,
      pending: feedbackRequest.requested_raters - feedbackRequest.completed_raters,
      responseRate: Math.round(feedbackRequest.completed_raters / feedbackRequest.requested_raters * 100)
    },
    timing: {
      daysElapsed: Math.floor((now - created) / (1000 * 60 * 60 * 24)),
      daysRemaining: deadline ? Math.floor((deadline - now) / (1000 * 60 * 60 * 24)) : null,
      averageResponseTime: calculateAverageResponseTime(invitations, submissions),
      completionVelocity: calculateCompletionVelocity(invitations, submissions)
    },
    quality: {
      averageConfidence: calculateAverageConfidence(submissions),
      completenessScore: calculateOverallCompleteness(submissions),
      qualitativeFeedbackRate: calculateQualitativeFeedbackRate(submissions)
    },
    engagement: {
      accessRate: calculateAccessRate(invitations),
      abandonmentRate: calculateAbandonmentRate(invitations, submissions),
      reminderEffectiveness: calculateReminderEffectiveness(invitations, submissions)
    }
  };

  return metrics;
}

function generateTimeline(feedbackRequest, invitations, submissions) {
  const events = [];

  // Request created
  events.push({
    type: 'request_created',
    date: feedbackRequest.created_at,
    description: '360 feedback request initiated'
  });

  // Invitations sent
  const invitationDates = [...new Set(invitations.map((i) => i.invited_at.split('T')[0]))];
  invitationDates.forEach((date) => {
    const count = invitations.filter((i) => i.invited_at.startsWith(date)).length;
    events.push({
      type: 'invitations_sent',
      date,
      description: `${count} invitation(s) sent`,
      count
    });
  });

  // Reminders sent
  invitations.forEach((inv) => {
    if (inv.reminder_sent_at) {
      events.push({
        type: 'reminder_sent',
        date: inv.reminder_sent_at,
        description: 'Reminder sent',
        relationship: inv.relationship
      });
    }
  });

  // Submissions
  submissions.forEach((sub) => {
    events.push({
      type: 'feedback_submitted',
      date: sub.submitted_at,
      description: 'Feedback submitted',
      confidence: sub.confidence_level
    });
  });

  // Deadline
  if (feedbackRequest.deadline) {
    events.push({
      type: 'deadline',
      date: feedbackRequest.deadline,
      description: 'Feedback deadline',
      isPast: new Date(feedbackRequest.deadline) < new Date()
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return events;
}

function generateCompletionPredictions(metrics, deadline) {
  const predictions = {
    estimatedCompletion: null,
    projectedResponseRate: null,
    confidence: 'low',
    factors: []
  };

  // Calculate based on current velocity
  const velocity = metrics.timing.completionVelocity;
  const remaining = metrics.overall.pending;

  if (velocity > 0 && remaining > 0) {
    const daysToComplete = Math.ceil(remaining / velocity);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);

    predictions.estimatedCompletion = estimatedDate.toISOString();

    // Check if will meet deadline
    if (deadline) {
      const willMeetDeadline = estimatedDate <= new Date(deadline);
      predictions.willMeetDeadline = willMeetDeadline;

      if (!willMeetDeadline) {
        predictions.factors.push({
          type: 'risk',
          message: 'Current pace suggests deadline will be missed'
        });
      }
    }
  }

  // Project final response rate based on patterns
  const currentRate = metrics.overall.responseRate;
  const engagementRate = metrics.engagement.accessRate;

  if (engagementRate > 0) {
    // Assume 80% of engaged raters will complete
    predictions.projectedResponseRate = Math.min(100, Math.round(engagementRate * 0.8));

    if (predictions.projectedResponseRate > currentRate + 20) {
      predictions.confidence = 'medium';
    } else {
      predictions.confidence = 'high';
    }
  }

  // Add influencing factors
  if (metrics.engagement.reminderEffectiveness > 0.3) {
    predictions.factors.push({
      type: 'positive',
      message: 'Reminders have been effective'
    });
  }

  if (metrics.engagement.abandonmentRate > 0.2) {
    predictions.factors.push({
      type: 'negative',
      message: 'High abandonment rate detected'
    });
  }

  if (metrics.timing.daysRemaining && metrics.timing.daysRemaining < 7) {
    predictions.factors.push({
      type: 'urgent',
      message: 'Approaching deadline - urgent action needed'
    });
  }

  return predictions;
}

function getAvailableActions(feedbackRequest, metrics, isAdmin) {
  const actions = [];

  if (!isAdmin) {
    return actions;
  }

  // Send reminders
  if (metrics.overall.pending > 0 && feedbackRequest.status === 'active') {
    actions.push({
      action: 'send_reminders',
      label: 'Send Reminders',
      description: `Send reminders to ${metrics.overall.pending} pending raters`,
      priority: metrics.overall.responseRate < 50 ? 'high' : 'medium'
    });
  }

  // Extend deadline
  if (feedbackRequest.deadline && metrics.timing.daysRemaining < 7) {
    actions.push({
      action: 'extend_deadline',
      label: 'Extend Deadline',
      description: 'Give raters more time to complete feedback',
      priority: 'high'
    });
  }

  // Close request
  if (metrics.overall.responseRate >= 70) {
    actions.push({
      action: 'close_request',
      label: 'Close Feedback Request',
      description: `Close with ${metrics.overall.responseRate}% response rate`,
      priority: 'low'
    });
  }

  // Add more raters
  if (metrics.overall.responseRate < 50 && feedbackRequest.status === 'active') {
    actions.push({
      action: 'invite_more',
      label: 'Invite Additional Raters',
      description: 'Increase sample size for better feedback',
      priority: 'medium'
    });
  }

  return actions;
}

function getRecommendations(metrics, predictions) {
  const recommendations = [];

  // Low response rate
  if (metrics.overall.responseRate < 30) {
    recommendations.push({
      type: 'urgent',
      title: 'Low Response Rate',
      description: 'Consider personal outreach to pending raters',
      actions: ['Send personalized reminders', 'Extend deadline', 'Simplify feedback process']
    });
  }

  // Deadline risk
  if (predictions.willMeetDeadline === false) {
    recommendations.push({
      type: 'warning',
      title: 'Deadline at Risk',
      description: 'Current pace suggests deadline will be missed',
      actions: ['Send urgent reminders', 'Consider extending deadline', 'Focus on key relationships']
    });
  }

  // High abandonment
  if (metrics.engagement.abandonmentRate > 0.3) {
    recommendations.push({
      type: 'improvement',
      title: 'High Abandonment Rate',
      description: 'Many raters start but don\'t complete feedback',
      actions: ['Simplify questions', 'Save progress feature', 'Send completion reminders']
    });
  }

  // Unbalanced feedback
  const relCounts = Object.values(metrics.overall.byRelationship || {});
  const hasUnbalanced = relCounts.some((r) => r.responseRate === 0);

  if (hasUnbalanced) {
    recommendations.push({
      type: 'balance',
      title: 'Unbalanced Feedback',
      description: 'Some relationship categories have no responses',
      actions: ['Target specific relationships', 'Ensure diverse perspectives']
    });
  }

  return recommendations;
}

// Utility functions

function calculateDaysElapsed(startDate, endDate = null) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function getLastActivity(invitation, submission) {
  const activities = [
  { type: 'invited', date: invitation.invited_at },
  { type: 'accessed', date: invitation.last_accessed_at },
  { type: 'reminded', date: invitation.reminder_sent_at },
  { type: 'completed', date: submission?.submitted_at || invitation.completed_at }].
  filter((a) => a.date);

  if (activities.length === 0) return null;

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activities[0];
}

function calculateEngagement(invitation, submission) {
  if (submission) return 'completed';
  if (invitation.status === 'cancelled') return 'cancelled';
  if (invitation.last_accessed_at) return 'engaged';
  if (invitation.reminder_sent_at) return 'reminded';
  return 'invited';
}

function isReminderEligible(invitation) {
  if (invitation.status !== 'pending') return false;

  const daysSinceInvite = calculateDaysElapsed(invitation.invited_at);
  if (daysSinceInvite < 3) return false;

  if (invitation.reminder_sent_at) {
    const daysSinceReminder = calculateDaysElapsed(invitation.reminder_sent_at);
    return daysSinceReminder >= 7;
  }

  return true;
}

function calculateCompleteness(submission) {
  let complete = 0;
  let total = 0;

  // Check ratings
  if (submission.ratings) {
    const expectedRatings = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    expectedRatings.forEach((trait) => {
      total++;
      if (submission.ratings[trait]) complete++;
    });
  }

  // Check qualitative feedback
  if (submission.qualitative_feedback) {
    total++;
    if (submission.qualitative_feedback.overallComments) complete++;
  }

  return total > 0 ? Math.round(complete / total * 100) : 0;
}

function calculateAverageResponseTime(invitations, submissions) {
  const responseTimes = [];

  submissions.forEach((sub) => {
    const invitation = invitations.find((i) => i.id === sub.invitation_id);
    if (invitation) {
      const days = calculateDaysElapsed(invitation.invited_at, sub.submitted_at);
      responseTimes.push(days);
    }
  });

  return responseTimes.length > 0 ?
  Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) :
  0;
}

function calculateCompletionVelocity(invitations, submissions) {
  if (submissions.length === 0) return 0;

  const sortedSubmissions = [...submissions].sort((a, b) =>
  new Date(a.submitted_at) - new Date(b.submitted_at)
  );

  const firstSubmission = new Date(sortedSubmissions[0].submitted_at);
  const lastSubmission = new Date(sortedSubmissions[sortedSubmissions.length - 1].submitted_at);
  const daySpan = Math.max(1, calculateDaysElapsed(firstSubmission, lastSubmission));

  return submissions.length / daySpan;
}

function calculateAverageConfidence(submissions) {
  const confidenceMap = {
    'very_confident': 4,
    'confident': 3,
    'somewhat_confident': 2,
    'not_confident': 1
  };

  const scores = submissions.
  map((s) => confidenceMap[s.confidence_level] || 2.5).
  filter((s) => s);

  return scores.length > 0 ?
  Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 25) // Convert to percentage
  : 0;
}

function calculateOverallCompleteness(submissions) {
  const completenessScores = submissions.map((s) => calculateCompleteness(s));

  return completenessScores.length > 0 ?
  Math.round(completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length) :
  0;
}

function calculateQualitativeFeedbackRate(submissions) {
  const withQualitative = submissions.filter((s) =>
  s.qualitative_feedback?.overallComments?.length > 50
  ).length;

  return submissions.length > 0 ?
  Math.round(withQualitative / submissions.length * 100) :
  0;
}

function calculateAccessRate(invitations) {
  const accessed = invitations.filter((i) => i.last_accessed_at).length;
  return invitations.length > 0 ?
  Math.round(accessed / invitations.length * 100) :
  0;
}

function calculateAbandonmentRate(invitations, submissions) {
  const accessed = invitations.filter((i) => i.last_accessed_at);
  const completed = submissions.length;
  const abandoned = accessed.length - completed;

  return accessed.length > 0 ?
  Math.round(abandoned / accessed.length * 100) / 100 :
  0;
}

function calculateReminderEffectiveness(invitations, submissions) {
  const reminded = invitations.filter((i) => i.reminder_sent_at);
  if (reminded.length === 0) return 0;

  const completedAfterReminder = reminded.filter((inv) => {
    const submission = submissions.find((s) => s.invitation_id === inv.id);
    return submission && new Date(submission.submitted_at) > new Date(inv.reminder_sent_at);
  }).length;

  return completedAfterReminder / reminded.length;
}

/**
 * @swagger
 * /api/assessments/{id}/rater-status:
 *   get:
 *     summary: Get detailed 360 feedback rater status
 *     description: Returns comprehensive status of all raters including progress, predictions, and recommendations
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
 *         description: Detailed rater status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasRequest:
 *                   type: boolean
 *                 raterStatus:
 *                   type: object
 *                 progress:
 *                   type: object
 *                 timeline:
 *                   type: array
 *                 predictions:
 *                   type: object
 *                 actions:
 *                   type: object
 */