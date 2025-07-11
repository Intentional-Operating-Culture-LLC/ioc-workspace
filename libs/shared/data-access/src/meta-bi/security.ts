// Security and Access Control System
// Comprehensive security framework for Meta BI system

import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface SecurityConfig {
  encryption: {
    atRest: {
      algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
      keyDerivation: 'pbkdf2' | 'argon2' | 'scrypt';
      keyRotation: {
        enabled: boolean;
        intervalDays: number;
        retainOldKeys: number;
      };
    };
    inTransit: {
      tlsVersion: '1.2' | '1.3';
      cipherSuites: string[];
      certificateValidation: boolean;
    };
  };
  accessControl: {
    rbac: {
      enabled: boolean;
      roles: Role[];
      permissions: Permission[];
    };
    abac: {
      enabled: boolean;
      policies: Policy[];
    };
    sessionManagement: {
      timeoutMinutes: number;
      maxConcurrentSessions: number;
      enforceDeviceBinding: boolean;
    };
  };
  audit: {
    enabled: boolean;
    events: AuditEventType[];
    retention: string;
    realtime: boolean;
    encryption: boolean;
  };
  compliance: {
    frameworks: ComplianceFramework[];
    dataClassification: DataClassification[];
    retentionPolicies: RetentionPolicy[];
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherits?: string[];
  constraints?: RoleConstraint[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  effect: 'allow' | 'deny';
  priority: number;
}

export interface PolicyRule {
  subject: string;
  resource: string;
  action: string;
  conditions?: PolicyCondition[];
}

export interface PolicyCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'not_in' | 'contains';
  value: any;
}

export interface RoleConstraint {
  type: 'time' | 'location' | 'device' | 'data_scope';
  parameters: Record<string, any>;
}

export interface PermissionCondition {
  attribute: string;
  operator: string;
  value: any;
}

export type AuditEventType = 
  | 'authentication' 
  | 'authorization' 
  | 'data_access' 
  | 'data_export' 
  | 'configuration_change' 
  | 'admin_action'
  | 'system_event';

export type ComplianceFramework = 'gdpr' | 'hipaa' | 'sox' | 'iso27001' | 'ccpa';

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  label: string;
  description: string;
  handling: DataHandlingRequirement[];
}

export interface DataHandlingRequirement {
  type: 'encryption' | 'access_control' | 'audit' | 'retention' | 'deletion';
  parameters: Record<string, any>;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  dataTypes: string[];
  retentionPeriod: string;
  deletionMethod: 'soft' | 'hard' | 'cryptographic';
  legal_hold: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  risk_score?: number;
}

export interface SecurityContext {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private activeSessions: Map<string, SecuritySession> = new Map();
  private auditLog: AuditEvent[] = [];
  private keyRotationTimer?: NodeJS.Timeout;
  
  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    this.initializeEncryption();
    this.startKeyRotation();
  }
  
  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    // Generate initial encryption key
    await this.generateEncryptionKey('primary');
    
    this.emit('encryptionInitialized');
  }
  
  /**
   * Generate new encryption key
   */
  private async generateEncryptionKey(keyId: string): Promise<void> {
    const key = crypto.randomBytes(32); // 256-bit key
    const salt = crypto.randomBytes(16);
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      key: key.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: this.config.encryption.atRest.algorithm,
      created: new Date(),
      active: true
    };
    
    this.encryptionKeys.set(keyId, encryptionKey);
    
    this.logAuditEvent({
      eventType: 'system_event',
      resource: 'encryption_key',
      action: 'generated',
      outcome: 'success',
      details: { keyId, algorithm: encryptionKey.algorithm }
    });
  }
  
  /**
   * Start key rotation schedule
   */
  private startKeyRotation(): void {
    if (!this.config.encryption.atRest.keyRotation.enabled) {
      return;
    }
    
    const intervalMs = this.config.encryption.atRest.keyRotation.intervalDays * 24 * 60 * 60 * 1000;
    
    this.keyRotationTimer = setInterval(async () => {
      await this.rotateEncryptionKeys();
    }, intervalMs);
  }
  
  /**
   * Rotate encryption keys
   */
  private async rotateEncryptionKeys(): Promise<void> {
    try {
      // Mark current primary key as old
      const currentPrimary = Array.from(this.encryptionKeys.values())
        .find(key => key.active && key.id === 'primary');
      
      if (currentPrimary) {
        currentPrimary.active = false;
        this.encryptionKeys.set(`old_${Date.now()}`, currentPrimary);
      }
      
      // Generate new primary key
      await this.generateEncryptionKey('primary');
      
      // Clean up old keys
      await this.cleanupOldKeys();
      
      this.emit('keyRotated');
      
      this.logAuditEvent({
        eventType: 'system_event',
        resource: 'encryption_key',
        action: 'rotated',
        outcome: 'success',
        details: { timestamp: new Date().toISOString() }
      });
      
    } catch (error) {
      this.logAuditEvent({
        eventType: 'system_event',
        resource: 'encryption_key',
        action: 'rotation_failed',
        outcome: 'failure',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
  
  /**
   * Clean up old encryption keys
   */
  private async cleanupOldKeys(): Promise<void> {
    const retainCount = this.config.encryption.atRest.keyRotation.retainOldKeys;
    const oldKeys = Array.from(this.encryptionKeys.entries())
      .filter(([id, key]) => !key.active)
      .sort(([, a], [, b]) => b.created.getTime() - a.created.getTime());
    
    // Remove excess old keys
    const keysToRemove = oldKeys.slice(retainCount);
    for (const [keyId] of keysToRemove) {
      this.encryptionKeys.delete(keyId);
    }
  }
  
  /**
   * Encrypt data
   */
  public encryptData(data: string, keyId: string = 'primary'): EncryptedData {
    const encryptionKey = this.encryptionKeys.get(keyId);
    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }
    
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipher(encryptionKey.algorithm, Buffer.from(encryptionKey.key, 'base64'));
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      data: encrypted,
      iv: iv.toString('base64'),
      keyId,
      algorithm: encryptionKey.algorithm
    };
  }
  
  /**
   * Decrypt data
   */
  public decryptData(encryptedData: EncryptedData): string {
    const encryptionKey = this.encryptionKeys.get(encryptedData.keyId);
    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }
    
    const decipher = crypto.createDecipher(encryptedData.algorithm, Buffer.from(encryptionKey.key, 'base64'));
    
    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Authenticate user
   */
  public async authenticateUser(
    credentials: UserCredentials,
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    
    try {
      // Validate credentials (implementation would depend on auth provider)
      const user = await this.validateCredentials(credentials);
      
      if (!user) {
        this.logAuditEvent({
          eventType: 'authentication',
          resource: 'user_session',
          action: 'login_failed',
          outcome: 'failure',
          details: { reason: 'invalid_credentials', username: credentials.username },
          ip_address: context.ip_address,
          user_agent: context.user_agent
        });
        
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Create security session
      const session = await this.createSecuritySession(user, context);
      
      this.logAuditEvent({
        eventType: 'authentication',
        userId: user.id,
        sessionId: session.id,
        resource: 'user_session',
        action: 'login_success',
        outcome: 'success',
        details: { username: user.username },
        ip_address: context.ip_address,
        user_agent: context.user_agent
      });
      
      return {
        success: true,
        user,
        session,
        token: this.generateSessionToken(session)
      };
      
    } catch (error) {
      this.logAuditEvent({
        eventType: 'authentication',
        resource: 'user_session',
        action: 'login_error',
        outcome: 'failure',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        ip_address: context.ip_address,
        user_agent: context.user_agent
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }
  
  /**
   * Validate credentials
   */
  private async validateCredentials(credentials: UserCredentials): Promise<User | null> {
    // Implementation would integrate with authentication provider
    // For now, return mock validation
    return {
      id: 'user_123',
      username: credentials.username,
      email: credentials.username,
      roles: ['analyst'],
      attributes: {}
    };
  }
  
  /**
   * Create security session
   */
  private async createSecuritySession(
    user: User, 
    context: AuthenticationContext
  ): Promise<SecuritySession> {
    
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + (this.config.accessControl.sessionManagement.timeoutMinutes * 60 * 1000));
    
    const session: SecuritySession = {
      id: sessionId,
      userId: user.id,
      createdAt: new Date(),
      expiresAt,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      device_fingerprint: context.device_fingerprint,
      active: true
    };
    
    // Check concurrent session limit
    await this.enforceConcurrentSessionLimit(user.id);
    
    this.activeSessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.active);
    
    const maxSessions = this.config.accessControl.sessionManagement.maxConcurrentSessions;
    
    if (userSessions.length >= maxSessions) {
      // Terminate oldest session
      const oldestSession = userSessions
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      
      await this.terminateSession(oldestSession.id, 'concurrent_limit_exceeded');
    }
  }
  
  /**
   * Authorize action
   */
  public async authorizeAction(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    
    try {
      // Check session validity
      const session = this.activeSessions.get(context.sessionId);
      if (!session || !session.active || session.expiresAt < new Date()) {
        return { authorized: false, reason: 'invalid_session' };
      }
      
      // RBAC authorization
      if (this.config.accessControl.rbac.enabled) {
        const rbacResult = await this.checkRBACAuthorization(context, resource, action);
        if (!rbacResult.authorized) {
          this.logAuditEvent({
            eventType: 'authorization',
            userId: context.userId,
            sessionId: context.sessionId,
            resource,
            action,
            outcome: 'blocked',
            details: { reason: rbacResult.reason, method: 'rbac' },
            ip_address: context.ip_address
          });
          
          return rbacResult;
        }
      }
      
      // ABAC authorization
      if (this.config.accessControl.abac.enabled) {
        const abacResult = await this.checkABACAuthorization(context, resource, action);
        if (!abacResult.authorized) {
          this.logAuditEvent({
            eventType: 'authorization',
            userId: context.userId,
            sessionId: context.sessionId,
            resource,
            action,
            outcome: 'blocked',
            details: { reason: abacResult.reason, method: 'abac' },
            ip_address: context.ip_address
          });
          
          return abacResult;
        }
      }
      
      // Log successful authorization
      this.logAuditEvent({
        eventType: 'authorization',
        userId: context.userId,
        sessionId: context.sessionId,
        resource,
        action,
        outcome: 'success',
        details: { method: 'rbac_abac' },
        ip_address: context.ip_address
      });
      
      return { authorized: true };
      
    } catch (error) {
      this.logAuditEvent({
        eventType: 'authorization',
        userId: context.userId,
        sessionId: context.sessionId,
        resource,
        action,
        outcome: 'failure',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        ip_address: context.ip_address
      });
      
      return { 
        authorized: false, 
        reason: 'authorization_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Check RBAC authorization
   */
  private async checkRBACAuthorization(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    
    // Get user roles
    const userRoles = context.roles;
    
    // Find required permissions
    const requiredPermission = this.config.accessControl.rbac.permissions.find(
      p => p.resource === resource && p.action === action
    );
    
    if (!requiredPermission) {
      return { authorized: false, reason: 'permission_not_defined' };
    }
    
    // Check if user has required permission through roles
    const hasPermission = userRoles.some(roleName => {
      const role = this.config.accessControl.rbac.roles.find(r => r.name === roleName);
      return role && role.permissions.includes(requiredPermission.id);
    });
    
    if (!hasPermission) {
      return { authorized: false, reason: 'insufficient_permissions' };
    }
    
    // Check role constraints
    const constraintResult = await this.checkRoleConstraints(context, userRoles);
    if (!constraintResult.satisfied) {
      return { authorized: false, reason: 'role_constraint_violation' };
    }
    
    return { authorized: true };
  }
  
  /**
   * Check ABAC authorization
   */
  private async checkABACAuthorization(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    
    // Evaluate policies
    const applicablePolicies = this.config.accessControl.abac.policies
      .filter(policy => this.policyApplies(policy, context, resource, action))
      .sort((a, b) => b.priority - a.priority); // Higher priority first
    
    for (const policy of applicablePolicies) {
      const result = await this.evaluatePolicy(policy, context, resource, action);
      
      if (result.applies) {
        if (policy.effect === 'deny') {
          return { authorized: false, reason: 'policy_denied' };
        } else if (policy.effect === 'allow') {
          return { authorized: true };
        }
      }
    }
    
    // Default deny if no policy allows
    return { authorized: false, reason: 'no_allowing_policy' };
  }
  
  /**
   * Check if policy applies to request
   */
  private policyApplies(
    policy: Policy,
    context: SecurityContext,
    resource: string,
    action: string
  ): boolean {
    
    return policy.rules.some(rule => 
      rule.resource === resource && 
      rule.action === action &&
      this.matchesSubject(rule.subject, context)
    );
  }
  
  /**
   * Check if subject matches context
   */
  private matchesSubject(subject: string, context: SecurityContext): boolean {
    // Simple subject matching - can be extended for complex patterns
    return context.roles.includes(subject) || context.userId === subject;
  }
  
  /**
   * Evaluate policy against context
   */
  private async evaluatePolicy(
    policy: Policy,
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<{ applies: boolean; reason?: string }> {
    
    for (const rule of policy.rules) {
      if (rule.resource === resource && rule.action === action) {
        // Check conditions
        if (rule.conditions) {
          const conditionResult = this.evaluateConditions(rule.conditions, context);
          if (!conditionResult) {
            continue;
          }
        }
        
        return { applies: true };
      }
    }
    
    return { applies: false, reason: 'no_matching_rule' };
  }
  
  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(
    conditions: PolicyCondition[],
    context: SecurityContext
  ): boolean {
    
    return conditions.every(condition => {
      const attributeValue = context.attributes[condition.attribute];
      
      switch (condition.operator) {
        case 'eq':
          return attributeValue === condition.value;
        case 'ne':
          return attributeValue !== condition.value;
        case 'gt':
          return attributeValue > condition.value;
        case 'lt':
          return attributeValue < condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(attributeValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
        case 'contains':
          return typeof attributeValue === 'string' && attributeValue.includes(condition.value);
        default:
          return false;
      }
    });
  }
  
  /**
   * Check role constraints
   */
  private async checkRoleConstraints(
    context: SecurityContext,
    roles: string[]
  ): Promise<{ satisfied: boolean; violations?: string[] }> {
    
    const violations: string[] = [];
    
    for (const roleName of roles) {
      const role = this.config.accessControl.rbac.roles.find(r => r.name === roleName);
      if (!role || !role.constraints) continue;
      
      for (const constraint of role.constraints) {
        const satisfied = await this.evaluateRoleConstraint(constraint, context);
        if (!satisfied) {
          violations.push(`${roleName}: ${constraint.type}`);
        }
      }
    }
    
    return {
      satisfied: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    };
  }
  
  /**
   * Evaluate role constraint
   */
  private async evaluateRoleConstraint(
    constraint: RoleConstraint,
    context: SecurityContext
  ): Promise<boolean> {
    
    switch (constraint.type) {
      case 'time':
        return this.evaluateTimeConstraint(constraint.parameters, context);
      case 'location':
        return this.evaluateLocationConstraint(constraint.parameters, context);
      case 'device':
        return this.evaluateDeviceConstraint(constraint.parameters, context);
      case 'data_scope':
        return this.evaluateDataScopeConstraint(constraint.parameters, context);
      default:
        return true; // Unknown constraint types are ignored
    }
  }
  
  /**
   * Evaluate time constraint
   */
  private evaluateTimeConstraint(
    parameters: Record<string, any>,
    context: SecurityContext
  ): boolean {
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday
    
    if (parameters.allowedHours) {
      const [startHour, endHour] = parameters.allowedHours;
      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }
    
    if (parameters.allowedDays) {
      if (!parameters.allowedDays.includes(currentDay)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate location constraint
   */
  private evaluateLocationConstraint(
    parameters: Record<string, any>,
    context: SecurityContext
  ): boolean {
    
    // Implementation would use IP geolocation or other location data
    // For now, return true (no location restrictions)
    return true;
  }
  
  /**
   * Evaluate device constraint
   */
  private evaluateDeviceConstraint(
    parameters: Record<string, any>,
    context: SecurityContext
  ): boolean {
    
    if (parameters.allowedDevices && context.device_fingerprint) {
      return parameters.allowedDevices.includes(context.device_fingerprint);
    }
    
    return true;
  }
  
  /**
   * Evaluate data scope constraint
   */
  private evaluateDataScopeConstraint(
    parameters: Record<string, any>,
    context: SecurityContext
  ): boolean {
    
    // Implementation would check data scope restrictions
    // For now, return true
    return true;
  }
  
  /**
   * Terminate session
   */
  public async terminateSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }
    
    session.active = false;
    session.terminatedAt = new Date();
    session.terminationReason = reason;
    
    this.logAuditEvent({
      eventType: 'authentication',
      userId: session.userId,
      sessionId,
      resource: 'user_session',
      action: 'logout',
      outcome: 'success',
      details: { reason }
    });
    
    this.emit('sessionTerminated', { sessionId, userId: session.userId, reason });
  }
  
  /**
   * Generate session token
   */
  private generateSessionToken(session: SecuritySession): string {
    const tokenData = {
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString()
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    return token;
  }
  
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }
  
  /**
   * Log audit event
   */
  private logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    if (!this.config.audit.enabled) {
      return;
    }
    
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      risk_score: this.calculateRiskScore(event)
    };
    
    this.auditLog.push(auditEvent);
    
    // Limit audit log size in memory
    const maxSize = 10000;
    if (this.auditLog.length > maxSize) {
      this.auditLog.splice(0, this.auditLog.length - maxSize);
    }
    
    this.emit('auditEvent', auditEvent);
    
    // Real-time alerting for high-risk events
    if (this.config.audit.realtime && auditEvent.risk_score && auditEvent.risk_score > 80) {
      this.emit('highRiskEvent', auditEvent);
    }
  }
  
  /**
   * Calculate risk score for audit event
   */
  private calculateRiskScore(event: Omit<AuditEvent, 'id' | 'timestamp'>): number {
    let score = 0;
    
    // Base score by event type
    const eventTypeScores: Record<AuditEventType, number> = {
      authentication: 30,
      authorization: 20,
      data_access: 40,
      data_export: 60,
      configuration_change: 80,
      admin_action: 70,
      system_event: 10
    };
    
    score += eventTypeScores[event.eventType] || 20;
    
    // Outcome modifier
    if (event.outcome === 'failure') {
      score += 30;
    } else if (event.outcome === 'blocked') {
      score += 20;
    }
    
    // Action modifiers
    const highRiskActions = ['delete', 'export', 'configure', 'admin'];
    if (highRiskActions.some(action => event.action.includes(action))) {
      score += 20;
    }
    
    // Time-based risk (outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  /**
   * Get audit events
   */
  public getAuditEvents(filters?: {
    eventType?: AuditEventType;
    userId?: string;
    startTime?: string;
    endTime?: string;
    outcome?: string;
  }): AuditEvent[] {
    
    let events = [...this.auditLog];
    
    if (filters) {
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType);
      }
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.startTime) {
        events = events.filter(e => e.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        events = events.filter(e => e.timestamp <= filters.endTime!);
      }
      if (filters.outcome) {
        events = events.filter(e => e.outcome === filters.outcome);
      }
    }
    
    return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  
  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      this.terminateSession(sessionId, 'expired');
      this.activeSessions.delete(sessionId);
    }
  }
  
  /**
   * Get security statistics
   */
  public getSecurityStatistics(): {
    sessions: {
      active: number;
      total: number;
      expired: number;
    };
    audit: {
      total: number;
      highRisk: number;
      recentFailures: number;
    };
    encryption: {
      activeKeys: number;
      lastRotation?: string;
    };
  } {
    const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.active);
    const expiredSessions = Array.from(this.activeSessions.values()).filter(s => !s.active);
    
    const highRiskEvents = this.auditLog.filter(e => e.risk_score && e.risk_score > 80);
    const recentFailures = this.auditLog.filter(e => 
      e.outcome === 'failure' && 
      new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const activeKeys = Array.from(this.encryptionKeys.values()).filter(k => k.active);
    const lastRotation = Math.max(...Array.from(this.encryptionKeys.values()).map(k => k.created.getTime()));
    
    return {
      sessions: {
        active: activeSessions.length,
        total: this.activeSessions.size,
        expired: expiredSessions.length
      },
      audit: {
        total: this.auditLog.length,
        highRisk: highRiskEvents.length,
        recentFailures: recentFailures.length
      },
      encryption: {
        activeKeys: activeKeys.length,
        lastRotation: lastRotation > 0 ? new Date(lastRotation).toISOString() : undefined
      }
    };
  }
  
  /**
   * Shutdown security manager
   */
  public async shutdown(): Promise<void> {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
    }
    
    // Terminate all sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.terminateSession(sessionId, 'system_shutdown');
    }
    
    this.emit('shutdown');
  }
}

// Supporting interfaces and types

export interface EncryptionKey {
  id: string;
  key: string;
  salt: string;
  algorithm: string;
  created: Date;
  active: boolean;
}

export interface EncryptedData {
  data: string;
  iv: string;
  keyId: string;
  algorithm: string;
}

export interface UserCredentials {
  username: string;
  password: string;
  mfaToken?: string;
}

export interface AuthenticationContext {
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  attributes: Record<string, any>;
}

export interface SecuritySession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  active: boolean;
  terminatedAt?: Date;
  terminationReason?: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: SecuritySession;
  token?: string;
  error?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  error?: string;
}

/**
 * Create default security configuration
 */
export function createDefaultSecurityConfig(): SecurityConfig {
  return {
    encryption: {
      atRest: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        keyRotation: {
          enabled: true,
          intervalDays: 90,
          retainOldKeys: 3
        }
      },
      inTransit: {
        tlsVersion: '1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256'
        ],
        certificateValidation: true
      }
    },
    accessControl: {
      rbac: {
        enabled: true,
        roles: [
          {
            id: 'admin',
            name: 'Administrator',
            description: 'Full system access',
            permissions: ['*']
          },
          {
            id: 'analyst',
            name: 'Data Analyst',
            description: 'Read access to analytics data',
            permissions: ['analytics:read', 'reports:read']
          },
          {
            id: 'viewer',
            name: 'Viewer',
            description: 'Limited read access',
            permissions: ['dashboards:read']
          }
        ],
        permissions: [
          {
            id: 'analytics:read',
            name: 'Read Analytics',
            resource: 'analytics',
            action: 'read'
          },
          {
            id: 'reports:read',
            name: 'Read Reports',
            resource: 'reports',
            action: 'read'
          },
          {
            id: 'dashboards:read',
            name: 'Read Dashboards',
            resource: 'dashboards',
            action: 'read'
          }
        ]
      },
      abac: {
        enabled: false,
        policies: []
      },
      sessionManagement: {
        timeoutMinutes: 60,
        maxConcurrentSessions: 3,
        enforceDeviceBinding: false
      }
    },
    audit: {
      enabled: true,
      events: ['authentication', 'authorization', 'data_access', 'data_export', 'admin_action'],
      retention: '2y',
      realtime: true,
      encryption: true
    },
    compliance: {
      frameworks: ['gdpr'],
      dataClassification: [
        {
          level: 'public',
          label: 'Public',
          description: 'Data that can be freely shared',
          handling: []
        },
        {
          level: 'internal',
          label: 'Internal',
          description: 'Data for internal use only',
          handling: [
            { type: 'access_control', parameters: { requireAuthentication: true } }
          ]
        },
        {
          level: 'confidential',
          label: 'Confidential',
          description: 'Sensitive business data',
          handling: [
            { type: 'encryption', parameters: { required: true } },
            { type: 'access_control', parameters: { requireAuthorization: true } },
            { type: 'audit', parameters: { logAllAccess: true } }
          ]
        }
      ],
      retentionPolicies: [
        {
          id: 'default',
          name: 'Default Retention',
          dataTypes: ['*'],
          retentionPeriod: '2y',
          deletionMethod: 'soft',
          legal_hold: false
        }
      ]
    }
  };
}