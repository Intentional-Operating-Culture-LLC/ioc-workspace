import { createClient } from '@supabase/supabase-js';
import { DashboardService } from './DashboardService';
import { ReportsService, WeeklyReport, ReportSection, ReportTemplate } from './ReportsService';

export interface GenerateReportParams {
  reportId: string;
  organizationId: string;
  forceRegenerate?: boolean;
  exportFormat?: 'json' | 'pdf' | 'excel' | 'html';
  templateId?: string;
}

export interface GeneratedContent {
  executive_summary: string;
  sections: Array<{
    section_type: string;
    section_title: string;
    content: string;
    charts_data?: Record<string, any>;
    tables_data?: Record<string, any>;
    insights?: Record<string, any>;
  }>;
  metadata: Record<string, any>;
}

export class ReportGenerator {
  private dashboardService: DashboardService;
  private reportsService: ReportsService;

  constructor(private supabase: ReturnType<typeof createClient>) {
    this.dashboardService = new DashboardService(supabase);
    this.reportsService = new ReportsService(supabase);
  }

  async generateReport(params: GenerateReportParams): Promise<{
    report: WeeklyReport;
    content: GeneratedContent;
    exportData?: any;
  }> {
    // Get report details
    const report = await this.reportsService.getReport({
      reportId: params.reportId,
      organizationId: params.organizationId,
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Check if we need to regenerate
    if (!params.forceRegenerate && report.status === 'generated' && report.sections.length > 0) {
      return {
        report,
        content: this.formatExistingContent(report),
      };
    }

    // Get template if specified
    let template: ReportTemplate | null = null;
    if (params.templateId || report.template_id) {
      const { data: templates } = await this.reportsService.getTemplates({
        templateType: 'weekly',
        isActive: true,
      });
      template = templates.find(t => t.id === (params.templateId || report.template_id)) || null;
    }

    // Generate content based on template or default structure
    const content = await this.generateReportContent(report, template, params.organizationId);

    // Update report with generated content
    await this.updateReportWithContent(params.reportId, params.organizationId, content);

    // Update report status
    const updatedReport = await this.reportsService.updateReport({
      reportId: params.reportId,
      organizationId: params.organizationId,
      userId: report.generated_by || '',
      status: 'generated',
      executiveSummary: content.executive_summary,
      metadata: { ...report.metadata, generation_date: new Date().toISOString() },
    });

    let exportData;
    if (params.exportFormat && params.exportFormat !== 'json') {
      exportData = await this.exportReport(updatedReport, content, params.exportFormat);
    }

    return {
      report: updatedReport,
      content,
      exportData,
    };
  }

  private async generateReportContent(
    report: WeeklyReport,
    template: ReportTemplate | null,
    organizationId: string
  ): Promise<GeneratedContent> {
    const periodStart = report.report_period_start;
    const periodEnd = report.report_period_end;

    // Get dashboard data for the period
    const [summary, metrics, trends, aggregations] = await Promise.all([
      this.dashboardService.getSummary({ organizationId, periodDays: 7 }),
      this.dashboardService.getMetrics({
        organizationId,
        periodStart,
        periodEnd,
        limit: 100,
      }),
      this.getDashboardTrends(organizationId),
      this.dashboardService.getAggregations({
        organizationId,
        periodStart,
        periodEnd,
      }),
    ]);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(summary, metrics.data, trends);

    // Generate sections based on template or default structure
    const sections = template 
      ? await this.generateSectionsFromTemplate(template, { summary, metrics: metrics.data, trends, aggregations: aggregations.data })
      : await this.generateDefaultSections({ summary, metrics: metrics.data, trends, aggregations: aggregations.data });

    return {
      executive_summary: executiveSummary,
      sections,
      metadata: {
        generated_at: new Date().toISOString(),
        period_start: periodStart,
        period_end: periodEnd,
        data_points: metrics.count,
        template_used: template?.id,
      },
    };
  }

  private async getDashboardTrends(organizationId: string) {
    const trendPromises = [
      this.dashboardService.getTrends({
        organizationId,
        metricType: 'user_engagement',
        metricName: 'active_user_percentage',
      }),
      this.dashboardService.getTrends({
        organizationId,
        metricType: 'assessment_completion',
        metricName: 'completion_rate',
      }),
    ];

    const trends = await Promise.allSettled(trendPromises);
    return trends
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  private generateExecutiveSummary(summary: any, metrics: any[], trends: any[]): string {
    const engagementRate = summary.user_stats?.engagement_rate || 0;
    const completionRate = summary.assessment_stats?.completion_rate || 0;
    const totalActivities = summary.activity_stats?.total_activities || 0;

    let summaryText = `This weekly report covers the period from ${summary.period_start} to ${summary.period_end}. `;
    
    // User engagement insights
    if (engagementRate > 70) {
      summaryText += `Excellent user engagement with ${engagementRate}% of users active during the period. `;
    } else if (engagementRate > 40) {
      summaryText += `Good user engagement with ${engagementRate}% of users active during the period. `;
    } else {
      summaryText += `User engagement needs attention with only ${engagementRate}% of users active during the period. `;
    }

    // Assessment completion insights
    if (completionRate > 80) {
      summaryText += `Outstanding assessment completion rate of ${completionRate}%. `;
    } else if (completionRate > 60) {
      summaryText += `Solid assessment completion rate of ${completionRate}%. `;
    } else {
      summaryText += `Assessment completion rate of ${completionRate}% indicates room for improvement. `;
    }

    // Activity insights
    summaryText += `A total of ${totalActivities} user activities were recorded during this period. `;

    // Trend insights
    const engagementTrend = trends.find(t => t.metric_name === 'active_user_percentage');
    if (engagementTrend?.overall_trend === 'positive') {
      summaryText += `User engagement shows a positive trend. `;
    } else if (engagementTrend?.overall_trend === 'negative') {
      summaryText += `User engagement shows a declining trend that requires attention. `;
    }

    return summaryText;
  }

  private async generateDefaultSections(data: any): Promise<any[]> {
    const sections = [];

    // Key Metrics Section
    sections.push({
      section_type: 'metrics_summary',
      section_title: 'Key Metrics Summary',
      content: this.generateMetricsSummaryContent(data.summary, data.metrics),
      charts_data: {
        engagement_chart: {
          type: 'line',
          data: this.prepareEngagementChartData(data.trends),
        },
        completion_chart: {
          type: 'bar',
          data: this.prepareCompletionChartData(data.summary),
        },
      },
      tables_data: {
        metrics_table: this.prepareMetricsTable(data.metrics),
      },
    });

    // OCEAN Assessment Insights
    if (data.aggregations.length > 0) {
      sections.push({
        section_type: 'ocean_insights',
        section_title: 'OCEAN Assessment Insights',
        content: this.generateOceanInsightsContent(data.aggregations),
        charts_data: {
          ocean_distribution: {
            type: 'radar',
            data: this.prepareOceanChartData(data.aggregations),
          },
        },
        insights: {
          top_traits: this.identifyTopTraits(data.aggregations),
          improvement_areas: this.identifyImprovementAreas(data.aggregations),
        },
      });
    }

    // Team Performance Section
    sections.push({
      section_type: 'team_performance',
      section_title: 'Team Performance Analysis',
      content: this.generateTeamPerformanceContent(data.aggregations, data.summary),
      tables_data: {
        department_breakdown: this.prepareDepartmentBreakdown(data.aggregations),
      },
    });

    // Activity Trends Section
    sections.push({
      section_type: 'activity_trends',
      section_title: 'Activity Trends & Insights',
      content: this.generateActivityTrendsContent(data.trends, data.summary),
      charts_data: {
        trend_analysis: {
          type: 'line',
          data: this.prepareTrendChartData(data.trends),
        },
      },
    });

    return sections;
  }

  private async generateSectionsFromTemplate(template: ReportTemplate, data: any): Promise<any[]> {
    const sections = [];
    const sectionConfigs = template.sections_config.sections || [];

    for (const config of sectionConfigs) {
      const section = {
        section_type: config.type,
        section_title: config.title,
        content: '',
        charts_data: {},
        tables_data: {},
        insights: {},
      };

      switch (config.type) {
        case 'metrics_summary':
          section.content = this.generateMetricsSummaryContent(data.summary, data.metrics);
          section.charts_data = {
            engagement_chart: {
              type: 'line',
              data: this.prepareEngagementChartData(data.trends),
            },
          };
          break;

        case 'ocean_insights':
          section.content = this.generateOceanInsightsContent(data.aggregations);
          section.charts_data = {
            ocean_distribution: {
              type: 'radar',
              data: this.prepareOceanChartData(data.aggregations),
            },
          };
          break;

        case 'team_performance':
          section.content = this.generateTeamPerformanceContent(data.aggregations, data.summary);
          break;

        case 'activity_trends':
          section.content = this.generateActivityTrendsContent(data.trends, data.summary);
          break;

        default:
          section.content = `Content for ${config.title} section`;
      }

      sections.push(section);
    }

    return sections;
  }

  private generateMetricsSummaryContent(summary: any, metrics: any[]): string {
    const activeUsers = summary.user_stats?.active_users || 0;
    const totalUsers = summary.user_stats?.total_users || 0;
    const engagementRate = summary.user_stats?.engagement_rate || 0;
    const completionRate = summary.assessment_stats?.completion_rate || 0;

    return `
During the reporting period, we had ${activeUsers} active users out of ${totalUsers} total users, 
representing a ${engagementRate}% engagement rate. Assessment completion rate was ${completionRate}%.

Key highlights:
• User Engagement: ${engagementRate}% (${activeUsers}/${totalUsers} users)
• Assessment Completion: ${completionRate}%
• Total Activities: ${summary.activity_stats?.total_activities || 0}
• Average Session Duration: ${Math.round(summary.activity_stats?.avg_session_duration || 0)} seconds

The data shows ${metrics.length} recorded metrics during this period, indicating ${
      metrics.length > 50 ? 'high' : metrics.length > 20 ? 'moderate' : 'low'
    } system activity.
    `.trim();
  }

  private generateOceanInsightsContent(aggregations: any[]): string {
    if (!aggregations.length) {
      return 'No OCEAN assessment data available for this period.';
    }

    const oceanAverages = this.calculateOceanAverages(aggregations);
    const topTrait = Object.entries(oceanAverages)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return `
OCEAN personality assessment analysis reveals important insights about team composition and individual strengths.

Key findings:
• Highest trait: ${topTrait[0].charAt(0).toUpperCase() + topTrait[0].slice(1)} (${(topTrait[1] as number).toFixed(1)})
• Assessment participation: ${aggregations.reduce((sum, agg) => sum + agg.total_assessments, 0)} total assessments
• Completion rate: ${aggregations.reduce((sum, agg) => sum + agg.completed_assessments, 0)} completed

The assessment data provides valuable insights for team development, role optimization, 
and understanding workplace dynamics across different departments and roles.
    `.trim();
  }

  private generateTeamPerformanceContent(aggregations: any[], summary: any): string {
    const deptAggregations = aggregations.filter(agg => agg.aggregation_type === 'ocean_department');
    const roleAggregations = aggregations.filter(agg => agg.aggregation_type === 'ocean_role');

    return `
Team performance analysis reveals distribution patterns across departments and roles.

Department Analysis:
${deptAggregations.map(dept => 
  `• ${dept.aggregation_key}: ${dept.completed_assessments} assessments completed`
).join('\n')}

Role Distribution:
${roleAggregations.map(role => 
  `• ${role.aggregation_key}: ${role.completed_assessments} assessments completed`
).join('\n')}

This distribution helps identify engagement levels across different organizational units 
and can inform targeted development initiatives.
    `.trim();
  }

  private generateActivityTrendsContent(trends: any[], summary: any): string {
    const engagementTrend = trends.find(t => t.metric_name === 'active_user_percentage');
    const completionTrend = trends.find(t => t.metric_name === 'completion_rate');

    return `
Activity trends analysis shows patterns in user engagement and system utilization over time.

Engagement Trends:
${engagementTrend ? `• User engagement is showing a ${engagementTrend.overall_trend} trend` : '• Insufficient engagement data for trend analysis'}

Assessment Trends:
${completionTrend ? `• Assessment completion is showing a ${completionTrend.overall_trend} trend` : '• Insufficient assessment data for trend analysis'}

Recent Activity:
• Average session duration: ${Math.round(summary.activity_stats?.avg_session_duration || 0)} seconds
• Peak activity periods can be identified from the data patterns

These trends help inform strategic decisions about system improvements and user engagement initiatives.
    `.trim();
  }

  private prepareEngagementChartData(trends: any[]) {
    const engagementTrend = trends.find(t => t.metric_name === 'active_user_percentage');
    if (!engagementTrend?.trend_data) return { labels: [], datasets: [] };

    return {
      labels: engagementTrend.trend_data.map((d: any) => d.week_start),
      datasets: [{
        label: 'User Engagement %',
        data: engagementTrend.trend_data.map((d: any) => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      }],
    };
  }

  private prepareCompletionChartData(summary: any) {
    return {
      labels: ['Completed', 'Pending'],
      datasets: [{
        label: 'Assessment Status',
        data: [
          summary.assessment_stats?.completed_assessments || 0,
          (summary.assessment_stats?.total_assessments || 0) - (summary.assessment_stats?.completed_assessments || 0)
        ],
        backgroundColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
      }],
    };
  }

  private prepareMetricsTable(metrics: any[]) {
    return {
      headers: ['Metric Type', 'Metric Name', 'Value', 'Unit', 'Recorded At'],
      rows: metrics.slice(0, 10).map(metric => [
        metric.metric_type,
        metric.metric_name,
        metric.metric_value,
        metric.metric_unit || '-',
        new Date(metric.recorded_at).toLocaleDateString(),
      ]),
    };
  }

  private prepareOceanChartData(aggregations: any[]) {
    const averages = this.calculateOceanAverages(aggregations);
    
    return {
      labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
      datasets: [{
        label: 'OCEAN Scores',
        data: [
          averages.openness,
          averages.conscientiousness,
          averages.extraversion,
          averages.agreeableness,
          averages.neuroticism,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
      }],
    };
  }

  private prepareDepartmentBreakdown(aggregations: any[]) {
    const deptAggregations = aggregations.filter(agg => agg.aggregation_type === 'ocean_department');
    
    return {
      headers: ['Department', 'Total Assessments', 'Completed', 'Completion Rate'],
      rows: deptAggregations.map(dept => [
        dept.aggregation_key,
        dept.total_assessments,
        dept.completed_assessments,
        `${Math.round((dept.completed_assessments / dept.total_assessments) * 100)}%`,
      ]),
    };
  }

  private prepareTrendChartData(trends: any[]) {
    if (!trends.length) return { labels: [], datasets: [] };

    const datasets = trends.map((trend, index) => ({
      label: trend.metric_name,
      data: trend.trend_data?.map((d: any) => d.value) || [],
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
    }));

    return {
      labels: trends[0]?.trend_data?.map((d: any) => d.week_start) || [],
      datasets,
    };
  }

  private calculateOceanAverages(aggregations: any[]): Record<string, number> {
    const totals = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    let count = 0;

    aggregations.forEach(agg => {
      if (agg.ocean_scores) {
        Object.entries(agg.ocean_scores).forEach(([key, value]) => {
          if (key in totals && typeof value === 'number') {
            totals[key as keyof typeof totals] += value;
            count++;
          }
        });
      }
    });

    const avgCount = count / 5; // Divide by number of OCEAN traits
    return Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, avgCount > 0 ? value / avgCount : 0])
    );
  }

  private identifyTopTraits(aggregations: any[]): string[] {
    const averages = this.calculateOceanAverages(aggregations);
    return Object.entries(averages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trait]) => trait);
  }

  private identifyImprovementAreas(aggregations: any[]): string[] {
    const averages = this.calculateOceanAverages(aggregations);
    return Object.entries(averages)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 2)
      .map(([trait]) => trait);
  }

  private formatExistingContent(report: WeeklyReport & { sections: ReportSection[] }): GeneratedContent {
    return {
      executive_summary: report.executive_summary || '',
      sections: report.sections.map(section => ({
        section_type: section.section_type,
        section_title: section.section_title,
        content: section.content || '',
        charts_data: section.charts_data,
        tables_data: section.tables_data,
        insights: section.insights,
      })),
      metadata: report.metadata || {},
    };
  }

  private async updateReportWithContent(
    reportId: string,
    organizationId: string,
    content: GeneratedContent
  ): Promise<void> {
    // Delete existing sections
    await this.supabase
      .from('report_sections')
      .delete()
      .eq('report_id', reportId);

    // Insert new sections
    const sectionsToInsert = content.sections.map((section, index) => ({
      report_id: reportId,
      section_type: section.section_type,
      section_title: section.section_title,
      section_order: index + 1,
      content: section.content,
      charts_data: section.charts_data,
      tables_data: section.tables_data,
      insights: section.insights,
    }));

    if (sectionsToInsert.length > 0) {
      const { error } = await this.supabase
        .from('report_sections')
        .insert(sectionsToInsert);

      if (error) {
        throw new Error(`Failed to update report sections: ${error.message}`);
      }
    }
  }

  private async exportReport(
    report: WeeklyReport,
    content: GeneratedContent,
    format: 'pdf' | 'excel' | 'html'
  ): Promise<any> {
    // This would integrate with actual export libraries
    // For now, return a placeholder structure
    switch (format) {
      case 'pdf':
        return { format: 'pdf', data: 'PDF binary data would go here' };
      case 'excel':
        return { format: 'excel', data: 'Excel binary data would go here' };
      case 'html':
        return { format: 'html', data: this.generateHtmlReport(report, content) };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateHtmlReport(report: WeeklyReport, content: GeneratedContent): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #0066cc; }
          h2 { color: #0066cc; margin-top: 30px; }
          .summary { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
          .section { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p><strong>Period:</strong> ${report.report_period_start} to ${report.report_period_end}</p>
        
        <div class="summary">
          <h2>Executive Summary</h2>
          <p>${content.executive_summary}</p>
        </div>
        
        ${content.sections.map(section => `
          <div class="section">
            <h2>${section.section_title}</h2>
            <p>${section.content}</p>
          </div>
        `).join('')}
      </body>
      </html>
    `;
  }
}