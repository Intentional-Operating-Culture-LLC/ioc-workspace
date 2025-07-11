import { NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createAppDirectoryClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const organizationId = searchParams.get('organizationId');

    // Verify user has access to organization
    const { data: userOrg } = await supabase.
    from('user_organizations').
    select('*').
    eq('user_id', user.id).
    eq('organization_id', organizationId).
    eq('is_active', true).
    single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get workflow steps
    const { data: workflowSteps, error } = await supabase.
    from('report_editorial_workflow').
    select(`
        *,
        assignee:users!report_editorial_workflow_assignee_id_fkey(id, full_name, email),
        report:report_instances!report_editorial_workflow_report_instance_id_fkey(id, title, status)
      `).
    eq('report_instance_id', reportId).
    order('created_at');

    if (error) {
      console.error('Error fetching workflow steps:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
    }

    // Get comments for this report
    const { data: comments } = await supabase.
    from('report_comments').
    select(`
        *,
        user:users!report_comments_user_id_fkey(id, full_name, email),
        resolved_by_user:users!report_comments_resolved_by_fkey(id, full_name, email)
      `).
    eq('report_instance_id', reportId).
    order('created_at', { ascending: false });

    return NextResponse.json({
      workflow_steps: workflowSteps,
      comments: comments || []
    });

  } catch (error) {
    console.error('Error in workflow API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createAppDirectoryClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      reportId,
      organizationId,
      action,
      stepId,
      assigneeId,
      notes,
      dueDate
    } = body;

    // Verify user has access to organization
    const { data: userOrg } = await supabase.
    from('user_organizations').
    select('*').
    eq('user_id', user.id).
    eq('organization_id', organizationId).
    eq('is_active', true).
    single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle different workflow actions
    switch (action) {
      case 'advance_step':
        return await advanceWorkflowStep(supabase, reportId, stepId, user.id, notes);

      case 'reject_step':
        return await rejectWorkflowStep(supabase, reportId, stepId, user.id, notes);

      case 'assign_step':
        return await assignWorkflowStep(supabase, stepId, assigneeId, user.id, dueDate);

      case 'add_comment':
        return await addWorkflowComment(supabase, reportId, body, user.id);

      case 'resolve_comment':
        return await resolveWorkflowComment(supabase, body.commentId, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in workflow action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Advance workflow step
async function advanceWorkflowStep(supabase, reportId, stepId, userId, notes) {
  // Get current step
  const { data: currentStep } = await supabase.
  from('report_editorial_workflow').
  select('*').
  eq('id', stepId).
  single();

  if (!currentStep) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Update current step
  const { error: updateError } = await supabase.
  from('report_editorial_workflow').
  update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    notes: notes || null
  }).
  eq('id', stepId);

  if (updateError) {
    console.error('Error updating step:', updateError);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }

  // Advance to next step
  const nextStepMap = {
    'draft': 'review',
    'review': 'approval',
    'approval': 'publish'
  };

  const nextStepType = nextStepMap[currentStep.step_type];

  if (nextStepType) {
    // Update next step status
    const { error: nextStepError } = await supabase.
    from('report_editorial_workflow').
    update({ status: 'in_progress' }).
    eq('report_instance_id', reportId).
    eq('step_type', nextStepType);

    if (nextStepError) {
      console.error('Error advancing to next step:', nextStepError);
    }
  }

  // Update report status based on workflow stage
  const statusMap = {
    'review': 'review',
    'approval': 'approved',
    'publish': 'published'
  };

  const newReportStatus = statusMap[nextStepType] || currentStep.step_type;

  await supabase.
  from('report_instances').
  update({
    status: newReportStatus,
    published_at: nextStepType === 'publish' ? new Date().toISOString() : null
  }).
  eq('id', reportId);

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'workflow_step_completed',
    event_category: 'reports',
    event_data: {
      report_id: reportId,
      step_id: stepId,
      step_type: currentStep.step_type,
      next_step_type: nextStepType,
      completed_by: userId
    },
    user_id: userId,
    organization_id: currentStep.organization_id
  });

  return NextResponse.json({
    message: 'Step advanced successfully',
    next_step: nextStepType
  });
}

// Reject workflow step
async function rejectWorkflowStep(supabase, reportId, stepId, userId, notes) {
  // Get current step
  const { data: currentStep } = await supabase.
  from('report_editorial_workflow').
  select('*').
  eq('id', stepId).
  single();

  if (!currentStep) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Update current step
  const { error: updateError } = await supabase.
  from('report_editorial_workflow').
  update({
    status: 'rejected',
    notes: notes || null
  }).
  eq('id', stepId);

  if (updateError) {
    console.error('Error rejecting step:', updateError);
    return NextResponse.json({ error: 'Failed to reject step' }, { status: 500 });
  }

  // Reset to draft stage
  await supabase.
  from('report_editorial_workflow').
  update({ status: 'in_progress' }).
  eq('report_instance_id', reportId).
  eq('step_type', 'draft');

  // Update report status
  await supabase.
  from('report_instances').
  update({ status: 'draft' }).
  eq('id', reportId);

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'workflow_step_rejected',
    event_category: 'reports',
    event_data: {
      report_id: reportId,
      step_id: stepId,
      step_type: currentStep.step_type,
      rejected_by: userId,
      notes: notes
    },
    user_id: userId,
    organization_id: currentStep.organization_id
  });

  return NextResponse.json({
    message: 'Step rejected successfully'
  });
}

// Assign workflow step
async function assignWorkflowStep(supabase, stepId, assigneeId, userId, dueDate) {
  const { error: assignError } = await supabase.
  from('report_editorial_workflow').
  update({
    assignee_id: assigneeId,
    due_date: dueDate || null
  }).
  eq('id', stepId);

  if (assignError) {
    console.error('Error assigning step:', assignError);
    return NextResponse.json({ error: 'Failed to assign step' }, { status: 500 });
  }

  // Log activity
  const { data: step } = await supabase.
  from('report_editorial_workflow').
  select('*').
  eq('id', stepId).
  single();

  if (step) {
    await supabase.
    from('analytics_events').
    insert({
      event_type: 'workflow_step_assigned',
      event_category: 'reports',
      event_data: {
        step_id: stepId,
        assignee_id: assigneeId,
        assigned_by: userId,
        due_date: dueDate
      },
      user_id: userId,
      organization_id: step.organization_id
    });
  }

  return NextResponse.json({
    message: 'Step assigned successfully'
  });
}

// Add workflow comment
async function addWorkflowComment(supabase, reportId, commentData, userId) {
  const { sectionId, commentText, commentType } = commentData;

  const { data: comment, error: commentError } = await supabase.
  from('report_comments').
  insert({
    report_instance_id: reportId,
    section_id: sectionId || null,
    user_id: userId,
    comment_text: commentText,
    comment_type: commentType || 'general'
  }).
  select(`
      *,
      user:users!report_comments_user_id_fkey(id, full_name, email)
    `).
  single();

  if (commentError) {
    console.error('Error adding comment:', commentError);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'workflow_comment_added',
    event_category: 'reports',
    event_data: {
      report_id: reportId,
      comment_id: comment.id,
      comment_type: commentType,
      section_id: sectionId
    },
    user_id: userId
  });

  return NextResponse.json({
    comment,
    message: 'Comment added successfully'
  });
}

// Resolve workflow comment
async function resolveWorkflowComment(supabase, commentId, userId) {
  const { error: resolveError } = await supabase.
  from('report_comments').
  update({
    is_resolved: true,
    resolved_by: userId,
    resolved_at: new Date().toISOString()
  }).
  eq('id', commentId);

  if (resolveError) {
    console.error('Error resolving comment:', resolveError);
    return NextResponse.json({ error: 'Failed to resolve comment' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'workflow_comment_resolved',
    event_category: 'reports',
    event_data: {
      comment_id: commentId,
      resolved_by: userId
    },
    user_id: userId
  });

  return NextResponse.json({
    message: 'Comment resolved successfully'
  });
}

// Get workflow status for multiple reports
export async function PUT(request) {
  try {
    const supabase = await createAppDirectoryClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportIds, organizationId } = body;

    // Verify user has access to organization
    const { data: userOrg } = await supabase.
    from('user_organizations').
    select('*').
    eq('user_id', user.id).
    eq('organization_id', organizationId).
    eq('is_active', true).
    single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get workflow status for multiple reports
    const { data: workflowStatus, error } = await supabase.
    from('report_editorial_workflow').
    select(`
        report_instance_id,
        step_type,
        status,
        assignee_id,
        due_date,
        completed_at,
        assignee:users!report_editorial_workflow_assignee_id_fkey(id, full_name, email)
      `).
    in('report_instance_id', reportIds).
    order('report_instance_id, created_at');

    if (error) {
      console.error('Error fetching workflow status:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow status' }, { status: 500 });
    }

    // Group by report ID
    const statusByReport = {};
    workflowStatus?.forEach((step) => {
      if (!statusByReport[step.report_instance_id]) {
        statusByReport[step.report_instance_id] = [];
      }
      statusByReport[step.report_instance_id].push(step);
    });

    return NextResponse.json({
      workflow_status: statusByReport
    });

  } catch (error) {
    console.error('Error in bulk workflow status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}