import { APIError } from '../errors.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export class AnalyticsService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get analytics data with filters
   */
  async getAnalytics({
    organizationId,
    startDate,
    endDate,
    eventType,
    eventCategory,
    groupBy,
    metrics = ['count'],
  }) {
    // Default date range: last 30 days
    const end = endDate ? new Date(endDate) : endOfDay(new Date());
    const start = startDate ? new Date(startDate) : startOfDay(subDays(end, 30));

    // Build query
    let query = this.supabase
      .from('analytics_events')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (eventCategory) {
      query = query.eq('event_category', eventCategory);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new APIError('Failed to fetch analytics', 400, 'FETCH_ANALYTICS_ERROR', error);
    }

    // Process data based on groupBy and metrics
    const processed = this.processAnalyticsData(data, { groupBy, metrics, start, end });

    return {
      data: processed,
      summary: {
        total_events: count,
        date_range: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        filters: {
          event_type: eventType,
          event_category: eventCategory,
        },
      },
    };
  }

  /**
   * Track analytics event
   */
  async trackEvent({ eventType, eventCategory, eventData, organizationId }, userId) {
    const { error } = await this.supabase.from('analytics_events').insert({
      organization_id: organizationId,
      user_id: userId,
      event_type: eventType,
      event_category: eventCategory || 'general',
      event_data: eventData || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new APIError('Failed to track event', 400, 'TRACK_EVENT_ERROR', error);
    }

    return { message: 'Event tracked successfully' };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics({ organizationId, period = 'month', comparePrevious = false }) {
    const now = new Date();
    const { start, end, previousStart, previousEnd } = this.getPeriodDates(period, now);

    // Get current period metrics
    const currentMetrics = await this.getPeriodMetrics(organizationId, start, end);

    let comparison = null;
    if (comparePrevious) {
      const previousMetrics = await this.getPeriodMetrics(organizationId, previousStart, previousEnd);
      comparison = this.calculateComparison(currentMetrics, previousMetrics);
    }

    // Get top events
    const topEvents = await this.getTopEvents(organizationId, start, end, 10);

    // Get user activity
    const userActivity = await this.getUserActivity(organizationId, start, end);

    return {
      metrics: currentMetrics,
      comparison,
      top_events: topEvents,
      user_activity: userActivity,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: period,
      },
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics({ organizationId, startDate, endDate, format, includeRaw }) {
    const analytics = await this.getAnalytics({
      organizationId,
      startDate,
      endDate,
    });

    // Get additional summary data
    const summary = await this.getExportSummary(organizationId, startDate, endDate);

    const exportData = {
      organization_id: organizationId,
      date_range: {
        start: startDate,
        end: endDate,
      },
      summary,
      analytics: analytics.data,
      ...(includeRaw && { raw_events: analytics.raw }),
    };

    // Format based on requested type
    switch (format) {
      case 'csv':
        return this.formatAsCSV(exportData);
      case 'excel':
        return this.formatAsExcel(exportData);
      case 'json':
      default:
        return exportData;
    }
  }

  /**
   * Private helper methods
   */
  processAnalyticsData(data, { groupBy, metrics, start, end }) {
    if (!groupBy) {
      return this.calculateMetrics(data, metrics);
    }

    const grouped = {};

    switch (groupBy) {
      case 'day':
      case 'week':
      case 'month':
        return this.groupByTime(data, groupBy, metrics, start, end);
      
      case 'event_type':
        data.forEach(event => {
          const key = event.event_type;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(event);
        });
        break;
        
      case 'user':
        data.forEach(event => {
          const key = event.user_id || 'anonymous';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(event);
        });
        break;
    }

    // Calculate metrics for each group
    const result = {};
    Object.entries(grouped).forEach(([key, events]) => {
      result[key] = this.calculateMetrics(events, metrics);
    });

    return result;
  }

  calculateMetrics(events, metrics) {
    const result = {};

    if (metrics.includes('count')) {
      result.count = events.length;
    }

    if (metrics.includes('unique_users')) {
      const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean));
      result.unique_users = uniqueUsers.size;
    }

    if (metrics.includes('avg_time')) {
      const timings = events
        .map(e => e.event_data?.duration || e.event_data?.time_spent)
        .filter(t => typeof t === 'number');
      
      result.avg_time = timings.length > 0
        ? timings.reduce((a, b) => a + b, 0) / timings.length
        : 0;
    }

    return result;
  }

  groupByTime(data, period, metrics, start, end) {
    const result = [];
    const current = new Date(start);

    while (current <= end) {
      const periodStart = new Date(current);
      let periodEnd;

      switch (period) {
        case 'day':
          periodEnd = endOfDay(current);
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6);
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          current.setMonth(current.getMonth() + 1);
          break;
      }

      const periodEvents = data.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= periodStart && eventDate <= periodEnd;
      });

      result.push({
        period: format(periodStart, period === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM'),
        ...this.calculateMetrics(periodEvents, metrics),
      });
    }

    return result;
  }

  async getPeriodMetrics(organizationId, start, end) {
    const { data, error } = await this.supabase
      .from('analytics_events')
      .select('event_type, user_id, event_data')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      throw new APIError('Failed to fetch period metrics', 400, 'PERIOD_METRICS_ERROR', error);
    }

    const metrics = {
      total_events: data.length,
      unique_users: new Set(data.map(e => e.user_id).filter(Boolean)).size,
      events_by_type: {},
    };

    // Count events by type
    data.forEach(event => {
      if (!metrics.events_by_type[event.event_type]) {
        metrics.events_by_type[event.event_type] = 0;
      }
      metrics.events_by_type[event.event_type]++;
    });

    return metrics;
  }

  calculateComparison(current, previous) {
    const comparison = {};

    // Calculate percentage changes
    comparison.total_events = {
      current: current.total_events,
      previous: previous.total_events,
      change: previous.total_events > 0
        ? ((current.total_events - previous.total_events) / previous.total_events) * 100
        : 0,
    };

    comparison.unique_users = {
      current: current.unique_users,
      previous: previous.unique_users,
      change: previous.unique_users > 0
        ? ((current.unique_users - previous.unique_users) / previous.unique_users) * 100
        : 0,
    };

    return comparison;
  }

  async getTopEvents(organizationId, start, end, limit = 10) {
    const { data } = await this.supabase
      .from('analytics_events')
      .select('event_type')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const counts = {};
    data.forEach(event => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([event_type, count]) => ({ event_type, count }));
  }

  async getUserActivity(organizationId, start, end) {
    const { data } = await this.supabase
      .from('analytics_events')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .not('user_id', 'is', null);

    const activity = {};
    data.forEach(event => {
      const date = format(new Date(event.created_at), 'yyyy-MM-dd');
      if (!activity[date]) {
        activity[date] = new Set();
      }
      activity[date].add(event.user_id);
    });

    return Object.entries(activity).map(([date, users]) => ({
      date,
      active_users: users.size,
    }));
  }

  getPeriodDates(period, now) {
    let start, end, previousStart, previousEnd;

    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        previousStart = startOfDay(subDays(now, 1));
        previousEnd = endOfDay(subDays(now, 1));
        break;
      
      case 'week':
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        previousStart = startOfDay(subDays(now, 14));
        previousEnd = endOfDay(subDays(now, 7));
        break;
        
      case 'month':
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
        previousStart = startOfDay(subDays(now, 60));
        previousEnd = endOfDay(subDays(now, 30));
        break;
        
      case 'quarter':
        start = startOfDay(subDays(now, 90));
        end = endOfDay(now);
        previousStart = startOfDay(subDays(now, 180));
        previousEnd = endOfDay(subDays(now, 90));
        break;
        
      case 'year':
        start = startOfDay(subDays(now, 365));
        end = endOfDay(now);
        previousStart = startOfDay(subDays(now, 730));
        previousEnd = endOfDay(subDays(now, 365));
        break;
    }

    return { start, end, previousStart, previousEnd };
  }

  async getExportSummary(organizationId, startDate, endDate) {
    // Get organization details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name, created_at')
      .eq('id', organizationId)
      .single();

    // Get user count
    const { count: userCount } = await this.supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      organization_name: org?.name,
      organization_created: org?.created_at,
      total_users: userCount || 0,
      export_date: new Date().toISOString(),
    };
  }

  formatAsCSV(data) {
    // Simplified CSV formatting - in production, use a proper CSV library
    const headers = ['Date', 'Event Type', 'Event Category', 'User ID', 'Count'];
    const rows = [];

    if (data.analytics && Array.isArray(data.analytics)) {
      data.analytics.forEach(item => {
        rows.push([
          item.period || item.date || '',
          item.event_type || '',
          item.event_category || '',
          item.user_id || '',
          item.count || 0,
        ].join(','));
      });
    }

    return [headers.join(','), ...rows].join('\n');
  }

  formatAsExcel(data) {
    // In production, use a proper Excel library like xlsx
    // For now, return structured data that can be converted
    return {
      sheets: [
        {
          name: 'Summary',
          data: data.summary,
        },
        {
          name: 'Analytics',
          data: data.analytics,
        },
        ...(data.raw_events ? [{
          name: 'Raw Events',
          data: data.raw_events,
        }] : []),
      ],
    };
  }
}