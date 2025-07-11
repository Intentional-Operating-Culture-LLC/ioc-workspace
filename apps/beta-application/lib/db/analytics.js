import { createClient } from '@supabase/supabase-js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Track analytics event
 */
export async function trackEvent(eventData) {
  const { data, error } = await supabase
    .from('analytics_events')
    .insert(eventData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Track multiple events
 */
export async function trackEvents(events) {
  const { data, error } = await supabase
    .from('analytics_events')
    .insert(events)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(organizationId, dateRange = 30) {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, dateRange));

  // Get total events
  const { count: totalEvents } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Get unique users
  const { data: uniqueUsersData } = await supabase
    .from('analytics_events')
    .select('user_id')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const uniqueUsers = new Set(uniqueUsersData?.map(e => e.user_id).filter(Boolean)).size;

  // Get event types breakdown
  const { data: eventTypes } = await supabase
    .from('analytics_events')
    .select('event_type')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const eventTypeCount = {};
  eventTypes?.forEach(event => {
    eventTypeCount[event.event_type] = (eventTypeCount[event.event_type] || 0) + 1;
  });

  return {
    total_events: totalEvents || 0,
    unique_users: uniqueUsers,
    event_types: eventTypeCount,
    date_range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}

/**
 * Get events by type
 */
export async function getEventsByType(organizationId, eventType, options = {}) {
  const endDate = options.endDate ? new Date(options.endDate) : endOfDay(new Date());
  const startDate = options.startDate 
    ? new Date(options.startDate)
    : startOfDay(subDays(endDate, options.days || 30));

  let query = supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('event_type', eventType)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  // Apply pagination
  if (options.page && options.limit) {
    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { events: data, total: count };
}

/**
 * Get time series data
 */
export async function getTimeSeriesData(organizationId, options = {}) {
  const endDate = options.endDate ? new Date(options.endDate) : endOfDay(new Date());
  const startDate = options.startDate 
    ? new Date(options.startDate)
    : startOfDay(subDays(endDate, options.days || 30));

  const { data, error } = await supabase
    .from('analytics_events')
    .select('created_at, event_type')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by day
  const timeSeriesData = {};
  const eventTypeData = {};

  data.forEach(event => {
    const day = format(new Date(event.created_at), 'yyyy-MM-dd');
    
    // Overall count
    if (!timeSeriesData[day]) {
      timeSeriesData[day] = 0;
    }
    timeSeriesData[day]++;

    // By event type
    if (!eventTypeData[event.event_type]) {
      eventTypeData[event.event_type] = {};
    }
    if (!eventTypeData[event.event_type][day]) {
      eventTypeData[event.event_type][day] = 0;
    }
    eventTypeData[event.event_type][day]++;
  });

  return {
    overall: timeSeriesData,
    by_event_type: eventTypeData,
  };
}

/**
 * Get user engagement metrics
 */
export async function getUserEngagementMetrics(organizationId, options = {}) {
  const endDate = options.endDate ? new Date(options.endDate) : endOfDay(new Date());
  const startDate = options.startDate 
    ? new Date(options.startDate)
    : startOfDay(subDays(endDate, options.days || 30));

  // Get all events in date range
  const { data: events } = await supabase
    .from('analytics_events')
    .select('user_id, created_at, event_type')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('user_id', 'is', null);

  // Calculate metrics
  const userMetrics = {};
  const dailyActiveUsers = {};
  const retentionData = {};

  events?.forEach(event => {
    const userId = event.user_id;
    const day = format(new Date(event.created_at), 'yyyy-MM-dd');

    // User activity count
    if (!userMetrics[userId]) {
      userMetrics[userId] = {
        event_count: 0,
        days_active: new Set(),
        first_seen: event.created_at,
        last_seen: event.created_at,
      };
    }
    userMetrics[userId].event_count++;
    userMetrics[userId].days_active.add(day);
    userMetrics[userId].last_seen = event.created_at;

    // Daily active users
    if (!dailyActiveUsers[day]) {
      dailyActiveUsers[day] = new Set();
    }
    dailyActiveUsers[day].add(userId);
  });

  // Calculate engagement statistics
  const engagementStats = {
    total_users: Object.keys(userMetrics).length,
    avg_events_per_user: 0,
    avg_days_active: 0,
    daily_active_users: {},
    user_retention: {},
  };

  // Average events per user
  const totalEvents = Object.values(userMetrics).reduce((sum, user) => sum + user.event_count, 0);
  engagementStats.avg_events_per_user = engagementStats.total_users > 0 
    ? totalEvents / engagementStats.total_users 
    : 0;

  // Average days active
  const totalDaysActive = Object.values(userMetrics).reduce((sum, user) => sum + user.days_active.size, 0);
  engagementStats.avg_days_active = engagementStats.total_users > 0 
    ? totalDaysActive / engagementStats.total_users 
    : 0;

  // Convert daily active users to counts
  Object.entries(dailyActiveUsers).forEach(([day, users]) => {
    engagementStats.daily_active_users[day] = users.size;
  });

  return engagementStats;
}

/**
 * Get funnel analytics
 */
export async function getFunnelAnalytics(organizationId, funnelSteps, options = {}) {
  const endDate = options.endDate ? new Date(options.endDate) : endOfDay(new Date());
  const startDate = options.startDate 
    ? new Date(options.startDate)
    : startOfDay(subDays(endDate, options.days || 30));

  // Get all relevant events
  const { data: events } = await supabase
    .from('analytics_events')
    .select('user_id, event_type, created_at')
    .eq('organization_id', organizationId)
    .in('event_type', funnelSteps)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('user_id', 'is', null)
    .order('created_at', { ascending: true });

  // Track user progression through funnel
  const userProgression = {};
  
  events?.forEach(event => {
    const userId = event.user_id;
    const stepIndex = funnelSteps.indexOf(event.event_type);

    if (!userProgression[userId]) {
      userProgression[userId] = {
        steps_completed: new Set(),
        max_step: -1,
        timestamps: {},
      };
    }

    userProgression[userId].steps_completed.add(stepIndex);
    userProgression[userId].max_step = Math.max(userProgression[userId].max_step, stepIndex);
    userProgression[userId].timestamps[stepIndex] = event.created_at;
  });

  // Calculate funnel metrics
  const funnelMetrics = funnelSteps.map((step, index) => {
    const usersAtStep = Object.values(userProgression).filter(
      user => user.steps_completed.has(index)
    ).length;

    const usersCompletedStep = Object.values(userProgression).filter(
      user => user.max_step >= index
    ).length;

    return {
      step,
      step_index: index,
      users_reached: usersAtStep,
      users_completed: usersCompletedStep,
      conversion_rate: index === 0 ? 100 : 
        (usersCompletedStep / Object.keys(userProgression).length) * 100,
    };
  });

  // Calculate drop-off rates
  for (let i = 1; i < funnelMetrics.length; i++) {
    const previousStep = funnelMetrics[i - 1];
    const currentStep = funnelMetrics[i];
    currentStep.drop_off_rate = previousStep.users_completed > 0
      ? ((previousStep.users_completed - currentStep.users_completed) / previousStep.users_completed) * 100
      : 0;
  }

  return {
    funnel_steps: funnelSteps,
    metrics: funnelMetrics,
    total_users: Object.keys(userProgression).length,
    completed_funnel: Object.values(userProgression).filter(
      user => user.max_step === funnelSteps.length - 1
    ).length,
  };
}

/**
 * Get assessment analytics
 */
export async function getAssessmentAnalytics(organizationId, assessmentId = null) {
  let query = supabase
    .from('assessment_responses')
    .select(`
      *,
      assessment:assessments!inner(
        id,
        title,
        type,
        organization_id
      )
    `)
    .eq('assessment.organization_id', organizationId);

  if (assessmentId) {
    query = query.eq('assessment_id', assessmentId);
  }

  const { data: responses, error } = await query;

  if (error) throw error;

  // Calculate analytics
  const analytics = {
    total_responses: responses.length,
    completed: responses.filter(r => r.status === 'submitted').length,
    in_progress: responses.filter(r => r.status === 'in_progress').length,
    completion_rate: 0,
    avg_time_to_complete: 0,
    by_assessment: {},
  };

  if (analytics.total_responses > 0) {
    analytics.completion_rate = (analytics.completed / analytics.total_responses) * 100;
  }

  // Group by assessment
  responses.forEach(response => {
    const assessmentTitle = response.assessment.title;
    if (!analytics.by_assessment[assessmentTitle]) {
      analytics.by_assessment[assessmentTitle] = {
        total: 0,
        completed: 0,
        in_progress: 0,
      };
    }
    
    analytics.by_assessment[assessmentTitle].total++;
    if (response.status === 'submitted') {
      analytics.by_assessment[assessmentTitle].completed++;
    } else if (response.status === 'in_progress') {
      analytics.by_assessment[assessmentTitle].in_progress++;
    }
  });

  return analytics;
}

/**
 * Clean up old analytics data
 */
export async function cleanupOldAnalytics(daysToKeep = 90) {
  const cutoffDate = subDays(new Date(), daysToKeep);

  const { error } = await supabase
    .from('analytics_events')
    .delete()
    .lt('created_at', cutoffDate.toISOString());

  if (error) throw error;
  return true;
}