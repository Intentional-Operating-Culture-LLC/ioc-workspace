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
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type'); // 'lists' or 'subscriptions'

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

    if (type === 'lists') {
      // Get distribution lists
      const { data: distributionLists, error } = await supabase.
      from('report_distribution_lists').
      select(`
          *,
          created_by_user:users!report_distribution_lists_created_by_fkey(id, full_name, email),
          subscriptions:report_subscriptions(id, user_id, delivery_preferences)
        `).
      eq('organization_id', organizationId).
      eq('is_active', true).
      order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching distribution lists:', error);
        return NextResponse.json({ error: 'Failed to fetch distribution lists' }, { status: 500 });
      }

      return NextResponse.json({ distribution_lists: distributionLists });
    } else if (type === 'subscriptions') {
      // Get user subscriptions
      const { data: subscriptions, error } = await supabase.
      from('report_subscriptions').
      select(`
          *,
          template:report_templates(id, name, description, template_type),
          distribution_list:report_distribution_lists(id, name, description)
        `).
      eq('user_id', user.id).
      eq('is_active', true).
      order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
      }

      return NextResponse.json({ subscriptions });
    } else {
      // Get delivery history
      const reportId = searchParams.get('reportId');
      let query = supabase.
      from('report_delivery_history').
      select(`
          *,
          recipient:users!report_delivery_history_recipient_id_fkey(id, full_name, email),
          report:report_instances!report_delivery_history_report_instance_id_fkey(id, title)
        `).
      order('delivery_timestamp', { ascending: false });

      if (reportId) {
        query = query.eq('report_instance_id', reportId);
      }

      const { data: deliveryHistory, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching delivery history:', error);
        return NextResponse.json({ error: 'Failed to fetch delivery history' }, { status: 500 });
      }

      return NextResponse.json({ delivery_history: deliveryHistory });
    }

  } catch (error) {
    console.error('Error in distribution API:', error);
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
    const { action, organizationId } = body;

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

    switch (action) {
      case 'create_distribution_list':
        return await createDistributionList(supabase, body, user.id);

      case 'subscribe':
        return await createSubscription(supabase, body, user.id);

      case 'unsubscribe':
        return await removeSubscription(supabase, body, user.id);

      case 'send_report':
        return await sendReport(supabase, body, user.id);

      case 'schedule_distribution':
        return await scheduleDistribution(supabase, body, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in distribution action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create distribution list
async function createDistributionList(supabase, data, userId) {
  const {
    name,
    description,
    organizationId,
    distributionChannels,
    subscribers,
    scheduleConfiguration
  } = data;

  const { data: distributionList, error } = await supabase.
  from('report_distribution_lists').
  insert({
    name,
    description,
    organization_id: organizationId,
    distribution_channels: distributionChannels || ['email'],
    subscribers: subscribers || [],
    schedule_configuration: scheduleConfiguration || {},
    created_by: userId
  }).
  select().
  single();

  if (error) {
    console.error('Error creating distribution list:', error);
    return NextResponse.json({ error: 'Failed to create distribution list' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'distribution_list_created',
    event_category: 'reports',
    event_data: {
      distribution_list_id: distributionList.id,
      name,
      channels: distributionChannels
    },
    user_id: userId,
    organization_id: organizationId
  });

  return NextResponse.json({
    distribution_list: distributionList,
    message: 'Distribution list created successfully'
  });
}

// Create subscription
async function createSubscription(supabase, data, userId) {
  const {
    templateId,
    distributionListId,
    subscriptionType,
    deliveryPreferences
  } = data;

  const { data: subscription, error } = await supabase.
  from('report_subscriptions').
  insert({
    user_id: userId,
    template_id: templateId || null,
    distribution_list_id: distributionListId || null,
    subscription_type: subscriptionType,
    delivery_preferences: deliveryPreferences || {}
  }).
  select().
  single();

  if (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'report_subscription_created',
    event_category: 'reports',
    event_data: {
      subscription_id: subscription.id,
      template_id: templateId,
      distribution_list_id: distributionListId,
      subscription_type: subscriptionType
    },
    user_id: userId
  });

  return NextResponse.json({
    subscription,
    message: 'Subscription created successfully'
  });
}

// Remove subscription
async function removeSubscription(supabase, data, userId) {
  const { subscriptionId } = data;

  const { error } = await supabase.
  from('report_subscriptions').
  update({ is_active: false }).
  eq('id', subscriptionId).
  eq('user_id', userId);

  if (error) {
    console.error('Error removing subscription:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'report_subscription_removed',
    event_category: 'reports',
    event_data: {
      subscription_id: subscriptionId
    },
    user_id: userId
  });

  return NextResponse.json({
    message: 'Subscription removed successfully'
  });
}

// Send report
async function sendReport(supabase, data, userId) {
  const {
    reportId,
    organizationId,
    distributionListId,
    channels,
    customRecipients
  } = data;

  // Get report instance
  const { data: report } = await supabase.
  from('report_instances').
  select('*').
  eq('id', reportId).
  eq('organization_id', organizationId).
  single();

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Get distribution list if specified
  let recipients = [];
  if (distributionListId) {
    const { data: distributionList } = await supabase.
    from('report_distribution_lists').
    select('*').
    eq('id', distributionListId).
    single();

    if (distributionList) {
      recipients = distributionList.subscribers || [];
    }
  }

  // Add custom recipients
  if (customRecipients) {
    recipients = [...recipients, ...customRecipients];
  }

  // Send to each channel
  const deliveryResults = [];
  for (const channel of channels || ['email']) {
    for (const recipient of recipients) {
      try {
        const deliveryResult = await deliverReport(supabase, report, recipient, channel, userId);
        deliveryResults.push(deliveryResult);
      } catch (error) {
        console.error(`Error delivering to ${recipient} via ${channel}:`, error);
        deliveryResults.push({
          recipient,
          channel,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'report_distributed',
    event_category: 'reports',
    event_data: {
      report_id: reportId,
      distribution_list_id: distributionListId,
      channels,
      recipient_count: recipients.length,
      delivery_results: deliveryResults
    },
    user_id: userId,
    organization_id: organizationId
  });

  return NextResponse.json({
    message: 'Report sent successfully',
    delivery_results: deliveryResults
  });
}

// Schedule distribution
async function scheduleDistribution(supabase, data, userId) {
  const {
    templateId,
    organizationId,
    distributionListId,
    schedule,
    channels
  } = data;

  // Update distribution list with schedule
  const { error } = await supabase.
  from('report_distribution_lists').
  update({
    schedule_configuration: {
      template_id: templateId,
      schedule,
      channels: channels || ['email'],
      enabled: true,
      created_by: userId
    }
  }).
  eq('id', distributionListId);

  if (error) {
    console.error('Error scheduling distribution:', error);
    return NextResponse.json({ error: 'Failed to schedule distribution' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'distribution_scheduled',
    event_category: 'reports',
    event_data: {
      template_id: templateId,
      distribution_list_id: distributionListId,
      schedule,
      channels
    },
    user_id: userId,
    organization_id: organizationId
  });

  return NextResponse.json({
    message: 'Distribution scheduled successfully'
  });
}

// Deliver report to recipient
async function deliverReport(supabase, report, recipient, channel, userId) {
  const deliveryRecord = {
    report_instance_id: report.id,
    delivery_channel: channel,
    recipient_address: recipient.email || recipient.address,
    recipient_id: recipient.user_id || null,
    delivery_status: 'sent',
    delivery_timestamp: new Date().toISOString()
  };

  try {
    switch (channel) {
      case 'email':
        await deliverViaEmail(report, recipient);
        break;

      case 'slack':
        await deliverViaSlack(report, recipient);
        break;

      case 'webhook':
        await deliverViaWebhook(report, recipient);
        break;

      default:
        throw new Error(`Unsupported delivery channel: ${channel}`);
    }

    deliveryRecord.delivery_status = 'delivered';
  } catch (error) {
    deliveryRecord.delivery_status = 'failed';
    deliveryRecord.error_message = error.message;
  }

  // Record delivery
  await supabase.
  from('report_delivery_history').
  insert(deliveryRecord);

  return {
    recipient: recipient.email || recipient.address,
    channel,
    status: deliveryRecord.delivery_status,
    error: deliveryRecord.error_message
  };
}

// Email delivery
async function deliverViaEmail(report, recipient) {
  // Implementation would use email service (SendGrid, AWS SES, etc.)
  console.log(`Delivering report ${report.id} to ${recipient.email} via email`);

  // For now, just simulate delivery
  // In production, this would:
  // 1. Generate HTML email template
  // 2. Attach PDF if requested
  // 3. Send via email service
  // 4. Handle bounce/delivery tracking
}

// Slack delivery
async function deliverViaSlack(report, recipient) {
  // Implementation would use Slack API
  console.log(`Delivering report ${report.id} to ${recipient.slack_channel} via Slack`);

  // For now, just simulate delivery
  // In production, this would:
  // 1. Format report for Slack
  // 2. Send via Slack API
  // 3. Handle delivery confirmation
}

// Webhook delivery
async function deliverViaWebhook(report, recipient) {
  // Implementation would POST to webhook URL
  console.log(`Delivering report ${report.id} to ${recipient.webhook_url} via webhook`);

  // For now, just simulate delivery
  // In production, this would:
  // 1. Format report as JSON
  // 2. POST to webhook URL
  // 3. Handle response and retries
}

export async function PUT(request) {
  try {
    const supabase = await createAppDirectoryClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, organizationId } = body;

    switch (action) {
      case 'update_distribution_list':
        return await updateDistributionList(supabase, body, user.id);

      case 'update_subscription':
        return await updateSubscription(supabase, body, user.id);

      case 'mark_as_read':
        return await markAsRead(supabase, body, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in distribution update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update distribution list
async function updateDistributionList(supabase, data, userId) {
  const {
    distributionListId,
    name,
    description,
    distributionChannels,
    subscribers,
    scheduleConfiguration
  } = data;

  const { data: distributionList, error } = await supabase.
  from('report_distribution_lists').
  update({
    name,
    description,
    distribution_channels: distributionChannels,
    subscribers: subscribers,
    schedule_configuration: scheduleConfiguration
  }).
  eq('id', distributionListId).
  select().
  single();

  if (error) {
    console.error('Error updating distribution list:', error);
    return NextResponse.json({ error: 'Failed to update distribution list' }, { status: 500 });
  }

  return NextResponse.json({
    distribution_list: distributionList,
    message: 'Distribution list updated successfully'
  });
}

// Update subscription
async function updateSubscription(supabase, data, userId) {
  const { subscriptionId, deliveryPreferences } = data;

  const { data: subscription, error } = await supabase.
  from('report_subscriptions').
  update({
    delivery_preferences: deliveryPreferences
  }).
  eq('id', subscriptionId).
  eq('user_id', userId).
  select().
  single();

  if (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }

  return NextResponse.json({
    subscription,
    message: 'Subscription updated successfully'
  });
}

// Mark report as read
async function markAsRead(supabase, data, userId) {
  const { reportId, deliveryId } = data;

  const { error } = await supabase.
  from('report_delivery_history').
  update({
    read_timestamp: new Date().toISOString(),
    engagement_data: {
      read_by: userId,
      read_at: new Date().toISOString()
    }
  }).
  eq('id', deliveryId);

  if (error) {
    console.error('Error marking as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Marked as read successfully'
  });
}