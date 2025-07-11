/**
 * IOC Core - Privacy Manager
 * Manages all privacy-related controls including data minimization,
 * consent management, retention policies, and data subject rights
 */

import { EventEmitter } from 'events';
import {
  PrivacyPolicy,
  DataCategory,
  ProcessingPurpose,
  RetentionPolicy,
  DataSubjectRight,
  ConsentRequirement,
  MinimizationRule,
  MaskingRule,
  ComplianceEvent
} from '../types';
import { ConsentManager } from './ConsentManager';
import { RetentionManager } from './RetentionManager';
import { DataMinimizer } from './DataMinimizer';
import { RightsProcessor } from './RightsProcessor';
import { PrivacyCache } from '../utils/PrivacyCache';
import { createClient } from '../../supabase/server';

export interface PrivacyConfig {
  defaultRetentionDays: number;
  consentRequired: boolean;
  anonymizationEnabled: boolean;
  dataMinimizationLevel: 'minimal' | 'moderate' | 'aggressive';
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  childProtection: boolean;
  minimumAge: number;
}

export interface PrivacyStatus {
  score: number;
  policies: PolicyStatus[];
  consent: ConsentStatus;
  retention: RetentionStatus;
  rights: RightsStatus;
  issues: PrivacyIssue[];
}

interface PolicyStatus {
  policyId: string;
  version: string;
  compliant: boolean;
  issues: string[];
}

interface ConsentStatus {
  totalUsers: number;
  consentedUsers: number;
  withdrawnConsents: number;
  pendingRequests: number;
}

interface RetentionStatus {
  policiesActive: number;
  dataExpired: number;
  pendingDeletion: number;
  deletionBacklog: number;
}

interface RightsStatus {
  pendingRequests: number;
  processedToday: number;
  averageResponseTime: number; // hours
  complianceRate: number; // percentage
}

interface PrivacyIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export class PrivacyManager extends EventEmitter {
  private config: PrivacyConfig;
  private consentManager: ConsentManager;
  private retentionManager: RetentionManager;
  private dataMinimizer: DataMinimizer;
  private rightsProcessor: RightsProcessor;
  private cache: PrivacyCache;
  private policies: Map<string, PrivacyPolicy> = new Map();
  private supabase = createClient();

  constructor(config?: Partial<PrivacyConfig>) {
    super();
    this.config = {
      defaultRetentionDays: 365,
      consentRequired: true,
      anonymizationEnabled: true,
      dataMinimizationLevel: 'moderate',
      gdprCompliant: true,
      ccpaCompliant: true,
      childProtection: true,
      minimumAge: 13,
      ...config
    };

    this.consentManager = new ConsentManager(this.config);
    this.retentionManager = new RetentionManager(this.config);
    this.dataMinimizer = new DataMinimizer(this.config);
    this.rightsProcessor = new RightsProcessor(this.config);
    this.cache = new PrivacyCache();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-managers
      await Promise.all([
        this.consentManager.initialize(),
        this.retentionManager.initialize(),
        this.dataMinimizer.initialize(),
        this.rightsProcessor.initialize()
      ]);

      // Load privacy policies
      await this.loadPrivacyPolicies();

      // Set up event handlers
      this.setupEventHandlers();

      // Start background processes
      this.startBackgroundProcesses();

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadPrivacyPolicies(): Promise<void> {
    const { data: policies, error } = await this.supabase
      .from('privacy_policies')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    for (const policy of policies || []) {
      this.policies.set(policy.id, this.parsePolicy(policy));
    }
  }

  private parsePolicy(rawPolicy: any): PrivacyPolicy {
    return {
      id: rawPolicy.id,
      version: rawPolicy.version,
      effectiveDate: new Date(rawPolicy.effective_date),
      dataCategories: JSON.parse(rawPolicy.data_categories),
      purposes: JSON.parse(rawPolicy.purposes),
      retentionPolicies: JSON.parse(rawPolicy.retention_policies),
      dataSubjectRights: JSON.parse(rawPolicy.data_subject_rights),
      consentRequirements: JSON.parse(rawPolicy.consent_requirements)
    };
  }

  private setupEventHandlers(): void {
    // Consent events
    this.consentManager.on('consent_granted', (event) => {
      this.emit('consent_change', { ...event, granted: true });
    });

    this.consentManager.on('consent_withdrawn', (event) => {
      this.emit('consent_change', { ...event, granted: false });
      this.handleConsentWithdrawal(event);
    });

    // Retention events
    this.retentionManager.on('data_expired', (event) => {
      this.handleDataExpiration(event);
    });

    // Rights events
    this.rightsProcessor.on('request_received', (event) => {
      this.emit('data_request', event);
    });

    this.rightsProcessor.on('request_completed', (event) => {
      this.emit('request_completed', event);
    });
  }

  private startBackgroundProcesses(): void {
    // Data retention enforcement
    setInterval(() => {
      this.enforceRetentionPolicies();
    }, 3600000); // Every hour

    // Consent expiration check
    setInterval(() => {
      this.checkConsentExpiration();
    }, 86400000); // Daily

    // Privacy metrics collection
    setInterval(() => {
      this.collectPrivacyMetrics();
    }, 300000); // Every 5 minutes
  }

  private async enforceRetentionPolicies(): Promise<void> {
    try {
      const policies = Array.from(this.policies.values());
      
      for (const policy of policies) {
        for (const retention of policy.retentionPolicies) {
          await this.retentionManager.enforcePolicy(retention);
        }
      }

      this.emit('retention_enforced', {
        timestamp: new Date(),
        policiesProcessed: policies.length
      });
    } catch (error) {
      this.emit('error', { 
        type: 'retention_enforcement_failed',
        error 
      });
    }
  }

  private async checkConsentExpiration(): Promise<void> {
    try {
      const expired = await this.consentManager.checkExpiredConsents();
      
      if (expired.length > 0) {
        for (const consent of expired) {
          await this.consentManager.renewalRequired(consent);
        }

        this.emit('consents_expired', {
          count: expired.length,
          consents: expired
        });
      }
    } catch (error) {
      this.emit('error', {
        type: 'consent_expiration_check_failed',
        error
      });
    }
  }

  private async collectPrivacyMetrics(): Promise<void> {
    try {
      const metrics = {
        consentRate: await this.consentManager.getConsentRate(),
        dataRequests: await this.rightsProcessor.getRequestMetrics(),
        retentionCompliance: await this.retentionManager.getComplianceRate(),
        minimizationScore: await this.dataMinimizer.getMinimizationScore()
      };

      await this.cache.set('privacy_metrics', metrics, 300);
      this.emit('metrics_collected', metrics);
    } catch (error) {
      this.emit('error', {
        type: 'metrics_collection_failed',
        error
      });
    }
  }

  private async handleConsentWithdrawal(event: any): Promise<void> {
    try {
      // Stop processing for withdrawn purposes
      await this.stopProcessingForUser(event.userId, event.purposes);

      // Delete or anonymize data based on legal basis
      if (event.requiresDeletion) {
        await this.deleteUserData({
          userId: event.userId,
          categories: event.dataCategories,
          reason: 'consent_withdrawn'
        });
      } else {
        await this.anonymizeUserData({
          userId: event.userId,
          categories: event.dataCategories
        });
      }

      // Update access controls
      this.emit('update_access_controls', {
        userId: event.userId,
        revokedPurposes: event.purposes
      });

    } catch (error) {
      this.emit('error', {
        type: 'consent_withdrawal_processing_failed',
        error,
        event
      });
    }
  }

  private async handleDataExpiration(event: any): Promise<void> {
    try {
      const policy = await this.retentionManager.getPolicy(event.policyId);
      
      switch (policy.deletionMethod) {
        case 'hard_delete':
          await this.permanentlyDeleteData(event.data);
          break;
        case 'anonymize':
          await this.anonymizeData(event.data);
          break;
        case 'archive':
          await this.archiveData(event.data);
          break;
      }

      this.emit('data_retention_processed', {
        method: policy.deletionMethod,
        recordsAffected: event.data.length
      });

    } catch (error) {
      this.emit('error', {
        type: 'data_expiration_processing_failed',
        error,
        event
      });
    }
  }

  private async stopProcessingForUser(userId: string, purposes: string[]): Promise<void> {
    // Implementation to stop data processing for specific purposes
    const { error } = await this.supabase
      .from('user_processing_status')
      .update({ 
        active: false,
        stopped_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('purpose', purposes);

    if (error) throw error;
  }

  private async permanentlyDeleteData(data: any[]): Promise<void> {
    // Implementation for permanent data deletion
    for (const record of data) {
      const { error } = await this.supabase
        .from(record.table)
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      // Log deletion for compliance
      await this.logDataDeletion(record);
    }
  }

  private async anonymizeData(data: any[]): Promise<void> {
    for (const record of data) {
      const anonymized = await this.dataMinimizer.anonymize(record);
      
      const { error } = await this.supabase
        .from(record.table)
        .update(anonymized)
        .eq('id', record.id);

      if (error) throw error;
    }
  }

  private async archiveData(data: any[]): Promise<void> {
    // Move data to archive storage
    const { error } = await this.supabase
      .from('data_archive')
      .insert(data.map(record => ({
        original_table: record.table,
        original_id: record.id,
        data: record,
        archived_at: new Date().toISOString()
      })));

    if (error) throw error;

    // Delete from original location
    for (const record of data) {
      await this.supabase
        .from(record.table)
        .delete()
        .eq('id', record.id);
    }
  }

  private async logDataDeletion(record: any): Promise<void> {
    await this.supabase
      .from('data_deletion_log')
      .insert({
        table_name: record.table,
        record_id: record.id,
        deleted_at: new Date().toISOString(),
        reason: record.reason || 'retention_policy',
        metadata: record.metadata || {}
      });
  }

  // Public API methods

  async getStatus(): Promise<PrivacyStatus> {
    const cached = await this.cache.get('privacy_status');
    if (cached) return cached;

    const status = await this.calculatePrivacyStatus();
    await this.cache.set('privacy_status', status, 60); // Cache for 1 minute
    
    return status;
  }

  private async calculatePrivacyStatus(): Promise<PrivacyStatus> {
    const [
      policyStatuses,
      consentStatus,
      retentionStatus,
      rightsStatus,
      issues
    ] = await Promise.all([
      this.evaluatePolicyCompliance(),
      this.consentManager.getStatus(),
      this.retentionManager.getStatus(),
      this.rightsProcessor.getStatus(),
      this.identifyPrivacyIssues()
    ]);

    const score = this.calculatePrivacyScore({
      policyStatuses,
      consentStatus,
      retentionStatus,
      rightsStatus
    });

    return {
      score,
      policies: policyStatuses,
      consent: consentStatus,
      retention: retentionStatus,
      rights: rightsStatus,
      issues
    };
  }

  private async evaluatePolicyCompliance(): Promise<PolicyStatus[]> {
    const statuses: PolicyStatus[] = [];

    for (const [id, policy] of this.policies) {
      const issues = await this.validatePolicy(policy);
      
      statuses.push({
        policyId: id,
        version: policy.version,
        compliant: issues.length === 0,
        issues
      });
    }

    return statuses;
  }

  private async validatePolicy(policy: PrivacyPolicy): Promise<string[]> {
    const issues: string[] = [];

    // Check data categories
    if (policy.dataCategories.length === 0) {
      issues.push('No data categories defined');
    }

    // Check purposes
    if (policy.purposes.length === 0) {
      issues.push('No processing purposes defined');
    }

    // Check retention policies
    for (const retention of policy.retentionPolicies) {
      if (retention.retentionPeriod > this.config.defaultRetentionDays * 2) {
        issues.push(`Retention period for ${retention.dataCategory} exceeds recommended maximum`);
      }
    }

    // Check consent requirements
    if (this.config.gdprCompliant) {
      const hasExplicitConsent = policy.consentRequirements.some(c => c.explicitConsent);
      if (!hasExplicitConsent) {
        issues.push('GDPR requires explicit consent for personal data processing');
      }
    }

    return issues;
  }

  private calculatePrivacyScore(components: any): number {
    const weights = {
      policy: 0.25,
      consent: 0.30,
      retention: 0.25,
      rights: 0.20
    };

    let score = 0;

    // Policy compliance score
    const compliantPolicies = components.policyStatuses.filter((p: PolicyStatus) => p.compliant).length;
    const policyScore = (compliantPolicies / components.policyStatuses.length) * 100;
    score += policyScore * weights.policy;

    // Consent score
    const consentScore = (components.consentStatus.consentedUsers / components.consentStatus.totalUsers) * 100;
    score += consentScore * weights.consent;

    // Retention compliance score
    const retentionScore = 100 - (components.retentionStatus.deletionBacklog / 
      (components.retentionStatus.dataExpired || 1)) * 100;
    score += Math.max(0, retentionScore) * weights.retention;

    // Rights compliance score
    score += components.rightsStatus.complianceRate * weights.rights;

    return Math.round(score);
  }

  private async identifyPrivacyIssues(): Promise<PrivacyIssue[]> {
    const issues: PrivacyIssue[] = [];

    // Check consent rate
    const consentRate = await this.consentManager.getConsentRate();
    if (consentRate < 0.8) {
      issues.push({
        id: 'low_consent_rate',
        type: 'consent',
        severity: 'medium',
        description: `Consent rate is ${Math.round(consentRate * 100)}%, below recommended 80%`,
        recommendation: 'Review consent request process and make it more user-friendly'
      });
    }

    // Check retention backlog
    const retentionStatus = await this.retentionManager.getStatus();
    if (retentionStatus.deletionBacklog > 1000) {
      issues.push({
        id: 'deletion_backlog',
        type: 'retention',
        severity: 'high',
        description: `${retentionStatus.deletionBacklog} records pending deletion`,
        recommendation: 'Increase deletion processing capacity or review retention policies'
      });
    }

    // Check rights response time
    const rightsMetrics = await this.rightsProcessor.getRequestMetrics();
    if (rightsMetrics.averageResponseTime > 72) { // 72 hours
      issues.push({
        id: 'slow_rights_response',
        type: 'rights',
        severity: 'high',
        description: `Average response time for data requests is ${rightsMetrics.averageResponseTime} hours`,
        recommendation: 'Automate data request processing or increase team capacity'
      });
    }

    return issues;
  }

  async checkDataAccessAllowed(request: any): Promise<boolean> {
    // Check if user has given consent for the purpose
    const hasConsent = await this.consentManager.hasConsent(
      request.userId,
      request.purpose
    );

    if (!hasConsent) {
      // Check if there's another legal basis
      const purpose = await this.getPurpose(request.purpose);
      if (!purpose || purpose.requiresConsent) {
        return false;
      }
    }

    // Check data minimization rules
    const minimizationAllowed = await this.dataMinimizer.checkAccess(
      request.userId,
      request.dataCategories || [],
      request.purpose
    );

    return minimizationAllowed;
  }

  private async getPurpose(purposeId: string): Promise<ProcessingPurpose | null> {
    for (const policy of this.policies.values()) {
      const purpose = policy.purposes.find(p => p.id === purposeId);
      if (purpose) return purpose;
    }
    return null;
  }

  async processConsentWithdrawal(event: ComplianceEvent): Promise<void> {
    const withdrawal = event.data;
    
    // Record withdrawal
    await this.consentManager.withdrawConsent(
      withdrawal.userId,
      withdrawal.purposes || []
    );

    // Process data deletion/anonymization
    await this.handleConsentWithdrawal({
      userId: withdrawal.userId,
      purposes: withdrawal.purposes || [],
      dataCategories: withdrawal.dataCategories || [],
      requiresDeletion: withdrawal.requiresDeletion !== false
    });

    // Update user preferences
    await this.updateUserPrivacyPreferences(withdrawal.userId, {
      consentWithdrawn: true,
      withdrawalDate: new Date(),
      purposes: withdrawal.purposes
    });
  }

  private async updateUserPrivacyPreferences(userId: string, preferences: any): Promise<void> {
    const { error } = await this.supabase
      .from('user_privacy_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async validateDataRequest(event: ComplianceEvent): Promise<{ valid: boolean; reason?: string }> {
    const request = event.data;

    // Verify user identity
    const identityVerified = await this.rightsProcessor.verifyIdentity(request);
    if (!identityVerified) {
      return { valid: false, reason: 'Identity verification failed' };
    }

    // Check request type is supported
    const supportedTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];
    if (!supportedTypes.includes(request.type)) {
      return { valid: false, reason: 'Unsupported request type' };
    }

    // Check if request is within time limits
    const lastRequest = await this.rightsProcessor.getLastRequest(request.userId, request.type);
    if (lastRequest && this.isRequestTooSoon(lastRequest, request.type)) {
      return { valid: false, reason: 'Request submitted too soon after previous request' };
    }

    return { valid: true };
  }

  private isRequestTooSoon(lastRequest: any, type: string): boolean {
    const cooldownPeriods: Record<string, number> = {
      access: 30, // 30 days
      portability: 30,
      erasure: 0, // No cooldown
      rectification: 0,
      restriction: 7,
      objection: 7
    };

    const cooldownDays = cooldownPeriods[type] || 0;
    const daysSinceLastRequest = (Date.now() - lastRequest.timestamp) / (1000 * 60 * 60 * 24);
    
    return daysSinceLastRequest < cooldownDays;
  }

  async processDataRequest(event: ComplianceEvent): Promise<void> {
    const request = event.data;

    // Create request record
    const requestRecord = await this.rightsProcessor.createRequest(request);

    try {
      // Process based on type
      let result;
      switch (request.type) {
        case 'access':
          result = await this.provideDataAccess(request);
          break;
        case 'erasure':
          result = await this.eraseUserData(request);
          break;
        case 'portability':
          result = await this.exportUserData(request);
          break;
        case 'rectification':
          result = await this.rectifyUserData(request);
          break;
        case 'restriction':
          result = await this.restrictProcessing(request);
          break;
        case 'objection':
          result = await this.processObjection(request);
          break;
      }

      // Update request status
      await this.rightsProcessor.completeRequest(requestRecord.id, result);

      // Notify user
      this.emit('data_request_completed', {
        requestId: requestRecord.id,
        type: request.type,
        userId: request.userId,
        result
      });

    } catch (error) {
      await this.rightsProcessor.failRequest(requestRecord.id, error);
      throw error;
    }
  }

  async provideDataAccess(request: any): Promise<any> {
    // Collect all user data
    const userData = await this.collectUserData(request.userId);

    // Apply data minimization
    const minimizedData = await this.dataMinimizer.minimizeForAccess(userData);

    // Format for delivery
    const formatted = await this.formatDataForAccess(minimizedData);

    return {
      data: formatted,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  async eraseUserData(request: any): Promise<any> {
    const dataToErase = await this.identifyErasableData(request.userId);
    const results = {
      erased: [] as string[],
      anonymized: [] as string[],
      retained: [] as any[]
    };

    for (const data of dataToErase) {
      if (data.canErase) {
        await this.permanentlyDeleteData([data]);
        results.erased.push(data.table);
      } else if (data.canAnonymize) {
        await this.anonymizeData([data]);
        results.anonymized.push(data.table);
      } else {
        results.retained.push({
          table: data.table,
          reason: data.retentionReason
        });
      }
    }

    return results;
  }

  async exportUserData(request: any): Promise<any> {
    // Collect portable data
    const portableData = await this.collectPortableData(request.userId);

    // Format in machine-readable format
    const formatted = await this.formatForPortability(portableData);

    return {
      format: 'json',
      data: formatted,
      checksum: await this.generateChecksum(formatted),
      generatedAt: new Date()
    };
  }

  private async rectifyUserData(request: any): Promise<any> {
    const { corrections } = request;
    const results = [];

    for (const correction of corrections) {
      const { error } = await this.supabase
        .from(correction.table)
        .update(correction.updates)
        .eq('user_id', request.userId)
        .eq('id', correction.recordId);

      if (error) throw error;

      results.push({
        table: correction.table,
        recordId: correction.recordId,
        status: 'corrected'
      });
    }

    return { corrections: results };
  }

  private async restrictProcessing(request: any): Promise<any> {
    const { purposes, duration } = request;

    await this.supabase
      .from('processing_restrictions')
      .insert({
        user_id: request.userId,
        restricted_purposes: purposes,
        start_date: new Date().toISOString(),
        end_date: duration ? new Date(Date.now() + duration).toISOString() : null,
        reason: request.reason
      });

    return {
      restrictedPurposes: purposes,
      appliedAt: new Date(),
      duration: duration || 'indefinite'
    };
  }

  private async processObjection(request: any): Promise<any> {
    const { purposes, reason } = request;

    // Evaluate objection
    const evaluation = await this.evaluateObjection(request);

    if (evaluation.accepted) {
      // Stop processing for objected purposes
      await this.stopProcessingForUser(request.userId, purposes);

      return {
        status: 'accepted',
        stoppedPurposes: purposes,
        reason: evaluation.reason
      };
    } else {
      return {
        status: 'rejected',
        reason: evaluation.reason,
        appeal: evaluation.appealProcess
      };
    }
  }

  private async evaluateObjection(request: any): Promise<any> {
    // Check if there's a compelling legitimate interest
    const purposes = await Promise.all(
      request.purposes.map((p: string) => this.getPurpose(p))
    );

    const hasLegitimateInterest = purposes.some(
      p => p?.legalBasis.type === 'legitimate_interests'
    );

    if (!hasLegitimateInterest) {
      return {
        accepted: true,
        reason: 'No legitimate interest overrides user objection'
      };
    }

    // Evaluate balance of interests
    // This is simplified - in production would be more complex
    return {
      accepted: false,
      reason: 'Legitimate business interest requires continued processing',
      appealProcess: 'Contact privacy@company.com to appeal this decision'
    };
  }

  private async collectUserData(userId: string): Promise<any> {
    const tables = await this.getTablesWithUserData();
    const userData: any = {};

    for (const table of tables) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        userData[table] = data;
      }
    }

    return userData;
  }

  private async getTablesWithUserData(): Promise<string[]> {
    // In production, this would be dynamically determined
    return [
      'users',
      'user_profiles',
      'assessments',
      'assessment_results',
      'user_activities',
      'user_preferences'
    ];
  }

  private async identifyErasableData(userId: string): Promise<any[]> {
    const allData = await this.collectUserData(userId);
    const erasableData: any[] = [];

    for (const [table, records] of Object.entries(allData)) {
      for (const record of records as any[]) {
        const canErase = await this.checkErasability(table, record);
        const canAnonymize = !canErase && await this.checkAnonymizability(table, record);

        erasableData.push({
          table,
          id: record.id,
          canErase,
          canAnonymize,
          retentionReason: !canErase && !canAnonymize ? 
            await this.getRetentionReason(table, record) : null
        });
      }
    }

    return erasableData;
  }

  private async checkErasability(table: string, record: any): Promise<boolean> {
    // Check legal obligations
    const hasLegalObligation = await this.hasLegalRetentionObligation(table, record);
    if (hasLegalObligation) return false;

    // Check ongoing contracts
    const hasActiveContract = await this.hasActiveContract(record.user_id);
    if (hasActiveContract) return false;

    return true;
  }

  private async checkAnonymizability(table: string, record: any): Promise<boolean> {
    // Some data can be anonymized instead of deleted
    const anonymizableTables = ['assessments', 'assessment_results', 'user_activities'];
    return anonymizableTables.includes(table);
  }

  private async hasLegalRetentionObligation(table: string, record: any): Promise<boolean> {
    // Check if data must be retained for legal reasons
    // This is simplified - in production would check specific regulations
    const financialTables = ['transactions', 'invoices', 'payments'];
    return financialTables.includes(table);
  }

  private async hasActiveContract(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !!data;
  }

  private async getRetentionReason(table: string, record: any): Promise<string> {
    if (await this.hasLegalRetentionObligation(table, record)) {
      return 'Legal retention obligation';
    }
    if (await this.hasActiveContract(record.user_id)) {
      return 'Active contract requires data retention';
    }
    return 'Business necessity';
  }

  private async collectPortableData(userId: string): Promise<any> {
    // Collect only data that's portable under GDPR
    const portableTables = [
      'users',
      'user_profiles',
      'assessments',
      'assessment_results',
      'user_preferences'
    ];

    const portableData: any = {};

    for (const table of portableTables) {
      const { data } = await this.supabase
        .from(table)
        .select('*')
        .eq('user_id', userId);

      if (data) {
        portableData[table] = data;
      }
    }

    return portableData;
  }

  private async formatDataForAccess(data: any): Promise<any> {
    // Format data in human-readable format
    const formatted: any = {
      generatedAt: new Date().toISOString(),
      userData: {}
    };

    for (const [table, records] of Object.entries(data)) {
      formatted.userData[this.humanizeTableName(table)] = records;
    }

    return formatted;
  }

  private async formatForPortability(data: any): Promise<any> {
    // Format in machine-readable format (JSON)
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      format: 'json',
      data
    };
  }

  private humanizeTableName(table: string): string {
    return table
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private async generateChecksum(data: any): Promise<string> {
    // In production, would use proper crypto
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async deleteData(step: any): Promise<void> {
    const { table, conditions } = step;

    const query = this.supabase.from(table).delete();

    // Apply conditions
    for (const [field, value] of Object.entries(conditions)) {
      query.eq(field, value);
    }

    const { error } = await query;
    if (error) throw error;

    // Log deletion
    await this.logDataDeletion({
      table,
      conditions,
      reason: 'compliance_remediation',
      timestamp: new Date()
    });
  }

  async getDataRequestCount(period: any): Promise<number> {
    const { count, error } = await this.supabase
      .from('data_subject_requests')
      .select('id', { count: 'exact' })
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    if (error) throw error;
    return count || 0;
  }

  async getFindings(period: any): Promise<any[]> {
    const findings: any[] = [];
    const status = await this.getStatus();

    // Add findings based on status
    if (status.score < 80) {
      findings.push({
        id: 'low_privacy_score',
        type: 'compliance',
        severity: 'medium',
        description: `Privacy score is ${status.score}%, below target of 80%`,
        evidence: ['privacy_metrics'],
        recommendation: 'Review and address privacy issues identified'
      });
    }

    // Check consent issues
    if (status.consent.consentedUsers < status.consent.totalUsers * 0.8) {
      findings.push({
        id: 'low_consent_rate',
        type: 'compliance',
        severity: 'high',
        description: 'Consent rate below 80% threshold',
        evidence: ['consent_metrics'],
        recommendation: 'Improve consent collection process'
      });
    }

    return findings;
  }

  async getMetrics(period: any): Promise<any[]> {
    const status = await this.getStatus();

    return [
      {
        name: 'Privacy Score',
        value: status.score,
        unit: '%',
        target: 80
      },
      {
        name: 'Consent Rate',
        value: Math.round((status.consent.consentedUsers / status.consent.totalUsers) * 100),
        unit: '%',
        target: 90
      },
      {
        name: 'Pending Data Requests',
        value: status.rights.pendingRequests,
        unit: 'count',
        target: 0
      },
      {
        name: 'Average Response Time',
        value: status.rights.averageResponseTime,
        unit: 'hours',
        target: 24
      }
    ];
  }

  async generateReport(period: any): Promise<any> {
    const status = await this.getStatus();
    const metrics = await this.getMetrics(period);
    const findings = await this.getFindings(period);

    return {
      summary: {
        score: status.score,
        totalUsers: status.consent.totalUsers,
        consentedUsers: status.consent.consentedUsers,
        dataRequests: status.rights.processedToday,
        issues: status.issues.length
      },
      details: {
        consentManagement: await this.consentManager.generateReport(period),
        dataRetention: await this.retentionManager.generateReport(period),
        dataMinimization: await this.dataMinimizer.generateReport(period),
        dataSubjectRights: await this.rightsProcessor.generateReport(period)
      },
      metrics,
      findings,
      recommendations: status.issues.map(issue => issue.recommendation)
    };
  }

  async shutdown(): Promise<void> {
    // Stop background processes
    // Clear intervals, close connections, etc.
    
    await Promise.all([
      this.consentManager.shutdown(),
      this.retentionManager.shutdown(),
      this.dataMinimizer.shutdown(),
      this.rightsProcessor.shutdown()
    ]);

    this.emit('shutdown');
  }
}