import { NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createAppDirectoryClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, organizationId, force = false } = body;

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

    // Get report instance with template
    const { data: reportInstance } = await supabase.
    from('report_instances').
    select(`
        *,
        template:report_templates(*),
        automation_rules:report_automation_rules(*)
      `).
    eq('id', reportId).
    eq('organization_id', organizationId).
    single();

    if (!reportInstance) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if report is already generated and not forcing regeneration
    if (reportInstance.generated_at && !force) {
      return NextResponse.json({
        error: 'Report already generated. Use force=true to regenerate.'
      }, { status: 400 });
    }

    // Generate report content
    const generatedContent = await generateReportContent(
      supabase,
      reportInstance.template,
      organizationId,
      reportInstance.report_period_start,
      reportInstance.report_period_end,
      reportInstance.automation_rules
    );

    // Update report instance with generated content
    const { data: updatedReport, error: updateError } = await supabase.
    from('report_instances').
    update({
      content: generatedContent,
      generated_at: new Date().toISOString(),
      status: 'review'
    }).
    eq('id', reportId).
    select().
    single();

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    // Update workflow status
    await supabase.
    from('report_editorial_workflow').
    update({ status: 'completed' }).
    eq('report_instance_id', reportId).
    eq('step_type', 'draft');

    await supabase.
    from('report_editorial_workflow').
    update({ status: 'in_progress' }).
    eq('report_instance_id', reportId).
    eq('step_type', 'review');

    // Log generation activity
    await supabase.
    from('analytics_events').
    insert({
      event_type: 'report_generated',
      event_category: 'reports',
      event_data: {
        report_id: reportId,
        template_id: reportInstance.template_id,
        generated_by: user.id,
        force_regeneration: force
      },
      user_id: user.id,
      organization_id: organizationId
    });

    return NextResponse.json({
      report: updatedReport,
      message: 'Report generated successfully'
    });

  } catch (error) {
    console.error('Error in report generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Enhanced content generation function
async function generateReportContent(supabase, template, organizationId, startDate, endDate, automationRules) {
  const content = {
    metadata: {
      generated_at: new Date().toISOString(),
      period_start: startDate,
      period_end: endDate,
      organization_id: organizationId
    },
    sections: {}
  };

  // Get base metrics for the period
  const { data: baseMetrics } = await supabase.
  rpc('generate_weekly_report_metrics', {
    p_organization_id: organizationId,
    p_start_date: startDate,
    p_end_date: endDate
  });

  // Get previous period for trend analysis
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const periodLength = endDateObj - startDateObj;
  const previousEndDate = new Date(startDateObj - 1);
  const previousStartDate = new Date(previousEndDate - periodLength);

  const { data: trendData } = await supabase.
  rpc('calculate_report_trends', {
    p_organization_id: organizationId,
    p_current_start: startDate,
    p_current_end: endDate,
    p_previous_start: previousStartDate.toISOString().split('T')[0],
    p_previous_end: previousEndDate.toISOString().split('T')[0]
  });

  // Generate content for each section
  for (const section of template.sections) {
    try {
      const sectionContent = await generateAdvancedSectionContent(
        supabase,
        section,
        organizationId,
        startDate,
        endDate,
        baseMetrics,
        trendData,
        automationRules
      );
      content.sections[section.id] = sectionContent;
    } catch (error) {
      console.error(`Error generating content for section ${section.id}:`, error);
      content.sections[section.id] = {
        error: 'Failed to generate content',
        section_type: section.type,
        generated_at: new Date().toISOString()
      };
    }
  }

  return content;
}

// Advanced section content generation
async function generateAdvancedSectionContent(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData, automationRules) {
  const sectionRules = automationRules.filter((rule) =>
  rule.configuration.section_id === section.id
  );

  switch (section.type) {
    case 'executive_summary':
      return await generateExecutiveSummary(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData);

    case 'metrics_dashboard':
      return await generateMetricsDashboard(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData);

    case 'trend_analysis':
      return await generateTrendAnalysis(supabase, section, organizationId, startDate, endDate, trendData);

    case 'performance_insights':
      return await generatePerformanceInsights(supabase, section, organizationId, startDate, endDate, baseMetrics, sectionRules);

    case 'alerts_warnings':
      return await generateAlertsWarnings(supabase, section, organizationId, startDate, endDate, baseMetrics, sectionRules);

    case 'recommendations':
      return await generateRecommendations(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData);

    case 'detailed_analytics':
      return await generateDetailedAnalytics(supabase, section, organizationId, startDate, endDate);

    case 'user_activity':
      return await generateUserActivityReport(supabase, section, organizationId, startDate, endDate);

    case 'assessment_summary':
      return await generateAssessmentSummary(supabase, section, organizationId, startDate, endDate);

    default:
      return await generateGenericSectionContent(supabase, section, organizationId, startDate, endDate, baseMetrics);
  }
}

// Executive Summary generation
async function generateExecutiveSummary(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData) {
  const summary = {
    type: 'executive_summary',
    title: 'Executive Summary',
    period: `${startDate} to ${endDate}`,
    generated_at: new Date().toISOString()
  };

  // Key metrics
  const keyMetrics = {
    total_users: baseMetrics?.users?.total_users || 0,
    active_users: baseMetrics?.users?.active_users || 0,
    assessments: baseMetrics?.assessments?.total_assessments || 0,
    completion_rate: baseMetrics?.assessments?.average_completion_rate || 0
  };

  // Growth trends
  const trends = {
    user_growth: trendData?.trends?.user_growth || 0,
    assessment_growth: trendData?.trends?.assessment_growth || 0,
    activity_growth: trendData?.trends?.activity_growth || 0
  };

  // Generate narrative
  const narrative = generateExecutiveNarrative(keyMetrics, trends);

  return {
    ...summary,
    key_metrics: keyMetrics,
    trends,
    narrative,
    highlights: generateHighlights(keyMetrics, trends)
  };
}

// Metrics Dashboard generation
async function generateMetricsDashboard(supabase, section, organizationId, startDate, endDate, baseMetrics, trendData) {
  const dashboard = {
    type: 'metrics_dashboard',
    title: 'Key Performance Metrics',
    generated_at: new Date().toISOString()
  };

  // Primary metrics
  const primaryMetrics = [
  {
    label: 'Total Users',
    value: baseMetrics?.users?.total_users || 0,
    change: trendData?.trends?.user_growth || 0,
    trend: trendData?.trends?.user_growth > 0 ? 'up' : trendData?.trends?.user_growth < 0 ? 'down' : 'stable'
  },
  {
    label: 'Active Assessments',
    value: baseMetrics?.assessments?.active_assessments || 0,
    change: trendData?.trends?.assessment_growth || 0,
    trend: trendData?.trends?.assessment_growth > 0 ? 'up' : trendData?.trends?.assessment_growth < 0 ? 'down' : 'stable'
  },
  {
    label: 'Completion Rate',
    value: baseMetrics?.assessments?.average_completion_rate || 0,
    change: trendData?.trends?.completion_rate_change || 0,
    trend: trendData?.trends?.completion_rate_change > 0 ? 'up' : trendData?.trends?.completion_rate_change < 0 ? 'down' : 'stable',
    format: 'percentage'
  }];


  // Secondary metrics
  const secondaryMetrics = [
  {
    label: 'Total Responses',
    value: baseMetrics?.assessments?.total_responses || 0
  },
  {
    label: 'Submitted Responses',
    value: baseMetrics?.assessments?.submitted_responses || 0
  },
  {
    label: 'New Users This Period',
    value: baseMetrics?.users?.new_users || 0
  }];


  return {
    ...dashboard,
    primary_metrics: primaryMetrics,
    secondary_metrics: secondaryMetrics,
    chart_data: await generateChartDataForMetrics(supabase, organizationId, startDate, endDate)
  };
}

// Trend Analysis generation
async function generateTrendAnalysis(supabase, section, organizationId, startDate, endDate, trendData) {
  const analysis = {
    type: 'trend_analysis',
    title: 'Trend Analysis',
    generated_at: new Date().toISOString()
  };

  // Get historical data for trend analysis
  const { data: historicalData } = await supabase.
  from('analytics_events').
  select('created_at, event_type, event_category').
  eq('organization_id', organizationId).
  gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
  .order('created_at');

  // Process historical data into trends
  const trends = processHistoricalDataForTrends(historicalData);

  return {
    ...analysis,
    trends,
    insights: generateTrendInsights(trends),
    recommendations: generateTrendRecommendations(trends)
  };
}

// Performance Insights generation
async function generatePerformanceInsights(supabase, section, organizationId, startDate, endDate, baseMetrics, rules) {
  const insights = {
    type: 'performance_insights',
    title: 'Performance Insights',
    generated_at: new Date().toISOString()
  };

  const performanceInsights = [];

  // Generate insights based on rules
  for (const rule of rules) {
    if (rule.rule_type === 'insight_generation') {
      const insight = await generateInsightFromRule(supabase, rule, organizationId, startDate, endDate, baseMetrics);
      if (insight) {
        performanceInsights.push(insight);
      }
    }
  }

  // Add default insights if no rules
  if (performanceInsights.length === 0) {
    performanceInsights.push(...generateDefaultInsights(baseMetrics));
  }

  return {
    ...insights,
    insights: performanceInsights
  };
}

// Alerts and Warnings generation
async function generateAlertsWarnings(supabase, section, organizationId, startDate, endDate, baseMetrics, rules) {
  const alerts = {
    type: 'alerts_warnings',
    title: 'Alerts & Warnings',
    generated_at: new Date().toISOString()
  };

  const alertsList = [];

  // Generate alerts based on rules
  for (const rule of rules) {
    if (rule.rule_type === 'alert_generation') {
      const alert = await generateAlertFromAdvancedRule(supabase, rule, organizationId, startDate, endDate, baseMetrics);
      if (alert) {
        alertsList.push(alert);
      }
    }
  }

  // Add default alerts
  alertsList.push(...generateDefaultAlerts(baseMetrics));

  return {
    ...alerts,
    alerts: alertsList.filter((alert) => alert !== null),
    summary: {
      total_alerts: alertsList.length,
      critical: alertsList.filter((alert) => alert.severity === 'critical').length,
      warning: alertsList.filter((alert) => alert.severity === 'warning').length,
      info: alertsList.filter((alert) => alert.severity === 'info').length
    }
  };
}

// Helper functions
function generateExecutiveNarrative(metrics, trends) {
  const narrativeParts = [];

  narrativeParts.push(`During this reporting period, the organization had ${metrics.total_users} total users`);

  if (trends.user_growth > 0) {
    narrativeParts.push(`with ${trends.user_growth.toFixed(1)}% growth in user base`);
  }

  if (metrics.completion_rate > 0) {
    narrativeParts.push(`Assessment completion rate stands at ${metrics.completion_rate.toFixed(1)}%`);
  }

  if (trends.assessment_growth > 0) {
    narrativeParts.push(`with ${trends.assessment_growth.toFixed(1)}% growth in assessment activity`);
  }

  return narrativeParts.join(', ') + '.';
}

function generateHighlights(metrics, trends) {
  const highlights = [];

  if (trends.user_growth > 10) {
    highlights.push({
      type: 'positive',
      title: 'Strong User Growth',
      description: `User base grew by ${trends.user_growth.toFixed(1)}% this period`
    });
  }

  if (metrics.completion_rate > 80) {
    highlights.push({
      type: 'positive',
      title: 'High Completion Rate',
      description: `Assessment completion rate of ${metrics.completion_rate.toFixed(1)}% exceeds target`
    });
  }

  if (trends.activity_growth > 20) {
    highlights.push({
      type: 'positive',
      title: 'Increased Engagement',
      description: `Overall activity increased by ${trends.activity_growth.toFixed(1)}%`
    });
  }

  return highlights;
}

function generateDefaultInsights(metrics) {
  return [
  {
    type: 'metric_insight',
    title: 'User Engagement',
    description: `Current completion rate of ${(metrics?.assessments?.average_completion_rate || 0).toFixed(1)}% indicates ${
    metrics?.assessments?.average_completion_rate > 80 ? 'strong' :
    metrics?.assessments?.average_completion_rate > 60 ? 'moderate' : 'low'} user engagement`,

    category: 'engagement'
  }];

}

function generateDefaultAlerts(metrics) {
  const alerts = [];

  if (metrics?.assessments?.average_completion_rate < 50) {
    alerts.push({
      type: 'warning',
      title: 'Low Completion Rate',
      description: `Assessment completion rate of ${(metrics?.assessments?.average_completion_rate || 0).toFixed(1)}% is below recommended threshold`,
      severity: 'warning',
      category: 'performance'
    });
  }

  if (metrics?.users?.active_users === 0) {
    alerts.push({
      type: 'critical',
      title: 'No Active Users',
      description: 'No users were active during this period',
      severity: 'critical',
      category: 'engagement'
    });
  }

  return alerts;
}

async function generateChartDataForMetrics(supabase, organizationId, startDate, endDate) {
  // Generate daily activity data
  const { data: dailyActivity } = await supabase.
  from('analytics_events').
  select('created_at').
  eq('organization_id', organizationId).
  gte('created_at', startDate).
  lte('created_at', endDate).
  order('created_at');

  // Group by day
  const dailyData = {};
  dailyActivity?.forEach((event) => {
    const date = new Date(event.created_at).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = 0;
    }
    dailyData[date]++;
  });

  return {
    daily_activity: Object.entries(dailyData).map(([date, count]) => ({
      date,
      value: count
    }))
  };
}

function processHistoricalDataForTrends(historicalData) {
  // Process historical data into meaningful trends
  const trends = {};

  // Group by event type and calculate trends
  const eventsByType = {};
  historicalData?.forEach((event) => {
    if (!eventsByType[event.event_type]) {
      eventsByType[event.event_type] = [];
    }
    eventsByType[event.event_type].push(event);
  });

  Object.entries(eventsByType).forEach(([eventType, events]) => {
    trends[eventType] = {
      total_events: events.length,
      trend_direction: 'stable' // Could be calculated based on time series analysis
    };
  });

  return trends;
}

function generateTrendInsights(trends) {
  const insights = [];

  Object.entries(trends).forEach(([eventType, data]) => {
    if (data.total_events > 10) {
      insights.push({
        type: 'trend_insight',
        event_type: eventType,
        description: `${eventType} events show ${data.trend_direction} activity with ${data.total_events} occurrences`,
        significance: data.total_events > 50 ? 'high' : 'medium'
      });
    }
  });

  return insights;
}

function generateTrendRecommendations(trends) {
  // Generate recommendations based on trends
  return [
  {
    type: 'recommendation',
    title: 'Continue Monitoring',
    description: 'Monitor current trends and adjust strategies as needed',
    priority: 'medium'
  }];

}

async function generateInsightFromRule(supabase, rule, organizationId, startDate, endDate, baseMetrics) {
  // Enhanced insight generation based on rule configuration
  const config = rule.configuration;
  const transformationLogic = rule.transformation_logic;

  // Apply transformation logic to metrics
  let insight = null;

  if (config.metric_type === 'completion_rate') {
    const completionRate = baseMetrics?.assessments?.average_completion_rate || 0;
    const threshold = config.threshold || 70;

    if (completionRate < threshold) {
      insight = {
        type: 'performance_insight',
        title: rule.rule_name,
        description: `Completion rate of ${completionRate.toFixed(1)}% is below target of ${threshold}%`,
        severity: 'warning',
        rule_id: rule.id,
        recommendations: transformationLogic.recommendations || []
      };
    }
  }

  return insight;
}

async function generateAlertFromAdvancedRule(supabase, rule, organizationId, startDate, endDate, baseMetrics) {
  // Enhanced alert generation with more sophisticated rules
  const thresholds = rule.threshold_rules || {};
  const config = rule.configuration;

  if (config.alert_type === 'metric_threshold') {
    const metricValue = getMetricValue(baseMetrics, config.metric_path);
    const threshold = thresholds[config.threshold_key];

    if (threshold && metricValue < threshold) {
      return {
        type: 'threshold_alert',
        title: rule.rule_name,
        description: `${config.metric_label} (${metricValue}) is below threshold (${threshold})`,
        severity: config.severity || 'warning',
        metric_value: metricValue,
        threshold_value: threshold,
        rule_id: rule.id
      };
    }
  }

  return null;
}

function getMetricValue(metrics, path) {
  // Helper function to get nested metric values
  return path.split('.').reduce((obj, key) => obj?.[key], metrics) || 0;
}

// Additional helper functions for other section types would be implemented here...