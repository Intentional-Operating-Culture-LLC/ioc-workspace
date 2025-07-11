/**
 * Metric Aggregator for IOC Analytics
 * Collects and batches metrics for cost-effective CloudWatch publishing
 */

import { MetricDatum } from '@aws-sdk/client-cloudwatch';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DashboardBuilder } from './dashboard-builder';

interface BusinessMetrics {
  assessmentsCompleted: number;
  averageOceanScores: {
    O: number;
    C: number;
    E: number;
    A: number;
    N: number;
  };
  dualAISuccessRate: number;
  dailyActiveUsers: Set<string>;
  revenue: number;
  trialConversions: number;
  trialStarts: number;
}

interface SystemMetrics {
  lambdaInvocations: number;
  lambdaErrors: number;
  apiRequests: number;
  apiLatencies: number[];
  s3ProcessingTimes: number[];
  estimatedCosts: {
    lambda: number;
    s3: number;
    cloudwatch: number;
  };
}

export class MetricAggregator {
  private businessMetrics!: BusinessMetrics;
  private systemMetrics!: SystemMetrics;
  private dashboardBuilder: DashboardBuilder;
  private s3Client: S3Client;
  
  constructor(region: string = 'us-east-1') {
    this.dashboardBuilder = new DashboardBuilder(region);
    this.s3Client = new S3Client({ region });
    this.resetMetrics();
  }
  
  private resetMetrics(): void {
    this.businessMetrics = {
      assessmentsCompleted: 0,
      averageOceanScores: { O: 0, C: 0, E: 0, A: 0, N: 0 },
      dualAISuccessRate: 0,
      dailyActiveUsers: new Set(),
      revenue: 0,
      trialConversions: 0,
      trialStarts: 0
    };
    
    this.systemMetrics = {
      lambdaInvocations: 0,
      lambdaErrors: 0,
      apiRequests: 0,
      apiLatencies: [],
      s3ProcessingTimes: [],
      estimatedCosts: {
        lambda: 0,
        s3: 0,
        cloudwatch: 0
      }
    };
  }
  
  /**
   * Track assessment completion
   */
  trackAssessmentCompletion(
    userId: string,
    oceanScores: { O: number; C: number; E: number; A: number; N: number },
    dualAIValidated: boolean
  ): void {
    this.businessMetrics.assessmentsCompleted++;
    this.businessMetrics.dailyActiveUsers.add(userId);
    
    // Update running average of OCEAN scores
    const count = this.businessMetrics.assessmentsCompleted;
    Object.keys(oceanScores).forEach(trait => {
      const key = trait as keyof typeof oceanScores;
      this.businessMetrics.averageOceanScores[key] = 
        (this.businessMetrics.averageOceanScores[key] * (count - 1) + oceanScores[key]) / count;
    });
    
    if (dualAIValidated) {
      const successCount = Math.floor(this.businessMetrics.dualAISuccessRate * (count - 1) / 100) + 1;
      this.businessMetrics.dualAISuccessRate = (successCount / count) * 100;
    }
  }
  
  /**
   * Track revenue event
   */
  trackRevenue(amount: number, type: 'subscription' | 'one-time'): void {
    this.businessMetrics.revenue += amount;
    
    if (type === 'subscription') {
      this.businessMetrics.trialConversions++;
    }
  }
  
  /**
   * Track system performance
   */
  trackSystemPerformance(event: {
    type: 'lambda' | 'api' | 's3';
    duration: number;
    error?: boolean;
    cost?: number;
  }): void {
    switch (event.type) {
      case 'lambda':
        this.systemMetrics.lambdaInvocations++;
        if (event.error) this.systemMetrics.lambdaErrors++;
        if (event.cost) this.systemMetrics.estimatedCosts.lambda += event.cost;
        break;
        
      case 'api':
        this.systemMetrics.apiRequests++;
        this.systemMetrics.apiLatencies.push(event.duration);
        break;
        
      case 's3':
        this.systemMetrics.s3ProcessingTimes.push(event.duration);
        if (event.cost) this.systemMetrics.estimatedCosts.s3 += event.cost;
        break;
    }
  }
  
  /**
   * Aggregate and publish metrics to CloudWatch
   */
  async publishAggregatedMetrics(): Promise<void> {
    const metrics: MetricDatum[] = [];
    
    // Business Metrics
    metrics.push(
      {
        MetricName: 'AssessmentCompleted',
        Value: this.businessMetrics.assessmentsCompleted,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'DualAIValidationSuccess',
        Value: this.businessMetrics.dualAISuccessRate,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'DailyActiveUsers',
        Value: this.businessMetrics.dailyActiveUsers.size,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'RevenueTracked',
        Value: this.businessMetrics.revenue,
        Unit: 'None',
        Timestamp: new Date()
      }
    );
    
    // Trial conversion rate
    if (this.businessMetrics.trialStarts > 0) {
      metrics.push({
        MetricName: 'TrialConversion',
        Value: (this.businessMetrics.trialConversions / this.businessMetrics.trialStarts) * 100,
        Unit: 'Percent',
        Timestamp: new Date()
      });
    }
    
    // System Metrics
    const errorRate = this.systemMetrics.apiRequests > 0
      ? (this.systemMetrics.lambdaErrors / this.systemMetrics.apiRequests) * 100
      : 0;
      
    const avgLatency = this.systemMetrics.apiLatencies.length > 0
      ? this.systemMetrics.apiLatencies.reduce((a, b) => a + b, 0) / this.systemMetrics.apiLatencies.length
      : 0;
      
    const avgS3Time = this.systemMetrics.s3ProcessingTimes.length > 0
      ? this.systemMetrics.s3ProcessingTimes.reduce((a, b) => a + b, 0) / this.systemMetrics.s3ProcessingTimes.length
      : 0;
      
    const costPerAssessment = this.businessMetrics.assessmentsCompleted > 0
      ? (this.systemMetrics.estimatedCosts.lambda + this.systemMetrics.estimatedCosts.s3) / 
        this.businessMetrics.assessmentsCompleted
      : 0;
    
    metrics.push(
      {
        MetricName: 'LambdaErrors',
        Value: this.systemMetrics.lambdaErrors,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'ErrorRate',
        Value: errorRate,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'APILatency',
        Value: avgLatency,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      },
      {
        MetricName: 'S3ProcessingTime',
        Value: avgS3Time,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      },
      {
        MetricName: 'CostPerAssessment',
        Value: costPerAssessment,
        Unit: 'None',
        Timestamp: new Date()
      }
    );
    
    // Publish to CloudWatch
    await this.dashboardBuilder.publishMetrics(metrics);
    
    // Log summary for monitoring
    console.log('Metrics published:', {
      assessments: this.businessMetrics.assessmentsCompleted,
      activeUsers: this.businessMetrics.dailyActiveUsers.size,
      revenue: this.businessMetrics.revenue,
      errorRate: errorRate.toFixed(2),
      costPerAssessment: costPerAssessment.toFixed(4)
    });
    
    // Reset metrics after publishing
    this.resetMetrics();
  }
  
  /**
   * Generate daily summary report
   */
  async generateDailySummary(): Promise<string> {
    const summary = {
      timestamp: new Date().toISOString(),
      business: {
        assessmentsCompleted: this.businessMetrics.assessmentsCompleted,
        uniqueUsers: this.businessMetrics.dailyActiveUsers.size,
        revenue: this.businessMetrics.revenue,
        dualAISuccessRate: this.businessMetrics.dualAISuccessRate,
        averageOceanScores: this.businessMetrics.averageOceanScores,
        conversionRate: this.businessMetrics.trialStarts > 0
          ? (this.businessMetrics.trialConversions / this.businessMetrics.trialStarts) * 100
          : 0
      },
      system: {
        totalRequests: this.systemMetrics.apiRequests,
        errorRate: this.systemMetrics.apiRequests > 0
          ? (this.systemMetrics.lambdaErrors / this.systemMetrics.apiRequests) * 100
          : 0,
        averageLatency: this.systemMetrics.apiLatencies.length > 0
          ? this.systemMetrics.apiLatencies.reduce((a, b) => a + b, 0) / this.systemMetrics.apiLatencies.length
          : 0,
        estimatedDailyCost: Object.values(this.systemMetrics.estimatedCosts).reduce((a, b) => a + b, 0)
      },
      costAnalysis: {
        costPerAssessment: this.businessMetrics.assessmentsCompleted > 0
          ? (this.systemMetrics.estimatedCosts.lambda + this.systemMetrics.estimatedCosts.s3) / 
            this.businessMetrics.assessmentsCompleted
          : 0,
        projectedMonthlyCost: Object.values(this.systemMetrics.estimatedCosts).reduce((a, b) => a + b, 0) * 30
      }
    };
    
    return JSON.stringify(summary, null, 2);
  }
  
  /**
   * Load historical data from S3 for trend analysis
   */
  async loadHistoricalData(bucket: string, prefix: string, days: number = 7): Promise<any[]> {
    const historicalData: any[] = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = `${prefix}/daily-summary-${d.toISOString().split('T')[0]}.json`;
      
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key
        });
        
        const response = await this.s3Client.send(command);
        const data = await response.Body?.transformToString();
        
        if (data) {
          historicalData.push(JSON.parse(data));
        }
      } catch (error) {
        // File might not exist for that day
        console.log(`No data for ${d.toISOString().split('T')[0]}`);
      }
    }
    
    return historicalData;
  }
  
  /**
   * Calculate week-over-week growth metrics
   */
  calculateGrowthMetrics(historicalData: any[]): {
    userGrowth: number;
    revenueGrowth: number;
    assessmentGrowth: number;
    conversionImprovement: number;
  } {
    if (historicalData.length < 14) {
      return {
        userGrowth: 0,
        revenueGrowth: 0,
        assessmentGrowth: 0,
        conversionImprovement: 0
      };
    }
    
    // Week 1 (older)
    const week1Data = historicalData.slice(0, 7);
    const week1Users = week1Data.reduce((sum, d) => sum + d.business.uniqueUsers, 0);
    const week1Revenue = week1Data.reduce((sum, d) => sum + d.business.revenue, 0);
    const week1Assessments = week1Data.reduce((sum, d) => sum + d.business.assessmentsCompleted, 0);
    const week1Conversion = week1Data.reduce((sum, d) => sum + d.business.conversionRate, 0) / 7;
    
    // Week 2 (recent)
    const week2Data = historicalData.slice(7, 14);
    const week2Users = week2Data.reduce((sum, d) => sum + d.business.uniqueUsers, 0);
    const week2Revenue = week2Data.reduce((sum, d) => sum + d.business.revenue, 0);
    const week2Assessments = week2Data.reduce((sum, d) => sum + d.business.assessmentsCompleted, 0);
    const week2Conversion = week2Data.reduce((sum, d) => sum + d.business.conversionRate, 0) / 7;
    
    return {
      userGrowth: week1Users > 0 ? ((week2Users - week1Users) / week1Users) * 100 : 0,
      revenueGrowth: week1Revenue > 0 ? ((week2Revenue - week1Revenue) / week1Revenue) * 100 : 0,
      assessmentGrowth: week1Assessments > 0 ? ((week2Assessments - week1Assessments) / week1Assessments) * 100 : 0,
      conversionImprovement: week2Conversion - week1Conversion
    };
  }
}