/**
 * IOC Core - Data Governance Manager
 * Manages data classification, lineage tracking, quality metrics,
 * and stewardship responsibilities
 */

import { EventEmitter } from 'events';
import {
  DataGovernance,
  DataClassification,
  DataLineage,
  DataQuality,
  DataCatalog,
  DataStewardship,
  DataAsset,
  QualityMetric,
  QualityRule,
  QualityIssue,
  DataSteward,
  Transformation,
  RetentionPolicy
} from '../types';
import { ClassificationEngine } from './ClassificationEngine';
import { LineageTracker } from './LineageTracker';
import { QualityMonitor } from './QualityMonitor';
import { CatalogManager } from './CatalogManager';
import { StewardshipCoordinator } from './StewardshipCoordinator';
import { GovernanceCache } from '../utils/GovernanceCache';
import { createClient } from '../../supabase/server';

export interface GovernanceConfig {
  autoClassification: boolean;
  lineageTracking: boolean;
  qualityMonitoring: boolean;
  catalogingEnabled: boolean;
  retentionEnforcement: boolean;
  qualityThresholds: {
    accuracy: number;
    completeness: number;
    consistency: number;
    timeliness: number;
    validity: number;
    uniqueness: number;
  };
}

export interface GovernanceStatus {
  score: number;
  classification: ClassificationStatus;
  lineage: LineageStatus;
  quality: QualityStatus;
  catalog: CatalogStatus;
  stewardship: StewardshipStatus;
  issues: GovernanceIssue[];
}

interface ClassificationStatus {
  assetsClassified: number;
  unclassifiedAssets: number;
  highRiskAssets: number;
  lastReview: Date;
}

interface LineageStatus {
  trackedFlows: number;
  orphanedAssets: number;
  transformationsDocumented: number;
  coverage: number; // percentage
}

interface QualityStatus {
  overallScore: number;
  failingMetrics: number;
  activeIssues: number;
  trendsImproving: boolean;
}

interface CatalogStatus {
  totalAssets: number;
  documentedAssets: number;
  searchableAssets: number;
  lastUpdated: Date;
}

interface StewardshipStatus {
  activeStewards: number;
  assignedAssets: number;
  overdueResponsibilities: number;
  complianceRate: number;
}

interface GovernanceIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAssets: string[];
  recommendation: string;
}

export class DataGovernanceManager extends EventEmitter {
  private config: GovernanceConfig;
  private governance: DataGovernance;
  private classificationEngine: ClassificationEngine;
  private lineageTracker: LineageTracker;
  private qualityMonitor: QualityMonitor;
  private catalogManager: CatalogManager;
  private stewardshipCoordinator: StewardshipCoordinator;
  private cache: GovernanceCache;
  private supabase = createClient();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<GovernanceConfig>) {
    super();
    this.config = {
      autoClassification: true,
      lineageTracking: true,
      qualityMonitoring: true,
      catalogingEnabled: true,
      retentionEnforcement: true,
      qualityThresholds: {
        accuracy: 95,
        completeness: 98,
        consistency: 95,
        timeliness: 90,
        validity: 99,
        uniqueness: 100
      },
      ...config
    };

    this.governance = this.initializeGovernance();
    this.classificationEngine = new ClassificationEngine(this.config);
    this.lineageTracker = new LineageTracker();
    this.qualityMonitor = new QualityMonitor(this.config.qualityThresholds);
    this.catalogManager = new CatalogManager();
    this.stewardshipCoordinator = new StewardshipCoordinator();
    this.cache = new GovernanceCache();
  }

  private initializeGovernance(): DataGovernance {
    return {
      classification: {
        id: '',
        dataAsset: '',
        classification: 'internal',
        tags: [],
        owner: '',
        reviewDate: new Date(),
        handlingRequirements: []
      },
      lineage: {
        id: '',
        source: { id: '', type: 'database', name: '', location: '' },
        transformations: [],
        destination: { id: '', type: 'database', name: '', location: '' },
        createdAt: new Date(),
        lastModified: new Date()
      },
      quality: {
        metrics: [],
        rules: [],
        issues: [],
        score: 0
      },
      catalog: {
        assets: [],
        metadata: [],
        relationships: [],
        searchIndex: {
          assets: [],
          fields: [],
          lastUpdated: new Date()
        }
      },
      stewardship: {
        stewards: [],
        responsibilities: [],
        activities: []
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-managers
      await Promise.all([
        this.classificationEngine.initialize(),
        this.lineageTracker.initialize(),
        this.qualityMonitor.initialize(),
        this.catalogManager.initialize(),
        this.stewardshipCoordinator.initialize()
      ]);

      // Load governance data
      await this.loadGovernanceData();

      // Set up event handlers
      this.setupEventHandlers();

      // Start monitoring
      this.startGovernanceMonitoring();

      // Schedule regular tasks
      this.scheduleTasks();

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadGovernanceData(): Promise<void> {
    // Load data classifications
    const { data: classifications } = await this.supabase
      .from('data_classifications')
      .select('*')
      .eq('active', true);

    // Load data catalog
    const { data: assets } = await this.supabase
      .from('data_assets')
      .select('*');

    if (assets) {
      this.governance.catalog.assets = assets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        description: a.description,
        metadata: JSON.parse(a.metadata || '{}'),
        tags: JSON.parse(a.tags || '[]'),
        owner: a.owner,
        created: new Date(a.created_at),
        lastModified: new Date(a.last_modified)
      }));
    }

    // Load quality rules
    const { data: rules } = await this.supabase
      .from('quality_rules')
      .select('*')
      .eq('enabled', true);

    if (rules) {
      this.governance.quality.rules = rules.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        expression: r.expression,
        severity: r.severity
      }));
    }

    // Load stewards
    const { data: stewards } = await this.supabase
      .from('data_stewards')
      .select('*')
      .eq('active', true);

    if (stewards) {
      this.governance.stewardship.stewards = stewards.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        dataAssets: JSON.parse(s.data_assets || '[]'),
        permissions: JSON.parse(s.permissions || '[]')
      }));
    }
  }

  private setupEventHandlers(): void {
    // Classification events
    this.classificationEngine.on('asset_classified', (event) => {
      this.handleAssetClassified(event);
    });

    this.classificationEngine.on('classification_changed', (event) => {
      this.handleClassificationChanged(event);
    });

    // Lineage events
    this.lineageTracker.on('lineage_updated', (event) => {
      this.handleLineageUpdated(event);
    });

    this.lineageTracker.on('orphan_detected', (event) => {
      this.handleOrphanDetected(event);
    });

    // Quality events
    this.qualityMonitor.on('quality_issue_detected', (event) => {
      this.handleQualityIssue(event);
    });

    this.qualityMonitor.on('quality_improved', (event) => {
      this.handleQualityImproved(event);
    });

    // Catalog events
    this.catalogManager.on('asset_added', (event) => {
      this.handleAssetAdded(event);
    });

    // Stewardship events
    this.stewardshipCoordinator.on('responsibility_overdue', (event) => {
      this.handleOverdueResponsibility(event);
    });
  }

  private startGovernanceMonitoring(): void {
    // Monitor data quality
    if (this.config.qualityMonitoring) {
      this.monitoringInterval = setInterval(() => {
        this.runQualityChecks();
      }, 300000); // Every 5 minutes
    }

    // Monitor classifications
    setInterval(() => {
      this.reviewClassifications();
    }, 3600000); // Every hour

    // Update lineage
    setInterval(() => {
      this.updateLineage();
    }, 900000); // Every 15 minutes
  }

  private scheduleTasks(): void {
    // Daily tasks
    setInterval(() => {
      this.performDailyGovernanceTasks();
    }, 24 * 60 * 60 * 1000);

    // Weekly tasks
    setInterval(() => {
      this.performWeeklyGovernanceTasks();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  private async runQualityChecks(): Promise<void> {
    try {
      const assets = this.governance.catalog.assets;
      
      for (const asset of assets) {
        const metrics = await this.qualityMonitor.assessDataQuality(asset);
        
        // Update quality metrics
        await this.updateQualityMetrics(asset.id, metrics);
        
        // Check against thresholds
        for (const metric of metrics) {
          if (metric.status === 'fail') {
            await this.createQualityIssue(asset, metric);
          }
        }
      }
      
      // Calculate overall quality score
      await this.calculateQualityScore();
      
    } catch (error) {
      this.emit('error', {
        type: 'quality_check_failed',
        error
      });
    }
  }

  private async updateQualityMetrics(assetId: string, metrics: QualityMetric[]): Promise<void> {
    await this.supabase
      .from('quality_metrics')
      .upsert({
        asset_id: assetId,
        metrics: metrics,
        measured_at: new Date().toISOString()
      });

    // Update governance state
    this.governance.quality.metrics = [
      ...this.governance.quality.metrics.filter(m => m.name !== assetId),
      ...metrics
    ];
  }

  private async createQualityIssue(asset: DataAsset, metric: QualityMetric): Promise<void> {
    const issue: QualityIssue = {
      id: `issue_${Date.now()}`,
      ruleId: `threshold_${metric.dimension}`,
      dataAsset: asset.id,
      description: `${metric.dimension} quality below threshold: ${metric.value}% (threshold: ${metric.threshold}%)`,
      affectedRecords: 0, // Would be calculated based on actual data
      detectedAt: new Date(),
      status: 'open'
    };

    await this.storeQualityIssue(issue);
    this.governance.quality.issues.push(issue);
    
    this.emit('quality_issue_detected', { asset, metric, issue });
  }

  private async storeQualityIssue(issue: QualityIssue): Promise<void> {
    await this.supabase
      .from('quality_issues')
      .insert({
        id: issue.id,
        rule_id: issue.ruleId,
        data_asset: issue.dataAsset,
        description: issue.description,
        affected_records: issue.affectedRecords,
        detected_at: issue.detectedAt.toISOString(),
        status: issue.status
      });
  }

  private async calculateQualityScore(): Promise<void> {
    const metrics = this.governance.quality.metrics;
    if (metrics.length === 0) {
      this.governance.quality.score = 0;
      return;
    }

    // Weight different dimensions
    const weights = {
      accuracy: 0.25,
      completeness: 0.20,
      consistency: 0.20,
      timeliness: 0.15,
      validity: 0.15,
      uniqueness: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      const weight = weights[metric.dimension as keyof typeof weights] || 0.1;
      const score = (metric.value / metric.threshold) * 100;
      weightedScore += Math.min(100, score) * weight;
      totalWeight += weight;
    }

    this.governance.quality.score = Math.round(weightedScore / totalWeight);
  }

  private async reviewClassifications(): Promise<void> {
    try {
      // Find assets needing classification
      const unclassified = this.governance.catalog.assets
        .filter(a => !this.hasValidClassification(a));

      for (const asset of unclassified) {
        if (this.config.autoClassification) {
          await this.autoClassifyAsset(asset);
        } else {
          await this.requestClassification(asset);
        }
      }

      // Review existing classifications
      await this.reviewExistingClassifications();

    } catch (error) {
      this.emit('error', {
        type: 'classification_review_failed',
        error
      });
    }
  }

  private hasValidClassification(asset: DataAsset): boolean {
    const classification = this.getAssetClassification(asset.id);
    if (!classification) return false;

    // Check if review is needed (older than 90 days)
    const daysSinceReview = (Date.now() - classification.reviewDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview < 90;
  }

  private getAssetClassification(assetId: string): DataClassification | null {
    // In production, would query from database
    return null;
  }

  private async autoClassifyAsset(asset: DataAsset): Promise<void> {
    const classification = await this.classificationEngine.classify(asset);
    await this.applyClassification(asset, classification);
  }

  private async requestClassification(asset: DataAsset): Promise<void> {
    // Assign to steward for manual classification
    const steward = this.findResponsibleSteward(asset);
    if (steward) {
      await this.stewardshipCoordinator.assignTask({
        type: 'classify_asset',
        stewardId: steward.id,
        assetId: asset.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }
  }

  private findResponsibleSteward(asset: DataAsset): DataSteward | null {
    return this.governance.stewardship.stewards
      .find(s => s.dataAssets.includes(asset.id)) || null;
  }

  private async applyClassification(asset: DataAsset, classification: any): Promise<void> {
    const dataClassification: DataClassification = {
      id: `class_${Date.now()}`,
      dataAsset: asset.id,
      classification: classification.level,
      tags: classification.tags,
      owner: asset.owner,
      reviewDate: new Date(),
      handlingRequirements: classification.requirements
    };

    await this.supabase
      .from('data_classifications')
      .upsert({
        id: dataClassification.id,
        data_asset: dataClassification.dataAsset,
        classification: dataClassification.classification,
        tags: dataClassification.tags,
        owner: dataClassification.owner,
        review_date: dataClassification.reviewDate.toISOString(),
        handling_requirements: dataClassification.handlingRequirements,
        active: true
      });

    this.emit('asset_classified', { asset, classification: dataClassification });
  }

  private async reviewExistingClassifications(): Promise<void> {
    const { data: classifications } = await this.supabase
      .from('data_classifications')
      .select('*')
      .lt('review_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    for (const classification of classifications || []) {
      await this.scheduleClassificationReview(classification);
    }
  }

  private async scheduleClassificationReview(classification: any): Promise<void> {
    const asset = this.governance.catalog.assets.find(a => a.id === classification.data_asset);
    if (!asset) return;

    const steward = this.findResponsibleSteward(asset);
    if (steward) {
      await this.stewardshipCoordinator.assignTask({
        type: 'review_classification',
        stewardId: steward.id,
        classificationId: classification.id,
        assetId: asset.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      });
    }
  }

  private async updateLineage(): Promise<void> {
    try {
      // Discover new data flows
      const flows = await this.lineageTracker.discoverDataFlows();
      
      for (const flow of flows) {
        await this.recordLineage(flow);
      }

      // Detect orphaned assets
      await this.detectOrphanedAssets();

    } catch (error) {
      this.emit('error', {
        type: 'lineage_update_failed',
        error
      });
    }
  }

  private async recordLineage(flow: any): Promise<void> {
    const lineage: DataLineage = {
      id: flow.id || `lineage_${Date.now()}`,
      source: flow.source,
      transformations: flow.transformations || [],
      destination: flow.destination,
      createdAt: new Date(),
      lastModified: new Date()
    };

    await this.supabase
      .from('data_lineage')
      .upsert({
        id: lineage.id,
        source: lineage.source,
        transformations: lineage.transformations,
        destination: lineage.destination,
        created_at: lineage.createdAt.toISOString(),
        last_modified: lineage.lastModified.toISOString()
      });

    this.emit('lineage_recorded', lineage);
  }

  private async detectOrphanedAssets(): Promise<void> {
    const assets = this.governance.catalog.assets;
    const lineageMap = await this.buildLineageMap();

    for (const asset of assets) {
      if (!lineageMap.has(asset.id)) {
        this.emit('orphan_detected', { asset });
        
        // Create issue
        await this.createGovernanceIssue({
          category: 'lineage',
          severity: 'medium',
          description: `Asset "${asset.name}" has no documented lineage`,
          affectedAssets: [asset.id],
          recommendation: 'Document data source and transformations for this asset'
        });
      }
    }
  }

  private async buildLineageMap(): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    
    const { data: lineage } = await this.supabase
      .from('data_lineage')
      .select('source, destination');

    for (const item of lineage || []) {
      if (item.source?.id) map.set(item.source.id, true);
      if (item.destination?.id) map.set(item.destination.id, true);
    }

    return map;
  }

  private async createGovernanceIssue(issue: Omit<GovernanceIssue, 'id'>): Promise<void> {
    const governanceIssue: GovernanceIssue = {
      id: `gov_issue_${Date.now()}`,
      ...issue
    };

    await this.supabase
      .from('governance_issues')
      .insert({
        id: governanceIssue.id,
        category: governanceIssue.category,
        severity: governanceIssue.severity,
        description: governanceIssue.description,
        affected_assets: governanceIssue.affectedAssets,
        recommendation: governanceIssue.recommendation,
        created_at: new Date().toISOString()
      });
  }

  private async performDailyGovernanceTasks(): Promise<void> {
    try {
      // Update catalog search index
      await this.catalogManager.updateSearchIndex();

      // Check steward responsibilities
      await this.stewardshipCoordinator.checkResponsibilities();

      // Generate quality report
      await this.generateDailyQualityReport();

      // Clean up resolved issues
      await this.cleanupResolvedIssues();

    } catch (error) {
      this.emit('error', {
        type: 'daily_tasks_failed',
        error
      });
    }
  }

  private async generateDailyQualityReport(): Promise<void> {
    const report = {
      date: new Date(),
      overallScore: this.governance.quality.score,
      activeIssues: this.governance.quality.issues.filter(i => i.status === 'open').length,
      metricsBelowThreshold: this.governance.quality.metrics.filter(m => m.status === 'fail').length,
      topIssues: this.governance.quality.issues
        .filter(i => i.status === 'open')
        .sort((a, b) => b.affectedRecords - a.affectedRecords)
        .slice(0, 5)
    };

    await this.supabase
      .from('quality_reports')
      .insert({
        type: 'daily',
        generated_at: report.date.toISOString(),
        content: report
      });

    this.emit('quality_report_generated', report);
  }

  private async cleanupResolvedIssues(): Promise<void> {
    // Archive issues resolved more than 30 days ago
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const resolved = this.governance.quality.issues
      .filter(i => i.status === 'resolved' && i.detectedAt < cutoffDate);

    for (const issue of resolved) {
      await this.archiveQualityIssue(issue);
    }

    // Remove from active list
    this.governance.quality.issues = this.governance.quality.issues
      .filter(i => !(i.status === 'resolved' && i.detectedAt < cutoffDate));
  }

  private async archiveQualityIssue(issue: QualityIssue): Promise<void> {
    await this.supabase
      .from('quality_issues_archive')
      .insert({
        ...issue,
        archived_at: new Date().toISOString()
      });

    await this.supabase
      .from('quality_issues')
      .delete()
      .eq('id', issue.id);
  }

  private async performWeeklyGovernanceTasks(): Promise<void> {
    try {
      // Review access patterns
      await this.reviewDataAccessPatterns();

      // Update steward performance metrics
      await this.updateStewardMetrics();

      // Generate compliance report
      await this.generateWeeklyComplianceReport();

    } catch (error) {
      this.emit('error', {
        type: 'weekly_tasks_failed',
        error
      });
    }
  }

  private async reviewDataAccessPatterns(): Promise<void> {
    // Analyze who is accessing what data
    const { data: accessLogs } = await this.supabase
      .from('data_access_logs')
      .select('user_id, asset_id, access_type, count')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Identify unusual patterns
    const patterns = this.analyzeAccessPatterns(accessLogs || []);
    
    for (const pattern of patterns.unusual) {
      await this.createGovernanceIssue({
        category: 'access',
        severity: pattern.risk,
        description: pattern.description,
        affectedAssets: pattern.assets,
        recommendation: pattern.recommendation
      });
    }
  }

  private analyzeAccessPatterns(logs: any[]): any {
    // Simplified pattern analysis
    const patterns = {
      normal: [],
      unusual: []
    };

    // Group by user and asset
    const userAssetMap = new Map<string, Set<string>>();
    
    for (const log of logs) {
      const key = log.user_id;
      if (!userAssetMap.has(key)) {
        userAssetMap.set(key, new Set());
      }
      userAssetMap.get(key)!.add(log.asset_id);
    }

    // Check for users accessing too many assets
    for (const [userId, assets] of userAssetMap) {
      if (assets.size > 50) {
        patterns.unusual.push({
          type: 'excessive_access',
          userId,
          assets: Array.from(assets),
          risk: 'high',
          description: `User ${userId} accessed ${assets.size} different data assets`,
          recommendation: 'Review user permissions and access needs'
        });
      }
    }

    return patterns;
  }

  private async updateStewardMetrics(): Promise<void> {
    for (const steward of this.governance.stewardship.stewards) {
      const metrics = await this.calculateStewardMetrics(steward);
      
      await this.supabase
        .from('steward_metrics')
        .upsert({
          steward_id: steward.id,
          week_ending: new Date().toISOString(),
          tasks_completed: metrics.tasksCompleted,
          tasks_overdue: metrics.tasksOverdue,
          response_time: metrics.averageResponseTime,
          quality_score: metrics.qualityScore
        });
    }
  }

  private async calculateStewardMetrics(steward: DataSteward): Promise<any> {
    const { data: activities } = await this.supabase
      .from('steward_activities')
      .select('*')
      .eq('steward_id', steward.id)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const tasks = activities?.filter(a => a.type === 'task_completed') || [];
    const overdue = activities?.filter(a => a.type === 'task_overdue') || [];

    return {
      tasksCompleted: tasks.length,
      tasksOverdue: overdue.length,
      averageResponseTime: this.calculateAverageResponseTime(tasks),
      qualityScore: await this.calculateStewardQualityScore(steward)
    };
  }

  private calculateAverageResponseTime(tasks: any[]): number {
    if (tasks.length === 0) return 0;

    let totalTime = 0;
    for (const task of tasks) {
      const created = new Date(task.created_at).getTime();
      const completed = new Date(task.completed_at).getTime();
      totalTime += (completed - created) / (1000 * 60 * 60); // Hours
    }

    return totalTime / tasks.length;
  }

  private async calculateStewardQualityScore(steward: DataSteward): Promise<number> {
    // Calculate based on quality of assets under stewardship
    let totalScore = 0;
    let assetCount = 0;

    for (const assetId of steward.dataAssets) {
      const asset = this.governance.catalog.assets.find(a => a.id === assetId);
      if (asset) {
        const metrics = this.governance.quality.metrics
          .filter(m => m.name === assetId);
        
        if (metrics.length > 0) {
          const assetScore = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
          totalScore += assetScore;
          assetCount++;
        }
      }
    }

    return assetCount > 0 ? Math.round(totalScore / assetCount) : 0;
  }

  private async generateWeeklyComplianceReport(): Promise<void> {
    const report = {
      weekEnding: new Date(),
      governanceScore: await this.calculateGovernanceScore(),
      keyMetrics: {
        classificationCoverage: await this.getClassificationCoverage(),
        lineageCompleteness: await this.getLineageCompleteness(),
        qualityScore: this.governance.quality.score,
        stewardshipCompliance: await this.getStewardshipCompliance()
      },
      topIssues: await this.getTopGovernanceIssues(),
      recommendations: await this.generateRecommendations()
    };

    await this.supabase
      .from('governance_reports')
      .insert({
        type: 'weekly',
        generated_at: report.weekEnding.toISOString(),
        content: report
      });

    this.emit('compliance_report_generated', report);
  }

  private async calculateGovernanceScore(): Promise<number> {
    const status = await this.getStatus();
    
    const weights = {
      classification: 0.25,
      lineage: 0.20,
      quality: 0.30,
      catalog: 0.15,
      stewardship: 0.10
    };

    let score = 0;
    
    // Classification score
    const classificationScore = (status.classification.assetsClassified / 
      (status.classification.assetsClassified + status.classification.unclassifiedAssets)) * 100;
    score += classificationScore * weights.classification;

    // Lineage score
    score += status.lineage.coverage * weights.lineage;

    // Quality score
    score += status.quality.overallScore * weights.quality;

    // Catalog score
    const catalogScore = (status.catalog.documentedAssets / status.catalog.totalAssets) * 100;
    score += catalogScore * weights.catalog;

    // Stewardship score
    score += status.stewardship.complianceRate * weights.stewardship;

    return Math.round(score);
  }

  private async getClassificationCoverage(): Promise<number> {
    const total = this.governance.catalog.assets.length;
    const classified = await this.getClassifiedAssetCount();
    return total > 0 ? (classified / total) * 100 : 0;
  }

  private async getClassifiedAssetCount(): Promise<number> {
    const { count } = await this.supabase
      .from('data_classifications')
      .select('id', { count: 'exact' })
      .eq('active', true);
    return count || 0;
  }

  private async getLineageCompleteness(): Promise<number> {
    const total = this.governance.catalog.assets.length;
    const withLineage = await this.getAssetsWithLineageCount();
    return total > 0 ? (withLineage / total) * 100 : 0;
  }

  private async getAssetsWithLineageCount(): Promise<number> {
    const lineageMap = await this.buildLineageMap();
    return lineageMap.size;
  }

  private async getStewardshipCompliance(): Promise<number> {
    const responsibilities = this.governance.stewardship.responsibilities;
    const overdue = responsibilities.filter(r => r.nextDue < new Date()).length;
    const total = responsibilities.length;
    return total > 0 ? ((total - overdue) / total) * 100 : 100;
  }

  private async getTopGovernanceIssues(): Promise<GovernanceIssue[]> {
    const { data: issues } = await this.supabase
      .from('governance_issues')
      .select('*')
      .eq('resolved', false)
      .order('severity', { ascending: false })
      .limit(5);

    return issues?.map(i => ({
      id: i.id,
      category: i.category,
      severity: i.severity,
      description: i.description,
      affectedAssets: i.affected_assets,
      recommendation: i.recommendation
    })) || [];
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const status = await this.getStatus();

    if (status.classification.unclassifiedAssets > 10) {
      recommendations.push('Prioritize classification of unclassified data assets');
    }

    if (status.quality.overallScore < 90) {
      recommendations.push('Implement data quality improvement initiatives');
    }

    if (status.lineage.orphanedAssets > 0) {
      recommendations.push('Document lineage for orphaned data assets');
    }

    if (status.stewardship.overdueResponsibilities > 5) {
      recommendations.push('Address overdue stewardship responsibilities');
    }

    return recommendations;
  }

  // Event handlers

  private async handleAssetClassified(event: any): Promise<void> {
    // Update metrics
    await this.updateClassificationMetrics();

    // Check if high-risk classification
    if (event.classification.classification === 'restricted') {
      await this.applyRestrictedHandling(event.asset, event.classification);
    }
  }

  private async updateClassificationMetrics(): Promise<void> {
    const metrics = {
      total: this.governance.catalog.assets.length,
      classified: await this.getClassifiedAssetCount(),
      byLevel: await this.getClassificationsByLevel()
    };

    await this.cache.set('classification_metrics', metrics, 300);
  }

  private async getClassificationsByLevel(): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('data_classifications')
      .select('classification')
      .eq('active', true);

    const counts: Record<string, number> = {
      public: 0,
      internal: 0,
      confidential: 0,
      restricted: 0
    };

    for (const item of data || []) {
      counts[item.classification] = (counts[item.classification] || 0) + 1;
    }

    return counts;
  }

  private async applyRestrictedHandling(asset: DataAsset, classification: DataClassification): Promise<void> {
    // Apply special handling for restricted data
    const requirements = [
      { requirement: 'Encryption at rest', applicable: true, implementation: 'AES-256' },
      { requirement: 'Access logging', applicable: true, implementation: 'All access logged' },
      { requirement: 'Limited access', applicable: true, implementation: 'Role-based access only' },
      { requirement: 'Data masking', applicable: true, implementation: 'PII masked in non-prod' }
    ];

    classification.handlingRequirements = requirements;

    // Update access controls
    this.emit('restricted_data_classified', { asset, classification });
  }

  private async handleClassificationChanged(event: any): Promise<void> {
    // Log the change
    await this.supabase
      .from('classification_history')
      .insert({
        asset_id: event.assetId,
        old_classification: event.oldClassification,
        new_classification: event.newClassification,
        changed_by: event.changedBy,
        changed_at: new Date().toISOString(),
        reason: event.reason
      });

    // Update dependent systems
    this.emit('classification_updated', event);
  }

  private async handleLineageUpdated(event: any): Promise<void> {
    // Check for privacy impact
    const privacyImpact = await this.assessPrivacyImpact(event.lineage);
    
    if (privacyImpact.hasImpact) {
      await this.createGovernanceIssue({
        category: 'privacy',
        severity: privacyImpact.severity,
        description: privacyImpact.description,
        affectedAssets: [event.lineage.destination.id],
        recommendation: 'Review data flow for privacy compliance'
      });
    }
  }

  private async assessPrivacyImpact(lineage: DataLineage): Promise<any> {
    // Check if personal data is being transformed
    const sourceClassification = await this.getAssetClassification(lineage.source.id);
    const hasPersonalData = sourceClassification?.tags.includes('personal_data');

    if (!hasPersonalData) {
      return { hasImpact: false };
    }

    // Check transformations for privacy-preserving operations
    const hasAnonymization = lineage.transformations.some(t => 
      t.privacyImpact?.anonymization || t.privacyImpact?.aggregation
    );

    if (!hasAnonymization) {
      return {
        hasImpact: true,
        severity: 'high',
        description: 'Personal data flowing without anonymization'
      };
    }

    return { hasImpact: false };
  }

  private async handleOrphanDetected(event: any): Promise<void> {
    const asset = event.asset;
    
    // Notify steward
    const steward = this.findResponsibleSteward(asset);
    if (steward) {
      await this.stewardshipCoordinator.notifySteward({
        stewardId: steward.id,
        type: 'orphaned_asset',
        asset: asset,
        action: 'Document data lineage'
      });
    }

    // Create task
    await this.stewardshipCoordinator.assignTask({
      type: 'document_lineage',
      stewardId: steward?.id || 'unassigned',
      assetId: asset.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    });
  }

  private async handleQualityIssue(event: any): Promise<void> {
    const { asset, metric, issue } = event;

    // Assign to steward for resolution
    const steward = this.findResponsibleSteward(asset);
    if (steward) {
      await this.stewardshipCoordinator.assignTask({
        type: 'resolve_quality_issue',
        stewardId: steward.id,
        issueId: issue.id,
        assetId: asset.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        priority: metric.dimension === 'accuracy' ? 'high' : 'medium'
      });
    }

    // Update quality score
    await this.calculateQualityScore();
  }

  private async handleQualityImproved(event: any): Promise<void> {
    // Mark related issues as resolved
    const issues = this.governance.quality.issues
      .filter(i => i.dataAsset === event.assetId && i.status === 'open');

    for (const issue of issues) {
      issue.status = 'resolved';
      await this.updateQualityIssue(issue);
    }

    // Update metrics
    await this.calculateQualityScore();
  }

  private async updateQualityIssue(issue: QualityIssue): Promise<void> {
    await this.supabase
      .from('quality_issues')
      .update({
        status: issue.status,
        resolved_at: issue.status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', issue.id);
  }

  private async handleAssetAdded(event: any): Promise<void> {
    const asset = event.asset;

    // Add to catalog
    this.governance.catalog.assets.push(asset);

    // Request classification
    if (this.config.autoClassification) {
      await this.autoClassifyAsset(asset);
    } else {
      await this.requestClassification(asset);
    }

    // Assign steward
    await this.assignAssetSteward(asset);
  }

  private async assignAssetSteward(asset: DataAsset): Promise<void> {
    // Find steward with least workload
    const stewardLoads = await this.calculateStewardWorkloads();
    const leastLoaded = Array.from(stewardLoads.entries())
      .sort((a, b) => a[1] - b[1])[0];

    if (leastLoaded) {
      const steward = this.governance.stewardship.stewards
        .find(s => s.id === leastLoaded[0]);
      
      if (steward) {
        steward.dataAssets.push(asset.id);
        await this.updateSteward(steward);
        
        // Notify steward
        await this.stewardshipCoordinator.notifySteward({
          stewardId: steward.id,
          type: 'asset_assigned',
          asset: asset,
          action: 'Review and classify new asset'
        });
      }
    }
  }

  private async calculateStewardWorkloads(): Promise<Map<string, number>> {
    const workloads = new Map<string, number>();

    for (const steward of this.governance.stewardship.stewards) {
      workloads.set(steward.id, steward.dataAssets.length);
    }

    return workloads;
  }

  private async updateSteward(steward: DataSteward): Promise<void> {
    await this.supabase
      .from('data_stewards')
      .update({
        data_assets: steward.dataAssets,
        updated_at: new Date().toISOString()
      })
      .eq('id', steward.id);
  }

  private async handleOverdueResponsibility(event: any): Promise<void> {
    const { steward, responsibility } = event;

    // Escalate to management
    await this.createGovernanceIssue({
      category: 'stewardship',
      severity: 'medium',
      description: `Steward responsibility overdue: ${responsibility.responsibility}`,
      affectedAssets: steward.dataAssets,
      recommendation: 'Complete overdue responsibility or reassign'
    });

    // Send reminder
    await this.stewardshipCoordinator.sendReminder({
      stewardId: steward.id,
      responsibility: responsibility,
      escalated: true
    });
  }

  // Public API methods

  async getStatus(): Promise<GovernanceStatus> {
    const [
      classificationStatus,
      lineageStatus,
      qualityStatus,
      catalogStatus,
      stewardshipStatus,
      issues
    ] = await Promise.all([
      this.getClassificationStatus(),
      this.getLineageStatus(),
      this.getQualityStatus(),
      this.getCatalogStatus(),
      this.getStewardshipStatus(),
      this.getGovernanceIssues()
    ]);

    const score = await this.calculateGovernanceScore();

    return {
      score,
      classification: classificationStatus,
      lineage: lineageStatus,
      quality: qualityStatus,
      catalog: catalogStatus,
      stewardship: stewardshipStatus,
      issues
    };
  }

  private async getClassificationStatus(): Promise<ClassificationStatus> {
    const total = this.governance.catalog.assets.length;
    const classified = await this.getClassifiedAssetCount();
    const { count: highRisk } = await this.supabase
      .from('data_classifications')
      .select('id', { count: 'exact' })
      .eq('classification', 'restricted')
      .eq('active', true);

    const { data: lastReview } = await this.supabase
      .from('data_classifications')
      .select('review_date')
      .order('review_date', { ascending: false })
      .limit(1)
      .single();

    return {
      assetsClassified: classified,
      unclassifiedAssets: total - classified,
      highRiskAssets: highRisk || 0,
      lastReview: lastReview ? new Date(lastReview.review_date) : new Date()
    };
  }

  private async getLineageStatus(): Promise<LineageStatus> {
    const { count: flows } = await this.supabase
      .from('data_lineage')
      .select('id', { count: 'exact' });

    const lineageMap = await this.buildLineageMap();
    const orphaned = this.governance.catalog.assets.length - lineageMap.size;

    const { count: transformations } = await this.supabase
      .from('data_lineage')
      .select('transformations')
      .not('transformations', 'is', null);

    const coverage = this.governance.catalog.assets.length > 0
      ? (lineageMap.size / this.governance.catalog.assets.length) * 100
      : 0;

    return {
      trackedFlows: flows || 0,
      orphanedAssets: orphaned,
      transformationsDocumented: transformations || 0,
      coverage
    };
  }

  private async getQualityStatus(): Promise<QualityStatus> {
    const failingMetrics = this.governance.quality.metrics
      .filter(m => m.status === 'fail').length;

    const activeIssues = this.governance.quality.issues
      .filter(i => i.status === 'open').length;

    // Check if quality is improving
    const recentScores = await this.getRecentQualityScores();
    const trendsImproving = this.analyzeTrends(recentScores);

    return {
      overallScore: this.governance.quality.score,
      failingMetrics,
      activeIssues,
      trendsImproving
    };
  }

  private async getRecentQualityScores(): Promise<number[]> {
    const { data } = await this.supabase
      .from('quality_reports')
      .select('content')
      .order('generated_at', { ascending: false })
      .limit(7);

    return data?.map(r => r.content.overallScore) || [];
  }

  private analyzeTrends(scores: number[]): boolean {
    if (scores.length < 3) return false;
    
    // Simple trend analysis - check if average of last 3 is better than first 3
    const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    
    return recent > older;
  }

  private async getCatalogStatus(): Promise<CatalogStatus> {
    const total = this.governance.catalog.assets.length;
    const documented = this.governance.catalog.assets
      .filter(a => a.description && a.metadata && Object.keys(a.metadata).length > 0).length;

    const searchable = this.governance.catalog.searchIndex.assets.length;

    return {
      totalAssets: total,
      documentedAssets: documented,
      searchableAssets: searchable,
      lastUpdated: this.governance.catalog.searchIndex.lastUpdated
    };
  }

  private async getStewardshipStatus(): Promise<StewardshipStatus> {
    const activeStewards = this.governance.stewardship.stewards
      .filter(s => s.dataAssets.length > 0).length;

    const assignedAssets = new Set(
      this.governance.stewardship.stewards.flatMap(s => s.dataAssets)
    ).size;

    const overdueResponsibilities = this.governance.stewardship.responsibilities
      .filter(r => r.nextDue < new Date()).length;

    const totalResponsibilities = this.governance.stewardship.responsibilities.length;
    const completedOnTime = totalResponsibilities - overdueResponsibilities;
    const complianceRate = totalResponsibilities > 0
      ? (completedOnTime / totalResponsibilities) * 100
      : 100;

    return {
      activeStewards,
      assignedAssets,
      overdueResponsibilities,
      complianceRate
    };
  }

  private async getGovernanceIssues(): Promise<GovernanceIssue[]> {
    const { data } = await this.supabase
      .from('governance_issues')
      .select('*')
      .eq('resolved', false)
      .order('severity', { ascending: false });

    return data?.map(i => ({
      id: i.id,
      category: i.category,
      severity: i.severity,
      description: i.description,
      affectedAssets: i.affected_assets,
      recommendation: i.recommendation
    })) || [];
  }

  async updateRetentionPolicy(step: any): Promise<void> {
    const { policyId, updates } = step;

    await this.supabase
      .from('retention_policies')
      .update({
        retention_period: updates.retentionPeriod,
        deletion_method: updates.deletionMethod,
        automated_deletion: updates.automatedDeletion,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId);

    this.emit('retention_policy_updated', { policyId, updates });
  }

  async scheduleControlReview(event: any): Promise<void> {
    const control = event.data;
    
    // Find responsible steward
    const steward = this.governance.stewardship.stewards
      .find(s => s.permissions.includes('control_review'));

    if (steward) {
      await this.stewardshipCoordinator.assignTask({
        type: 'control_review',
        stewardId: steward.id,
        controlId: control.id,
        description: `Review failed control: ${control.description}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        priority: 'high'
      });
    }
  }

  async generateReport(period: any): Promise<any> {
    const status = await this.getStatus();
    
    return {
      summary: {
        governanceScore: status.score,
        assetsUnderManagement: status.catalog.totalAssets,
        dataQualityScore: status.quality.overallScore,
        complianceRate: status.stewardship.complianceRate
      },
      classification: {
        coverage: await this.getClassificationCoverage(),
        distribution: await this.getClassificationsByLevel(),
        highRiskAssets: status.classification.highRiskAssets
      },
      lineage: {
        completeness: status.lineage.coverage,
        orphanedAssets: status.lineage.orphanedAssets,
        dataFlows: status.lineage.trackedFlows
      },
      quality: {
        score: status.quality.overallScore,
        issues: status.quality.activeIssues,
        trends: status.quality.trendsImproving ? 'improving' : 'declining'
      },
      stewardship: {
        activeStewards: status.stewardship.activeStewards,
        responsibilities: {
          total: this.governance.stewardship.responsibilities.length,
          overdue: status.stewardship.overdueResponsibilities
        }
      }
    };
  }

  async getFindings(period: any): Promise<any[]> {
    const findings: any[] = [];
    const status = await this.getStatus();

    if (status.classification.unclassifiedAssets > 20) {
      findings.push({
        id: 'unclassified_assets',
        type: 'governance',
        severity: 'high',
        description: `${status.classification.unclassifiedAssets} assets remain unclassified`,
        evidence: ['asset_inventory'],
        recommendation: 'Implement automated classification or assign stewards'
      });
    }

    if (status.quality.overallScore < 90) {
      findings.push({
        id: 'low_data_quality',
        type: 'quality',
        severity: 'medium',
        description: `Data quality score (${status.quality.overallScore}%) below target`,
        evidence: ['quality_metrics'],
        recommendation: 'Implement data quality improvement program'
      });
    }

    if (status.lineage.orphanedAssets > 0) {
      findings.push({
        id: 'orphaned_assets',
        type: 'governance',
        severity: 'medium',
        description: `${status.lineage.orphanedAssets} assets have no documented lineage`,
        evidence: ['lineage_analysis'],
        recommendation: 'Document data sources and transformations'
      });
    }

    return findings;
  }

  async getMetrics(period: any): Promise<any[]> {
    const status = await this.getStatus();
    
    return [
      {
        name: 'Governance Score',
        value: status.score,
        unit: '%',
        target: 85
      },
      {
        name: 'Data Quality Score',
        value: status.quality.overallScore,
        unit: '%',
        target: 95
      },
      {
        name: 'Classification Coverage',
        value: await this.getClassificationCoverage(),
        unit: '%',
        target: 100
      },
      {
        name: 'Stewardship Compliance',
        value: status.stewardship.complianceRate,
        unit: '%',
        target: 95
      }
    ];
  }

  async shutdown(): Promise<void> {
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Shutdown sub-components
    await Promise.all([
      this.classificationEngine.shutdown(),
      this.lineageTracker.shutdown(),
      this.qualityMonitor.shutdown(),
      this.catalogManager.shutdown(),
      this.stewardshipCoordinator.shutdown()
    ]);

    this.emit('shutdown');
  }
}