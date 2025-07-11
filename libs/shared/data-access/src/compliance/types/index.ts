/**
 * IOC Core - Compliance Types
 * Comprehensive type definitions for privacy and regulatory compliance
 */

// Privacy Types
export interface PrivacyPolicy {
  id: string;
  version: string;
  effectiveDate: Date;
  dataCategories: DataCategory[];
  purposes: ProcessingPurpose[];
  retentionPolicies: RetentionPolicy[];
  dataSubjectRights: DataSubjectRight[];
  consentRequirements: ConsentRequirement[];
}

export interface DataCategory {
  id: string;
  name: string;
  type: 'personal' | 'sensitive' | 'anonymous' | 'aggregated';
  subCategories?: string[];
  minimizationRules: MinimizationRule[];
  encryptionRequired: boolean;
  maskingRules?: MaskingRule[];
}

export interface MinimizationRule {
  field: string;
  action: 'remove' | 'hash' | 'encrypt' | 'aggregate' | 'pseudonymize';
  condition?: string;
  schedule?: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

export interface MaskingRule {
  pattern: string;
  replacement: string;
  preserveFormat: boolean;
}

export interface ProcessingPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  dataCategories: string[];
  retention: number; // days
  requiresConsent: boolean;
}

export interface LegalBasis {
  type: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  description: string;
  documentReference?: string;
}

export interface RetentionPolicy {
  id: string;
  dataCategory: string;
  purpose: string;
  retentionPeriod: number; // days
  deletionMethod: 'hard_delete' | 'anonymize' | 'archive';
  automatedDeletion: boolean;
  exceptions?: RetentionException[];
}

export interface RetentionException {
  condition: string;
  additionalPeriod: number;
  reason: string;
  approvalRequired: boolean;
}

export interface DataSubjectRight {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  enabled: boolean;
  automatedProcessing: boolean;
  responseDeadline: number; // days
  verificationRequired: boolean;
}

export interface ConsentRequirement {
  id: string;
  purpose: string;
  dataCategories: string[];
  explicitConsent: boolean;
  withdrawable: boolean;
  granular: boolean;
  ageVerification?: AgeVerification;
}

export interface AgeVerification {
  minimumAge: number;
  verificationMethod: 'self_declaration' | 'document_verification' | 'third_party';
  parentalConsentRequired: boolean;
}

// Access Control Types
export interface AccessControl {
  id: string;
  userId: string;
  roles: Role[];
  permissions: Permission[];
  restrictions: AccessRestriction[];
  sessionConfig: SessionConfig;
  mfaRequired: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  dataAccess: DataAccessRule[];
  inherits?: string[];
}

export interface Permission {
  id: string;
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[];
  conditions?: PermissionCondition[];
  scope?: 'global' | 'organization' | 'team' | 'personal';
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: any;
}

export interface DataAccessRule {
  dataCategory: string;
  accessLevel: 'full' | 'masked' | 'aggregated' | 'none';
  conditions?: AccessCondition[];
  auditRequired: boolean;
}

export interface AccessCondition {
  type: 'time_based' | 'location_based' | 'purpose_based' | 'attribute_based';
  parameters: Record<string, any>;
}

export interface AccessRestriction {
  type: 'ip_whitelist' | 'geo_restriction' | 'time_restriction' | 'device_restriction';
  parameters: Record<string, any>;
  enforced: boolean;
}

export interface SessionConfig {
  timeout: number; // minutes
  absoluteTimeout: number; // minutes
  concurrentSessions: number;
  sessionTracking: boolean;
  deviceFingerprinting: boolean;
}

// Compliance Monitoring Types
export interface ComplianceStatus {
  timestamp: Date;
  overallScore: number;
  regulations: RegulationStatus[];
  violations: ComplianceViolation[];
  risks: ComplianceRisk[];
  recommendations: ComplianceRecommendation[];
}

export interface RegulationStatus {
  regulation: Regulation;
  complianceLevel: number; // 0-100
  requirements: RequirementStatus[];
  lastAudit: Date;
  nextAudit: Date;
}

export interface Regulation {
  id: string;
  name: 'GDPR' | 'HIPAA' | 'CCPA' | 'SOC2' | 'ISO27001' | 'PCI_DSS';
  version: string;
  effectiveDate: Date;
  requirements: Requirement[];
  jurisdictions: string[];
}

export interface Requirement {
  id: string;
  category: string;
  description: string;
  controls: Control[];
  evidence: EvidenceRequirement[];
  automatedChecks: AutomatedCheck[];
}

export interface Control {
  id: string;
  type: 'technical' | 'administrative' | 'physical';
  description: string;
  implementation: string;
  effectiveness: number;
  lastTested: Date;
}

export interface EvidenceRequirement {
  type: string;
  description: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  automated: boolean;
}

export interface AutomatedCheck {
  id: string;
  name: string;
  schedule: string; // cron expression
  query: string;
  threshold: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequirementStatus {
  requirementId: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: Evidence[];
  gaps: string[];
  remediationPlan?: RemediationPlan;
}

export interface Evidence {
  id: string;
  type: string;
  collectedAt: Date;
  source: string;
  data: any;
  verified: boolean;
}

export interface RemediationPlan {
  id: string;
  steps: RemediationStep[];
  estimatedCompletion: Date;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RemediationStep {
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date;
  completedDate?: Date;
}

export interface ComplianceViolation {
  id: string;
  detectedAt: Date;
  regulation: string;
  requirement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedData?: string[];
  remediation: RemediationPlan;
  resolved: boolean;
}

export interface ComplianceRisk {
  id: string;
  category: string;
  description: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskScore: number;
  mitigations: RiskMitigation[];
  residualRisk: number;
}

export interface RiskMitigation {
  id: string;
  description: string;
  effectiveness: number; // 0-100
  implementationStatus: 'planned' | 'in_progress' | 'implemented';
  cost: number;
}

export interface ComplianceRecommendation {
  id: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: string;
  implementation: string;
}

// Data Governance Types
export interface DataGovernance {
  classification: DataClassification;
  lineage: DataLineage;
  quality: DataQuality;
  catalog: DataCatalog;
  stewardship: DataStewardship;
}

export interface DataClassification {
  id: string;
  dataAsset: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
  owner: string;
  reviewDate: Date;
  handlingRequirements: HandlingRequirement[];
}

export interface HandlingRequirement {
  requirement: string;
  applicable: boolean;
  implementation: string;
}

export interface DataLineage {
  id: string;
  source: DataNode;
  transformations: Transformation[];
  destination: DataNode;
  createdAt: Date;
  lastModified: Date;
}

export interface DataNode {
  id: string;
  type: 'database' | 'file' | 'api' | 'stream' | 'application';
  name: string;
  location: string;
  schema?: any;
}

export interface Transformation {
  id: string;
  type: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  privacyImpact?: PrivacyImpact;
}

export interface PrivacyImpact {
  dataMinimization: boolean;
  anonymization: boolean;
  aggregation: boolean;
  encryption: boolean;
}

export interface DataQuality {
  metrics: QualityMetric[];
  rules: QualityRule[];
  issues: QualityIssue[];
  score: number;
}

export interface QualityMetric {
  name: string;
  dimension: 'accuracy' | 'completeness' | 'consistency' | 'timeliness' | 'validity' | 'uniqueness';
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
}

export interface QualityRule {
  id: string;
  name: string;
  type: 'validation' | 'consistency' | 'business';
  expression: string;
  severity: 'info' | 'warning' | 'error';
}

export interface QualityIssue {
  id: string;
  ruleId: string;
  dataAsset: string;
  description: string;
  affectedRecords: number;
  detectedAt: Date;
  status: 'open' | 'investigating' | 'resolved';
}

export interface DataCatalog {
  assets: DataAsset[];
  metadata: MetadataSchema[];
  relationships: AssetRelationship[];
  searchIndex: SearchIndex;
}

export interface DataAsset {
  id: string;
  name: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  tags: string[];
  owner: string;
  created: Date;
  lastModified: Date;
}

export interface MetadataSchema {
  id: string;
  name: string;
  fields: MetadataField[];
  appliesTo: string[];
}

export interface MetadataField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: string;
}

export interface AssetRelationship {
  source: string;
  target: string;
  type: 'depends_on' | 'derives_from' | 'relates_to';
  metadata?: Record<string, any>;
}

export interface SearchIndex {
  assets: string[];
  fields: string[];
  lastUpdated: Date;
}

export interface DataStewardship {
  stewards: DataSteward[];
  responsibilities: StewardResponsibility[];
  activities: StewardActivity[];
}

export interface DataSteward {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'custodian' | 'user';
  dataAssets: string[];
  permissions: string[];
}

export interface StewardResponsibility {
  stewardId: string;
  responsibility: string;
  frequency: string;
  lastCompleted?: Date;
  nextDue: Date;
}

export interface StewardActivity {
  id: string;
  stewardId: string;
  type: string;
  description: string;
  timestamp: Date;
  dataAssets: string[];
}

// Security Framework Types
export interface SecurityFramework {
  encryption: EncryptionConfig;
  keyManagement: KeyManagement;
  networkSecurity: NetworkSecurity;
  vulnerabilityManagement: VulnerabilityManagement;
  incidentResponse: IncidentResponse;
}

export interface EncryptionConfig {
  atRest: EncryptionSettings;
  inTransit: EncryptionSettings;
  keyRotation: KeyRotationPolicy;
  algorithms: EncryptionAlgorithm[];
}

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: string;
  keySize: number;
  mode: string;
}

export interface KeyRotationPolicy {
  frequency: number; // days
  automatic: boolean;
  lastRotation: Date;
  nextRotation: Date;
}

export interface EncryptionAlgorithm {
  name: string;
  type: 'symmetric' | 'asymmetric';
  keySize: number;
  approved: boolean;
  useCase: string[];
}

export interface KeyManagement {
  provider: 'aws_kms' | 'azure_key_vault' | 'gcp_kms' | 'hashicorp_vault' | 'local';
  keys: CryptoKey[];
  policies: KeyPolicy[];
  audit: KeyAuditLog[];
}

export interface CryptoKey {
  id: string;
  name: string;
  type: 'master' | 'data' | 'signing' | 'encryption';
  algorithm: string;
  created: Date;
  expires?: Date;
  status: 'active' | 'expired' | 'revoked' | 'pending_deletion';
}

export interface KeyPolicy {
  keyId: string;
  allowedOperations: string[];
  allowedUsers: string[];
  restrictions: KeyRestriction[];
}

export interface KeyRestriction {
  type: string;
  value: any;
  enforced: boolean;
}

export interface KeyAuditLog {
  timestamp: Date;
  keyId: string;
  operation: string;
  user: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
}

export interface NetworkSecurity {
  firewall: FirewallConfig;
  ids: IntrusionDetection;
  vpn: VPNConfig;
  segmentation: NetworkSegment[];
}

export interface FirewallConfig {
  enabled: boolean;
  rules: FirewallRule[];
  defaultAction: 'allow' | 'deny';
  logging: boolean;
}

export interface FirewallRule {
  id: string;
  priority: number;
  action: 'allow' | 'deny';
  source: string;
  destination: string;
  protocol: string;
  ports: string[];
}

export interface IntrusionDetection {
  enabled: boolean;
  mode: 'detection' | 'prevention';
  rules: IDSRule[];
  alerts: SecurityAlert[];
}

export interface IDSRule {
  id: string;
  name: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'log';
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}

export interface VPNConfig {
  enabled: boolean;
  type: 'site_to_site' | 'remote_access';
  protocol: string;
  encryption: string;
  authentication: string[];
}

export interface NetworkSegment {
  id: string;
  name: string;
  vlan: number;
  subnet: string;
  securityLevel: 'public' | 'dmz' | 'internal' | 'restricted';
  accessControl: NetworkACL[];
}

export interface NetworkACL {
  source: string;
  destination: string;
  allowed: boolean;
  logged: boolean;
}

export interface VulnerabilityManagement {
  scanning: VulnerabilityScanning;
  vulnerabilities: Vulnerability[];
  patches: PatchManagement;
  compliance: VulnerabilityCompliance;
}

export interface VulnerabilityScanning {
  enabled: boolean;
  frequency: string; // cron expression
  scanners: Scanner[];
  lastScan: Date;
  nextScan: Date;
}

export interface Scanner {
  name: string;
  type: 'network' | 'application' | 'container' | 'code';
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface Vulnerability {
  id: string;
  cve?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAssets: string[];
  discoveredAt: Date;
  status: 'open' | 'mitigating' | 'resolved' | 'accepted';
  remediation?: string;
}

export interface PatchManagement {
  policy: PatchPolicy;
  patches: Patch[];
  schedule: PatchSchedule;
}

export interface PatchPolicy {
  autoApprove: boolean;
  testingRequired: boolean;
  rollbackEnabled: boolean;
  maintenanceWindow: MaintenanceWindow;
}

export interface Patch {
  id: string;
  vendor: string;
  product: string;
  version: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  releaseDate: Date;
  appliedDate?: Date;
  status: 'available' | 'testing' | 'approved' | 'applied' | 'failed';
}

export interface PatchSchedule {
  critical: string; // cron expression
  high: string;
  medium: string;
  low: string;
}

export interface MaintenanceWindow {
  dayOfWeek: number;
  startHour: number;
  duration: number; // hours
}

export interface VulnerabilityCompliance {
  slaTargets: SLATarget[];
  metrics: VulnerabilityMetric[];
  exceptions: VulnerabilityException[];
}

export interface SLATarget {
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionTime: number; // hours
  remediationTime: number; // hours
}

export interface VulnerabilityMetric {
  name: string;
  value: number;
  target: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface VulnerabilityException {
  vulnerabilityId: string;
  reason: string;
  approvedBy: string;
  expiresAt: Date;
  compensatingControls: string[];
}

export interface IncidentResponse {
  plan: IncidentResponsePlan;
  team: IncidentResponseTeam;
  incidents: SecurityIncident[];
  playbooks: Playbook[];
}

export interface IncidentResponsePlan {
  version: string;
  lastUpdated: Date;
  phases: IncidentPhase[];
  communicationPlan: CommunicationPlan;
  escalation: EscalationPath[];
}

export interface IncidentPhase {
  name: 'preparation' | 'detection' | 'containment' | 'eradication' | 'recovery' | 'lessons_learned';
  activities: string[];
  responsible: string[];
  timeframe: string;
}

export interface CommunicationPlan {
  internal: CommunicationChannel[];
  external: CommunicationChannel[];
  templates: MessageTemplate[];
}

export interface CommunicationChannel {
  type: 'email' | 'phone' | 'slack' | 'teams' | 'pagerduty';
  contacts: string[];
  priority: 'primary' | 'secondary' | 'tertiary';
}

export interface MessageTemplate {
  id: string;
  name: string;
  audience: 'internal' | 'customers' | 'partners' | 'regulators' | 'media';
  content: string;
  placeholders: string[];
}

export interface EscalationPath {
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeThreshold: number; // minutes
  contacts: EscalationContact[];
}

export interface EscalationContact {
  name: string;
  role: string;
  contactMethods: ContactMethod[];
  availability: string;
}

export interface ContactMethod {
  type: 'email' | 'phone' | 'sms' | 'slack';
  value: string;
  priority: number;
}

export interface IncidentResponseTeam {
  members: TeamMember[];
  roles: TeamRole[];
  training: TrainingRecord[];
  readiness: ReadinessScore;
}

export interface TeamMember {
  id: string;
  name: string;
  roles: string[];
  skills: string[];
  certifications: string[];
  availability: 'on_call' | 'available' | 'unavailable';
}

export interface TeamRole {
  name: string;
  responsibilities: string[];
  requiredSkills: string[];
  backups: string[];
}

export interface TrainingRecord {
  memberId: string;
  training: string;
  completedAt: Date;
  expiresAt?: Date;
  score?: number;
}

export interface ReadinessScore {
  overall: number;
  categories: ReadinessCategory[];
  lastAssessed: Date;
}

export interface ReadinessCategory {
  name: string;
  score: number;
  gaps: string[];
  improvements: string[];
}

export interface SecurityIncident {
  id: string;
  detectedAt: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'triaged' | 'contained' | 'eradicated' | 'recovered' | 'closed';
  affectedSystems: string[];
  timeline: IncidentEvent[];
  rootCause?: string;
  lessonsLearned?: string[];
}

export interface IncidentEvent {
  timestamp: Date;
  phase: string;
  action: string;
  actor: string;
  result: string;
}

export interface Playbook {
  id: string;
  name: string;
  scenario: string;
  steps: PlaybookStep[];
  automation: AutomationRule[];
  lastTested: Date;
}

export interface PlaybookStep {
  order: number;
  name: string;
  description: string;
  responsible: string;
  timeEstimate: number; // minutes
  decision?: DecisionPoint;
}

export interface DecisionPoint {
  question: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  label: string;
  nextStep: number;
  conditions?: string[];
}

export interface AutomationRule {
  trigger: string;
  conditions: string[];
  actions: AutomationAction[];
  enabled: boolean;
}

export interface AutomationAction {
  type: string;
  parameters: Record<string, any>;
  timeout: number;
  failureAction?: string;
}

// Audit Types
export interface AuditLog {
  id: string;
  timestamp: Date;
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  result: AuditResult;
  metadata?: Record<string, any>;
}

export interface AuditActor {
  type: 'user' | 'system' | 'service';
  id: string;
  name: string;
  ip?: string;
  userAgent?: string;
  location?: string;
}

export interface AuditAction {
  type: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'configuration' | 'compliance';
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface AuditResource {
  type: string;
  id: string;
  name: string;
  classification?: string;
  owner?: string;
}

export interface AuditResult {
  status: 'success' | 'failure' | 'partial';
  error?: string;
  affectedRecords?: number;
  changes?: AuditChange[];
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  sensitive: boolean;
}

// Compliance Events
export interface ComplianceEvent {
  id: string;
  timestamp: Date;
  type: ComplianceEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  description: string;
  regulation?: string;
  requirement?: string;
  evidence?: Evidence;
  actions?: ComplianceAction[];
}

export type ComplianceEventType =
  | 'policy_updated'
  | 'consent_granted'
  | 'consent_withdrawn'
  | 'data_request'
  | 'data_deleted'
  | 'breach_detected'
  | 'audit_started'
  | 'audit_completed'
  | 'violation_detected'
  | 'violation_resolved'
  | 'control_failed'
  | 'control_passed';

export interface ComplianceAction {
  type: string;
  description: string;
  automated: boolean;
  executedAt?: Date;
  executedBy?: string;
  result?: 'success' | 'failure' | 'pending';
}

// Reporting Types
export interface ComplianceReport {
  id: string;
  type: 'audit' | 'assessment' | 'certification' | 'executive' | 'regulatory';
  generatedAt: Date;
  period: ReportPeriod;
  regulations: string[];
  summary: ReportSummary;
  details: ReportSection[];
  attestation?: Attestation;
}

export interface ReportPeriod {
  start: Date;
  end: Date;
}

export interface ReportSummary {
  overallCompliance: number;
  criticalIssues: number;
  recommendations: number;
  improvements: number;
  risks: number;
}

export interface ReportSection {
  title: string;
  content: any;
  findings: Finding[];
  metrics: Metric[];
  charts?: Chart[];
}

export interface Finding {
  id: string;
  type: 'compliance' | 'gap' | 'risk' | 'improvement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  recommendation?: string;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface Chart {
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
  title: string;
  data: any;
  options?: any;
}

export interface Attestation {
  attestor: string;
  role: string;
  date: Date;
  statement: string;
  signature?: string;
}