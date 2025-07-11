/**
 * IOC Core - Compliance Module
 * Comprehensive compliance and privacy controls for IOC's meta BI system
 */

// Core exports
export { ComplianceManager, ComplianceConfig } from './core/ComplianceManager';

// Privacy exports
export { PrivacyManager, PrivacyConfig, PrivacyStatus } from './privacy/PrivacyManager';

// Access Control exports
export { 
  AccessControlManager, 
  AccessControlConfig, 
  AccessRequest, 
  AccessDecision,
  AccessStatus 
} from './access/AccessControlManager';

// Monitoring exports
export { 
  ComplianceMonitor, 
  MonitoringConfig, 
  MonitoringStatus 
} from './monitoring/ComplianceMonitor';

// Security exports
export { 
  SecurityManager, 
  SecurityConfig, 
  SecurityStatus 
} from './security/SecurityManager';

// Data Governance exports
export { 
  DataGovernanceManager, 
  GovernanceConfig, 
  GovernanceStatus 
} from './governance/DataGovernanceManager';

// Regulatory exports
export { 
  RegulatoryEngine, 
  RegulatoryConfig, 
  RegulatoryStatus 
} from './regulatory/RegulatoryEngine';

// Type exports
export * from './types';

// Factory function for easy initialization
export function createComplianceSystem(config?: {
  regulations?: string[];
  strictMode?: boolean;
  autoRemediation?: boolean;
  realTimeMonitoring?: boolean;
}) {
  const regulations = config?.regulations || ['GDPR', 'CCPA', 'SOC2'];
  const strictMode = config?.strictMode ?? true;
  const autoRemediation = config?.autoRemediation ?? false;
  const realTimeMonitoring = config?.realTimeMonitoring ?? true;

  return new ComplianceManager({
    regulations,
    strictMode,
    autoRemediation,
    realTimeMonitoring,
    auditRetention: 365, // 1 year
    reportingSchedule: {
      daily: true,
      weekly: true,
      monthly: true,
      quarterly: true
    },
    notifications: {
      violations: true,
      risks: true,
      audits: true,
      reports: true
    }
  });
}

// Compliance status checker
export async function checkComplianceStatus(manager: ComplianceManager): Promise<{
  compliant: boolean;
  score: number;
  issues: string[];
  criticalViolations: number;
  recommendations: string[];
}> {
  const status = await manager.getComplianceStatus();
  
  return {
    compliant: status.overallScore >= 80 && status.violations.filter(v => !v.resolved && v.severity === 'critical').length === 0,
    score: status.overallScore,
    issues: [
      ...status.violations.filter(v => !v.resolved).map(v => v.description),
      ...status.risks.filter(r => r.riskScore >= 15).map(r => r.description)
    ],
    criticalViolations: status.violations.filter(v => !v.resolved && v.severity === 'critical').length,
    recommendations: status.recommendations.map(r => r.description)
  };
}

// Quick compliance report generator
export async function generateQuickReport(manager: ComplianceManager): Promise<{
  timestamp: Date;
  overallScore: number;
  components: {
    privacy: number;
    access: number;
    security: number;
    governance: number;
    regulatory: number;
  };
  topIssues: string[];
  requiredActions: string[];
}> {
  const report = await manager.generateComplianceReport('executive');
  
  return {
    timestamp: report.generatedAt,
    overallScore: report.summary.overallCompliance,
    components: {
      privacy: 0, // These would be extracted from the detailed report
      access: 0,
      security: 0,
      governance: 0,
      regulatory: 0
    },
    topIssues: report.summary.criticalIssues > 0 
      ? [`${report.summary.criticalIssues} critical compliance issues require immediate attention`]
      : [],
    requiredActions: report.details
      .filter((section: any) => section.findings.some((f: any) => f.severity === 'critical'))
      .map((section: any) => section.findings[0].recommendation)
  };
}

// Data subject request handler
export async function handleDataSubjectRequest(
  manager: ComplianceManager,
  request: {
    type: 'access' | 'erasure' | 'portability' | 'rectification' | 'restriction' | 'objection';
    userId: string;
    details?: any;
  }
): Promise<{
  success: boolean;
  requestId: string;
  estimatedCompletion: Date;
  result?: any;
  error?: string;
}> {
  try {
    const result = await manager.processDataSubjectRequest(
      request.type,
      request.userId,
      request.details
    );
    
    return {
      success: true,
      requestId: result.id,
      estimatedCompletion: result.estimatedCompletion || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      requestId: '',
      estimatedCompletion: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Compliance violation handler
export async function handleComplianceViolation(
  manager: ComplianceManager,
  violation: {
    regulation: string;
    requirement: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedData?: string[];
  }
): Promise<{
  violationId: string;
  remediationPlan: {
    steps: string[];
    estimatedCompletion: Date;
    assignedTo: string;
  };
  autoRemediationAttempted: boolean;
  success: boolean;
}> {
  // This would integrate with the ComplianceManager's violation handling
  // For now, returning a mock response
  return {
    violationId: `violation_${Date.now()}`,
    remediationPlan: {
      steps: ['Investigate root cause', 'Implement fix', 'Verify compliance'],
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: 'compliance_team'
    },
    autoRemediationAttempted: false,
    success: true
  };
}

// Compliance middleware for Express/Next.js
export function complianceMiddleware(manager: ComplianceManager) {
  return async (req: any, res: any, next: any) => {
    try {
      // Check access compliance
      const accessDecision = await manager.requestDataAccess(
        req.user?.id || 'anonymous',
        req.method === 'GET' ? 'read' : 'write'
      );
      
      if (!accessDecision) {
        return res.status(403).json({
          error: 'Access denied by compliance policy',
          code: 'COMPLIANCE_ACCESS_DENIED'
        });
      }
      
      // Add compliance headers
      res.setHeader('X-Compliance-Status', 'verified');
      res.setHeader('X-Privacy-Policy', '/privacy');
      res.setHeader('X-Data-Rights', '/data-rights');
      
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Compliance check failed',
        code: 'COMPLIANCE_ERROR'
      });
    }
  };
}

// Compliance React hook helper
export function useCompliance() {
  // This would be implemented as a React hook
  // For now, just exporting the type structure
  return {
    checkCompliance: async (action: string) => true,
    requestDataAccess: async (purpose: string) => true,
    reportViolation: async (violation: any) => ({ success: true }),
    getComplianceStatus: async () => ({ compliant: true, score: 95 })
  };
}

// Compliance monitoring dashboard data
export async function getComplianceDashboardData(manager: ComplianceManager): Promise<{
  metrics: {
    overallScore: number;
    violations: { active: number; resolved: number };
    risks: { high: number; medium: number; low: number };
    dataRequests: { pending: number; completed: number };
  };
  trends: {
    scoreHistory: Array<{ date: Date; score: number }>;
    violationTrend: 'increasing' | 'stable' | 'decreasing';
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  upcomingAudits: Array<{
    regulation: string;
    date: Date;
    scope: string;
  }>;
}> {
  const status = await manager.getComplianceStatus();
  
  return {
    metrics: {
      overallScore: status.overallScore,
      violations: {
        active: status.violations.filter(v => !v.resolved).length,
        resolved: status.violations.filter(v => v.resolved).length
      },
      risks: {
        high: status.risks.filter(r => r.riskScore >= 15).length,
        medium: status.risks.filter(r => r.riskScore >= 10 && r.riskScore < 15).length,
        low: status.risks.filter(r => r.riskScore < 10).length
      },
      dataRequests: {
        pending: 0, // Would come from actual data
        completed: 0
      }
    },
    trends: {
      scoreHistory: [], // Would be populated from historical data
      violationTrend: 'stable'
    },
    alerts: [],
    upcomingAudits: []
  };
}

// Export default compliance instance for immediate use
let defaultComplianceManager: ComplianceManager | null = null;

export function getDefaultComplianceManager(): ComplianceManager {
  if (!defaultComplianceManager) {
    defaultComplianceManager = createComplianceSystem();
  }
  return defaultComplianceManager;
}

// Initialize compliance on import for Next.js
if (typeof window === 'undefined') {
  // Server-side initialization
  getDefaultComplianceManager();
}