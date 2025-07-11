/**
 * Weekly Reporter for IOC Analytics
 * Generates and sends weekly business reports
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MetricAggregator } from './metric-aggregator';
import { LOG_INSIGHTS_QUERIES } from './cloudwatch-config';

interface WeeklyReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalAssessments: number;
    uniqueUsers: number;
    revenue: number;
    conversionRate: number;
    errorRate: number;
    avgCostPerAssessment: number;
  };
  trends: {
    userGrowth: number;
    revenueGrowth: number;
    assessmentGrowth: number;
  };
  oceanInsights: {
    averageScores: Record<string, number>;
    industryBreakdown?: Record<string, Record<string, number>>;
  };
  recommendations: string[];
}

export class WeeklyReporter {
  private sesClient: SESClient;
  private logsClient: CloudWatchLogsClient;
  private s3Client: S3Client;
  private metricAggregator: MetricAggregator;
  
  constructor(region: string = 'us-east-1') {
    this.sesClient = new SESClient({ region });
    this.logsClient = new CloudWatchLogsClient({ region });
    this.s3Client = new S3Client({ region });
    this.metricAggregator = new MetricAggregator(region);
  }
  
  /**
   * Generate and send weekly report
   */
  async generateWeeklyReport(
    logGroupName: string,
    s3Bucket: string,
    recipientEmails: string[]
  ): Promise<void> {
    console.log('Generating weekly report...');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Gather data from multiple sources
    const [businessMetrics, errorMetrics, historicalData] = await Promise.all([
      this.queryBusinessMetrics(logGroupName, startDate, endDate),
      this.queryErrorMetrics(logGroupName, startDate, endDate),
      this.metricAggregator.loadHistoricalData(s3Bucket, 'analytics/daily-summaries', 14)
    ]);
    
    // Calculate trends
    const growthMetrics = this.metricAggregator.calculateGrowthMetrics(historicalData);
    
    // Build report
    const report: WeeklyReport = {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      summary: {
        totalAssessments: businessMetrics.assessmentCount || 0,
        uniqueUsers: businessMetrics.uniqueUsers || 0,
        revenue: businessMetrics.totalRevenue || 0,
        conversionRate: businessMetrics.conversionRate || 0,
        errorRate: errorMetrics.errorRate || 0,
        avgCostPerAssessment: businessMetrics.avgCostPerAssessment || 0
      },
      trends: {
        userGrowth: growthMetrics.userGrowth,
        revenueGrowth: growthMetrics.revenueGrowth,
        assessmentGrowth: growthMetrics.assessmentGrowth
      },
      oceanInsights: {
        averageScores: businessMetrics.oceanAverages || { O: 0, C: 0, E: 0, A: 0, N: 0 }
      },
      recommendations: this.generateRecommendations(businessMetrics, errorMetrics, growthMetrics)
    };
    
    // Save report to S3
    await this.saveReportToS3(s3Bucket, report);
    
    // Send email report
    await this.sendEmailReport(recipientEmails, report);
    
    console.log('Weekly report generated and sent');
  }
  
  /**
   * Query business metrics from CloudWatch Logs
   */
  private async queryBusinessMetrics(
    logGroupName: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const query = `
      fields @timestamp, et as event_type, uid as user_id, amount, ocean_scores
      | filter et in ["ASSESSMENT_COMPLETED", "REVENUE_TRACKED", "TRIAL_CONVERTED", "TRIAL_STARTED"]
      | stats 
        count() as total_events,
        count_distinct(uid) as unique_users,
        sum(amount) as total_revenue
        by et
    `;
    
    const results = await this.runLogQuery(logGroupName, query, startDate, endDate);
    
    // Process results
    const metrics: any = {
      assessmentCount: 0,
      uniqueUsers: 0,
      totalRevenue: 0,
      trialStarts: 0,
      trialConversions: 0
    };
    
    results.forEach((row: any) => {
      if (row.et === 'ASSESSMENT_COMPLETED') {
        metrics.assessmentCount = parseInt(row.total_events) || 0;
      }
      if (row.et === 'REVENUE_TRACKED') {
        metrics.totalRevenue = parseFloat(row.total_revenue) || 0;
      }
      if (row.et === 'TRIAL_STARTED') {
        metrics.trialStarts = parseInt(row.total_events) || 0;
      }
      if (row.et === 'TRIAL_CONVERTED') {
        metrics.trialConversions = parseInt(row.total_events) || 0;
      }
      metrics.uniqueUsers = Math.max(metrics.uniqueUsers, parseInt(row.unique_users) || 0);
    });
    
    metrics.conversionRate = metrics.trialStarts > 0 
      ? (metrics.trialConversions / metrics.trialStarts) * 100 
      : 0;
    
    // Query OCEAN averages separately
    const oceanQuery = `
      fields ocean_scores
      | filter et = "ASSESSMENT_COMPLETED"
      | stats 
        avg(ocean_scores.O) as avg_O,
        avg(ocean_scores.C) as avg_C,
        avg(ocean_scores.E) as avg_E,
        avg(ocean_scores.A) as avg_A,
        avg(ocean_scores.N) as avg_N
    `;
    
    const oceanResults = await this.runLogQuery(logGroupName, oceanQuery, startDate, endDate);
    if (oceanResults.length > 0) {
      metrics.oceanAverages = {
        O: parseFloat(oceanResults[0].avg_O) || 0,
        C: parseFloat(oceanResults[0].avg_C) || 0,
        E: parseFloat(oceanResults[0].avg_E) || 0,
        A: parseFloat(oceanResults[0].avg_A) || 0,
        N: parseFloat(oceanResults[0].avg_N) || 0
      };
    }
    
    return metrics;
  }
  
  /**
   * Query error metrics
   */
  private async queryErrorMetrics(
    logGroupName: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const query = `
      fields @timestamp, level, err as error_type
      | stats 
        count() as total_logs,
        sum(level = "ERROR") as error_count
      | fields error_rate = (error_count / total_logs) * 100
    `;
    
    const results = await this.runLogQuery(logGroupName, query, startDate, endDate);
    
    return {
      errorRate: results.length > 0 ? parseFloat(results[0].error_rate) || 0 : 0
    };
  }
  
  /**
   * Run CloudWatch Logs Insights query
   */
  private async runLogQuery(
    logGroupName: string,
    queryString: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      // Start query
      const startCommand = new StartQueryCommand({
        logGroupName,
        startTime: Math.floor(startTime.getTime() / 1000),
        endTime: Math.floor(endTime.getTime() / 1000),
        queryString
      });
      
      const { queryId } = await this.logsClient.send(startCommand);
      
      // Wait for results
      let status = 'Running';
      let results: any[] = [];
      
      while (status === 'Running' || status === 'Scheduled') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultsCommand = new GetQueryResultsCommand({ queryId });
        const response = await this.logsClient.send(resultsCommand);
        
        status = response.status || 'Unknown';
        if (status === 'Complete') {
          results = response.results || [];
        }
      }
      
      // Transform results
      return results.map(row => {
        const obj: any = {};
        row.forEach((field: any) => {
          if (field.field && field.value) {
            obj[field.field] = field.value;
          }
        });
        return obj;
      });
    } catch (error) {
      console.error('Error running log query:', error);
      return [];
    }
  }
  
  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    businessMetrics: any,
    errorMetrics: any,
    growthMetrics: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Conversion rate recommendations
    if (businessMetrics.conversionRate < 10) {
      recommendations.push(
        '📈 Trial conversion rate is below 10%. Consider improving onboarding experience or offering extended trials.'
      );
    }
    
    // Error rate recommendations
    if (errorMetrics.errorRate > 5) {
      recommendations.push(
        '⚠️ Error rate exceeds 5%. Review error logs and implement additional error handling.'
      );
    }
    
    // Growth recommendations
    if (growthMetrics.userGrowth < 10) {
      recommendations.push(
        '👥 User growth is below 10% week-over-week. Consider increasing marketing efforts or referral incentives.'
      );
    }
    
    if (growthMetrics.revenueGrowth < 15) {
      recommendations.push(
        '💰 Revenue growth is below target. Analyze pricing strategy and upsell opportunities.'
      );
    }
    
    // Cost recommendations
    if (businessMetrics.avgCostPerAssessment > 0.10) {
      recommendations.push(
        '💸 Cost per assessment exceeds $0.10. Review Lambda memory allocation and optimize processing.'
      );
    }
    
    // OCEAN insights
    const oceanAvg = businessMetrics.oceanAverages;
    if (oceanAvg && oceanAvg.C < 50) {
      recommendations.push(
        '🎯 Average Conscientiousness score is low. This might indicate assessment quality issues.'
      );
    }
    
    return recommendations;
  }
  
  /**
   * Save report to S3
   */
  private async saveReportToS3(bucket: string, report: WeeklyReport): Promise<void> {
    const key = `analytics/weekly-reports/report-${report.period.end}.json`;
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json'
    });
    
    await this.s3Client.send(command);
  }
  
  /**
   * Send email report
   */
  private async sendEmailReport(recipients: string[], report: WeeklyReport): Promise<void> {
    const htmlBody = this.generateEmailHTML(report);
    const textBody = this.generateEmailText(report);
    
    const command = new SendEmailCommand({
      Source: 'analytics@iocframework.com',
      Destination: {
        ToAddresses: recipients
      },
      Message: {
        Subject: {
          Data: `IOC Weekly Analytics Report - ${report.period.end}`
        },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: textBody }
        }
      }
    });
    
    try {
      await this.sesClient.send(command);
    } catch (error) {
      console.error('Failed to send email report:', error);
    }
  }
  
  /**
   * Generate HTML email content
   */
  private generateEmailHTML(report: WeeklyReport): string {
    const { summary, trends, oceanInsights, recommendations } = report;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #3498db; }
        .metric-label { font-size: 14px; color: #7f8c8d; }
        .trend { font-size: 16px; margin: 5px 0; }
        .positive { color: #27ae60; }
        .negative { color: #e74c3c; }
        .recommendation { background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>IOC Weekly Analytics Report</h1>
        <p>${report.period.start} to ${report.period.end}</p>
        
        <h2>Key Metrics</h2>
        <div class="metric">
          <div class="metric-value">${summary.totalAssessments}</div>
          <div class="metric-label">Assessments</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.uniqueUsers}</div>
          <div class="metric-label">Active Users</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${summary.revenue.toFixed(2)}</div>
          <div class="metric-label">Revenue</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.conversionRate.toFixed(1)}%</div>
          <div class="metric-label">Conversion Rate</div>
        </div>
        
        <h2>Week-over-Week Trends</h2>
        <div class="trend ${trends.userGrowth >= 0 ? 'positive' : 'negative'}">
          Users: ${trends.userGrowth >= 0 ? '+' : ''}${trends.userGrowth.toFixed(1)}%
        </div>
        <div class="trend ${trends.revenueGrowth >= 0 ? 'positive' : 'negative'}">
          Revenue: ${trends.revenueGrowth >= 0 ? '+' : ''}${trends.revenueGrowth.toFixed(1)}%
        </div>
        <div class="trend ${trends.assessmentGrowth >= 0 ? 'positive' : 'negative'}">
          Assessments: ${trends.assessmentGrowth >= 0 ? '+' : ''}${trends.assessmentGrowth.toFixed(1)}%
        </div>
        
        <h2>OCEAN Score Averages</h2>
        <table>
          <tr>
            <th>Trait</th>
            <th>Average Score</th>
          </tr>
          <tr><td>Openness</td><td>${oceanInsights.averageScores.O.toFixed(1)}</td></tr>
          <tr><td>Conscientiousness</td><td>${oceanInsights.averageScores.C.toFixed(1)}</td></tr>
          <tr><td>Extraversion</td><td>${oceanInsights.averageScores.E.toFixed(1)}</td></tr>
          <tr><td>Agreeableness</td><td>${oceanInsights.averageScores.A.toFixed(1)}</td></tr>
          <tr><td>Neuroticism</td><td>${oceanInsights.averageScores.N.toFixed(1)}</td></tr>
        </table>
        
        <h2>System Health</h2>
        <div class="metric">
          <div class="metric-value ${summary.errorRate < 5 ? 'positive' : 'negative'}">
            ${summary.errorRate.toFixed(2)}%
          </div>
          <div class="metric-label">Error Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${summary.avgCostPerAssessment.toFixed(3)}</div>
          <div class="metric-label">Cost per Assessment</div>
        </div>
        
        <h2>Recommendations</h2>
        ${recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        
        <hr style="margin-top: 40px;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated report from IOC Analytics. 
          For detailed metrics, visit your CloudWatch dashboard.
        </p>
      </div>
    </body>
    </html>
    `;
  }
  
  /**
   * Generate plain text email content
   */
  private generateEmailText(report: WeeklyReport): string {
    const { summary, trends, recommendations } = report;
    
    return `
IOC Weekly Analytics Report
${report.period.start} to ${report.period.end}

KEY METRICS
-----------
Assessments: ${summary.totalAssessments}
Active Users: ${summary.uniqueUsers}
Revenue: $${summary.revenue.toFixed(2)}
Conversion Rate: ${summary.conversionRate.toFixed(1)}%
Error Rate: ${summary.errorRate.toFixed(2)}%
Cost per Assessment: $${summary.avgCostPerAssessment.toFixed(3)}

WEEK-OVER-WEEK TRENDS
--------------------
Users: ${trends.userGrowth >= 0 ? '+' : ''}${trends.userGrowth.toFixed(1)}%
Revenue: ${trends.revenueGrowth >= 0 ? '+' : ''}${trends.revenueGrowth.toFixed(1)}%
Assessments: ${trends.assessmentGrowth >= 0 ? '+' : ''}${trends.assessmentGrowth.toFixed(1)}%

RECOMMENDATIONS
--------------
${recommendations.join('\n')}

--
This is an automated report from IOC Analytics.
    `.trim();
  }
}