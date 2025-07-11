/**
 * A1 Prompt Library Enhancement System
 * Dynamic prompt generation and evolution for IOC assessments
 */

export interface BasePrompt {
  id: string;
  name: string;
  template: string;
  variables: string[];
  assessmentType: string;
  tier: 'individual' | 'executive' | 'organizational';
  traits: string[];
  pillars: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
  effectiveness: number;
  usageCount: number;
}

export interface ContextModifier {
  id: string;
  name: string;
  type: 'cultural' | 'industry' | 'role' | 'demographic';
  condition: string;
  modifications: PromptModification[];
  priority: number;
}

export interface PromptModification {
  target: 'language' | 'tone' | 'examples' | 'context' | 'options';
  operation: 'replace' | 'append' | 'prepend' | 'modify';
  value: string;
  condition?: string;
}

export interface CulturalModifier extends ContextModifier {
  type: 'cultural';
  culturalDimensions: {
    powerDistance: 'high' | 'medium' | 'low';
    individualismCollectivism: 'individualist' | 'collectivist' | 'mixed';
    uncertaintyAvoidance: 'high' | 'medium' | 'low';
    masculinityFemininity: 'masculine' | 'feminine' | 'mixed';
    longTermOrientation: 'long' | 'short' | 'mixed';
  };
}

export interface IndustryModifier extends ContextModifier {
  type: 'industry';
  industrySpecifics: {
    terminology: Record<string, string>;
    scenarios: string[];
    regulations: string[];
    commonChallenges: string[];
  };
}

export interface GeneratedPromptSet {
  prompts: EnhancedPrompt[];
  metadata: {
    generationStrategy: string;
    appliedModifiers: string[];
    culturalAdaptations: string[];
    industryAdaptations: string[];
    confidence: number;
    alternatives: EnhancedPrompt[][];
  };
}

export interface EnhancedPrompt extends BasePrompt {
  originalId: string;
  appliedModifiers: string[];
  culturalContext?: string;
  industryContext?: string;
  roleContext?: string;
  adaptationReasoning: string[];
}

export interface PromptEvolutionMetrics {
  promptId: string;
  metrics: {
    completionRate: number;
    engagementScore: number;
    accuracyScore: number;
    userSatisfaction: number;
    biasScore: number;
    culturalSensitivity: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    industries: Record<string, number>;
    roles: Record<string, number>;
    cultures: Record<string, number>;
  };
  feedback: {
    positive: string[];
    negative: string[];
    suggestions: string[];
  };
}

export interface PromptOptimizationResult {
  originalPrompt: BasePrompt;
  optimizedPrompt: BasePrompt;
  improvements: string[];
  confidence: number;
  testResults?: ABTestResult;
}

export interface ABTestResult {
  variant: 'A' | 'B';
  sampleSize: number;
  completionRate: number;
  engagementScore: number;
  significanceLevel: number;
  winnerVariant: 'A' | 'B' | 'no_difference';
}

export class A1PromptLibrary {
  private basePrompts: Map<string, BasePrompt>;
  private culturalModifiers: Map<string, CulturalModifier>;
  private industryModifiers: Map<string, IndustryModifier>;
  private contextModifiers: Map<string, ContextModifier>;
  private evolutionMetrics: Map<string, PromptEvolutionMetrics>;
  private anthropicClient: any;
  private optimizationThreshold: number;

  constructor(anthropicClient: any, optimizationThreshold: number = 0.1) {
    this.basePrompts = new Map();
    this.culturalModifiers = new Map();
    this.industryModifiers = new Map();
    this.contextModifiers = new Map();
    this.evolutionMetrics = new Map();
    this.anthropicClient = anthropicClient;
    this.optimizationThreshold = optimizationThreshold;
    
    this.initializeBasePrompts();
    this.initializeModifiers();
  }

  /**
   * Generate dynamic prompt set for assessment
   */
  async generatePromptSet(
    assessmentType: string,
    tier: 'individual' | 'executive' | 'organizational',
    context: {
      culturalContext?: string;
      industryContext?: string;
      roleContext?: string;
      demographicContext?: any;
    }
  ): Promise<GeneratedPromptSet> {
    // 1. Select base prompts
    const relevantBasePrompts = this.selectRelevantBasePrompts(assessmentType, tier);

    // 2. Identify applicable modifiers
    const applicableModifiers = await this.identifyApplicableModifiers(context);

    // 3. Generate enhanced prompts
    const enhancedPrompts = await this.applyModifiers(relevantBasePrompts, applicableModifiers);

    // 4. Validate and filter prompts
    const validatedPrompts = await this.validatePrompts(enhancedPrompts);

    // 5. Generate alternatives
    const alternatives = await this.generateAlternatives(validatedPrompts, context);

    // 6. Calculate generation confidence
    const confidence = this.calculateGenerationConfidence(validatedPrompts, applicableModifiers);

    return {
      prompts: validatedPrompts,
      metadata: {
        generationStrategy: 'context-adaptive',
        appliedModifiers: applicableModifiers.map(m => m.name),
        culturalAdaptations: this.extractCulturalAdaptations(applicableModifiers),
        industryAdaptations: this.extractIndustryAdaptations(applicableModifiers),
        confidence,
        alternatives
      }
    };
  }

  /**
   * Create new prompt with AI assistance
   */
  async createPrompt(
    requirements: {
      assessmentType: string;
      tier: string;
      traits: string[];
      pillars: string[];
      context?: any;
    }
  ): Promise<BasePrompt> {
    const systemPrompt = `You are an expert psychometrician and assessment designer. Create scientifically valid assessment prompts based on the Big Five personality model and IOC pillar framework.`;

    const userPrompt = `Create an assessment prompt with these requirements:

Assessment Type: ${requirements.assessmentType}
Tier: ${requirements.tier}
Target Traits: ${requirements.traits.join(', ')}
Target Pillars: ${requirements.pillars.join(', ')}
Context: ${JSON.stringify(requirements.context || {})}

Requirements:
1. Scientifically valid and reliable
2. Culturally sensitive and inclusive
3. Engaging and relevant
4. Clear and unambiguous
5. Appropriate difficulty level

Provide:
1. Main question text
2. Response options (if applicable)
3. Instructions for participants
4. Scoring guidelines
5. Cultural considerations
6. Potential bias risks

Format as a structured JSON object.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    const promptData = this.parsePromptCreationResponse(response);

    const newPrompt: BasePrompt = {
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: promptData.name || `${requirements.assessmentType}_${requirements.tier}_prompt`,
      template: promptData.template,
      variables: promptData.variables || [],
      assessmentType: requirements.assessmentType,
      tier: requirements.tier as 'individual' | 'executive' | 'organizational',
      traits: requirements.traits,
      pillars: requirements.pillars,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      effectiveness: 0.7, // Initial effectiveness estimate
      usageCount: 0
    };

    this.basePrompts.set(newPrompt.id, newPrompt);
    return newPrompt;
  }

  /**
   * Evolve prompts based on performance data
   */
  async evolvePrompts(): Promise<PromptOptimizationResult[]> {
    const optimizationResults: PromptOptimizationResult[] = [];

    for (const [promptId, prompt] of this.basePrompts) {
      const metrics = this.evolutionMetrics.get(promptId);
      
      if (metrics && this.shouldOptimizePrompt(prompt, metrics)) {
        const optimizationResult = await this.optimizePrompt(prompt, metrics);
        optimizationResults.push(optimizationResult);
      }
    }

    return optimizationResults;
  }

  /**
   * Optimize individual prompt
   */
  private async optimizePrompt(
    prompt: BasePrompt,
    metrics: PromptEvolutionMetrics
  ): Promise<PromptOptimizationResult> {
    const systemPrompt = `You are an expert in assessment optimization. Improve prompts based on performance data and user feedback.`;

    const userPrompt = `Optimize this assessment prompt based on performance data:

Current Prompt: ${JSON.stringify(prompt)}
Performance Metrics: ${JSON.stringify(metrics.metrics)}
User Feedback: ${JSON.stringify(metrics.feedback)}
Demographics: ${JSON.stringify(metrics.demographics)}

Issues identified:
${this.identifyPromptIssues(metrics)}

Provide:
1. Optimized prompt version
2. Specific improvements made
3. Reasoning for changes
4. Expected impact on metrics
5. Risk mitigation strategies

Maintain scientific validity while improving engagement and cultural sensitivity.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    const optimization = this.parseOptimizationResponse(response);

    const optimizedPrompt: BasePrompt = {
      ...prompt,
      id: `${prompt.id}_opt_${Date.now()}`,
      template: optimization.optimizedTemplate,
      version: this.incrementVersion(prompt.version),
      updatedAt: new Date(),
      effectiveness: prompt.effectiveness + 0.1 // Optimistic improvement estimate
    };

    // Store optimized prompt for A/B testing
    this.basePrompts.set(optimizedPrompt.id, optimizedPrompt);

    return {
      originalPrompt: prompt,
      optimizedPrompt,
      improvements: optimization.improvements,
      confidence: optimization.confidence
    };
  }

  /**
   * Conduct A/B testing between prompt versions
   */
  async conductABTest(
    promptA: BasePrompt,
    promptB: BasePrompt,
    duration: number = 30 // days
  ): Promise<ABTestResult> {
    // This would integrate with the assessment system to track real usage
    // For now, return a simulated result
    
    const mockResult: ABTestResult = {
      variant: 'A',
      sampleSize: 200,
      completionRate: 0.85,
      engagementScore: 0.78,
      significanceLevel: 0.05,
      winnerVariant: promptA.effectiveness > promptB.effectiveness ? 'A' : 'B'
    };

    return mockResult;
  }

  /**
   * Initialize base prompts
   */
  private initializeBasePrompts(): void {
    // Sample base prompts for different assessment types and tiers
    const basePrompts: BasePrompt[] = [
      {
        id: 'ocean_individual_openness_1',
        name: 'Individual Openness Assessment',
        template: 'I enjoy exploring new ideas and concepts, even if they challenge my current beliefs.',
        variables: [],
        assessmentType: 'personality',
        tier: 'individual',
        traits: ['openness'],
        pillars: ['potential'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveness: 0.75,
        usageCount: 0
      },
      {
        id: 'ocean_executive_leadership_1',
        name: 'Executive Leadership Assessment',
        template: 'When making strategic decisions, I consider multiple perspectives and potential long-term consequences.',
        variables: [],
        assessmentType: 'leadership',
        tier: 'executive',
        traits: ['openness', 'conscientiousness'],
        pillars: ['sustainable', 'performance'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveness: 0.82,
        usageCount: 0
      },
      {
        id: 'ocean_org_culture_1',
        name: 'Organizational Culture Assessment',
        template: 'Our organization encourages innovation and supports employees who take calculated risks.',
        variables: ['organization_name'],
        assessmentType: 'culture',
        tier: 'organizational',
        traits: ['openness', 'extraversion'],
        pillars: ['potential', 'performance'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveness: 0.78,
        usageCount: 0
      }
    ];

    basePrompts.forEach(prompt => {
      this.basePrompts.set(prompt.id, prompt);
    });
  }

  /**
   * Initialize modifiers
   */
  private initializeModifiers(): void {
    // Cultural modifiers
    const culturalModifiers: CulturalModifier[] = [
      {
        id: 'east_asian_collectivist',
        name: 'East Asian Collectivist',
        type: 'cultural',
        condition: 'culture.includes("chinese") || culture.includes("japanese") || culture.includes("korean")',
        modifications: [
          {
            target: 'language',
            operation: 'modify',
            value: 'Replace "I" statements with "we" or "our team" where appropriate'
          },
          {
            target: 'examples',
            operation: 'replace',
            value: 'Use group harmony and collective achievement examples'
          }
        ],
        priority: 1,
        culturalDimensions: {
          powerDistance: 'high',
          individualismCollectivism: 'collectivist',
          uncertaintyAvoidance: 'high',
          masculinityFemininity: 'mixed',
          longTermOrientation: 'long'
        }
      }
    ];

    // Industry modifiers
    const industryModifiers: IndustryModifier[] = [
      {
        id: 'healthcare_modifier',
        name: 'Healthcare Industry',
        type: 'industry',
        condition: 'industry === "healthcare"',
        modifications: [
          {
            target: 'examples',
            operation: 'replace',
            value: 'Use patient care and healthcare team scenarios'
          },
          {
            target: 'context',
            operation: 'append',
            value: 'Consider HIPAA compliance and patient safety in responses'
          }
        ],
        priority: 2,
        industrySpecifics: {
          terminology: {
            'team': 'care team',
            'customer': 'patient',
            'outcome': 'patient outcome'
          },
          scenarios: [
            'Emergency response situations',
            'Patient care coordination',
            'Medical decision making'
          ],
          regulations: ['HIPAA', 'FDA', 'Joint Commission'],
          commonChallenges: [
            'Work-life balance',
            'Emotional resilience',
            'Continuous learning'
          ]
        }
      }
    ];

    culturalModifiers.forEach(modifier => {
      this.culturalModifiers.set(modifier.id, modifier);
    });

    industryModifiers.forEach(modifier => {
      this.industryModifiers.set(modifier.id, modifier);
    });
  }

  /**
   * Select relevant base prompts
   */
  private selectRelevantBasePrompts(
    assessmentType: string,
    tier: 'individual' | 'executive' | 'organizational'
  ): BasePrompt[] {
    const relevantPrompts: BasePrompt[] = [];

    for (const prompt of this.basePrompts.values()) {
      if (prompt.assessmentType === assessmentType && prompt.tier === tier) {
        relevantPrompts.push(prompt);
      }
    }

    // Sort by effectiveness
    return relevantPrompts.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Identify applicable modifiers
   */
  private async identifyApplicableModifiers(context: any): Promise<ContextModifier[]> {
    const applicableModifiers: ContextModifier[] = [];

    // Check cultural modifiers
    if (context.culturalContext) {
      for (const modifier of this.culturalModifiers.values()) {
        if (this.evaluateCondition(modifier.condition, { culture: context.culturalContext })) {
          applicableModifiers.push(modifier);
        }
      }
    }

    // Check industry modifiers
    if (context.industryContext) {
      for (const modifier of this.industryModifiers.values()) {
        if (this.evaluateCondition(modifier.condition, { industry: context.industryContext })) {
          applicableModifiers.push(modifier);
        }
      }
    }

    // Sort by priority
    return applicableModifiers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Apply modifiers to base prompts
   */
  private async applyModifiers(
    basePrompts: BasePrompt[],
    modifiers: ContextModifier[]
  ): Promise<EnhancedPrompt[]> {
    const enhancedPrompts: EnhancedPrompt[] = [];

    for (const basePrompt of basePrompts) {
      let enhancedTemplate = basePrompt.template;
      const appliedModifiers: string[] = [];
      const adaptationReasoning: string[] = [];

      for (const modifier of modifiers) {
        const { modifiedTemplate, reasoning } = await this.applyModifier(enhancedTemplate, modifier);
        enhancedTemplate = modifiedTemplate;
        appliedModifiers.push(modifier.id);
        adaptationReasoning.push(reasoning);
      }

      const enhancedPrompt: EnhancedPrompt = {
        ...basePrompt,
        id: `${basePrompt.id}_enhanced_${Date.now()}`,
        originalId: basePrompt.id,
        template: enhancedTemplate,
        appliedModifiers,
        adaptationReasoning
      };

      enhancedPrompts.push(enhancedPrompt);
    }

    return enhancedPrompts;
  }

  /**
   * Apply individual modifier
   */
  private async applyModifier(
    template: string,
    modifier: ContextModifier
  ): Promise<{ modifiedTemplate: string; reasoning: string }> {
    let modifiedTemplate = template;
    let reasoning = `Applied ${modifier.name}:`;

    for (const modification of modifier.modifications) {
      switch (modification.operation) {
        case 'replace':
          modifiedTemplate = await this.replaceContent(modifiedTemplate, modification);
          reasoning += ` replaced ${modification.target}`;
          break;
        case 'append':
          modifiedTemplate += ` ${modification.value}`;
          reasoning += ` appended to ${modification.target}`;
          break;
        case 'prepend':
          modifiedTemplate = `${modification.value} ${modifiedTemplate}`;
          reasoning += ` prepended to ${modification.target}`;
          break;
        case 'modify':
          modifiedTemplate = await this.modifyContent(modifiedTemplate, modification);
          reasoning += ` modified ${modification.target}`;
          break;
      }
    }

    return { modifiedTemplate, reasoning };
  }

  /**
   * Replace content using AI
   */
  private async replaceContent(
    template: string,
    modification: PromptModification
  ): Promise<string> {
    const systemPrompt = `You are an expert in cultural adaptation and assessment design. Modify assessment prompts according to specific requirements.`;

    const userPrompt = `Modify this assessment prompt:

Original: "${template}"
Target: ${modification.target}
Instruction: ${modification.value}

Provide only the modified prompt, maintaining the same assessment intent and difficulty level.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Modify content using AI
   */
  private async modifyContent(
    template: string,
    modification: PromptModification
  ): Promise<string> {
    const systemPrompt = `You are an expert in assessment modification. Apply specific modifications while preserving assessment validity.`;

    const userPrompt = `Apply this modification to the assessment prompt:

Original: "${template}"
Modification: ${modification.value}

Ensure the modified prompt:
1. Maintains assessment validity
2. Preserves difficulty level
3. Remains clear and unambiguous
4. Follows the modification instruction

Provide only the modified prompt.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return response.trim();
  }

  /**
   * Validate prompts
   */
  private async validatePrompts(prompts: EnhancedPrompt[]): Promise<EnhancedPrompt[]> {
    const validatedPrompts: EnhancedPrompt[] = [];

    for (const prompt of prompts) {
      const validationResult = await this.validatePrompt(prompt);
      if (validationResult.isValid) {
        validatedPrompts.push(prompt);
      }
    }

    return validatedPrompts;
  }

  /**
   * Validate individual prompt
   */
  private async validatePrompt(prompt: EnhancedPrompt): Promise<{ isValid: boolean; issues: string[] }> {
    const systemPrompt = `You are an expert in assessment validation. Check prompts for bias, clarity, cultural sensitivity, and scientific validity.`;

    const userPrompt = `Validate this assessment prompt:

Prompt: "${prompt.template}"
Assessment Type: ${prompt.assessmentType}
Tier: ${prompt.tier}
Target Traits: ${prompt.traits.join(', ')}
Applied Modifiers: ${prompt.appliedModifiers.join(', ')}

Check for:
1. Bias and fairness
2. Cultural sensitivity
3. Clarity and ambiguity
4. Scientific validity
5. Accessibility

Provide validation result as JSON: {"isValid": boolean, "issues": ["issue1", "issue2"]}`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      return { isValid: false, issues: ['Validation parsing failed'] };
    }
  }

  /**
   * Generate alternatives
   */
  private async generateAlternatives(
    prompts: EnhancedPrompt[],
    context: any
  ): Promise<EnhancedPrompt[][]> {
    const alternatives: EnhancedPrompt[][] = [];

    for (const prompt of prompts.slice(0, 3)) { // Generate alternatives for top 3 prompts
      const promptAlternatives = await this.generatePromptAlternatives(prompt, context);
      alternatives.push(promptAlternatives);
    }

    return alternatives;
  }

  /**
   * Generate alternatives for a single prompt
   */
  private async generatePromptAlternatives(
    prompt: EnhancedPrompt,
    context: any
  ): Promise<EnhancedPrompt[]> {
    const systemPrompt = `You are an expert assessment designer. Create alternative versions of prompts that measure the same constructs with different approaches.`;

    const userPrompt = `Create 2 alternative versions of this assessment prompt:

Original: "${prompt.template}"
Assessment Type: ${prompt.assessmentType}
Target Traits: ${prompt.traits.join(', ')}
Context: ${JSON.stringify(context)}

For each alternative:
1. Use different wording/approach
2. Maintain same psychological constructs
3. Preserve difficulty level
4. Ensure cultural appropriateness

Provide as JSON array: [{"version": 1, "prompt": "..."}, {"version": 2, "prompt": "..."}]`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    
    try {
      const alternatives = JSON.parse(response);
      return alternatives.map((alt: any, index: number) => ({
        ...prompt,
        id: `${prompt.id}_alt_${index + 1}`,
        template: alt.prompt,
        version: `${prompt.version}-alt${index + 1}`
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate generation confidence
   */
  private calculateGenerationConfidence(
    prompts: EnhancedPrompt[],
    modifiers: ContextModifier[]
  ): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on prompt quality
    const avgEffectiveness = prompts.reduce((sum, p) => sum + p.effectiveness, 0) / prompts.length;
    confidence += (avgEffectiveness - 0.5) * 0.3;

    // Adjust based on modifier application
    const modifierBonus = Math.min(modifiers.length * 0.05, 0.15);
    confidence += modifierBonus;

    // Adjust based on validation success
    confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  /**
   * Extract cultural adaptations
   */
  private extractCulturalAdaptations(modifiers: ContextModifier[]): string[] {
    return modifiers
      .filter(m => m.type === 'cultural')
      .map(m => m.name);
  }

  /**
   * Extract industry adaptations
   */
  private extractIndustryAdaptations(modifiers: ContextModifier[]): string[] {
    return modifiers
      .filter(m => m.type === 'industry')
      .map(m => m.name);
  }

  /**
   * Evaluate condition string
   */
  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      const func = new Function('culture', 'industry', 'role', `return ${condition}`);
      return func(context.culture, context.industry, context.role);
    } catch (error) {
      return false;
    }
  }

  /**
   * Should optimize prompt based on metrics
   */
  private shouldOptimizePrompt(prompt: BasePrompt, metrics: PromptEvolutionMetrics): boolean {
    const performanceIssues = 
      metrics.metrics.completionRate < 0.8 ||
      metrics.metrics.engagementScore < 0.7 ||
      metrics.metrics.userSatisfaction < 0.75 ||
      metrics.metrics.biasScore > 0.3;

    const hasNegativeFeedback = metrics.feedback.negative.length > metrics.feedback.positive.length;
    const highUsage = prompt.usageCount > 100;

    return (performanceIssues || hasNegativeFeedback) && highUsage;
  }

  /**
   * Identify prompt issues from metrics
   */
  private identifyPromptIssues(metrics: PromptEvolutionMetrics): string {
    const issues: string[] = [];

    if (metrics.metrics.completionRate < 0.8) {
      issues.push('Low completion rate indicates potential clarity or length issues');
    }
    if (metrics.metrics.biasScore > 0.3) {
      issues.push('High bias score suggests cultural or demographic bias');
    }
    if (metrics.metrics.userSatisfaction < 0.75) {
      issues.push('Low user satisfaction indicates engagement or relevance issues');
    }
    if (metrics.feedback.negative.length > 3) {
      issues.push(`Negative feedback themes: ${metrics.feedback.negative.slice(0, 3).join(', ')}`);
    }

    return issues.join('; ');
  }

  /**
   * Parse prompt creation response
   */
  private parsePromptCreationResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        name: 'Generated Prompt',
        template: response.trim(),
        variables: []
      };
    } catch (error) {
      return {
        name: 'Generated Prompt',
        template: response.trim(),
        variables: []
      };
    }
  }

  /**
   * Parse optimization response
   */
  private parseOptimizationResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      const lines = response.split('\n').filter(line => line.trim());
      return {
        optimizedTemplate: lines[0] || '',
        improvements: lines.slice(1, 4),
        confidence: 0.8
      };
    } catch (error) {
      return {
        optimizedTemplate: response.trim(),
        improvements: ['General optimization applied'],
        confidence: 0.7
      };
    }
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropicAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.anthropicClient.messages.create({
        model: 'claude-3-opus',
        max_tokens: 2048,
        temperature: 0.7,
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
      console.error('Anthropic API call failed:', error.message);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }
  }

  /**
   * Get prompt library statistics
   */
  getStatistics(): {
    totalPrompts: number;
    averageEffectiveness: number;
    totalUsage: number;
    recentOptimizations: number;
    topPerformingPrompts: BasePrompt[];
  } {
    const prompts = Array.from(this.basePrompts.values());
    const totalUsage = prompts.reduce((sum, p) => sum + p.usageCount, 0);
    const averageEffectiveness = prompts.reduce((sum, p) => sum + p.effectiveness, 0) / prompts.length;
    const recentOptimizations = prompts.filter(p => 
      Date.now() - p.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const topPerformingPrompts = prompts
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5);

    return {
      totalPrompts: prompts.length,
      averageEffectiveness,
      totalUsage,
      recentOptimizations,
      topPerformingPrompts
    };
  }
}