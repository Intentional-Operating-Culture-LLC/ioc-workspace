/**
 * Assessment Dual-AI Service
 * Practical implementation of dual-AI workflow for IOC assessment system
 */

import { createClient } from '@supabase/supabase-js';
import { 
  scoreAssessmentResponse, 
  ScoringResult 
} from '../../scoring/assessment-scoring-service';
import { 
  OceanScoreDetails, 
  interpretOceanProfile 
} from '../../scoring/ocean-scoring';

// Types for our dual-AI workflow
export interface AssessmentAIRequest {
  responseId: string;
  assessmentType: 'individual' | 'executive' | 'organizational';
  contextData: {
    industry?: string;
    role?: string;
    culturalContext?: string;
    targetAudience: string;
  };
  options: {
    confidenceThreshold: number;
    maxIterations: number;
    reportStyle: 'standard' | 'executive' | 'coaching';
  };
}

export interface AssessmentNode {
  nodeId: string;
  nodeType: 'scoring' | 'insight' | 'recommendation' | 'context';
  content: any;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

export interface ValidationFeedback {
  nodeId: string;
  currentConfidence: number;
  requiredConfidence: number;
  issues: {
    category: 'accuracy' | 'clarity' | 'bias' | 'consistency' | 'compliance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedFix: string;
  }[];
  specificGuidance: string;
}

export interface DualAIAssessmentResult {
  assessmentId: string;
  finalScores: ScoringResult;
  enhancedReport: {
    executiveSummary: string;
    detailedInsights: string[];
    actionableRecommendations: string[];
    developmentPlan: string;
    riskFactors: string[];
  };
  qualityMetrics: {
    overallConfidence: number;
    iterationCount: number;
    processingTime: number;
    nodeConfidences: Record<string, number>;
  };
  workflowId: string;
}

export class AssessmentDualAIService {
  private supabase: any;
  private openaiApiKey: string;
  private confidenceThreshold: number = 85;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiApiKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Main entry point for dual-AI assessment processing
   */
  async processAssessment(request: AssessmentAIRequest): Promise<DualAIAssessmentResult> {
    const startTime = Date.now();
    
    // Create workflow tracking record
    const workflowId = await this.createWorkflowRecord(request);
    
    try {
      // Step 1: A1 Generation - Enhanced scoring and report generation
      const a1Output = await this.generateEnhancedAssessment(request);
      
      // Step 2: B1 Validation - Node-level confidence scoring
      const b1Validation = await this.validateAssessmentNodes(a1Output, request);
      
      // Step 3: Iterative improvement if needed
      const finalOutput = await this.iterativeImprovement(
        a1Output,
        b1Validation,
        request,
        workflowId
      );
      
      // Step 4: Finalize and record results
      const result = await this.finalizeAssessment(
        finalOutput,
        workflowId,
        startTime
      );
      
      return result;
    } catch (error) {
      await this.recordWorkflowError(workflowId, error);
      throw error;
    }
  }

  /**
   * A1 Generator: Enhanced assessment processing
   */
  private async generateEnhancedAssessment(request: AssessmentAIRequest): Promise<any> {
    // Get base scoring using existing system
    const baseScoring = await scoreAssessmentResponse(request.responseId);
    
    // Enhanced report generation with Claude
    const enhancedReport = await this.generateEnhancedReport(baseScoring, request);
    
    // Create structured nodes for validation
    const nodes = this.createAssessmentNodes(baseScoring, enhancedReport);
    
    return {
      baseScoring,
      enhancedReport,
      nodes,
      generationMetadata: {
        timestamp: new Date().toISOString(),
        model: 'claude-3-5-sonnet',
        confidence: this.estimateGenerationConfidence(baseScoring)
      }
    };
  }

  /**
   * Generate enhanced report using Claude
   */
  private async generateEnhancedReport(
    scoring: ScoringResult,
    request: AssessmentAIRequest
  ): Promise<any> {
    const prompt = this.buildEnhancedReportPrompt(scoring, request);
    
    // In a real implementation, you would call Claude API here
    // For now, we'll simulate the enhanced report generation
    return {
      executiveSummary: this.generateExecutiveSummary(scoring),
      detailedInsights: this.generateDetailedInsights(scoring),
      actionableRecommendations: this.generateRecommendations(scoring),
      developmentPlan: this.generateDevelopmentPlan(scoring),
      riskFactors: this.identifyRiskFactors(scoring)
    };
  }

  /**
   * B1 Validator: Node-level validation with OpenAI
   */
  private async validateAssessmentNodes(
    a1Output: any,
    request: AssessmentAIRequest
  ): Promise<AssessmentNode[]> {
    const validatedNodes: AssessmentNode[] = [];
    
    for (const node of a1Output.nodes) {
      const validation = await this.validateIndividualNode(node, request);
      validatedNodes.push({
        ...node,
        confidence: validation.confidence,
        issues: validation.issues,
        suggestions: validation.suggestions
      });
    }
    
    return validatedNodes;
  }

  /**
   * Validate individual node using OpenAI
   */
  private async validateIndividualNode(
    node: AssessmentNode,
    request: AssessmentAIRequest
  ): Promise<{ confidence: number; issues: string[]; suggestions: string[] }> {
    const validationPrompt = this.buildNodeValidationPrompt(node, request);
    
    try {
      const response = await this.callOpenAI(validationPrompt);
      return this.parseValidationResponse(response);
    } catch (error) {
      console.error('OpenAI validation failed:', error);
      return {
        confidence: 70, // Conservative fallback
        issues: ['Validation service unavailable'],
        suggestions: ['Manual review recommended']
      };
    }
  }

  /**
   * Iterative improvement loop
   */
  private async iterativeImprovement(
    a1Output: any,
    b1Validation: AssessmentNode[],
    request: AssessmentAIRequest,
    workflowId: string
  ): Promise<any> {
    let currentOutput = a1Output;
    let currentValidation = b1Validation;
    let iteration = 0;
    
    while (iteration < request.options.maxIterations) {
      // Check if we meet confidence threshold
      const overallConfidence = this.calculateOverallConfidence(currentValidation);
      
      if (overallConfidence >= request.options.confidenceThreshold) {
        break; // Success!
      }
      
      // Get feedback for low-confidence nodes
      const feedback = this.generateFeedback(currentValidation, request.options.confidenceThreshold);
      
      if (feedback.length === 0) {
        break; // No actionable feedback
      }
      
      // Apply targeted improvements
      currentOutput = await this.applyTargetedImprovements(
        currentOutput,
        feedback,
        request
      );
      
      // Re-validate improved nodes
      currentValidation = await this.revalidateNodes(
        currentOutput,
        feedback,
        request
      );
      
      // Record iteration
      await this.recordIteration(workflowId, iteration + 1, overallConfidence);
      
      iteration++;
    }
    
    return {
      ...currentOutput,
      validationResults: currentValidation,
      iterationCount: iteration
    };
  }

  /**
   * Apply targeted improvements to specific nodes
   */
  private async applyTargetedImprovements(
    currentOutput: any,
    feedback: ValidationFeedback[],
    request: AssessmentAIRequest
  ): Promise<any> {
    const improvedOutput = { ...currentOutput };
    
    for (const feedbackItem of feedback) {
      const improvementPrompt = this.buildImprovementPrompt(
        feedbackItem,
        currentOutput,
        request
      );
      
      try {
        // Use Claude for improvements (simulated here)
        const improvement = await this.generateImprovement(improvementPrompt);
        improvedOutput.nodes = this.applyNodeImprovement(
          improvedOutput.nodes,
          feedbackItem.nodeId,
          improvement
        );
      } catch (error) {
        console.error('Failed to apply improvement:', error);
      }
    }
    
    return improvedOutput;
  }

  /**
   * Helper methods for workflow management
   */
  private async createWorkflowRecord(request: AssessmentAIRequest): Promise<string> {
    const { data, error } = await this.supabase
      .from('assessment_ai_workflows')
      .insert({
        assessment_id: request.responseId,
        workflow_type: request.assessmentType,
        status: 'in_progress',
        confidence_threshold: request.options.confidenceThreshold,
        max_iterations: request.options.maxIterations
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  private async recordIteration(
    workflowId: string,
    iteration: number,
    confidence: number
  ): Promise<void> {
    await this.supabase
      .from('assessment_ai_workflows')
      .update({
        iterations: iteration,
        current_confidence: confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);
  }

  private async finalizeAssessment(
    finalOutput: any,
    workflowId: string,
    startTime: number
  ): Promise<DualAIAssessmentResult> {
    const processingTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(finalOutput.validationResults);
    
    // Update workflow record
    await this.supabase
      .from('assessment_ai_workflows')
      .update({
        status: 'completed',
        final_confidence: overallConfidence,
        processing_time: processingTime,
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);
    
    return {
      assessmentId: finalOutput.baseScoring.assessmentId,
      finalScores: finalOutput.baseScoring,
      enhancedReport: finalOutput.enhancedReport,
      qualityMetrics: {
        overallConfidence,
        iterationCount: finalOutput.iterationCount || 0,
        processingTime,
        nodeConfidences: this.extractNodeConfidences(finalOutput.validationResults)
      },
      workflowId
    };
  }

  /**
   * Utility methods
   */
  private createAssessmentNodes(scoring: ScoringResult, report: any): AssessmentNode[] {
    const nodes: AssessmentNode[] = [];
    
    // Scoring nodes
    Object.entries(scoring.scores.ocean.raw).forEach(([trait, score]) => {
      nodes.push({
        nodeId: `ocean_${trait}`,
        nodeType: 'scoring',
        content: { trait, score, percentile: scoring.scores.ocean.percentile[trait as keyof typeof scoring.scores.ocean.percentile] },
        confidence: 0, // Will be set by validator
        issues: [],
        suggestions: []
      });
    });
    
    // Report nodes
    nodes.push({
      nodeId: 'executive_summary',
      nodeType: 'insight',
      content: report.executiveSummary,
      confidence: 0,
      issues: [],
      suggestions: []
    });
    
    nodes.push({
      nodeId: 'recommendations',
      nodeType: 'recommendation',
      content: report.actionableRecommendations,
      confidence: 0,
      issues: [],
      suggestions: []
    });
    
    return nodes;
  }

  private buildNodeValidationPrompt(node: AssessmentNode, request: AssessmentAIRequest): string {
    return `
You are an expert assessment validator. Review the following assessment node for quality and accuracy.

Node Type: ${node.nodeType}
Node ID: ${node.nodeId}
Content: ${JSON.stringify(node.content)}
Context: ${JSON.stringify(request.contextData)}

Evaluate this node on a scale of 0-100 for:
1. Accuracy and validity
2. Clarity and professionalism
3. Bias and fairness
4. Relevance and actionability
5. Compliance with best practices

Respond in JSON format:
{
  "confidence": <number 0-100>,
  "issues": ["<issue1>", "<issue2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"]
}

Be specific and actionable in your feedback.
    `.trim();
  }

  private buildImprovementPrompt(
    feedback: ValidationFeedback,
    currentOutput: any,
    request: AssessmentAIRequest
  ): string {
    return `
You are an expert assessment content improver. Based on the following feedback, improve the specific node content.

Node ID: ${feedback.nodeId}
Current Confidence: ${feedback.currentConfidence}%
Required Confidence: ${feedback.requiredConfidence}%

Issues to Address:
${feedback.issues.map(issue => `- ${issue.description}: ${issue.suggestedFix}`).join('\n')}

Specific Guidance: ${feedback.specificGuidance}

Current Content: ${JSON.stringify(currentOutput.nodes.find((n: any) => n.nodeId === feedback.nodeId)?.content)}

Provide improved content that addresses all issues while maintaining professional quality.
    `.trim();
  }

  private generateFeedback(
    validation: AssessmentNode[],
    threshold: number
  ): ValidationFeedback[] {
    return validation
      .filter(node => node.confidence < threshold)
      .map(node => ({
        nodeId: node.nodeId,
        currentConfidence: node.confidence,
        requiredConfidence: threshold,
        issues: node.issues.map(issue => ({
          category: 'accuracy' as const,
          severity: 'medium' as const,
          description: issue,
          suggestedFix: node.suggestions[0] || 'Review and improve content'
        })),
        specificGuidance: node.suggestions.join(' ')
      }));
  }

  private calculateOverallConfidence(nodes: AssessmentNode[]): number {
    if (nodes.length === 0) return 0;
    return nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length;
  }

  private extractNodeConfidences(nodes: AssessmentNode[]): Record<string, number> {
    const confidences: Record<string, number> = {};
    nodes.forEach(node => {
      confidences[node.nodeId] = node.confidence;
    });
    return confidences;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    // Placeholder for OpenAI API call
    // In real implementation, you would use the OpenAI SDK
    return JSON.stringify({
      confidence: 85,
      issues: [],
      suggestions: []
    });
  }

  private parseValidationResponse(response: string): { confidence: number; issues: string[]; suggestions: string[] } {
    try {
      const parsed = JSON.parse(response);
      return {
        confidence: parsed.confidence || 70,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || []
      };
    } catch {
      return {
        confidence: 70,
        issues: ['Failed to parse validation response'],
        suggestions: ['Manual review recommended']
      };
    }
  }

  // Placeholder methods for report generation
  private generateExecutiveSummary(scoring: ScoringResult): string {
    return `Executive assessment summary based on OCEAN profile analysis.`;
  }

  private generateDetailedInsights(scoring: ScoringResult): string[] {
    return ['Detailed insight 1', 'Detailed insight 2'];
  }

  private generateRecommendations(scoring: ScoringResult): string[] {
    return ['Recommendation 1', 'Recommendation 2'];
  }

  private generateDevelopmentPlan(scoring: ScoringResult): string {
    return 'Development plan based on assessment results.';
  }

  private identifyRiskFactors(scoring: ScoringResult): string[] {
    return ['Risk factor 1', 'Risk factor 2'];
  }

  private estimateGenerationConfidence(scoring: ScoringResult): number {
    return scoring.metadata.confidenceLevel || 85;
  }

  private buildEnhancedReportPrompt(scoring: ScoringResult, request: AssessmentAIRequest): string {
    return `Generate enhanced assessment report based on OCEAN scores and context.`;
  }

  private async generateImprovement(prompt: string): Promise<any> {
    // Placeholder for improvement generation
    return { improvedContent: 'Improved content based on feedback' };
  }

  private applyNodeImprovement(nodes: AssessmentNode[], nodeId: string, improvement: any): AssessmentNode[] {
    return nodes.map(node => 
      node.nodeId === nodeId 
        ? { ...node, content: improvement.improvedContent }
        : node
    );
  }

  private async revalidateNodes(
    output: any,
    feedback: ValidationFeedback[],
    request: AssessmentAIRequest
  ): Promise<AssessmentNode[]> {
    // Re-validate only the nodes that were improved
    const nodesToRevalidate = feedback.map(f => f.nodeId);
    const revalidated = [...output.validationResults];
    
    for (const nodeId of nodesToRevalidate) {
      const node = output.nodes.find((n: any) => n.nodeId === nodeId);
      if (node) {
        const validation = await this.validateIndividualNode(node, request);
        const index = revalidated.findIndex(n => n.nodeId === nodeId);
        if (index >= 0) {
          revalidated[index] = {
            ...revalidated[index],
            confidence: validation.confidence,
            issues: validation.issues,
            suggestions: validation.suggestions
          };
        }
      }
    }
    
    return revalidated;
  }

  private async recordWorkflowError(workflowId: string, error: any): Promise<void> {
    await this.supabase
      .from('assessment_ai_workflows')
      .update({
        status: 'failed',
        error_details: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);
  }
}

export default AssessmentDualAIService;