/**
 * Athena Cost Control Manager
 * Implements cost control measures and monitoring
 */

import { 
  AthenaClient,
  ListQueryExecutionsCommand,
  GetQueryExecutionCommand,
  StopQueryExecutionCommand,
  UpdateWorkGroupCommand
} from '@aws-sdk/client-athena';
import { 
  CloudWatchClient,
  PutMetricAlarmCommand,
  PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';
import { 
  S3Client,
  PutBucketLifecycleConfigurationCommand
} from '@aws-sdk/client-s3';

export interface CostControlConfig {
  maxQueryCostUSD: number;
  maxMonthlyBudgetUSD: number;
  queryTimeoutSeconds: number;
  resultRetentionDays: number;
  alertThresholdPercent: number;
}

export class AthenaCostManager {
  private readonly config: CostControlConfig = {
    maxQueryCostUSD: 0.50,          // Max $0.50 per query
    maxMonthlyBudgetUSD: 50.00,     // Max $50/month for Athena
    queryTimeoutSeconds: 300,        // 5 minute timeout
    resultRetentionDays: 30,        // Keep results for 30 days
    alertThresholdPercent: 80       // Alert at 80% of budget
  };

  private athenaClient: AthenaClient;
  private cloudwatchClient: CloudWatchClient;
  private s3Client: S3Client;

  constructor(region: string = 'us-east-1') {
    this.athenaClient = new AthenaClient({ region });
    this.cloudwatchClient = new CloudWatchClient({ region });
    this.s3Client = new S3Client({ region });
  }

  /**
   * Setup cost control measures
   */
  async setupCostControls(workgroupName: string, resultsBucket: string): Promise<void> {
    // 1. Configure workgroup limits
    await this.configureWorkgroupLimits(workgroupName);

    // 2. Setup S3 lifecycle for query results
    await this.setupResultsLifecycle(resultsBucket);

    // 3. Create CloudWatch alarms
    await this.createCostAlarms(workgroupName);

    // 4. Setup query monitoring
    await this.setupQueryMonitoring(workgroupName);

    console.log('Cost controls configured successfully');
  }

  /**
   * Configure workgroup with cost limits
   */
  private async configureWorkgroupLimits(workgroupName: string): Promise<void> {
    const bytesLimit = this.config.maxQueryCostUSD * 200 * 1073741824; // Convert $ to bytes

    const command = new UpdateWorkGroupCommand({
      WorkGroup: workgroupName,
      ConfigurationUpdates: {
        BytesScannedCutoffPerQuery: bytesLimit,
        EnforceWorkGroupConfiguration: true,
        PublishCloudWatchMetricsEnabled: true,
        ResultConfigurationUpdates: {
          EncryptionConfiguration: {
            EncryptionOption: 'SSE_S3'
          }
        }
      }
    });

    await this.athenaClient.send(command);
    console.log(`Workgroup ${workgroupName} configured with ${bytesLimit} bytes limit`);
  }

  /**
   * Setup S3 lifecycle for query results
   */
  private async setupResultsLifecycle(bucketName: string): Promise<void> {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'delete-old-query-results',
            Status: 'Enabled',
            Filter: {
              Prefix: ''
            },
            Expiration: {
              Days: this.config.resultRetentionDays
            },
            Transitions: [
              {
                Days: 7,
                StorageClass: 'STANDARD_IA'
              },
              {
                Days: 14,
                StorageClass: 'GLACIER_IR'
              }
            ],
            AbortIncompleteMultipartUpload: {
              DaysAfterInitiation: 1
            }
          }
        ]
      }
    });

    await this.s3Client.send(command);
    console.log(`S3 lifecycle configured for ${bucketName}`);
  }

  /**
   * Create CloudWatch alarms for cost monitoring
   */
  private async createCostAlarms(workgroupName: string): Promise<void> {
    // Monthly budget alarm
    const budgetAlarm = new PutMetricAlarmCommand({
      AlarmName: `athena-monthly-budget-${workgroupName}`,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      MetricName: 'DataScannedInBytes',
      Namespace: 'AWS/Athena',
      Period: 2592000, // 30 days in seconds
      Statistic: 'Sum',
      Threshold: (this.config.maxMonthlyBudgetUSD / 5) * 1099511627776, // Convert $ to bytes
      ActionsEnabled: true,
      AlarmDescription: `Alert when Athena costs exceed ${this.config.alertThresholdPercent}% of monthly budget`,
      Dimensions: [
        {
          Name: 'WorkGroup',
          Value: workgroupName
        }
      ],
      TreatMissingData: 'notBreaching'
    });

    await this.cloudwatchClient.send(budgetAlarm);

    // Per-query cost alarm
    const queryAlarm = new PutMetricAlarmCommand({
      AlarmName: `athena-query-cost-${workgroupName}`,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      MetricName: 'DataScannedInBytes',
      Namespace: 'AWS/Athena',
      Period: 300, // 5 minutes
      Statistic: 'Maximum',
      Threshold: (this.config.maxQueryCostUSD / 5) * 1099511627776,
      ActionsEnabled: true,
      AlarmDescription: `Alert when single query exceeds $${this.config.maxQueryCostUSD}`,
      Dimensions: [
        {
          Name: 'WorkGroup',
          Value: workgroupName
        }
      ]
    });

    await this.cloudwatchClient.send(queryAlarm);
    console.log('CloudWatch alarms created');
  }

  /**
   * Setup query monitoring
   */
  private async setupQueryMonitoring(workgroupName: string): Promise<void> {
    // This would be implemented as a Lambda function that runs periodically
    console.log(`Query monitoring setup for ${workgroupName}`);
  }

  /**
   * Get current month's Athena costs
   */
  async getCurrentMonthCosts(workgroupName: string): Promise<CostSummary> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const queries = await this.listRecentQueries(workgroupName, startOfMonth);
    
    let totalBytes = 0;
    let totalQueries = 0;
    let failedQueries = 0;
    const costByDay: Record<string, number> = {};

    for (const queryId of queries) {
      const execution = await this.getQueryExecution(queryId);
      if (execution) {
        const bytes = execution.Statistics?.DataScannedInBytes || 0;
        totalBytes += bytes;
        totalQueries++;

        if (execution.Status?.State === 'FAILED') {
          failedQueries++;
        }

        const date = execution.Status?.SubmissionDateTime?.toISOString().split('T')[0];
        if (date) {
          costByDay[date] = (costByDay[date] || 0) + (bytes / 1099511627776) * 5;
        }
      }
    }

    const totalCostUSD = (totalBytes / 1099511627776) * 5; // $5 per TB
    const budgetUsedPercent = (totalCostUSD / this.config.maxMonthlyBudgetUSD) * 100;

    return {
      totalCostUSD,
      totalQueries,
      failedQueries,
      totalDataScannedGB: totalBytes / 1073741824,
      budgetUsedPercent,
      costByDay,
      projectedMonthlyTotal: this.projectMonthlyCost(totalCostUSD, startOfMonth)
    };
  }

  /**
   * List recent queries
   */
  private async listRecentQueries(
    workgroupName: string, 
    since: Date
  ): Promise<string[]> {
    const command = new ListQueryExecutionsCommand({
      WorkGroup: workgroupName,
      MaxResults: 50
    });

    const response = await this.athenaClient.send(command);
    return response.QueryExecutionIds || [];
  }

  /**
   * Get query execution details
   */
  private async getQueryExecution(queryExecutionId: string) {
    const command = new GetQueryExecutionCommand({
      QueryExecutionId: queryExecutionId
    });

    try {
      const response = await this.athenaClient.send(command);
      return response.QueryExecution;
    } catch (error) {
      console.error(`Failed to get query execution ${queryExecutionId}:`, error);
      return null;
    }
  }

  /**
   * Project monthly cost based on current usage
   */
  private projectMonthlyCost(currentCost: number, startOfMonth: Date): number {
    const now = new Date();
    const daysElapsed = Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    return (currentCost / daysElapsed) * daysInMonth;
  }

  /**
   * Stop expensive query
   */
  async stopExpensiveQuery(queryExecutionId: string): Promise<void> {
    const command = new StopQueryExecutionCommand({
      QueryExecutionId: queryExecutionId
    });

    await this.athenaClient.send(command);
    console.log(`Stopped expensive query: ${queryExecutionId}`);
  }

  /**
   * Get cost optimization recommendations
   */
  getCostOptimizationRecommendations(summary: CostSummary): CostRecommendation[] {
    const recommendations: CostRecommendation[] = [];

    // Check if approaching budget
    if (summary.budgetUsedPercent > 80) {
      recommendations.push({
        priority: 'high',
        category: 'budget',
        recommendation: 'Monthly budget usage exceeds 80%',
        action: 'Review and optimize expensive queries',
        potentialSavings: summary.totalCostUSD * 0.3
      });
    }

    // Check query failure rate
    const failureRate = summary.failedQueries / summary.totalQueries;
    if (failureRate > 0.1) {
      recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        recommendation: `High query failure rate: ${(failureRate * 100).toFixed(1)}%`,
        action: 'Fix failing queries to avoid wasted scans',
        potentialSavings: summary.totalCostUSD * failureRate
      });
    }

    // Check for cost spikes
    const avgDailyCost = summary.totalCostUSD / Object.keys(summary.costByDay).length;
    Object.entries(summary.costByDay).forEach(([date, cost]) => {
      if (cost > avgDailyCost * 2) {
        recommendations.push({
          priority: 'medium',
          category: 'anomaly',
          recommendation: `Cost spike on ${date}: $${cost.toFixed(2)}`,
          action: 'Investigate queries from this date',
          potentialSavings: cost - avgDailyCost
        });
      }
    });

    // General recommendations
    if (summary.totalDataScannedGB > 100) {
      recommendations.push({
        priority: 'low',
        category: 'optimization',
        recommendation: 'High data scan volume',
        action: 'Consider creating aggregate tables for frequent queries',
        potentialSavings: summary.totalCostUSD * 0.5
      });
    }

    return recommendations;
  }

  /**
   * Export cost report
   */
  async exportCostReport(
    workgroupName: string,
    outputPath: string
  ): Promise<void> {
    const summary = await this.getCurrentMonthCosts(workgroupName);
    const recommendations = this.getCostOptimizationRecommendations(summary);

    const report = {
      generatedAt: new Date().toISOString(),
      workgroup: workgroupName,
      summary,
      recommendations,
      configuration: this.config
    };

    // In practice, this would write to S3 or send via email
    console.log('Cost report:', JSON.stringify(report, null, 2));
  }
}

// Type definitions
interface CostSummary {
  totalCostUSD: number;
  totalQueries: number;
  failedQueries: number;
  totalDataScannedGB: number;
  budgetUsedPercent: number;
  costByDay: Record<string, number>;
  projectedMonthlyTotal: number;
}

interface CostRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  recommendation: string;
  action: string;
  potentialSavings: number;
}