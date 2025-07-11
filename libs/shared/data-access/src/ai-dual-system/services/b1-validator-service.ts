/**
 * B1 Validator Service
 * Focused validation system for IOC's practical dual-AI approach
 * 
 * Core Responsibilities:
 * - Node-level validation of A1 outputs with 85% confidence threshold
 * - Confidence scoring for each assessment component
 * - Specific feedback generation when confidence < 85%
 * - Re-evaluation after A1 adjustments until all nodes > 85%
 */

import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Core interfaces for B1 validation
export interface ValidationNode {
  nodeId: string;
  nodeType: 'scoring' | 'insight' | 'recommendation' | 'context' | 'summary';
  content: any;
  confidence: number; // 0-100%
  validationDetails: {
    accuracy: number;
    bias: number;
    clarity: number;
    consistency: number;
    compliance: number;
  };
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  metadata: {
    validationTimestamp: string;
    model: string;
    processingTime: number;
  };
}

export interface ValidationIssue {
  id: string;
  category: 'accuracy' | 'clarity' | 'bias' | 'consistency' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  impact: string;
  priority: number; // 1-10, 10 being highest
}

export interface ValidationSuggestion {
  id: string;
  issueId: string;
  type: 'content_improvement' | 'bias_mitigation' | 'clarity_enhancement' | 'accuracy_fix';
  description: string;
  specificAction: string;
  exampleFix: string;
  expectedImpact: string;
  estimatedConfidenceGain: number;
}

export interface B1ValidationRequest {
  workflowId: string;
  assessmentNodes: AssessmentNode[];
  validationContext: {
    assessmentType: 'individual' | 'executive' | 'organizational';
    industry?: string;
    culturalContext?: string;
    targetAudience: string;
    qualityStandards: string[];
  };
  validationConfig: {
    confidenceThreshold: number;
    strictMode: boolean;
    focusAreas: string[];
    customCriteria?: string[];
  };
}

export interface B1ValidationResult {
  workflowId: string;
  overallConfidence: number;
  validationStatus: 'approved' | 'requires_revision' | 'rejected';
  validatedNodes: ValidationNode[];
  qualityMetrics: {
    accuracyScore: number;
    biasScore: number;
    clarityScore: number;
    consistencyScore: number;
    complianceScore: number;
  };
  criticalIssues: ValidationIssue[];
  prioritizedFeedback: ValidationFeedback[];
  processingMetrics: {
    totalProcessingTime: number;
    nodesValidated: number;
    apiCallsUsed: number;
    costEstimate: number;
  };
}

export interface ValidationFeedback {
  nodeId: string;
  currentConfidence: number;
  requiredConfidence: number;
  gapAnalysis: string;
  prioritizedIssues: ValidationIssue[];
  actionableSuggestions: ValidationSuggestion[];
  specificGuidance: string;
  revalidationRequired: boolean;
}

export interface AssessmentNode {
  nodeId: string;
  nodeType: 'scoring' | 'insight' | 'recommendation' | 'context' | 'summary';
  content: any;
  confidence?: number;
  issues?: string[];
  suggestions?: string[];
}

export class B1ValidatorService {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private confidenceThreshold: number = 85;
  private validationPrompts: Map<string, string> = new Map();

  constructor(
    openaiApiKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeValidationPrompts();
  }

  /**
   * Main validation entry point
   */
  async validateAssessment(request: B1ValidationRequest): Promise<B1ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate each node independently
      const validatedNodes = await this.validateNodesParallel(request);
      
      // Step 2: Calculate overall confidence and quality metrics
      const qualityMetrics = this.calculateQualityMetrics(validatedNodes);
      const overallConfidence = this.calculateOverallConfidence(validatedNodes);
      
      // Step 3: Identify critical issues and generate feedback
      const criticalIssues = this.identifyCriticalIssues(validatedNodes);
      const prioritizedFeedback = this.generatePrioritizedFeedback(
        validatedNodes,
        request.validationConfig.confidenceThreshold
      );
      
      // Step 4: Determine validation status
      const validationStatus = this.determineValidationStatus(
        overallConfidence,
        criticalIssues,
        request.validationConfig.confidenceThreshold
      );
      
      // Step 5: Record validation results
      await this.recordValidationResults(request.workflowId, validatedNodes, qualityMetrics);
      
      const processingTime = Date.now() - startTime;
      
      return {
        workflowId: request.workflowId,
        overallConfidence,
        validationStatus,
        validatedNodes,
        qualityMetrics,
        criticalIssues,
        prioritizedFeedback,
        processingMetrics: {
          totalProcessingTime: processingTime,
          nodesValidated: validatedNodes.length,
          apiCallsUsed: validatedNodes.length,
          costEstimate: this.estimateValidationCost(validatedNodes.length)
        }
      };
    } catch (error) {
      console.error('B1 Validation failed:', error);
      throw new Error(`B1 Validation failed: ${error.message}`);
    }
  }

  /**
   * Validate nodes in parallel for performance
   */
  private async validateNodesParallel(request: B1ValidationRequest): Promise<ValidationNode[]> {
    const validationPromises = request.assessmentNodes.map(node => 
      this.validateIndividualNode(node, request.validationContext)
    );
    
    const results = await Promise.allSettled(validationPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Node validation failed for ${request.assessmentNodes[index].nodeId}:`, result.reason);
        return this.createFailsafeValidationNode(request.assessmentNodes[index]);
      }
    });
  }

  /**
   * Core node validation logic
   */
  private async validateIndividualNode(
    node: AssessmentNode, 
    context: B1ValidationRequest['validationContext']
  ): Promise<ValidationNode> {
    const startTime = Date.now();
    
    try {
      // Build validation prompt based on node type
      const prompt = this.buildNodeValidationPrompt(node, context);
      
      // Call OpenAI for validation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert assessment validator with expertise in psychometric assessment, bias detection, and professional report quality. Your role is to provide precise, actionable feedback with confidence scores.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent validation
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      const validationResult = this.parseValidationResponse(response.choices[0].message.content);
      
      return {
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        content: node.content,
        confidence: validationResult.confidence,
        validationDetails: validationResult.details,
        issues: validationResult.issues,
        suggestions: validationResult.suggestions,
        metadata: {
          validationTimestamp: new Date().toISOString(),
          model: 'gpt-4',
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      console.error(`Failed to validate node ${node.nodeId}:`, error);
      return this.createFailsafeValidationNode(node);
    }
  }

  /**
   * Build specialized validation prompts for different node types
   */
  private buildNodeValidationPrompt(
    node: AssessmentNode,
    context: B1ValidationRequest['validationContext']
  ): string {
    const basePrompt = this.validationPrompts.get(node.nodeType) || this.validationPrompts.get('default');
    
    return `
${basePrompt}

ASSESSMENT CONTEXT:
- Assessment Type: ${context.assessmentType}
- Industry: ${context.industry || 'General'}
- Cultural Context: ${context.culturalContext || 'Global'}
- Target Audience: ${context.targetAudience}
- Quality Standards: ${context.qualityStandards.join(', ')}

NODE TO VALIDATE:
- Node ID: ${node.nodeId}
- Node Type: ${node.nodeType}
- Content: ${JSON.stringify(node.content, null, 2)}

VALIDATION REQUIREMENTS:
1. Accuracy Assessment (0-100): Evaluate factual correctness, statistical validity, and logical consistency
2. Bias Detection (0-100): Check for gender, cultural, age, role, and other biases (higher score = less bias)
3. Clarity Assessment (0-100): Rate readability, professional tone, and comprehensibility
4. Consistency Check (0-100): Verify internal consistency and alignment with assessment standards
5. Compliance Review (0-100): Ensure adherence to ethical guidelines and professional standards

CRITICAL VALIDATION CRITERIA:
- Any bias indicators must be flagged as critical issues
- Inaccurate or unsupported claims must be identified
- Unclear or unprofessional language must be noted
- Inconsistencies with assessment data must be highlighted
- Compliance violations must be marked as critical

RESPONSE FORMAT (JSON):
{
  "confidence": <overall_confidence_0_to_100>,
  "details": {
    "accuracy": <accuracy_score_0_to_100>,
    "bias": <bias_score_0_to_100>,
    "clarity": <clarity_score_0_to_100>,
    "consistency": <consistency_score_0_to_100>,
    "compliance": <compliance_score_0_to_100>
  },
  "issues": [
    {
      "id": "<unique_issue_id>",
      "category": "<accuracy|clarity|bias|consistency|compliance>",
      "severity": "<low|medium|high|critical>",
      "description": "<detailed_issue_description>",
      "evidence": ["<evidence_item_1>", "<evidence_item_2>"],
      "impact": "<impact_on_assessment_quality>",
      "priority": <1_to_10_priority_score>
    }
  ],
  "suggestions": [
    {
      "id": "<unique_suggestion_id>",
      "issueId": "<related_issue_id>",
      "type": "<content_improvement|bias_mitigation|clarity_enhancement|accuracy_fix>",
      "description": "<what_needs_to_be_improved>",
      "specificAction": "<specific_action_to_take>",
      "exampleFix": "<example_of_improved_content>",
      "expectedImpact": "<expected_improvement_description>",
      "estimatedConfidenceGain": <estimated_confidence_increase>
    }
  ]
}

Provide specific, actionable feedback that directly addresses quality issues. Be precise and professional in your assessment.
    `.trim();
  }

  /**
   * Parse and validate the OpenAI response
   */
  private parseValidationResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      
      // Validate response structure
      if (!parsed.confidence || !parsed.details) {
        throw new Error('Invalid validation response structure');
      }
      
      // Ensure confidence is within valid range
      parsed.confidence = Math.max(0, Math.min(100, parsed.confidence));
      
      // Validate details scores
      Object.keys(parsed.details).forEach(key => {
        parsed.details[key] = Math.max(0, Math.min(100, parsed.details[key]));
      });
      
      // Ensure arrays exist
      parsed.issues = parsed.issues || [];
      parsed.suggestions = parsed.suggestions || [];
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse validation response:', error);
      return {
        confidence: 70,
        details: {
          accuracy: 70,
          bias: 70,
          clarity: 70,
          consistency: 70,
          compliance: 70
        },
        issues: [{
          id: 'parse_error',
          category: 'accuracy',
          severity: 'medium',
          description: 'Failed to parse validation response',
          evidence: ['Response parsing error'],
          impact: 'Unable to provide detailed validation',
          priority: 5
        }],
        suggestions: [{
          id: 'manual_review',
          issueId: 'parse_error',
          type: 'content_improvement',
          description: 'Manual review required',
          specificAction: 'Review node content manually',
          exampleFix: 'N/A',
          expectedImpact: 'Ensure quality through manual validation',
          estimatedConfidenceGain: 10
        }]
      };
    }
  }

  /**
   * Calculate overall confidence weighted by node importance
   */
  private calculateOverallConfidence(nodes: ValidationNode[]): number {
    if (nodes.length === 0) return 0;
    
    const weights = {
      'scoring': 0.3,
      'insight': 0.25,
      'recommendation': 0.25,
      'summary': 0.15,
      'context': 0.05
    };
    
    let totalWeightedConfidence = 0;
    let totalWeight = 0;
    
    nodes.forEach(node => {
      const weight = weights[node.nodeType] || 0.1;
      totalWeightedConfidence += node.confidence * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(totalWeightedConfidence / totalWeight) : 0;
  }

  /**
   * Calculate quality metrics across all nodes
   */
  private calculateQualityMetrics(nodes: ValidationNode[]): B1ValidationResult['qualityMetrics'] {
    if (nodes.length === 0) {
      return {
        accuracyScore: 0,
        biasScore: 0,
        clarityScore: 0,
        consistencyScore: 0,
        complianceScore: 0
      };
    }
    
    const metrics = {
      accuracyScore: 0,
      biasScore: 0,
      clarityScore: 0,
      consistencyScore: 0,
      complianceScore: 0
    };
    
    nodes.forEach(node => {
      metrics.accuracyScore += node.validationDetails.accuracy;
      metrics.biasScore += node.validationDetails.bias;
      metrics.clarityScore += node.validationDetails.clarity;
      metrics.consistencyScore += node.validationDetails.consistency;
      metrics.complianceScore += node.validationDetails.compliance;
    });
    
    const nodeCount = nodes.length;
    return {
      accuracyScore: Math.round(metrics.accuracyScore / nodeCount),
      biasScore: Math.round(metrics.biasScore / nodeCount),
      clarityScore: Math.round(metrics.clarityScore / nodeCount),
      consistencyScore: Math.round(metrics.consistencyScore / nodeCount),
      complianceScore: Math.round(metrics.complianceScore / nodeCount)
    };
  }

  /**
   * Identify critical issues that must be addressed
   */
  private identifyCriticalIssues(nodes: ValidationNode[]): ValidationIssue[] {
    const criticalIssues: ValidationIssue[] = [];
    
    nodes.forEach(node => {
      const critical = node.issues.filter(issue => issue.severity === 'critical');
      criticalIssues.push(...critical);
    });
    
    // Sort by priority (highest first)
    return criticalIssues.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate prioritized feedback for nodes below threshold
   */
  private generatePrioritizedFeedback(
    nodes: ValidationNode[],
    threshold: number
  ): ValidationFeedback[] {
    const feedback: ValidationFeedback[] = [];
    
    nodes.forEach(node => {
      if (node.confidence < threshold) {
        const gapAnalysis = this.analyzeConfidenceGap(node, threshold);
        const prioritizedIssues = this.prioritizeIssues(node.issues);
        const actionableSuggestions = this.prioritizeSuggestions(node.suggestions);
        
        feedback.push({
          nodeId: node.nodeId,
          currentConfidence: node.confidence,
          requiredConfidence: threshold,
          gapAnalysis,
          prioritizedIssues,
          actionableSuggestions,
          specificGuidance: this.generateSpecificGuidance(node, threshold),
          revalidationRequired: true
        });
      }
    });
    
    return feedback.sort((a, b) => (a.requiredConfidence - a.currentConfidence) - (b.requiredConfidence - b.currentConfidence));
  }

  /**
   * Analyze confidence gap and provide specific guidance
   */
  private analyzeConfidenceGap(node: ValidationNode, threshold: number): string {
    const gap = threshold - node.confidence;
    const details = node.validationDetails;
    
    const lowScores = Object.entries(details)
      .filter(([_, score]) => score < threshold)
      .map(([category, score]) => `${category}: ${score}%`);
    
    if (lowScores.length === 0) {
      return `Node confidence is ${gap} points below threshold. Focus on overall quality improvement.`;
    }
    
    return `Node confidence is ${gap} points below threshold. Primary concerns: ${lowScores.join(', ')}. Address these specific areas to meet quality standards.`;
  }

  /**
   * Prioritize issues by severity and impact
   */
  private prioritizeIssues(issues: ValidationIssue[]): ValidationIssue[] {
    return issues.sort((a, b) => {
      // First by severity (critical > high > medium > low)
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      
      // Then by priority score
      return b.priority - a.priority;
    });
  }

  /**
   * Prioritize suggestions by expected impact
   */
  private prioritizeSuggestions(suggestions: ValidationSuggestion[]): ValidationSuggestion[] {
    return suggestions.sort((a, b) => b.estimatedConfidenceGain - a.estimatedConfidenceGain);
  }

  /**
   * Generate specific guidance for node improvement
   */
  private generateSpecificGuidance(node: ValidationNode, threshold: number): string {
    const criticalIssues = node.issues.filter(issue => issue.severity === 'critical');
    const highImpactSuggestions = node.suggestions.filter(suggestion => suggestion.estimatedConfidenceGain >= 10);
    
    let guidance = `To reach ${threshold}% confidence:\n`;
    
    if (criticalIssues.length > 0) {
      guidance += `\n1. CRITICAL ISSUES (must address):\n`;
      criticalIssues.forEach((issue, index) => {
        guidance += `   ${index + 1}. ${issue.description}\n`;
      });
    }
    
    if (highImpactSuggestions.length > 0) {
      guidance += `\n2. HIGH IMPACT IMPROVEMENTS:\n`;
      highImpactSuggestions.forEach((suggestion, index) => {
        guidance += `   ${index + 1}. ${suggestion.specificAction} (expected +${suggestion.estimatedConfidenceGain}%)\n`;
      });
    }
    
    return guidance;
  }

  /**
   * Determine overall validation status
   */
  private determineValidationStatus(
    overallConfidence: number,
    criticalIssues: ValidationIssue[],
    threshold: number
  ): 'approved' | 'requires_revision' | 'rejected' {
    if (criticalIssues.length > 0) {
      return 'rejected';
    }
    
    if (overallConfidence >= threshold) {
      return 'approved';
    }
    
    return 'requires_revision';
  }

  /**
   * Create failsafe validation node for error scenarios
   */
  private createFailsafeValidationNode(node: AssessmentNode): ValidationNode {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      content: node.content,
      confidence: 70, // Conservative failsafe confidence
      validationDetails: {
        accuracy: 70,
        bias: 70,
        clarity: 70,
        consistency: 70,
        compliance: 70
      },
      issues: [{
        id: 'validation_error',
        category: 'accuracy',
        severity: 'medium',
        description: 'Validation service error - manual review recommended',
        evidence: ['Validation service unavailable'],
        impact: 'Unable to provide automated validation',
        priority: 7
      }],
      suggestions: [{
        id: 'manual_validation',
        issueId: 'validation_error',
        type: 'content_improvement',
        description: 'Manual validation required',
        specificAction: 'Review node content manually for quality assurance',
        exampleFix: 'N/A',
        expectedImpact: 'Ensure quality through manual validation',
        estimatedConfidenceGain: 15
      }],
      metadata: {
        validationTimestamp: new Date().toISOString(),
        model: 'failsafe',
        processingTime: 0
      }
    };
  }

  /**
   * Record validation results in database
   */
  private async recordValidationResults(
    workflowId: string,
    nodes: ValidationNode[],
    qualityMetrics: B1ValidationResult['qualityMetrics']
  ): Promise<void> {
    try {
      // Record validation nodes
      const nodeRecords = nodes.map(node => ({
        workflow_id: workflowId,
        node_id: node.nodeId,
        node_type: node.nodeType,
        confidence_score: node.confidence,
        validation_issues: node.issues,
        suggestions: node.suggestions,
        node_content: node.content,
        validation_response: JSON.stringify(node.validationDetails)
      }));
      
      await this.supabase
        .from('assessment_validation_nodes')
        .insert(nodeRecords);
      
      // Record quality metrics
      await this.supabase
        .from('assessment_ai_quality_metrics')
        .insert({
          workflow_id: workflowId,
          overall_confidence: this.calculateOverallConfidence(nodes),
          accuracy_score: qualityMetrics.accuracyScore,
          bias_score: qualityMetrics.biasScore,
          clarity_score: qualityMetrics.clarityScore,
          consistency_score: qualityMetrics.consistencyScore,
          compliance_score: qualityMetrics.complianceScore,
          node_confidences: nodes.reduce((acc, node) => {
            acc[node.nodeId] = node.confidence;
            return acc;
          }, {} as Record<string, number>)
        });
    } catch (error) {
      console.error('Failed to record validation results:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Estimate validation cost based on API usage
   */
  private estimateValidationCost(nodeCount: number): number {
    // Rough estimate: $0.03 per 1K tokens, ~1K tokens per validation
    return nodeCount * 0.03;
  }

  /**
   * Initialize validation prompts for different node types
   */
  private initializeValidationPrompts(): void {
    this.validationPrompts.set('scoring', `
You are validating ASSESSMENT SCORING data. Focus on:
- Statistical accuracy and validity of scores
- Percentile calculations and interpretations
- Consistency with assessment methodology
- Bias in scoring algorithms or interpretations
- Compliance with psychometric standards
    `);
    
    this.validationPrompts.set('insight', `
You are validating ASSESSMENT INSIGHTS. Focus on:
- Accuracy of behavioral interpretations
- Evidence-based conclusions
- Cultural and demographic bias
- Professional language and tone
- Actionable and relevant content
    `);
    
    this.validationPrompts.set('recommendation', `
You are validating ASSESSMENT RECOMMENDATIONS. Focus on:
- Practicality and actionability
- Relevance to assessment results
- Bias-free development suggestions
- Professional and encouraging tone
- Specific and measurable guidance
    `);
    
    this.validationPrompts.set('summary', `
You are validating ASSESSMENT SUMMARIES. Focus on:
- Accurate reflection of detailed findings
- Balanced and fair representation
- Clear and professional language
- Appropriate level of detail
- Consistency with full assessment
    `);
    
    this.validationPrompts.set('context', `
You are validating CONTEXTUAL INFORMATION. Focus on:
- Accuracy of industry/role context
- Cultural sensitivity and appropriateness
- Relevance to assessment purpose
- Bias-free environmental considerations
- Professional and inclusive language
    `);
    
    this.validationPrompts.set('default', `
You are validating ASSESSMENT CONTENT. Focus on:
- Overall accuracy and validity
- Professional quality and tone
- Bias detection and mitigation
- Clarity and comprehensibility
- Compliance with quality standards
    `);
  }

  /**
   * Re-validate specific nodes after improvements
   */
  async revalidateNodes(
    workflowId: string,
    nodesToRevalidate: string[],
    updatedNodes: AssessmentNode[],
    context: B1ValidationRequest['validationContext']
  ): Promise<ValidationNode[]> {
    const revalidationResults: ValidationNode[] = [];
    
    for (const nodeId of nodesToRevalidate) {
      const updatedNode = updatedNodes.find(node => node.nodeId === nodeId);
      if (updatedNode) {
        const revalidated = await this.validateIndividualNode(updatedNode, context);
        revalidationResults.push(revalidated);
        
        // Record revalidation in database
        await this.supabase
          .from('assessment_validation_nodes')
          .update({
            confidence_score: revalidated.confidence,
            validation_issues: revalidated.issues,
            suggestions: revalidated.suggestions,
            iteration: 2, // Assuming this is the second iteration
            previous_confidence: updatedNode.confidence || 0,
            updated_at: new Date().toISOString()
          })
          .eq('workflow_id', workflowId)
          .eq('node_id', nodeId);
      }
    }
    
    return revalidationResults;
  }
}

export default B1ValidatorService;