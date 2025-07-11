/**
 * IOC Core - Compliance Monitor
 * Real-time compliance monitoring, automated checks, and violation detection
 */

import { EventEmitter } from 'events';
import {
  ComplianceViolation,
  ComplianceRisk,
  AutomatedCheck,
  ComplianceReport,
  Finding,
  Metric,
  Evidence,
  RequirementStatus,
  RiskMitigation
} from '../types';
import { ViolationDetector } from './ViolationDetector';
import { RiskAssessor } from './RiskAssessor';
import { ComplianceScorer } from './ComplianceScorer';
import { AlertManager } from './AlertManager';
import { ReportGenerator } from './ReportGenerator';
import { ComplianceDatabase } from '../utils/ComplianceDatabase';
import { MetricsCollector } from '../utils/MetricsCollector';
import { createClient } from '../../supabase/server';

export interface MonitoringConfig {
  realTimeEnabled: boolean;
  checkInterval: number; // minutes
  retentionDays: number;
  alertThresholds: {
    violationCount: number;
    riskScore: number;
    complianceScore: number;
  };
  automatedChecks: boolean;
  anomalyDetection: boolean;
}

export interface MonitoringStatus {
  activeViolations: number;
  activeRisks: number;
  checksRunToday: number;
  alertsTriggered: number;
  complianceScore: number;
  lastCheck: Date;
  nextCheck: Date;
}

export class ComplianceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private violationDetector: ViolationDetector;
  private riskAssessor: RiskAssessor;
  private complianceScorer: ComplianceScorer;
  private alertManager: AlertManager;
  private reportGenerator: ReportGenerator;
  private database: ComplianceDatabase;
  private metrics: MetricsCollector;
  private supabase = createClient();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private violations: Map<string, ComplianceViolation> = new Map();
  private risks: Map<string, ComplianceRisk> = new Map();

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = {
      realTimeEnabled: true,
      checkInterval: 15, // 15 minutes
      retentionDays: 90,
      alertThresholds: {
        violationCount: 5,
        riskScore: 15,
        complianceScore: 70
      },
      automatedChecks: true,
      anomalyDetection: true,
      ...config
    };

    this.violationDetector = new ViolationDetector();
    this.riskAssessor = new RiskAssessor();
    this.complianceScorer = new ComplianceScorer();
    this.alertManager = new AlertManager(this.config.alertThresholds);
    this.reportGenerator = new ReportGenerator();
    this.database = new ComplianceDatabase();
    this.metrics = new MetricsCollector();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-components
      await Promise.all([
        this.violationDetector.initialize(),
        this.riskAssessor.initialize(),
        this.complianceScorer.initialize(),
        this.alertManager.initialize(),
        this.database.initialize()
      ]);

      // Load active violations and risks
      await this.loadActiveItems();

      // Set up event handlers
      this.setupEventHandlers();

      // Start monitoring if enabled
      if (this.config.realTimeEnabled) {
        this.startMonitoring();
      }

      // Schedule cleanup
      this.scheduleCleanup();

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadActiveItems(): Promise<void> {
    // Load active violations
    const { data: violations } = await this.supabase
      .from('compliance_violations')
      .select('*')
      .eq('resolved', false);

    for (const violation of violations || []) {
      this.violations.set(violation.id, this.parseViolation(violation));
    }

    // Load active risks
    const { data: risks } = await this.supabase
      .from('compliance_risks')
      .select('*, mitigations:risk_mitigations(*)')
      .gt('risk_score', 5); // Only track meaningful risks

    for (const risk of risks || []) {
      this.risks.set(risk.id, this.parseRisk(risk));
    }
  }

  private parseViolation(raw: any): ComplianceViolation {
    return {
      id: raw.id,
      detectedAt: new Date(raw.detected_at),
      regulation: raw.regulation,
      requirement: raw.requirement,
      severity: raw.severity,
      description: raw.description,
      affectedData: JSON.parse(raw.affected_data || '[]'),
      remediation: JSON.parse(raw.remediation || '{}'),
      resolved: raw.resolved
    };
  }

  private parseRisk(raw: any): ComplianceRisk {
    return {
      id: raw.id,
      category: raw.category,
      description: raw.description,
      likelihood: raw.likelihood,
      impact: raw.impact,
      riskScore: raw.risk_score,
      mitigations: raw.mitigations?.map((m: any) => ({
        id: m.id,
        description: m.description,
        effectiveness: m.effectiveness,
        implementationStatus: m.implementation_status,
        cost: m.cost
      })) || [],
      residualRisk: raw.residual_risk
    };
  }

  private setupEventHandlers(): void {
    // Violation detector events
    this.violationDetector.on('violation_detected', (violation) => {
      this.handleViolationDetected(violation);
    });

    // Risk assessor events
    this.riskAssessor.on('risk_identified', (risk) => {
      this.handleRiskIdentified(risk);
    });

    // Alert manager events
    this.alertManager.on('alert_triggered', (alert) => {
      this.emit('alert', alert);
    });

    // Compliance scorer events
    this.complianceScorer.on('score_changed', (score) => {
      this.handleScoreChange(score);
    });
  }

  private startMonitoring(): void {
    // Run initial check
    this.runMonitoringCycle();

    // Schedule regular checks
    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, this.config.checkInterval * 60 * 1000);
  }

  private async runMonitoringCycle(): Promise<void> {
    try {
      this.emit('monitoring_started');

      // Run automated checks
      if (this.config.automatedChecks) {
        await this.runAutomatedChecks();
      }

      // Detect anomalies
      if (this.config.anomalyDetection) {
        await this.detectAnomalies();
      }

      // Update compliance score
      await this.updateComplianceScore();

      // Check thresholds
      await this.checkThresholds();

      // Update metrics
      this.metrics.increment('compliance.monitoring.cycles');
      
      this.emit('monitoring_completed');
    } catch (error) {
      this.emit('monitoring_error', error);
      this.metrics.increment('compliance.monitoring.errors');
    }
  }

  private async runAutomatedChecks(): Promise<void> {
    const checks = await this.getScheduledChecks();
    
    for (const check of checks) {
      try {
        const result = await this.runCheck(check);
        
        // Record result
        await this.recordCheckResult(check, result);
        
        // Handle failures
        if (!result.passed) {
          await this.handleCheckFailure(check, result);
        }
        
        this.metrics.increment('compliance.checks.completed');
      } catch (error) {
        this.metrics.increment('compliance.checks.failed');
        this.emit('check_error', { check, error });
      }
    }
  }

  private async getScheduledChecks(): Promise<AutomatedCheck[]> {
    const { data: checks } = await this.supabase
      .from('automated_checks')
      .select('*')
      .eq('enabled', true)
      .or(`next_run.is.null,next_run.lte.${new Date().toISOString()}`);

    return checks?.map(c => ({
      id: c.id,
      name: c.name,
      schedule: c.schedule,
      query: c.query,
      threshold: JSON.parse(c.threshold || '{}'),
      severity: c.severity
    })) || [];
  }

  async runCheck(check: AutomatedCheck): Promise<any> {
    // Execute the check query
    const result = await this.executeCheckQuery(check.query);
    
    // Evaluate against threshold
    const passed = this.evaluateThreshold(result, check.threshold);
    
    return {
      checkId: check.id,
      timestamp: new Date(),
      result,
      passed,
      message: passed ? 'Check passed' : this.generateFailureMessage(check, result)
    };
  }

  private async executeCheckQuery(query: string): Promise<any> {
    // Parse and execute the query
    // This is simplified - in production would have a proper query engine
    const queryParts = query.split('.');
    const table = queryParts[0];
    const operation = queryParts[1];
    
    switch (operation) {
      case 'count':
        const { count } = await this.supabase
          .from(table)
          .select('id', { count: 'exact' });
        return count;
        
      case 'avg':
        const field = queryParts[2];
        const { data } = await this.supabase
          .from(table)
          .select(field);
        const values = data?.map(d => d[field]) || [];
        return values.reduce((a, b) => a + b, 0) / values.length;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private evaluateThreshold(value: any, threshold: any): boolean {
    if (typeof threshold === 'object') {
      if (threshold.min !== undefined && value < threshold.min) return false;
      if (threshold.max !== undefined && value > threshold.max) return false;
      if (threshold.equals !== undefined && value !== threshold.equals) return false;
      return true;
    }
    
    return value <= threshold;
  }

  private generateFailureMessage(check: AutomatedCheck, result: any): string {
    return `Check "${check.name}" failed: value ${result} exceeds threshold ${JSON.stringify(check.threshold)}`;
  }

  private async recordCheckResult(check: AutomatedCheck, result: any): Promise<void> {
    await this.supabase
      .from('check_results')
      .insert({
        check_id: check.id,
        timestamp: result.timestamp.toISOString(),
        passed: result.passed,
        value: result.result,
        message: result.message
      });

    // Update next run time
    const nextRun = this.calculateNextRun(check.schedule);
    await this.supabase
      .from('automated_checks')
      .update({ 
        last_run: new Date().toISOString(),
        next_run: nextRun.toISOString() 
      })
      .eq('id', check.id);
  }

  private calculateNextRun(schedule: string): Date {
    // Simple cron-like scheduling
    // In production would use a proper cron parser
    const now = new Date();
    const parts = schedule.split(' ');
    
    if (parts[1] === '*' && parts[2] === '*') {
      // Hourly
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (parts[2] === '*') {
      // Daily
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else {
      // Weekly
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async handleCheckFailure(check: AutomatedCheck, result: any): Promise<void> {
    // Create violation if severe enough
    if (check.severity === 'high' || check.severity === 'critical') {
      const violation: ComplianceViolation = {
        id: `violation_${Date.now()}`,
        detectedAt: new Date(),
        regulation: 'Internal Policy',
        requirement: check.name,
        severity: check.severity,
        description: result.message,
        affectedData: [],
        remediation: {
          id: `rem_${Date.now()}`,
          steps: [],
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignedTo: 'compliance_team',
          priority: check.severity
        },
        resolved: false
      };
      
      await this.createViolation(violation);
    }
    
    // Trigger alert if needed
    await this.alertManager.evaluateCheckFailure(check, result);
  }

  private async detectAnomalies(): Promise<void> {
    // Analyze patterns for anomalies
    const anomalies = await this.violationDetector.detectAnomalies();
    
    for (const anomaly of anomalies) {
      if (anomaly.confidence > 0.8) {
        // High confidence anomaly
        await this.handleAnomaly(anomaly);
      }
    }
  }

  private async handleAnomaly(anomaly: any): Promise<void> {
    // Assess risk of anomaly
    const risk = await this.riskAssessor.assessAnomaly(anomaly);
    
    if (risk.score > 10) {
      // Create risk record
      await this.createRisk({
        category: 'anomaly',
        description: anomaly.description,
        likelihood: risk.likelihood,
        impact: risk.impact,
        source: 'anomaly_detection'
      });
    }
    
    // Log for investigation
    await this.supabase
      .from('compliance_anomalies')
      .insert({
        detected_at: new Date().toISOString(),
        type: anomaly.type,
        description: anomaly.description,
        confidence: anomaly.confidence,
        data: anomaly.data
      });
  }

  private async updateComplianceScore(): Promise<void> {
    const score = await this.complianceScorer.calculateScore({
      violations: Array.from(this.violations.values()),
      risks: Array.from(this.risks.values()),
      checkResults: await this.getRecentCheckResults()
    });
    
    // Record score
    await this.supabase
      .from('compliance_scores')
      .insert({
        timestamp: new Date().toISOString(),
        score: score.overall,
        components: score.components,
        factors: score.factors
      });
    
    // Update metrics
    this.metrics.gauge('compliance.score.overall', score.overall);
    
    // Emit if significant change
    const previousScore = await this.getPreviousScore();
    if (Math.abs(score.overall - previousScore) > 5) {
      this.emit('score_changed', {
        previous: previousScore,
        current: score.overall,
        change: score.overall - previousScore
      });
    }
  }

  private async getRecentCheckResults(): Promise<any[]> {
    const { data } = await this.supabase
      .from('check_results')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });
    
    return data || [];
  }

  private async getPreviousScore(): Promise<number> {
    const { data } = await this.supabase
      .from('compliance_scores')
      .select('score')
      .order('timestamp', { ascending: false })
      .limit(2);
    
    return data?.[1]?.score || 0;
  }

  private async checkThresholds(): Promise<void> {
    const status = await this.getStatus();
    
    // Check violation threshold
    if (status.activeViolations > this.config.alertThresholds.violationCount) {
      await this.alertManager.triggerAlert({
        type: 'violation_threshold',
        severity: 'high',
        message: `Active violations (${status.activeViolations}) exceed threshold (${this.config.alertThresholds.violationCount})`,
        data: { violations: status.activeViolations }
      });
    }
    
    // Check risk threshold
    const highRisks = Array.from(this.risks.values())
      .filter(r => r.riskScore >= this.config.alertThresholds.riskScore);
    
    if (highRisks.length > 0) {
      await this.alertManager.triggerAlert({
        type: 'risk_threshold',
        severity: 'high',
        message: `${highRisks.length} high-risk items detected`,
        data: { risks: highRisks }
      });
    }
    
    // Check compliance score threshold
    if (status.complianceScore < this.config.alertThresholds.complianceScore) {
      await this.alertManager.triggerAlert({
        type: 'compliance_threshold',
        severity: 'critical',
        message: `Compliance score (${status.complianceScore}%) below threshold (${this.config.alertThresholds.complianceScore}%)`,
        data: { score: status.complianceScore }
      });
    }
  }

  private async handleViolationDetected(violation: ComplianceViolation): Promise<void> {
    // Store violation
    await this.storeViolation(violation);
    
    // Update local cache
    this.violations.set(violation.id, violation);
    
    // Emit event
    this.emit('violation_detected', violation);
    
    // Check if critical
    if (violation.severity === 'critical') {
      await this.alertManager.triggerCriticalAlert(violation);
    }
    
    // Update metrics
    this.metrics.increment(`compliance.violations.${violation.severity}`);
  }

  private async handleRiskIdentified(risk: ComplianceRisk): Promise<void> {
    // Store risk
    await this.storeRisk(risk);
    
    // Update local cache
    this.risks.set(risk.id, risk);
    
    // Emit event
    this.emit('risk_detected', risk);
    
    // Generate mitigation plan if high risk
    if (risk.riskScore >= 15) {
      await this.generateMitigationPlan(risk);
    }
    
    // Update metrics
    this.metrics.gauge('compliance.risks.total', this.risks.size);
    this.metrics.gauge(`compliance.risks.${risk.category}`, risk.riskScore);
  }

  private async generateMitigationPlan(risk: ComplianceRisk): Promise<void> {
    const mitigations = await this.riskAssessor.generateMitigations(risk);
    
    // Store mitigations
    for (const mitigation of mitigations) {
      await this.supabase
        .from('risk_mitigations')
        .insert({
          risk_id: risk.id,
          description: mitigation.description,
          effectiveness: mitigation.effectiveness,
          implementation_status: 'planned',
          cost: mitigation.cost
        });
    }
    
    // Update risk with mitigations
    risk.mitigations = mitigations;
    risk.residualRisk = this.calculateResidualRisk(risk);
    
    await this.updateRisk(risk);
  }

  private calculateResidualRisk(risk: ComplianceRisk): number {
    if (!risk.mitigations || risk.mitigations.length === 0) {
      return risk.riskScore;
    }
    
    const totalEffectiveness = risk.mitigations
      .filter(m => m.implementationStatus === 'implemented')
      .reduce((sum, m) => sum + (m.effectiveness / 100), 0);
    
    const mitigationFactor = Math.min(0.9, totalEffectiveness * 0.8);
    return Math.round(risk.riskScore * (1 - mitigationFactor));
  }

  private async handleScoreChange(event: any): Promise<void> {
    // Check if score dropped significantly
    if (event.change < -10) {
      await this.alertManager.triggerAlert({
        type: 'score_drop',
        severity: 'high',
        message: `Compliance score dropped by ${Math.abs(event.change)} points`,
        data: event
      });
    }
    
    // Update dashboard
    this.emit('compliance_score_updated', event.current);
  }

  private scheduleCleanup(): void {
    // Daily cleanup of old data
    setInterval(async () => {
      await this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up old check results
    await this.supabase
      .from('check_results')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());
    
    // Clean up old scores
    await this.supabase
      .from('compliance_scores')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());
    
    // Archive resolved violations
    const { data: oldViolations } = await this.supabase
      .from('compliance_violations')
      .select('*')
      .eq('resolved', true)
      .lt('resolved_at', cutoffDate.toISOString());
    
    if (oldViolations && oldViolations.length > 0) {
      // Archive to long-term storage
      await this.archiveViolations(oldViolations);
      
      // Delete from active table
      await this.supabase
        .from('compliance_violations')
        .delete()
        .in('id', oldViolations.map(v => v.id));
    }
  }

  private async archiveViolations(violations: any[]): Promise<void> {
    await this.supabase
      .from('compliance_violations_archive')
      .insert(violations.map(v => ({
        ...v,
        archived_at: new Date().toISOString()
      })));
  }

  // Public API methods

  async getActiveViolations(): Promise<ComplianceViolation[]> {
    return Array.from(this.violations.values())
      .filter(v => !v.resolved)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async getActiveRisks(): Promise<ComplianceRisk[]> {
    return Array.from(this.risks.values())
      .filter(r => r.residualRisk > 5)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  async createViolation(event: any): Promise<ComplianceViolation> {
    const violation: ComplianceViolation = {
      id: event.id || `violation_${Date.now()}`,
      detectedAt: new Date(),
      regulation: event.regulation || 'Unknown',
      requirement: event.requirement || 'Unknown',
      severity: event.severity || 'medium',
      description: event.description,
      affectedData: event.affectedData || [],
      remediation: event.remediation || {
        id: `rem_${Date.now()}`,
        steps: [],
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTo: 'compliance_team',
        priority: event.severity || 'medium'
      },
      resolved: false
    };
    
    await this.storeViolation(violation);
    this.violations.set(violation.id, violation);
    
    return violation;
  }

  async storeViolation(violation: ComplianceViolation): Promise<void> {
    await this.supabase
      .from('compliance_violations')
      .upsert({
        id: violation.id,
        detected_at: violation.detectedAt.toISOString(),
        regulation: violation.regulation,
        requirement: violation.requirement,
        severity: violation.severity,
        description: violation.description,
        affected_data: JSON.stringify(violation.affectedData),
        remediation: JSON.stringify(violation.remediation),
        resolved: violation.resolved,
        resolved_at: violation.resolved ? new Date().toISOString() : null
      });
  }

  async updateViolation(violation: ComplianceViolation): Promise<void> {
    await this.storeViolation(violation);
    this.violations.set(violation.id, violation);
  }

  async createRisk(data: any): Promise<ComplianceRisk> {
    const risk: ComplianceRisk = {
      id: `risk_${Date.now()}`,
      category: data.category,
      description: data.description,
      likelihood: data.likelihood,
      impact: data.impact,
      riskScore: data.likelihood * data.impact,
      mitigations: [],
      residualRisk: data.likelihood * data.impact
    };
    
    await this.storeRisk(risk);
    this.risks.set(risk.id, risk);
    
    return risk;
  }

  async storeRisk(risk: ComplianceRisk): Promise<void> {
    await this.supabase
      .from('compliance_risks')
      .upsert({
        id: risk.id,
        category: risk.category,
        description: risk.description,
        likelihood: risk.likelihood,
        impact: risk.impact,
        risk_score: risk.riskScore,
        residual_risk: risk.residualRisk,
        created_at: new Date().toISOString()
      });
  }

  async updateRisk(risk: ComplianceRisk): Promise<void> {
    await this.storeRisk(risk);
    this.risks.set(risk.id, risk);
  }

  async assessControlFailureImpact(event: any): Promise<any> {
    return await this.riskAssessor.assessControlFailure(event);
  }

  async storeReport(report: ComplianceReport): Promise<void> {
    await this.supabase
      .from('compliance_reports')
      .insert({
        id: report.id,
        type: report.type,
        generated_at: report.generatedAt.toISOString(),
        period_start: report.period.start.toISOString(),
        period_end: report.period.end.toISOString(),
        regulations: report.regulations,
        summary: report.summary,
        details: JSON.stringify(report.details),
        attestation: report.attestation ? JSON.stringify(report.attestation) : null
      });
  }

  async getStatus(): Promise<MonitoringStatus> {
    const [
      activeViolations,
      activeRisks,
      checksRunToday,
      alertsTriggered,
      complianceScore
    ] = await Promise.all([
      this.getActiveViolationCount(),
      this.getActiveRiskCount(),
      this.getChecksRunToday(),
      this.alertManager.getAlertsTriggeredToday(),
      this.complianceScorer.getCurrentScore()
    ]);
    
    const lastCheck = await this.getLastCheckTime();
    const nextCheck = new Date(lastCheck.getTime() + this.config.checkInterval * 60 * 1000);
    
    return {
      activeViolations,
      activeRisks,
      checksRunToday,
      alertsTriggered,
      complianceScore,
      lastCheck,
      nextCheck
    };
  }

  private async getActiveViolationCount(): Promise<number> {
    return this.violations.size;
  }

  private async getActiveRiskCount(): Promise<number> {
    return Array.from(this.risks.values())
      .filter(r => r.residualRisk > 5).length;
  }

  private async getChecksRunToday(): Promise<number> {
    const { count } = await this.supabase
      .from('check_results')
      .select('id', { count: 'exact' })
      .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    
    return count || 0;
  }

  private async getLastCheckTime(): Promise<Date> {
    const { data } = await this.supabase
      .from('check_results')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    return data ? new Date(data.timestamp) : new Date();
  }

  async getFindings(period: any): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    // Get violations in period
    const violations = await this.getViolationsInPeriod(period);
    
    for (const violation of violations) {
      findings.push({
        id: violation.id,
        type: 'compliance',
        severity: violation.severity,
        description: violation.description,
        evidence: [`violation_${violation.id}`],
        recommendation: violation.remediation.steps[0]?.description || 'Review and remediate violation'
      });
    }
    
    // Get high risks
    const highRisks = Array.from(this.risks.values())
      .filter(r => r.riskScore >= 15);
    
    for (const risk of highRisks) {
      findings.push({
        id: risk.id,
        type: 'risk',
        severity: risk.riskScore >= 20 ? 'critical' : 'high',
        description: risk.description,
        evidence: [`risk_${risk.id}`],
        recommendation: risk.mitigations[0]?.description || 'Implement risk mitigation strategies'
      });
    }
    
    return findings;
  }

  private async getViolationsInPeriod(period: any): Promise<ComplianceViolation[]> {
    const { data } = await this.supabase
      .from('compliance_violations')
      .select('*')
      .gte('detected_at', period.start.toISOString())
      .lte('detected_at', period.end.toISOString());
    
    return data?.map(v => this.parseViolation(v)) || [];
  }

  async analyzeTrends(period: any): Promise<any> {
    const dailyScores = await this.getDailyScores(period);
    const violationTrends = await this.getViolationTrends(period);
    const riskTrends = await this.getRiskTrends(period);
    
    return {
      scoreTrajectory: this.calculateTrajectory(dailyScores),
      violationTrends,
      riskTrends,
      predictions: await this.generatePredictions(dailyScores, violationTrends, riskTrends)
    };
  }

  private async getDailyScores(period: any): Promise<any[]> {
    const { data } = await this.supabase
      .from('compliance_scores')
      .select('timestamp, score')
      .gte('timestamp', period.start.toISOString())
      .lte('timestamp', period.end.toISOString())
      .order('timestamp');
    
    return data || [];
  }

  private async getViolationTrends(period: any): Promise<any> {
    const { data } = await this.supabase
      .from('compliance_violations')
      .select('detected_at, severity')
      .gte('detected_at', period.start.toISOString())
      .lte('detected_at', period.end.toISOString());
    
    return this.aggregateTrends(data || [], 'severity');
  }

  private async getRiskTrends(period: any): Promise<any> {
    const { data } = await this.supabase
      .from('compliance_risks')
      .select('created_at, category, risk_score')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());
    
    return this.aggregateTrends(data || [], 'category');
  }

  private calculateTrajectory(scores: any[]): string {
    if (scores.length < 2) return 'stable';
    
    const recentScores = scores.slice(-7); // Last 7 scores
    const average = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    const firstScore = recentScores[0].score;
    const lastScore = recentScores[recentScores.length - 1].score;
    
    if (lastScore > firstScore + 5) return 'improving';
    if (lastScore < firstScore - 5) return 'declining';
    return 'stable';
  }

  private aggregateTrends(data: any[], groupBy: string): any {
    const trends: Record<string, number> = {};
    
    for (const item of data) {
      const key = item[groupBy];
      trends[key] = (trends[key] || 0) + 1;
    }
    
    return trends;
  }

  private async generatePredictions(scores: any[], violations: any, risks: any): Promise<any> {
    // Simple trend-based predictions
    const scoreTrajectory = this.calculateTrajectory(scores);
    const predictions: any = {
      nextWeekScore: scores[scores.length - 1]?.score || 0,
      riskOutlook: 'stable',
      recommendations: []
    };
    
    if (scoreTrajectory === 'declining') {
      predictions.nextWeekScore -= 5;
      predictions.riskOutlook = 'increasing';
      predictions.recommendations.push('Address compliance issues immediately');
    } else if (scoreTrajectory === 'improving') {
      predictions.nextWeekScore += 3;
      predictions.riskOutlook = 'decreasing';
      predictions.recommendations.push('Continue current compliance practices');
    }
    
    return predictions;
  }

  async getAchievements(period: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // Check for resolved violations
    const { count: resolvedCount } = await this.supabase
      .from('compliance_violations')
      .select('id', { count: 'exact' })
      .eq('resolved', true)
      .gte('resolved_at', period.start.toISOString());
    
    if (resolvedCount && resolvedCount > 0) {
      achievements.push(`Resolved ${resolvedCount} compliance violations`);
    }
    
    // Check for score improvements
    const scores = await this.getDailyScores(period);
    if (scores.length > 0) {
      const improvement = scores[scores.length - 1].score - scores[0].score;
      if (improvement > 0) {
        achievements.push(`Improved compliance score by ${improvement} points`);
      }
    }
    
    // Check for successful mitigations
    const { count: mitigatedCount } = await this.supabase
      .from('risk_mitigations')
      .select('id', { count: 'exact' })
      .eq('implementation_status', 'implemented')
      .gte('updated_at', period.start.toISOString());
    
    if (mitigatedCount && mitigatedCount > 0) {
      achievements.push(`Implemented ${mitigatedCount} risk mitigations`);
    }
    
    return achievements;
  }

  async getConcerns(period: any): Promise<string[]> {
    const concerns: string[] = [];
    
    // Check for unresolved critical violations
    const criticalViolations = Array.from(this.violations.values())
      .filter(v => !v.resolved && v.severity === 'critical');
    
    if (criticalViolations.length > 0) {
      concerns.push(`${criticalViolations.length} critical violations remain unresolved`);
    }
    
    // Check for increasing risks
    const riskTrends = await this.getRiskTrends(period);
    const totalRisks = Object.values(riskTrends).reduce((sum: number, count: any) => sum + count, 0);
    if (totalRisks > 10) {
      concerns.push(`Risk levels are increasing with ${totalRisks} new risks identified`);
    }
    
    // Check for failed checks
    const { count: failedChecks } = await this.supabase
      .from('check_results')
      .select('id', { count: 'exact' })
      .eq('passed', false)
      .gte('timestamp', period.start.toISOString());
    
    if (failedChecks && failedChecks > 5) {
      concerns.push(`${failedChecks} automated compliance checks failed`);
    }
    
    return concerns;
  }

  async shutdown(): Promise<void> {
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Shutdown sub-components
    await Promise.all([
      this.violationDetector.shutdown(),
      this.riskAssessor.shutdown(),
      this.complianceScorer.shutdown(),
      this.alertManager.shutdown()
    ]);
    
    this.emit('shutdown');
  }
}