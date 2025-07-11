// Quality Assurance and Validation Framework
// Comprehensive data quality monitoring, risk assessment, and automated validation

import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { AnonymizedData, AnonymizationResult } from './anonymization-engine';
import { ComplianceReport } from './compliance-validator';

export interface QualityMetrics {
  completeness: number;      // 0-100: % of non-null values
  accuracy: number;          // 0-100: % of values meeting expected format/range
  consistency: number;       // 0-100: % of values consistent across related fields
  validity: number;          // 0-100: % of values passing validation rules
  uniqueness: number;        // 0-100: % of values that are appropriately unique
  integrity: number;         // 0-100: % of referential integrity maintained
  timeliness: number;        // 0-100: % of data processed within SLA
  anonymization: number;     // 0-100: quality of anonymization process
}

export interface QualityAssessment {
  id: string;
  dataId: string;
  timestamp: string;
  overallScore: number;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendations: string[];
  passedValidation: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: {
    sampleSize: number;
    processingTime: number;
    validationMethod: string;
    dataVersion: string;
  };
}

export interface QualityIssue {
  type: 'MISSING_DATA' | 'INVALID_FORMAT' | 'INCONSISTENT_VALUE' | 
        'DUPLICATE_VALUE' | 'RANGE_VIOLATION' | 'ANONYMIZATION_FAILURE' |
        'REFERENTIAL_INTEGRITY' | 'TEMPORAL_INCONSISTENCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  field: string;
  description: string;
  expectedValue?: any;
  actualValue?: any;
  count: number;
  affectedRecords: string[];
  suggestedFix: string;
  autoFixable: boolean;
}

export interface QualityRule {
  id: string;
  name: string;
  category: keyof QualityMetrics;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validator: (data: any, context: QualityContext) => QualityRuleResult;
  autoFix?: (data: any, issue: QualityIssue) => any;
  enabled: boolean;
  weight: number; // 0-1: contribution to overall score
}

export interface QualityRuleResult {
  passed: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  metadata?: any;
}

export interface QualityContext {
  dataType: string;
  expectedSchema?: any;
  businessRules?: any;
  historicalData?: any;
  complianceRequirements?: string[];
}

export interface RiskAssessment {
  id: string;
  dataId: string;
  timestamp: string;
  overallRisk: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: Array<{
    factor: string;
    impact: number; // 0-100
    likelihood: number; // 0-100
    riskScore: number; // 0-100
    mitigation: string;
  }>;
  reidentificationRisk: {
    kAnonymity: number;
    lDiversity: number;
    tCloseness: number;
    quasiIdentifiers: string[];
    sensitiveAttributes: string[];
    estimatedRisk: number;
  };
  complianceRisk: {
    gdprRisk: number;
    hipaaRisk: number;
    ccpaRisk: number;
    overallComplianceRisk: number;
  };
  operationalRisk: {
    dataLossRisk: number;
    performanceRisk: number;
    availabilityRisk: number;
    securityRisk: number;
  };
  recommendations: string[];
  actionRequired: boolean;
}

export interface ValidationReport {
  id: string;
  timestamp: string;
  datasetId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationScore: number;
  qualityScore: number;
  riskScore: number;
  issues: QualityIssue[];
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    autoFixableIssues: number;
  };
  performance: {
    processingTime: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  trends: {
    qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    riskTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    volumeTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
}

/**
 * Quality Assurance Engine
 * Comprehensive data quality monitoring and validation
 */
export class QualityAssuranceEngine extends EventEmitter {
  private db?: Pool;
  private qualityRules: Map<string, QualityRule> = new Map();
  private qualityHistory: Map<string, QualityAssessment[]> = new Map();
  private riskThresholds: {
    quality: number;
    risk: number;
    compliance: number;
    reidentification: number;
  };
  
  constructor(dbPool?: Pool) {
    super();
    this.db = dbPool;
    this.riskThresholds = {
      quality: 85,      // Minimum quality score
      risk: 30,         // Maximum risk score
      compliance: 90,   // Minimum compliance score
      reidentification: 20 // Maximum re-identification risk
    };
    this.initializeQualityRules();
  }
  
  /**
   * Initialize comprehensive quality rules
   */
  private initializeQualityRules(): void {
    // Completeness rules
    this.addQualityRule({
      id: 'COMPLETENESS_REQUIRED_FIELDS',
      name: 'Required Fields Completeness',
      category: 'completeness',
      description: 'Validates that required fields are not null or empty',
      severity: 'HIGH',
      enabled: true,
      weight: 0.2,
      validator: (data: any, context: QualityContext) => {
        const requiredFields = this.getRequiredFields(context.dataType);
        const issues: QualityIssue[] = [];
        let score = 100;
        
        for (const field of requiredFields) {
          if (!data[field] || data[field] === null || data[field] === '') {
            score -= (100 / requiredFields.length);
            issues.push({
              type: 'MISSING_DATA',
              severity: 'HIGH',
              field,
              description: `Required field ${field} is missing or empty`,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: `Ensure ${field} is populated with valid data`,
              autoFixable: false
            });
          }
        }
        
        return {
          passed: issues.length === 0,
          score: Math.max(0, score),
          issues
        };
      }
    });
    
    // Accuracy rules
    this.addQualityRule({
      id: 'ACCURACY_DATA_FORMATS',
      name: 'Data Format Accuracy',
      category: 'accuracy',
      description: 'Validates that data conforms to expected formats',
      severity: 'HIGH',
      enabled: true,
      weight: 0.15,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        let totalFields = 0;
        let invalidFields = 0;
        
        for (const [field, value] of Object.entries(data)) {
          if (value === null || value === undefined) continue;
          
          totalFields++;
          const expectedFormat = this.getExpectedFormat(field, context.dataType);
          
          if (expectedFormat && !this.validateFormat(value, expectedFormat)) {
            invalidFields++;
            issues.push({
              type: 'INVALID_FORMAT',
              severity: 'MEDIUM',
              field,
              description: `Field ${field} has invalid format`,
              expectedValue: expectedFormat,
              actualValue: value,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: `Format ${field} according to: ${expectedFormat}`,
              autoFixable: true
            });
          }
        }
        
        if (totalFields > 0) {
          score = ((totalFields - invalidFields) / totalFields) * 100;
        }
        
        return {
          passed: invalidFields === 0,
          score,
          issues
        };
      }
    });
    
    // Consistency rules
    this.addQualityRule({
      id: 'CONSISTENCY_CROSS_FIELD',
      name: 'Cross-field Consistency',
      category: 'consistency',
      description: 'Validates consistency between related fields',
      severity: 'MEDIUM',
      enabled: true,
      weight: 0.1,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        // Check date consistency
        if (data.created_at && data.updated_at) {
          const created = new Date(data.created_at);
          const updated = new Date(data.updated_at);
          
          if (updated < created) {
            score -= 20;
            issues.push({
              type: 'INCONSISTENT_VALUE',
              severity: 'MEDIUM',
              field: 'updated_at',
              description: 'Updated date is before created date',
              expectedValue: `>= ${data.created_at}`,
              actualValue: data.updated_at,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Ensure updated_at is not before created_at',
              autoFixable: true
            });
          }
        }
        
        // Check score consistency
        if (data.score !== undefined && data.percentile !== undefined) {
          const scoreRange = this.getScoreRange(data.score);
          const percentileRange = this.getPercentileRange(data.percentile);
          
          if (!this.areRangesConsistent(scoreRange, percentileRange)) {
            score -= 15;
            issues.push({
              type: 'INCONSISTENT_VALUE',
              severity: 'MEDIUM',
              field: 'percentile',
              description: 'Score and percentile are inconsistent',
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Recalculate percentile based on score',
              autoFixable: true
            });
          }
        }
        
        return {
          passed: issues.length === 0,
          score,
          issues
        };
      }
    });
    
    // Validity rules
    this.addQualityRule({
      id: 'VALIDITY_BUSINESS_RULES',
      name: 'Business Rules Validity',
      category: 'validity',
      description: 'Validates data against business logic rules',
      severity: 'HIGH',
      enabled: true,
      weight: 0.15,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        // Validate score ranges
        if (data.score !== undefined) {
          if (data.score < 0 || data.score > 100) {
            score -= 25;
            issues.push({
              type: 'RANGE_VIOLATION',
              severity: 'HIGH',
              field: 'score',
              description: 'Score is outside valid range (0-100)',
              expectedValue: '0-100',
              actualValue: data.score,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Ensure score is between 0 and 100',
              autoFixable: true
            });
          }
        }
        
        // Validate completion percentage
        if (data.completion_percentage !== undefined) {
          if (data.completion_percentage < 0 || data.completion_percentage > 100) {
            score -= 20;
            issues.push({
              type: 'RANGE_VIOLATION',
              severity: 'MEDIUM',
              field: 'completion_percentage',
              description: 'Completion percentage is outside valid range (0-100)',
              expectedValue: '0-100',
              actualValue: data.completion_percentage,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Ensure completion percentage is between 0 and 100',
              autoFixable: true
            });
          }
        }
        
        // Validate time spent
        if (data.time_spent_seconds !== undefined) {
          if (data.time_spent_seconds < 0 || data.time_spent_seconds > 86400) { // 24 hours max
            score -= 15;
            issues.push({
              type: 'RANGE_VIOLATION',
              severity: 'MEDIUM',
              field: 'time_spent_seconds',
              description: 'Time spent is outside reasonable range',
              expectedValue: '0-86400',
              actualValue: data.time_spent_seconds,
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Verify time measurement accuracy',
              autoFixable: false
            });
          }
        }
        
        return {
          passed: issues.length === 0,
          score,
          issues
        };
      }
    });
    
    // Anonymization quality rules
    this.addQualityRule({
      id: 'ANONYMIZATION_QUALITY',
      name: 'Anonymization Quality Assessment',
      category: 'anonymization',
      description: 'Validates quality of anonymization process',
      severity: 'CRITICAL',
      enabled: true,
      weight: 0.25,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        // Check for remaining PII
        const piiFields = this.detectPII(data);
        if (piiFields.length > 0) {
          score -= 50;
          issues.push({
            type: 'ANONYMIZATION_FAILURE',
            severity: 'CRITICAL',
            field: piiFields.join(', '),
            description: `Potential PII detected in fields: ${piiFields.join(', ')}`,
            count: piiFields.length,
            affectedRecords: [data.id || 'unknown'],
            suggestedFix: 'Re-run anonymization process',
            autoFixable: false
          });
        }
        
        // Check hash consistency
        const hashFields = Object.keys(data).filter(key => key.includes('_hash'));
        for (const field of hashFields) {
          if (!this.isValidHash(data[field])) {
            score -= 20;
            issues.push({
              type: 'ANONYMIZATION_FAILURE',
              severity: 'HIGH',
              field,
              description: `Invalid hash format in field ${field}`,
              actualValue: data[field],
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Regenerate hash using proper algorithm',
              autoFixable: true
            });
          }
        }
        
        // Check anonymization metadata
        if (!data.metadata || !data.metadata.anonymizedAt) {
          score -= 15;
          issues.push({
            type: 'ANONYMIZATION_FAILURE',
            severity: 'MEDIUM',
            field: 'metadata',
            description: 'Missing anonymization metadata',
            count: 1,
            affectedRecords: [data.id || 'unknown'],
            suggestedFix: 'Add anonymization metadata during processing',
            autoFixable: false
          });
        }
        
        return {
          passed: piiFields.length === 0,
          score,
          issues
        };
      }
    });
    
    // Uniqueness rules
    this.addQualityRule({
      id: 'UNIQUENESS_IDENTIFIERS',
      name: 'Identifier Uniqueness',
      category: 'uniqueness',
      description: 'Validates that identifiers are appropriately unique',
      severity: 'HIGH',
      enabled: true,
      weight: 0.1,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        // Check for duplicate hash values (should be very rare)
        const hashFields = Object.keys(data).filter(key => key.includes('_hash'));
        for (const field of hashFields) {
          if (data[field] && this.isDuplicateHash(data[field], context)) {
            score -= 30;
            issues.push({
              type: 'DUPLICATE_VALUE',
              severity: 'HIGH',
              field,
              description: `Potentially duplicate hash in field ${field}`,
              actualValue: data[field],
              count: 1,
              affectedRecords: [data.id || 'unknown'],
              suggestedFix: 'Investigate hash collision or data duplication',
              autoFixable: false
            });
          }
        }
        
        return {
          passed: issues.length === 0,
          score,
          issues
        };
      }
    });
    
    // Integrity rules
    this.addQualityRule({
      id: 'INTEGRITY_REFERENCES',
      name: 'Referential Integrity',
      category: 'integrity',
      description: 'Validates referential integrity between related data',
      severity: 'MEDIUM',
      enabled: true,
      weight: 0.05,
      validator: (data: any, context: QualityContext) => {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        // Check foreign key relationships
        if (data.assessment_hash && !this.validateReference('assessment', data.assessment_hash)) {
          score -= 40;
          issues.push({
            type: 'REFERENTIAL_INTEGRITY',
            severity: 'HIGH',
            field: 'assessment_hash',
            description: 'Referenced assessment not found',
            actualValue: data.assessment_hash,
            count: 1,
            affectedRecords: [data.id || 'unknown'],
            suggestedFix: 'Verify assessment exists or update reference',
            autoFixable: false
          });
        }
        
        if (data.org_hash && !this.validateReference('organization', data.org_hash)) {
          score -= 30;
          issues.push({
            type: 'REFERENTIAL_INTEGRITY',
            severity: 'MEDIUM',
            field: 'org_hash',
            description: 'Referenced organization not found',
            actualValue: data.org_hash,
            count: 1,
            affectedRecords: [data.id || 'unknown'],
            suggestedFix: 'Verify organization exists or update reference',
            autoFixable: false
          });
        }
        
        return {
          passed: issues.length === 0,
          score,
          issues
        };
      }
    });
  }
  
  /**
   * Add quality rule to the engine
   */
  private addQualityRule(rule: QualityRule): void {
    this.qualityRules.set(rule.id, rule);
  }
  
  /**
   * Assess data quality
   */
  public async assessQuality(
    data: AnonymizedData,
    context: QualityContext
  ): Promise<QualityAssessment> {
    const startTime = Date.now();
    const assessmentId = createHash('sha256')
      .update(`${data.id}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
    
    const metrics: QualityMetrics = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      validity: 0,
      uniqueness: 0,
      integrity: 0,
      timeliness: 0,
      anonymization: 0
    };
    
    const allIssues: QualityIssue[] = [];
    const categoryScores: Record<string, number[]> = {
      completeness: [],
      accuracy: [],
      consistency: [],
      validity: [],
      uniqueness: [],
      integrity: [],
      timeliness: [],
      anonymization: []
    };
    
    // Execute quality rules
    for (const rule of this.qualityRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        const result = rule.validator(data.anonymizedData, context);
        categoryScores[rule.category].push(result.score);
        allIssues.push(...result.issues);
        
      } catch (error) {
        allIssues.push({
          type: 'MISSING_DATA',
          severity: 'MEDIUM',
          field: 'validation',
          description: `Quality rule ${rule.id} failed to execute`,
          count: 1,
          affectedRecords: [data.id],
          suggestedFix: 'Fix quality rule implementation',
          autoFixable: false
        });
      }
    }
    
    // Calculate category metrics
    for (const [category, scores] of Object.entries(categoryScores)) {
      if (scores.length > 0) {
        metrics[category as keyof QualityMetrics] = 
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }
    }
    
    // Calculate overall score
    const overallScore = Object.values(metrics).reduce((sum, score) => sum + score, 0) / 
      Object.keys(metrics).length;
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore, allIssues);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(allIssues, metrics);
    
    const assessment: QualityAssessment = {
      id: assessmentId,
      dataId: data.id,
      timestamp: new Date().toISOString(),
      overallScore,
      metrics,
      issues: allIssues,
      recommendations,
      passedValidation: riskLevel !== 'CRITICAL' && overallScore >= this.riskThresholds.quality,
      riskLevel,
      metadata: {
        sampleSize: 1,
        processingTime: Date.now() - startTime,
        validationMethod: 'comprehensive_quality_assessment_v1',
        dataVersion: data.metadata?.version || '1.0.0'
      }
    };
    
    // Store assessment
    if (this.db) {
      await this.storeQualityAssessment(assessment);
    }
    
    // Update quality history
    if (!this.qualityHistory.has(data.id)) {
      this.qualityHistory.set(data.id, []);
    }
    this.qualityHistory.get(data.id)!.push(assessment);
    
    // Emit events for monitoring
    this.emit('quality_assessed', assessment);
    
    if (riskLevel === 'CRITICAL') {
      this.emit('quality_alert', {
        type: 'critical_quality_issue',
        assessment,
        timestamp: new Date().toISOString()
      });
    }
    
    return assessment;
  }
  
  /**
   * Assess re-identification risk
   */
  public async assessReidentificationRisk(
    data: AnonymizedData,
    historicalData?: any[]
  ): Promise<RiskAssessment> {
    const riskId = createHash('sha256')
      .update(`${data.id}_risk_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
    
    const anonymizedData = data.anonymizedData;
    
    // Identify quasi-identifiers and sensitive attributes
    const quasiIdentifiers = this.identifyQuasiIdentifiers(anonymizedData);
    const sensitiveAttributes = this.identifySensitiveAttributes(anonymizedData);
    
    // Calculate k-anonymity, l-diversity, t-closeness
    const kAnonymity = await this.calculateKAnonymity(anonymizedData, quasiIdentifiers, historicalData);
    const lDiversity = await this.calculateLDiversity(anonymizedData, sensitiveAttributes, historicalData);
    const tCloseness = await this.calculateTCloseness(anonymizedData, sensitiveAttributes, historicalData);
    
    // Calculate re-identification risk
    const estimatedRisk = this.calculateReidentificationRisk(kAnonymity, lDiversity, tCloseness);
    
    // Assess various risk factors
    const riskFactors = [
      {
        factor: 'Low k-anonymity',
        impact: kAnonymity < 5 ? 80 : (kAnonymity < 10 ? 40 : 10),
        likelihood: kAnonymity < 5 ? 90 : (kAnonymity < 10 ? 60 : 20),
        riskScore: 0,
        mitigation: 'Increase generalization or suppression of quasi-identifiers'
      },
      {
        factor: 'High number of quasi-identifiers',
        impact: quasiIdentifiers.length > 3 ? 60 : (quasiIdentifiers.length > 1 ? 30 : 10),
        likelihood: quasiIdentifiers.length > 3 ? 80 : (quasiIdentifiers.length > 1 ? 50 : 20),
        riskScore: 0,
        mitigation: 'Reduce or generalize quasi-identifiers'
      },
      {
        factor: 'Sensitive attributes present',
        impact: sensitiveAttributes.length > 0 ? 50 : 0,
        likelihood: sensitiveAttributes.length > 0 ? 70 : 0,
        riskScore: 0,
        mitigation: 'Apply l-diversity or t-closeness techniques'
      },
      {
        factor: 'Rare attribute combinations',
        impact: this.hasRareAttributeCombinations(anonymizedData) ? 70 : 20,
        likelihood: this.hasRareAttributeCombinations(anonymizedData) ? 60 : 30,
        riskScore: 0,
        mitigation: 'Further generalize rare attribute combinations'
      }
    ];
    
    // Calculate risk scores for each factor
    riskFactors.forEach(factor => {
      factor.riskScore = (factor.impact * factor.likelihood) / 100;
    });
    
    // Calculate overall risk
    const overallRisk = Math.min(100, 
      riskFactors.reduce((sum, factor) => sum + factor.riskScore, 0) / riskFactors.length
    );
    
    // Assess compliance risks
    const complianceRisk = {
      gdprRisk: this.assessGDPRRisk(anonymizedData),
      hipaaRisk: this.assessHIPAARisk(anonymizedData),
      ccpaRisk: this.assessCCPARisk(anonymizedData),
      overallComplianceRisk: 0
    };
    complianceRisk.overallComplianceRisk = 
      (complianceRisk.gdprRisk + complianceRisk.hipaaRisk + complianceRisk.ccpaRisk) / 3;
    
    // Assess operational risks
    const operationalRisk = {
      dataLossRisk: this.assessDataLossRisk(data),
      performanceRisk: this.assessPerformanceRisk(data),
      availabilityRisk: this.assessAvailabilityRisk(data),
      securityRisk: this.assessSecurityRisk(data)
    };
    
    // Determine risk level
    const riskLevel = this.determineOverallRiskLevel(overallRisk, complianceRisk, operationalRisk);
    
    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(
      riskFactors, 
      complianceRisk, 
      operationalRisk
    );
    
    const riskAssessment: RiskAssessment = {
      id: riskId,
      dataId: data.id,
      timestamp: new Date().toISOString(),
      overallRisk,
      riskLevel,
      riskFactors,
      reidentificationRisk: {
        kAnonymity,
        lDiversity,
        tCloseness,
        quasiIdentifiers,
        sensitiveAttributes,
        estimatedRisk
      },
      complianceRisk,
      operationalRisk,
      recommendations,
      actionRequired: riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
    };
    
    // Store assessment
    if (this.db) {
      await this.storeRiskAssessment(riskAssessment);
    }
    
    // Emit events
    this.emit('risk_assessed', riskAssessment);
    
    if (riskLevel === 'CRITICAL') {
      this.emit('risk_alert', {
        type: 'critical_risk_detected',
        assessment: riskAssessment,
        timestamp: new Date().toISOString()
      });
    }
    
    return riskAssessment;
  }
  
  /**
   * Validate anonymized data batch
   */
  public async validateBatch(
    dataItems: AnonymizedData[],
    context: QualityContext
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const reportId = createHash('sha256')
      .update(`batch_${Date.now()}_${dataItems.length}`)
      .digest('hex')
      .substring(0, 16);
    
    let validRecords = 0;
    let invalidRecords = 0;
    let totalQualityScore = 0;
    let totalRiskScore = 0;
    const allIssues: QualityIssue[] = [];
    
    // Process each data item
    for (const dataItem of dataItems) {
      const qualityAssessment = await this.assessQuality(dataItem, context);
      const riskAssessment = await this.assessReidentificationRisk(dataItem);
      
      if (qualityAssessment.passedValidation && riskAssessment.riskLevel !== 'CRITICAL') {
        validRecords++;
      } else {
        invalidRecords++;
      }
      
      totalQualityScore += qualityAssessment.overallScore;
      totalRiskScore += riskAssessment.overallRisk;
      allIssues.push(...qualityAssessment.issues);
    }
    
    const avgQualityScore = dataItems.length > 0 ? totalQualityScore / dataItems.length : 0;
    const avgRiskScore = dataItems.length > 0 ? totalRiskScore / dataItems.length : 0;
    const validationScore = dataItems.length > 0 ? (validRecords / dataItems.length) * 100 : 0;
    
    // Categorize issues
    const criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = allIssues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = allIssues.filter(i => i.severity === 'LOW').length;
    const autoFixableIssues = allIssues.filter(i => i.autoFixable).length;
    
    // Calculate performance metrics
    const processingTime = Date.now() - startTime;
    const throughput = dataItems.length / (processingTime / 1000);
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    // Analyze trends (simplified - would use historical data)
    const qualityTrend = this.analyzeTrend('quality', avgQualityScore);
    const riskTrend = this.analyzeTrend('risk', avgRiskScore);
    const volumeTrend = this.analyzeTrend('volume', dataItems.length);
    
    const report: ValidationReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      datasetId: context.dataType,
      totalRecords: dataItems.length,
      validRecords,
      invalidRecords,
      validationScore,
      qualityScore: avgQualityScore,
      riskScore: avgRiskScore,
      issues: allIssues,
      summary: {
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        autoFixableIssues
      },
      performance: {
        processingTime,
        throughput,
        memoryUsage,
        cpuUsage: 0 // Would be calculated from system metrics
      },
      trends: {
        qualityTrend,
        riskTrend,
        volumeTrend
      }
    };
    
    // Store report
    if (this.db) {
      await this.storeValidationReport(report);
    }
    
    // Emit events
    this.emit('batch_validated', report);
    
    return report;
  }
  
  /**
   * Auto-fix quality issues where possible
   */
  public async autoFixIssues(
    data: AnonymizedData,
    issues: QualityIssue[]
  ): Promise<{ fixed: number; data: AnonymizedData }> {
    let fixedCount = 0;
    let fixedData = { ...data };
    
    for (const issue of issues) {
      if (!issue.autoFixable) continue;
      
      const rule = this.qualityRules.get(issue.type);
      if (rule && rule.autoFix) {
        try {
          fixedData = rule.autoFix(fixedData, issue);
          fixedCount++;
          
          this.emit('issue_auto_fixed', {
            dataId: data.id,
            issue,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          this.emit('auto_fix_failed', {
            dataId: data.id,
            issue,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return { fixed: fixedCount, data: fixedData };
  }
  
  /**
   * Helper methods
   */
  
  private getRequiredFields(dataType: string): string[] {
    const requirements: Record<string, string[]> = {
      'user': ['user_hash', 'created_at'],
      'organization': ['org_hash', 'created_at'],
      'assessment': ['assessment_hash', 'type', 'status'],
      'assessment_response': ['response_hash', 'assessment_hash', 'respondent_hash'],
      'analytics_event': ['event_hash', 'event_type']
    };
    
    return requirements[dataType] || [];
  }
  
  private getExpectedFormat(field: string, dataType: string): string | null {
    const formats: Record<string, string> = {
      '_hash': '^[a-f0-9]{16,64}$',
      'created_at': '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}',
      'email': '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$',
      'score': '^\\d+(\\.\\d+)?$',
      'percentage': '^\\d{1,3}$'
    };
    
    for (const [pattern, format] of Object.entries(formats)) {
      if (field.includes(pattern)) {
        return format;
      }
    }
    
    return null;
  }
  
  private validateFormat(value: any, format: string): boolean {
    if (typeof value !== 'string') return false;
    return new RegExp(format).test(value);
  }
  
  private getScoreRange(score: number): string {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MEDIUM_LOW';
    if (score < 75) return 'MEDIUM_HIGH';
    return 'HIGH';
  }
  
  private getPercentileRange(percentile: number): string {
    if (percentile < 25) return 'LOW';
    if (percentile < 50) return 'MEDIUM_LOW';
    if (percentile < 75) return 'MEDIUM_HIGH';
    return 'HIGH';
  }
  
  private areRangesConsistent(scoreRange: string, percentileRange: string): boolean {
    return scoreRange === percentileRange;
  }
  
  private detectPII(data: any): string[] {
    const piiPatterns = [
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, field: 'email' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, field: 'ssn' },
      { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/, field: 'credit_card' },
      { pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/, field: 'ip_address' }
    ];
    
    const foundPII: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        for (const piiPattern of piiPatterns) {
          if (piiPattern.pattern.test(value)) {
            foundPII.push(`${key} (${piiPattern.field})`);
          }
        }
      }
    }
    
    return foundPII;
  }
  
  private isValidHash(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^[a-f0-9]{16,64}$/.test(value);
  }
  
  private isDuplicateHash(hash: string, context: QualityContext): boolean {
    // In a real implementation, this would check against a database or cache
    // For now, return false (no duplicates detected)
    return false;
  }
  
  private validateReference(type: string, id: string): boolean {
    // In a real implementation, this would validate foreign key relationships
    // For now, return true (assume valid)
    return true;
  }
  
  private determineRiskLevel(
    overallScore: number, 
    issues: QualityIssue[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    
    if (criticalIssues > 0 || overallScore < 50) return 'CRITICAL';
    if (highIssues > 2 || overallScore < 70) return 'HIGH';
    if (highIssues > 0 || overallScore < 85) return 'MEDIUM';
    return 'LOW';
  }
  
  private generateRecommendations(
    issues: QualityIssue[], 
    metrics: QualityMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.completeness < 90) {
      recommendations.push('Improve data collection processes to reduce missing values');
    }
    
    if (metrics.accuracy < 85) {
      recommendations.push('Implement data validation at the point of entry');
    }
    
    if (metrics.anonymization < 95) {
      recommendations.push('Review and strengthen anonymization processes');
    }
    
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical data quality issues immediately');
    }
    
    const autoFixableIssues = issues.filter(i => i.autoFixable);
    if (autoFixableIssues.length > 0) {
      recommendations.push(`${autoFixableIssues.length} issues can be automatically fixed`);
    }
    
    return recommendations;
  }
  
  // Risk assessment helper methods
  
  private identifyQuasiIdentifiers(data: any): string[] {
    const quasiFields = ['age', 'gender', 'job', 'education', 'region', 'industry', 'salary'];
    return Object.keys(data).filter(key => 
      quasiFields.some(quasi => key.toLowerCase().includes(quasi))
    );
  }
  
  private identifySensitiveAttributes(data: any): string[] {
    const sensitiveFields = ['health', 'medical', 'financial', 'political', 'religious', 'score'];
    return Object.keys(data).filter(key => 
      sensitiveFields.some(sensitive => key.toLowerCase().includes(sensitive))
    );
  }
  
  private async calculateKAnonymity(
    data: any, 
    quasiIdentifiers: string[], 
    historicalData?: any[]
  ): Promise<number> {
    // Simplified k-anonymity calculation
    // In practice, this would require access to the full dataset
    if (quasiIdentifiers.length === 0) return 100;
    if (quasiIdentifiers.length <= 2) return 10;
    if (quasiIdentifiers.length <= 4) return 5;
    return 2;
  }
  
  private async calculateLDiversity(
    data: any, 
    sensitiveAttributes: string[], 
    historicalData?: any[]
  ): Promise<number> {
    // Simplified l-diversity calculation
    if (sensitiveAttributes.length === 0) return 10;
    return Math.max(2, 10 - sensitiveAttributes.length);
  }
  
  private async calculateTCloseness(
    data: any, 
    sensitiveAttributes: string[], 
    historicalData?: any[]
  ): Promise<number> {
    // Simplified t-closeness calculation
    return sensitiveAttributes.length > 0 ? 0.2 : 0.1;
  }
  
  private calculateReidentificationRisk(
    kAnonymity: number, 
    lDiversity: number, 
    tCloseness: number
  ): number {
    // Risk increases as privacy measures decrease
    const kRisk = Math.max(0, 100 - (kAnonymity * 10));
    const lRisk = Math.max(0, 100 - (lDiversity * 20));
    const tRisk = tCloseness > 0.3 ? 50 : 20;
    
    return Math.min(100, (kRisk + lRisk + tRisk) / 3);
  }
  
  private hasRareAttributeCombinations(data: any): boolean {
    // Simplified check for rare combinations
    const categories = Object.values(data).filter(v => 
      typeof v === 'string' && (v.includes('_CATEGORY') || v.includes('_REGION'))
    );
    
    return categories.length > 3; // Assume rare if many categories
  }
  
  private assessGDPRRisk(data: any): number {
    // Simplified GDPR risk assessment
    const piiFields = this.detectPII(data);
    return piiFields.length * 20; // Higher risk with more PII
  }
  
  private assessHIPAARisk(data: any): number {
    // Simplified HIPAA risk assessment
    const healthFields = Object.keys(data).filter(key => 
      key.toLowerCase().includes('health') || key.toLowerCase().includes('medical')
    );
    return healthFields.length * 25;
  }
  
  private assessCCPARisk(data: any): number {
    // Simplified CCPA risk assessment
    const personalFields = Object.keys(data).filter(key => 
      ['personal', 'contact', 'location', 'behavior'].some(term => 
        key.toLowerCase().includes(term)
      )
    );
    return personalFields.length * 15;
  }
  
  private assessDataLossRisk(data: AnonymizedData): number {
    // Risk based on data criticality and backup status
    return 20; // Default low risk
  }
  
  private assessPerformanceRisk(data: AnonymizedData): number {
    // Risk based on processing complexity
    const dataSize = JSON.stringify(data).length;
    return dataSize > 100000 ? 40 : 20;
  }
  
  private assessAvailabilityRisk(data: AnonymizedData): number {
    // Risk based on system dependencies
    return 15; // Default low risk
  }
  
  private assessSecurityRisk(data: AnonymizedData): number {
    // Risk based on security measures
    const hasEncryption = data.metadata?.method?.includes('encryption');
    return hasEncryption ? 10 : 30;
  }
  
  private determineOverallRiskLevel(
    overallRisk: number,
    complianceRisk: any,
    operationalRisk: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const maxRisk = Math.max(
      overallRisk,
      complianceRisk.overallComplianceRisk,
      Math.max(...Object.values(operationalRisk) as number[])
    );
    
    if (maxRisk > 80) return 'CRITICAL';
    if (maxRisk > 60) return 'HIGH';
    if (maxRisk > 40) return 'MEDIUM';
    return 'LOW';
  }
  
  private generateRiskRecommendations(
    riskFactors: any[],
    complianceRisk: any,
    operationalRisk: any
  ): string[] {
    const recommendations: string[] = [];
    
    const highRiskFactors = riskFactors.filter(f => f.riskScore > 50);
    highRiskFactors.forEach(factor => {
      recommendations.push(factor.mitigation);
    });
    
    if (complianceRisk.overallComplianceRisk > 60) {
      recommendations.push('Review compliance processes and enhance privacy protections');
    }
    
    if (operationalRisk.securityRisk > 40) {
      recommendations.push('Strengthen security measures and access controls');
    }
    
    return recommendations;
  }
  
  private analyzeTrend(
    type: string, 
    currentValue: number
  ): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    // Simplified trend analysis - would use historical data in practice
    return 'STABLE';
  }
  
  /**
   * Database storage methods
   */
  
  private async storeQualityAssessment(assessment: QualityAssessment): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO quality_assessments (
          id, data_id, timestamp, overall_score, metrics, issues,
          recommendations, passed_validation, risk_level, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        assessment.id,
        assessment.dataId,
        assessment.timestamp,
        assessment.overallScore,
        JSON.stringify(assessment.metrics),
        JSON.stringify(assessment.issues),
        JSON.stringify(assessment.recommendations),
        assessment.passedValidation,
        assessment.riskLevel,
        JSON.stringify(assessment.metadata)
      ]);
    } finally {
      client.release();
    }
  }
  
  private async storeRiskAssessment(assessment: RiskAssessment): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO risk_assessments (
          id, data_id, timestamp, overall_risk, risk_level, risk_factors,
          reidentification_risk, compliance_risk, operational_risk,
          recommendations, action_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        assessment.id,
        assessment.dataId,
        assessment.timestamp,
        assessment.overallRisk,
        assessment.riskLevel,
        JSON.stringify(assessment.riskFactors),
        JSON.stringify(assessment.reidentificationRisk),
        JSON.stringify(assessment.complianceRisk),
        JSON.stringify(assessment.operationalRisk),
        JSON.stringify(assessment.recommendations),
        assessment.actionRequired
      ]);
    } finally {
      client.release();
    }
  }
  
  private async storeValidationReport(report: ValidationReport): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO validation_reports (
          id, timestamp, dataset_id, total_records, valid_records,
          invalid_records, validation_score, quality_score, risk_score,
          issues, summary, performance, trends
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        report.id,
        report.timestamp,
        report.datasetId,
        report.totalRecords,
        report.validRecords,
        report.invalidRecords,
        report.validationScore,
        report.qualityScore,
        report.riskScore,
        JSON.stringify(report.issues),
        JSON.stringify(report.summary),
        JSON.stringify(report.performance),
        JSON.stringify(report.trends)
      ]);
    } finally {
      client.release();
    }
  }
}

/**
 * Create quality assurance engine with default configuration
 */
export function createQualityAssuranceEngine(dbPool?: Pool): QualityAssuranceEngine {
  return new QualityAssuranceEngine(dbPool);
}