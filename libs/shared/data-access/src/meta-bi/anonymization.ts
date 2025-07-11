// Data Anonymization Pipeline
// GDPR/HIPAA compliant anonymization for assessment data

import crypto from 'crypto';
import { AnonymizedAssessment, AnonymizedAssessmentResponse, AnonymizedQuestionResponse, AnonymizedAssessmentScore } from './types';

export interface AnonymizationConfig {
  // Hash configuration
  hashSalt: string;
  hashAlgorithm: 'sha256' | 'sha512' | 'blake2b';
  preserveRelationships: boolean;
  
  // Privacy techniques
  privacyTechniques: {
    differentialPrivacy: {
      enabled: boolean;
      epsilon: number;
      delta: number;
    };
    kAnonymity: {
      enabled: boolean;
      k: number;
      quasiIdentifiers: string[];
    };
    lDiversity: {
      enabled: boolean;
      l: number;
      sensitiveAttributes: string[];
    };
  };
  
  // Field mappings
  fieldMappings: {
    suppress: string[];
    hash: string[];
    generalize: string[];
    tokenize: string[];
    encrypt: string[];
  };
  
  // Retention policies
  retention: {
    rawDataDays: number;
    anonymizedDataDays: number;
    logRetentionDays: number;
  };
}

export class DataAnonymizer {
  private config: AnonymizationConfig;
  private hashCache: Map<string, string>;
  private saltCache: Map<string, string>;
  
  constructor(config: AnonymizationConfig) {
    this.config = config;
    this.hashCache = new Map();
    this.saltCache = new Map();
  }
  
  /**
   * Anonymize assessment data
   */
  public async anonymizeAssessment(assessment: any): Promise<AnonymizedAssessment> {
    const anonymized: AnonymizedAssessment = {
      id: this.generateConsistentHash(assessment.id),
      org_hash: this.generateConsistentHash(assessment.organization_id),
      type: assessment.type,
      status: assessment.status,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at,
      question_count: assessment.questions?.length || 0,
      time_limit_minutes: assessment.time_limit_minutes,
      settings_hash: this.generateConsistentHash(JSON.stringify(assessment.settings || {})),
      industry_category: this.generalizeIndustry(assessment.organization?.industry),
      org_size_category: this.generalizeOrganizationSize(assessment.organization?.size)
    };
    
    // Apply differential privacy if enabled
    if (this.config.privacyTechniques.differentialPrivacy.enabled) {
      anonymized.question_count = this.addDifferentialPrivacyNoise(
        anonymized.question_count,
        this.config.privacyTechniques.differentialPrivacy.epsilon
      );
    }
    
    return anonymized;
  }
  
  /**
   * Anonymize assessment response data
   */
  public async anonymizeAssessmentResponse(response: any): Promise<AnonymizedAssessmentResponse> {
    const userAgent = this.parseUserAgent(response.user_agent);
    const geoLocation = this.generalizeGeolocation(response.ip_address);
    
    const anonymized: AnonymizedAssessmentResponse = {
      id: this.generateConsistentHash(response.id),
      assessment_hash: this.generateConsistentHash(response.assessment_id),
      respondent_hash: this.generateConsistentHash(response.respondent_id),
      subject_hash: response.subject_id ? this.generateConsistentHash(response.subject_id) : undefined,
      status: response.status,
      submitted_at: response.submitted_at,
      time_spent_seconds: response.time_spent_seconds,
      created_at: response.created_at,
      completion_percentage: this.calculateCompletionPercentage(response),
      device_type: userAgent.device,
      browser_family: userAgent.browser,
      geographic_region: geoLocation.region,
      timezone: geoLocation.timezone
    };
    
    // Apply differential privacy to time spent
    if (this.config.privacyTechniques.differentialPrivacy.enabled) {
      anonymized.time_spent_seconds = this.addDifferentialPrivacyNoise(
        anonymized.time_spent_seconds,
        this.config.privacyTechniques.differentialPrivacy.epsilon
      );
    }
    
    return anonymized;
  }
  
  /**
   * Anonymize question response data
   */
  public async anonymizeQuestionResponse(questionResponse: any): Promise<AnonymizedQuestionResponse> {
    const anonymized: AnonymizedQuestionResponse = {
      id: this.generateConsistentHash(questionResponse.id),
      response_hash: this.generateConsistentHash(questionResponse.response_id),
      question_hash: this.generateConsistentHash(questionResponse.question_id),
      question_type: questionResponse.question.question_type,
      question_order: questionResponse.question.question_order,
      answer_value_hash: this.generateConsistentHash(questionResponse.answer_value),
      answer_category: this.categorizeAnswer(questionResponse.answer_value, questionResponse.question.question_type),
      confidence_score: questionResponse.confidence_score,
      time_spent_seconds: questionResponse.time_spent_seconds,
      created_at: questionResponse.created_at,
      answer_length: this.calculateAnswerLength(questionResponse.answer_value),
      answer_complexity_score: this.calculateAnswerComplexity(questionResponse.answer_value)
    };
    
    // Apply differential privacy to timing data
    if (this.config.privacyTechniques.differentialPrivacy.enabled) {
      anonymized.time_spent_seconds = this.addDifferentialPrivacyNoise(
        anonymized.time_spent_seconds,
        this.config.privacyTechniques.differentialPrivacy.epsilon
      );
    }
    
    return anonymized;
  }
  
  /**
   * Anonymize assessment score data
   */
  public async anonymizeAssessmentScore(score: any): Promise<AnonymizedAssessmentScore> {
    const anonymized: AnonymizedAssessmentScore = {
      id: this.generateConsistentHash(score.id),
      assessment_hash: this.generateConsistentHash(score.assessment_id),
      response_hash: this.generateConsistentHash(score.response_id),
      dimension: score.dimension,
      score: score.score,
      percentile: score.percentile,
      raw_score: score.raw_score,
      scoring_method: this.extractScoringMethod(score.scoring_rules),
      created_at: score.created_at,
      updated_at: score.updated_at
    };
    
    // Apply differential privacy to scores
    if (this.config.privacyTechniques.differentialPrivacy.enabled) {
      anonymized.score = this.addDifferentialPrivacyNoise(
        anonymized.score,
        this.config.privacyTechniques.differentialPrivacy.epsilon
      );
      
      if (anonymized.percentile) {
        anonymized.percentile = this.addDifferentialPrivacyNoise(
          anonymized.percentile,
          this.config.privacyTechniques.differentialPrivacy.epsilon
        );
      }
    }
    
    return anonymized;
  }
  
  /**
   * Generate consistent hash for identifiers
   */
  private generateConsistentHash(value: string): string {
    if (!value) return '';
    
    // Check cache first
    if (this.hashCache.has(value)) {
      return this.hashCache.get(value)!;
    }
    
    // Generate hash
    const hash = crypto.createHmac(this.config.hashAlgorithm, this.config.hashSalt)
      .update(value)
      .digest('hex');
    
    // Cache the result
    this.hashCache.set(value, hash);
    
    return hash;
  }
  
  /**
   * Add differential privacy noise using Laplace mechanism
   */
  private addDifferentialPrivacyNoise(value: number, epsilon: number): number {
    const sensitivity = 1; // Assume sensitivity of 1 for most metrics
    const scale = sensitivity / epsilon;
    
    // Generate Laplace noise
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    
    return Math.max(0, Math.round(value + noise));
  }
  
  /**
   * Generalize industry categories
   */
  private generalizeIndustry(industry?: string): string | undefined {
    if (!industry) return undefined;
    
    const industryMappings: Record<string, string> = {
      'technology': 'Technology',
      'software': 'Technology',
      'fintech': 'Financial Services',
      'finance': 'Financial Services',
      'banking': 'Financial Services',
      'healthcare': 'Healthcare',
      'medical': 'Healthcare',
      'pharmaceutical': 'Healthcare',
      'education': 'Education',
      'academic': 'Education',
      'manufacturing': 'Manufacturing',
      'automotive': 'Manufacturing',
      'retail': 'Retail',
      'ecommerce': 'Retail',
      'consulting': 'Professional Services',
      'legal': 'Professional Services',
      'nonprofit': 'Non-Profit',
      'government': 'Public Sector',
      'defense': 'Public Sector'
    };
    
    const normalized = industry.toLowerCase();
    return industryMappings[normalized] || 'Other';
  }
  
  /**
   * Generalize organization size
   */
  private generalizeOrganizationSize(size?: string): string | undefined {
    if (!size) return undefined;
    
    const sizeNumber = parseInt(size);
    
    if (sizeNumber <= 10) return 'Small (1-10)';
    if (sizeNumber <= 50) return 'Medium (11-50)';
    if (sizeNumber <= 200) return 'Large (51-200)';
    if (sizeNumber <= 1000) return 'Enterprise (201-1000)';
    return 'Large Enterprise (1000+)';
  }
  
  /**
   * Parse user agent string
   */
  private parseUserAgent(userAgent?: string): { device: string; browser: string } {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown' };
    
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }
    
    // Detect browser family
    let browser = 'Other';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
    
    return { device, browser };
  }
  
  /**
   * Generalize geolocation from IP address
   */
  private generalizeGeolocation(ipAddress?: string): { region: string; timezone: string } {
    if (!ipAddress) return { region: 'Unknown', timezone: 'Unknown' };
    
    // In a real implementation, you would use a GeoIP service
    // For now, we'll return generalized regions
    return {
      region: 'North America', // Generalized region
      timezone: 'UTC-5' // Generalized timezone
    };
  }
  
  /**
   * Calculate completion percentage
   */
  private calculateCompletionPercentage(response: any): number {
    if (!response.question_responses || !response.assessment?.questions) {
      return 0;
    }
    
    const totalQuestions = response.assessment.questions.length;
    const answeredQuestions = response.question_responses.length;
    
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }
  
  /**
   * Categorize answer based on type and content
   */
  private categorizeAnswer(answerValue: string, questionType: string): string {
    if (!answerValue) return 'No Answer';
    
    switch (questionType) {
      case 'scale':
      case 'likert':
        const numValue = parseFloat(answerValue);
        if (numValue <= 2) return 'Low';
        if (numValue <= 4) return 'Medium';
        return 'High';
      
      case 'boolean':
        return answerValue.toLowerCase() === 'true' ? 'Yes' : 'No';
      
      case 'text':
      case 'textarea':
        const length = answerValue.length;
        if (length <= 50) return 'Short';
        if (length <= 200) return 'Medium';
        return 'Long';
      
      default:
        return 'Standard';
    }
  }
  
  /**
   * Calculate answer length
   */
  private calculateAnswerLength(answerValue: string): number | undefined {
    if (!answerValue) return undefined;
    
    if (typeof answerValue === 'string') {
      return answerValue.length;
    }
    
    return undefined;
  }
  
  /**
   * Calculate answer complexity score
   */
  private calculateAnswerComplexity(answerValue: string): number | undefined {
    if (!answerValue || typeof answerValue !== 'string') return undefined;
    
    // Simple complexity score based on:
    // - Length
    // - Vocabulary diversity
    // - Sentence structure
    
    const words = answerValue.split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const sentences = answerValue.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Calculate complexity score (0-100)
    const lengthScore = Math.min(words.length / 10, 1) * 30;
    const diversityScore = (uniqueWords.size / words.length) * 40;
    const structureScore = Math.min(sentences.length / 3, 1) * 30;
    
    return Math.round(lengthScore + diversityScore + structureScore);
  }
  
  /**
   * Extract scoring method from scoring rules
   */
  private extractScoringMethod(scoringRules: any): string {
    if (!scoringRules || typeof scoringRules !== 'object') {
      return 'Unknown';
    }
    
    return scoringRules.method || scoringRules.algorithm || 'Standard';
  }
  
  /**
   * Validate k-anonymity
   */
  public async validateKAnonymity(data: any[], k: number, quasiIdentifiers: string[]): Promise<boolean> {
    if (!this.config.privacyTechniques.kAnonymity.enabled) return true;
    
    // Group records by quasi-identifier combinations
    const groups = new Map<string, any[]>();
    
    for (const record of data) {
      const key = quasiIdentifiers.map(qi => record[qi]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }
    
    // Check if all groups have at least k records
    for (const [key, group] of groups) {
      if (group.length < k) {
        console.warn(`k-anonymity violation: Group ${key} has only ${group.length} records (k=${k})`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate l-diversity
   */
  public async validateLDiversity(data: any[], l: number, sensitiveAttributes: string[]): Promise<boolean> {
    if (!this.config.privacyTechniques.lDiversity.enabled) return true;
    
    // This is a simplified l-diversity check
    // In practice, you would need more sophisticated validation
    
    for (const attribute of sensitiveAttributes) {
      const uniqueValues = new Set(data.map(record => record[attribute]));
      if (uniqueValues.size < l) {
        console.warn(`l-diversity violation: ${attribute} has only ${uniqueValues.size} unique values (l=${l})`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Clear caches
   */
  public clearCaches(): void {
    this.hashCache.clear();
    this.saltCache.clear();
  }
  
  /**
   * Get anonymization statistics
   */
  public getStatistics(): AnonymizationStatistics {
    return {
      hashCacheSize: this.hashCache.size,
      saltCacheSize: this.saltCache.size,
      totalHashedValues: this.hashCache.size,
      privacyTechniquesEnabled: {
        differentialPrivacy: this.config.privacyTechniques.differentialPrivacy.enabled,
        kAnonymity: this.config.privacyTechniques.kAnonymity.enabled,
        lDiversity: this.config.privacyTechniques.lDiversity.enabled
      }
    };
  }
}

export interface AnonymizationStatistics {
  hashCacheSize: number;
  saltCacheSize: number;
  totalHashedValues: number;
  privacyTechniquesEnabled: {
    differentialPrivacy: boolean;
    kAnonymity: boolean;
    lDiversity: boolean;
  };
}

/**
 * Create default anonymization configuration
 */
export function createDefaultAnonymizationConfig(): AnonymizationConfig {
  return {
    hashSalt: process.env.ANONYMIZATION_SALT || 'default-salt-change-in-production',
    hashAlgorithm: 'sha256',
    preserveRelationships: true,
    
    privacyTechniques: {
      differentialPrivacy: {
        enabled: true,
        epsilon: 1.0,
        delta: 0.00001
      },
      kAnonymity: {
        enabled: true,
        k: 5,
        quasiIdentifiers: ['industry_category', 'org_size_category', 'geographic_region']
      },
      lDiversity: {
        enabled: true,
        l: 2,
        sensitiveAttributes: ['score', 'percentile']
      }
    },
    
    fieldMappings: {
      suppress: ['email', 'phone', 'ip_address', 'user_agent', 'full_name'],
      hash: ['user_id', 'organization_id', 'assessment_id', 'response_id', 'question_id'],
      generalize: ['industry', 'organization_size', 'geographic_location'],
      tokenize: ['answer_value'],
      encrypt: ['sensitive_metadata']
    },
    
    retention: {
      rawDataDays: 30,
      anonymizedDataDays: 730,
      logRetentionDays: 90
    }
  };
}

/**
 * Anonymization pipeline processor
 */
export class AnonymizationPipeline {
  private anonymizer: DataAnonymizer;
  private config: AnonymizationConfig;
  
  constructor(config: AnonymizationConfig) {
    this.config = config;
    this.anonymizer = new DataAnonymizer(config);
  }
  
  /**
   * Process a batch of assessment data
   */
  public async processBatch(data: any[]): Promise<{
    anonymizedData: any[];
    errors: Array<{ index: number; error: string }>;
    statistics: AnonymizationStatistics;
  }> {
    const anonymizedData: any[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    
    for (let i = 0; i < data.length; i++) {
      try {
        const record = data[i];
        let anonymizedRecord: any;
        
        // Determine record type and anonymize accordingly
        if (record.assessment_id && record.respondent_id) {
          anonymizedRecord = await this.anonymizer.anonymizeAssessmentResponse(record);
        } else if (record.response_id && record.question_id) {
          anonymizedRecord = await this.anonymizer.anonymizeQuestionResponse(record);
        } else if (record.dimension && record.score !== undefined) {
          anonymizedRecord = await this.anonymizer.anonymizeAssessmentScore(record);
        } else if (record.title && record.type) {
          anonymizedRecord = await this.anonymizer.anonymizeAssessment(record);
        } else {
          throw new Error('Unknown record type');
        }
        
        anonymizedData.push(anonymizedRecord);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      anonymizedData,
      errors,
      statistics: this.anonymizer.getStatistics()
    };
  }
  
  /**
   * Validate privacy compliance
   */
  public async validatePrivacyCompliance(data: any[]): Promise<{
    kAnonymityValid: boolean;
    lDiversityValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Validate k-anonymity
    let kAnonymityValid = true;
    if (this.config.privacyTechniques.kAnonymity.enabled) {
      kAnonymityValid = await this.anonymizer.validateKAnonymity(
        data,
        this.config.privacyTechniques.kAnonymity.k,
        this.config.privacyTechniques.kAnonymity.quasiIdentifiers
      );
      if (!kAnonymityValid) {
        errors.push('k-anonymity validation failed');
      }
    }
    
    // Validate l-diversity
    let lDiversityValid = true;
    if (this.config.privacyTechniques.lDiversity.enabled) {
      lDiversityValid = await this.anonymizer.validateLDiversity(
        data,
        this.config.privacyTechniques.lDiversity.l,
        this.config.privacyTechniques.lDiversity.sensitiveAttributes
      );
      if (!lDiversityValid) {
        errors.push('l-diversity validation failed');
      }
    }
    
    return {
      kAnonymityValid,
      lDiversityValid,
      errors
    };
  }
}