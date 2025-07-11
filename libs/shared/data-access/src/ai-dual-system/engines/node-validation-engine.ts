/**
 * Node-Level Validation Engine
 * Breaks down reports into discrete validatable nodes with independent scoring
 * 
 * Key Features:
 * - Discrete node identification and extraction
 * - Independent validation of each node
 * - Specific issue tracking and feedback
 * - Confidence trend analysis
 * - Performance optimization for large assessments
 */

import { ValidationNode, ValidationIssue, ValidationSuggestion, AssessmentNode } from '../services/b1-validator-service';

export interface NodeExtractionResult {
  nodes: AssessmentNode[];
  nodeMap: Map<string, NodeMetadata>;
  extractionMetrics: {
    totalNodes: number;
    nodeTypes: Record<string, number>;
    extractionTime: number;
    complexityScore: number;
  };
}

export interface NodeMetadata {
  nodeId: string;
  nodeType: string;
  parentContext: string;
  dependencies: string[];
  importance: number; // 1-10 scale
  validationComplexity: number; // 1-10 scale
  dataSource: string;
  lastModified: string;
}

export interface NodeValidationMetrics {
  nodeId: string;
  validationHistory: ValidationSnapshot[];
  confidenceTrend: number[]; // Confidence scores over time
  issuePattern: string[]; // Recurring issue categories
  improvementVelocity: number; // Rate of confidence improvement
  stabilityScore: number; // How stable confidence is over iterations
}

export interface ValidationSnapshot {
  timestamp: string;
  confidence: number;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  validationVersion: string;
  processingTime: number;
}

export interface NodeClassification {
  nodeId: string;
  primaryType: 'scoring' | 'insight' | 'recommendation' | 'context' | 'summary';
  subType: string;
  dataElements: string[];
  validationRequirements: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class NodeValidationEngine {
  private nodeClassifiers: Map<string, NodeClassifier> = new Map();
  private validationMetrics: Map<string, NodeValidationMetrics> = new Map();
  private nodeExtractors: Map<string, NodeExtractor> = new Map();

  constructor() {
    this.initializeNodeClassifiers();
    this.initializeNodeExtractors();
  }

  /**
   * Extract discrete nodes from assessment output
   */
  async extractAssessmentNodes(
    assessmentOutput: any,
    assessmentType: 'individual' | 'executive' | 'organizational'
  ): Promise<NodeExtractionResult> {
    const startTime = Date.now();
    const extractor = this.nodeExtractors.get(assessmentType) || this.nodeExtractors.get('default');
    
    if (!extractor) {
      throw new Error(`No node extractor found for assessment type: ${assessmentType}`);
    }

    const nodes: AssessmentNode[] = [];
    const nodeMap: Map<string, NodeMetadata> = new Map();
    const nodeTypes: Record<string, number> = {};

    // Extract scoring nodes
    const scoringNodes = await extractor.extractScoringNodes(assessmentOutput);
    nodes.push(...scoringNodes);
    this.updateNodeCounts(scoringNodes, nodeTypes);

    // Extract insight nodes
    const insightNodes = await extractor.extractInsightNodes(assessmentOutput);
    nodes.push(...insightNodes);
    this.updateNodeCounts(insightNodes, nodeTypes);

    // Extract recommendation nodes
    const recommendationNodes = await extractor.extractRecommendationNodes(assessmentOutput);
    nodes.push(...recommendationNodes);
    this.updateNodeCounts(recommendationNodes, nodeTypes);

    // Extract summary nodes
    const summaryNodes = await extractor.extractSummaryNodes(assessmentOutput);
    nodes.push(...summaryNodes);
    this.updateNodeCounts(summaryNodes, nodeTypes);

    // Extract context nodes
    const contextNodes = await extractor.extractContextNodes(assessmentOutput);
    nodes.push(...contextNodes);
    this.updateNodeCounts(contextNodes, nodeTypes);

    // Generate metadata for each node
    for (const node of nodes) {
      const metadata = this.generateNodeMetadata(node, assessmentOutput);
      nodeMap.set(node.nodeId, metadata);
    }

    const extractionTime = Date.now() - startTime;
    
    return {
      nodes,
      nodeMap,
      extractionMetrics: {
        totalNodes: nodes.length,
        nodeTypes,
        extractionTime,
        complexityScore: this.calculateComplexityScore(nodes)
      }
    };
  }

  /**
   * Classify nodes for targeted validation
   */
  classifyNodes(nodes: AssessmentNode[]): NodeClassification[] {
    return nodes.map(node => {
      const classifier = this.nodeClassifiers.get(node.nodeType) || this.nodeClassifiers.get('default');
      return classifier.classify(node);
    });
  }

  /**
   * Track validation metrics for trend analysis
   */
  updateValidationMetrics(
    nodeId: string,
    validationResult: ValidationNode,
    processingTime: number
  ): void {
    const metrics = this.validationMetrics.get(nodeId) || {
      nodeId,
      validationHistory: [],
      confidenceTrend: [],
      issuePattern: [],
      improvementVelocity: 0,
      stabilityScore: 0
    };

    // Add validation snapshot
    const snapshot: ValidationSnapshot = {
      timestamp: new Date().toISOString(),
      confidence: validationResult.confidence,
      issues: validationResult.issues,
      suggestions: validationResult.suggestions,
      validationVersion: validationResult.metadata.model,
      processingTime
    };

    metrics.validationHistory.push(snapshot);
    metrics.confidenceTrend.push(validationResult.confidence);
    
    // Update issue patterns
    const issueCategories = validationResult.issues.map(issue => issue.category);
    metrics.issuePattern.push(...issueCategories);

    // Calculate improvement velocity
    metrics.improvementVelocity = this.calculateImprovementVelocity(metrics.confidenceTrend);
    
    // Calculate stability score
    metrics.stabilityScore = this.calculateStabilityScore(metrics.confidenceTrend);

    this.validationMetrics.set(nodeId, metrics);
  }

  /**
   * Identify nodes that need re-validation
   */
  identifyRevalidationCandidates(
    nodes: ValidationNode[],
    confidenceThreshold: number,
    includeUnstable: boolean = true
  ): string[] {
    const candidates: string[] = [];

    for (const node of nodes) {
      // Always include nodes below confidence threshold
      if (node.confidence < confidenceThreshold) {
        candidates.push(node.nodeId);
        continue;
      }

      // Include unstable nodes if requested
      if (includeUnstable) {
        const metrics = this.validationMetrics.get(node.nodeId);
        if (metrics && metrics.stabilityScore < 0.7) {
          candidates.push(node.nodeId);
        }
      }
    }

    return candidates;
  }

  /**
   * Get performance insights for optimization
   */
  getValidationInsights(nodeId: string): ValidationInsights | null {
    const metrics = this.validationMetrics.get(nodeId);
    if (!metrics) return null;

    return {
      nodeId,
      averageConfidence: this.calculateAverage(metrics.confidenceTrend),
      confidenceStability: metrics.stabilityScore,
      improvementRate: metrics.improvementVelocity,
      commonIssues: this.identifyCommonIssues(metrics.issuePattern),
      validationEfficiency: this.calculateValidationEfficiency(metrics),
      recommendations: this.generateOptimizationRecommendations(metrics)
    };
  }

  /**
   * Private helper methods
   */
  private updateNodeCounts(nodes: AssessmentNode[], nodeTypes: Record<string, number>): void {
    nodes.forEach(node => {
      nodeTypes[node.nodeType] = (nodeTypes[node.nodeType] || 0) + 1;
    });
  }

  private generateNodeMetadata(node: AssessmentNode, assessmentOutput: any): NodeMetadata {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      parentContext: this.identifyParentContext(node, assessmentOutput),
      dependencies: this.identifyDependencies(node, assessmentOutput),
      importance: this.calculateImportance(node),
      validationComplexity: this.calculateValidationComplexity(node),
      dataSource: this.identifyDataSource(node, assessmentOutput),
      lastModified: new Date().toISOString()
    };
  }

  private calculateComplexityScore(nodes: AssessmentNode[]): number {
    const totalComplexity = nodes.reduce((sum, node) => {
      return sum + this.calculateValidationComplexity(node);
    }, 0);
    return Math.round(totalComplexity / nodes.length);
  }

  private calculateValidationComplexity(node: AssessmentNode): number {
    // Base complexity on node type and content size
    const typeComplexity = {
      'scoring': 8,
      'insight': 6,
      'recommendation': 7,
      'summary': 5,
      'context': 4
    };

    const contentSize = JSON.stringify(node.content).length;
    const sizeComplexity = Math.min(10, Math.ceil(contentSize / 500)); // 1-10 scale

    return Math.round((typeComplexity[node.nodeType] || 5) * 0.7 + sizeComplexity * 0.3);
  }

  private calculateImportance(node: AssessmentNode): number {
    // Importance based on node type and critical nature
    const typeImportance = {
      'scoring': 10,
      'insight': 8,
      'recommendation': 9,
      'summary': 7,
      'context': 5
    };

    return typeImportance[node.nodeType] || 5;
  }

  private identifyParentContext(node: AssessmentNode, assessmentOutput: any): string {
    // Identify which section/context this node belongs to
    const nodeId = node.nodeId;
    
    if (nodeId.includes('ocean_')) return 'personality_assessment';
    if (nodeId.includes('pillar_')) return 'performance_pillars';
    if (nodeId.includes('executive_')) return 'leadership_evaluation';
    if (nodeId.includes('summary')) return 'executive_summary';
    if (nodeId.includes('recommendation')) return 'development_plan';
    
    return 'general_assessment';
  }

  private identifyDependencies(node: AssessmentNode, assessmentOutput: any): string[] {
    const dependencies: string[] = [];
    
    // Recommendations depend on insights and scoring
    if (node.nodeType === 'recommendation') {
      dependencies.push('scoring_nodes', 'insight_nodes');
    }
    
    // Summary depends on all other nodes
    if (node.nodeType === 'summary') {
      dependencies.push('scoring_nodes', 'insight_nodes', 'recommendation_nodes');
    }
    
    // Insights depend on scoring
    if (node.nodeType === 'insight') {
      dependencies.push('scoring_nodes');
    }
    
    return dependencies;
  }

  private identifyDataSource(node: AssessmentNode, assessmentOutput: any): string {
    if (node.nodeType === 'scoring') return 'assessment_responses';
    if (node.nodeType === 'insight') return 'score_interpretation';
    if (node.nodeType === 'recommendation') return 'development_framework';
    if (node.nodeType === 'summary') return 'aggregated_results';
    return 'unknown';
  }

  private calculateImprovementVelocity(confidenceTrend: number[]): number {
    if (confidenceTrend.length < 2) return 0;
    
    const improvements = [];
    for (let i = 1; i < confidenceTrend.length; i++) {
      improvements.push(confidenceTrend[i] - confidenceTrend[i - 1]);
    }
    
    return this.calculateAverage(improvements);
  }

  private calculateStabilityScore(confidenceTrend: number[]): number {
    if (confidenceTrend.length < 2) return 1;
    
    const variance = this.calculateVariance(confidenceTrend);
    // Convert variance to stability score (0-1, higher is more stable)
    return Math.max(0, 1 - (variance / 100));
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = this.calculateAverage(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    return this.calculateAverage(squaredDiffs);
  }

  private identifyCommonIssues(issuePattern: string[]): string[] {
    const issueCount: Record<string, number> = {};
    
    issuePattern.forEach(issue => {
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    });
    
    return Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([issue]) => issue);
  }

  private calculateValidationEfficiency(metrics: NodeValidationMetrics): number {
    if (metrics.validationHistory.length === 0) return 0;
    
    const avgProcessingTime = this.calculateAverage(
      metrics.validationHistory.map(h => h.processingTime)
    );
    
    const avgConfidence = this.calculateAverage(metrics.confidenceTrend);
    
    // Efficiency = confidence / processing time ratio
    return avgProcessingTime > 0 ? Math.round(avgConfidence / avgProcessingTime * 1000) / 10 : 0;
  }

  private generateOptimizationRecommendations(metrics: NodeValidationMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.stabilityScore < 0.5) {
      recommendations.push('Consider more consistent validation criteria');
    }
    
    if (metrics.improvementVelocity < 0) {
      recommendations.push('Review validation prompts for effectiveness');
    }
    
    const commonIssues = this.identifyCommonIssues(metrics.issuePattern);
    if (commonIssues.length > 0) {
      recommendations.push(`Focus on recurring issues: ${commonIssues.join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Initialize node classifiers for different node types
   */
  private initializeNodeClassifiers(): void {
    this.nodeClassifiers.set('scoring', new ScoringNodeClassifier());
    this.nodeClassifiers.set('insight', new InsightNodeClassifier());
    this.nodeClassifiers.set('recommendation', new RecommendationNodeClassifier());
    this.nodeClassifiers.set('summary', new SummaryNodeClassifier());
    this.nodeClassifiers.set('context', new ContextNodeClassifier());
    this.nodeClassifiers.set('default', new DefaultNodeClassifier());
  }

  /**
   * Initialize node extractors for different assessment types
   */
  private initializeNodeExtractors(): void {
    this.nodeExtractors.set('individual', new IndividualAssessmentExtractor());
    this.nodeExtractors.set('executive', new ExecutiveAssessmentExtractor());
    this.nodeExtractors.set('organizational', new OrganizationalAssessmentExtractor());
    this.nodeExtractors.set('default', new DefaultAssessmentExtractor());
  }
}

// Supporting interfaces
export interface ValidationInsights {
  nodeId: string;
  averageConfidence: number;
  confidenceStability: number;
  improvementRate: number;
  commonIssues: string[];
  validationEfficiency: number;
  recommendations: string[];
}

// Abstract base classes for extensibility
abstract class NodeClassifier {
  abstract classify(node: AssessmentNode): NodeClassification;
}

abstract class NodeExtractor {
  abstract extractScoringNodes(assessmentOutput: any): Promise<AssessmentNode[]>;
  abstract extractInsightNodes(assessmentOutput: any): Promise<AssessmentNode[]>;
  abstract extractRecommendationNodes(assessmentOutput: any): Promise<AssessmentNode[]>;
  abstract extractSummaryNodes(assessmentOutput: any): Promise<AssessmentNode[]>;
  abstract extractContextNodes(assessmentOutput: any): Promise<AssessmentNode[]>;
}

// Concrete implementations
class ScoringNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: 'scoring',
      subType: this.identifyScoreType(node),
      dataElements: this.extractDataElements(node),
      validationRequirements: [
        'statistical_validity',
        'percentile_accuracy',
        'score_consistency',
        'bias_detection'
      ],
      criticalityLevel: 'critical'
    };
  }

  private identifyScoreType(node: AssessmentNode): string {
    const nodeId = node.nodeId;
    if (nodeId.includes('ocean_')) return 'personality_trait';
    if (nodeId.includes('pillar_')) return 'performance_pillar';
    if (nodeId.includes('domain_')) return 'competency_domain';
    return 'general_score';
  }

  private extractDataElements(node: AssessmentNode): string[] {
    const elements: string[] = [];
    if (node.content.score) elements.push('raw_score');
    if (node.content.percentile) elements.push('percentile');
    if (node.content.interpretation) elements.push('interpretation');
    return elements;
  }
}

class InsightNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: 'insight',
      subType: this.identifyInsightType(node),
      dataElements: ['behavioral_patterns', 'strengths', 'areas_for_growth'],
      validationRequirements: [
        'evidence_based',
        'bias_free',
        'actionable_insights',
        'professional_tone'
      ],
      criticalityLevel: 'high'
    };
  }

  private identifyInsightType(node: AssessmentNode): string {
    const content = JSON.stringify(node.content).toLowerCase();
    if (content.includes('strength')) return 'strength_insight';
    if (content.includes('challenge') || content.includes('development')) return 'development_insight';
    if (content.includes('behavior')) return 'behavioral_insight';
    return 'general_insight';
  }
}

class RecommendationNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: 'recommendation',
      subType: 'development_action',
      dataElements: ['action_items', 'timeframe', 'resources', 'success_metrics'],
      validationRequirements: [
        'specificity',
        'measurability',
        'achievability',
        'relevance',
        'time_bound'
      ],
      criticalityLevel: 'high'
    };
  }
}

class SummaryNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: 'summary',
      subType: 'executive_summary',
      dataElements: ['key_findings', 'overall_profile', 'priority_areas'],
      validationRequirements: [
        'comprehensiveness',
        'accuracy',
        'clarity',
        'appropriate_length'
      ],
      criticalityLevel: 'medium'
    };
  }
}

class ContextNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: 'context',
      subType: 'environmental_context',
      dataElements: ['industry_context', 'role_context', 'cultural_context'],
      validationRequirements: [
        'relevance',
        'cultural_sensitivity',
        'industry_accuracy'
      ],
      criticalityLevel: 'medium'
    };
  }
}

class DefaultNodeClassifier extends NodeClassifier {
  classify(node: AssessmentNode): NodeClassification {
    return {
      nodeId: node.nodeId,
      primaryType: node.nodeType,
      subType: 'unknown',
      dataElements: ['content'],
      validationRequirements: ['basic_quality'],
      criticalityLevel: 'low'
    };
  }
}

// Default extractor implementations
class DefaultAssessmentExtractor extends NodeExtractor {
  async extractScoringNodes(assessmentOutput: any): Promise<AssessmentNode[]> {
    const nodes: AssessmentNode[] = [];
    
    // Extract OCEAN scores
    if (assessmentOutput.scores?.ocean?.raw) {
      Object.entries(assessmentOutput.scores.ocean.raw).forEach(([trait, score]) => {
        nodes.push({
          nodeId: `ocean_${trait}`,
          nodeType: 'scoring',
          content: {
            trait,
            score,
            percentile: assessmentOutput.scores.ocean.percentile?.[trait],
            interpretation: assessmentOutput.scores.ocean.interpretation?.[trait]
          }
        });
      });
    }
    
    // Extract pillar scores
    if (assessmentOutput.scores?.pillars) {
      Object.entries(assessmentOutput.scores.pillars).forEach(([pillar, score]) => {
        nodes.push({
          nodeId: `pillar_${pillar}`,
          nodeType: 'scoring',
          content: { pillar, score }
        });
      });
    }
    
    return nodes;
  }

  async extractInsightNodes(assessmentOutput: any): Promise<AssessmentNode[]> {
    const nodes: AssessmentNode[] = [];
    
    if (assessmentOutput.insights) {
      assessmentOutput.insights.forEach((insight: string, index: number) => {
        nodes.push({
          nodeId: `insight_${index}`,
          nodeType: 'insight',
          content: { text: insight, type: 'behavioral_insight' }
        });
      });
    }
    
    return nodes;
  }

  async extractRecommendationNodes(assessmentOutput: any): Promise<AssessmentNode[]> {
    const nodes: AssessmentNode[] = [];
    
    if (assessmentOutput.recommendations) {
      assessmentOutput.recommendations.forEach((recommendation: string, index: number) => {
        nodes.push({
          nodeId: `recommendation_${index}`,
          nodeType: 'recommendation',
          content: { text: recommendation, priority: 'medium' }
        });
      });
    }
    
    return nodes;
  }

  async extractSummaryNodes(assessmentOutput: any): Promise<AssessmentNode[]> {
    const nodes: AssessmentNode[] = [];
    
    if (assessmentOutput.executiveSummary) {
      nodes.push({
        nodeId: 'executive_summary',
        nodeType: 'summary',
        content: { text: assessmentOutput.executiveSummary, type: 'executive' }
      });
    }
    
    return nodes;
  }

  async extractContextNodes(assessmentOutput: any): Promise<AssessmentNode[]> {
    const nodes: AssessmentNode[] = [];
    
    if (assessmentOutput.contextualFactors) {
      nodes.push({
        nodeId: 'context_factors',
        nodeType: 'context',
        content: assessmentOutput.contextualFactors
      });
    }
    
    return nodes;
  }
}

// Specialized extractors would extend the default extractor
class IndividualAssessmentExtractor extends DefaultAssessmentExtractor {
  // Override methods for individual-specific extraction
}

class ExecutiveAssessmentExtractor extends DefaultAssessmentExtractor {
  // Override methods for executive-specific extraction
}

class OrganizationalAssessmentExtractor extends DefaultAssessmentExtractor {
  // Override methods for organizational-specific extraction
}

export default NodeValidationEngine;