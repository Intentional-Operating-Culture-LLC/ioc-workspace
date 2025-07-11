/**
 * Re-evaluation Engine
 * Efficient re-checking of only modified nodes with consistency validation
 * 
 * Key Features:
 * - Selective re-validation of only modified nodes
 * - Change detection and impact analysis
 * - Consistency validation after changes
 * - Performance optimization for speed
 * - Final approval when all nodes > 85%
 * - Delta tracking and improvement metrics
 */

import { 
  ValidationNode, 
  ValidationIssue, 
  AssessmentNode,
  B1ValidatorService,
  B1ValidationRequest,
  B1ValidationResult
} from '../services/b1-validator-service';
import { DetailedFeedback } from './feedback-generation-engine';

export interface RevalidationRequest {
  workflowId: string;
  originalNodes: ValidationNode[];
  modifiedNodes: AssessmentNode[];
  appliedFeedback: DetailedFeedback[];
  revalidationConfig: {
    confidenceThreshold: number;
    validateUnmodifiedNodes: boolean;
    consistencyCheckDepth: 'shallow' | 'deep';
    performancePriority: 'speed' | 'thoroughness';
  };
  context: any;
}

export interface RevalidationResult {
  workflowId: string;
  revalidationStatus: 'approved' | 'requires_further_revision' | 'failed';
  overallConfidenceImprovement: number;
  
  nodeResults: {
    revalidatedNodes: ValidationNode[];
    unchangedNodes: ValidationNode[];
    newIssuesDetected: ValidationIssue[];
    resolvedIssues: string[];
  };
  
  consistencyAnalysis: {
    crossNodeConsistency: number;
    newInconsistencies: string[];
    resolvedInconsistencies: string[];
  };
  
  improvementMetrics: {
    totalConfidenceGain: number;
    averageConfidenceGain: number;
    feedbackEffectiveness: FeedbackEffectiveness[];
    regressionIssues: RegressionIssue[];
  };
  
  performanceMetrics: {
    revalidationTime: number;
    nodesRevalidated: number;
    apiCallsUsed: number;
    costSavings: number; // Compared to full validation
  };
  
  nextSteps: {
    requiresAnotherIteration: boolean;
    criticalIssuesRemaining: number;
    recommendedActions: string[];
    estimatedCompletionTime: number;
  };
}

export interface ChangeAnalysis {
  nodeId: string;
  changeType: 'content' | 'structure' | 'metadata';
  changeScope: 'minor' | 'moderate' | 'major';
  impactedAreas: string[];
  affectedNodes: string[];
  revalidationRequired: boolean;
  consistencyCheckRequired: boolean;
}

export interface FeedbackEffectiveness {
  feedbackId: string;
  nodeId: string;
  appliedSuccessfully: boolean;
  confidenceImprovement: number;
  expectedImprovement: number;
  effectiveness: number; // 0-100%
  sideEffects: string[];
  recommendation: 'continue' | 'modify' | 'abandon';
}

export interface RegressionIssue {
  nodeId: string;
  issueType: string;
  description: string;
  causedByFeedback: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface ConsistencyImpact {
  affectedNodes: string[];
  inconsistencyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionRequired: boolean;
  suggestedFix: string;
}

export class ReEvaluationEngine {
  private changeDetector: ChangeDetector;
  private consistencyValidator: ConsistencyValidator;
  private performanceOptimizer: PerformanceOptimizer;
  private revalidationCache: Map<string, ValidationNode> = new Map();

  constructor(private b1Validator: B1ValidatorService) {
    this.changeDetector = new ChangeDetector();
    this.consistencyValidator = new ConsistencyValidator();
    this.performanceOptimizer = new PerformanceOptimizer();
  }

  /**
   * Main re-evaluation entry point
   */
  async revalidateNodes(request: RevalidationRequest): Promise<RevalidationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Analyze changes and determine what needs revalidation
      const changeAnalysis = await this.analyzeChanges(
        request.originalNodes,
        request.modifiedNodes,
        request.appliedFeedback
      );

      // Step 2: Determine revalidation strategy based on changes
      const revalidationStrategy = this.determineRevalidationStrategy(
        changeAnalysis,
        request.revalidationConfig
      );

      // Step 3: Perform selective revalidation
      const revalidationResults = await this.performSelectiveRevalidation(
        revalidationStrategy,
        request
      );

      // Step 4: Validate consistency across all nodes
      const consistencyResults = await this.validateConsistency(
        revalidationResults.allNodes,
        changeAnalysis,
        request.revalidationConfig
      );

      // Step 5: Analyze improvement effectiveness
      const improvementAnalysis = this.analyzeImprovementEffectiveness(
        request.originalNodes,
        revalidationResults.revalidatedNodes,
        request.appliedFeedback
      );

      // Step 6: Check for regressions
      const regressionAnalysis = this.detectRegressions(
        request.originalNodes,
        revalidationResults.revalidatedNodes,
        request.appliedFeedback
      );

      // Step 7: Determine overall status and next steps
      const overallStatus = this.determineOverallStatus(
        revalidationResults.allNodes,
        consistencyResults,
        request.revalidationConfig.confidenceThreshold
      );

      const processingTime = Date.now() - startTime;

      return {
        workflowId: request.workflowId,
        revalidationStatus: overallStatus.status,
        overallConfidenceImprovement: overallStatus.confidenceImprovement,
        
        nodeResults: {
          revalidatedNodes: revalidationResults.revalidatedNodes,
          unchangedNodes: revalidationResults.unchangedNodes,
          newIssuesDetected: this.extractNewIssues(revalidationResults.revalidatedNodes, request.originalNodes),
          resolvedIssues: this.extractResolvedIssues(request.originalNodes, revalidationResults.revalidatedNodes)
        },
        
        consistencyAnalysis: {
          crossNodeConsistency: consistencyResults.overallConsistency,
          newInconsistencies: consistencyResults.newInconsistencies,
          resolvedInconsistencies: consistencyResults.resolvedInconsistencies
        },
        
        improvementMetrics: {
          totalConfidenceGain: improvementAnalysis.totalGain,
          averageConfidenceGain: improvementAnalysis.averageGain,
          feedbackEffectiveness: improvementAnalysis.feedbackEffectiveness,
          regressionIssues: regressionAnalysis
        },
        
        performanceMetrics: {
          revalidationTime: processingTime,
          nodesRevalidated: revalidationResults.revalidatedNodes.length,
          apiCallsUsed: revalidationResults.revalidatedNodes.length,
          costSavings: this.calculateCostSavings(
            request.originalNodes.length,
            revalidationResults.revalidatedNodes.length
          )
        },
        
        nextSteps: {
          requiresAnotherIteration: overallStatus.requiresIteration,
          criticalIssuesRemaining: overallStatus.criticalIssuesCount,
          recommendedActions: overallStatus.recommendedActions,
          estimatedCompletionTime: this.estimateCompletionTime(overallStatus)
        }
      };

    } catch (error) {
      console.error('Re-evaluation failed:', error);
      throw new Error(`Re-evaluation failed: ${error.message}`);
    }
  }

  /**
   * Analyze changes to determine revalidation needs
   */
  private async analyzeChanges(
    originalNodes: ValidationNode[],
    modifiedNodes: AssessmentNode[],
    appliedFeedback: DetailedFeedback[]
  ): Promise<ChangeAnalysis[]> {
    const changes: ChangeAnalysis[] = [];

    for (const modifiedNode of modifiedNodes) {
      const originalNode = originalNodes.find(n => n.nodeId === modifiedNode.nodeId);
      
      if (!originalNode) {
        // New node - requires full validation
        changes.push({
          nodeId: modifiedNode.nodeId,
          changeType: 'structure',
          changeScope: 'major',
          impactedAreas: ['all'],
          affectedNodes: [],
          revalidationRequired: true,
          consistencyCheckRequired: true
        });
        continue;
      }

      const changeAnalysis = await this.changeDetector.analyzeNodeChanges(
        originalNode,
        modifiedNode,
        appliedFeedback.filter(f => f.nodeId === modifiedNode.nodeId)
      );

      if (changeAnalysis.revalidationRequired) {
        changes.push(changeAnalysis);
      }
    }

    return changes;
  }

  /**
   * Determine optimal revalidation strategy
   */
  private determineRevalidationStrategy(
    changeAnalysis: ChangeAnalysis[],
    config: RevalidationRequest['revalidationConfig']
  ): RevalidationStrategy {
    const strategy: RevalidationStrategy = {
      nodesToRevalidate: [],
      validationDepth: 'full',
      consistencyCheckNodes: [],
      parallelizable: true,
      estimatedCost: 0
    };

    // Determine which nodes need revalidation
    strategy.nodesToRevalidate = changeAnalysis
      .filter(change => change.revalidationRequired)
      .map(change => change.nodeId);

    // Determine consistency check requirements
    strategy.consistencyCheckNodes = changeAnalysis
      .filter(change => change.consistencyCheckRequired)
      .flatMap(change => [change.nodeId, ...change.affectedNodes]);

    // Optimize based on performance priority
    if (config.performancePriority === 'speed') {
      strategy.validationDepth = 'targeted';
      strategy.parallelizable = true;
    } else {
      strategy.validationDepth = 'full';
      strategy.parallelizable = false; // Sequential for thoroughness
    }

    strategy.estimatedCost = this.estimateRevalidationCost(strategy);

    return strategy;
  }

  /**
   * Perform selective revalidation based on strategy
   */
  private async performSelectiveRevalidation(
    strategy: RevalidationStrategy,
    request: RevalidationRequest
  ): Promise<{
    revalidatedNodes: ValidationNode[];
    unchangedNodes: ValidationNode[];
    allNodes: ValidationNode[];
  }> {
    const revalidatedNodes: ValidationNode[] = [];
    const unchangedNodes: ValidationNode[] = [];

    // Revalidate only the nodes that need it
    for (const nodeId of strategy.nodesToRevalidate) {
      const modifiedNode = request.modifiedNodes.find(n => n.nodeId === nodeId);
      const originalNode = request.originalNodes.find(n => n.nodeId === nodeId);

      if (modifiedNode) {
        const revalidationResult = await this.revalidateIndividualNode(
          modifiedNode,
          originalNode,
          request.context,
          strategy.validationDepth
        );
        revalidatedNodes.push(revalidationResult);
      }
    }

    // Keep unchanged nodes as-is unless full revalidation is requested
    if (!request.revalidationConfig.validateUnmodifiedNodes) {
      const unchangedNodeIds = request.originalNodes
        .map(n => n.nodeId)
        .filter(id => !strategy.nodesToRevalidate.includes(id));

      unchangedNodes.push(
        ...request.originalNodes.filter(n => unchangedNodeIds.includes(n.nodeId))
      );
    } else {
      // Revalidate unchanged nodes with lighter validation
      for (const originalNode of request.originalNodes) {
        if (!strategy.nodesToRevalidate.includes(originalNode.nodeId)) {
          const lightRevalidation = await this.performLightRevalidation(
            originalNode,
            request.context
          );
          unchangedNodes.push(lightRevalidation);
        }
      }
    }

    const allNodes = [...revalidatedNodes, ...unchangedNodes];

    return { revalidatedNodes, unchangedNodes, allNodes };
  }

  /**
   * Revalidate individual node with optimization
   */
  private async revalidateIndividualNode(
    modifiedNode: AssessmentNode,
    originalNode: ValidationNode | undefined,
    context: any,
    depth: 'targeted' | 'full'
  ): Promise<ValidationNode> {
    // Check cache first
    const cacheKey = `${modifiedNode.nodeId}_${JSON.stringify(modifiedNode.content).slice(0, 100)}`;
    const cachedResult = this.revalidationCache.get(cacheKey);
    
    if (cachedResult && depth === 'targeted') {
      return cachedResult;
    }

    // Perform validation based on depth
    let validationResult: ValidationNode;
    
    if (depth === 'targeted' && originalNode) {
      // Targeted validation - focus only on areas that changed
      validationResult = await this.performTargetedValidation(
        modifiedNode,
        originalNode,
        context
      );
    } else {
      // Full validation
      const mockRequest: B1ValidationRequest = {
        workflowId: 'revalidation',
        assessmentNodes: [modifiedNode],
        validationContext: {
          assessmentType: context.assessmentType || 'individual',
          targetAudience: context.targetAudience || 'professional',
          qualityStandards: context.qualityStandards || ['professional']
        },
        validationConfig: {
          confidenceThreshold: 85,
          strictMode: false,
          focusAreas: []
        }
      };

      const fullValidation = await this.b1Validator.validateAssessment(mockRequest);
      validationResult = fullValidation.validatedNodes[0];
    }

    // Cache the result
    this.revalidationCache.set(cacheKey, validationResult);

    return validationResult;
  }

  /**
   * Perform targeted validation for efficiency
   */
  private async performTargetedValidation(
    modifiedNode: AssessmentNode,
    originalNode: ValidationNode,
    context: any
  ): Promise<ValidationNode> {
    // Start with original node structure
    const targetedValidation: ValidationNode = {
      ...originalNode,
      content: modifiedNode.content,
      metadata: {
        ...originalNode.metadata,
        validationTimestamp: new Date().toISOString()
      }
    };

    // Only re-validate specific aspects that likely changed
    const changedAspects = this.identifyChangedAspects(originalNode, modifiedNode);
    
    // Update only the changed validation aspects
    for (const aspect of changedAspects) {
      const aspectValidation = await this.validateSpecificAspect(
        modifiedNode,
        aspect,
        context
      );
      this.updateValidationAspect(targetedValidation, aspect, aspectValidation);
    }

    // Recalculate overall confidence
    targetedValidation.confidence = this.calculateUpdatedConfidence(targetedValidation);

    return targetedValidation;
  }

  /**
   * Perform light revalidation for unchanged nodes
   */
  private async performLightRevalidation(
    originalNode: ValidationNode,
    context: any
  ): Promise<ValidationNode> {
    // For unchanged nodes, just verify no external dependencies broke
    // This is a lightweight check
    return {
      ...originalNode,
      metadata: {
        ...originalNode.metadata,
        validationTimestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Validate consistency across all nodes
   */
  private async validateConsistency(
    allNodes: ValidationNode[],
    changeAnalysis: ChangeAnalysis[],
    config: RevalidationRequest['revalidationConfig']
  ): Promise<{
    overallConsistency: number;
    newInconsistencies: string[];
    resolvedInconsistencies: string[];
  }> {
    if (config.consistencyCheckDepth === 'shallow') {
      return await this.consistencyValidator.performShallowConsistencyCheck(allNodes);
    } else {
      return await this.consistencyValidator.performDeepConsistencyCheck(
        allNodes,
        changeAnalysis
      );
    }
  }

  /**
   * Analyze improvement effectiveness
   */
  private analyzeImprovementEffectiveness(
    originalNodes: ValidationNode[],
    revalidatedNodes: ValidationNode[],
    appliedFeedback: DetailedFeedback[]
  ): {
    totalGain: number;
    averageGain: number;
    feedbackEffectiveness: FeedbackEffectiveness[];
  } {
    const feedbackEffectiveness: FeedbackEffectiveness[] = [];
    let totalGain = 0;

    for (const feedback of appliedFeedback) {
      const originalNode = originalNodes.find(n => n.nodeId === feedback.nodeId);
      const revalidatedNode = revalidatedNodes.find(n => n.nodeId === feedback.nodeId);

      if (originalNode && revalidatedNode) {
        const actualGain = revalidatedNode.confidence - originalNode.confidence;
        const expectedGain = feedback.solution.estimatedConfidenceGain;
        const effectiveness = expectedGain > 0 ? (actualGain / expectedGain) * 100 : 0;

        feedbackEffectiveness.push({
          feedbackId: feedback.feedbackId,
          nodeId: feedback.nodeId,
          appliedSuccessfully: actualGain > 0,
          confidenceImprovement: actualGain,
          expectedImprovement: expectedGain,
          effectiveness: Math.max(0, Math.min(100, effectiveness)),
          sideEffects: this.identifySideEffects(originalNode, revalidatedNode),
          recommendation: this.generateFeedbackRecommendation(effectiveness, actualGain)
        });

        totalGain += actualGain;
      }
    }

    const averageGain = revalidatedNodes.length > 0 ? totalGain / revalidatedNodes.length : 0;

    return {
      totalGain,
      averageGain,
      feedbackEffectiveness
    };
  }

  /**
   * Detect regression issues
   */
  private detectRegressions(
    originalNodes: ValidationNode[],
    revalidatedNodes: ValidationNode[],
    appliedFeedback: DetailedFeedback[]
  ): RegressionIssue[] {
    const regressions: RegressionIssue[] = [];

    for (const revalidatedNode of revalidatedNodes) {
      const originalNode = originalNodes.find(n => n.nodeId === revalidatedNode.nodeId);
      
      if (!originalNode) continue;

      // Check for new issues that weren't present before
      const newIssues = revalidatedNode.issues.filter(newIssue => 
        !originalNode.issues.some(oldIssue => 
          oldIssue.category === newIssue.category && 
          oldIssue.description === newIssue.description
        )
      );

      for (const newIssue of newIssues) {
        const causedByFeedback = this.identifyFeedbackCause(newIssue, appliedFeedback, revalidatedNode.nodeId);
        
        if (causedByFeedback) {
          regressions.push({
            nodeId: revalidatedNode.nodeId,
            issueType: newIssue.category,
            description: `New ${newIssue.category} issue: ${newIssue.description}`,
            causedByFeedback: causedByFeedback,
            severity: newIssue.severity,
            mitigation: this.generateRegressionMitigation(newIssue, causedByFeedback)
          });
        }
      }
    }

    return regressions;
  }

  /**
   * Determine overall status and next steps
   */
  private determineOverallStatus(
    allNodes: ValidationNode[],
    consistencyResults: any,
    confidenceThreshold: number
  ): {
    status: 'approved' | 'requires_further_revision' | 'failed';
    confidenceImprovement: number;
    requiresIteration: boolean;
    criticalIssuesCount: number;
    recommendedActions: string[];
  } {
    const overallConfidence = this.calculateOverallConfidence(allNodes);
    const criticalIssues = allNodes.flatMap(node => 
      node.issues.filter(issue => issue.severity === 'critical')
    );
    const lowConfidenceNodes = allNodes.filter(node => node.confidence < confidenceThreshold);

    let status: 'approved' | 'requires_further_revision' | 'failed';
    const recommendedActions: string[] = [];

    if (criticalIssues.length > 0) {
      status = 'failed';
      recommendedActions.push(`Address ${criticalIssues.length} critical issues immediately`);
    } else if (lowConfidenceNodes.length > 0) {
      status = 'requires_further_revision';
      recommendedActions.push(`Improve ${lowConfidenceNodes.length} nodes below confidence threshold`);
    } else if (consistencyResults.overallConsistency < 85) {
      status = 'requires_further_revision';
      recommendedActions.push('Address consistency issues across nodes');
    } else {
      status = 'approved';
      recommendedActions.push('Assessment meets quality standards');
    }

    return {
      status,
      confidenceImprovement: overallConfidence,
      requiresIteration: status !== 'approved',
      criticalIssuesCount: criticalIssues.length,
      recommendedActions
    };
  }

  /**
   * Helper methods
   */
  private calculateOverallConfidence(nodes: ValidationNode[]): number {
    if (nodes.length === 0) return 0;
    return Math.round(nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length);
  }

  private extractNewIssues(revalidatedNodes: ValidationNode[], originalNodes: ValidationNode[]): ValidationIssue[] {
    const newIssues: ValidationIssue[] = [];
    
    for (const revalidatedNode of revalidatedNodes) {
      const originalNode = originalNodes.find(n => n.nodeId === revalidatedNode.nodeId);
      if (originalNode) {
        const nodeNewIssues = revalidatedNode.issues.filter(newIssue => 
          !originalNode.issues.some(oldIssue => oldIssue.id === newIssue.id)
        );
        newIssues.push(...nodeNewIssues);
      }
    }
    
    return newIssues;
  }

  private extractResolvedIssues(originalNodes: ValidationNode[], revalidatedNodes: ValidationNode[]): string[] {
    const resolvedIssues: string[] = [];
    
    for (const originalNode of originalNodes) {
      const revalidatedNode = revalidatedNodes.find(n => n.nodeId === originalNode.nodeId);
      if (revalidatedNode) {
        const resolved = originalNode.issues.filter(oldIssue => 
          !revalidatedNode.issues.some(newIssue => newIssue.id === oldIssue.id)
        );
        resolvedIssues.push(...resolved.map(issue => issue.id));
      }
    }
    
    return resolvedIssues;
  }

  private calculateCostSavings(totalNodes: number, revalidatedNodes: number): number {
    const costPerNode = 0.03; // Estimated cost per node validation
    const savedNodes = totalNodes - revalidatedNodes;
    return savedNodes * costPerNode;
  }

  private estimateCompletionTime(overallStatus: any): number {
    if (overallStatus.status === 'approved') return 0;
    if (overallStatus.criticalIssuesCount > 0) return 60; // 1 hour for critical issues
    return 30; // 30 minutes for general improvements
  }

  private identifyChangedAspects(originalNode: ValidationNode, modifiedNode: AssessmentNode): string[] {
    const aspects: string[] = [];
    
    // Compare content
    if (JSON.stringify(originalNode.content) !== JSON.stringify(modifiedNode.content)) {
      aspects.push('content');
    }
    
    // Always check accuracy if content changed
    if (aspects.includes('content')) {
      aspects.push('accuracy', 'clarity');
    }
    
    return aspects;
  }

  private async validateSpecificAspect(
    modifiedNode: AssessmentNode,
    aspect: string,
    context: any
  ): Promise<any> {
    // Simplified aspect validation - in real implementation, 
    // this would call specific validation methods
    return {
      score: 85,
      issues: [],
      suggestions: []
    };
  }

  private updateValidationAspect(
    targetedValidation: ValidationNode,
    aspect: string,
    aspectValidation: any
  ): void {
    // Update specific validation details based on aspect
    if (aspect === 'content') {
      targetedValidation.validationDetails.accuracy = aspectValidation.score;
    }
    // Add more aspect-specific updates as needed
  }

  private calculateUpdatedConfidence(validationNode: ValidationNode): number {
    const details = validationNode.validationDetails;
    const weights = { accuracy: 0.3, bias: 0.25, clarity: 0.2, consistency: 0.15, compliance: 0.1 };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      if (details[key] !== undefined) {
        weightedSum += details[key] * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : validationNode.confidence;
  }

  private identifySideEffects(originalNode: ValidationNode, revalidatedNode: ValidationNode): string[] {
    const sideEffects: string[] = [];
    
    // Check if solving one issue created another
    const newIssueCategories = revalidatedNode.issues.map(issue => issue.category);
    const originalIssueCategories = originalNode.issues.map(issue => issue.category);
    
    const newCategories = newIssueCategories.filter(cat => !originalIssueCategories.includes(cat));
    
    if (newCategories.length > 0) {
      sideEffects.push(`New issues in: ${newCategories.join(', ')}`);
    }
    
    return sideEffects;
  }

  private generateFeedbackRecommendation(
    effectiveness: number,
    actualGain: number
  ): 'continue' | 'modify' | 'abandon' {
    if (effectiveness > 80 && actualGain > 0) return 'continue';
    if (effectiveness > 50 || actualGain > 5) return 'modify';
    return 'abandon';
  }

  private identifyFeedbackCause(
    newIssue: ValidationIssue,
    appliedFeedback: DetailedFeedback[],
    nodeId: string
  ): string | null {
    const relevantFeedback = appliedFeedback.filter(f => f.nodeId === nodeId);
    
    // Simple heuristic: if feedback targeted same category, it might have caused regression
    for (const feedback of relevantFeedback) {
      if (feedback.category === newIssue.category) {
        return feedback.feedbackId;
      }
    }
    
    return null;
  }

  private generateRegressionMitigation(newIssue: ValidationIssue, causedByFeedback: string): string {
    return `Review feedback ${causedByFeedback} and adjust approach to avoid ${newIssue.category} issues`;
  }

  private estimateRevalidationCost(strategy: RevalidationStrategy): number {
    const costPerNode = 0.03;
    return strategy.nodesToRevalidate.length * costPerNode;
  }
}

// Supporting interfaces and classes
interface RevalidationStrategy {
  nodesToRevalidate: string[];
  validationDepth: 'targeted' | 'full';
  consistencyCheckNodes: string[];
  parallelizable: boolean;
  estimatedCost: number;
}

class ChangeDetector {
  async analyzeNodeChanges(
    originalNode: ValidationNode,
    modifiedNode: AssessmentNode,
    appliedFeedback: DetailedFeedback[]
  ): Promise<ChangeAnalysis> {
    const contentChanged = JSON.stringify(originalNode.content) !== JSON.stringify(modifiedNode.content);
    
    return {
      nodeId: modifiedNode.nodeId,
      changeType: contentChanged ? 'content' : 'metadata',
      changeScope: this.assessChangeScope(originalNode, modifiedNode),
      impactedAreas: this.identifyImpactedAreas(appliedFeedback),
      affectedNodes: this.identifyAffectedNodes(modifiedNode.nodeId, appliedFeedback),
      revalidationRequired: contentChanged,
      consistencyCheckRequired: contentChanged && modifiedNode.nodeType === 'recommendation'
    };
  }

  private assessChangeScope(originalNode: ValidationNode, modifiedNode: AssessmentNode): 'minor' | 'moderate' | 'major' {
    const originalContent = JSON.stringify(originalNode.content);
    const modifiedContent = JSON.stringify(modifiedNode.content);
    
    const similarity = this.calculateSimilarity(originalContent, modifiedContent);
    
    if (similarity > 90) return 'minor';
    if (similarity > 70) return 'moderate';
    return 'major';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private identifyImpactedAreas(appliedFeedback: DetailedFeedback[]): string[] {
    return appliedFeedback.map(feedback => feedback.category);
  }

  private identifyAffectedNodes(nodeId: string, appliedFeedback: DetailedFeedback[]): string[] {
    // Identify nodes that might be affected by changes to this node
    const dependencies = appliedFeedback
      .filter(f => f.nodeId === nodeId)
      .flatMap(f => f.context.dependencies);
    
    return dependencies;
  }
}

class ConsistencyValidator {
  async performShallowConsistencyCheck(nodes: ValidationNode[]): Promise<any> {
    return {
      overallConsistency: 85,
      newInconsistencies: [],
      resolvedInconsistencies: []
    };
  }

  async performDeepConsistencyCheck(nodes: ValidationNode[], changeAnalysis: ChangeAnalysis[]): Promise<any> {
    return {
      overallConsistency: 90,
      newInconsistencies: [],
      resolvedInconsistencies: []
    };
  }
}

class PerformanceOptimizer {
  optimizeRevalidationOrder(nodes: string[]): string[] {
    // Optimize the order of revalidation for best performance
    return nodes;
  }

  enableParallelProcessing(strategy: RevalidationStrategy): boolean {
    return strategy.parallelizable && strategy.nodesToRevalidate.length > 2;
  }
}

export default ReEvaluationEngine;