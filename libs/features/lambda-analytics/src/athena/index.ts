/**
 * Athena Analytics Module
 * Main entry point for AWS Athena integration
 */

export * from './setup/athena-setup';
export * from './optimization/query-optimizer';
export * from './queries/analytics-library';
export * from './cost-control/cost-manager';
export * from './integration/athena-integration';

import { setupAthenaInfrastructure, ATHENA_CONFIG } from './setup/athena-setup';
import { AthenaQueryOptimizer } from './optimization/query-optimizer';
import { AnalyticsQueryLibrary } from './queries/analytics-library';
import { AthenaCostManager } from './cost-control/cost-manager';
import { AthenaIntegration } from './integration/athena-integration';

/**
 * Main Athena Analytics class
 */
export class AthenaAnalytics {
  private optimizer: AthenaQueryOptimizer;
  private queryLibrary: AnalyticsQueryLibrary;
  private costManager: AthenaCostManager;
  private integration: AthenaIntegration;

  constructor() {
    this.optimizer = new AthenaQueryOptimizer();
    this.queryLibrary = new AnalyticsQueryLibrary();
    this.costManager = new AthenaCostManager();
    this.integration = new AthenaIntegration();
  }

  /**
   * Check if Athena should be enabled based on MRR
   */
  shouldEnableAthena(currentMRR: number): boolean {
    return currentMRR >= ATHENA_CONFIG.mrrThreshold;
  }

  /**
   * Initialize Athena for IOC Analytics
   */
  async initialize(currentMRR: number): Promise<void> {
    if (!this.shouldEnableAthena(currentMRR)) {
      console.log(`Athena not enabled. Current MRR: $${currentMRR}, Required: $${ATHENA_CONFIG.mrrThreshold}`);
      return;
    }

    console.log('Initializing Athena Analytics...');

    // 1. Setup infrastructure
    await setupAthenaInfrastructure(currentMRR);

    // 2. Configure cost controls
    await this.costManager.setupCostControls(
      ATHENA_CONFIG.workgroupName,
      ATHENA_CONFIG.queryResultsBucket
    );

    // 3. Create QuickSight integration
    await this.integration.createQuickSightDataSource('main');

    // 4. Setup scheduled queries
    await this.setupScheduledQueries();

    console.log('Athena Analytics initialized successfully');
  }

  /**
   * Execute an optimized query
   */
  async executeQuery(queryId: string, parameters?: Record<string, any>): Promise<any> {
    const query = this.queryLibrary.getQuery(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    // Optimize query
    const optimized = this.optimizer.optimizeQuery(query.query);
    
    // Execute with integration
    const result = await this.integration.executeQuery(
      optimized.optimized,
      parameters
    );

    // Track costs
    await this.trackQueryCost(queryId, result.metadata);

    return result;
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const [userGrowth, oceanDist, completion, costs] = await Promise.all([
      this.executeQuery('user_growth_monthly'),
      this.executeQuery('ocean_distribution_industry'),
      this.executeQuery('completion_funnel'),
      this.costManager.getCurrentMonthCosts(ATHENA_CONFIG.workgroupName)
    ]);

    return {
      userGrowth: userGrowth.results,
      oceanDistribution: oceanDist.results,
      completionFunnel: completion.results,
      costSummary: costs,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Setup scheduled queries
   */
  private async setupScheduledQueries(): Promise<void> {
    const scheduledQueries = this.queryLibrary.getAllQueries()
      .filter(q => q.refreshFrequency === 'hourly' || q.refreshFrequency === 'daily');

    for (const query of scheduledQueries) {
      console.log(`Scheduling query: ${query.name} (${query.refreshFrequency})`);
      // In practice, this would create CloudWatch Events rules
    }
  }

  /**
   * Track query costs
   */
  private async trackQueryCost(queryId: string, metadata: any): Promise<void> {
    const cost = metadata.estimatedCostUSD;
    console.log(`Query ${queryId} cost: $${cost.toFixed(6)}`);
    
    // In practice, write to cost tracking table
  }

  /**
   * Get optimization tips
   */
  getOptimizationTips(): any {
    return this.optimizer.getCostOptimizedExamples();
  }

  /**
   * Get cost report
   */
  async getCostReport(): Promise<any> {
    const summary = await this.costManager.getCurrentMonthCosts(ATHENA_CONFIG.workgroupName);
    const recommendations = this.costManager.getCostOptimizationRecommendations(summary);
    
    return {
      summary,
      recommendations,
      estimatedMonthlyCost: this.queryLibrary.getEstimatedMonthlyCost(),
      optimization: {
        tips: this.optimizer.getCostOptimizedExamples(),
        partitionConfig: this.optimizer.getPartitionProjectionConfig(),
        workgroupConfig: this.optimizer.getWorkgroupConfig()
      }
    };
  }
}

// Type definitions
interface DashboardData {
  userGrowth: any[];
  oceanDistribution: any[];
  completionFunnel: any[];
  costSummary: any;
  lastUpdated: string;
}

// Default export
export default AthenaAnalytics;