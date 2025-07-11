/**
 * A1 Integration Service
 * Main service that coordinates all A1 Generator components with existing IOC framework
 */

import { A1GeneratorService, AssessmentContext, GeneratedReport } from './a1-generator.js';
import { A1FeedbackProcessor, FeedbackContext, RevisedContent } from './a1-feedback-processor.js';
import { A1PromptLibrary, GeneratedPromptSet } from './a1-prompt-library.js';
import { AssessmentService } from '../../api/assessments/service.js';
import { ValidationResponse } from '../core/interfaces.js';
import { OceanScoreDetails } from '../../scoring/ocean-scoring.js';

export interface A1Configuration {
  anthropicApiKey: string;
  openaiApiKey: string;
  primaryModel: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  enableLearning: boolean;
  enablePersonalization: boolean;
  confidenceThreshold: number;
}

export interface A1ServiceContext {
  userId: string;
  organizationId: string;
  sessionId: string;
  preferences?: any;
  historicalData?: any[];
}

export interface EnhancedAssessmentRequest {
  type: string;
  tier: 'individual' | 'executive' | 'organizational';
  context: AssessmentContext;
  options?: {
    enableAI: boolean;
    personalizationLevel: 'low' | 'medium' | 'high';
    culturalAdaptation: boolean;
    industryAdaptation: boolean;
  };
}

export interface EnhancedAssessmentResponse {
  assessment: any;
  aiEnhancements: {
    promptsGenerated: number;
    personalizationApplied: boolean;
    culturalAdaptations: string[];
    industryAdaptations: string[];
    confidence: number;
  };
  metadata: {
    generationTime: number;
    fallbackUsed: boolean;
    learningApplied: boolean;
  };
}

export interface EnhancedReportRequest {
  assessmentResults: any;
  userContext: any;
  reportType: 'individual' | 'executive' | 'organizational' | 'team';
  options?: {
    includePersonalization: boolean;
    includeBenchmarking: boolean;
    includeRecommendations: boolean;
    narrativeStyle: 'formal' | 'conversational' | 'technical';
  };
}

export interface EnhancedReportResponse {
  report: GeneratedReport;
  validationStatus: 'pending' | 'approved' | 'requires_revision';
  confidence: number;
  personalizationLevel: number;
  metadata: {
    generationTime: number;
    sectionsGenerated: string[];
    validationNodes: number;
  };
}

export interface A1PerformanceMetrics {
  generationStats: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    confidenceDistribution: Record<string, number>;
  };
  enhancementStats: {
    personalizationUsage: number;
    culturalAdaptations: number;
    industryAdaptations: number;
    fallbackUsage: number;
  };
  learningStats: {
    feedbackProcessed: number;
    patternsIdentified: number;
    improvementsApplied: number;
    confidenceImprovement: number;
  };
  qualityMetrics: {
    userSatisfaction: number;
    accuracyScore: number;
    biasScore: number;
    ethicalScore: number;
  };
}

export class A1IntegrationService {
  private a1Generator: A1GeneratorService;
  private feedbackProcessor: A1FeedbackProcessor;
  private promptLibrary: A1PromptLibrary;
  private assessmentService: AssessmentService;
  private configuration: A1Configuration;
  private performanceMetrics: A1PerformanceMetrics;
  private sessionCache: Map<string, any>;

  constructor(
    anthropicClient: any,
    openaiClient: any,
    assessmentService: AssessmentService,
    configuration: A1Configuration
  ) {
    this.configuration = configuration;
    this.assessmentService = assessmentService;
    
    this.a1Generator = new A1GeneratorService(
      anthropicClient,
      openaiClient,
      assessmentService,
      {
        primaryModel: configuration.primaryModel,
        fallbackModel: configuration.fallbackModel,
        temperature: configuration.temperature,
        maxTokens: configuration.maxTokens
      }
    );

    this.feedbackProcessor = new A1FeedbackProcessor(anthropicClient);
    this.promptLibrary = new A1PromptLibrary(anthropicClient);
    
    this.sessionCache = new Map();
    this.initializePerformanceMetrics();
  }

  /**
   * Enhanced assessment generation with A1 intelligence
   */
  async generateEnhancedAssessment(
    request: EnhancedAssessmentRequest,
    context: A1ServiceContext
  ): Promise<EnhancedAssessmentResponse> {
    const startTime = Date.now();
    let fallbackUsed = false;
    let aiEnhancements: any = {
      promptsGenerated: 0,
      personalizationApplied: false,
      culturalAdaptations: [],
      industryAdaptations: [],
      confidence: 0
    };

    try {
      // Check if AI enhancement is enabled and requested
      if (!request.options?.enableAI || !this.configuration.enableLearning) {
        // Fall back to standard assessment generation
        const standardAssessment = await this.assessmentService.createAssessment(
          {
            title: `${request.type} Assessment`,
            type: request.type,
            organizationId: context.organizationId,
            tier: request.tier
          },
          context.userId
        );
        
        return {
          assessment: standardAssessment,
          aiEnhancements: {
            promptsGenerated: 0,
            personalizationApplied: false,
            culturalAdaptations: [],
            industryAdaptations: [],
            confidence: 0.5
          },
          metadata: {
            generationTime: Date.now() - startTime,
            fallbackUsed: true,
            learningApplied: false
          }
        };
      }

      // Generate enhanced prompts using A1 systems
      const promptSet = await this.generateContextualPrompts(request, context);
      
      // Apply personalization if enabled
      if (this.configuration.enablePersonalization && request.options?.personalizationLevel !== 'low') {
        await this.applyPersonalization(promptSet, context);
        aiEnhancements.personalizationApplied = true;
      }

      // Generate assessment using A1 generator
      const generationRequest = {
        id: `assess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: context.userId,
        organizationId: context.organizationId,
        type: 'assessment' as const,
        context: {
          ...request.context,
          promptSet,
          personalizationLevel: request.options?.personalizationLevel
        },
        timestamp: new Date()
      };

      const generationResponse = await this.a1Generator.generate(generationRequest);
      
      // Enhance with existing assessment service capabilities
      const enhancedAssessment = await this.enhanceWithExistingCapabilities(
        generationResponse.content,
        request,
        context
      );

      aiEnhancements = {
        promptsGenerated: promptSet.prompts.length,
        personalizationApplied: aiEnhancements.personalizationApplied,
        culturalAdaptations: promptSet.metadata.culturalAdaptations,
        industryAdaptations: promptSet.metadata.industryAdaptations,
        confidence: generationResponse.metadata.confidence
      };

      // Update performance metrics
      this.updateGenerationMetrics(true, Date.now() - startTime, aiEnhancements.confidence);

      return {
        assessment: enhancedAssessment,
        aiEnhancements,
        metadata: {
          generationTime: Date.now() - startTime,
          fallbackUsed,
          learningApplied: this.configuration.enableLearning
        }
      };

    } catch (error) {
      console.error('A1 assessment generation failed:', error);
      
      // Fallback to standard assessment service
      try {
        const fallbackAssessment = await this.assessmentService.createAssessment(
          {
            title: `${request.type} Assessment`,
            type: request.type,
            organizationId: context.organizationId,
            tier: request.tier
          },
          context.userId
        );

        this.updateGenerationMetrics(false, Date.now() - startTime, 0.3);

        return {
          assessment: fallbackAssessment,
          aiEnhancements: {
            promptsGenerated: 0,
            personalizationApplied: false,
            culturalAdaptations: [],
            industryAdaptations: [],
            confidence: 0.3
          },
          metadata: {
            generationTime: Date.now() - startTime,
            fallbackUsed: true,
            learningApplied: false
          }
        };
      } catch (fallbackError) {
        throw new Error(`Both A1 and fallback assessment generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Enhanced report generation with A1 intelligence
   */
  async generateEnhancedReport(
    request: EnhancedReportRequest,
    context: A1ServiceContext
  ): Promise<EnhancedReportResponse> {
    const startTime = Date.now();

    try {
      // Prepare context for report generation
      const reportContext = {
        assessmentResults: request.assessmentResults,
        userContext: request.userContext,
        reportType: request.reportType,
        organizationId: context.organizationId,
        personalizationLevel: request.options?.includePersonalization ? 'high' : 'medium'
      };

      // Generate report using A1 generator
      const generationRequest = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: context.userId,
        organizationId: context.organizationId,
        type: 'report' as const,
        context: reportContext,
        timestamp: new Date()
      };

      const generationResponse = await this.a1Generator.generate(generationRequest);
      const generatedReport = generationResponse.content as GeneratedReport;

      // Calculate personalization level
      const personalizationLevel = this.calculatePersonalizationLevel(
        generatedReport,
        request.options?.includePersonalization || false
      );

      // Enhance with existing OCEAN scoring and analysis
      const enhancedReport = await this.enhanceReportWithOceanAnalysis(
        generatedReport,
        request.assessmentResults
      );

      return {
        report: enhancedReport,
        validationStatus: 'pending', // Will be determined after B1 validation
        confidence: generationResponse.metadata.confidence,
        personalizationLevel,
        metadata: {
          generationTime: Date.now() - startTime,
          sectionsGenerated: Object.keys(enhancedReport),
          validationNodes: enhancedReport.metadata.validationNodes.length
        }
      };

    } catch (error) {
      console.error('A1 report generation failed:', error);
      throw new Error(`Enhanced report generation failed: ${error.message}`);
    }
  }

  /**
   * Process B1 feedback and apply learning
   */
  async processB1Feedback(
    originalContent: any,
    b1Feedback: ValidationResponse,
    context: A1ServiceContext
  ): Promise<RevisedContent> {
    const feedbackContext: FeedbackContext = {
      originalContent,
      b1Feedback,
      requestId: `feedback_${Date.now()}`,
      userId: context.userId,
      contentType: this.determineContentType(originalContent)
    };

    try {
      // Process feedback using A1 feedback processor
      const revisedContent = await this.feedbackProcessor.processB1Feedback(feedbackContext);

      // Apply immediate learning if enabled
      if (this.configuration.enableLearning) {
        await this.feedbackProcessor.applyImmediateLearning(feedbackContext, revisedContent.learningPoints);
      }

      // Update performance metrics
      this.updateLearningMetrics(revisedContent.learningPoints.length);

      return revisedContent;

    } catch (error) {
      console.error('B1 feedback processing failed:', error);
      throw new Error(`Feedback processing failed: ${error.message}`);
    }
  }

  /**
   * Generate contextual prompts using prompt library
   */
  private async generateContextualPrompts(
    request: EnhancedAssessmentRequest,
    context: A1ServiceContext
  ): Promise<GeneratedPromptSet> {
    const promptContext = {
      culturalContext: request.context.culturalContext,
      industryContext: request.context.industryContext,
      roleContext: request.context.roleContext,
      demographicContext: await this.gatherDemographicContext(context)
    };

    return this.promptLibrary.generatePromptSet(
      request.type,
      request.tier,
      promptContext
    );
  }

  /**
   * Apply personalization to prompt set
   */
  private async applyPersonalization(
    promptSet: GeneratedPromptSet,
    context: A1ServiceContext
  ): Promise<void> {
    // Get user preferences and historical data
    const userProfile = await this.buildUserProfile(context);
    
    // Apply personalization to prompts (this would be more sophisticated in production)
    promptSet.prompts.forEach(prompt => {
      if (userProfile.preferredLanguageStyle) {
        prompt.template = this.adaptLanguageStyle(prompt.template, userProfile.preferredLanguageStyle);
      }
      
      if (userProfile.experienceLevel) {
        prompt.difficulty = this.adaptDifficulty(prompt.difficulty || 'medium', userProfile.experienceLevel);
      }
    });

    // Update metadata
    promptSet.metadata.appliedModifiers.push('personalization');
  }

  /**
   * Enhance with existing assessment service capabilities
   */
  private async enhanceWithExistingCapabilities(
    aiGeneratedContent: any,
    request: EnhancedAssessmentRequest,
    context: A1ServiceContext
  ): Promise<any> {
    // Integrate with existing OCEAN scoring system
    if (request.type === 'personality' || request.type === 'leadership') {
      const oceanMappings = await this.generateOceanMappings(aiGeneratedContent.prompts);
      aiGeneratedContent.oceanMappings = oceanMappings;
    }

    // Apply existing IOC pillar framework
    aiGeneratedContent.pillarMappings = this.generatePillarMappings(aiGeneratedContent.prompts);

    // Use existing assessment creation workflow but with AI-generated content
    const assessmentData = {
      title: aiGeneratedContent.title || `AI-Enhanced ${request.type} Assessment`,
      type: request.type,
      organizationId: context.organizationId,
      description: aiGeneratedContent.description,
      questions: aiGeneratedContent.prompts,
      settings: {
        ...aiGeneratedContent.settings,
        aiEnhanced: true,
        scoringType: 'ocean',
        traitMappings: aiGeneratedContent.oceanMappings
      },
      tier: request.tier,
      enableOceanScoring: true
    };

    return this.assessmentService.createAssessment(assessmentData, context.userId);
  }

  /**
   * Enhance report with OCEAN analysis
   */
  private async enhanceReportWithOceanAnalysis(
    report: GeneratedReport,
    assessmentResults: any
  ): Promise<GeneratedReport> {
    // If assessment results include OCEAN scores, enhance the analysis
    if (assessmentResults.oceanScores) {
      const oceanAnalysis = await this.generateEnhancedOceanAnalysis(assessmentResults.oceanScores);
      
      // Integrate enhanced analysis into the report
      report.detailedAnalysis.oceanProfile = oceanAnalysis.detailedProfile;
      report.actionableRecommendations.immediate.push(...oceanAnalysis.immediateActions);
      report.narrativeInsights.strengthsAndChallenges = oceanAnalysis.strengthsNarrative;
    }

    return report;
  }

  /**
   * Generate enhanced OCEAN analysis
   */
  private async generateEnhancedOceanAnalysis(oceanScores: OceanScoreDetails): Promise<any> {
    // Use A1 generator to create enhanced OCEAN interpretation
    const analysisRequest = {
      id: `ocean_analysis_${Date.now()}`,
      userId: 'system',
      organizationId: 'system',
      type: 'insight' as const,
      context: {
        data: oceanScores,
        focusAreas: ['personality_strengths', 'development_areas', 'workplace_implications']
      },
      timestamp: new Date()
    };

    const response = await this.a1Generator.generate(analysisRequest);
    
    return {
      detailedProfile: response.content.patterns || '',
      immediateActions: response.content.implications?.split('\n').filter(Boolean) || [],
      strengthsNarrative: response.content.findings || ''
    };
  }

  /**
   * Build user profile for personalization
   */
  private async buildUserProfile(context: A1ServiceContext): Promise<any> {
    // This would integrate with user preferences and historical data
    return {
      preferredLanguageStyle: context.preferences?.languageStyle || 'professional',
      experienceLevel: context.preferences?.experienceLevel || 'intermediate',
      culturalBackground: context.preferences?.culturalBackground,
      industryExperience: context.preferences?.industryExperience,
      previousAssessments: context.historicalData?.filter(item => item.type === 'assessment') || []
    };
  }

  /**
   * Gather demographic context
   */
  private async gatherDemographicContext(context: A1ServiceContext): Promise<any> {
    // This would gather relevant demographic information for cultural adaptation
    return {
      region: context.preferences?.region,
      language: context.preferences?.language || 'English',
      timezone: context.preferences?.timezone
    };
  }

  /**
   * Generate OCEAN trait mappings for AI-generated prompts
   */
  private async generateOceanMappings(prompts: any[]): Promise<any[]> {
    // Map AI-generated prompts to OCEAN traits
    return prompts.map((prompt, index) => ({
      questionId: prompt.id || `q_${index}`,
      traits: this.mapToOceanTraits(prompt.traits || []),
      reverse: prompt.reverse || false
    }));
  }

  /**
   * Generate IOC pillar mappings
   */
  private generatePillarMappings(prompts: any[]): any[] {
    return prompts.map((prompt, index) => ({
      questionId: prompt.id || `q_${index}`,
      pillars: this.mapToPillars(prompt.pillars || []),
      weight: 1.0
    }));
  }

  /**
   * Map traits to OCEAN framework
   */
  private mapToOceanTraits(traits: string[]): Record<string, number> {
    const oceanMapping: Record<string, number> = {};
    
    traits.forEach(trait => {
      switch (trait.toLowerCase()) {
        case 'openness':
        case 'creativity':
        case 'innovation':
          oceanMapping.openness = 1.0;
          break;
        case 'conscientiousness':
        case 'reliability':
        case 'discipline':
          oceanMapping.conscientiousness = 1.0;
          break;
        case 'extraversion':
        case 'leadership':
        case 'social':
          oceanMapping.extraversion = 1.0;
          break;
        case 'agreeableness':
        case 'cooperation':
        case 'teamwork':
          oceanMapping.agreeableness = 1.0;
          break;
        case 'neuroticism':
        case 'stress':
        case 'emotion':
          oceanMapping.neuroticism = 1.0;
          break;
      }
    });

    return oceanMapping;
  }

  /**
   * Map to IOC pillars
   */
  private mapToPillars(pillars: string[]): Record<string, number> {
    const pillarMapping: Record<string, number> = {};
    
    pillars.forEach(pillar => {
      switch (pillar.toLowerCase()) {
        case 'sustainable':
        case 'sustainability':
        case 'resilience':
          pillarMapping.sustainable = 1.0;
          break;
        case 'performance':
        case 'achievement':
        case 'execution':
          pillarMapping.performance = 1.0;
          break;
        case 'potential':
        case 'growth':
        case 'development':
          pillarMapping.potential = 1.0;
          break;
      }
    });

    return pillarMapping;
  }

  /**
   * Calculate personalization level
   */
  private calculatePersonalizationLevel(report: GeneratedReport, includePersonalization: boolean): number {
    if (!includePersonalization) return 0.3;
    
    let personalizationScore = 0.5; // Base score
    
    // Check for personalized elements
    if (report.narrativeInsights.personalStory.length > 100) personalizationScore += 0.2;
    if (report.actionableRecommendations.immediate.length > 3) personalizationScore += 0.1;
    if (report.executiveSummary.includes('your') || report.executiveSummary.includes('you')) personalizationScore += 0.1;
    
    return Math.min(1.0, personalizationScore);
  }

  /**
   * Determine content type for feedback processing
   */
  private determineContentType(content: any): string {
    if (content.prompts || content.questions) return 'assessment';
    if (content.executiveSummary || content.detailedAnalysis) return 'report';
    if (content.insight || content.recommendation) return 'coaching';
    return 'unknown';
  }

  /**
   * Adapt language style
   */
  private adaptLanguageStyle(template: string, style: string): string {
    // Simple language style adaptation - would be more sophisticated in production
    switch (style) {
      case 'casual':
        return template.replace(/\bconsider\b/g, 'think about').replace(/\butilize\b/g, 'use');
      case 'formal':
        return template.replace(/\bthink about\b/g, 'consider').replace(/\buse\b/g, 'utilize');
      default:
        return template;
    }
  }

  /**
   * Adapt difficulty level
   */
  private adaptDifficulty(currentDifficulty: string, experienceLevel: string): string {
    if (experienceLevel === 'beginner' && currentDifficulty === 'hard') return 'medium';
    if (experienceLevel === 'expert' && currentDifficulty === 'easy') return 'medium';
    return currentDifficulty;
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): void {
    this.performanceMetrics = {
      generationStats: {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        confidenceDistribution: {}
      },
      enhancementStats: {
        personalizationUsage: 0,
        culturalAdaptations: 0,
        industryAdaptations: 0,
        fallbackUsage: 0
      },
      learningStats: {
        feedbackProcessed: 0,
        patternsIdentified: 0,
        improvementsApplied: 0,
        confidenceImprovement: 0
      },
      qualityMetrics: {
        userSatisfaction: 0,
        accuracyScore: 0,
        biasScore: 0,
        ethicalScore: 0
      }
    };
  }

  /**
   * Update generation metrics
   */
  private updateGenerationMetrics(success: boolean, responseTime: number, confidence: number): void {
    this.performanceMetrics.generationStats.totalRequests++;
    
    if (success) {
      const currentSuccessRate = this.performanceMetrics.generationStats.successRate;
      const totalRequests = this.performanceMetrics.generationStats.totalRequests;
      this.performanceMetrics.generationStats.successRate = 
        (currentSuccessRate * (totalRequests - 1) + 1) / totalRequests;
    }

    const currentAvgTime = this.performanceMetrics.generationStats.averageResponseTime;
    const totalRequests = this.performanceMetrics.generationStats.totalRequests;
    this.performanceMetrics.generationStats.averageResponseTime = 
      (currentAvgTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Update confidence distribution
    const confidenceBucket = Math.floor(confidence * 10) / 10;
    this.performanceMetrics.generationStats.confidenceDistribution[confidenceBucket] = 
      (this.performanceMetrics.generationStats.confidenceDistribution[confidenceBucket] || 0) + 1;
  }

  /**
   * Update learning metrics
   */
  private updateLearningMetrics(learningPointsCount: number): void {
    this.performanceMetrics.learningStats.feedbackProcessed++;
    this.performanceMetrics.learningStats.patternsIdentified += learningPointsCount;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): A1PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
    metrics: A1PerformanceMetrics;
  }> {
    const [generatorHealth, promptLibraryStats, feedbackStats] = await Promise.all([
      this.a1Generator.getHealth(),
      this.promptLibrary.getStatistics(),
      this.feedbackProcessor.getLearningStatistics()
    ]);

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (generatorHealth.status === 'unhealthy' || this.performanceMetrics.generationStats.successRate < 0.8) {
      overall = 'unhealthy';
    } else if (generatorHealth.status === 'degraded' || this.performanceMetrics.generationStats.successRate < 0.9) {
      overall = 'degraded';
    }

    return {
      overall,
      components: {
        generator: generatorHealth,
        promptLibrary: promptLibraryStats,
        feedbackProcessor: feedbackStats
      },
      metrics: this.performanceMetrics
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<A1Configuration>): void {
    this.configuration = { ...this.configuration, ...newConfig };
    
    // Propagate configuration changes to components if needed
    console.log('A1 configuration updated:', newConfig);
  }
}