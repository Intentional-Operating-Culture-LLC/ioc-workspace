/**
 * IOC Core - Regulatory Engine
 * Manages regulatory compliance for GDPR, HIPAA, CCPA, SOC 2, and other regulations
 */

import { EventEmitter } from 'events';
import {
  Regulation,
  Requirement,
  Control,
  RegulationStatus,
  RequirementStatus,
  Evidence,
  AutomatedCheck,
  RemediationPlan,
  EvidenceRequirement
} from '../types';
import { GDPRCompliance } from './regulations/GDPRCompliance';
import { HIPAACompliance } from './regulations/HIPAACompliance';
import { CCPACompliance } from './regulations/CCPACompliance';
import { SOC2Compliance } from './regulations/SOC2Compliance';
import { ISO27001Compliance } from './regulations/ISO27001Compliance';
import { ComplianceAssessor } from './ComplianceAssessor';
import { EvidenceCollector } from './EvidenceCollector';
import { RemediationPlanner } from './RemediationPlanner';
import { RegulatoryCache } from '../utils/RegulatoryCache';
import { createClient } from '../../supabase/server';

export interface RegulatoryConfig {
  regulations: string[];
  automatedAssessment: boolean;
  continuousMonitoring: boolean;
  evidenceRetention: number; // days
  assessmentFrequency: {
    gdpr: string; // cron expression
    hipaa: string;
    ccpa: string;
    soc2: string;
    iso27001: string;
  };
}

export interface RegulatoryStatus {
  overallScore: number;
  regulations: RegulationStatus[];
  totalRequirements: number;
  compliantRequirements: number;
  partialRequirements: number;
  nonCompliantRequirements: number;
  criticalGaps: Gap[];
  upcomingAudits: Audit[];
}

interface Gap {
  regulation: string;
  requirement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  deadline?: Date;
}

interface Audit {
  regulation: string;
  type: 'internal' | 'external' | 'certification';
  scheduledDate: Date;
  auditor?: string;
  scope: string[];
}

interface ComplianceFramework {
  regulation: Regulation;
  compliance: any; // Specific compliance implementation
  status: RegulationStatus;
  lastAssessment: Date;
  nextAssessment: Date;
}

export class RegulatoryEngine extends EventEmitter {
  private config: RegulatoryConfig;
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private assessor: ComplianceAssessor;
  private evidenceCollector: EvidenceCollector;
  private remediationPlanner: RemediationPlanner;
  private cache: RegulatoryCache;
  private supabase = createClient();
  private assessmentIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(regulations: string[], config?: Partial<RegulatoryConfig>) {
    super();
    this.config = {
      regulations,
      automatedAssessment: true,
      continuousMonitoring: true,
      evidenceRetention: 365, // 1 year
      assessmentFrequency: {
        gdpr: '0 0 * * 0', // Weekly
        hipaa: '0 0 1 * *', // Monthly
        ccpa: '0 0 * * 0', // Weekly
        soc2: '0 0 1 */3 *', // Quarterly
        iso27001: '0 0 1 * *' // Monthly
      },
      ...config
    };

    this.assessor = new ComplianceAssessor();
    this.evidenceCollector = new EvidenceCollector();
    this.remediationPlanner = new RemediationPlanner();
    this.cache = new RegulatoryCache();

    this.initializeFrameworks();
  }

  private initializeFrameworks(): void {
    for (const regulation of this.config.regulations) {
      switch (regulation.toUpperCase()) {
        case 'GDPR':
          this.frameworks.set('GDPR', {
            regulation: this.createGDPRRegulation(),
            compliance: new GDPRCompliance(),
            status: this.createEmptyStatus('GDPR'),
            lastAssessment: new Date(),
            nextAssessment: new Date()
          });
          break;
        case 'HIPAA':
          this.frameworks.set('HIPAA', {
            regulation: this.createHIPAARegulation(),
            compliance: new HIPAACompliance(),
            status: this.createEmptyStatus('HIPAA'),
            lastAssessment: new Date(),
            nextAssessment: new Date()
          });
          break;
        case 'CCPA':
          this.frameworks.set('CCPA', {
            regulation: this.createCCPARegulation(),
            compliance: new CCPACompliance(),
            status: this.createEmptyStatus('CCPA'),
            lastAssessment: new Date(),
            nextAssessment: new Date()
          });
          break;
        case 'SOC2':
          this.frameworks.set('SOC2', {
            regulation: this.createSOC2Regulation(),
            compliance: new SOC2Compliance(),
            status: this.createEmptyStatus('SOC2'),
            lastAssessment: new Date(),
            nextAssessment: new Date()
          });
          break;
        case 'ISO27001':
          this.frameworks.set('ISO27001', {
            regulation: this.createISO27001Regulation(),
            compliance: new ISO27001Compliance(),
            status: this.createEmptyStatus('ISO27001'),
            lastAssessment: new Date(),
            nextAssessment: new Date()
          });
          break;
      }
    }
  }

  private createGDPRRegulation(): Regulation {
    return {
      id: 'gdpr',
      name: 'GDPR',
      version: '2016/679',
      effectiveDate: new Date('2018-05-25'),
      requirements: [
        {
          id: 'gdpr_art_5',
          category: 'Principles',
          description: 'Principles relating to processing of personal data',
          controls: [],
          evidence: [
            {
              type: 'policy',
              description: 'Data processing policy',
              frequency: 'annually',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'gdpr_art_6',
          category: 'Lawfulness',
          description: 'Lawfulness of processing',
          controls: [],
          evidence: [
            {
              type: 'consent_records',
              description: 'Consent management records',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'gdpr_art_15',
          category: 'Rights',
          description: 'Right of access by the data subject',
          controls: [],
          evidence: [
            {
              type: 'access_logs',
              description: 'Data subject access request logs',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'gdpr_art_17',
          category: 'Rights',
          description: 'Right to erasure ("right to be forgotten")',
          controls: [],
          evidence: [
            {
              type: 'deletion_logs',
              description: 'Data deletion records',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'gdpr_art_32',
          category: 'Security',
          description: 'Security of processing',
          controls: [],
          evidence: [
            {
              type: 'security_assessment',
              description: 'Security controls assessment',
              frequency: 'quarterly',
              automated: false
            }
          ],
          automatedChecks: []
        }
      ],
      jurisdictions: ['EU', 'EEA']
    };
  }

  private createHIPAARegulation(): Regulation {
    return {
      id: 'hipaa',
      name: 'HIPAA',
      version: '1996',
      effectiveDate: new Date('1996-08-21'),
      requirements: [
        {
          id: 'hipaa_164_308',
          category: 'Administrative Safeguards',
          description: 'Administrative safeguards for PHI',
          controls: [],
          evidence: [
            {
              type: 'risk_assessment',
              description: 'Security risk assessment',
              frequency: 'annually',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'hipaa_164_310',
          category: 'Physical Safeguards',
          description: 'Physical safeguards for PHI',
          controls: [],
          evidence: [
            {
              type: 'physical_security',
              description: 'Physical security controls',
              frequency: 'quarterly',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'hipaa_164_312',
          category: 'Technical Safeguards',
          description: 'Technical safeguards for PHI',
          controls: [],
          evidence: [
            {
              type: 'encryption_status',
              description: 'Encryption implementation',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        }
      ],
      jurisdictions: ['US']
    };
  }

  private createCCPARegulation(): Regulation {
    return {
      id: 'ccpa',
      name: 'CCPA',
      version: 'AB-375',
      effectiveDate: new Date('2020-01-01'),
      requirements: [
        {
          id: 'ccpa_1798_100',
          category: 'Consumer Rights',
          description: 'Right to know about personal information collected',
          controls: [],
          evidence: [
            {
              type: 'privacy_notice',
              description: 'Privacy notice compliance',
              frequency: 'annually',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'ccpa_1798_105',
          category: 'Consumer Rights',
          description: 'Right to deletion of personal information',
          controls: [],
          evidence: [
            {
              type: 'deletion_capability',
              description: 'Deletion process documentation',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'ccpa_1798_120',
          category: 'Consumer Rights',
          description: 'Right to opt-out of sale of personal information',
          controls: [],
          evidence: [
            {
              type: 'opt_out_mechanism',
              description: 'Opt-out implementation',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        }
      ],
      jurisdictions: ['US-CA']
    };
  }

  private createSOC2Regulation(): Regulation {
    return {
      id: 'soc2',
      name: 'SOC2',
      version: 'Type II',
      effectiveDate: new Date('2017-04-01'),
      requirements: [
        {
          id: 'soc2_security',
          category: 'Security',
          description: 'Security principle requirements',
          controls: [],
          evidence: [
            {
              type: 'security_controls',
              description: 'Security control implementation',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'soc2_availability',
          category: 'Availability',
          description: 'Availability principle requirements',
          controls: [],
          evidence: [
            {
              type: 'uptime_metrics',
              description: 'System availability metrics',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        },
        {
          id: 'soc2_confidentiality',
          category: 'Confidentiality',
          description: 'Confidentiality principle requirements',
          controls: [],
          evidence: [
            {
              type: 'access_controls',
              description: 'Access control implementation',
              frequency: 'continuous',
              automated: true
            }
          ],
          automatedChecks: []
        }
      ],
      jurisdictions: ['Global']
    };
  }

  private createISO27001Regulation(): Regulation {
    return {
      id: 'iso27001',
      name: 'ISO27001',
      version: '2013',
      effectiveDate: new Date('2013-10-01'),
      requirements: [
        {
          id: 'iso_a5',
          category: 'Information Security Policies',
          description: 'Management direction for information security',
          controls: [],
          evidence: [
            {
              type: 'policy_documents',
              description: 'Information security policies',
              frequency: 'annually',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'iso_a6',
          category: 'Organization',
          description: 'Organization of information security',
          controls: [],
          evidence: [
            {
              type: 'org_structure',
              description: 'Security organization documentation',
              frequency: 'annually',
              automated: false
            }
          ],
          automatedChecks: []
        },
        {
          id: 'iso_a9',
          category: 'Access Control',
          description: 'Access control requirements',
          controls: [],
          evidence: [
            {
              type: 'access_reviews',
              description: 'Access control reviews',
              frequency: 'quarterly',
              automated: true
            }
          ],
          automatedChecks: []
        }
      ],
      jurisdictions: ['Global']
    };
  }

  private createEmptyStatus(regulationName: string): RegulationStatus {
    return {
      regulation: this.frameworks.get(regulationName)!.regulation,
      complianceLevel: 0,
      requirements: [],
      lastAudit: new Date(),
      nextAudit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-components
      await Promise.all([
        this.assessor.initialize(),
        this.evidenceCollector.initialize(),
        this.remediationPlanner.initialize()
      ]);

      // Load compliance frameworks
      for (const [name, framework] of this.frameworks) {
        await framework.compliance.initialize();
      }

      // Load existing compliance data
      await this.loadComplianceData();

      // Set up automated checks
      await this.setupAutomatedChecks();

      // Schedule assessments
      this.scheduleAssessments();

      // Start continuous monitoring
      if (this.config.continuousMonitoring) {
        this.startContinuousMonitoring();
      }

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadComplianceData(): Promise<void> {
    // Load requirement statuses
    const { data: statuses } = await this.supabase
      .from('requirement_statuses')
      .select('*')
      .eq('active', true);

    if (statuses) {
      for (const status of statuses) {
        const framework = this.frameworks.get(status.regulation);
        if (framework) {
          const requirement = framework.regulation.requirements
            .find(r => r.id === status.requirement_id);
          
          if (requirement) {
            const requirementStatus: RequirementStatus = {
              requirementId: status.requirement_id,
              status: status.status,
              evidence: JSON.parse(status.evidence || '[]'),
              gaps: JSON.parse(status.gaps || '[]'),
              remediationPlan: status.remediation_plan ? 
                JSON.parse(status.remediation_plan) : undefined
            };
            
            framework.status.requirements.push(requirementStatus);
          }
        }
      }
    }

    // Calculate compliance levels
    for (const framework of this.frameworks.values()) {
      framework.status.complianceLevel = this.calculateComplianceLevel(framework.status);
    }
  }

  private calculateComplianceLevel(status: RegulationStatus): number {
    if (status.requirements.length === 0) return 0;

    const weights = {
      compliant: 1.0,
      partial: 0.5,
      non_compliant: 0,
      not_applicable: 1.0
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const req of status.requirements) {
      const weight = weights[req.status];
      weightedScore += weight;
      totalWeight += 1;
    }

    return Math.round((weightedScore / totalWeight) * 100);
  }

  private async setupAutomatedChecks(): Promise<void> {
    for (const framework of this.frameworks.values()) {
      for (const requirement of framework.regulation.requirements) {
        // Create automated checks based on requirement
        const checks = await this.createAutomatedChecks(requirement, framework.regulation.name);
        requirement.automatedChecks = checks;

        // Store in database
        for (const check of checks) {
          await this.storeAutomatedCheck(check, framework.regulation.id, requirement.id);
        }
      }
    }
  }

  private async createAutomatedChecks(requirement: Requirement, regulation: string): Promise<AutomatedCheck[]> {
    const checks: AutomatedCheck[] = [];

    // Create checks based on requirement type
    switch (requirement.category) {
      case 'Rights':
        checks.push({
          id: `check_${requirement.id}_response_time`,
          name: `${regulation} - Data Subject Request Response Time`,
          schedule: '0 */6 * * *', // Every 6 hours
          query: 'data_subject_requests.avg(response_time)',
          threshold: { max: 30 * 24 }, // 30 days in hours
          severity: 'high'
        });
        break;
        
      case 'Security':
        checks.push({
          id: `check_${requirement.id}_encryption`,
          name: `${regulation} - Encryption Status`,
          schedule: '0 0 * * *', // Daily
          query: 'data_assets.count(encrypted=false)',
          threshold: { equals: 0 },
          severity: 'critical'
        });
        break;
        
      case 'Consumer Rights':
        checks.push({
          id: `check_${requirement.id}_opt_out`,
          name: `${regulation} - Opt-out Mechanism`,
          schedule: '0 */12 * * *', // Every 12 hours
          query: 'opt_out_requests.count(pending)',
          threshold: { max: 100 },
          severity: 'medium'
        });
        break;
    }

    return checks;
  }

  private async storeAutomatedCheck(
    check: AutomatedCheck, 
    regulationId: string, 
    requirementId: string
  ): Promise<void> {
    await this.supabase
      .from('automated_checks')
      .upsert({
        id: check.id,
        name: check.name,
        regulation_id: regulationId,
        requirement_id: requirementId,
        schedule: check.schedule,
        query: check.query,
        threshold: JSON.stringify(check.threshold),
        severity: check.severity,
        enabled: true
      });
  }

  private scheduleAssessments(): void {
    for (const [regulation, framework] of this.frameworks) {
      const frequency = this.config.assessmentFrequency[regulation.toLowerCase() as keyof typeof this.config.assessmentFrequency];
      if (frequency) {
        // Schedule based on cron expression
        // For simplicity, using intervals
        const interval = this.parseFrequency(frequency);
        
        const intervalId = setInterval(() => {
          this.runAssessment(regulation);
        }, interval);
        
        this.assessmentIntervals.set(regulation, intervalId);
      }
    }
  }

  private parseFrequency(cronExpression: string): number {
    // Simplified cron parsing - returns milliseconds
    if (cronExpression.includes('* * 0')) return 7 * 24 * 60 * 60 * 1000; // Weekly
    if (cronExpression.includes('1 * *')) return 30 * 24 * 60 * 60 * 1000; // Monthly
    if (cronExpression.includes('1 */3 *')) return 90 * 24 * 60 * 60 * 1000; // Quarterly
    return 24 * 60 * 60 * 1000; // Default to daily
  }

  private async runAssessment(regulation: string): Promise<void> {
    try {
      const framework = this.frameworks.get(regulation);
      if (!framework) return;

      this.emit('assessment_started', { regulation });

      // Run compliance assessment
      const assessment = await this.assessor.assessCompliance(
        framework.regulation,
        framework.compliance
      );

      // Collect evidence
      const evidence = await this.evidenceCollector.collectEvidence(
        framework.regulation.requirements
      );

      // Update requirement statuses
      for (const requirement of framework.regulation.requirements) {
        const status = await this.assessRequirement(requirement, evidence);
        
        // Update or add status
        const existingIndex = framework.status.requirements
          .findIndex(r => r.requirementId === requirement.id);
        
        if (existingIndex >= 0) {
          framework.status.requirements[existingIndex] = status;
        } else {
          framework.status.requirements.push(status);
        }

        // Store in database
        await this.storeRequirementStatus(regulation, status);
      }

      // Update compliance level
      framework.status.complianceLevel = this.calculateComplianceLevel(framework.status);
      framework.lastAssessment = new Date();
      framework.nextAssessment = new Date(Date.now() + this.parseFrequency(
        this.config.assessmentFrequency[regulation.toLowerCase() as keyof typeof this.config.assessmentFrequency]
      ));

      // Generate remediation plans for gaps
      await this.generateRemediationPlans(framework);

      this.emit('assessment_completed', {
        regulation,
        complianceLevel: framework.status.complianceLevel,
        gaps: this.identifyGaps(framework.status)
      });

    } catch (error) {
      this.emit('assessment_failed', { regulation, error });
    }
  }

  private async assessRequirement(
    requirement: Requirement,
    evidence: Map<string, Evidence[]>
  ): Promise<RequirementStatus> {
    const requirementEvidence = evidence.get(requirement.id) || [];
    
    // Check if all required evidence is present
    const requiredEvidence = requirement.evidence;
    const gaps: string[] = [];
    
    for (const required of requiredEvidence) {
      const found = requirementEvidence.find(e => e.type === required.type);
      if (!found) {
        gaps.push(`Missing ${required.type}: ${required.description}`);
      }
    }

    // Determine status
    let status: RequirementStatus['status'];
    if (gaps.length === 0) {
      status = 'compliant';
    } else if (gaps.length < requiredEvidence.length / 2) {
      status = 'partial';
    } else {
      status = 'non_compliant';
    }

    return {
      requirementId: requirement.id,
      status,
      evidence: requirementEvidence,
      gaps
    };
  }

  private async storeRequirementStatus(
    regulation: string,
    status: RequirementStatus
  ): Promise<void> {
    await this.supabase
      .from('requirement_statuses')
      .upsert({
        regulation,
        requirement_id: status.requirementId,
        status: status.status,
        evidence: JSON.stringify(status.evidence),
        gaps: JSON.stringify(status.gaps),
        remediation_plan: status.remediationPlan ? 
          JSON.stringify(status.remediationPlan) : null,
        assessed_at: new Date().toISOString(),
        active: true
      });
  }

  private identifyGaps(status: RegulationStatus): Gap[] {
    const gaps: Gap[] = [];

    for (const req of status.requirements) {
      if (req.status !== 'compliant' && req.status !== 'not_applicable') {
        const requirement = status.regulation.requirements
          .find(r => r.id === req.requirementId);
        
        if (requirement) {
          gaps.push({
            regulation: status.regulation.name,
            requirement: requirement.id,
            severity: this.calculateGapSeverity(req, requirement),
            description: requirement.description,
            remediation: req.gaps.join('; '),
            deadline: req.remediationPlan?.estimatedCompletion
          });
        }
      }
    }

    return gaps;
  }

  private calculateGapSeverity(
    status: RequirementStatus,
    requirement: Requirement
  ): Gap['severity'] {
    // Determine severity based on requirement category and status
    if (requirement.category === 'Security' && status.status === 'non_compliant') {
      return 'critical';
    }
    if (requirement.category === 'Rights' && status.status === 'non_compliant') {
      return 'high';
    }
    if (status.status === 'non_compliant') {
      return 'medium';
    }
    return 'low';
  }

  private async generateRemediationPlans(framework: ComplianceFramework): Promise<void> {
    const gaps = this.identifyGaps(framework.status);
    
    for (const gap of gaps) {
      if (gap.severity === 'critical' || gap.severity === 'high') {
        const plan = await this.remediationPlanner.generatePlan(gap);
        
        // Update requirement status with plan
        const reqStatus = framework.status.requirements
          .find(r => r.requirementId === gap.requirement);
        
        if (reqStatus) {
          reqStatus.remediationPlan = plan;
          await this.storeRequirementStatus(framework.regulation.id, reqStatus);
        }
      }
    }
  }

  private startContinuousMonitoring(): void {
    // Monitor for regulation changes
    setInterval(() => {
      this.checkForRegulationUpdates();
    }, 24 * 60 * 60 * 1000); // Daily

    // Monitor compliance metrics
    setInterval(() => {
      this.monitorComplianceMetrics();
    }, 60 * 60 * 1000); // Hourly

    // Clean up old evidence
    setInterval(() => {
      this.cleanupOldEvidence();
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }

  private async checkForRegulationUpdates(): Promise<void> {
    // Check for updates to regulations
    // In production, would query regulatory update services
    for (const framework of this.frameworks.values()) {
      const updates = await this.checkRegulationUpdates(framework.regulation);
      if (updates.length > 0) {
        this.emit('regulation_updated', {
          regulation: framework.regulation.name,
          updates
        });
      }
    }
  }

  private async checkRegulationUpdates(regulation: Regulation): Promise<any[]> {
    // Simplified - would check actual regulatory sources
    return [];
  }

  private async monitorComplianceMetrics(): Promise<void> {
    const metrics = {
      overallCompliance: await this.calculateOverallCompliance(),
      criticalGaps: await this.countCriticalGaps(),
      upcomingDeadlines: await this.getUpcomingDeadlines(),
      evidenceAge: await this.checkEvidenceAge()
    };

    this.emit('metrics_updated', metrics);

    // Alert on critical issues
    if (metrics.criticalGaps > 0) {
      this.emit('critical_gaps_detected', {
        count: metrics.criticalGaps,
        gaps: await this.getCriticalGaps()
      });
    }
  }

  private async calculateOverallCompliance(): Promise<number> {
    let totalScore = 0;
    let count = 0;

    for (const framework of this.frameworks.values()) {
      totalScore += framework.status.complianceLevel;
      count++;
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  private async countCriticalGaps(): Promise<number> {
    let count = 0;

    for (const framework of this.frameworks.values()) {
      const gaps = this.identifyGaps(framework.status);
      count += gaps.filter(g => g.severity === 'critical').length;
    }

    return count;
  }

  private async getCriticalGaps(): Promise<Gap[]> {
    const allGaps: Gap[] = [];

    for (const framework of this.frameworks.values()) {
      const gaps = this.identifyGaps(framework.status);
      allGaps.push(...gaps.filter(g => g.severity === 'critical'));
    }

    return allGaps;
  }

  private async getUpcomingDeadlines(): Promise<any[]> {
    const deadlines: any[] = [];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const framework of this.frameworks.values()) {
      // Check audit deadlines
      if (framework.status.nextAudit < thirtyDaysFromNow) {
        deadlines.push({
          type: 'audit',
          regulation: framework.regulation.name,
          date: framework.status.nextAudit,
          daysRemaining: Math.ceil(
            (framework.status.nextAudit.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          )
        });
      }

      // Check remediation deadlines
      const gaps = this.identifyGaps(framework.status);
      for (const gap of gaps) {
        if (gap.deadline && gap.deadline < thirtyDaysFromNow) {
          deadlines.push({
            type: 'remediation',
            regulation: gap.regulation,
            requirement: gap.requirement,
            date: gap.deadline,
            daysRemaining: Math.ceil(
              (gap.deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            )
          });
        }
      }
    }

    return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private async checkEvidenceAge(): Promise<any> {
    const evidenceAge: Record<string, number> = {};

    for (const framework of this.frameworks.values()) {
      let totalAge = 0;
      let count = 0;

      for (const req of framework.status.requirements) {
        for (const evidence of req.evidence) {
          const age = (Date.now() - evidence.collectedAt.getTime()) / (24 * 60 * 60 * 1000);
          totalAge += age;
          count++;
        }
      }

      evidenceAge[framework.regulation.name] = count > 0 ? Math.round(totalAge / count) : 0;
    }

    return evidenceAge;
  }

  private async cleanupOldEvidence(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.evidenceRetention * 24 * 60 * 60 * 1000);

    await this.supabase
      .from('compliance_evidence')
      .delete()
      .lt('collected_at', cutoffDate.toISOString())
      .eq('archived', false);

    this.emit('evidence_cleaned', { cutoffDate });
  }

  // Public API methods

  async getStatus(): Promise<RegulatoryStatus> {
    const regulations: RegulationStatus[] = [];
    let totalRequirements = 0;
    let compliantRequirements = 0;
    let partialRequirements = 0;
    let nonCompliantRequirements = 0;

    for (const framework of this.frameworks.values()) {
      regulations.push(framework.status);
      totalRequirements += framework.status.requirements.length;
      
      for (const req of framework.status.requirements) {
        switch (req.status) {
          case 'compliant':
            compliantRequirements++;
            break;
          case 'partial':
            partialRequirements++;
            break;
          case 'non_compliant':
            nonCompliantRequirements++;
            break;
        }
      }
    }

    const criticalGaps = await this.getCriticalGaps();
    const upcomingAudits = await this.getUpcomingAudits();
    const overallScore = await this.calculateOverallCompliance();

    return {
      overallScore,
      regulations,
      totalRequirements,
      compliantRequirements,
      partialRequirements,
      nonCompliantRequirements,
      criticalGaps,
      upcomingAudits
    };
  }

  private async getUpcomingAudits(): Promise<Audit[]> {
    const audits: Audit[] = [];

    const { data } = await this.supabase
      .from('compliance_audits')
      .select('*')
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date');

    for (const audit of data || []) {
      audits.push({
        regulation: audit.regulation,
        type: audit.type,
        scheduledDate: new Date(audit.scheduled_date),
        auditor: audit.auditor,
        scope: JSON.parse(audit.scope || '[]')
      });
    }

    return audits;
  }

  async checkCompliance(regulation: string, requirement?: string): Promise<any> {
    const framework = this.frameworks.get(regulation.toUpperCase());
    if (!framework) {
      return { compliant: false, reason: 'Regulation not configured' };
    }

    if (requirement) {
      const reqStatus = framework.status.requirements
        .find(r => r.requirementId === requirement);
      
      return {
        compliant: reqStatus?.status === 'compliant',
        status: reqStatus?.status || 'unknown',
        gaps: reqStatus?.gaps || []
      };
    }

    return {
      compliant: framework.status.complianceLevel === 100,
      complianceLevel: framework.status.complianceLevel,
      totalRequirements: framework.regulation.requirements.length,
      compliantRequirements: framework.status.requirements
        .filter(r => r.status === 'compliant').length
    };
  }

  async getAutomatedChecks(): Promise<AutomatedCheck[]> {
    const checks: AutomatedCheck[] = [];

    for (const framework of this.frameworks.values()) {
      for (const requirement of framework.regulation.requirements) {
        checks.push(...requirement.automatedChecks);
      }
    }

    return checks;
  }

  async getRemediationTemplates(regulation: string, requirement: string): Promise<any> {
    return await this.remediationPlanner.getTemplates(regulation, requirement);
  }

  async getMitigationStrategies(risk: any): Promise<any[]> {
    // Get mitigation strategies based on risk
    const strategies: any[] = [];

    // Find related regulatory requirements
    for (const framework of this.frameworks.values()) {
      const relatedRequirements = framework.regulation.requirements
        .filter(r => r.category === risk.category);
      
      for (const req of relatedRequirements) {
        const strategy = await this.remediationPlanner.generateMitigationStrategy(
          risk,
          req,
          framework.regulation.name
        );
        strategies.push(strategy);
      }
    }

    return strategies;
  }

  async shutdown(): Promise<void> {
    // Clear assessment intervals
    for (const interval of this.assessmentIntervals.values()) {
      clearInterval(interval);
    }

    // Shutdown compliance frameworks
    for (const framework of this.frameworks.values()) {
      await framework.compliance.shutdown();
    }

    // Shutdown sub-components
    await Promise.all([
      this.assessor.shutdown(),
      this.evidenceCollector.shutdown(),
      this.remediationPlanner.shutdown()
    ]);

    this.emit('shutdown');
  }
}