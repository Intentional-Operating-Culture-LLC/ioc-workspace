import { EventType, getPinpointTracker } from './PinpointEventTracker';

// OCEAN score interface
export interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// Assessment-specific event attributes
export interface AssessmentEventAttributes {
  assessmentId: string;
  assessmentType: string;
  organizationId?: string;
  version?: string;
  source?: string;
  referrer?: string;
}

// Assessment-specific event metrics
export interface AssessmentEventMetrics {
  questionCount?: number;
  durationSeconds?: number;
  completionPercentage?: number;
  oceanOpenness?: number;
  oceanConscientiousness?: number;
  oceanExtraversion?: number;
  oceanAgreeableness?: number;
  oceanNeuroticism?: number;
  compositeScore?: number;
  aiConfidenceScore?: number;
  dualAiAgreementScore?: number;
}

// Assessment event tracking helper
export class AssessmentEventTracker {
  private static startTimes = new Map<string, number>();
  
  // Track assessment started
  static async trackAssessmentStarted(
    userId: string,
    assessmentId: string,
    assessmentType: string,
    organizationId?: string
  ): Promise<void> {
    // Record start time for duration calculation
    this.startTimes.set(assessmentId, Date.now());
    
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.ASSESSMENT_STARTED,
      userId,
      attributes: {
        assessmentId,
        assessmentType,
        organizationId: organizationId || 'individual',
        source: 'web_app',
        referrer: typeof window !== 'undefined' ? document.referrer : 'unknown',
      },
      metrics: {
        questionCount: this.getQuestionCount(assessmentType),
      },
    });
  }
  
  // Track assessment completed with OCEAN scores
  static async trackAssessmentCompleted(
    userId: string,
    assessmentId: string,
    assessmentType: string,
    oceanScores: OceanScores,
    aiValidation?: {
      confidence: number;
      dualAiAgreement: number;
    },
    organizationId?: string
  ): Promise<void> {
    // Calculate duration
    const startTime = this.startTimes.get(assessmentId);
    const durationSeconds = startTime 
      ? Math.floor((Date.now() - startTime) / 1000)
      : 0;
    
    // Clean up start time
    this.startTimes.delete(assessmentId);
    
    // Calculate composite score (average of OCEAN dimensions)
    const compositeScore = 
      (oceanScores.openness + 
       oceanScores.conscientiousness + 
       oceanScores.extraversion + 
       oceanScores.agreeableness + 
       oceanScores.neuroticism) / 5;
    
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.ASSESSMENT_COMPLETED,
      userId,
      attributes: {
        assessmentId,
        assessmentType,
        organizationId: organizationId || 'individual',
        version: '1.0',
      },
      metrics: {
        durationSeconds,
        completionPercentage: 100,
        oceanOpenness: Math.round(oceanScores.openness * 100) / 100,
        oceanConscientiousness: Math.round(oceanScores.conscientiousness * 100) / 100,
        oceanExtraversion: Math.round(oceanScores.extraversion * 100) / 100,
        oceanAgreeableness: Math.round(oceanScores.agreeableness * 100) / 100,
        oceanNeuroticism: Math.round(oceanScores.neuroticism * 100) / 100,
        compositeScore: Math.round(compositeScore * 100) / 100,
        aiConfidenceScore: aiValidation 
          ? Math.round(aiValidation.confidence * 100) / 100 
          : undefined,
        dualAiAgreementScore: aiValidation 
          ? Math.round(aiValidation.dualAiAgreement * 100) / 100
          : undefined,
      },
    });
  }
  
  // Track partial assessment (user dropped off)
  static async trackAssessmentAbandoned(
    userId: string,
    assessmentId: string,
    assessmentType: string,
    completionPercentage: number,
    organizationId?: string
  ): Promise<void> {
    const startTime = this.startTimes.get(assessmentId);
    const durationSeconds = startTime 
      ? Math.floor((Date.now() - startTime) / 1000)
      : 0;
    
    // Clean up start time
    this.startTimes.delete(assessmentId);
    
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: 'assessment.abandoned',
      userId,
      attributes: {
        assessmentId,
        assessmentType,
        organizationId: organizationId || 'individual',
      },
      metrics: {
        completionPercentage: Math.round(completionPercentage),
        durationSeconds,
      },
    });
  }
  
  // Get question count by assessment type
  private static getQuestionCount(assessmentType: string): number {
    const questionCounts: Record<string, number> = {
      'full_ocean': 50,
      'short_ocean': 20,
      'leadership': 30,
      'team_dynamics': 25,
      'emotional_intelligence': 35,
    };
    
    return questionCounts[assessmentType] || 20;
  }
}

// User engagement tracking
export class UserEngagementTracker {
  // Track user registration
  static async trackUserRegistered(
    userId: string,
    registrationSource: string,
    organizationId?: string
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.USER_REGISTERED,
      userId,
      attributes: {
        source: registrationSource,
        organizationId: organizationId || 'individual',
        platform: 'web',
      },
      metrics: {
        timestamp: Date.now(),
      },
    });
  }
  
  // Track subscription created
  static async trackSubscriptionCreated(
    userId: string,
    planType: string,
    planPrice: number,
    organizationId?: string
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.SUBSCRIPTION_CREATED,
      userId,
      attributes: {
        planType,
        organizationId: organizationId || 'individual',
        currency: 'USD',
      },
      metrics: {
        planPrice,
        monthlyRevenue: planPrice,
      },
    });
  }
  
  // Track subscription cancelled
  static async trackSubscriptionCancelled(
    userId: string,
    planType: string,
    reason?: string,
    organizationId?: string
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.SUBSCRIPTION_CANCELLED,
      userId,
      attributes: {
        planType,
        reason: reason || 'user_initiated',
        organizationId: organizationId || 'individual',
      },
      metrics: {
        timestamp: Date.now(),
      },
    });
  }
  
  // Track payment failure
  static async trackPaymentFailed(
    userId: string,
    amount: number,
    errorCode: string,
    organizationId?: string
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: EventType.PAYMENT_FAILED,
      userId,
      attributes: {
        errorCode,
        organizationId: organizationId || 'individual',
      },
      metrics: {
        amount,
        timestamp: Date.now(),
      },
    });
  }
}

// Custom event tracking for additional metrics
export class CustomEventTracker {
  // Track feature usage
  static async trackFeatureUsed(
    userId: string,
    featureName: string,
    featureCategory: string,
    value?: number
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: `feature.${featureCategory}.used`,
      userId,
      attributes: {
        featureName,
        featureCategory,
      },
      metrics: value ? { value } : {},
    });
  }
  
  // Track report generated
  static async trackReportGenerated(
    userId: string,
    reportType: string,
    assessmentCount: number,
    organizationId?: string
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: 'report.generated',
      userId,
      attributes: {
        reportType,
        organizationId: organizationId || 'individual',
      },
      metrics: {
        assessmentCount,
        timestamp: Date.now(),
      },
    });
  }
  
  // Track API usage
  static async trackApiUsage(
    userId: string,
    endpoint: string,
    responseTime: number,
    statusCode: number
  ): Promise<void> {
    const tracker = getPinpointTracker();
    await tracker.trackEvent({
      eventType: 'api.usage',
      userId,
      attributes: {
        endpoint: endpoint.substring(0, 50), // Truncate long URLs
        statusCode: statusCode.toString(),
      },
      metrics: {
        responseTime,
      },
    });
  }
}