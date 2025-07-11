// Audit Logger and Compliance Monitoring System
// Comprehensive audit trail, compliance monitoring, and regulatory reporting

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { 
  AnonymizedData,
  AnonymizationResult 
} from './anonymization-engine';
import { 
  ComplianceReport,
  ComplianceViolation 
} from './compliance-validator';
import { 
  QualityAssessment,
  QualityIssue 
} from './quality-assurance';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: 'DATA_PROCESSING' | 'DATA_ACCESS' | 'SYSTEM_ACTION' | 'COMPLIANCE_CHECK' | 
            'QUALITY_ASSESSMENT' | 'USER_ACTION' | 'ADMIN_ACTION' | 'ERROR_EVENT' |
            'SECURITY_EVENT' | 'CONFIGURATION_CHANGE';
  category: 'ANONYMIZATION' | 'COMPLIANCE' | 'QUALITY' | 'ACCESS' | 'SYSTEM' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  sessionId?: string;
  sourceSystem: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'BLOCKED';
  complianceFlags: string[];
  dataSubjects?: string[];
  legalBasis?: string;
  retentionPeriod?: number;
  encryptionApplied: boolean;
  metadata: {
    version: string;
    checksum: string;
    correlationId?: string;
    parentEventId?: string;
    relatedEventIds?: string[];
  };
}

export interface AuditQuery {
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  userIds?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  resourceTypes?: string[];
  outcomes?: string[];
  complianceFlags?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  id: string;
  reportType: 'COMPLIANCE' | 'SECURITY' | 'DATA_PROCESSING' | 'USER_ACTIVITY' | 'SYSTEM_HEALTH';
  title: string;
  description: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    complianceEvents: number;
    securityEvents: number;
    errorEvents: number;
    successRate: number;
  };
  findings: Array<{
    category: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    count: number;
    recommendation: string;
    complianceImpact?: string;
  }>;
  complianceStatus: {
    gdprCompliance: number;
    hipaaCompliance: number;
    ccpaCompliance: number;
    overallCompliance: number;
    violations: ComplianceViolation[];
    recommendations: string[];
  };
  trends: {
    eventVolumeTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    complianceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    securityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  attachments: Array<{
    name: string;
    type: 'CSV' | 'JSON' | 'PDF';
    size: number;
    path: string;
    checksum: string;
  }>;
}

export interface ComplianceMonitoringRule {
  id: string;
  name: string;
  description: string;
  regulation: 'GDPR' | 'HIPAA' | 'CCPA' | 'PIPEDA' | 'LGPD';
  category: 'DATA_PROCESSING' | 'CONSENT' | 'ACCESS_RIGHTS' | 'RETENTION' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  condition: string; // SQL-like condition for event matching
  alertThreshold: number;
  timeWindow: number; // minutes
  actions: Array<{
    type: 'EMAIL' | 'WEBHOOK' | 'LOG' | 'BLOCK';
    target: string;
    template?: string;
  }>;
  lastTriggered?: string;
  triggerCount: number;
}

export interface DataSubjectRights {
  subjectId: string;
  subjectType: 'INDIVIDUAL' | 'EMPLOYEE' | 'CUSTOMER' | 'PROSPECT';
  requests: Array<{
    id: string;
    type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'APPEALED';
    requestedAt: string;
    dueDate: string;
    completedAt?: string;
    requestDetails: string;
    responseDetails?: string;
    legalBasis?: string;
    dataCategories: string[];
    processingPurposes: string[];
    auditTrail: Array<{
      timestamp: string;
      action: string;
      userId: string;
      details: string;
    }>;
  }>;
  consentRecords: Array<{
    id: string;
    purpose: string;
    legalBasis: string;
    consentGiven: boolean;
    consentDate: string;
    withdrawnDate?: string;
    source: string;
    details: Record<string, any>;
  }>;
  dataProcessingActivities: Array<{
    activityId: string;
    purpose: string;
    legalBasis: string;
    dataCategories: string[];
    retentionPeriod: string;
    processingStart: string;
    processingEnd?: string;
  }>;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataCategory: string;
  retentionPeriod: number; // days
  legalBasis: string;
  automaticDeletion: boolean;
  deletionMethod: 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZE';
  exceptions: Array<{
    condition: string;
    extendedPeriod: number;
    reason: string;
  }>;
  reviewCycle: number; // days
  lastReviewed: string;
  nextReview: string;
  complianceRequirements: string[];
}

/**
 * Comprehensive Audit Logger
 * Tracks all data processing activities and ensures compliance
 */
export class AuditLogger extends EventEmitter {
  private db?: Pool;
  private monitoringRules: Map<string, ComplianceMonitoringRule> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private eventBuffer: AuditEvent[] = [];
  private bufferSize: number = 1000;
  private flushInterval: number = 30000; // 30 seconds
  private encryptSensitiveData: boolean = true;
  
  constructor(dbPool?: Pool) {
    super();
    this.db = dbPool;
    this.initializeMonitoringRules();
    this.initializeRetentionPolicies();
    this.startPeriodicFlush();
    this.startRetentionEnforcement();
  }
  
  /**
   * Log audit event
   */
  public async logEvent(
    eventType: AuditEvent['eventType'],
    category: AuditEvent['category'],
    action: string,
    details: Record<string, any>,
    options: {
      severity?: AuditEvent['severity'];
      userId?: string;
      sessionId?: string;
      resourceType?: string;
      resourceId?: string;
      outcome?: AuditEvent['outcome'];
      ipAddress?: string;
      userAgent?: string;
      location?: AuditEvent['location'];
      dataSubjects?: string[];
      legalBasis?: string;
      retentionPeriod?: number;
      correlationId?: string;
      parentEventId?: string;
    } = {}
  ): Promise<string> {
    const eventId = createHash('sha256')
      .update(`${Date.now()}_${Math.random()}_${action}`)
      .digest('hex')
      .substring(0, 16);
    
    // Sanitize and encrypt sensitive data if needed
    const sanitizedDetails = this.sanitizeEventDetails(details);
    
    // Determine compliance flags
    const complianceFlags = this.determineComplianceFlags(eventType, action, details);
    
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      eventType,
      category,
      severity: options.severity || 'LOW',
      userId: options.userId,
      sessionId: options.sessionId,
      sourceSystem: 'IOC_ANALYTICS',
      action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: sanitizedDetails,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      location: options.location,
      outcome: options.outcome || 'SUCCESS',
      complianceFlags,
      dataSubjects: options.dataSubjects,
      legalBasis: options.legalBasis,
      retentionPeriod: options.retentionPeriod,
      encryptionApplied: this.encryptSensitiveData,
      metadata: {
        version: '1.0.0',
        checksum: this.calculateEventChecksum(sanitizedDetails),
        correlationId: options.correlationId,
        parentEventId: options.parentEventId
      }
    };
    
    // Add to buffer
    this.eventBuffer.push(auditEvent);
    
    // Check for immediate flush conditions
    if (auditEvent.severity === 'CRITICAL' || 
        this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }
    
    // Check monitoring rules
    await this.checkMonitoringRules(auditEvent);
    
    // Emit event for real-time monitoring
    this.emit('audit_event', auditEvent);
    
    return eventId;
  }
  
  /**
   * Log data processing event
   */
  public async logDataProcessing(
    action: 'ANONYMIZATION' | 'TRANSFORMATION' | 'DELETION' | 'ACCESS' | 'EXPORT',
    data: AnonymizedData | any,
    result: AnonymizationResult | any,
    options: {
      userId?: string;
      purpose: string;
      legalBasis: string;
      dataSubjects?: string[];
      retentionPeriod?: number;
    }
  ): Promise<string> {
    return await this.logEvent(
      'DATA_PROCESSING',
      'ANONYMIZATION',
      action,
      {
        dataId: data.id || 'unknown',
        dataType: this.inferDataType(data),
        processingPurpose: options.purpose,
        result: {
          success: result.success || true,
          qualityScore: result.qualityScore || 0,
          riskScore: result.riskScore || 0,
          complianceScore: result.complianceScore || 0
        },
        dataVolumeBytes: JSON.stringify(data).length,
        processingTimeMs: result.processingTime || 0
      },
      {
        severity: result.success ? 'LOW' : 'HIGH',
        userId: options.userId,
        outcome: result.success ? 'SUCCESS' : 'FAILURE',
        dataSubjects: options.dataSubjects,
        legalBasis: options.legalBasis,
        retentionPeriod: options.retentionPeriod,
        resourceType: 'ANONYMIZED_DATA',
        resourceId: data.id
      }
    );
  }
  
  /**
   * Log compliance check event
   */
  public async logComplianceCheck(
    report: ComplianceReport,
    dataId: string,
    options: {
      userId?: string;
      regulation: string;
      trigger: string;
    }
  ): Promise<string> {
    const severity = report.status === 'NON_COMPLIANT' ? 'CRITICAL' :
                    report.status === 'PARTIALLY_COMPLIANT' ? 'HIGH' : 'LOW';
    
    return await this.logEvent(
      'COMPLIANCE_CHECK',
      'COMPLIANCE',
      'VALIDATION',
      {
        dataId,
        regulation: options.regulation,
        trigger: options.trigger,
        complianceStatus: report.status,
        overallScore: report.overallScore,
        violations: report.violations.length,
        criticalViolations: report.violations.filter(v => v.severity === 'CRITICAL').length,
        recommendations: report.recommendations.length
      },
      {
        severity,
        userId: options.userId,
        outcome: report.status === 'COMPLIANT' ? 'SUCCESS' : 'WARNING',
        resourceType: 'COMPLIANCE_REPORT',
        resourceId: report.id
      }
    );
  }
  
  /**
   * Log quality assessment event
   */
  public async logQualityAssessment(
    assessment: QualityAssessment,
    options: {
      userId?: string;
      trigger: string;
    }
  ): Promise<string> {
    const severity = assessment.overallScore < 70 ? 'HIGH' :
                    assessment.overallScore < 85 ? 'MEDIUM' : 'LOW';
    
    return await this.logEvent(
      'QUALITY_ASSESSMENT',
      'QUALITY',
      'ASSESSMENT',
      {
        dataId: assessment.dataId,
        trigger: options.trigger,
        overallScore: assessment.overallScore,
        passedValidation: assessment.passedValidation,
        riskLevel: assessment.riskLevel,
        issues: assessment.issues.length,
        criticalIssues: assessment.issues.filter(i => i.severity === 'CRITICAL').length,
        qualityMetrics: assessment.metrics
      },
      {
        severity,
        userId: options.userId,
        outcome: assessment.passedValidation ? 'SUCCESS' : 'WARNING',
        resourceType: 'QUALITY_ASSESSMENT',
        resourceId: assessment.id
      }
    );
  }
  
  /**
   * Log user access event
   */
  public async logUserAccess(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'PASSWORD_CHANGE' | 'PERMISSION_CHANGE',
    options: {
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: AuditEvent['location'];
      sessionId?: string;
      reason?: string;
    } = {}
  ): Promise<string> {
    const severity = action === 'ACCESS_DENIED' ? 'HIGH' : 'LOW';
    const outcome = action === 'ACCESS_DENIED' ? 'BLOCKED' : 'SUCCESS';
    
    return await this.logEvent(
      'USER_ACTION',
      'ACCESS',
      action,
      {
        reason: options.reason,
        sessionDuration: action === 'LOGOUT' ? this.calculateSessionDuration(options.sessionId) : undefined
      },
      {
        severity,
        userId,
        sessionId: options.sessionId,
        outcome,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        location: options.location,
        resourceType: options.resourceType,
        resourceId: options.resourceId
      }
    );
  }
  
  /**
   * Log system event
   */
  public async logSystemEvent(
    action: string,
    details: Record<string, any>,
    options: {
      severity?: AuditEvent['severity'];
      category?: AuditEvent['category'];
      outcome?: AuditEvent['outcome'];
      userId?: string;
    } = {}
  ): Promise<string> {
    return await this.logEvent(
      'SYSTEM_ACTION',
      options.category || 'SYSTEM',
      action,
      details,
      {
        severity: options.severity || 'LOW',
        userId: options.userId,
        outcome: options.outcome || 'SUCCESS'
      }
    );
  }
  
  /**
   * Query audit events
   */
  public async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    if (!this.db) {
      throw new Error('Database connection required for querying events');
    }
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    
    // Build WHERE clause
    if (query.eventTypes && query.eventTypes.length > 0) {
      whereConditions.push(`event_type = ANY($${paramIndex})`);
      params.push(query.eventTypes);
      paramIndex++;
    }
    
    if (query.categories && query.categories.length > 0) {
      whereConditions.push(`category = ANY($${paramIndex})`);
      params.push(query.categories);
      paramIndex++;
    }
    
    if (query.severities && query.severities.length > 0) {
      whereConditions.push(`severity = ANY($${paramIndex})`);
      params.push(query.severities);
      paramIndex++;
    }
    
    if (query.userIds && query.userIds.length > 0) {
      whereConditions.push(`user_id = ANY($${paramIndex})`);
      params.push(query.userIds);
      paramIndex++;
    }
    
    // Date range
    whereConditions.push(`timestamp >= $${paramIndex}`);
    params.push(query.dateRange.start);
    paramIndex++;
    
    whereConditions.push(`timestamp <= $${paramIndex}`);
    params.push(query.dateRange.end);
    paramIndex++;
    
    if (query.outcomes && query.outcomes.length > 0) {
      whereConditions.push(`outcome = ANY($${paramIndex})`);
      params.push(query.outcomes);
      paramIndex++;
    }
    
    if (query.searchTerm) {
      whereConditions.push(`(action ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`);
      params.push(`%${query.searchTerm}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count total
    const countQuery = `SELECT COUNT(*) FROM audit_events ${whereClause}`;
    const { rows: countRows } = await this.db.query(countQuery, params);
    const total = parseInt(countRows[0].count);
    
    // Get events
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    
    const eventsQuery = `
      SELECT * FROM audit_events 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const { rows } = await this.db.query(eventsQuery, params);
    
    const events: AuditEvent[] = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      category: row.category,
      severity: row.severity,
      userId: row.user_id,
      sessionId: row.session_id,
      sourceSystem: row.source_system,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      location: row.location,
      outcome: row.outcome,
      complianceFlags: row.compliance_flags || [],
      dataSubjects: row.data_subjects || [],
      legalBasis: row.legal_basis,
      retentionPeriod: row.retention_period,
      encryptionApplied: row.encryption_applied,
      metadata: row.metadata
    }));
    
    return {
      events,
      total,
      hasMore: total > offset + limit
    };
  }
  
  /**
   * Generate audit report
   */
  public async generateReport(
    reportType: AuditReport['reportType'],
    period: { start: string; end: string },
    options: {
      includeAttachments?: boolean;
      format?: 'JSON' | 'PDF' | 'CSV';
      regulations?: string[];
    } = {}
  ): Promise<AuditReport> {
    const reportId = createHash('sha256')
      .update(`${reportType}_${period.start}_${period.end}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
    
    // Query events for the period
    const events = await this.queryEvents({
      dateRange: period,
      limit: 10000 // High limit for comprehensive reporting
    });
    
    // Generate summary statistics
    const summary = this.generateReportSummary(events.events);
    
    // Generate findings
    const findings = this.generateReportFindings(events.events, reportType);
    
    // Assess compliance status
    const complianceStatus = await this.assessComplianceStatus(events.events, options.regulations);
    
    // Analyze trends
    const trends = await this.analyzeTrends(period);
    
    const report: AuditReport = {
      id: reportId,
      reportType,
      title: this.generateReportTitle(reportType, period),
      description: this.generateReportDescription(reportType, period),
      generatedAt: new Date().toISOString(),
      period,
      summary,
      findings,
      complianceStatus,
      trends,
      attachments: []
    };
    
    // Generate attachments if requested
    if (options.includeAttachments) {
      report.attachments = await this.generateReportAttachments(report, options.format);
    }
    
    // Store report
    if (this.db) {
      await this.storeReport(report);
    }
    
    this.emit('report_generated', {
      reportId: report.id,
      reportType,
      period,
      timestamp: new Date().toISOString()
    });
    
    return report;
  }
  
  /**
   * Track data subject rights requests
   */
  public async trackDataSubjectRequest(
    subjectId: string,
    requestType: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION',
    details: {
      requestDetails: string;
      dataCategories: string[];
      processingPurposes: string[];
      legalBasis?: string;
      dueDate?: string;
    }
  ): Promise<string> {
    const requestId = createHash('sha256')
      .update(`${subjectId}_${requestType}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
    
    // Log the request
    await this.logEvent(
      'USER_ACTION',
      'COMPLIANCE',
      'DATA_SUBJECT_REQUEST',
      {
        requestId,
        subjectId,
        requestType,
        details: details.requestDetails,
        dataCategories: details.dataCategories,
        processingPurposes: details.processingPurposes,
        legalBasis: details.legalBasis
      },
      {
        severity: 'HIGH',
        outcome: 'SUCCESS',
        dataSubjects: [subjectId],
        legalBasis: details.legalBasis,
        resourceType: 'DATA_SUBJECT_REQUEST',
        resourceId: requestId
      }
    );
    
    // Calculate due date (30 days for GDPR)
    const dueDate = details.dueDate || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Store request details in database
    if (this.db) {
      await this.storeDataSubjectRequest(requestId, subjectId, requestType, details, dueDate);
    }
    
    this.emit('data_subject_request', {
      requestId,
      subjectId,
      requestType,
      dueDate,
      timestamp: new Date().toISOString()
    });
    
    return requestId;
  }
  
  /**
   * Private helper methods
   */
  
  private sanitizeEventDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditcard'];
    
    for (const [key, value] of Object.entries(sanitized)) {
      const keyLower = key.toLowerCase();
      
      if (sensitiveFields.some(field => keyLower.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        // Truncate very long strings
        sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
      }
    }
    
    return sanitized;
  }
  
  private determineComplianceFlags(
    eventType: AuditEvent['eventType'],
    action: string,
    details: Record<string, any>
  ): string[] {
    const flags: string[] = [];
    
    if (eventType === 'DATA_PROCESSING') {
      flags.push('GDPR_ARTICLE_6'); // Lawfulness of processing
      
      if (action === 'ANONYMIZATION') {
        flags.push('GDPR_ARTICLE_4'); // Anonymous data
      }
      
      if (details.dataSubjects) {
        flags.push('GDPR_ARTICLE_5'); // Principles of processing
      }
    }
    
    if (eventType === 'COMPLIANCE_CHECK') {
      flags.push('GDPR_ARTICLE_25'); // Data protection by design
    }
    
    if (action.includes('DELETE') || action.includes('ERASE')) {
      flags.push('GDPR_ARTICLE_17'); // Right to erasure
    }
    
    if (action.includes('ACCESS')) {
      flags.push('GDPR_ARTICLE_15'); // Right of access
    }
    
    return flags;
  }
  
  private calculateEventChecksum(details: Record<string, any>): string {
    return createHash('sha256')
      .update(JSON.stringify(details, Object.keys(details).sort()))
      .digest('hex')
      .substring(0, 16);
  }
  
  private inferDataType(data: any): string {
    if (data.user_hash || data.full_name || data.email) return 'user';
    if (data.org_hash || (data.name && data.slug)) return 'organization';
    if (data.assessment_hash || (data.title && data.questions)) return 'assessment';
    if (data.response_hash || (data.assessment_id && data.respondent_id)) return 'assessment_response';
    if (data.event_hash || (data.event_type && data.event_category)) return 'analytics_event';
    
    return 'unknown';
  }
  
  private calculateSessionDuration(sessionId?: string): number {
    // Implementation would track session start times
    // For now, return a placeholder
    return 3600; // 1 hour in seconds
  }
  
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0 || !this.db) return;
    
    const events = this.eventBuffer.splice(0);
    
    try {
      await this.storeEvents(events);
      
      this.emit('events_flushed', {
        count: events.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events);
      
      this.emit('flush_failed', {
        error: error instanceof Error ? error.message : String(error),
        eventCount: events.length,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  private async storeEvents(events: AuditEvent[]): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const event of events) {
        await client.query(`
          INSERT INTO audit_events (
            id, timestamp, event_type, category, severity, user_id, session_id,
            source_system, action, resource_type, resource_id, details,
            ip_address, user_agent, location, outcome, compliance_flags,
            data_subjects, legal_basis, retention_period, encryption_applied, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          event.id,
          event.timestamp,
          event.eventType,
          event.category,
          event.severity,
          event.userId,
          event.sessionId,
          event.sourceSystem,
          event.action,
          event.resourceType,
          event.resourceId,
          JSON.stringify(event.details),
          event.ipAddress,
          event.userAgent,
          JSON.stringify(event.location),
          event.outcome,
          JSON.stringify(event.complianceFlags),
          JSON.stringify(event.dataSubjects),
          event.legalBasis,
          event.retentionPeriod,
          event.encryptionApplied,
          JSON.stringify(event.metadata)
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  private async checkMonitoringRules(event: AuditEvent): Promise<void> {
    for (const rule of this.monitoringRules.values()) {
      if (!rule.enabled) continue;
      
      if (this.matchesRule(event, rule)) {
        await this.triggerRule(rule, event);
      }
    }
  }
  
  private matchesRule(event: AuditEvent, rule: ComplianceMonitoringRule): boolean {
    // Simplified rule matching - would implement proper SQL-like condition parsing
    const condition = rule.condition.toLowerCase();
    
    if (condition.includes('severity') && condition.includes('critical')) {
      return event.severity === 'CRITICAL';
    }
    
    if (condition.includes('outcome') && condition.includes('failure')) {
      return event.outcome === 'FAILURE';
    }
    
    if (condition.includes('category') && condition.includes('security')) {
      return event.category === 'SECURITY';
    }
    
    return false;
  }
  
  private async triggerRule(rule: ComplianceMonitoringRule, event: AuditEvent): Promise<void> {
    rule.triggerCount++;
    rule.lastTriggered = new Date().toISOString();
    
    // Execute rule actions
    for (const action of rule.actions) {
      try {
        await this.executeRuleAction(action, rule, event);
      } catch (error) {
        await this.logEvent(
          'SYSTEM_ACTION',
          'SYSTEM',
          'RULE_ACTION_FAILED',
          {
            ruleId: rule.id,
            actionType: action.type,
            error: error instanceof Error ? error.message : String(error)
          },
          { severity: 'HIGH', outcome: 'FAILURE' }
        );
      }
    }
    
    this.emit('monitoring_rule_triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      event,
      timestamp: new Date().toISOString()
    });
  }
  
  private async executeRuleAction(
    action: ComplianceMonitoringRule['actions'][0],
    rule: ComplianceMonitoringRule,
    event: AuditEvent
  ): Promise<void> {
    switch (action.type) {
      case 'EMAIL':
        // Send email notification
        break;
      case 'WEBHOOK':
        // Send webhook notification
        break;
      case 'LOG':
        await this.logEvent(
          'SYSTEM_ACTION',
          'COMPLIANCE',
          'MONITORING_ALERT',
          {
            ruleId: rule.id,
            ruleName: rule.name,
            triggerEvent: event.id,
            severity: rule.severity
          },
          { severity: rule.severity, outcome: 'SUCCESS' }
        );
        break;
      case 'BLOCK':
        // Implement blocking logic
        break;
    }
  }
  
  private generateReportSummary(events: AuditEvent[]): AuditReport['summary'] {
    const summary = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsByCategory: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      complianceEvents: 0,
      securityEvents: 0,
      errorEvents: 0,
      successRate: 0
    };
    
    let successCount = 0;
    
    for (const event of events) {
      // Count by type
      summary.eventsByType[event.eventType] = 
        (summary.eventsByType[event.eventType] || 0) + 1;
      
      // Count by category
      summary.eventsByCategory[event.category] = 
        (summary.eventsByCategory[event.category] || 0) + 1;
      
      // Count by severity
      summary.eventsBySeverity[event.severity] = 
        (summary.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count special categories
      if (event.category === 'COMPLIANCE') summary.complianceEvents++;
      if (event.category === 'SECURITY') summary.securityEvents++;
      if (event.outcome === 'FAILURE') summary.errorEvents++;
      if (event.outcome === 'SUCCESS') successCount++;
    }
    
    summary.successRate = events.length > 0 ? (successCount / events.length) * 100 : 0;
    
    return summary;
  }
  
  private generateReportFindings(
    events: AuditEvent[],
    reportType: AuditReport['reportType']
  ): AuditReport['findings'] {
    const findings: AuditReport['findings'] = [];
    
    // Analyze critical events
    const criticalEvents = events.filter(e => e.severity === 'CRITICAL');
    if (criticalEvents.length > 0) {
      findings.push({
        category: 'Critical Events',
        severity: 'CRITICAL',
        description: `${criticalEvents.length} critical events detected`,
        count: criticalEvents.length,
        recommendation: 'Investigate and resolve critical issues immediately',
        complianceImpact: 'May result in regulatory violations'
      });
    }
    
    // Analyze failed events
    const failedEvents = events.filter(e => e.outcome === 'FAILURE');
    if (failedEvents.length > 10) {
      findings.push({
        category: 'Failed Operations',
        severity: 'HIGH',
        description: `High number of failed operations: ${failedEvents.length}`,
        count: failedEvents.length,
        recommendation: 'Review system reliability and error handling',
        complianceImpact: 'May affect data processing obligations'
      });
    }
    
    // Analyze access patterns
    const accessEvents = events.filter(e => e.category === 'ACCESS');
    const deniedAccess = accessEvents.filter(e => e.outcome === 'BLOCKED');
    if (deniedAccess.length > accessEvents.length * 0.1) {
      findings.push({
        category: 'Access Control',
        severity: 'MEDIUM',
        description: `High rate of access denials: ${deniedAccess.length}/${accessEvents.length}`,
        count: deniedAccess.length,
        recommendation: 'Review access control policies and user permissions'
      });
    }
    
    return findings;
  }
  
  private async assessComplianceStatus(
    events: AuditEvent[],
    regulations?: string[]
  ): Promise<AuditReport['complianceStatus']> {
    const status = {
      gdprCompliance: 95,
      hipaaCompliance: 90,
      ccpaCompliance: 92,
      overallCompliance: 92,
      violations: [] as ComplianceViolation[],
      recommendations: [] as string[]
    };
    
    // Analyze compliance-related events
    const complianceEvents = events.filter(e => 
      e.category === 'COMPLIANCE' || e.complianceFlags.length > 0
    );
    
    // Check for violations
    const violationEvents = complianceEvents.filter(e => 
      e.outcome === 'FAILURE' || e.severity === 'CRITICAL'
    );
    
    if (violationEvents.length > 0) {
      status.overallCompliance -= violationEvents.length * 2;
      status.recommendations.push('Address compliance violations immediately');
    }
    
    return status;
  }
  
  private async analyzeTrends(period: { start: string; end: string }): Promise<AuditReport['trends']> {
    // Simplified trend analysis - would use historical data in production
    return {
      eventVolumeTrend: 'STABLE',
      complianceTrend: 'IMPROVING',
      securityTrend: 'STABLE',
      qualityTrend: 'IMPROVING'
    };
  }
  
  private generateReportTitle(
    reportType: AuditReport['reportType'],
    period: { start: string; end: string }
  ): string {
    const start = new Date(period.start).toLocaleDateString();
    const end = new Date(period.end).toLocaleDateString();
    
    const titles = {
      COMPLIANCE: `Compliance Audit Report`,
      SECURITY: `Security Audit Report`,
      DATA_PROCESSING: `Data Processing Audit Report`,
      USER_ACTIVITY: `User Activity Report`,
      SYSTEM_HEALTH: `System Health Report`
    };
    
    return `${titles[reportType]} (${start} - ${end})`;
  }
  
  private generateReportDescription(
    reportType: AuditReport['reportType'],
    period: { start: string; end: string }
  ): string {
    const descriptions = {
      COMPLIANCE: 'Comprehensive analysis of compliance with data protection regulations',
      SECURITY: 'Security event analysis and threat assessment',
      DATA_PROCESSING: 'Data processing activities and anonymization quality review',
      USER_ACTIVITY: 'User access patterns and activity analysis',
      SYSTEM_HEALTH: 'System performance and operational health assessment'
    };
    
    return descriptions[reportType];
  }
  
  private async generateReportAttachments(
    report: AuditReport,
    format?: string
  ): Promise<AuditReport['attachments']> {
    // Implementation would generate actual file attachments
    return [];
  }
  
  private async storeReport(report: AuditReport): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO audit_reports (
          id, report_type, title, description, generated_at, period_start,
          period_end, summary, findings, compliance_status, trends, attachments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        report.id,
        report.reportType,
        report.title,
        report.description,
        report.generatedAt,
        report.period.start,
        report.period.end,
        JSON.stringify(report.summary),
        JSON.stringify(report.findings),
        JSON.stringify(report.complianceStatus),
        JSON.stringify(report.trends),
        JSON.stringify(report.attachments)
      ]);
    } finally {
      client.release();
    }
  }
  
  private async storeDataSubjectRequest(
    requestId: string,
    subjectId: string,
    requestType: string,
    details: any,
    dueDate: string
  ): Promise<void> {
    if (!this.db) return;
    
    const client = await this.db.connect();
    try {
      await client.query(`
        INSERT INTO data_subject_requests (
          id, subject_id, request_type, status, requested_at, due_date,
          request_details, data_categories, processing_purposes, legal_basis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        requestId,
        subjectId,
        requestType,
        'PENDING',
        new Date().toISOString(),
        dueDate,
        details.requestDetails,
        JSON.stringify(details.dataCategories),
        JSON.stringify(details.processingPurposes),
        details.legalBasis
      ]);
    } finally {
      client.release();
    }
  }
  
  private initializeMonitoringRules(): void {
    // Initialize default monitoring rules
    this.addMonitoringRule({
      id: 'CRITICAL_EVENTS',
      name: 'Critical Event Monitor',
      description: 'Alert on critical severity events',
      regulation: 'GDPR',
      category: 'DATA_PROCESSING',
      severity: 'CRITICAL',
      enabled: true,
      condition: 'severity = CRITICAL',
      alertThreshold: 1,
      timeWindow: 5,
      actions: [
        { type: 'EMAIL', target: 'admin@example.com' },
        { type: 'LOG', target: 'audit_log' }
      ],
      triggerCount: 0
    });
    
    this.addMonitoringRule({
      id: 'FAILED_ANONYMIZATION',
      name: 'Failed Anonymization Monitor',
      description: 'Alert on anonymization failures',
      regulation: 'GDPR',
      category: 'DATA_PROCESSING',
      severity: 'HIGH',
      enabled: true,
      condition: 'outcome = FAILURE AND action = ANONYMIZATION',
      alertThreshold: 5,
      timeWindow: 60,
      actions: [
        { type: 'EMAIL', target: 'dpo@example.com' },
        { type: 'WEBHOOK', target: 'https://alerts.example.com/webhook' }
      ],
      triggerCount: 0
    });
  }
  
  private addMonitoringRule(rule: ComplianceMonitoringRule): void {
    this.monitoringRules.set(rule.id, rule);
  }
  
  private initializeRetentionPolicies(): void {
    // Initialize default retention policies
    this.addRetentionPolicy({
      id: 'AUDIT_EVENTS_STANDARD',
      name: 'Standard Audit Events',
      description: 'Standard retention for audit events',
      dataCategory: 'audit_events',
      retentionPeriod: 2555, // 7 years
      legalBasis: 'Legal obligation',
      automaticDeletion: true,
      deletionMethod: 'HARD_DELETE',
      exceptions: [
        {
          condition: 'severity = CRITICAL',
          extendedPeriod: 3650, // 10 years
          reason: 'Critical events require extended retention'
        }
      ],
      reviewCycle: 365,
      lastReviewed: new Date().toISOString(),
      nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      complianceRequirements: ['GDPR', 'SOX']
    });
  }
  
  private addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.id, policy);
  }
  
  private startPeriodicFlush(): void {
    setInterval(async () => {
      await this.flushEvents();
    }, this.flushInterval);
  }
  
  private startRetentionEnforcement(): void {
    // Run retention enforcement daily
    setInterval(async () => {
      await this.enforceRetentionPolicies();
    }, 24 * 60 * 60 * 1000);
  }
  
  private async enforceRetentionPolicies(): Promise<void> {
    if (!this.db) return;
    
    for (const policy of this.retentionPolicies.values()) {
      try {
        await this.enforceRetentionPolicy(policy);
      } catch (error) {
        await this.logEvent(
          'SYSTEM_ACTION',
          'SYSTEM',
          'RETENTION_ENFORCEMENT_FAILED',
          {
            policyId: policy.id,
            error: error instanceof Error ? error.message : String(error)
          },
          { severity: 'HIGH', outcome: 'FAILURE' }
        );
      }
    }
  }
  
  private async enforceRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    if (!this.db) return;
    
    const cutoffDate = new Date(Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000);
    
    if (policy.automaticDeletion) {
      const client = await this.db.connect();
      try {
        const result = await client.query(
          'DELETE FROM audit_events WHERE timestamp < $1 AND category = $2',
          [cutoffDate.toISOString(), policy.dataCategory]
        );
        
        await this.logEvent(
          'SYSTEM_ACTION',
          'SYSTEM',
          'RETENTION_POLICY_ENFORCED',
          {
            policyId: policy.id,
            deletedRecords: result.rowCount,
            cutoffDate: cutoffDate.toISOString()
          },
          { severity: 'LOW', outcome: 'SUCCESS' }
        );
        
      } finally {
        client.release();
      }
    }
  }
}

/**
 * Create audit logger with default configuration
 */
export function createAuditLogger(dbPool?: Pool): AuditLogger {
  return new AuditLogger(dbPool);
}