# IOC Core - Compliance & Privacy Controls

A comprehensive, production-ready compliance and privacy control system for IOC's meta BI platform. This system ensures bulletproof compliance from day 1 with support for GDPR, HIPAA, CCPA, SOC 2 Type II, and ISO 27001.

## 🎯 Overview

The IOC Compliance System provides:

- **Privacy Controls**: Data minimization, consent management, retention policies, and data subject rights
- **Access Controls**: Role-based access control (RBAC), fine-grained permissions, and session management
- **Compliance Monitoring**: Real-time violation detection, risk assessment, and automated remediation
- **Data Governance**: Classification, lineage tracking, quality monitoring, and stewardship
- **Security Framework**: Encryption, vulnerability management, and incident response
- **Regulatory Compliance**: Multi-regulation support with automated assessments

## 🚀 Quick Start

```typescript
import { createComplianceSystem, checkComplianceStatus } from '@ioc/lib/compliance';

// Initialize the compliance system
const compliance = createComplianceSystem({
  regulations: ['GDPR', 'CCPA', 'SOC2'],
  strictMode: true,
  autoRemediation: true,
  realTimeMonitoring: true
});

// Initialize the system
await compliance.initialize();

// Check compliance status
const status = await checkComplianceStatus(compliance);
console.log(`Compliance Score: ${status.score}%`);
console.log(`Critical Violations: ${status.criticalViolations}`);
```

## 📦 Installation

The compliance system is part of the IOC monorepo. It's automatically available when you import from `@ioc/lib`.

```bash
# From the monorepo root
npm install

# The compliance module is available at
import { ComplianceManager } from '@ioc/lib/compliance';
```

## 🏗️ Architecture

### Core Components

1. **ComplianceManager**: Central orchestrator for all compliance operations
2. **PrivacyManager**: Handles data privacy, consent, and subject rights
3. **AccessControlManager**: Manages authentication, authorization, and sessions
4. **ComplianceMonitor**: Real-time monitoring and violation detection
5. **SecurityManager**: Encryption, vulnerability scanning, and incident response
6. **DataGovernanceManager**: Data classification, lineage, and quality
7. **RegulatoryEngine**: Multi-regulation compliance assessment

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ComplianceManager                         │
│  (Central Orchestrator & Event Coordination)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┬─────────────┬────────────┐
        │                           │             │            │
┌───────▼────────┐     ┌───────────▼──────┐  ┌──▼─────────┐ ┌─▼──────────┐
│ PrivacyManager │     │AccessControlMgr   │  │ Security   │ │Regulatory  │
│                │     │                   │  │ Manager    │ │Engine      │
│ • Consent      │     │ • RBAC/ABAC      │  │            │ │            │
│ • Retention    │     │ • Permissions     │  │ • Encrypt  │ │ • GDPR     │
│ • Rights       │     │ • Sessions        │  │ • Vuln Scan│ │ • HIPAA    │
│ • Minimization │     │ • API Auth        │  │ • Incident │ │ • CCPA     │
└────────────────┘     └───────────────────┘  └────────────┘ └────────────┘
                                │
                      ┌─────────┴──────────┬───────────────┐
                      │                    │               │
              ┌───────▼────────┐  ┌───────▼────────┐  ┌───▼──────────┐
              │ Compliance     │  │ Data           │  │ Audit        │
              │ Monitor        │  │ Governance     │  │ Logger       │
              │                │  │                │  │              │
              │ • Violations   │  │ • Classification│  │ • All Events │
              │ • Risks        │  │ • Lineage      │  │ • Evidence   │
              │ • Alerts       │  │ • Quality      │  │ • Reports    │
              └────────────────┘  └────────────────┘  └──────────────┘
```

## 🔧 Configuration

### Basic Configuration

```typescript
const config = {
  // Regulations to comply with
  regulations: ['GDPR', 'CCPA', 'SOC2', 'HIPAA'],
  
  // Strict mode enforces all controls
  strictMode: true,
  
  // Enable automatic remediation for non-critical issues
  autoRemediation: true,
  
  // Real-time monitoring and alerting
  realTimeMonitoring: true,
  
  // Audit log retention (days)
  auditRetention: 365,
  
  // Reporting schedule
  reportingSchedule: {
    daily: true,
    weekly: true,
    monthly: true,
    quarterly: true
  },
  
  // Notification settings
  notifications: {
    violations: true,
    risks: true,
    audits: true,
    reports: true
  }
};
```

### Advanced Configuration

```typescript
// Privacy configuration
const privacyConfig = {
  defaultRetentionDays: 365,
  consentRequired: true,
  anonymizationEnabled: true,
  dataMinimizationLevel: 'aggressive',
  gdprCompliant: true,
  ccpaCompliant: true,
  childProtection: true,
  minimumAge: 13
};

// Security configuration
const securityConfig = {
  encryptionEnabled: true,
  encryptionAlgorithm: 'aes-256-gcm',
  keyProvider: 'aws_kms',
  keyRotationDays: 90,
  networkMonitoring: true,
  vulnerabilityScanInterval: 24,
  incidentResponseEnabled: true,
  autoPatching: false,
  mfaRequired: true
};

// Access control configuration
const accessConfig = {
  enableRBAC: true,
  enableABAC: true,
  mfaRequired: true,
  sessionTimeout: 30,
  absoluteTimeout: 480,
  maxConcurrentSessions: 3,
  ipWhitelisting: true,
  geoRestriction: true,
  auditAllAccess: true
};
```

## 📋 Features

### 1. Privacy Controls

```typescript
// Handle consent
await compliance.privacyManager.recordConsent({
  userId: 'user123',
  purposes: ['analytics', 'marketing'],
  granted: true
});

// Process data subject request
const result = await compliance.processDataSubjectRequest(
  'erasure', // or 'access', 'portability', 'rectification'
  'user123',
  { reason: 'User requested account deletion' }
);

// Check data retention
await compliance.privacyManager.enforceRetentionPolicies();
```

### 2. Access Control

```typescript
// Check access
const decision = await compliance.accessControlManager.checkAccess({
  userId: 'user123',
  resource: 'sensitive_data',
  action: 'read',
  context: {
    ip: '192.168.1.1',
    sessionId: 'session123',
    timestamp: new Date()
  }
});

if (decision.allowed) {
  // Grant access
  if (decision.mfaRequired) {
    // Require MFA verification
  }
}

// Grant role
await compliance.accessControlManager.grantRole(
  'user123',
  'data_analyst',
  'admin@company.com'
);
```

### 3. Compliance Monitoring

```typescript
// Get real-time status
const status = await compliance.complianceMonitor.getStatus();
console.log(`Active Violations: ${status.activeViolations}`);
console.log(`Compliance Score: ${status.complianceScore}%`);

// Report violation
await compliance.complianceMonitor.createViolation({
  regulation: 'GDPR',
  requirement: 'Data minimization',
  severity: 'high',
  description: 'Collecting unnecessary personal data',
  affectedData: ['user_profiles', 'activity_logs']
});
```

### 4. Data Governance

```typescript
// Classify data asset
await compliance.governanceManager.classifyAsset({
  assetId: 'customer_database',
  classification: 'restricted',
  tags: ['pii', 'financial'],
  owner: 'data_team'
});

// Track data lineage
await compliance.governanceManager.recordLineage({
  source: { type: 'database', name: 'raw_data' },
  transformations: [
    { type: 'anonymization', description: 'PII removed' }
  ],
  destination: { type: 'database', name: 'analytics_db' }
});

// Monitor data quality
const qualityScore = await compliance.governanceManager.assessDataQuality('asset123');
```

### 5. Security Management

```typescript
// Handle security incident
await compliance.securityManager.startIncidentResponse({
  type: 'data_breach',
  severity: 'critical',
  affectedSystems: ['database1', 'api_server'],
  description: 'Unauthorized access detected'
});

// Run vulnerability scan
await compliance.securityManager.runVulnerabilityScan();

// Apply encryption
await compliance.securityManager.applyEncryption({
  target: { data: 'sensitive_data', type: 'database' },
  algorithm: 'aes-256-gcm'
});
```

### 6. Regulatory Compliance

```typescript
// Check specific regulation compliance
const gdprStatus = await compliance.regulatoryEngine.checkCompliance('GDPR');
console.log(`GDPR Compliance: ${gdprStatus.complianceLevel}%`);

// Get automated checks
const checks = await compliance.regulatoryEngine.getAutomatedChecks();

// Generate compliance report
const report = await compliance.generateComplianceReport('regulatory');
```

## 📊 Monitoring & Reporting

### Real-time Dashboard

```typescript
// Get dashboard data
const dashboard = await getComplianceDashboardData(compliance);

// Metrics available:
// - Overall compliance score
// - Active violations by severity
// - Risk heat map
// - Data request queue
// - Upcoming audits
// - Compliance trends
```

### Automated Reports

The system automatically generates:

- **Daily Reports**: Compliance status, new violations, resolved issues
- **Weekly Reports**: Trend analysis, risk assessment, recommendations
- **Monthly Reports**: Detailed compliance assessment, audit preparation
- **Quarterly Reports**: Executive summary, regulatory updates, attestations

### Alerts & Notifications

```typescript
// Subscribe to compliance events
compliance.on('critical_violation', (violation) => {
  // Send immediate alert
  notificationService.sendCriticalAlert({
    type: 'compliance_violation',
    severity: violation.severity,
    description: violation.description,
    requiredAction: violation.remediation
  });
});

compliance.on('high_risk_detected', (risk) => {
  // Handle high-risk situations
});

compliance.on('audit_approaching', (audit) => {
  // Prepare for upcoming audit
});
```

## 🛡️ Security Best Practices

1. **Encryption**: All sensitive data encrypted at rest and in transit
2. **Access Control**: Principle of least privilege enforced
3. **Audit Logging**: Comprehensive logging of all operations
4. **Vulnerability Management**: Regular scans and patching
5. **Incident Response**: Automated response procedures
6. **Key Management**: Secure key storage and rotation

## 🔍 Compliance Checks

### Automated Checks

The system runs continuous automated checks for:

- Data retention compliance
- Access control violations
- Encryption status
- Consent validity
- Data quality metrics
- Security vulnerabilities
- Regulatory requirements

### Manual Assessments

```typescript
// Run manual assessment
const assessment = await compliance.runComplianceAssessment({
  scope: ['privacy', 'security', 'access'],
  depth: 'comprehensive',
  regulations: ['GDPR', 'CCPA']
});

// Review findings
assessment.findings.forEach(finding => {
  console.log(`${finding.severity}: ${finding.description}`);
  console.log(`Recommendation: ${finding.recommendation}`);
});
```

## 🚨 Incident Response

### Automated Response

```typescript
// Configure automated responses
compliance.configureAutoResponse({
  dataBreachDetected: async (incident) => {
    // 1. Contain breach
    await compliance.securityManager.containBreach(incident);
    
    // 2. Preserve evidence
    await compliance.auditLogger.preserveEvidence(incident);
    
    // 3. Notify stakeholders
    await compliance.notifyBreachStakeholders(incident);
    
    // 4. Start investigation
    await compliance.startForensicInvestigation(incident);
  }
});
```

### Manual Response

```typescript
// Handle incident manually
const incident = await compliance.createIncident({
  type: 'unauthorized_access',
  severity: 'high',
  affectedData: ['user_credentials'],
  source: 'external_attack'
});

// Execute response plan
await compliance.executeIncidentResponse(incident.id);
```

## 📈 Metrics & KPIs

The system tracks:

- **Compliance Score**: Overall compliance percentage
- **MTTD**: Mean Time to Detect violations
- **MTTR**: Mean Time to Remediate issues
- **Data Request Response Time**: Average time to fulfill requests
- **Audit Readiness**: Percentage of requirements with current evidence
- **Risk Score**: Aggregate risk across all areas

## 🔄 Integration

### Express Middleware

```typescript
import { complianceMiddleware } from '@ioc/lib/compliance';

app.use(complianceMiddleware(compliance));
```

### Next.js Integration

```typescript
// pages/api/[...].ts
import { withCompliance } from '@ioc/lib/compliance/next';

export default withCompliance(async (req, res) => {
  // Your API logic here
  // Compliance checks already performed
});
```

### React Hook

```typescript
import { useCompliance } from '@ioc/lib/compliance/react';

function MyComponent() {
  const { checkCompliance, reportViolation } = useCompliance();
  
  const handleSensitiveAction = async () => {
    const allowed = await checkCompliance('delete_user_data');
    if (allowed) {
      // Proceed with action
    }
  };
}
```

## 🧪 Testing

```typescript
import { ComplianceTester } from '@ioc/lib/compliance/testing';

describe('Compliance Tests', () => {
  const tester = new ComplianceTester();
  
  it('should enforce data retention', async () => {
    await tester.simulateDataAging(400); // 400 days
    const violations = await tester.checkRetentionViolations();
    expect(violations).toHaveLength(0);
  });
  
  it('should detect unauthorized access', async () => {
    const result = await tester.simulateUnauthorizedAccess({
      userId: 'attacker',
      resource: 'sensitive_data'
    });
    expect(result.blocked).toBe(true);
    expect(result.incidentCreated).toBe(true);
  });
});
```

## 📚 API Reference

### ComplianceManager

```typescript
class ComplianceManager {
  // Initialize the compliance system
  initialize(): Promise<void>
  
  // Get current compliance status
  getComplianceStatus(): Promise<ComplianceStatus>
  
  // Check specific compliance
  checkCompliance(regulation: string, requirement?: string): Promise<boolean>
  
  // Process data subject request
  processDataSubjectRequest(
    type: DSRType,
    userId: string,
    details: any
  ): Promise<DSRResult>
  
  // Generate compliance report
  generateComplianceReport(
    type: ReportType,
    options?: ReportOptions
  ): Promise<ComplianceReport>
  
  // Shutdown the system
  shutdown(): Promise<void>
}
```

## 🔧 Troubleshooting

### Common Issues

1. **High Memory Usage**: Enable caching optimization
2. **Slow Compliance Checks**: Use indexed queries
3. **Missing Evidence**: Configure evidence collectors
4. **False Positives**: Tune detection thresholds

### Debug Mode

```typescript
// Enable debug logging
compliance.enableDebugMode({
  logLevel: 'verbose',
  logDestination: './compliance-debug.log',
  includeStackTraces: true
});
```

## 📄 License

This compliance system is part of the IOC Core framework and follows the same licensing terms.

## 🤝 Contributing

Please refer to the main IOC Core contributing guidelines. All compliance-related changes must:

1. Maintain or improve compliance scores
2. Include comprehensive tests
3. Update relevant documentation
4. Pass security review

## 📞 Support

For compliance-related questions or issues:
- Create an issue in the IOC Core repository
- Contact the compliance team at compliance@iocframework.com
- Refer to the compliance wiki for detailed guides