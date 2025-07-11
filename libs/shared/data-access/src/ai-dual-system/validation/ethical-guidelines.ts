/**
 * Ethical Guidelines System
 * Implements comprehensive ethical validation for AI-generated content
 */

import { DisagreementSeverity } from '../core/interfaces';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface EthicalViolation {
  severity: DisagreementSeverity;
  description: string;
  location?: string;
  evidence?: string[];
  suggestedFix: string;
  category: string;
  principle: string;
}

export interface EthicalGuideline {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: DisagreementSeverity;
  principle: EthicalPrinciple;
  rules: EthicalRule[];
}

export interface EthicalRule {
  id: string;
  description: string;
  patterns: RegExp[];
  contextChecks: ((content: any, context: any) => boolean)[];
  weight: number;
}

export enum EthicalPrinciple {
  AUTONOMY = 'autonomy',
  BENEFICENCE = 'beneficence',
  NON_MALEFICENCE = 'non_maleficence',
  JUSTICE = 'justice',
  TRANSPARENCY = 'transparency',
  ACCOUNTABILITY = 'accountability',
  PRIVACY = 'privacy',
  FAIRNESS = 'fairness',
  DIGNITY = 'dignity',
  CONSENT = 'consent'
}

export class EthicalValidationEngine {
  private guidelines: Map<string, EthicalGuideline>;
  private config: EthicalValidationConfig;

  constructor(config: EthicalValidationConfig) {
    this.config = config;
    this.guidelines = new Map();
    this.initializeGuidelines();
  }

  async validateEthics(content: any, context: any = {}): Promise<EthicalViolation[]> {
    const startTime = Date.now();
    const violations: EthicalViolation[] = [];

    try {
      logger.debug('Starting ethical validation', {
        guidelineCount: this.guidelines.size,
        contentType: typeof content
      });

      // Run validation against all guidelines
      for (const guideline of this.guidelines.values()) {
        if (this.config.enabledPrinciples.includes(guideline.principle)) {
          const guidelineViolations = await this.validateAgainstGuideline(content, context, guideline);
          violations.push(...guidelineViolations);
        }
      }

      // Run specialized ethical checks
      const specializedViolations = await this.runSpecializedChecks(content, context);
      violations.push(...specializedViolations);

      const duration = Date.now() - startTime;

      logger.info('Ethical validation completed', {
        guidelineCount: this.guidelines.size,
        violationsFound: violations.length,
        duration
      });

      metrics.histogram('ethical_validation_duration', duration);
      metrics.record('ethical_violations_found', violations.length);

      // Record metrics by principle
      const principleViolations = new Map<string, number>();
      violations.forEach(v => {
        const count = principleViolations.get(v.principle) || 0;
        principleViolations.set(v.principle, count + 1);
      });

      principleViolations.forEach((count, principle) => {
        metrics.record('ethical_violations_by_principle', count, { principle });
      });

      return violations;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Ethical validation failed', {
        error: error.message,
        duration
      });

      metrics.histogram('ethical_validation_duration', duration, { status: 'error' });
      
      throw error;
    }
  }

  addGuideline(guideline: EthicalGuideline): void {
    this.guidelines.set(guideline.id, guideline);
    logger.info('Ethical guideline added', {
      id: guideline.id,
      name: guideline.name,
      principle: guideline.principle,
      ruleCount: guideline.rules.length
    });
  }

  removeGuideline(guidelineId: string): void {
    if (this.guidelines.delete(guidelineId)) {
      logger.info('Ethical guideline removed', { id: guidelineId });
    }
  }

  getGuidelines(): EthicalGuideline[] {
    return Array.from(this.guidelines.values());
  }

  private async validateAgainstGuideline(
    content: any,
    context: any,
    guideline: EthicalGuideline
  ): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];
    const text = this.extractText(content);

    for (const rule of guideline.rules) {
      try {
        const ruleViolations = await this.checkRule(text, content, context, rule, guideline);
        violations.push(...ruleViolations);
      } catch (error) {
        logger.warn('Ethical rule check failed', {
          guidelineId: guideline.id,
          ruleId: rule.id,
          error: error.message
        });
      }
    }

    return violations;
  }

  private async checkRule(
    text: string,
    content: any,
    context: any,
    rule: EthicalRule,
    guideline: EthicalGuideline
  ): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];

    // Check pattern violations
    const patternViolations = this.checkPatterns(text, rule, guideline);
    violations.push(...patternViolations);

    // Check context violations
    const contextViolations = this.checkContextRules(content, context, rule, guideline);
    violations.push(...contextViolations);

    return violations;
  }

  private checkPatterns(text: string, rule: EthicalRule, guideline: EthicalGuideline): EthicalViolation[] {
    const violations: EthicalViolation[] = [];

    for (const pattern of rule.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          severity: guideline.severity,
          description: `Violation of ${guideline.name}: ${rule.description}`,
          evidence: matches,
          suggestedFix: this.generateSuggestion(rule, guideline),
          category: guideline.category,
          principle: guideline.principle
        });
      }
    }

    return violations;
  }

  private checkContextRules(
    content: any,
    context: any,
    rule: EthicalRule,
    guideline: EthicalGuideline
  ): EthicalViolation[] {
    const violations: EthicalViolation[] = [];

    for (const contextCheck of rule.contextChecks) {
      try {
        if (contextCheck(content, context)) {
          violations.push({
            severity: guideline.severity,
            description: `Context violation of ${guideline.name}: ${rule.description}`,
            suggestedFix: this.generateSuggestion(rule, guideline),
            category: guideline.category,
            principle: guideline.principle
          });
        }
      } catch (error) {
        logger.warn('Context check failed', {
          ruleId: rule.id,
          error: error.message
        });
      }
    }

    return violations;
  }

  private async runSpecializedChecks(content: any, context: any): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];

    // Check for harmful content
    const harmfulContentViolations = await this.checkHarmfulContent(content, context);
    violations.push(...harmfulContentViolations);

    // Check for privacy violations
    const privacyViolations = await this.checkPrivacyViolations(content, context);
    violations.push(...privacyViolations);

    // Check for manipulation attempts
    const manipulationViolations = await this.checkManipulation(content, context);
    violations.push(...manipulationViolations);

    // Check for misinformation
    const misinformationViolations = await this.checkMisinformation(content, context);
    violations.push(...misinformationViolations);

    return violations;
  }

  private async checkHarmfulContent(content: any, context: any): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];
    const text = this.extractText(content);

    // Patterns for harmful content
    const harmfulPatterns = [
      /\b(suicide|self-harm|kill yourself)\b/gi,
      /\b(violence|attack|harm|hurt)\s+(someone|others|people)\b/gi,
      /\b(hate|hatred)\s+(speech|crime)\b/gi,
      /\b(illegal|criminal)\s+(activity|behavior)\b/gi,
      /\b(discriminate|discrimination)\s+against\b/gi,
      /\b(terrorist|terrorism|extremist)\b/gi
    ];

    for (const pattern of harmfulPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          severity: 'critical',
          description: 'Potentially harmful content detected',
          evidence: matches,
          suggestedFix: 'Remove or rephrase content to eliminate harmful elements',
          category: 'harm_prevention',
          principle: EthicalPrinciple.NON_MALEFICENCE
        });
      }
    }

    return violations;
  }

  private async checkPrivacyViolations(content: any, context: any): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];
    const text = this.extractText(content);

    // Patterns for personal information
    const privacyPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card
      /\b[\w\.-]+@[\w\.-]+\.\w+\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|circle|cir|way)\b/gi // Address
    ];

    for (const pattern of privacyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          severity: 'high',
          description: 'Personal information detected',
          evidence: matches.map(() => '[REDACTED]'), // Don't log actual PII
          suggestedFix: 'Remove or mask personal information',
          category: 'privacy_protection',
          principle: EthicalPrinciple.PRIVACY
        });
      }
    }

    return violations;
  }

  private async checkManipulation(content: any, context: any): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];
    const text = this.extractText(content);

    // Patterns for manipulative content
    const manipulationPatterns = [
      /\b(you must|you have to|you need to)\s+(believe|think|do|buy|accept)\b/gi,
      /\b(everyone knows|everyone agrees|all experts say)\b/gi,
      /\b(act now|limited time|urgent|immediate action)\b/gi,
      /\b(fear|scared|worried|anxious)\s+(of|about)\b/gi,
      /\b(guilt|shame|embarrass|humiliate)\b/gi,
      /\b(secret|hidden|they don't want you to know)\b/gi
    ];

    for (const pattern of manipulationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          severity: 'medium',
          description: 'Potentially manipulative language detected',
          evidence: matches,
          suggestedFix: 'Use neutral, factual language that respects user autonomy',
          category: 'manipulation_prevention',
          principle: EthicalPrinciple.AUTONOMY
        });
      }
    }

    return violations;
  }

  private async checkMisinformation(content: any, context: any): Promise<EthicalViolation[]> {
    const violations: EthicalViolation[] = [];
    const text = this.extractText(content);

    // Patterns for potential misinformation
    const misinformationPatterns = [
      /\b(proven fact|absolute truth|definitely true|certainly false)\b/gi,
      /\b(scientists agree|all studies show|research proves)\b/gi,
      /\b(conspiracy|cover-up|hidden agenda)\b/gi,
      /\b(miracle cure|instant solution|guaranteed results)\b/gi,
      /\b(fake news|media lies|propaganda)\b/gi
    ];

    for (const pattern of misinformationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          severity: 'medium',
          description: 'Language that may promote misinformation detected',
          evidence: matches,
          suggestedFix: 'Use qualified language and cite credible sources',
          category: 'information_integrity',
          principle: EthicalPrinciple.TRANSPARENCY
        });
      }
    }

    return violations;
  }

  private generateSuggestion(rule: EthicalRule, guideline: EthicalGuideline): string {
    // Generate contextual suggestions based on the rule and guideline
    const suggestions = {
      [EthicalPrinciple.AUTONOMY]: 'Respect user choice and decision-making autonomy',
      [EthicalPrinciple.BENEFICENCE]: 'Focus on positive outcomes and user benefit',
      [EthicalPrinciple.NON_MALEFICENCE]: 'Avoid content that could cause harm',
      [EthicalPrinciple.JUSTICE]: 'Ensure fair and equitable treatment',
      [EthicalPrinciple.TRANSPARENCY]: 'Be clear and honest about information sources',
      [EthicalPrinciple.ACCOUNTABILITY]: 'Take responsibility for content accuracy',
      [EthicalPrinciple.PRIVACY]: 'Protect personal information and privacy',
      [EthicalPrinciple.FAIRNESS]: 'Avoid discrimination and promote equal treatment',
      [EthicalPrinciple.DIGNITY]: 'Respect human dignity and worth',
      [EthicalPrinciple.CONSENT]: 'Ensure informed consent for any actions'
    };

    return suggestions[guideline.principle] || 'Review content against ethical guidelines';
  }

  private extractText(content: any): string {
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      return JSON.stringify(content);
    }
    return String(content);
  }

  private initializeGuidelines(): void {
    // Initialize core ethical guidelines
    this.addGuideline(this.createAutonomyGuideline());
    this.addGuideline(this.createBeneficenceGuideline());
    this.addGuideline(this.createNonMaleficenceGuideline());
    this.addGuideline(this.createJusticeGuideline());
    this.addGuideline(this.createTransparencyGuideline());
    this.addGuideline(this.createPrivacyGuideline());
    this.addGuideline(this.createFairnessGuideline());
    this.addGuideline(this.createDignityGuideline());

    logger.info('Ethical guidelines initialized', {
      count: this.guidelines.size,
      principles: Array.from(new Set(Array.from(this.guidelines.values()).map(g => g.principle)))
    });
  }

  private createAutonomyGuideline(): EthicalGuideline {
    return {
      id: 'autonomy_guideline',
      name: 'Respect for Autonomy',
      description: 'Respect individual autonomy and decision-making capacity',
      category: 'autonomy',
      severity: 'high',
      principle: EthicalPrinciple.AUTONOMY,
      rules: [
        {
          id: 'no_coercion',
          description: 'Avoid coercive or manipulative language',
          patterns: [
            /\b(you must|you have to|you should|you need to)\s+(do|believe|think|accept|buy)\b/gi,
            /\b(force|coerce|manipulate|pressure)\b/gi
          ],
          contextChecks: [
            (content, context) => {
              // Check if content tries to override user preferences
              return false; // Placeholder
            }
          ],
          weight: 0.8
        },
        {
          id: 'informed_choice',
          description: 'Support informed decision-making',
          patterns: [
            /\b(don't think|no need to consider|just trust)\b/gi,
            /\b(blindly follow|unquestioning)\b/gi
          ],
          contextChecks: [],
          weight: 0.7
        }
      ]
    };
  }

  private createBeneficenceGuideline(): EthicalGuideline {
    return {
      id: 'beneficence_guideline',
      name: 'Beneficence',
      description: 'Promote well-being and positive outcomes',
      category: 'beneficence',
      severity: 'medium',
      principle: EthicalPrinciple.BENEFICENCE,
      rules: [
        {
          id: 'promote_wellbeing',
          description: 'Focus on user well-being and positive outcomes',
          patterns: [
            /\b(harmful|dangerous|risky)\s+(advice|recommendation|suggestion)\b/gi,
            /\b(ignore|dismiss)\s+(safety|health|wellbeing)\b/gi
          ],
          contextChecks: [],
          weight: 0.9
        }
      ]
    };
  }

  private createNonMaleficenceGuideline(): EthicalGuideline {
    return {
      id: 'non_maleficence_guideline',
      name: 'Non-Maleficence (Do No Harm)',
      description: 'Avoid causing harm to individuals or groups',
      category: 'harm_prevention',
      severity: 'critical',
      principle: EthicalPrinciple.NON_MALEFICENCE,
      rules: [
        {
          id: 'no_harmful_content',
          description: 'Avoid content that could cause psychological or physical harm',
          patterns: [
            /\b(suicide|self-harm|self-injury)\b/gi,
            /\b(violence|attack|assault|abuse)\b/gi,
            /\b(hate|hatred|hostility)\s+(towards|against)\b/gi
          ],
          contextChecks: [],
          weight: 1.0
        }
      ]
    };
  }

  private createJusticeGuideline(): EthicalGuideline {
    return {
      id: 'justice_guideline',
      name: 'Justice',
      description: 'Ensure fair and equitable treatment',
      category: 'justice',
      severity: 'high',
      principle: EthicalPrinciple.JUSTICE,
      rules: [
        {
          id: 'fair_treatment',
          description: 'Promote fair and equal treatment',
          patterns: [
            /\b(discriminate|discrimination)\s+(against|towards)\b/gi,
            /\b(unfair|unjust|inequitable)\s+(treatment|access)\b/gi,
            /\b(superior|inferior)\s+(race|gender|religion|culture)\b/gi
          ],
          contextChecks: [],
          weight: 0.9
        }
      ]
    };
  }

  private createTransparencyGuideline(): EthicalGuideline {
    return {
      id: 'transparency_guideline',
      name: 'Transparency',
      description: 'Be transparent about AI involvement and information sources',
      category: 'transparency',
      severity: 'medium',
      principle: EthicalPrinciple.TRANSPARENCY,
      rules: [
        {
          id: 'source_disclosure',
          description: 'Be transparent about information sources',
          patterns: [
            /\b(secret|hidden|undisclosed)\s+(source|information|data)\b/gi,
            /\b(can't tell you|won't reveal|classified)\b/gi
          ],
          contextChecks: [],
          weight: 0.6
        }
      ]
    };
  }

  private createPrivacyGuideline(): EthicalGuideline {
    return {
      id: 'privacy_guideline',
      name: 'Privacy Protection',
      description: 'Protect user privacy and personal information',
      category: 'privacy',
      severity: 'high',
      principle: EthicalPrinciple.PRIVACY,
      rules: [
        {
          id: 'no_personal_info',
          description: 'Avoid sharing or exposing personal information',
          patterns: [
            /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
            /\b[\w\.-]+@[\w\.-]+\.\w+\b/g // Email pattern
          ],
          contextChecks: [],
          weight: 1.0
        }
      ]
    };
  }

  private createFairnessGuideline(): EthicalGuideline {
    return {
      id: 'fairness_guideline',
      name: 'Fairness',
      description: 'Promote fairness and avoid discrimination',
      category: 'fairness',
      severity: 'high',
      principle: EthicalPrinciple.FAIRNESS,
      rules: [
        {
          id: 'no_discrimination',
          description: 'Avoid discriminatory language or recommendations',
          patterns: [
            /\b(exclude|reject|deny)\s+(based on|because of)\s+(race|gender|age|religion)\b/gi,
            /\b(not suitable for|inappropriate for)\s+(women|men|elderly|young)\b/gi
          ],
          contextChecks: [],
          weight: 0.9
        }
      ]
    };
  }

  private createDignityGuideline(): EthicalGuideline {
    return {
      id: 'dignity_guideline',
      name: 'Human Dignity',
      description: 'Respect human dignity and inherent worth',
      category: 'dignity',
      severity: 'high',
      principle: EthicalPrinciple.DIGNITY,
      rules: [
        {
          id: 'respect_dignity',
          description: 'Respect human dignity and worth',
          patterns: [
            /\b(worthless|useless|inferior|subhuman)\b/gi,
            /\b(dehumanize|objectify|degrade)\b/gi,
            /\b(treat like|nothing more than)\s+(objects|animals|machines)\b/gi
          ],
          contextChecks: [],
          weight: 0.9
        }
      ]
    };
  }
}

// Configuration interface
export interface EthicalValidationConfig {
  enabledPrinciples: EthicalPrinciple[];
  strictMode: boolean;
  customGuidelines: EthicalGuideline[];
  reportingThreshold: DisagreementSeverity;
}

export { EthicalValidationEngine, EthicalPrinciple };