import { NextRequest } from 'next/server';
import { withResponseOptimization } from "@ioc/shared/data-access/api/middleware/performance";
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";

/**
 * Optimized analytics endpoint with caching and compression
 */
export const GET = withResponseOptimization(
  async (req) => {
    const supabase = await createAppDirectoryClient();
    const url = new URL(req.url);

    // Extract query parameters
    const organizationId = url.searchParams.get('organizationId');
    const dateFrom = url.searchParams.get('from');
    const dateTo = url.searchParams.get('to');
    const metric = url.searchParams.get('metric');

    // Build query
    let query = supabase.
    from('analytics_events').
    select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (metric) {
      query = query.eq('event_type', metric);
    }

    // Execute query
    const { data, error } = await query.
    order('created_at', { ascending: false }).
    limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process analytics data
    const analytics = processAnalyticsData(data);

    return NextResponse.json(analytics);
  },
  {
    enableCompression: true,
    enableCaching: true,
    cacheConfig: {
      ttl: 300000, // 5 minutes
      staleWhileRevalidate: 600000 // 10 minutes
    },
    enableFieldFiltering: true,
    enablePagination: true
  }
);

/**
 * Process raw analytics data into aggregated metrics
 */
function processAnalyticsData(events) {
  const metrics = {
    totalEvents: events.length,
    eventsByType: {},
    eventsByCategory: {},
    timeSeriesData: [],
    topUsers: [],
    summary: {}
  };

  // Group by event type
  events.forEach((event) => {
    metrics.eventsByType[event.event_type] = (metrics.eventsByType[event.event_type] || 0) + 1;
    metrics.eventsByCategory[event.event_category] = (metrics.eventsByCategory[event.event_category] || 0) + 1;
  });

  // Create time series data
  const timeGroups = groupByTime(events, 'hour');
  metrics.timeSeriesData = Object.entries(timeGroups).map(([time, events]) => ({
    time,
    count: events.length,
    types: countEventTypes(events)
  }));

  // Find top users
  const userActivity = {};
  events.forEach((event) => {
    if (event.user_id) {
      userActivity[event.user_id] = (userActivity[event.user_id] || 0) + 1;
    }
  });

  metrics.topUsers = Object.entries(userActivity).
  sort(([, a], [, b]) => b - a).
  slice(0, 10).
  map(([userId, count]) => ({ userId, count }));

  // Summary statistics
  metrics.summary = {
    averageEventsPerHour: metrics.totalEvents / 24,
    mostCommonEvent: Object.entries(metrics.eventsByType).
    sort(([, a], [, b]) => b - a)[0]?.[0],
    uniqueUsers: new Set(events.map((e) => e.user_id).filter(Boolean)).size
  };

  return metrics;
}

/**
 * Group events by time period
 */
function groupByTime(events, period = 'hour') {
  const groups = {};

  events.forEach((event) => {
    const date = new Date(event.created_at);
    let key;

    switch (period) {
      case 'hour':
        key = `${date.toISOString().slice(0, 13)}:00`;
        break;
      case 'day':
        key = date.toISOString().slice(0, 10);
        break;
      case 'week':
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
        break;
      default:
        key = date.toISOString();
    }

    groups[key] = groups[key] || [];
    groups[key].push(event);
  });

  return groups;
}

/**
 * Count event types in array
 */
function countEventTypes(events) {
  const counts = {};
  events.forEach((event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
  });
  return counts;
}

/**
 * Get week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}