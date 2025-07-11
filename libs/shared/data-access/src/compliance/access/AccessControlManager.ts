/**
 * IOC Core - Access Control Manager
 * Manages role-based access control, fine-grained permissions,
 * API authentication, and session management
 */

import { EventEmitter } from 'events';
import {
  AccessControl,
  Role,
  Permission,
  DataAccessRule,
  AccessRestriction,
  SessionConfig,
  AuditLog,
  AccessCondition,
  PermissionCondition
} from '../types';
import { RoleManager } from './RoleManager';
import { PermissionEngine } from './PermissionEngine';
import { SessionManager } from './SessionManager';
import { AccessValidator } from './AccessValidator';
import { AccessCache } from '../utils/AccessCache';
import { createClient } from '../../supabase/server';

export interface AccessControlConfig {
  enableRBAC: boolean;
  enableABAC: boolean; // Attribute-based access control
  mfaRequired: boolean;
  sessionTimeout: number; // minutes
  absoluteTimeout: number; // minutes
  maxConcurrentSessions: number;
  ipWhitelisting: boolean;
  geoRestriction: boolean;
  auditAllAccess: boolean;
}

export interface AccessStatus {
  score: number;
  activeUsers: number;
  activeSessions: number;
  failedAttempts: number;
  suspiciousActivities: number;
  complianceIssues: AccessComplianceIssue[];
}

interface AccessComplianceIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: number;
  recommendation: string;
}

export interface AccessRequest {
  userId: string;
  resource: string;
  action: string;
  context: AccessContext;
}

export interface AccessContext {
  ip?: string;
  userAgent?: string;
  location?: string;
  deviceId?: string;
  sessionId?: string;
  timestamp: Date;
  purpose?: string;
  attributes?: Record<string, any>;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
  auditRequired: boolean;
  mfaRequired?: boolean;
}

export class AccessControlManager extends EventEmitter {
  private config: AccessControlConfig;
  private roleManager: RoleManager;
  private permissionEngine: PermissionEngine;
  private sessionManager: SessionManager;
  private accessValidator: AccessValidator;
  private cache: AccessCache;
  private supabase = createClient();
  private accessControls: Map<string, AccessControl> = new Map();

  constructor(config?: Partial<AccessControlConfig>) {
    super();
    this.config = {
      enableRBAC: true,
      enableABAC: true,
      mfaRequired: false,
      sessionTimeout: 30,
      absoluteTimeout: 480, // 8 hours
      maxConcurrentSessions: 3,
      ipWhitelisting: false,
      geoRestriction: false,
      auditAllAccess: true,
      ...config
    };

    this.roleManager = new RoleManager();
    this.permissionEngine = new PermissionEngine(this.config);
    this.sessionManager = new SessionManager(this.config);
    this.accessValidator = new AccessValidator(this.config);
    this.cache = new AccessCache();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-managers
      await Promise.all([
        this.roleManager.initialize(),
        this.permissionEngine.initialize(),
        this.sessionManager.initialize(),
        this.accessValidator.initialize()
      ]);

      // Load access controls
      await this.loadAccessControls();

      // Set up event handlers
      this.setupEventHandlers();

      // Start monitoring
      this.startMonitoring();

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadAccessControls(): Promise<void> {
    const { data: controls, error } = await this.supabase
      .from('access_controls')
      .select(`
        *,
        roles:user_roles(*),
        permissions:user_permissions(*),
        restrictions:access_restrictions(*)
      `)
      .eq('active', true);

    if (error) throw error;

    for (const control of controls || []) {
      this.accessControls.set(control.user_id, this.parseAccessControl(control));
    }
  }

  private parseAccessControl(raw: any): AccessControl {
    return {
      id: raw.id,
      userId: raw.user_id,
      roles: raw.roles.map((r: any) => this.roleManager.parseRole(r)),
      permissions: raw.permissions.map((p: any) => this.permissionEngine.parsePermission(p)),
      restrictions: raw.restrictions.map((r: any) => this.parseRestriction(r)),
      sessionConfig: JSON.parse(raw.session_config || '{}'),
      mfaRequired: raw.mfa_required
    };
  }

  private parseRestriction(raw: any): AccessRestriction {
    return {
      type: raw.type,
      parameters: JSON.parse(raw.parameters),
      enforced: raw.enforced
    };
  }

  private setupEventHandlers(): void {
    // Session events
    this.sessionManager.on('session_created', (event) => {
      this.handleSessionCreated(event);
    });

    this.sessionManager.on('session_expired', (event) => {
      this.handleSessionExpired(event);
    });

    this.sessionManager.on('suspicious_activity', (event) => {
      this.handleSuspiciousActivity(event);
    });

    // Permission events
    this.permissionEngine.on('permission_denied', (event) => {
      this.handlePermissionDenied(event);
    });

    // Role events
    this.roleManager.on('role_assigned', (event) => {
      this.handleRoleChange(event);
    });

    this.roleManager.on('role_revoked', (event) => {
      this.handleRoleChange(event);
    });
  }

  private startMonitoring(): void {
    // Monitor for anomalies
    setInterval(() => {
      this.detectAccessAnomalies();
    }, 60000); // Every minute

    // Clean up expired sessions
    setInterval(() => {
      this.sessionManager.cleanupExpiredSessions();
    }, 300000); // Every 5 minutes

    // Refresh access controls
    setInterval(() => {
      this.refreshAccessControls();
    }, 900000); // Every 15 minutes
  }

  private async detectAccessAnomalies(): Promise<void> {
    try {
      const anomalies = await this.accessValidator.detectAnomalies();
      
      for (const anomaly of anomalies) {
        this.emit('anomaly_detected', anomaly);
        
        if (anomaly.severity === 'critical') {
          await this.handleCriticalAnomaly(anomaly);
        }
      }
    } catch (error) {
      this.emit('error', {
        type: 'anomaly_detection_failed',
        error
      });
    }
  }

  private async handleCriticalAnomaly(anomaly: any): Promise<void> {
    // Immediate response to critical anomalies
    if (anomaly.type === 'brute_force') {
      await this.blockUser(anomaly.userId, 'Brute force attack detected');
    } else if (anomaly.type === 'privilege_escalation') {
      await this.revokeAllSessions(anomaly.userId);
      await this.restrictUser(anomaly.userId, 'Privilege escalation attempt');
    }

    // Log incident
    await this.logSecurityIncident(anomaly);
  }

  private async blockUser(userId: string, reason: string): Promise<void> {
    // Update user status
    await this.supabase
      .from('users')
      .update({
        status: 'blocked',
        blocked_reason: reason,
        blocked_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Revoke all sessions
    await this.sessionManager.revokeUserSessions(userId);

    // Clear cache
    await this.cache.clearUserCache(userId);

    this.emit('user_blocked', { userId, reason });
  }

  private async restrictUser(userId: string, reason: string): Promise<void> {
    // Add temporary restrictions
    const restriction: AccessRestriction = {
      type: 'temporary_block',
      parameters: {
        reason,
        until: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      enforced: true
    };

    const control = this.accessControls.get(userId);
    if (control) {
      control.restrictions.push(restriction);
      await this.saveAccessControl(control);
    }
  }

  private async saveAccessControl(control: AccessControl): Promise<void> {
    const { error } = await this.supabase
      .from('access_controls')
      .upsert({
        user_id: control.userId,
        roles: control.roles.map(r => r.id),
        permissions: control.permissions.map(p => p.id),
        restrictions: control.restrictions,
        session_config: control.sessionConfig,
        mfa_required: control.mfaRequired,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Update cache
    this.accessControls.set(control.userId, control);
    await this.cache.setAccessControl(control.userId, control);
  }

  private async logSecurityIncident(incident: any): Promise<void> {
    await this.supabase
      .from('security_incidents')
      .insert({
        type: incident.type,
        severity: incident.severity,
        user_id: incident.userId,
        details: incident,
        detected_at: new Date().toISOString()
      });
  }

  private async refreshAccessControls(): Promise<void> {
    try {
      // Reload access controls that have been updated
      const { data: updated } = await this.supabase
        .from('access_controls')
        .select('user_id, updated_at')
        .gt('updated_at', new Date(Date.now() - 900000).toISOString()); // Last 15 minutes

      if (updated && updated.length > 0) {
        for (const record of updated) {
          await this.reloadUserAccessControl(record.user_id);
        }
      }
    } catch (error) {
      this.emit('error', {
        type: 'access_control_refresh_failed',
        error
      });
    }
  }

  private async reloadUserAccessControl(userId: string): Promise<void> {
    const { data: control } = await this.supabase
      .from('access_controls')
      .select(`
        *,
        roles:user_roles(*),
        permissions:user_permissions(*),
        restrictions:access_restrictions(*)
      `)
      .eq('user_id', userId)
      .single();

    if (control) {
      const parsed = this.parseAccessControl(control);
      this.accessControls.set(userId, parsed);
      await this.cache.setAccessControl(userId, parsed);
    }
  }

  private async handleSessionCreated(event: any): Promise<void> {
    // Audit log
    await this.auditAccess({
      actor: { type: 'user', id: event.userId, name: event.username },
      action: { type: 'session_created', category: 'authentication' },
      resource: { type: 'session', id: event.sessionId },
      result: { status: 'success' }
    });

    // Check concurrent sessions
    const sessions = await this.sessionManager.getUserSessions(event.userId);
    if (sessions.length > this.config.maxConcurrentSessions) {
      // Revoke oldest session
      const oldest = sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      await this.sessionManager.revokeSession(oldest.id);
      
      this.emit('concurrent_session_limit', {
        userId: event.userId,
        revokedSession: oldest.id
      });
    }
  }

  private async handleSessionExpired(event: any): Promise<void> {
    await this.auditAccess({
      actor: { type: 'system', id: 'session_manager' },
      action: { type: 'session_expired', category: 'authentication' },
      resource: { type: 'session', id: event.sessionId },
      result: { status: 'success' }
    });
  }

  private async handleSuspiciousActivity(event: any): Promise<void> {
    this.emit('unauthorized_access', event);

    // Log the activity
    await this.auditAccess({
      actor: { type: 'user', id: event.userId },
      action: { 
        type: 'suspicious_activity', 
        category: 'authorization',
        description: event.description,
        risk: 'high'
      },
      resource: { type: event.resourceType, id: event.resourceId },
      result: { status: 'failure', error: 'Suspicious activity detected' }
    });

    // Take action based on severity
    if (event.severity === 'critical') {
      await this.handleCriticalAnomaly(event);
    }
  }

  private async handlePermissionDenied(event: any): Promise<void> {
    await this.auditAccess({
      actor: { type: 'user', id: event.userId },
      action: { 
        type: event.action, 
        category: 'authorization',
        risk: 'medium'
      },
      resource: { type: event.resourceType, id: event.resourceId },
      result: { 
        status: 'failure', 
        error: 'Permission denied',
        changes: []
      }
    });

    // Check for repeated failures
    const failures = await this.getRecentFailures(event.userId);
    if (failures > 10) {
      this.emit('excessive_permission_failures', {
        userId: event.userId,
        failures,
        timeframe: '1 hour'
      });
    }
  }

  private async getRecentFailures(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('actor_id', userId)
      .eq('result_status', 'failure')
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString()); // Last hour

    return count || 0;
  }

  private async handleRoleChange(event: any): Promise<void> {
    // Clear cache for affected user
    await this.cache.clearUserCache(event.userId);

    // Reload access control
    await this.reloadUserAccessControl(event.userId);

    // Audit the change
    await this.auditAccess({
      actor: { type: 'user', id: event.changedBy },
      action: { 
        type: event.type === 'assigned' ? 'role_assigned' : 'role_revoked',
        category: 'authorization'
      },
      resource: { type: 'user', id: event.userId },
      result: { 
        status: 'success',
        changes: [{
          field: 'roles',
          oldValue: event.oldRoles,
          newValue: event.newRoles,
          sensitive: false
        }]
      }
    });
  }

  // Public API methods

  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    try {
      // Check cache first
      const cached = await this.cache.getAccessDecision(request);
      if (cached) return cached;

      // Get user's access control
      const control = await this.getUserAccessControl(request.userId);
      if (!control) {
        return {
          allowed: false,
          reason: 'No access control found for user',
          auditRequired: true
        };
      }

      // Check restrictions first
      const restrictionCheck = await this.checkRestrictions(control, request.context);
      if (!restrictionCheck.allowed) {
        return restrictionCheck;
      }

      // Check permissions
      const permissionCheck = await this.checkPermissions(control, request);
      if (!permissionCheck.allowed) {
        return permissionCheck;
      }

      // Check data access rules
      const dataAccessCheck = await this.checkDataAccess(control, request);
      if (!dataAccessCheck.allowed) {
        return dataAccessCheck;
      }

      // Check additional conditions
      const conditionsCheck = await this.checkConditions(control, request);
      if (!conditionsCheck.allowed) {
        return conditionsCheck;
      }

      // Access granted
      const decision: AccessDecision = {
        allowed: true,
        conditions: conditionsCheck.conditions,
        auditRequired: control.roles.some(r => 
          r.dataAccess.some(da => da.auditRequired)
        ),
        mfaRequired: control.mfaRequired && !request.context.attributes?.mfaVerified
      };

      // Cache the decision
      await this.cache.setAccessDecision(request, decision, 300); // 5 minutes

      // Audit if required
      if (decision.auditRequired || this.config.auditAllAccess) {
        await this.auditAccess({
          actor: { type: 'user', id: request.userId },
          action: { type: request.action, category: 'data_access' },
          resource: { type: 'data', id: request.resource },
          result: { status: 'success' }
        });
      }

      return decision;

    } catch (error) {
      this.emit('error', {
        type: 'access_check_failed',
        error,
        request
      });
      
      // Fail closed
      return {
        allowed: false,
        reason: 'Access check failed',
        auditRequired: true
      };
    }
  }

  private async getUserAccessControl(userId: string): Promise<AccessControl | null> {
    // Check cache
    let control = this.accessControls.get(userId);
    if (control) return control;

    // Load from database
    const { data } = await this.supabase
      .from('access_controls')
      .select(`
        *,
        roles:user_roles(*),
        permissions:user_permissions(*),
        restrictions:access_restrictions(*)
      `)
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    control = this.parseAccessControl(data);
    this.accessControls.set(userId, control);
    
    return control;
  }

  private async checkRestrictions(
    control: AccessControl, 
    context: AccessContext
  ): Promise<AccessDecision> {
    for (const restriction of control.restrictions) {
      if (!restriction.enforced) continue;

      const check = await this.accessValidator.checkRestriction(restriction, context);
      if (!check.allowed) {
        return {
          allowed: false,
          reason: check.reason,
          auditRequired: true
        };
      }
    }

    return { allowed: true, auditRequired: false };
  }

  private async checkPermissions(
    control: AccessControl,
    request: AccessRequest
  ): Promise<AccessDecision> {
    // Check direct permissions
    const hasDirectPermission = control.permissions.some(p => 
      p.resource === request.resource && 
      p.actions.includes(request.action as any)
    );

    if (hasDirectPermission) {
      return { allowed: true, auditRequired: false };
    }

    // Check role-based permissions
    for (const role of control.roles) {
      const hasRolePermission = await this.roleManager.hasPermission(
        role,
        request.resource,
        request.action
      );

      if (hasRolePermission) {
        return { allowed: true, auditRequired: false };
      }
    }

    // Check ABAC if enabled
    if (this.config.enableABAC) {
      const abacDecision = await this.permissionEngine.evaluateABAC(
        control,
        request
      );

      if (abacDecision.allowed) {
        return abacDecision;
      }
    }

    return {
      allowed: false,
      reason: 'No permission for requested action',
      auditRequired: true
    };
  }

  private async checkDataAccess(
    control: AccessControl,
    request: AccessRequest
  ): Promise<AccessDecision> {
    // Get applicable data access rules
    const rules: DataAccessRule[] = [];
    
    for (const role of control.roles) {
      rules.push(...role.dataAccess);
    }

    if (rules.length === 0) {
      return { allowed: true, auditRequired: false };
    }

    // Check each rule
    for (const rule of rules) {
      const check = await this.accessValidator.checkDataAccessRule(rule, request);
      if (!check.allowed) {
        return {
          allowed: false,
          reason: check.reason,
          auditRequired: true
        };
      }
    }

    return { allowed: true, auditRequired: false };
  }

  private async checkConditions(
    control: AccessControl,
    request: AccessRequest
  ): Promise<AccessDecision> {
    const conditions: string[] = [];

    // Time-based conditions
    if (control.sessionConfig.timeout) {
      const sessionAge = await this.sessionManager.getSessionAge(request.context.sessionId!);
      if (sessionAge > control.sessionConfig.timeout * 60 * 1000) {
        return {
          allowed: false,
          reason: 'Session timeout exceeded',
          auditRequired: true
        };
      }
    }

    // Purpose-based conditions
    if (request.context.purpose) {
      const purposeAllowed = await this.accessValidator.checkPurpose(
        request.context.purpose,
        request.resource
      );

      if (!purposeAllowed) {
        return {
          allowed: false,
          reason: 'Purpose not allowed for resource',
          auditRequired: true
        };
      }

      conditions.push(`purpose:${request.context.purpose}`);
    }

    return {
      allowed: true,
      conditions,
      auditRequired: false
    };
  }

  async grantRole(userId: string, roleId: string, grantedBy: string): Promise<void> {
    const role = await this.roleManager.getRole(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    // Get current access control
    let control = await this.getUserAccessControl(userId);
    if (!control) {
      // Create new access control
      control = {
        id: `ac_${Date.now()}`,
        userId,
        roles: [],
        permissions: [],
        restrictions: [],
        sessionConfig: {
          timeout: this.config.sessionTimeout,
          absoluteTimeout: this.config.absoluteTimeout,
          concurrentSessions: this.config.maxConcurrentSessions,
          sessionTracking: true,
          deviceFingerprinting: true
        },
        mfaRequired: this.config.mfaRequired
      };
    }

    // Add role if not already present
    if (!control.roles.find(r => r.id === roleId)) {
      control.roles.push(role);
      await this.saveAccessControl(control);

      // Emit event
      this.emit('role_granted', {
        userId,
        roleId,
        role,
        grantedBy
      });
    }
  }

  async revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void> {
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    const index = control.roles.findIndex(r => r.id === roleId);
    if (index >= 0) {
      const role = control.roles[index];
      control.roles.splice(index, 1);
      await this.saveAccessControl(control);

      // Emit event
      this.emit('role_revoked', {
        userId,
        roleId,
        role,
        revokedBy
      });
    }
  }

  async grantPermission(
    userId: string, 
    permission: Permission, 
    grantedBy: string
  ): Promise<void> {
    const control = await this.getUserAccessControl(userId) || {
      id: `ac_${Date.now()}`,
      userId,
      roles: [],
      permissions: [],
      restrictions: [],
      sessionConfig: this.getDefaultSessionConfig(),
      mfaRequired: this.config.mfaRequired
    };

    // Add permission if not already present
    const exists = control.permissions.find(p => 
      p.resource === permission.resource &&
      p.actions.join(',') === permission.actions.join(',')
    );

    if (!exists) {
      control.permissions.push(permission);
      await this.saveAccessControl(control);

      // Emit event
      this.emit('permission_granted', {
        userId,
        permission,
        grantedBy
      });
    }
  }

  private getDefaultSessionConfig(): SessionConfig {
    return {
      timeout: this.config.sessionTimeout,
      absoluteTimeout: this.config.absoluteTimeout,
      concurrentSessions: this.config.maxConcurrentSessions,
      sessionTracking: true,
      deviceFingerprinting: true
    };
  }

  async applyRemediation(step: any): Promise<void> {
    const { action, target, parameters } = step;

    switch (action) {
      case 'revoke_permission':
        await this.revokePermission(target.userId, target.permissionId);
        break;
      case 'revoke_role':
        await this.revokeRole(target.userId, target.roleId, 'system');
        break;
      case 'add_restriction':
        await this.addRestriction(target.userId, parameters.restriction);
        break;
      case 'enforce_mfa':
        await this.enforceMFA(target.userId);
        break;
      case 'reduce_session_timeout':
        await this.updateSessionTimeout(target.userId, parameters.timeout);
        break;
    }
  }

  private async revokePermission(userId: string, permissionId: string): Promise<void> {
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    control.permissions = control.permissions.filter(p => p.id !== permissionId);
    await this.saveAccessControl(control);
  }

  private async addRestriction(userId: string, restriction: AccessRestriction): Promise<void> {
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    control.restrictions.push(restriction);
    await this.saveAccessControl(control);
  }

  private async enforceMFA(userId: string): Promise<void> {
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    control.mfaRequired = true;
    await this.saveAccessControl(control);

    // Revoke current sessions to force re-authentication
    await this.sessionManager.revokeUserSessions(userId);
  }

  private async updateSessionTimeout(userId: string, timeout: number): Promise<void> {
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    control.sessionConfig.timeout = timeout;
    await this.saveAccessControl(control);
  }

  async revokeConsentBasedAccess(event: any): Promise<void> {
    const { userId, purposes } = event.data;

    // Get permissions that depend on consent
    const control = await this.getUserAccessControl(userId);
    if (!control) return;

    // Filter permissions based on withdrawn purposes
    control.permissions = control.permissions.filter(p => {
      const condition = p.conditions?.find(c => 
        c.field === 'purpose' && purposes.includes(c.value)
      );
      return !condition;
    });

    await this.saveAccessControl(control);
  }

  private async auditAccess(log: Partial<AuditLog>): Promise<void> {
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      actor: log.actor || { type: 'system', id: 'unknown', name: 'Unknown' },
      action: log.action || { type: 'unknown', category: 'unknown', description: '', risk: 'low' },
      resource: log.resource || { type: 'unknown', id: 'unknown', name: 'Unknown' },
      result: log.result || { status: 'failure' },
      metadata: log.metadata
    };

    await this.supabase
      .from('audit_logs')
      .insert({
        id: auditLog.id,
        timestamp: auditLog.timestamp.toISOString(),
        actor_type: auditLog.actor.type,
        actor_id: auditLog.actor.id,
        actor_name: auditLog.actor.name,
        actor_ip: auditLog.actor.ip,
        action_type: auditLog.action.type,
        action_category: auditLog.action.category,
        action_description: auditLog.action.description,
        resource_type: auditLog.resource.type,
        resource_id: auditLog.resource.id,
        resource_name: auditLog.resource.name,
        result_status: auditLog.result.status,
        result_error: auditLog.result.error,
        metadata: auditLog.metadata
      });
  }

  async getStatus(): Promise<AccessStatus> {
    const [
      activeUsers,
      activeSessions,
      failedAttempts,
      suspiciousActivities,
      complianceIssues
    ] = await Promise.all([
      this.getActiveUserCount(),
      this.sessionManager.getActiveSessionCount(),
      this.getFailedAttemptCount(),
      this.getSuspiciousActivityCount(),
      this.identifyComplianceIssues()
    ]);

    const score = this.calculateAccessScore({
      activeUsers,
      activeSessions,
      failedAttempts,
      suspiciousActivities,
      issues: complianceIssues.length
    });

    return {
      score,
      activeUsers,
      activeSessions,
      failedAttempts,
      suspiciousActivities,
      complianceIssues
    };
  }

  private async getActiveUserCount(): Promise<number> {
    const { count } = await this.supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    return count || 0;
  }

  private async getFailedAttemptCount(): Promise<number> {
    const { count } = await this.supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('result_status', 'failure')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return count || 0;
  }

  private async getSuspiciousActivityCount(): Promise<number> {
    const { count } = await this.supabase
      .from('security_incidents')
      .select('id', { count: 'exact' })
      .in('severity', ['high', 'critical'])
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return count || 0;
  }

  private async identifyComplianceIssues(): Promise<AccessComplianceIssue[]> {
    const issues: AccessComplianceIssue[] = [];

    // Check for users without MFA
    if (this.config.mfaRequired) {
      const { count: noMfaCount } = await this.supabase
        .from('access_controls')
        .select('id', { count: 'exact' })
        .eq('mfa_required', false);

      if (noMfaCount && noMfaCount > 0) {
        issues.push({
          id: 'mfa_not_enforced',
          type: 'security',
          severity: 'high',
          description: 'MFA not enforced for all users',
          affectedUsers: noMfaCount,
          recommendation: 'Enable MFA for all users to enhance security'
        });
      }
    }

    // Check for excessive permissions
    const { data: excessivePerms } = await this.supabase
      .from('access_controls')
      .select('user_id, permissions')
      .filter('permissions', 'cs', '{"actions":["delete"]}');

    if (excessivePerms && excessivePerms.length > 10) {
      issues.push({
        id: 'excessive_delete_permissions',
        type: 'authorization',
        severity: 'medium',
        description: 'Too many users have delete permissions',
        affectedUsers: excessivePerms.length,
        recommendation: 'Review and restrict delete permissions to essential users only'
      });
    }

    // Check for stale sessions
    const staleSessions = await this.sessionManager.getStaleSessions();
    if (staleSessions.length > 100) {
      issues.push({
        id: 'stale_sessions',
        type: 'session_management',
        severity: 'low',
        description: 'Large number of stale sessions detected',
        affectedUsers: staleSessions.length,
        recommendation: 'Implement aggressive session cleanup policies'
      });
    }

    return issues;
  }

  private calculateAccessScore(metrics: any): number {
    let score = 100;

    // Deduct for failed attempts (max -20)
    const failureRate = metrics.failedAttempts / (metrics.activeUsers || 1);
    score -= Math.min(20, failureRate * 100);

    // Deduct for suspicious activities (max -30)
    score -= Math.min(30, metrics.suspiciousActivities * 5);

    // Deduct for compliance issues (max -25)
    score -= Math.min(25, metrics.issues * 5);

    // Bonus for good session management
    const sessionRatio = metrics.activeSessions / (metrics.activeUsers || 1);
    if (sessionRatio <= 1.5) {
      score += 5; // Good session hygiene
    }

    return Math.max(0, Math.round(score));
  }

  async generateReport(period: any): Promise<any> {
    const status = await this.getStatus();
    
    return {
      summary: {
        score: status.score,
        activeUsers: status.activeUsers,
        activeSessions: status.activeSessions,
        incidentCount: status.suspiciousActivities
      },
      accessPatterns: await this.analyzeAccessPatterns(period),
      topUsers: await this.getTopUsers(period),
      deniedAccess: await this.getDeniedAccessSummary(period),
      recommendations: status.complianceIssues.map(i => i.recommendation)
    };
  }

  private async analyzeAccessPatterns(period: any): Promise<any> {
    const { data: patterns } = await this.supabase
      .from('audit_logs')
      .select('action_type, count')
      .gte('timestamp', period.start.toISOString())
      .lte('timestamp', period.end.toISOString());

    return patterns || [];
  }

  private async getTopUsers(period: any): Promise<any> {
    const { data: users } = await this.supabase
      .from('audit_logs')
      .select('actor_id, actor_name, count')
      .gte('timestamp', period.start.toISOString())
      .lte('timestamp', period.end.toISOString())
      .order('count', { ascending: false })
      .limit(10);

    return users || [];
  }

  private async getDeniedAccessSummary(period: any): Promise<any> {
    const { data: denied } = await this.supabase
      .from('audit_logs')
      .select('resource_type, action_type, count')
      .eq('result_status', 'failure')
      .gte('timestamp', period.start.toISOString())
      .lte('timestamp', period.end.toISOString());

    return denied || [];
  }

  async getFindings(period: any): Promise<any[]> {
    const findings: any[] = [];
    const status = await this.getStatus();

    if (status.suspiciousActivities > 0) {
      findings.push({
        id: 'suspicious_activities',
        type: 'security',
        severity: 'high',
        description: `${status.suspiciousActivities} suspicious activities detected`,
        evidence: ['security_incidents'],
        recommendation: 'Investigate and address suspicious activities immediately'
      });
    }

    if (status.failedAttempts > 100) {
      findings.push({
        id: 'high_failure_rate',
        type: 'security',
        severity: 'medium',
        description: 'High rate of failed access attempts',
        evidence: ['audit_logs'],
        recommendation: 'Review access policies and consider implementing rate limiting'
      });
    }

    return findings;
  }

  async getMetrics(period: any): Promise<any[]> {
    const status = await this.getStatus();
    
    return [
      {
        name: 'Access Control Score',
        value: status.score,
        unit: '%',
        target: 85
      },
      {
        name: 'Active Sessions',
        value: status.activeSessions,
        unit: 'count',
        target: status.activeUsers * 1.5
      },
      {
        name: 'Failed Access Attempts',
        value: status.failedAttempts,
        unit: 'count',
        target: 0
      },
      {
        name: 'Security Incidents',
        value: status.suspiciousActivities,
        unit: 'count',
        target: 0
      }
    ];
  }

  async shutdown(): Promise<void> {
    // Stop monitoring
    // Clear intervals
    
    await Promise.all([
      this.roleManager.shutdown(),
      this.permissionEngine.shutdown(),
      this.sessionManager.shutdown(),
      this.accessValidator.shutdown()
    ]);

    this.emit('shutdown');
  }
}