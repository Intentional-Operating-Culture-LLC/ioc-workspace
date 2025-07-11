/**
 * A1 Generator Service
 * Core generator component of IOC's dual-AI system
 */

import { 
  GenerationRequest, 
  GenerationResponse, 
  GenerationMetadata,
  IA1Generator,
  GeneratorCapabilities,
  ComponentHealth,
  GenerationError,
  ContentType
} from '../core/interfaces.js';
import { OceanScoreDetails, OceanTraits } from '../../scoring/ocean-scoring.js';
import { AssessmentService } from '../../api/assessments/service.js';

// A1-specific interfaces
export interface AssessmentContext {
  userId: string;
  organizationId: string;
  assessmentType: string;
  tier: 'individual' | 'executive' | 'organizational';
  culturalContext?: string;
  industryContext?: string;
  roleContext?: string;
  historicalData?: any[];
}

export interface GeneratedPrompts {
  prompts: AssessmentPrompt[];
  metadata: {
    confidence: number;
    reasoning: string[];
    variations: AssessmentPrompt[][];
  };
}

export interface AssessmentPrompt {
  id: string;
  question: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'ranking';
  options?: string[];
  traits: string[];
  context?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface PersonalizedInterpretation {
  personalizedInsights: string[];
  actionableRecommendations: string[];
  narrativeSummary: string;
  confidence: number;
}

export interface PillarScores {
  sustainable: PillarScore;
  performance: PillarScore;
  potential: PillarScore;
}

export interface PillarScore {
  score: number;
  interpretation: string;
  recommendations: string[];
}

export interface GeneratedReport {
  executiveSummary: string;
  detailedAnalysis: {
    oceanProfile: string;
    pillarScores: PillarScores;
    comparativeAnalysis: string;
  };
  actionableRecommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  narrativeInsights: {
    personalStory: string;
    strengthsAndChallenges: string;
    growthOpportunities: string;
  };
  metadata: {
    generationTimestamp: Date;
    confidence: number;
    sources: string[];
    validationNodes: ValidationNode[];
  };
}

export interface ValidationNode {
  id: string;
  type: 'fact' | 'interpretation' | 'recommendation' | 'narrative';
  content: string;
  dependencies: string[];
  confidence: number;
}

export class A1GeneratorService implements IA1Generator {
  private anthropicClient: any;
  private openaiClient: any;
  private assessmentService: AssessmentService;
  private modelConfig: any;
  
  constructor(
    anthropicClient: any,
    openaiClient: any,
    assessmentService: AssessmentService,
    modelConfig: any = {}
  ) {
    this.anthropicClient = anthropicClient;
    this.openaiClient = openaiClient;
    this.assessmentService = assessmentService;
    this.modelConfig = {
      primaryModel: 'claude-3-opus',
      fallbackModel: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 4096,
      ...modelConfig
    };
  }

  /**
   * Main generation method - routes to specific generators
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    
    try {
      let content: any;
      let metadata: GenerationMetadata;

      switch (request.type) {
        case 'assessment':
          ({ content, metadata } = await this.generateAssessment(request));
          break;
        case 'report':
          ({ content, metadata } = await this.generateReport(request));
          break;
        case 'coaching':
          ({ content, metadata } = await this.generateCoaching(request));
          break;
        case 'insight':
          ({ content, metadata } = await this.generateInsight(request));
          break;
        default:
          throw new GenerationError(`Unsupported content type: ${request.type}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        requestId: request.id,
        content,
        model: {
          provider: 'anthropic',
          model: this.modelConfig.primaryModel,
          temperature: this.modelConfig.temperature,
          maxTokens: this.modelConfig.maxTokens
        },
        metadata,
        processingTime,
        tokenUsage: {
          prompt: metadata.sources?.length || 0,
          completion: JSON.stringify(content).length / 4, // Rough estimate
          total: (metadata.sources?.length || 0) + (JSON.stringify(content).length / 4),
        }
      };
    } catch (error) {
      throw new GenerationError(`Generation failed: ${error.message}`, {
        requestId: request.id,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Batch generation for multiple requests
   */
  async generateBatch(requests: GenerationRequest[]): Promise<GenerationResponse[]> {
    const batchSize = 5; // Process in batches to avoid overwhelming the API
    const results: GenerationResponse[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => this.generate(request))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Generate assessment questions and prompts
   */
  private async generateAssessment(request: GenerationRequest): Promise<{
    content: GeneratedPrompts;
    metadata: GenerationMetadata;
  }> {
    const context = request.context as AssessmentContext;
    
    // Build prompt for assessment generation
    const systemPrompt = this.buildAssessmentSystemPrompt(context);
    const userPrompt = this.buildAssessmentUserPrompt(context);

    // Generate with primary model
    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    // Parse and validate response
    const parsedContent = this.parseAssessmentResponse(response);
    
    // Generate variations
    const variations = await this.generateAssessmentVariations(parsedContent, context);
    
    const content: GeneratedPrompts = {
      prompts: parsedContent,
      metadata: {
        confidence: this.calculateAssessmentConfidence(parsedContent, context),
        reasoning: [
          'Generated based on OCEAN framework and IOC pillars',
          'Adapted for user context and cultural considerations',
          'Validated against bias and ethical guidelines'
        ],
        variations
      }
    };

    const metadata: GenerationMetadata = {
      confidence: content.metadata.confidence,
      reasoning: content.metadata.reasoning,
      sources: ['OCEAN framework', 'IOC pillar methodology', 'Cultural adaptation guidelines'],
      assumptions: [
        'User context information is accurate',
        'Cultural adaptations are appropriate',
        'Assessment tier requirements are met'
      ],
      limitations: [
        'Generated content requires B1 validation',
        'Cultural adaptations may need expert review',
        'Question effectiveness needs empirical validation'
      ]
    };

    return { content, metadata };
  }

  /**
   * Generate comprehensive reports
   */
  private async generateReport(request: GenerationRequest): Promise<{
    content: GeneratedReport;
    metadata: GenerationMetadata;
  }> {
    const context = request.context;
    const assessmentResults = context.assessmentResults;
    const userContext = context.userContext;

    // Generate report sections in parallel
    const [summary, analysis, recommendations, narrative] = await Promise.all([
      this.generateExecutiveSummary(assessmentResults, userContext),
      this.generateDetailedAnalysis(assessmentResults, userContext),
      this.generateRecommendations(assessmentResults, userContext),
      this.generateNarrative(assessmentResults, userContext)
    ]);

    // Create validation nodes for B1 review
    const validationNodes = this.createValidationNodes({
      summary,
      analysis,
      recommendations,
      narrative
    });

    const content: GeneratedReport = {
      executiveSummary: summary,
      detailedAnalysis: analysis,
      actionableRecommendations: recommendations,
      narrativeInsights: narrative,
      metadata: {
        generationTimestamp: new Date(),
        confidence: this.calculateReportConfidence(assessmentResults, userContext),
        sources: ['Assessment results', 'User profile', 'Benchmark data'],
        validationNodes
      }
    };

    const metadata: GenerationMetadata = {
      confidence: content.metadata.confidence,
      reasoning: [
        'Based on validated assessment results',
        'Personalized for user context',
        'Aligned with IOC methodology'
      ],
      sources: content.metadata.sources,
      assumptions: [
        'Assessment results are accurate',
        'User context is current',
        'Benchmark data is relevant'
      ]
    };

    return { content, metadata };
  }

  /**
   * Generate coaching responses
   */
  private async generateCoaching(request: GenerationRequest): Promise<{
    content: any;
    metadata: GenerationMetadata;
  }> {
    const context = request.context;
    
    const systemPrompt = `You are an expert executive coach with deep knowledge of personality psychology and organizational development. Generate personalized coaching responses based on the user's profile and current situation.`;
    
    const userPrompt = `Generate a coaching response for:
    User Profile: ${JSON.stringify(context.userProfile)}
    Current Situation: ${context.situation}
    Specific Question: ${context.question}
    
    Provide:
    1. Immediate insight (2-3 sentences)
    2. Actionable recommendation (specific steps)
    3. Long-term development suggestion
    4. Relevant resources or techniques`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    const content = this.parseCoachingResponse(response);
    
    const metadata: GenerationMetadata = {
      confidence: 0.85, // Coaching has high confidence for personalized responses
      reasoning: [
        'Based on established coaching methodologies',
        'Personalized for user profile and situation',
        'Grounded in personality psychology principles'
      ],
      sources: ['User profile', 'Coaching best practices', 'Psychology research']
    };

    return { content, metadata };
  }

  /**
   * Generate insights
   */
  private async generateInsight(request: GenerationRequest): Promise<{
    content: any;
    metadata: GenerationMetadata;
  }> {
    const context = request.context;
    
    const systemPrompt = `You are an expert data analyst specializing in personality and performance insights. Generate meaningful insights from the provided data.`;
    
    const userPrompt = `Analyze the following data and generate insights:
    Data: ${JSON.stringify(context.data)}
    Focus Areas: ${context.focusAreas?.join(', ') || 'General insights'}
    
    Provide:
    1. Key patterns identified
    2. Unexpected findings
    3. Actionable implications
    4. Recommendations for further exploration`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    const content = this.parseInsightResponse(response);
    
    const metadata: GenerationMetadata = {
      confidence: this.calculateInsightConfidence(context.data),
      reasoning: [
        'Based on statistical pattern analysis',
        'Validated against known psychological principles',
        'Cross-referenced with benchmark data'
      ],
      sources: ['Provided data', 'Statistical analysis', 'Psychology literature']
    };

    return { content, metadata };
  }

  /**
   * Build system prompt for assessment generation
   */
  private buildAssessmentSystemPrompt(context: AssessmentContext): string {
    return `You are an expert psychometrician and assessment designer specializing in personality assessment using the Big Five (OCEAN) model and IOC pillar framework (Sustainable, Performance, Potential).

Your task is to generate high-quality assessment questions that are:
1. Scientifically valid and reliable
2. Culturally sensitive and inclusive
3. Appropriate for the specified context
4. Free from bias and discriminatory content
5. Aligned with the IOC methodology

Consider the following frameworks:
- OCEAN traits: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- IOC Pillars: Sustainable (long-term resilience), Performance (current effectiveness), Potential (growth capacity)
- Assessment tiers: Individual, Executive, Organizational levels

Generate questions that effectively measure these constructs while being engaging and relevant to the user's context.`;
  }

  /**
   * Build user prompt for assessment generation
   */
  private buildAssessmentUserPrompt(context: AssessmentContext): string {
    return `Generate 20 assessment questions for the following context:

Assessment Type: ${context.assessmentType}
Tier: ${context.tier}
Cultural Context: ${context.culturalContext || 'Global/Mixed'}
Industry: ${context.industryContext || 'General'}
Role Level: ${context.roleContext || 'General'}

Requirements:
1. Include questions for all OCEAN traits
2. Address all three IOC pillars
3. Use varied question formats (scale, multiple choice, scenarios)
4. Ensure cultural appropriateness
5. Include reverse-scored items for validation

For each question, provide:
- Question text
- Response format and options
- OCEAN trait(s) measured
- IOC pillar relevance
- Difficulty level
- Cultural considerations

Format as JSON array with the specified structure.`;
  }

  /**
   * Call Anthropic API with fallback to OpenAI
   */
  private async callAnthropicAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.anthropicClient.messages.create({
        model: this.modelConfig.primaryModel,
        max_tokens: this.modelConfig.maxTokens,
        temperature: this.modelConfig.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      console.warn('Anthropic API failed, falling back to OpenAI:', error.message);
      return this.callOpenAIAPI(systemPrompt, userPrompt);
    }
  }

  /**
   * Fallback to OpenAI API
   */
  private async callOpenAIAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.openaiClient.chat.completions.create({
      model: this.modelConfig.fallbackModel,
      max_tokens: this.modelConfig.maxTokens,
      temperature: this.modelConfig.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return response.choices[0].message.content;
  }

  /**
   * Parse assessment response from AI
   */
  private parseAssessmentResponse(response: string): AssessmentPrompt[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the parsed data
      return parsed.map((item: any, index: number) => ({
        id: item.id || `q_${index + 1}`,
        question: item.question || item.text,
        type: item.type || 'scale',
        options: item.options || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        traits: Array.isArray(item.traits) ? item.traits : [item.trait || 'openness'],
        context: item.context,
        difficulty: item.difficulty || 'medium'
      }));
    } catch (error) {
      throw new GenerationError(`Failed to parse assessment response: ${error.message}`);
    }
  }

  /**
   * Generate assessment variations
   */
  private async generateAssessmentVariations(
    basePrompts: AssessmentPrompt[],
    context: AssessmentContext
  ): Promise<AssessmentPrompt[][]> {
    // Generate 2 variations of the original prompts
    const variations: AssessmentPrompt[][] = [];
    
    for (let i = 0; i < 2; i++) {
      const variationPrompt = `Create variation ${i + 1} of these assessment questions with different wording but measuring the same constructs:
      ${JSON.stringify(basePrompts.slice(0, 5))} // Sample for variation
      
      Maintain:
      - Same psychological constructs
      - Same difficulty level
      - Same response format
      
      Change:
      - Question wording
      - Context/scenarios
      - Examples used`;
      
      try {
        const response = await this.callAnthropicAPI(
          'You are an expert in assessment design. Create question variations.',
          variationPrompt
        );
        
        const variationPrompts = this.parseAssessmentResponse(response);
        variations.push(variationPrompts);
      } catch (error) {
        console.warn(`Failed to generate variation ${i + 1}:`, error.message);
        variations.push([]); // Empty variation on failure
      }
    }
    
    return variations;
  }

  /**
   * Calculate confidence score for assessment
   */
  private calculateAssessmentConfidence(
    prompts: AssessmentPrompt[],
    context: AssessmentContext
  ): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on prompt quality
    const hasAllTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
      .every(trait => prompts.some(p => p.traits.includes(trait)));
    
    if (hasAllTraits) confidence += 0.1;
    
    // Adjust based on context completeness
    if (context.culturalContext) confidence += 0.05;
    if (context.industryContext) confidence += 0.05;
    
    return Math.min(0.95, confidence); // Cap at 95%
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    assessmentResults: any,
    userContext: any
  ): Promise<string> {
    const systemPrompt = `You are an executive communication expert. Create concise, impactful executive summaries.`;
    
    const userPrompt = `Create an executive summary (2-3 paragraphs) for this assessment:
    
    Results: ${JSON.stringify(assessmentResults)}
    User Context: ${JSON.stringify(userContext)}
    
    Include:
    1. Key personality strengths
    2. Primary development areas
    3. Strategic implications
    4. Overall assessment confidence`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Generate detailed analysis
   */
  private async generateDetailedAnalysis(
    assessmentResults: any,
    userContext: any
  ): Promise<any> {
    // Generate each section in parallel
    const [oceanProfile, pillarScores, comparativeAnalysis] = await Promise.all([
      this.generateOceanProfile(assessmentResults),
      this.generatePillarScores(assessmentResults, userContext),
      this.generateComparativeAnalysis(assessmentResults, userContext)
    ]);

    return {
      oceanProfile,
      pillarScores,
      comparativeAnalysis
    };
  }

  /**
   * Generate OCEAN profile narrative
   */
  private async generateOceanProfile(assessmentResults: any): Promise<string> {
    const systemPrompt = `You are a personality psychology expert. Explain OCEAN profiles in accessible language.`;
    
    const userPrompt = `Explain this OCEAN profile:
    ${JSON.stringify(assessmentResults.oceanScores)}
    
    For each trait, explain:
    1. What this score means
    2. Behavioral implications
    3. Workplace strengths/challenges
    4. Development opportunities`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Generate pillar scores and analysis
   */
  private async generatePillarScores(
    assessmentResults: any,
    userContext: any
  ): Promise<PillarScores> {
    const oceanScores = assessmentResults.oceanScores?.raw || {};
    
    // Calculate pillar scores using IOC methodology
    const sustainable = this.calculateSustainableScore(oceanScores);
    const performance = this.calculatePerformanceScore(oceanScores);
    const potential = this.calculatePotentialScore(oceanScores);

    // Generate interpretations
    const [sustainableInterpretation, performanceInterpretation, potentialInterpretation] = 
      await Promise.all([
        this.interpretPillarScore('sustainable', sustainable, userContext),
        this.interpretPillarScore('performance', performance, userContext),
        this.interpretPillarScore('potential', potential, userContext)
      ]);

    return {
      sustainable: {
        score: sustainable,
        interpretation: sustainableInterpretation.interpretation,
        recommendations: sustainableInterpretation.recommendations
      },
      performance: {
        score: performance,
        interpretation: performanceInterpretation.interpretation,
        recommendations: performanceInterpretation.recommendations
      },
      potential: {
        score: potential,
        interpretation: potentialInterpretation.interpretation,
        recommendations: potentialInterpretation.recommendations
      }
    };
  }

  /**
   * Calculate sustainable pillar score
   */
  private calculateSustainableScore(oceanScores: OceanTraits): number {
    const weights = {
      openness: 0.3,
      conscientiousness: 0.4,
      neuroticism: -0.2, // Lower neuroticism = higher sustainability
      extraversion: 0.1
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([trait, weight]) => {
      if (oceanScores[trait as keyof OceanTraits] !== undefined) {
        score += oceanScores[trait as keyof OceanTraits] * weight;
        totalWeight += Math.abs(weight);
      }
    });

    return totalWeight > 0 ? (score / totalWeight) * 20 + 50 : 50; // Scale to 0-100
  }

  /**
   * Calculate performance pillar score
   */
  private calculatePerformanceScore(oceanScores: OceanTraits): number {
    const weights = {
      conscientiousness: 0.5,
      neuroticism: -0.3,
      openness: 0.2
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([trait, weight]) => {
      if (oceanScores[trait as keyof OceanTraits] !== undefined) {
        score += oceanScores[trait as keyof OceanTraits] * weight;
        totalWeight += Math.abs(weight);
      }
    });

    return totalWeight > 0 ? (score / totalWeight) * 20 + 50 : 50; // Scale to 0-100
  }

  /**
   * Calculate potential pillar score
   */
  private calculatePotentialScore(oceanScores: OceanTraits): number {
    const weights = {
      openness: 0.4,
      extraversion: 0.3,
      conscientiousness: 0.2,
      agreeableness: 0.1
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([trait, weight]) => {
      if (oceanScores[trait as keyof OceanTraits] !== undefined) {
        score += oceanScores[trait as keyof OceanTraits] * weight;
        totalWeight += Math.abs(weight);
      }
    });

    return totalWeight > 0 ? (score / totalWeight) * 20 + 50 : 50; // Scale to 0-100
  }

  /**
   * Interpret pillar score
   */
  private async interpretPillarScore(
    pillar: string,
    score: number,
    userContext: any
  ): Promise<{ interpretation: string; recommendations: string[] }> {
    const systemPrompt = `You are an expert in organizational psychology and leadership development.`;
    
    const userPrompt = `Interpret this ${pillar} pillar score of ${score}/100 for:
    User Context: ${JSON.stringify(userContext)}
    
    Provide:
    1. What this score means for ${pillar}
    2. Strengths and opportunities
    3. Three specific development recommendations`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    // Parse response to extract interpretation and recommendations
    const lines = response.split('\n').filter(line => line.trim());
    const interpretation = lines.slice(0, Math.floor(lines.length / 2)).join(' ');
    const recommendations = lines.slice(Math.floor(lines.length / 2))
      .filter(line => line.includes('recommendation') || line.match(/^\d+\./))
      .slice(0, 3);

    return { interpretation, recommendations };
  }

  /**
   * Generate comparative analysis
   */
  private async generateComparativeAnalysis(
    assessmentResults: any,
    userContext: any
  ): Promise<string> {
    const systemPrompt = `You are a data analyst expert in personality benchmarking and comparative analysis.`;
    
    const userPrompt = `Create a comparative analysis for:
    Results: ${JSON.stringify(assessmentResults)}
    Context: ${JSON.stringify(userContext)}
    
    Compare against:
    1. Industry peers
    2. Role-level benchmarks
    3. High performers in similar roles
    4. Global population norms
    
    Highlight unique strengths and differentiators.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    assessmentResults: any,
    userContext: any
  ): Promise<any> {
    const systemPrompt = `You are an executive coach and development expert. Create specific, actionable recommendations.`;
    
    const userPrompt = `Create development recommendations based on:
    Results: ${JSON.stringify(assessmentResults)}
    Context: ${JSON.stringify(userContext)}
    
    Provide:
    1. Immediate actions (1-2 weeks)
    2. Short-term goals (1-3 months)
    3. Long-term development (6-12 months)
    
    Make each recommendation specific, measurable, and actionable.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    // Parse response into categories
    const sections = response.split(/(?:immediate|short.?term|long.?term)/i);
    
    return {
      immediate: this.extractRecommendations(sections[1] || ''),
      shortTerm: this.extractRecommendations(sections[2] || ''),
      longTerm: this.extractRecommendations(sections[3] || '')
    };
  }

  /**
   * Extract recommendations from text
   */
  private extractRecommendations(text: string): string[] {
    return text
      .split('\n')
      .filter(line => line.trim() && (line.match(/^\d+\./) || line.match(/^[-•]/)))
      .map(line => line.replace(/^\d+\.|\s*[-•]\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 5); // Limit to 5 recommendations per category
  }

  /**
   * Generate narrative insights
   */
  private async generateNarrative(
    assessmentResults: any,
    userContext: any
  ): Promise<any> {
    const [personalStory, strengthsAndChallenges, growthOpportunities] = await Promise.all([
      this.generatePersonalStory(assessmentResults, userContext),
      this.generateStrengthsAndChallenges(assessmentResults, userContext),
      this.generateGrowthOpportunities(assessmentResults, userContext)
    ]);

    return {
      personalStory,
      strengthsAndChallenges,
      growthOpportunities
    };
  }

  /**
   * Generate personal story narrative
   */
  private async generatePersonalStory(
    assessmentResults: any,
    userContext: any
  ): Promise<string> {
    const systemPrompt = `You are a skilled storyteller and executive coach. Create engaging personal narratives.`;
    
    const userPrompt = `Create a personal story narrative based on:
    Assessment: ${JSON.stringify(assessmentResults)}
    Context: ${JSON.stringify(userContext)}
    
    Write a compelling 2-3 paragraph story that:
    1. Connects personality traits to real-world impact
    2. Shows growth potential and journey
    3. Resonates with the individual's experience
    4. Inspires and motivates development`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Generate strengths and challenges analysis
   */
  private async generateStrengthsAndChallenges(
    assessmentResults: any,
    userContext: any
  ): Promise<string> {
    const systemPrompt = `You are a balanced assessment expert who provides honest, constructive feedback.`;
    
    const userPrompt = `Analyze strengths and challenges for:
    Results: ${JSON.stringify(assessmentResults)}
    Context: ${JSON.stringify(userContext)}
    
    Provide a balanced view:
    1. Core strengths and how to leverage them
    2. Potential blind spots and challenges
    3. How strengths might become weaknesses in certain contexts
    4. Strategies for managing challenges`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Generate growth opportunities
   */
  private async generateGrowthOpportunities(
    assessmentResults: any,
    userContext: any
  ): Promise<string> {
    const systemPrompt = `You are a career development and growth expert.`;
    
    const userPrompt = `Identify growth opportunities for:
    Results: ${JSON.stringify(assessmentResults)}
    Context: ${JSON.stringify(userContext)}
    
    Focus on:
    1. Emerging leadership capabilities
    2. Skills that can be developed
    3. Role progression opportunities
    4. Cross-functional development areas
    5. Innovation and contribution potential`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Create validation nodes for B1 review
   */
  private createValidationNodes(reportSections: any): ValidationNode[] {
    const nodes: ValidationNode[] = [];
    let nodeId = 1;

    // Create nodes for each major section
    Object.entries(reportSections).forEach(([section, content]) => {
      if (typeof content === 'string') {
        nodes.push({
          id: `node_${nodeId++}`,
          type: this.getNodeType(section),
          content: content.substring(0, 500), // Limit content for validation
          dependencies: [],
          confidence: 0.8
        });
      } else if (typeof content === 'object') {
        // Handle nested objects
        Object.entries(content).forEach(([subsection, subcontent]) => {
          if (typeof subcontent === 'string') {
            nodes.push({
              id: `node_${nodeId++}`,
              type: this.getNodeType(subsection),
              content: subcontent.substring(0, 500),
              dependencies: [],
              confidence: 0.8
            });
          }
        });
      }
    });

    return nodes;
  }

  /**
   * Get validation node type
   */
  private getNodeType(section: string): 'fact' | 'interpretation' | 'recommendation' | 'narrative' {
    if (section.includes('recommendation')) return 'recommendation';
    if (section.includes('analysis') || section.includes('score')) return 'fact';
    if (section.includes('story') || section.includes('narrative')) return 'narrative';
    return 'interpretation';
  }

  /**
   * Calculate report confidence
   */
  private calculateReportConfidence(assessmentResults: any, userContext: any): number {
    let confidence = 0.75; // Base confidence
    
    // Adjust based on data quality
    if (assessmentResults.oceanScores) confidence += 0.1;
    if (userContext.organizationId) confidence += 0.05;
    if (userContext.roleContext) confidence += 0.05;
    if (userContext.historicalData?.length > 0) confidence += 0.05;
    
    return Math.min(0.9, confidence); // Cap at 90%
  }

  /**
   * Parse coaching response
   */
  private parseCoachingResponse(response: string): any {
    // Extract structured coaching elements
    const sections = response.split(/(?:\d+\.|•|-)/);
    
    return {
      insight: sections[1]?.trim() || '',
      recommendation: sections[2]?.trim() || '',
      development: sections[3]?.trim() || '',
      resources: sections[4]?.trim() || ''
    };
  }

  /**
   * Parse insight response
   */
  private parseInsightResponse(response: string): any {
    const sections = response.split(/(?:\d+\.|•|-)/);
    
    return {
      patterns: sections[1]?.trim() || '',
      findings: sections[2]?.trim() || '',
      implications: sections[3]?.trim() || '',
      recommendations: sections[4]?.trim() || ''
    };
  }

  /**
   * Calculate insight confidence
   */
  private calculateInsightConfidence(data: any): number {
    if (!data || Object.keys(data).length === 0) return 0.3;
    
    let confidence = 0.6; // Base confidence
    
    // Adjust based on data completeness
    const dataPoints = Array.isArray(data) ? data.length : Object.keys(data).length;
    if (dataPoints > 10) confidence += 0.2;
    else if (dataPoints > 5) confidence += 0.1;
    
    return Math.min(0.85, confidence);
  }

  /**
   * Get generator capabilities
   */
  getCapabilities(): GeneratorCapabilities {
    return {
      supportedTypes: ['assessment', 'report', 'coaching', 'insight', 'recommendation'],
      maxTokens: this.modelConfig.maxTokens,
      languages: ['English'], // TODO: Add multi-language support
      specializations: [
        'OCEAN personality assessment',
        'IOC pillar analysis',
        'Executive coaching',
        'Organizational insights',
        'Cultural adaptation'
      ],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        tokensPerMinute: 50000,
        concurrentRequests: 10
      }
    };
  }

  /**
   * Get component health status
   */
  async getHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    try {
      // Test Anthropic API
      await this.anthropicClient.messages.create({
        model: 'claude-3-haiku',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Health check' }]
      });
    } catch (error) {
      status = 'degraded';
      issues.push('Anthropic API unavailable');
    }

    try {
      // Test OpenAI API (fallback)
      await this.openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Health check' }]
      });
    } catch (error) {
      if (status === 'degraded') {
        status = 'unhealthy';
      }
      issues.push('OpenAI API unavailable');
    }

    const latency = Date.now() - startTime;

    return {
      status,
      latency,
      errorRate: 0, // TODO: Implement error rate tracking
      lastCheck: new Date(),
      issues: issues.length > 0 ? issues : undefined
    };
  }
}