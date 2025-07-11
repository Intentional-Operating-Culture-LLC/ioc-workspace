// GDPR/HIPAA Compliance Validator
// Comprehensive compliance framework with automated validation and reporting

import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import { AnonymizedData } from './anonymization-engine';

export interface ComplianceRule {
  id: string;
  name: string;
  regulation: 'GDPR' | 'HIPAA' | 'CCPA' | 'PIPEDA' | 'LGPD';
  category: 'DATA_MINIMIZATION' | 'PURPOSE_LIMITATION' | 'CONSENT' | 'SECURITY' | 'ANONYMIZATION';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validator: (data: any, context: ValidationContext) => ComplianceResult;
  remediationSteps: string[];
  documentationRequired: boolean;
}

export interface ValidationContext {
  dataType: string;
  processingPurpose: string;
  legalBasis: string;
  dataSubjectConsent: boolean;
  retentionPeriod: number;
  geographicScope: string[];
  processingDate: string;
  dataController: string;
  dataProcessor: string;
}

export interface ComplianceResult {
  ruleId: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING' | 'UNKNOWN';
  score: number; // 0-100
  details: string;
  evidence: any[];
  violations: ComplianceViolation[];
  recommendations: string[];
  requiresReview: boolean;
  automaticRemediation?: string[];
}

export interface ComplianceViolation {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  fieldName?: string;
  expectedValue?: any;
  actualValue?: any;
  legalReference: string;
  remediationRequired: boolean;
  potentialFine?: number;
}

export interface ComplianceReport {
  id: string;
  timestamp: string;
  regulationScope: string[];
  overallScore: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
  summary: {
    totalRules: number;
    compliantRules: number;
    nonCompliantRules: number;
    warningRules: number;
    criticalViolations: number;
    highRiskViolations: number;
  };
  ruleResults: ComplianceResult[];
  violations: ComplianceViolation[];
  recommendations: string[];
  actionItems: Array<{
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    dueDate: string;
    responsible: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  auditTrail: Array<{
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }>;
}

export interface DPIAAssessment {
  id: string;
  dataProcessingActivity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  transfersToThirdCountries: boolean;
  retentionPeriod: string;
  securityMeasures: string[];
  privacyRisks: Array<{
    risk: string;
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationMeasures: string[];
  }>;
  necessityAssessment: string;
  proportionalityAssessment: string;
  complianceStatus: 'COMPLIANT' | 'REQUIRES_IMPROVEMENT' | 'HIGH_RISK';
  reviewDate: string;
  approvedBy: string;
}

/**
 * Comprehensive Compliance Validator
 * Validates data processing against GDPR, HIPAA, and other privacy regulations
 */
export class ComplianceValidator {
  private rules: Map<string, ComplianceRule> = new Map();
  private db?: Pool;
  
  constructor(dbPool?: Pool) {
    this.db = dbPool;
    this.initializeComplianceRules();
  }
  
  /**
   * Initialize comprehensive compliance rules
   */
  private initializeComplianceRules(): void {
    // GDPR Article 4(1) - Anonymous Data
    this.addRule({
      id: 'GDPR_4_1_ANONYMOUS_DATA',
      name: 'Anonymous Data Validation',
      regulation: 'GDPR',
      category: 'ANONYMIZATION',
      description: 'Data must be truly anonymous and not allow re-identification',
      severity: 'CRITICAL',
      documentationRequired: true,
      remediationSteps: [
        'Remove all direct identifiers',
        'Generalize quasi-identifiers',
        'Ensure k-anonymity >= 5',
        'Validate l-diversity',
        'Document anonymization process'
      ],
      validator: (data: any, context: ValidationContext) => {
        const violations: ComplianceViolation[] = [];
        const evidence: any[] = [];
        let score = 100;
        
        // Check for direct identifiers
        const directIdentifiers = this.findDirectIdentifiers(data);
        if (directIdentifiers.length > 0) {
          score -= 40;
          violations.push({
            type: 'DIRECT_IDENTIFIER_PRESENT',
            severity: 'CRITICAL',
            description: `Direct identifiers found: ${directIdentifiers.join(', ')}`,
            legalReference: 'GDPR Article 4(1)',
            remediationRequired: true,
            potentialFine: 20000000 // €20M maximum fine
          });
        }
        
        // Check for quasi-identifiers
        const quasiIdentifiers = this.findQuasiIdentifiers(data);
        if (quasiIdentifiers.length > 3) {
          score -= 20;
          violations.push({
            type: 'HIGH_QUASI_IDENTIFIER_COUNT',
            severity: 'HIGH',
            description: `High number of quasi-identifiers: ${quasiIdentifiers.length}`,
            legalReference: 'GDPR Article 4(1)',
            remediationRequired: true
          });
        }
        
        // Check k-anonymity
        const kAnonymity = this.estimateKAnonymity(data);
        if (kAnonymity < 5) {
          score -= 30;
          violations.push({
            type: 'INSUFFICIENT_K_ANONYMITY',
            severity: 'CRITICAL',
            description: `K-anonymity too low: ${kAnonymity} (minimum: 5)`,
            expectedValue: 5,
            actualValue: kAnonymity,
            legalReference: 'GDPR Article 4(1)',
            remediationRequired: true
          });
        }
        
        evidence.push({
          directIdentifiers,
          quasiIdentifiers,
          kAnonymity,
          anonymizationMethod: data.metadata?.method || 'unknown'
        });
        
        return {
          ruleId: 'GDPR_4_1_ANONYMOUS_DATA',
          status: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
          score: Math.max(0, score),
          details: `Anonymous data validation completed. Score: ${score}/100`,
          evidence,
          violations,
          recommendations: this.generateAnonymizationRecommendations(violations),
          requiresReview: violations.some(v => v.severity === 'CRITICAL')
        };
      }
    });
    
    // GDPR Article 5(1)(c) - Data Minimization
    this.addRule({
      id: 'GDPR_5_1_C_DATA_MINIMIZATION',
      name: 'Data Minimization',
      regulation: 'GDPR',
      category: 'DATA_MINIMIZATION',
      description: 'Personal data must be adequate, relevant and limited to what is necessary',
      severity: 'HIGH',
      documentationRequired: true,
      remediationSteps: [
        'Review data collection practices',
        'Remove unnecessary data fields',
        'Document necessity for each data element',
        'Implement purpose-based data collection'
      ],
      validator: (data: any, context: ValidationContext) => {
        const violations: ComplianceViolation[] = [];
        const evidence: any[] = [];
        let score = 100;
        
        // Check for unnecessary data collection
        const unnecessaryFields = this.identifyUnnecessaryFields(data, context.processingPurpose);
        if (unnecessaryFields.length > 0) {
          score -= unnecessaryFields.length * 10;
          violations.push({
            type: 'UNNECESSARY_DATA_COLLECTION',
            severity: 'MEDIUM',
            description: `Unnecessary fields for purpose "${context.processingPurpose}": ${unnecessaryFields.join(', ')}`,
            legalReference: 'GDPR Article 5(1)(c)',
            remediationRequired: true
          });
        }
        
        // Check data adequacy
        const missingEssentialFields = this.identifyMissingEssentialFields(data, context.processingPurpose);
        if (missingEssentialFields.length > 0) {
          score -= 15;
          violations.push({
            type: 'INADEQUATE_DATA_COLLECTION',
            severity: 'MEDIUM',
            description: `Missing essential fields: ${missingEssentialFields.join(', ')}`,
            legalReference: 'GDPR Article 5(1)(c)',
            remediationRequired: false
          });
        }
        
        evidence.push({
          processingPurpose: context.processingPurpose,
          unnecessaryFields,
          missingEssentialFields,
          totalFieldCount: Object.keys(data).length
        });
        
        return {
          ruleId: 'GDPR_5_1_C_DATA_MINIMIZATION',
          status: violations.length === 0 ? 'COMPLIANT' : (score > 70 ? 'WARNING' : 'NON_COMPLIANT'),
          score: Math.max(0, score),
          details: `Data minimization assessment completed. Score: ${score}/100`,
          evidence,
          violations,
          recommendations: this.generateDataMinimizationRecommendations(violations),
          requiresReview: score < 70
        };
      }
    });
    
    // GDPR Article 5(1)(e) - Storage Limitation
    this.addRule({
      id: 'GDPR_5_1_E_STORAGE_LIMITATION',
      name: 'Storage Limitation',
      regulation: 'GDPR',
      category: 'PURPOSE_LIMITATION',
      description: 'Personal data must not be kept longer than necessary',
      severity: 'HIGH',
      documentationRequired: true,
      remediationSteps: [
        'Define retention periods for each data category',
        'Implement automated data deletion',
        'Document legal basis for retention',
        'Regular review of stored data'
      ],
      validator: (data: any, context: ValidationContext) => {
        const violations: ComplianceViolation[] = [];
        const evidence: any[] = [];
        let score = 100;
        
        // Check retention period compliance
        if (context.retentionPeriod <= 0) {
          score -= 20;
          violations.push({
            type: 'UNDEFINED_RETENTION_PERIOD',
            severity: 'HIGH',
            description: 'No retention period defined for data processing',
            legalReference: 'GDPR Article 5(1)(e)',
            remediationRequired: true
          });
        }
        
        // Check if data age exceeds retention period
        const dataAge = this.calculateDataAge(data, context.processingDate);
        if (dataAge > context.retentionPeriod) {
          score -= 40;
          violations.push({
            type: 'RETENTION_PERIOD_EXCEEDED',
            severity: 'CRITICAL',
            description: `Data age (${dataAge} days) exceeds retention period (${context.retentionPeriod} days)`,
            expectedValue: context.retentionPeriod,
            actualValue: dataAge,
            legalReference: 'GDPR Article 5(1)(e)',
            remediationRequired: true,
            potentialFine: 4000000 // 4% of annual turnover or €20M
          });
        }
        
        evidence.push({
          retentionPeriod: context.retentionPeriod,
          dataAge,
          processingDate: context.processingDate,
          retentionCompliant: dataAge <= context.retentionPeriod
        });
        
        return {
          ruleId: 'GDPR_5_1_E_STORAGE_LIMITATION',
          status: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
          score: Math.max(0, score),
          details: `Storage limitation assessment completed. Score: ${score}/100`,
          evidence,
          violations,
          recommendations: this.generateRetentionRecommendations(violations),
          requiresReview: violations.some(v => v.severity === 'CRITICAL')
        };
      }
    });
    
    // HIPAA Safe Harbor Method
    this.addRule({
      id: 'HIPAA_SAFE_HARBOR',
      name: 'HIPAA Safe Harbor De-identification',
      regulation: 'HIPAA',
      category: 'ANONYMIZATION',
      description: 'Data must comply with HIPAA Safe Harbor de-identification requirements',
      severity: 'CRITICAL',
      documentationRequired: true,
      remediationSteps: [
        'Remove all 18 HIPAA identifiers',
        'Verify no remaining PHI',
        'Document de-identification process',
        'Implement appropriate safeguards'
      ],
      validator: (data: any, context: ValidationContext) => {
        const violations: ComplianceViolation[] = [];
        const evidence: any[] = [];
        let score = 100;
        
        // Check for HIPAA identifiers
        const hipaaIdentifiers = this.findHIPAAIdentifiers(data);
        if (hipaaIdentifiers.length > 0) {
          score -= hipaaIdentifiers.length * 10;
          violations.push({
            type: 'HIPAA_IDENTIFIER_PRESENT',
            severity: 'CRITICAL',
            description: `HIPAA identifiers found: ${hipaaIdentifiers.join(', ')}`,
            legalReference: 'HIPAA Privacy Rule §164.514(b)(2)',
            remediationRequired: true,
            potentialFine: 1500000 // Up to $1.5M per violation
          });
        }
        
        // Check for proper date handling
        const dateViolations = this.checkHIPAADateHandling(data);
        if (dateViolations.length > 0) {
          score -= 20;
          violations.push(...dateViolations);
        }
        
        // Check for geographic subdivisions
        const geoViolations = this.checkHIPAAGeographicLimitations(data);
        if (geoViolations.length > 0) {
          score -= 15;
          violations.push(...geoViolations);
        }
        
        evidence.push({
          hipaaIdentifiers,
          dateViolations: dateViolations.length,
          geoViolations: geoViolations.length,
          deidentificationMethod: data.metadata?.method || 'unknown'
        });
        
        return {
          ruleId: 'HIPAA_SAFE_HARBOR',
          status: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
          score: Math.max(0, score),
          details: `HIPAA Safe Harbor assessment completed. Score: ${score}/100`,
          evidence,
          violations,
          recommendations: this.generateHIPAARecommendations(violations),
          requiresReview: violations.some(v => v.severity === 'CRITICAL')
        };
      }
    });
    
    // Add more rules for other regulations and scenarios...
  }
  
  /**
   * Add compliance rule to validator
   */
  private addRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }
  
  /**
   * Validate data against all applicable compliance rules
   */
  public async validateCompliance(
    data: AnonymizedData,
    context: ValidationContext,
    regulations: string[] = ['GDPR']
  ): Promise<ComplianceReport> {
    const reportId = createHash('sha256')
      .update(`${Date.now()}_${JSON.stringify(context)}`)
      .digest('hex')
      .substring(0, 16);
    
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => regulations.includes(rule.regulation));
    
    const ruleResults: ComplianceResult[] = [];
    const allViolations: ComplianceViolation[] = [];
    const allRecommendations: string[] = [];
    
    // Execute validation rules
    for (const rule of applicableRules) {
      try {
        const result = rule.validator(data.anonymizedData, context);
        ruleResults.push(result);
        allViolations.push(...result.violations);
        allRecommendations.push(...result.recommendations);
        
      } catch (error) {
        ruleResults.push({
          ruleId: rule.id,
          status: 'UNKNOWN',
          score: 0,
          details: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          evidence: [],
          violations: [{
            type: 'VALIDATION_ERROR',
            severity: 'HIGH',
            description: `Failed to validate rule ${rule.id}`,
            legalReference: 'N/A',
            remediationRequired: true
          }],
          recommendations: ['Fix validation error before proceeding'],
          requiresReview: true
        });
      }
    }
    
    // Calculate overall score and status
    const overallScore = ruleResults.length > 0 ? 
      ruleResults.reduce((sum, result) => sum + result.score, 0) / ruleResults.length : 0;
    
    const criticalViolations = allViolations.filter(v => v.severity === 'CRITICAL').length;
    const highRiskViolations = allViolations.filter(v => v.severity === 'HIGH').length;
    const nonCompliantRules = ruleResults.filter(r => r.status === 'NON_COMPLIANT').length;
    
    let status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
    if (criticalViolations > 0 || nonCompliantRules > 0) {
      status = 'NON_COMPLIANT';
    } else if (highRiskViolations > 0 || overallScore < 90) {
      status = 'PARTIALLY_COMPLIANT';
    } else {
      status = 'COMPLIANT';
    }
    
    // Generate action items
    const actionItems = this.generateActionItems(allViolations);
    
    // Create audit trail entry
    const auditTrail = [{
      timestamp: new Date().toISOString(),
      action: 'COMPLIANCE_VALIDATION',
      user: 'SYSTEM',
      details: `Validated data ${data.id} against ${regulations.join(', ')} regulations`
    }];
    
    const report: ComplianceReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      regulationScope: regulations,
      overallScore,
      status,
      summary: {
        totalRules: applicableRules.length,
        compliantRules: ruleResults.filter(r => r.status === 'COMPLIANT').length,
        nonCompliantRules,
        warningRules: ruleResults.filter(r => r.status === 'WARNING').length,
        criticalViolations,
        highRiskViolations
      },
      ruleResults,
      violations: allViolations,
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      actionItems,
      auditTrail
    };
    
    // Store report in database if available
    if (this.db) {
      await this.storeComplianceReport(report);
    }
    
    return report;
  }
  
  /**
   * Generate Data Protection Impact Assessment
   */
  public async generateDPIA(
    processingActivity: string,
    dataCategories: string[],
    purpose: string,
    legalBasis: string
  ): Promise<DPIAAssessment> {
    const dpiaId = createHash('sha256')
      .update(`${processingActivity}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
    
    // Assess privacy risks
    const privacyRisks = this.assessPrivacyRisks(dataCategories, purpose);
    
    // Assess necessity and proportionality
    const necessityAssessment = this.assessNecessity(dataCategories, purpose);
    const proportionalityAssessment = this.assessProportionality(dataCategories, purpose);
    
    // Determine compliance status
    const highRisks = privacyRisks.filter(r => 
      (r.likelihood === 'HIGH' && r.impact === 'MEDIUM') ||
      (r.likelihood === 'MEDIUM' && r.impact === 'HIGH') ||
      (r.likelihood === 'HIGH' && r.impact === 'HIGH')
    );
    
    let complianceStatus: 'COMPLIANT' | 'REQUIRES_IMPROVEMENT' | 'HIGH_RISK';
    if (highRisks.length === 0) {
      complianceStatus = 'COMPLIANT';
    } else if (highRisks.length <= 2) {
      complianceStatus = 'REQUIRES_IMPROVEMENT';
    } else {
      complianceStatus = 'HIGH_RISK';
    }
    
    const dpia: DPIAAssessment = {
      id: dpiaId,
      dataProcessingActivity: processingActivity,
      purpose,
      legalBasis,
      dataCategories,
      dataSubjects: this.identifyDataSubjects(dataCategories),
      recipients: this.identifyRecipients(purpose),
      transfersToThirdCountries: this.hasThirdCountryTransfers(purpose),
      retentionPeriod: this.determineRetentionPeriod(dataCategories, purpose),
      securityMeasures: this.identifySecurityMeasures(dataCategories),
      privacyRisks,
      necessityAssessment,
      proportionalityAssessment,
      complianceStatus,
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      approvedBy: 'SYSTEM_GENERATED'
    };
    
    // Store DPIA in database if available
    if (this.db) {
      await this.storeDPIA(dpia);
    }
    
    return dpia;
  }
  
  /**
   * Helper methods for validation
   */
  
  private findDirectIdentifiers(data: any): string[] {
    const directIdentifiers = ['email', 'phone', 'ssn', 'name', 'id', 'address'];
    const found: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      if (directIdentifiers.some(id => keyLower.includes(id)) && value) {
        // Check if value looks like actual PII vs anonymized data
        if (typeof value === 'string' && !value.startsWith('[HASH:') && !value.includes('_hash')) {
          found.push(key);
        }
      }
    }
    
    return found;
  }
  
  private findQuasiIdentifiers(data: any): string[] {
    const quasiIdentifiers = ['age', 'zip', 'birth', 'gender', 'job', 'salary', 'education'];
    const found: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      if (quasiIdentifiers.some(id => keyLower.includes(id)) && value) {
        found.push(key);
      }
    }
    
    return found;
  }
  
  private estimateKAnonymity(data: any): number {
    // Simplified k-anonymity estimation
    // In practice, this would require access to the full dataset
    const quasiCount = this.findQuasiIdentifiers(data).length;
    
    // Rough estimation based on quasi-identifier count
    if (quasiCount === 0) return 100;
    if (quasiCount <= 2) return 10;
    if (quasiCount <= 4) return 5;
    return 2;
  }
  
  private findHIPAAIdentifiers(data: any): string[] {
    const hipaaIdentifiers = [
      'name', 'address', 'dates', 'phone', 'fax', 'email', 'ssn', 'mrn',
      'plan', 'account', 'certificate', 'license', 'vehicle', 'device',
      'url', 'ip', 'biometric', 'photo'
    ];
    
    const found: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      for (const identifier of hipaaIdentifiers) {
        if (keyLower.includes(identifier) && value && typeof value === 'string') {
          if (!value.startsWith('[HASH:') && !value.includes('_hash') && !value.includes('_category')) {
            found.push(`${identifier} (${key})`);
          }
        }
      }
    }
    
    return found;
  }
  
  private checkHIPAADateHandling(data: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && key.toLowerCase().includes('date')) {
        // Check if date is more specific than year
        const dateRegex = /\d{4}-\d{2}-\d{2}/;
        if (dateRegex.test(value)) {
          violations.push({
            type: 'HIPAA_DATE_TOO_SPECIFIC',
            severity: 'MEDIUM',
            description: `Date field ${key} contains specific date instead of year only`,
            fieldName: key,
            legalReference: 'HIPAA Privacy Rule §164.514(b)(2)(i)(C)',
            remediationRequired: true
          });
        }
      }
    }
    
    return violations;
  }
  
  private checkHIPAAGeographicLimitations(data: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && 
          (key.toLowerCase().includes('zip') || key.toLowerCase().includes('postal'))) {
        // Check if geographic unit is too small
        if (value.length > 3) {
          violations.push({
            type: 'HIPAA_GEOGRAPHIC_TOO_SPECIFIC',
            severity: 'MEDIUM',
            description: `Geographic field ${key} is too specific for HIPAA compliance`,
            fieldName: key,
            legalReference: 'HIPAA Privacy Rule §164.514(b)(2)(i)(B)',
            remediationRequired: true
          });
        }
      }
    }
    
    return violations;
  }
  
  private identifyUnnecessaryFields(data: any, purpose: string): string[] {
    // Define purpose-based field requirements
    const purposeRequirements: Record<string, string[]> = {
      'assessment_analytics': ['response_data', 'scores', 'demographics', 'industry'],
      'performance_measurement': ['scores', 'time_data', 'completion_data'],
      'research': ['anonymized_responses', 'demographic_categories', 'geographic_region'],
      'quality_assurance': ['validation_data', 'quality_metrics', 'error_rates']
    };
    
    const requiredFields = purposeRequirements[purpose] || [];
    const unnecessary: string[] = [];
    
    for (const field of Object.keys(data)) {
      if (!requiredFields.some(req => field.includes(req))) {
        unnecessary.push(field);
      }
    }
    
    return unnecessary;
  }
  
  private identifyMissingEssentialFields(data: any, purpose: string): string[] {
    const purposeRequirements: Record<string, string[]> = {
      'assessment_analytics': ['scores', 'response_data'],
      'performance_measurement': ['scores', 'time_data'],
      'research': ['anonymized_responses'],
      'quality_assurance': ['quality_metrics']
    };
    
    const requiredFields = purposeRequirements[purpose] || [];
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (!Object.keys(data).some(key => key.includes(field))) {
        missing.push(field);
      }
    }
    
    return missing;
  }
  
  private calculateDataAge(data: any, processingDate: string): number {
    const processingTime = new Date(processingDate).getTime();
    const createdTime = data.created_at ? 
      new Date(data.created_at).getTime() : processingTime;
    
    return Math.floor((processingTime - createdTime) / (1000 * 60 * 60 * 24));
  }
  
  private generateAnonymizationRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'DIRECT_IDENTIFIER_PRESENT')) {
      recommendations.push('Remove or hash all direct identifiers before processing');
    }
    
    if (violations.some(v => v.type === 'HIGH_QUASI_IDENTIFIER_COUNT')) {
      recommendations.push('Generalize quasi-identifiers to reduce re-identification risk');
    }
    
    if (violations.some(v => v.type === 'INSUFFICIENT_K_ANONYMITY')) {
      recommendations.push('Implement stronger anonymization to achieve k-anonymity >= 5');
    }
    
    return recommendations;
  }
  
  private generateDataMinimizationRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'UNNECESSARY_DATA_COLLECTION')) {
      recommendations.push('Remove data fields not necessary for the stated purpose');
    }
    
    if (violations.some(v => v.type === 'INADEQUATE_DATA_COLLECTION')) {
      recommendations.push('Ensure all essential data for the purpose is collected');
    }
    
    return recommendations;
  }
  
  private generateRetentionRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'UNDEFINED_RETENTION_PERIOD')) {
      recommendations.push('Define clear retention periods for each data category');
    }
    
    if (violations.some(v => v.type === 'RETENTION_PERIOD_EXCEEDED')) {
      recommendations.push('Implement automated data deletion when retention period expires');
    }
    
    return recommendations;
  }
  
  private generateHIPAARecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'HIPAA_IDENTIFIER_PRESENT')) {
      recommendations.push('Remove all 18 HIPAA identifiers as specified in Safe Harbor method');
    }
    
    if (violations.some(v => v.type === 'HIPAA_DATE_TOO_SPECIFIC')) {
      recommendations.push('Generalize dates to year only for individuals over 89');
    }
    
    if (violations.some(v => v.type === 'HIPAA_GEOGRAPHIC_TOO_SPECIFIC')) {
      recommendations.push('Limit geographic data to first 3 digits of ZIP code');
    }
    
    return recommendations;
  }
  
  private generateActionItems(violations: ComplianceViolation[]): Array<{
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    dueDate: string;
    responsible: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }> {
    const actionItems: any[] = [];
    
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM');
    
    if (criticalViolations.length > 0) {
      actionItems.push({
        priority: 'CRITICAL',
        description: `Resolve ${criticalViolations.length} critical compliance violations immediately`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        responsible: 'Data Protection Officer',
        status: 'PENDING'
      });
    }
    
    if (highViolations.length > 0) {
      actionItems.push({
        priority: 'HIGH',
        description: `Address ${highViolations.length} high-severity compliance issues`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        responsible: 'Compliance Team',
        status: 'PENDING'
      });
    }
    
    if (mediumViolations.length > 0) {
      actionItems.push({
        priority: 'MEDIUM',
        description: `Review and resolve ${mediumViolations.length} medium-severity issues`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        responsible: 'Technical Team',
        status: 'PENDING'
      });
    }
    
    return actionItems;
  }
  
  /**
   * DPIA Helper Methods
   */
  
  private assessPrivacyRisks(dataCategories: string[], purpose: string): Array<{
    risk: string;
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationMeasures: string[];
  }> {
    const risks: any[] = [];
    
    // Data sensitivity assessment
    if (dataCategories.includes('health') || dataCategories.includes('biometric')) {
      risks.push({
        risk: 'Unauthorized access to sensitive health data',
        likelihood: 'MEDIUM',
        impact: 'HIGH',
        mitigationMeasures: [
          'Implement strong encryption',
          'Multi-factor authentication',
          'Role-based access control',
          'Regular security audits'
        ]
      });
    }
    
    if (dataCategories.includes('financial')) {
      risks.push({
        risk: 'Financial fraud or identity theft',
        likelihood: 'MEDIUM',
        impact: 'HIGH',
        mitigationMeasures: [
          'Data minimization',
          'Strong anonymization',
          'Secure data transmission',
          'Regular vulnerability assessments'
        ]
      });
    }
    
    // Processing purpose assessment
    if (purpose.includes('profiling') || purpose.includes('automated_decision')) {
      risks.push({
        risk: 'Discriminatory or unfair automated decisions',
        likelihood: 'MEDIUM',
        impact: 'MEDIUM',
        mitigationMeasures: [
          'Algorithm fairness testing',
          'Human oversight',
          'Transparent decision criteria',
          'Right to explanation'
        ]
      });
    }
    
    return risks;
  }
  
  private assessNecessity(dataCategories: string[], purpose: string): string {
    const necessaryCategories = this.getNecessaryDataCategories(purpose);
    const unnecessaryCategories = dataCategories.filter(cat => 
      !necessaryCategories.includes(cat)
    );
    
    if (unnecessaryCategories.length === 0) {
      return 'All data categories are necessary for the stated purpose.';
    } else {
      return `The following data categories may not be necessary: ${unnecessaryCategories.join(', ')}. Consider removing or providing additional justification.`;
    }
  }
  
  private assessProportionality(dataCategories: string[], purpose: string): string {
    const riskLevel = this.assessOverallRiskLevel(dataCategories);
    const purposeBenefit = this.assessPurposeBenefit(purpose);
    
    if (riskLevel <= purposeBenefit) {
      return 'The processing is proportional - the benefits justify the privacy risks.';
    } else {
      return 'The processing may not be proportional - consider additional safeguards or alternative approaches to reduce privacy risks.';
    }
  }
  
  private getNecessaryDataCategories(purpose: string): string[] {
    const purposeRequirements: Record<string, string[]> = {
      'assessment_analytics': ['assessment_responses', 'demographics', 'performance_metrics'],
      'research': ['anonymized_data', 'statistical_data'],
      'quality_improvement': ['process_metrics', 'performance_data'],
      'compliance_monitoring': ['audit_data', 'access_logs']
    };
    
    return purposeRequirements[purpose] || [];
  }
  
  private assessOverallRiskLevel(dataCategories: string[]): number {
    let riskScore = 0;
    
    if (dataCategories.includes('health')) riskScore += 3;
    if (dataCategories.includes('financial')) riskScore += 3;
    if (dataCategories.includes('biometric')) riskScore += 4;
    if (dataCategories.includes('genetic')) riskScore += 4;
    if (dataCategories.includes('demographic')) riskScore += 1;
    if (dataCategories.includes('behavioral')) riskScore += 2;
    
    return riskScore;
  }
  
  private assessPurposeBenefit(purpose: string): number {
    const benefits: Record<string, number> = {
      'medical_research': 5,
      'public_health': 5,
      'safety_improvement': 4,
      'assessment_analytics': 3,
      'quality_improvement': 3,
      'performance_monitoring': 2,
      'marketing': 1
    };
    
    return benefits[purpose] || 2;
  }
  
  private identifyDataSubjects(dataCategories: string[]): string[] {
    const subjects: string[] = [];
    
    if (dataCategories.includes('employee_data')) subjects.push('Employees');
    if (dataCategories.includes('customer_data')) subjects.push('Customers');
    if (dataCategories.includes('patient_data')) subjects.push('Patients');
    if (dataCategories.includes('assessment_data')) subjects.push('Assessment participants');
    
    return subjects.length > 0 ? subjects : ['Data subjects'];
  }
  
  private identifyRecipients(purpose: string): string[] {
    const recipients: string[] = ['Internal analytics team'];
    
    if (purpose.includes('research')) recipients.push('Research partners');
    if (purpose.includes('compliance')) recipients.push('Regulatory authorities');
    if (purpose.includes('third_party')) recipients.push('Third-party processors');
    
    return recipients;
  }
  
  private hasThirdCountryTransfers(purpose: string): boolean {
    return purpose.includes('international') || purpose.includes('global');
  }
  
  private determineRetentionPeriod(dataCategories: string[], purpose: string): string {
    // Default retention periods based on data type and purpose
    if (dataCategories.includes('health')) return '7 years';
    if (dataCategories.includes('financial')) return '7 years';
    if (purpose.includes('research')) return '10 years';
    if (purpose.includes('analytics')) return '3 years';
    
    return '2 years';
  }
  
  private identifySecurityMeasures(dataCategories: string[]): string[] {
    const measures = [
      'Encryption at rest and in transit',
      'Access controls and authentication',
      'Regular security audits',
      'Data backup and recovery procedures'
    ];
    
    if (dataCategories.includes('health') || dataCategories.includes('financial')) {
      measures.push('Enhanced encryption standards');
      measures.push('Multi-factor authentication');
      measures.push('Network segmentation');
    }
    
    if (dataCategories.includes('biometric')) {
      measures.push('Biometric template protection');
      measures.push('Specialized hardware security modules');
    }
    
    return measures;
  }
  
  /**
   * Database storage methods
   */
  
  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO compliance_reports (
          id, timestamp, regulation_scope, overall_score, status,
          summary, rule_results, violations, recommendations,
          action_items, audit_trail
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        report.id,
        report.timestamp,
        JSON.stringify(report.regulationScope),
        report.overallScore,
        report.status,
        JSON.stringify(report.summary),
        JSON.stringify(report.ruleResults),
        JSON.stringify(report.violations),
        JSON.stringify(report.recommendations),
        JSON.stringify(report.actionItems),
        JSON.stringify(report.auditTrail)
      ]);
    } finally {
      client.release();
    }
  }
  
  private async storeDPIA(dpia: DPIAAssessment): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO dpia_assessments (
          id, data_processing_activity, purpose, legal_basis,
          data_categories, data_subjects, recipients,
          transfers_to_third_countries, retention_period,
          security_measures, privacy_risks, necessity_assessment,
          proportionality_assessment, compliance_status,
          review_date, approved_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        dpia.id,
        dpia.dataProcessingActivity,
        dpia.purpose,
        dpia.legalBasis,
        JSON.stringify(dpia.dataCategories),
        JSON.stringify(dpia.dataSubjects),
        JSON.stringify(dpia.recipients),
        dpia.transfersToThirdCountries,
        dpia.retentionPeriod,
        JSON.stringify(dpia.securityMeasures),
        JSON.stringify(dpia.privacyRisks),
        dpia.necessityAssessment,
        dpia.proportionalityAssessment,
        dpia.complianceStatus,
        dpia.reviewDate,
        dpia.approvedBy
      ]);
    } finally {
      client.release();
    }
  }
}

/**
 * Create compliance validator with default configuration
 */
export function createComplianceValidator(dbPool?: Pool): ComplianceValidator {
  return new ComplianceValidator(dbPool);
}