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
    const reportId = searchParams.get('reportId');
    const timeRange = searchParams.get('timeRange') || '30d';
    const metricType = searchParams.get('metricType') || 'all';

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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    if (reportId) {
      // Get analytics for specific report
      return await getReportAnalytics(supabase, reportId, startDate, endDate);
    } else {
      // Get overall analytics
      return await getOverallAnalytics(supabase, organizationId, startDate, endDate, metricType);
    }

  } catch (error) {
    console.error('Error in analytics API:', error);
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
      case 'track_engagement':
        return await trackEngagement(supabase, body, user.id);

      case 'submit_feedback':
        return await submitFeedback(supabase, body, user.id);

      case 'generate_insights':
        return await generateAnalyticsInsights(supabase, body, organizationId);

      case 'export_analytics':
        return await exportAnalytics(supabase, body, organizationId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in analytics action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get analytics for specific report
async function getReportAnalytics(supabase, reportId, startDate, endDate) {
  // Get report basic info
  const { data: report } = await supabase.
  from('report_instances').
  select('*').
  eq('id', reportId).
  single();

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Get delivery analytics
  const { data: deliveryData } = await supabase.
  from('report_delivery_history').
  select('*').
  eq('report_instance_id', reportId).
  gte('delivery_timestamp', startDate.toISOString()).
  lte('delivery_timestamp', endDate.toISOString());

  // Get engagement analytics
  const { data: analyticsData } = await supabase.
  from('report_analytics').
  select('*').
  eq('report_instance_id', reportId).
  gte('recorded_at', startDate.toISOString()).
  lte('recorded_at', endDate.toISOString());

  // Get feedback data
  const { data: feedbackData } = await supabase.
  from('report_feedback').
  select('*').
  eq('report_instance_id', reportId).
  gte('created_at', startDate.toISOString()).
  lte('created_at', endDate.toISOString());

  // Process analytics
  const analytics = processReportAnalytics(report, deliveryData, analyticsData, feedbackData);

  return NextResponse.json({
    report_analytics: analytics
  });
}

// Get overall analytics
async function getOverallAnalytics(supabase, organizationId, startDate, endDate, metricType) {
  const analytics = {};

  // Get report generation metrics
  const { data: reportMetrics } = await supabase.
  from('report_instances').
  select('id, status, created_at, generated_at, published_at, template_id').
  eq('organization_id', organizationId).
  gte('created_at', startDate.toISOString()).
  lte('created_at', endDate.toISOString());

  // Get delivery metrics
  const { data: deliveryMetrics } = await supabase.
  from('report_delivery_history').
  select('*').
  gte('delivery_timestamp', startDate.toISOString()).
  lte('delivery_timestamp', endDate.toISOString());

  // Get engagement metrics
  const { data: engagementMetrics } = await supabase.
  from('report_analytics').
  select('*').
  gte('recorded_at', startDate.toISOString()).
  lte('recorded_at', endDate.toISOString());

  // Get feedback metrics
  const { data: feedbackMetrics } = await supabase.
  from('report_feedback').
  select('*').
  gte('created_at', startDate.toISOString()).
  lte('created_at', endDate.toISOString());

  // Process overall analytics
  if (metricType === 'all' || metricType === 'generation') {
    analytics.generation = processGenerationMetrics(reportMetrics);
  }

  if (metricType === 'all' || metricType === 'delivery') {
    analytics.delivery = processDeliveryMetrics(deliveryMetrics);
  }

  if (metricType === 'all' || metricType === 'engagement') {
    analytics.engagement = processEngagementMetrics(engagementMetrics);
  }

  if (metricType === 'all' || metricType === 'feedback') {
    analytics.feedback = processFeedbackMetrics(feedbackMetrics);
  }

  // Get template performance
  if (metricType === 'all' || metricType === 'templates') {
    analytics.template_performance = await getTemplatePerformance(supabase, organizationId, startDate, endDate);
  }

  return NextResponse.json({
    overall_analytics: analytics,
    time_range: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  });
}

// Track engagement
async function trackEngagement(supabase, data, userId) {
  const {
    reportId,
    metricName,
    metricValue,
    metricData,
    engagementType
  } = data;

  // Record analytics event
  const { error: analyticsError } = await supabase.
  from('report_analytics').
  insert({
    report_instance_id: reportId,
    metric_name: metricName,
    metric_value: metricValue,
    metric_data: metricData || {}
  });

  if (analyticsError) {
    console.error('Error tracking engagement:', analyticsError);
    return NextResponse.json({ error: 'Failed to track engagement' }, { status: 500 });
  }

  // Update delivery history if applicable
  if (engagementType === 'read' && data.deliveryId) {
    await supabase.
    from('report_delivery_history').
    update({
      read_timestamp: new Date().toISOString(),
      engagement_data: {
        ...metricData,
        read_by: userId
      }
    }).
    eq('id', data.deliveryId);
  }

  return NextResponse.json({
    message: 'Engagement tracked successfully'
  });
}

// Submit feedback
async function submitFeedback(supabase, data, userId) {
  const {
    reportId,
    sectionId,
    feedbackType,
    rating,
    feedbackText,
    isAnonymous
  } = data;

  const { data: feedback, error } = await supabase.
  from('report_feedback').
  insert({
    report_instance_id: reportId,
    section_id: sectionId,
    user_id: userId,
    feedback_type: feedbackType,
    rating: rating,
    feedback_text: feedbackText,
    is_anonymous: isAnonymous || false
  }).
  select().
  single();

  if (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  // Log activity
  await supabase.
  from('analytics_events').
  insert({
    event_type: 'report_feedback_submitted',
    event_category: 'reports',
    event_data: {
      report_id: reportId,
      feedback_id: feedback.id,
      feedback_type: feedbackType,
      rating: rating,
      section_id: sectionId
    },
    user_id: userId
  });

  return NextResponse.json({
    feedback,
    message: 'Feedback submitted successfully'
  });
}

// Generate analytics insights
async function generateAnalyticsInsights(supabase, data, organizationId) {
  const { timeRange, focusArea } = data;

  // Get relevant data for insights
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

  const insights = [];

  // Report generation insights
  const { data: reportData } = await supabase.
  from('report_instances').
  select('*').
  eq('organization_id', organizationId).
  gte('created_at', startDate.toISOString());

  if (reportData && reportData.length > 0) {
    const generationInsights = analyzeGenerationPatterns(reportData);
    insights.push(...generationInsights);
  }

  // Delivery insights
  const { data: deliveryData } = await supabase.
  from('report_delivery_history').
  select('*').
  gte('delivery_timestamp', startDate.toISOString());

  if (deliveryData && deliveryData.length > 0) {
    const deliveryInsights = analyzeDeliveryPatterns(deliveryData);
    insights.push(...deliveryInsights);
  }

  // Engagement insights
  const { data: engagementData } = await supabase.
  from('report_analytics').
  select('*').
  gte('recorded_at', startDate.toISOString());

  if (engagementData && engagementData.length > 0) {
    const engagementInsights = analyzeEngagementPatterns(engagementData);
    insights.push(...engagementInsights);
  }

  // Feedback insights
  const { data: feedbackData } = await supabase.
  from('report_feedback').
  select('*').
  gte('created_at', startDate.toISOString());

  if (feedbackData && feedbackData.length > 0) {
    const feedbackInsights = analyzeFeedbackPatterns(feedbackData);
    insights.push(...feedbackInsights);
  }

  return NextResponse.json({
    insights: insights.sort((a, b) => b.priority - a.priority),
    generated_at: new Date().toISOString()
  });
}

// Export analytics
async function exportAnalytics(supabase, data, organizationId) {
  const { format, timeRange, includeDetails } = data;

  // Get all analytics data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

  const exportData = {};

  // Get reports
  const { data: reports } = await supabase.
  from('report_instances').
  select('*').
  eq('organization_id', organizationId).
  gte('created_at', startDate.toISOString());

  exportData.reports = reports;

  // Get delivery data
  const { data: deliveries } = await supabase.
  from('report_delivery_history').
  select('*').
  gte('delivery_timestamp', startDate.toISOString());

  exportData.deliveries = deliveries;

  // Get analytics data
  const { data: analytics } = await supabase.
  from('report_analytics').
  select('*').
  gte('recorded_at', startDate.toISOString());

  exportData.analytics = analytics;

  // Get feedback data
  const { data: feedback } = await supabase.
  from('report_feedback').
  select('*').
  gte('created_at', startDate.toISOString());

  exportData.feedback = feedback;

  // Format data based on requested format
  let formattedData;
  switch (format) {
    case 'csv':
      formattedData = formatAsCSV(exportData);
      break;
    case 'json':
      formattedData = JSON.stringify(exportData, null, 2);
      break;
    case 'xlsx':
      formattedData = formatAsExcel(exportData);
      break;
    default:
      formattedData = exportData;
  }

  return NextResponse.json({
    export_data: formattedData,
    exported_at: new Date().toISOString(),
    format,
    time_range: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  });
}

// Helper functions for processing analytics
function processReportAnalytics(report, deliveryData, analyticsData, feedbackData) {
  const analytics = {
    report_id: report.id,
    report_title: report.title,
    created_at: report.created_at,
    generated_at: report.generated_at,
    published_at: report.published_at,
    status: report.status
  };

  // Delivery analytics
  if (deliveryData && deliveryData.length > 0) {
    analytics.delivery = {
      total_deliveries: deliveryData.length,
      successful_deliveries: deliveryData.filter((d) => d.delivery_status === 'delivered').length,
      failed_deliveries: deliveryData.filter((d) => d.delivery_status === 'failed').length,
      read_count: deliveryData.filter((d) => d.read_timestamp).length,
      channels: [...new Set(deliveryData.map((d) => d.delivery_channel))],
      delivery_rate: deliveryData.filter((d) => d.delivery_status === 'delivered').length / deliveryData.length * 100,
      read_rate: deliveryData.filter((d) => d.read_timestamp).length / deliveryData.length * 100
    };
  }

  // Engagement analytics
  if (analyticsData && analyticsData.length > 0) {
    analytics.engagement = {
      total_interactions: analyticsData.length,
      unique_metrics: [...new Set(analyticsData.map((a) => a.metric_name))],
      average_engagement_time: calculateAverageEngagementTime(analyticsData),
      top_sections: getTopSections(analyticsData)
    };
  }

  // Feedback analytics
  if (feedbackData && feedbackData.length > 0) {
    analytics.feedback = {
      total_feedback: feedbackData.length,
      average_rating: feedbackData.filter((f) => f.rating).reduce((sum, f) => sum + f.rating, 0) / feedbackData.filter((f) => f.rating).length,
      feedback_types: [...new Set(feedbackData.map((f) => f.feedback_type))],
      section_feedback: groupFeedbackBySection(feedbackData)
    };
  }

  return analytics;
}

function processGenerationMetrics(reportMetrics) {
  if (!reportMetrics || reportMetrics.length === 0) return {};

  return {
    total_reports: reportMetrics.length,
    status_breakdown: getStatusBreakdown(reportMetrics),
    generation_time: calculateAverageGenerationTime(reportMetrics),
    completion_rate: reportMetrics.filter((r) => r.status === 'published').length / reportMetrics.length * 100,
    templates_used: [...new Set(reportMetrics.map((r) => r.template_id))].length
  };
}

function processDeliveryMetrics(deliveryMetrics) {
  if (!deliveryMetrics || deliveryMetrics.length === 0) return {};

  return {
    total_deliveries: deliveryMetrics.length,
    delivery_success_rate: deliveryMetrics.filter((d) => d.delivery_status === 'delivered').length / deliveryMetrics.length * 100,
    channels_used: [...new Set(deliveryMetrics.map((d) => d.delivery_channel))],
    average_delivery_time: calculateAverageDeliveryTime(deliveryMetrics),
    read_rate: deliveryMetrics.filter((d) => d.read_timestamp).length / deliveryMetrics.length * 100
  };
}

function processEngagementMetrics(engagementMetrics) {
  if (!engagementMetrics || engagementMetrics.length === 0) return {};

  return {
    total_interactions: engagementMetrics.length,
    unique_users: [...new Set(engagementMetrics.map((e) => e.user_id))].length,
    popular_metrics: getPopularMetrics(engagementMetrics),
    engagement_trends: getEngagementTrends(engagementMetrics)
  };
}

function processFeedbackMetrics(feedbackMetrics) {
  if (!feedbackMetrics || feedbackMetrics.length === 0) return {};

  const ratingsOnly = feedbackMetrics.filter((f) => f.rating);

  return {
    total_feedback: feedbackMetrics.length,
    average_rating: ratingsOnly.length > 0 ? ratingsOnly.reduce((sum, f) => sum + f.rating, 0) / ratingsOnly.length : 0,
    feedback_distribution: getFeedbackDistribution(feedbackMetrics),
    sentiment_analysis: getSentimentAnalysis(feedbackMetrics)
  };
}

async function getTemplatePerformance(supabase, organizationId, startDate, endDate) {
  const { data: templateData } = await supabase.
  from('report_instances').
  select(`
      template_id,
      status,
      created_at,
      generated_at,
      published_at,
      template:report_templates(name, template_type)
    `).
  eq('organization_id', organizationId).
  gte('created_at', startDate.toISOString()).
  lte('created_at', endDate.toISOString());

  if (!templateData || templateData.length === 0) return {};

  const templatePerformance = {};

  templateData.forEach((report) => {
    const templateId = report.template_id;
    if (!templatePerformance[templateId]) {
      templatePerformance[templateId] = {
        template_name: report.template?.name || 'Unknown',
        template_type: report.template?.template_type || 'unknown',
        total_reports: 0,
        published_reports: 0,
        average_generation_time: 0,
        completion_rate: 0
      };
    }

    templatePerformance[templateId].total_reports++;
    if (report.status === 'published') {
      templatePerformance[templateId].published_reports++;
    }
  });

  // Calculate completion rates
  Object.values(templatePerformance).forEach((performance) => {
    performance.completion_rate = performance.published_reports / performance.total_reports * 100;
  });

  return templatePerformance;
}

// Analysis functions
function analyzeGenerationPatterns(reportData) {
  const insights = [];

  // Check for generation time trends
  const avgGenerationTime = calculateAverageGenerationTime(reportData);
  if (avgGenerationTime > 60) {// More than 1 minute
    insights.push({
      type: 'performance',
      title: 'Long Report Generation Times',
      description: `Average generation time is ${avgGenerationTime.toFixed(1)} minutes`,
      priority: 7,
      recommendation: 'Consider optimizing report templates or data queries'
    });
  }

  // Check completion rates
  const completionRate = reportData.filter((r) => r.status === 'published').length / reportData.length * 100;
  if (completionRate < 70) {
    insights.push({
      type: 'workflow',
      title: 'Low Report Completion Rate',
      description: `Only ${completionRate.toFixed(1)}% of reports are being published`,
      priority: 8,
      recommendation: 'Review editorial workflow and approval processes'
    });
  }

  return insights;
}

function analyzeDeliveryPatterns(deliveryData) {
  const insights = [];

  // Check delivery success rates
  const successRate = deliveryData.filter((d) => d.delivery_status === 'delivered').length / deliveryData.length * 100;
  if (successRate < 90) {
    insights.push({
      type: 'delivery',
      title: 'Low Delivery Success Rate',
      description: `Delivery success rate is ${successRate.toFixed(1)}%`,
      priority: 9,
      recommendation: 'Check email settings and recipient addresses'
    });
  }

  // Check read rates
  const readRate = deliveryData.filter((d) => d.read_timestamp).length / deliveryData.length * 100;
  if (readRate < 50) {
    insights.push({
      type: 'engagement',
      title: 'Low Read Rate',
      description: `Only ${readRate.toFixed(1)}% of delivered reports are being read`,
      priority: 6,
      recommendation: 'Improve report content and subject lines'
    });
  }

  return insights;
}

function analyzeEngagementPatterns(engagementData) {
  const insights = [];

  // Check for engagement trends
  const avgEngagementTime = calculateAverageEngagementTime(engagementData);
  if (avgEngagementTime < 30) {// Less than 30 seconds
    insights.push({
      type: 'engagement',
      title: 'Low Engagement Time',
      description: `Average engagement time is ${avgEngagementTime.toFixed(1)} seconds`,
      priority: 5,
      recommendation: 'Make reports more interactive and engaging'
    });
  }

  return insights;
}

function analyzeFeedbackPatterns(feedbackData) {
  const insights = [];

  // Check average rating
  const ratingsOnly = feedbackData.filter((f) => f.rating);
  if (ratingsOnly.length > 0) {
    const avgRating = ratingsOnly.reduce((sum, f) => sum + f.rating, 0) / ratingsOnly.length;
    if (avgRating < 3) {
      insights.push({
        type: 'feedback',
        title: 'Low Average Rating',
        description: `Average rating is ${avgRating.toFixed(1)} out of 5`,
        priority: 8,
        recommendation: 'Review feedback comments and improve report quality'
      });
    }
  }

  return insights;
}

// Utility functions
function calculateAverageGenerationTime(reportData) {
  const withGenerationTimes = reportData.filter((r) => r.generated_at && r.created_at);
  if (withGenerationTimes.length === 0) return 0;

  const totalTime = withGenerationTimes.reduce((sum, r) => {
    const createdTime = new Date(r.created_at);
    const generatedTime = new Date(r.generated_at);
    return sum + (generatedTime - createdTime);
  }, 0);

  return totalTime / withGenerationTimes.length / 60000; // Convert to minutes
}

function calculateAverageEngagementTime(analyticsData) {
  // This would be calculated based on engagement metrics
  // For now, return a placeholder
  return 45; // seconds
}

function calculateAverageDeliveryTime(deliveryData) {
  // This would be calculated based on delivery timestamps
  // For now, return a placeholder
  return 30; // seconds
}

function getStatusBreakdown(reportMetrics) {
  const breakdown = {};
  reportMetrics.forEach((report) => {
    breakdown[report.status] = (breakdown[report.status] || 0) + 1;
  });
  return breakdown;
}

function getPopularMetrics(engagementMetrics) {
  const metricCounts = {};
  engagementMetrics.forEach((metric) => {
    metricCounts[metric.metric_name] = (metricCounts[metric.metric_name] || 0) + 1;
  });
  return Object.entries(metricCounts).
  sort(([, a], [, b]) => b - a).
  slice(0, 10).
  map(([name, count]) => ({ name, count }));
}

function getEngagementTrends(engagementMetrics) {
  // Process engagement data into trends
  return {
    daily_engagement: {}, // Would be calculated from actual data
    peak_hours: [],
    trending_sections: []
  };
}

function getFeedbackDistribution(feedbackMetrics) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedbackMetrics.filter((f) => f.rating).forEach((f) => {
    distribution[f.rating]++;
  });
  return distribution;
}

function getSentimentAnalysis(feedbackMetrics) {
  // This would use NLP for sentiment analysis
  // For now, return placeholder
  return {
    positive: 60,
    neutral: 30,
    negative: 10
  };
}

function getTopSections(analyticsData) {
  const sectionCounts = {};
  analyticsData.forEach((metric) => {
    if (metric.metric_data && metric.metric_data.section_id) {
      sectionCounts[metric.metric_data.section_id] = (sectionCounts[metric.metric_data.section_id] || 0) + 1;
    }
  });
  return Object.entries(sectionCounts).
  sort(([, a], [, b]) => b - a).
  slice(0, 5).
  map(([section, count]) => ({ section, count }));
}

function groupFeedbackBySection(feedbackData) {
  const sectionFeedback = {};
  feedbackData.forEach((feedback) => {
    const sectionId = feedback.section_id || 'general';
    if (!sectionFeedback[sectionId]) {
      sectionFeedback[sectionId] = [];
    }
    sectionFeedback[sectionId].push(feedback);
  });
  return sectionFeedback;
}

function formatAsCSV(data) {
  // Convert data to CSV format
  let csv = '';

  // Reports CSV
  if (data.reports && data.reports.length > 0) {
    csv += 'Reports\n';
    csv += 'ID,Title,Status,Created,Generated,Published\n';
    data.reports.forEach((report) => {
      csv += `${report.id},${report.title},${report.status},${report.created_at},${report.generated_at || ''},${report.published_at || ''}\n`;
    });
    csv += '\n';
  }

  // Add other data sections as needed
  return csv;
}

function formatAsExcel(data) {
  // This would convert to Excel format
  // For now, return JSON representation
  return JSON.stringify(data, null, 2);
}