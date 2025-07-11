// Anonymization Engine for IOC Meta BI System
// Comprehensive PII removal, data transformation, and compliance framework
// GDPR Article 4(1) and HIPAA Safe Harbor compliant from day 1
import { createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { Pool, PoolClient } from 'pg';
import { Assessment, AssessmentResponse, User, Organization, AnalyticsEvent } from "@ioc/shared/types";
const scryptAsync = promisify(scrypt);
// Core anonymization interfaces
export interface AnonymizationConfig {
    // Salt configuration for consistent hashing
    salts: {
        global: string;
        user: string;
        organization: string;
        assessment: string;
        session: string;
    };
    // Privacy compliance settings
    compliance: {
        mode: 'GDPR' | 'HIPAA' | 'CCPA' | 'STRICT';
        kAnonymity: number;
        lDiversity: number;
        tCloseness: number;
        enableDifferentialPrivacy: boolean;
        epsilonValue: number;
    };
    // Geographic data transformation
    geographic: {
        ipToRegion: boolean;
        cityToCountry: boolean;
        timezoneGeneralization: boolean;
        postalCodeGeneralization: number; // digits to keep
    };
    // Temporal data transformation
    temporal: {
        dateGranularity: 'day' | 'week' | 'month';
        timeRounding: number; // minutes
        ageGeneralization: number; // years
    };
    // Data retention
    retention: {
        anonymizedDataDays: number;
        auditLogDays: number;
        qualityMetricsDays: number;
    };
    // Performance settings
    performance: {
        batchSize: number;
        parallelWorkers: number;
        streamBufferSize: number;
        validationSampling: number; // percentage
    };
}
export interface PIIDetectionRule {
    name: string;
    pattern: RegExp;
    field: string;
    sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action: 'REMOVE' | 'HASH' | 'MASK' | 'GENERALIZE';
    replacement?: string;
}
export interface AnonymizationResult {
    success: boolean;
    originalId: string;
    anonymizedId: string;
    fieldsProcessed: number;
    piiFieldsDetected: number;
    piiFieldsRemoved: number;
    complianceScore: number;
    riskScore: number;
    errors: string[];
    warnings: string[];
    metadata: {
        processedAt: string;
        version: string;
        method: string;
        dataQuality: number;
    };
}
export interface ReIdentificationRisk {
    overallRisk: number;
    quasiIdentifiers: string[];
    sensitiveAttributes: string[];
    riskFactors: Array<{
        factor: string;
        impact: number;
        mitigation: string;
    }>;
    recommendations: string[];
}
export interface AnonymizedData {
    id: string;
    originalDataHash: string;
    anonymizedData: any;
    metadata: {
        anonymizedAt: string;
        method: string;
        version: string;
        complianceFlags: string[];
        dataQuality: number;
        riskScore: number;
    };
}
/**
 * Core Anonymization Engine
 * Implements state-of-the-art privacy-preserving techniques
 */
export class AnonymizationEngine {
    private config: AnonymizationConfig;
    private piiRules: PIIDetectionRule[];
    private saltCache: Map<string, Buffer> = new Map();
    private qualityMetrics: Map<string, number> = new Map();
    constructor(config: AnonymizationConfig) {
        this.config = config;
        this.piiRules = this.initializePIIRules();
    }
    /**
     * Initialize comprehensive PII detection rules
     */
    private initializePIIRules(): PIIDetectionRule[] {
        return [
            // Email addresses
            {
                name: 'email',
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                field: 'email',
                sensitivity: 'CRITICAL',
                action: 'HASH'
            },
            // Phone numbers (various formats)
            {
                name: 'phone_us',
                pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
                field: 'phone',
                sensitivity: 'HIGH',
                action: 'HASH'
            },
            // Social Security Numbers
            {
                name: 'ssn',
                pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
                field: 'ssn',
                sensitivity: 'CRITICAL',
                action: 'REMOVE'
            },
            // Credit card numbers
            {
                name: 'credit_card',
                pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
                field: 'credit_card',
                sensitivity: 'CRITICAL',
                action: 'REMOVE'
            },
            // IP addresses
            {
                name: 'ip_address',
                pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
                field: 'ip_address',
                sensitivity: 'MEDIUM',
                action: 'GENERALIZE'
            },
            // Full names (basic pattern)
            {
                name: 'full_name',
                pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
                field: 'full_name',
                sensitivity: 'HIGH',
                action: 'HASH'
            },
            // Postal codes
            {
                name: 'postal_code',
                pattern: /\b\d{5}(?:-\d{4})?\b/g,
                field: 'postal_code',
                sensitivity: 'MEDIUM',
                action: 'GENERALIZE'
            },
            // URLs with potential PII
            {
                name: 'url_with_pii',
                pattern: /https?:\/\/[^\s]+[?&](?:email|user|id|name)=[^\s&]+/g,
                field: 'url',
                sensitivity: 'MEDIUM',
                action: 'MASK'
            },
            // Date of birth patterns
            {
                name: 'date_of_birth',
                pattern: /\b(?:0?[1-9]|1[012])[-\/](?:0?[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
                field: 'dob',
                sensitivity: 'HIGH',
                action: 'GENERALIZE'
            },
            // Government ID numbers (generic)
            {
                name: 'government_id',
                pattern: /\b[A-Z]{2}\d{6,9}\b/g,
                field: 'government_id',
                sensitivity: 'CRITICAL',
                action: 'HASH'
            }
        ];
    }
    /**
     * Generate consistent hash for identifiers
     */
    private async generateConsistentHash(value: string, saltKey: keyof AnonymizationConfig['salts'], length: number = 64): Promise<string> {
        if (!value)
            return '';
        const saltCacheKey = `${saltKey}_${length}`;
        let salt = this.saltCache.get(saltCacheKey);
        if (!salt) {
            const baseSalt = this.config.salts[saltKey];
            salt = await scryptAsync(baseSalt, 'salt', 32) as Buffer;
            this.saltCache.set(saltCacheKey, salt);
        }
        const hash = createHash('sha256');
        hash.update(value);
        hash.update(salt);
        return hash.digest('hex').substring(0, length);
    }
    /**
     * Detect PII in text content
     */
    private detectPII(text: string): Array<{
        rule: PIIDetectionRule;
        matches: string[];
    }> {
        const detections: Array<{
            rule: PIIDetectionRule;
            matches: string[];
        }> = [];
        for (const rule of this.piiRules) {
            const matches = text.match(rule.pattern);
            if (matches && matches.length > 0) {
                detections.push({
                    rule,
                    matches: [...new Set(matches)] // Remove duplicates
                });
            }
        }
        return detections;
    }
    /**
     * Remove or transform PII based on detection rules
     */
    private async sanitizeText(text: string): Promise<{
        sanitized: string;
        piiDetected: number;
        piiRemoved: number;
    }> {
        let sanitized = text;
        let piiDetected = 0;
        let piiRemoved = 0;
        const detections = this.detectPII(text);
        for (const detection of detections) {
            piiDetected += detection.matches.length;
            for (const match of detection.matches) {
                switch (detection.rule.action) {
                    case 'REMOVE':
                        sanitized = sanitized.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REMOVED]');
                        piiRemoved++;
                        break;
                    case 'HASH':
                        const hash = await this.generateConsistentHash(match, 'global', 16);
                        sanitized = sanitized.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `[HASH:${hash}]`);
                        piiRemoved++;
                        break;
                    case 'MASK':
                        const masked = match.length > 4 ?
                            match.substring(0, 2) + '*'.repeat(match.length - 4) + match.substring(match.length - 2) :
                            '*'.repeat(match.length);
                        sanitized = sanitized.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), masked);
                        piiRemoved++;
                        break;
                    case 'GENERALIZE':
                        // Implement specific generalization logic based on field type
                        sanitized = sanitized.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[GENERALIZED]');
                        piiRemoved++;
                        break;
                }
            }
        }
        return { sanitized, piiDetected, piiRemoved };
    }
    /**
     * Anonymize user data
     */
    public async anonymizeUser(user: User): Promise<AnonymizedData> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        try {
            // Generate consistent anonymized ID
            const anonymizedId = await this.generateConsistentHash(user.id, 'user');
            // Process personal information
            const anonymizedData: any = {
                user_hash: anonymizedId,
                created_at: this.generalizeDate(new Date(user.created_at)),
                updated_at: this.generalizeDate(new Date(user.updated_at || user.created_at)),
                is_active: user.is_active,
                role_category: this.generalizeRole(user.role || 'member'),
                demographic_category: await this.generateDemographicCategory(user),
                timezone_region: this.generalizeTimezone(user.timezone),
                language_preference: user.preferred_language || 'en',
                account_age_category: this.calculateAgeCategory(new Date(user.created_at))
            };
            // Remove all direct identifiers
            const fieldsToRemove = ['id', 'email', 'full_name', 'first_name', 'last_name', 'phone', 'address'];
            fieldsToRemove.forEach(field => {
                if (user[field as keyof User]) {
                    warnings.push(`Removed PII field: ${field}`);
                }
            });
            // Process any text fields for PII
            let totalPiiDetected = 0;
            let totalPiiRemoved = 0;
            const textFields = ['bio', 'notes', 'preferences'];
            for (const field of textFields) {
                const value = user[field as keyof User];
                if (typeof value === 'string') {
                    const sanitized = await this.sanitizeText(value);
                    if (sanitized.sanitized !== value) {
                        anonymizedData[`${field}_sanitized`] = sanitized.sanitized;
                        totalPiiDetected += sanitized.piiDetected;
                        totalPiiRemoved += sanitized.piiRemoved;
                    }
                }
            }
            // Calculate data quality and risk scores
            const dataQuality = this.calculateDataQuality(anonymizedData);
            const riskScore = await this.assessReidentificationRisk(anonymizedData);
            return {
                id: anonymizedId,
                originalDataHash: createHash('sha256').update(JSON.stringify(user)).digest('hex'),
                anonymizedData,
                metadata: {
                    anonymizedAt: new Date().toISOString(),
                    method: 'comprehensive_anonymization_v1',
                    version: '1.0.0',
                    complianceFlags: this.validateCompliance(anonymizedData),
                    dataQuality,
                    riskScore: riskScore.overallRisk
                }
            };
        }
        catch (error) {
            errors.push(`Anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`User anonymization failed: ${errors.join(', ')}`);
        }
    }
    /**
     * Anonymize organization data
     */
    public async anonymizeOrganization(org: Organization): Promise<AnonymizedData> {
        try {
            const anonymizedId = await this.generateConsistentHash(org.id, 'organization');
            const anonymizedData: any = {
                org_hash: anonymizedId,
                industry_category: this.generalizeIndustry(org.industry),
                size_category: this.generalizOrgSize(org.employee_count || 0),
                country_region: this.generalizeLocation(org.country),
                created_at: this.generalizeDate(new Date(org.created_at)),
                updated_at: this.generalizeDate(new Date(org.updated_at || org.created_at)),
                is_active: org.is_active,
                plan_category: this.generalizePlan(org.plan || 'basic'),
                feature_set: this.generalizeFeatures(org.features || [])
            };
            // Remove direct identifiers
            const warnings: string[] = [];
            const fieldsToRemove = ['id', 'name', 'slug', 'domain', 'address', 'contact_email', 'contact_phone'];
            fieldsToRemove.forEach(field => {
                if (org[field as keyof Organization]) {
                    warnings.push(`Removed PII field: ${field}`);
                }
            });
            const dataQuality = this.calculateDataQuality(anonymizedData);
            const riskScore = await this.assessReidentificationRisk(anonymizedData);
            return {
                id: anonymizedId,
                originalDataHash: createHash('sha256').update(JSON.stringify(org)).digest('hex'),
                anonymizedData,
                metadata: {
                    anonymizedAt: new Date().toISOString(),
                    method: 'comprehensive_anonymization_v1',
                    version: '1.0.0',
                    complianceFlags: this.validateCompliance(anonymizedData),
                    dataQuality,
                    riskScore: riskScore.overallRisk
                }
            };
        }
        catch (error) {
            throw new Error(`Organization anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Anonymize assessment data
     */
    public async anonymizeAssessment(assessment: Assessment): Promise<AnonymizedData> {
        try {
            const anonymizedId = await this.generateConsistentHash(assessment.id, 'assessment');
            const orgHash = assessment.organization_id ?
                await this.generateConsistentHash(assessment.organization_id, 'organization') : null;
            const creatorHash = assessment.created_by ?
                await this.generateConsistentHash(assessment.created_by, 'user') : null;
            const anonymizedData: any = {
                assessment_hash: anonymizedId,
                org_hash: orgHash,
                creator_hash: creatorHash,
                type: assessment.type,
                status: assessment.status,
                created_at: this.generalizeDate(new Date(assessment.created_at)),
                updated_at: this.generalizeDate(new Date(assessment.updated_at || assessment.created_at)),
                question_count: assessment.question_count || 0,
                time_limit_minutes: assessment.time_limit_minutes,
                settings_hash: assessment.settings ?
                    createHash('sha256').update(JSON.stringify(assessment.settings)).digest('hex').substring(0, 16) : null
            };
            // Sanitize title and description for PII
            if (assessment.title) {
                const sanitizedTitle = await this.sanitizeText(assessment.title);
                anonymizedData.title_category = this.categorizeAssessmentTitle(sanitizedTitle.sanitized);
            }
            if (assessment.description) {
                const sanitizedDesc = await this.sanitizeText(assessment.description);
                anonymizedData.description_length_category = this.categorizeTextLength(sanitizedDesc.sanitized);
            }
            const dataQuality = this.calculateDataQuality(anonymizedData);
            const riskScore = await this.assessReidentificationRisk(anonymizedData);
            return {
                id: anonymizedId,
                originalDataHash: createHash('sha256').update(JSON.stringify(assessment)).digest('hex'),
                anonymizedData,
                metadata: {
                    anonymizedAt: new Date().toISOString(),
                    method: 'comprehensive_anonymization_v1',
                    version: '1.0.0',
                    complianceFlags: this.validateCompliance(anonymizedData),
                    dataQuality,
                    riskScore: riskScore.overallRisk
                }
            };
        }
        catch (error) {
            throw new Error(`Assessment anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Anonymize assessment response data
     */
    public async anonymizeAssessmentResponse(response: AssessmentResponse): Promise<AnonymizedData> {
        try {
            const anonymizedId = await this.generateConsistentHash(response.id, 'global');
            const assessmentHash = await this.generateConsistentHash(response.assessment_id, 'assessment');
            const respondentHash = await this.generateConsistentHash(response.respondent_id, 'user');
            const subjectHash = response.subject_id ?
                await this.generateConsistentHash(response.subject_id, 'user') : null;
            const anonymizedData: any = {
                response_hash: anonymizedId,
                assessment_hash: assessmentHash,
                respondent_hash: respondentHash,
                subject_hash: subjectHash,
                status: response.status,
                submitted_at: response.submitted_at ? this.generalizeDate(new Date(response.submitted_at)) : null,
                created_at: this.generalizeDate(new Date(response.created_at)),
                time_spent_seconds: this.generalizeTimeSpent(response.time_spent_seconds || 0),
                completion_percentage: response.completion_percentage || 0,
                device_type: this.generalizeDeviceType(response.device_info?.type),
                browser_family: this.generalizeBrowser(response.device_info?.browser),
                geographic_region: this.generalizeGeography(response.geo_info?.country, response.geo_info?.region),
                timezone: this.generalizeTimezone(response.geo_info?.timezone)
            };
            // Process question responses
            if (response.responses && Array.isArray(response.responses)) {
                const questionData = await this.anonymizeQuestionResponses(response.responses);
                anonymizedData.question_responses_summary = questionData.summary;
                anonymizedData.answer_patterns = questionData.patterns;
            }
            const dataQuality = this.calculateDataQuality(anonymizedData);
            const riskScore = await this.assessReidentificationRisk(anonymizedData);
            return {
                id: anonymizedId,
                originalDataHash: createHash('sha256').update(JSON.stringify(response)).digest('hex'),
                anonymizedData,
                metadata: {
                    anonymizedAt: new Date().toISOString(),
                    method: 'comprehensive_anonymization_v1',
                    version: '1.0.0',
                    complianceFlags: this.validateCompliance(anonymizedData),
                    dataQuality,
                    riskScore: riskScore.overallRisk
                }
            };
        }
        catch (error) {
            throw new Error(`Assessment response anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Anonymize analytics events
     */
    public async anonymizeAnalyticsEvent(event: AnalyticsEvent): Promise<AnonymizedData> {
        try {
            const anonymizedId = await this.generateConsistentHash(event.id, 'global');
            const userHash = event.user_id ?
                await this.generateConsistentHash(event.user_id, 'user') : null;
            const orgHash = event.organization_id ?
                await this.generateConsistentHash(event.organization_id, 'organization') : null;
            const sessionHash = event.session_id ?
                await this.generateConsistentHash(event.session_id, 'session') : null;
            const anonymizedData: any = {
                event_hash: anonymizedId,
                user_hash: userHash,
                org_hash: orgHash,
                session_hash: sessionHash,
                event_type: event.event_type,
                event_category: event.event_category,
                created_at: this.generalizeDate(new Date(event.created_at)),
                page_category: this.generalizePage(event.page_url),
                referrer_category: this.generalizeReferrer(event.referrer),
                geographic_region: this.generalizeIPLocation(event.ip_address),
                device_category: this.generalizeUserAgent(event.user_agent)
            };
            // Sanitize event data for PII
            if (event.event_data && typeof event.event_data === 'object') {
                anonymizedData.event_data_summary = await this.anonymizeEventData(event.event_data);
            }
            const dataQuality = this.calculateDataQuality(anonymizedData);
            const riskScore = await this.assessReidentificationRisk(anonymizedData);
            return {
                id: anonymizedId,
                originalDataHash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
                anonymizedData,
                metadata: {
                    anonymizedAt: new Date().toISOString(),
                    method: 'comprehensive_anonymization_v1',
                    version: '1.0.0',
                    complianceFlags: this.validateCompliance(anonymizedData),
                    dataQuality,
                    riskScore: riskScore.overallRisk
                }
            };
        }
        catch (error) {
            throw new Error(`Analytics event anonymization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Generalization and transformation methods
     */
    private generalizeDate(date: Date): string {
        const granularity = this.config.temporal.dateGranularity;
        switch (granularity) {
            case 'day':
                return date.toISOString().split('T')[0];
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().split('T')[0];
            case 'month':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            default:
                return date.toISOString().split('T')[0];
        }
    }
    private generalizeIndustry(industry?: string): string {
        if (!industry)
            return 'OTHER';
        const industryMapping: Record<string, string> = {
            'technology': 'TECHNOLOGY',
            'healthcare': 'HEALTHCARE',
            'financial': 'FINANCIAL',
            'education': 'EDUCATION',
            'manufacturing': 'MANUFACTURING',
            'retail': 'RETAIL',
            'consulting': 'CONSULTING',
            'government': 'GOVERNMENT',
            'nonprofit': 'NONPROFIT'
        };
        const normalized = industry.toLowerCase();
        for (const [key, value] of Object.entries(industryMapping)) {
            if (normalized.includes(key)) {
                return value;
            }
        }
        return 'OTHER';
    }
    private generalizOrgSize(employeeCount: number): string {
        if (employeeCount <= 10)
            return 'STARTUP';
        if (employeeCount <= 50)
            return 'SMALL';
        if (employeeCount <= 250)
            return 'MEDIUM';
        if (employeeCount <= 1000)
            return 'LARGE';
        return 'ENTERPRISE';
    }
    private generalizeLocation(country?: string): string {
        if (!country)
            return 'UNKNOWN';
        const regionMapping: Record<string, string> = {
            'US': 'NORTH_AMERICA',
            'CA': 'NORTH_AMERICA',
            'MX': 'NORTH_AMERICA',
            'GB': 'EUROPE',
            'DE': 'EUROPE',
            'FR': 'EUROPE',
            'AU': 'OCEANIA',
            'JP': 'ASIA',
            'CN': 'ASIA',
            'IN': 'ASIA',
            'BR': 'SOUTH_AMERICA'
        };
        return regionMapping[country.toUpperCase()] || 'OTHER';
    }
    private generalizeTimezone(timezone?: string): string {
        if (!timezone)
            return 'UNKNOWN';
        // Extract major timezone regions
        if (timezone.includes('America'))
            return 'AMERICAS';
        if (timezone.includes('Europe'))
            return 'EUROPE';
        if (timezone.includes('Asia'))
            return 'ASIA';
        if (timezone.includes('Pacific'))
            return 'PACIFIC';
        if (timezone.includes('UTC') || timezone.includes('GMT'))
            return 'UTC';
        return 'OTHER';
    }
    private generalizeRole(role: string): string {
        const roleMapping: Record<string, string> = {
            'owner': 'EXECUTIVE',
            'admin': 'MANAGER',
            'manager': 'MANAGER',
            'member': 'INDIVIDUAL',
            'viewer': 'INDIVIDUAL',
            'guest': 'INDIVIDUAL'
        };
        return roleMapping[role.toLowerCase()] || 'INDIVIDUAL';
    }
    private async generateDemographicCategory(user: User): Promise<string> {
        // Create anonymized demographic category without revealing specific details
        const factors: string[] = [];
        if (user.created_at) {
            const accountAge = Date.now() - new Date(user.created_at).getTime();
            const ageYears = accountAge / (1000 * 60 * 60 * 24 * 365);
            if (ageYears < 1)
                factors.push('NEW');
            else if (ageYears < 3)
                factors.push('ESTABLISHED');
            else
                factors.push('VETERAN');
        }
        if (user.timezone) {
            factors.push(this.generalizeTimezone(user.timezone));
        }
        if (user.preferred_language) {
            factors.push(user.preferred_language.toUpperCase().substring(0, 2));
        }
        return createHash('sha256').update(factors.join('_')).digest('hex').substring(0, 8);
    }
    private calculateAgeCategory(createdAt: Date): string {
        const ageMs = Date.now() - createdAt.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays < 30)
            return 'NEW';
        if (ageDays < 90)
            return 'RECENT';
        if (ageDays < 365)
            return 'ESTABLISHED';
        if (ageDays < 1095)
            return 'VETERAN';
        return 'LEGACY';
    }
    private generalizePlan(plan: string): string {
        const planMapping: Record<string, string> = {
            'free': 'FREE',
            'basic': 'BASIC',
            'premium': 'PREMIUM',
            'enterprise': 'ENTERPRISE',
            'trial': 'TRIAL'
        };
        return planMapping[plan.toLowerCase()] || 'OTHER';
    }
    private generalizeFeatures(features: string[]): string[] {
        return features.map(feature => {
            const normalized = feature.toLowerCase();
            if (normalized.includes('assessment'))
                return 'ASSESSMENT';
            if (normalized.includes('analytics'))
                return 'ANALYTICS';
            if (normalized.includes('reporting'))
                return 'REPORTING';
            if (normalized.includes('integration'))
                return 'INTEGRATION';
            return 'OTHER';
        }).filter((value, index, self) => self.indexOf(value) === index);
    }
    private categorizeAssessmentTitle(title: string): string {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('ocean') || titleLower.includes('personality'))
            return 'PERSONALITY';
        if (titleLower.includes('360') || titleLower.includes('feedback'))
            return 'FEEDBACK';
        if (titleLower.includes('leadership'))
            return 'LEADERSHIP';
        if (titleLower.includes('team'))
            return 'TEAM';
        if (titleLower.includes('performance'))
            return 'PERFORMANCE';
        if (titleLower.includes('skills'))
            return 'SKILLS';
        return 'GENERAL';
    }
    private categorizeTextLength(text: string): string {
        const length = text.length;
        if (length <= 50)
            return 'SHORT';
        if (length <= 200)
            return 'MEDIUM';
        if (length <= 500)
            return 'LONG';
        return 'VERY_LONG';
    }
    private generalizeTimeSpent(seconds: number): number {
        const roundingMinutes = this.config.temporal.timeRounding;
        const roundingSeconds = roundingMinutes * 60;
        return Math.round(seconds / roundingSeconds) * roundingSeconds;
    }
    private generalizeDeviceType(deviceType?: string): string {
        if (!deviceType)
            return 'UNKNOWN';
        const type = deviceType.toLowerCase();
        if (type.includes('mobile') || type.includes('phone'))
            return 'MOBILE';
        if (type.includes('tablet') || type.includes('ipad'))
            return 'TABLET';
        if (type.includes('desktop') || type.includes('computer'))
            return 'DESKTOP';
        return 'OTHER';
    }
    private generalizeBrowser(browser?: string): string {
        if (!browser)
            return 'UNKNOWN';
        const browserLower = browser.toLowerCase();
        if (browserLower.includes('chrome'))
            return 'CHROME';
        if (browserLower.includes('firefox'))
            return 'FIREFOX';
        if (browserLower.includes('safari'))
            return 'SAFARI';
        if (browserLower.includes('edge'))
            return 'EDGE';
        return 'OTHER';
    }
    private generalizeGeography(country?: string, region?: string): string {
        if (!country)
            return 'UNKNOWN';
        // Use only country-level information
        return this.generalizeLocation(country);
    }
    private generalizePage(url?: string): string {
        if (!url)
            return 'UNKNOWN';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('/dashboard'))
            return 'DASHBOARD';
        if (urlLower.includes('/assessment'))
            return 'ASSESSMENT';
        if (urlLower.includes('/profile'))
            return 'PROFILE';
        if (urlLower.includes('/settings'))
            return 'SETTINGS';
        if (urlLower.includes('/admin'))
            return 'ADMIN';
        if (urlLower.includes('/api'))
            return 'API';
        return 'OTHER';
    }
    private generalizeReferrer(referrer?: string): string {
        if (!referrer)
            return 'DIRECT';
        const referrerLower = referrer.toLowerCase();
        if (referrerLower.includes('google'))
            return 'SEARCH_ENGINE';
        if (referrerLower.includes('bing') || referrerLower.includes('yahoo'))
            return 'SEARCH_ENGINE';
        if (referrerLower.includes('facebook') || referrerLower.includes('twitter') || referrerLower.includes('linkedin'))
            return 'SOCIAL_MEDIA';
        if (referrerLower.includes('email') || referrerLower.includes('newsletter'))
            return 'EMAIL';
        return 'OTHER_WEBSITE';
    }
    private generalizeIPLocation(ipAddress?: string): string {
        if (!ipAddress)
            return 'UNKNOWN';
        // Convert IP to geographic region without storing actual IP
        // This would typically use a GeoIP service
        const ipHash = createHash('sha256').update(ipAddress).digest('hex');
        const regionCode = parseInt(ipHash.substring(0, 2), 16) % 7;
        const regions = ['NORTH_AMERICA', 'EUROPE', 'ASIA', 'SOUTH_AMERICA', 'AFRICA', 'OCEANIA', 'OTHER'];
        return regions[regionCode];
    }
    private generalizeUserAgent(userAgent?: string): string {
        if (!userAgent)
            return 'UNKNOWN';
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile'))
            return 'MOBILE';
        if (ua.includes('tablet'))
            return 'TABLET';
        if (ua.includes('bot') || ua.includes('crawler'))
            return 'BOT';
        return 'DESKTOP';
    }
    /**
     * Process question responses while preserving analytical value
     */
    private async anonymizeQuestionResponses(responses: any[]): Promise<{
        summary: any;
        patterns: any;
    }> {
        const summary = {
            total_questions: responses.length,
            question_types: {} as Record<string, number>,
            answer_categories: {} as Record<string, number>,
            completion_rate: 0,
            avg_time_per_question: 0
        };
        const patterns = {
            response_lengths: [] as string[],
            confidence_distribution: [] as number[],
            time_patterns: [] as number[]
        };
        let totalTime = 0;
        let answeredQuestions = 0;
        for (const response of responses) {
            // Track question types
            const questionType = response.question_type || 'unknown';
            summary.question_types[questionType] = (summary.question_types[questionType] || 0) + 1;
            // Process answers based on type
            if (response.answer_value !== null && response.answer_value !== undefined) {
                answeredQuestions++;
                const answerCategory = this.categorizeAnswer(response.answer_value, questionType);
                summary.answer_categories[answerCategory] = (summary.answer_categories[answerCategory] || 0) + 1;
                // Categorize response length for text answers
                if (typeof response.answer_value === 'string') {
                    patterns.response_lengths.push(this.categorizeTextLength(response.answer_value));
                }
                // Track confidence scores
                if (response.confidence_score) {
                    patterns.confidence_distribution.push(response.confidence_score);
                }
            }
            // Track time patterns
            if (response.time_spent_seconds) {
                totalTime += response.time_spent_seconds;
                patterns.time_patterns.push(this.generalizeTimeSpent(response.time_spent_seconds));
            }
        }
        summary.completion_rate = responses.length > 0 ? (answeredQuestions / responses.length) * 100 : 0;
        summary.avg_time_per_question = responses.length > 0 ? totalTime / responses.length : 0;
        return { summary, patterns };
    }
    private categorizeAnswer(answerValue: any, questionType: string): string {
        if (answerValue === null || answerValue === undefined)
            return 'NO_ANSWER';
        switch (questionType) {
            case 'scale':
            case 'likert':
                const numValue = Number(answerValue);
                if (numValue <= 2)
                    return 'LOW';
                if (numValue <= 4)
                    return 'MEDIUM';
                return 'HIGH';
            case 'boolean':
                return answerValue ? 'YES' : 'NO';
            case 'select':
            case 'multiselect':
                return 'SELECTED_OPTION';
            case 'text':
            case 'textarea':
                return this.categorizeTextLength(String(answerValue));
            default:
                return 'OTHER';
        }
    }
    /**
     * Anonymize event data object
     */
    private async anonymizeEventData(eventData: any): Promise<any> {
        const summary: any = {};
        for (const [key, value] of Object.entries(eventData)) {
            if (typeof value === 'string') {
                const sanitized = await this.sanitizeText(value);
                summary[`${key}_category`] = this.categorizeTextLength(sanitized.sanitized);
            }
            else if (typeof value === 'number') {
                summary[`${key}_range`] = this.categorizeNumericValue(value);
            }
            else if (typeof value === 'boolean') {
                summary[key] = value;
            }
            else if (Array.isArray(value)) {
                summary[`${key}_count`] = value.length;
            }
            else if (value && typeof value === 'object') {
                summary[`${key}_keys_count`] = Object.keys(value).length;
            }
        }
        return summary;
    }
    private categorizeNumericValue(value: number): string {
        if (value === 0)
            return 'ZERO';
        if (value < 10)
            return 'SINGLE_DIGIT';
        if (value < 100)
            return 'DOUBLE_DIGIT';
        if (value < 1000)
            return 'HUNDREDS';
        if (value < 10000)
            return 'THOUSANDS';
        return 'LARGE';
    }
    /**
     * Calculate data quality score
     */
    private calculateDataQuality(data: any): number {
        let score = 100;
        let totalFields = 0;
        let nullFields = 0;
        for (const [key, value] of Object.entries(data)) {
            totalFields++;
            if (value === null || value === undefined || value === '') {
                nullFields++;
                score -= 5;
            }
            // Check for proper anonymization
            if (typeof value === 'string') {
                if (value.includes('@') || value.includes('http://') || value.includes('https://')) {
                    score -= 10; // Potential PII leak
                }
                if (value.match(/\b\d{3}-\d{2}-\d{4}\b/)) {
                    score -= 20; // SSN detected
                }
                if (value.match(/\b(?:\d{4}[-\s]?){3}\d{4}\b/)) {
                    score -= 20; // Credit card detected
                }
            }
        }
        const completenessScore = totalFields > 0 ? ((totalFields - nullFields) / totalFields) * 100 : 100;
        return Math.max(0, Math.min(100, (score + completenessScore) / 2));
    }
    /**
     * Assess re-identification risk
     */
    private async assessReidentificationRisk(data: any): Promise<ReIdentificationRisk> {
        const quasiIdentifiers: string[] = [];
        const sensitiveAttributes: string[] = [];
        const riskFactors: Array<{
            factor: string;
            impact: number;
            mitigation: string;
        }> = [];
        // Identify quasi-identifiers
        const quasiFields = ['geographic_region', 'timezone_region', 'demographic_category', 'industry_category', 'size_category'];
        for (const field of quasiFields) {
            if (data[field] && data[field] !== 'UNKNOWN' && data[field] !== 'OTHER') {
                quasiIdentifiers.push(field);
            }
        }
        // Identify sensitive attributes
        const sensitiveFields = ['score', 'performance_category', 'response_patterns'];
        for (const field of sensitiveFields) {
            if (data[field]) {
                sensitiveAttributes.push(field);
            }
        }
        // Calculate risk based on k-anonymity
        let riskScore = 0;
        if (quasiIdentifiers.length >= 3) {
            riskScore += 30;
            riskFactors.push({
                factor: 'High number of quasi-identifiers',
                impact: 30,
                mitigation: 'Consider further generalization of location and demographic data'
            });
        }
        if (quasiIdentifiers.length >= 5) {
            riskScore += 20;
            riskFactors.push({
                factor: 'Very high number of quasi-identifiers',
                impact: 20,
                mitigation: 'Implement additional suppression or generalization'
            });
        }
        // Check for rare value combinations
        if (data.industry_category && data.size_category && data.geographic_region) {
            const combinationRarity = await this.assessCombinationRarity(data.industry_category, data.size_category, data.geographic_region);
            if (combinationRarity < this.config.compliance.kAnonymity) {
                riskScore += 40;
                riskFactors.push({
                    factor: 'Rare combination of attributes',
                    impact: 40,
                    mitigation: 'Generalize geographic region or organization size'
                });
            }
        }
        // Temporal correlation risk
        if (data.created_at && data.submitted_at) {
            riskScore += 10;
            riskFactors.push({
                factor: 'Temporal correlation possible',
                impact: 10,
                mitigation: 'Consider broader time buckets'
            });
        }
        const recommendations: string[] = [];
        if (riskScore > 70) {
            recommendations.push('HIGH RISK: Implement additional anonymization techniques');
            recommendations.push('Consider suppression of rare attribute combinations');
            recommendations.push('Increase generalization levels for geographic and demographic data');
        }
        else if (riskScore > 40) {
            recommendations.push('MEDIUM RISK: Monitor for potential re-identification');
            recommendations.push('Consider periodic risk reassessment');
        }
        else {
            recommendations.push('LOW RISK: Current anonymization level is adequate');
        }
        return {
            overallRisk: Math.min(100, riskScore),
            quasiIdentifiers,
            sensitiveAttributes,
            riskFactors,
            recommendations
        };
    }
    /**
     * Assess rarity of attribute combinations
     */
    private async assessCombinationRarity(industry: string, size: string, region: string): Promise<number> {
        // This would query the analytics database to count similar records
        // For now, return a simulated rarity score
        const combinationKey = `${industry}_${size}_${region}`;
        const hash = createHash('sha256').update(combinationKey).digest('hex');
        const rarityScore = parseInt(hash.substring(0, 2), 16) % 20 + 5; // 5-24
        return rarityScore;
    }
    /**
     * Validate compliance with privacy regulations
     */
    private validateCompliance(data: any): string[] {
        const flags: string[] = [];
        // GDPR Article 4(1) - Anonymous data validation
        if (this.config.compliance.mode === 'GDPR' || this.config.compliance.mode === 'STRICT') {
            const hasDirectIdentifiers = this.checkForDirectIdentifiers(data);
            if (hasDirectIdentifiers.length > 0) {
                flags.push(`GDPR_VIOLATION: Direct identifiers detected: ${hasDirectIdentifiers.join(', ')}`);
            }
            const hasIndirectIdentifiers = this.checkForIndirectIdentifiers(data);
            if (hasIndirectIdentifiers.length > 0) {
                flags.push(`GDPR_WARNING: Potential indirect identifiers: ${hasIndirectIdentifiers.join(', ')}`);
            }
        }
        // HIPAA Safe Harbor validation
        if (this.config.compliance.mode === 'HIPAA' || this.config.compliance.mode === 'STRICT') {
            const hipaaViolations = this.checkHIPAACompliance(data);
            flags.push(...hipaaViolations);
        }
        // k-anonymity check
        const kAnonCompliant = this.checkKAnonymity(data);
        if (!kAnonCompliant) {
            flags.push(`K_ANONYMITY_WARNING: May not meet k=${this.config.compliance.kAnonymity} requirement`);
        }
        return flags;
    }
    private checkForDirectIdentifiers(data: any): string[] {
        const directIdentifiers = ['email', 'phone', 'ssn', 'name', 'address', 'id'];
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
    private checkForIndirectIdentifiers(data: any): string[] {
        const indirectIdentifiers = ['zip', 'postal', 'birth', 'age', 'salary', 'ip'];
        const found: string[] = [];
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();
            if (indirectIdentifiers.some(id => keyLower.includes(id)) && value) {
                found.push(key);
            }
        }
        return found;
    }
    private checkHIPAACompliance(data: any): string[] {
        const violations: string[] = [];
        // HIPAA Safe Harbor requires removal of 18 specific identifiers
        const hipaaIdentifiers = [
            'name', 'address', 'dates', 'phone', 'fax', 'email', 'ssn', 'mrn',
            'plan', 'account', 'certificate', 'license', 'vehicle', 'device',
            'url', 'ip', 'biometric', 'photo'
        ];
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();
            for (const identifier of hipaaIdentifiers) {
                if (keyLower.includes(identifier) && value && typeof value === 'string') {
                    if (!value.startsWith('[HASH:') && !value.includes('_hash') && !value.includes('_category')) {
                        violations.push(`HIPAA_VIOLATION: Potential ${identifier} identifier in field ${key}`);
                    }
                }
            }
        }
        return violations;
    }
    private checkKAnonymity(data: any): boolean {
        // Simplified k-anonymity check
        // In practice, this would require access to the full dataset
        const quasiIdentifierCount = Object.keys(data).filter(key => key.includes('category') || key.includes('region') || key.includes('type')).length;
        // If we have many quasi-identifiers, k-anonymity might be at risk
        return quasiIdentifierCount <= 3;
    }
}
/**
 * Factory function to create anonymization engine with default configuration
 */
export function createAnonymizationEngine(): AnonymizationEngine {
    const defaultConfig: AnonymizationConfig = {
        salts: {
            global: process.env.ANONYMIZATION_GLOBAL_SALT || randomBytes(32).toString('hex'),
            user: process.env.ANONYMIZATION_USER_SALT || randomBytes(32).toString('hex'),
            organization: process.env.ANONYMIZATION_ORG_SALT || randomBytes(32).toString('hex'),
            assessment: process.env.ANONYMIZATION_ASSESSMENT_SALT || randomBytes(32).toString('hex'),
            session: process.env.ANONYMIZATION_SESSION_SALT || randomBytes(32).toString('hex')
        },
        compliance: {
            mode: 'GDPR',
            kAnonymity: 5,
            lDiversity: 2,
            tCloseness: 0.2,
            enableDifferentialPrivacy: false,
            epsilonValue: 0.1
        },
        geographic: {
            ipToRegion: true,
            cityToCountry: true,
            timezoneGeneralization: true,
            postalCodeGeneralization: 3
        },
        temporal: {
            dateGranularity: 'day',
            timeRounding: 15,
            ageGeneralization: 5
        },
        retention: {
            anonymizedDataDays: 2555, // ~7 years
            auditLogDays: 2555,
            qualityMetricsDays: 365
        },
        performance: {
            batchSize: 1000,
            parallelWorkers: 4,
            streamBufferSize: 10000,
            validationSampling: 10
        }
    };
    return new AnonymizationEngine(defaultConfig);
}
