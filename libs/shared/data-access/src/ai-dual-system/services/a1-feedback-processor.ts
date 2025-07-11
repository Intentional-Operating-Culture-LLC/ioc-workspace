/**
 * A1 Feedback Processor
 * Handles B1 feedback and implements continuous learning for the A1 Generator
 */

import { ValidationResponse, ValidationIssue } from '../core/interfaces.js';
import { GeneratedReport, ValidationNode } from './a1-generator.js';

export interface FeedbackContext {
  originalContent: any;
  b1Feedback: ValidationResponse;
  requestId: string;
  userId: string;
  contentType: string;
}

export interface RevisionPlan {
  nodeRevisions: NodeRevision[];
  consistencyChecks: ConsistencyCheck[];
  learningPoints: LearningPoint[];
}

export interface NodeRevision {
  nodeId: string;
  issueType: string;
  originalContent: string;
  revisionStrategy: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ConsistencyCheck {
  type: 'fact' | 'tone' | 'recommendation' | 'narrative';
  affectedNodes: string[];
  checkStrategy: string;
}

export interface LearningPoint {
  pattern: string;
  category: 'ethical' | 'bias' | 'factual' | 'quality';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
}

export interface RevisedContent {
  content: any;
  revisionSummary: string;
  confidenceUpdate: number;
  learningPoints: LearningPoint[];
  validationStatus: 'requires_revalidation' | 'ready_for_delivery';
}

export interface FeedbackPattern {
  id: string;
  pattern: string;
  category: string;
  occurrences: number;
  contexts: string[];
  lastSeen: Date;
  severity: string;
  resolution: string;
}

export class A1FeedbackProcessor {
  private anthropicClient: any;
  private learningDatabase: Map<string, FeedbackPattern>;
  private patternThreshold: number;

  constructor(anthropicClient: any, patternThreshold: number = 3) {
    this.anthropicClient = anthropicClient;
    this.learningDatabase = new Map();
    this.patternThreshold = patternThreshold;
  }

  /**
   * Main feedback processing method
   */
  async processB1Feedback(context: FeedbackContext): Promise<RevisedContent> {
    const { originalContent, b1Feedback } = context;

    // 1. Analyze feedback and create revision plan
    const revisionPlan = await this.createRevisionPlan(context);

    // 2. Execute node-level revisions
    const revisedNodes = await this.executeNodeRevisions(originalContent, revisionPlan);

    // 3. Ensure consistency across content
    const consistentContent = await this.ensureConsistency(originalContent, revisedNodes, revisionPlan);

    // 4. Update confidence scores
    const confidenceUpdate = this.calculateConfidenceUpdate(b1Feedback, revisionPlan);

    // 5. Extract and store learning points
    const learningPoints = await this.extractLearningPoints(context, revisionPlan);
    await this.storeLearningPoints(learningPoints, context);

    // 6. Generate revision summary
    const revisionSummary = this.generateRevisionSummary(revisionPlan, learningPoints);

    return {
      content: consistentContent,
      revisionSummary,
      confidenceUpdate,
      learningPoints,
      validationStatus: this.determineValidationStatus(b1Feedback, revisionPlan)
    };
  }

  /**
   * Create revision plan based on B1 feedback
   */
  private async createRevisionPlan(context: FeedbackContext): Promise<RevisionPlan> {
    const { b1Feedback, originalContent } = context;
    const nodeRevisions: NodeRevision[] = [];
    const consistencyChecks: ConsistencyCheck[] = [];

    // Process each validation issue
    for (const issue of b1Feedback.issues) {
      const revision = await this.createNodeRevision(issue, originalContent);
      nodeRevisions.push(revision);

      // Determine if this revision affects consistency
      const affectedNodes = this.identifyAffectedNodes(issue, originalContent);
      if (affectedNodes.length > 1) {
        consistencyChecks.push({
          type: this.mapIssueTypeToConsistencyType(issue.type),
          affectedNodes,
          checkStrategy: this.determineConsistencyStrategy(issue.type)
        });
      }
    }

    // Extract learning points from patterns
    const learningPoints = await this.identifyLearningPatterns(b1Feedback, context);

    return {
      nodeRevisions,
      consistencyChecks,
      learningPoints
    };
  }

  /**
   * Create node revision strategy
   */
  private async createNodeRevision(issue: ValidationIssue, originalContent: any): Promise<NodeRevision> {
    const systemPrompt = `You are an expert content revision specialist. Analyze validation issues and create precise revision strategies.`;

    const userPrompt = `Analyze this validation issue and create a revision strategy:

Issue: ${JSON.stringify(issue)}
Content Context: ${JSON.stringify(originalContent).substring(0, 1000)}

Provide:
1. Specific revision strategy
2. Priority level (high/medium/low)
3. Key considerations for maintaining content quality
4. Potential impact on related content`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    const strategy = this.parseRevisionStrategy(response);

    return {
      nodeId: issue.location || `issue_${Date.now()}`,
      issueType: issue.type,
      originalContent: issue.evidence?.join(', ') || '',
      revisionStrategy: strategy.strategy,
      priority: strategy.priority
    };
  }

  /**
   * Execute node-level revisions
   */
  private async executeNodeRevisions(
    originalContent: any,
    revisionPlan: RevisionPlan
  ): Promise<Map<string, any>> {
    const revisedNodes = new Map<string, any>();

    // Process revisions in priority order
    const sortedRevisions = revisionPlan.nodeRevisions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const revision of sortedRevisions) {
      const revisedContent = await this.executeIndividualRevision(
        originalContent,
        revision,
        revisedNodes
      );
      revisedNodes.set(revision.nodeId, revisedContent);
    }

    return revisedNodes;
  }

  /**
   * Execute individual node revision
   */
  private async executeIndividualRevision(
    originalContent: any,
    revision: NodeRevision,
    existingRevisions: Map<string, any>
  ): Promise<any> {
    const systemPrompt = `You are an expert content editor specializing in ${revision.issueType} issues. Make precise, minimal changes that address the specific issue while maintaining content quality.`;

    const userPrompt = `Revise this content according to the strategy:

Original Content: ${this.extractNodeContent(originalContent, revision.nodeId)}
Issue Type: ${revision.issueType}
Revision Strategy: ${revision.revisionStrategy}
Existing Revisions: ${Array.from(existingRevisions.entries()).map(([id, content]) => `${id}: ${JSON.stringify(content).substring(0, 200)}`).join('\n')}

Requirements:
1. Address the specific ${revision.issueType} issue
2. Maintain the original meaning and intent
3. Ensure consistency with existing revisions
4. Preserve the professional tone and style
5. Keep changes minimal and targeted

Provide only the revised content, no explanations.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return this.parseRevisedContent(response, revision);
  }

  /**
   * Ensure consistency across all content
   */
  private async ensureConsistency(
    originalContent: any,
    revisedNodes: Map<string, any>,
    revisionPlan: RevisionPlan
  ): Promise<any> {
    let consistentContent = { ...originalContent };

    // Apply revised nodes to content
    for (const [nodeId, revisedNodeContent] of revisedNodes) {
      consistentContent = this.applyNodeRevision(consistentContent, nodeId, revisedNodeContent);
    }

    // Perform consistency checks
    for (const check of revisionPlan.consistencyChecks) {
      consistentContent = await this.performConsistencyCheck(consistentContent, check);
    }

    return consistentContent;
  }

  /**
   * Perform specific consistency check
   */
  private async performConsistencyCheck(
    content: any,
    check: ConsistencyCheck
  ): Promise<any> {
    const systemPrompt = `You are a content consistency expert. Ensure ${check.type} consistency across related content sections.`;

    const userPrompt = `Review and ensure consistency for:

Content: ${JSON.stringify(content)}
Consistency Type: ${check.type}
Affected Nodes: ${check.affectedNodes.join(', ')}
Check Strategy: ${check.checkStrategy}

Identify any inconsistencies and provide minimal corrections to ensure:
1. ${check.type} consistency across all sections
2. Logical flow and coherence
3. Uniform tone and style
4. Accurate cross-references

Provide the corrected content maintaining all original structure.`;

    const response = await this.callAnthropicAPI(systemPrompt, userPrompt);
    return this.parseConsistentContent(response, content);
  }

  /**
   * Extract learning points from feedback patterns
   */
  private async extractLearningPoints(
    context: FeedbackContext,
    revisionPlan: RevisionPlan
  ): Promise<LearningPoint[]> {
    const learningPoints: LearningPoint[] = [];

    // Analyze patterns in current feedback
    const issuePatterns = this.analyzeIssuePatterns(context.b1Feedback.issues);

    for (const pattern of issuePatterns) {
      const existingPattern = this.findExistingPattern(pattern);
      
      if (existingPattern) {
        // Update existing pattern
        existingPattern.occurrences++;
        existingPattern.lastSeen = new Date();
        existingPattern.contexts.push(context.contentType);
        
        // Check if pattern meets threshold for action
        if (existingPattern.occurrences >= this.patternThreshold) {
          learningPoints.push({
            pattern: existingPattern.pattern,
            category: this.mapIssueTypeToCategory(pattern.type),
            frequency: existingPattern.occurrences,
            severity: this.calculatePatternSeverity(existingPattern),
            actionable: true
          });
        }
      } else {
        // Create new pattern
        const newPattern: FeedbackPattern = {
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: pattern.description,
          category: pattern.type,
          occurrences: 1,
          contexts: [context.contentType],
          lastSeen: new Date(),
          severity: pattern.severity,
          resolution: pattern.suggestedFix || 'No specific resolution provided'
        };
        
        this.learningDatabase.set(newPattern.id, newPattern);
      }
    }

    return learningPoints;
  }

  /**
   * Store learning points for future use
   */
  private async storeLearningPoints(
    learningPoints: LearningPoint[],
    context: FeedbackContext
  ): Promise<void> {
    // TODO: Implement persistent storage
    // For now, maintain in-memory learning database
    
    for (const point of learningPoints) {
      if (point.actionable && point.frequency >= this.patternThreshold) {
        // This learning point should influence future generation
        console.log(`Actionable learning point identified: ${point.pattern}`);
        
        // Store in learning database for immediate application
        const learningEntry = {
          pattern: point.pattern,
          category: point.category,
          severity: point.severity,
          context: context.contentType,
          userId: context.userId,
          timestamp: new Date()
        };
        
        // TODO: Integrate with continuous learning system
      }
    }
  }

  /**
   * Apply immediate learning to current session
   */
  async applyImmediateLearning(
    context: FeedbackContext,
    learningPoints: LearningPoint[]
  ): Promise<void> {
    const actionableLearning = learningPoints.filter(point => 
      point.actionable && point.severity !== 'low'
    );

    if (actionableLearning.length > 0) {
      // Create learning prompt for immediate application
      const learningPrompt = this.createLearningPrompt(actionableLearning, context);
      
      // TODO: Apply to current A1 generation session
      console.log('Immediate learning applied:', learningPrompt);
    }
  }

  /**
   * Identify affected nodes by issue
   */
  private identifyAffectedNodes(issue: ValidationIssue, content: any): string[] {
    const affectedNodes: string[] = [];
    
    // If location is specified, that's the primary affected node
    if (issue.location) {
      affectedNodes.push(issue.location);
    }

    // Identify related nodes based on issue type
    switch (issue.type) {
      case 'factual':
        // Factual errors might affect multiple sections that reference the same data
        affectedNodes.push(...this.findFactuallyRelatedNodes(content, issue));
        break;
      case 'bias':
        // Bias issues might affect sections with similar language patterns
        affectedNodes.push(...this.findBiasRelatedNodes(content, issue));
        break;
      case 'ethical':
        // Ethical concerns might affect recommendations and narrative sections
        affectedNodes.push(...this.findEthicallyRelatedNodes(content, issue));
        break;
      case 'quality':
        // Quality issues might be localized or affect readability throughout
        affectedNodes.push(...this.findQualityRelatedNodes(content, issue));
        break;
    }

    return [...new Set(affectedNodes)]; // Remove duplicates
  }

  /**
   * Find factually related nodes
   */
  private findFactuallyRelatedNodes(content: any, issue: ValidationIssue): string[] {
    // Implement logic to find nodes that contain similar factual claims
    const relatedNodes: string[] = [];
    
    if (issue.evidence) {
      for (const evidence of issue.evidence) {
        // Search for similar facts or data points across content
        // This is a simplified implementation
        if (typeof content === 'object') {
          Object.keys(content).forEach(key => {
            if (typeof content[key] === 'string' && content[key].includes(evidence)) {
              relatedNodes.push(key);
            }
          });
        }
      }
    }
    
    return relatedNodes;
  }

  /**
   * Find bias-related nodes
   */
  private findBiasRelatedNodes(content: any, issue: ValidationIssue): string[] {
    // Implement logic to find nodes with potentially biased language
    const relatedNodes: string[] = [];
    
    // Look for similar language patterns that might indicate bias
    const biasIndicators = ['assumption', 'stereotype', 'generalization'];
    
    if (typeof content === 'object') {
      Object.keys(content).forEach(key => {
        if (typeof content[key] === 'string') {
          const hasIndicator = biasIndicators.some(indicator =>
            content[key].toLowerCase().includes(indicator)
          );
          if (hasIndicator) {
            relatedNodes.push(key);
          }
        }
      });
    }
    
    return relatedNodes;
  }

  /**
   * Find ethically related nodes
   */
  private findEthicallyRelatedNodes(content: any, issue: ValidationIssue): string[] {
    // Look for nodes that contain recommendations or advice
    const relatedNodes: string[] = [];
    
    if (typeof content === 'object') {
      Object.keys(content).forEach(key => {
        if (key.includes('recommendation') || key.includes('advice') || key.includes('narrative')) {
          relatedNodes.push(key);
        }
      });
    }
    
    return relatedNodes;
  }

  /**
   * Find quality-related nodes
   */
  private findQualityRelatedNodes(content: any, issue: ValidationIssue): string[] {
    // Quality issues might affect readability throughout
    const relatedNodes: string[] = [];
    
    if (issue.description.includes('clarity') || issue.description.includes('readability')) {
      // Quality issues affect all text nodes
      if (typeof content === 'object') {
        Object.keys(content).forEach(key => {
          if (typeof content[key] === 'string') {
            relatedNodes.push(key);
          }
        });
      }
    }
    
    return relatedNodes;
  }

  /**
   * Map issue type to consistency type
   */
  private mapIssueTypeToConsistencyType(issueType: string): 'fact' | 'tone' | 'recommendation' | 'narrative' {
    switch (issueType) {
      case 'factual':
        return 'fact';
      case 'quality':
        return 'tone';
      case 'bias':
      case 'ethical':
        return 'recommendation';
      default:
        return 'narrative';
    }
  }

  /**
   * Determine consistency strategy
   */
  private determineConsistencyStrategy(issueType: string): string {
    switch (issueType) {
      case 'factual':
        return 'Verify factual consistency across all references';
      case 'bias':
        return 'Ensure unbiased language throughout content';
      case 'ethical':
        return 'Maintain ethical standards in all recommendations';
      case 'quality':
        return 'Ensure consistent tone and readability';
      default:
        return 'Maintain overall content coherence';
    }
  }

  /**
   * Parse revision strategy from AI response
   */
  private parseRevisionStrategy(response: string): { strategy: string; priority: 'high' | 'medium' | 'low' } {
    const lines = response.split('\n').filter(line => line.trim());
    
    let strategy = lines[0] || 'General content revision required';
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    // Extract priority from response
    const priorityMatch = response.match(/priority:\s*(high|medium|low)/i);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
    }
    
    // Clean up strategy text
    strategy = strategy.replace(/^\d+\.\s*/, '').trim();
    
    return { strategy, priority };
  }

  /**
   * Extract node content for revision
   */
  private extractNodeContent(content: any, nodeId: string): string {
    if (typeof content === 'object' && content[nodeId]) {
      return typeof content[nodeId] === 'string' ? content[nodeId] : JSON.stringify(content[nodeId]);
    }
    
    // If nodeId is not found, return relevant section
    return JSON.stringify(content).substring(0, 1000);
  }

  /**
   * Parse revised content from AI response
   */
  private parseRevisedContent(response: string, revision: NodeRevision): any {
    // Clean up the response to extract just the revised content
    let revisedContent = response.trim();
    
    // Remove any explanatory text that might have been included
    const contentMarkers = ['revised content:', 'updated content:', 'corrected content:'];
    for (const marker of contentMarkers) {
      const markerIndex = revisedContent.toLowerCase().indexOf(marker);
      if (markerIndex !== -1) {
        revisedContent = revisedContent.substring(markerIndex + marker.length).trim();
      }
    }
    
    return revisedContent;
  }

  /**
   * Apply node revision to content
   */
  private applyNodeRevision(content: any, nodeId: string, revisedContent: any): any {
    const updatedContent = { ...content };
    
    if (typeof updatedContent === 'object' && nodeId in updatedContent) {
      updatedContent[nodeId] = revisedContent;
    } else {
      // If nodeId is not a direct property, try to find the best place to apply the revision
      const keys = Object.keys(updatedContent);
      const matchingKey = keys.find(key => key.includes(nodeId) || nodeId.includes(key));
      
      if (matchingKey) {
        updatedContent[matchingKey] = revisedContent;
      }
    }
    
    return updatedContent;
  }

  /**
   * Parse consistent content from AI response
   */
  private parseConsistentContent(response: string, originalContent: any): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If not JSON, return structured response
      return this.structureConsistentContent(response, originalContent);
    } catch (error) {
      console.warn('Failed to parse consistent content:', error.message);
      return originalContent; // Fallback to original
    }
  }

  /**
   * Structure consistent content when JSON parsing fails
   */
  private structureConsistentContent(response: string, originalContent: any): any {
    // This is a fallback method to structure the response
    // In a production system, this would be more sophisticated
    const sections = response.split(/(?:\n\s*\n|\n(?=[A-Z][a-z]+:))/);
    const structuredContent = { ...originalContent };
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      if (lines.length > 0) {
        const firstLine = lines[0];
        const colonIndex = firstLine.indexOf(':');
        
        if (colonIndex !== -1) {
          const key = firstLine.substring(0, colonIndex).trim().toLowerCase();
          const value = firstLine.substring(colonIndex + 1).trim() + 
                       (lines.length > 1 ? '\n' + lines.slice(1).join('\n') : '');
          
          if (key in structuredContent) {
            structuredContent[key] = value;
          }
        }
      }
    });
    
    return structuredContent;
  }

  /**
   * Calculate confidence update based on feedback
   */
  private calculateConfidenceUpdate(
    feedback: ValidationResponse,
    revisionPlan: RevisionPlan
  ): number {
    let confidenceChange = 0;
    
    // Reduce confidence based on issues found
    const criticalIssues = feedback.issues.filter(issue => issue.severity === 'critical').length;
    const highIssues = feedback.issues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = feedback.issues.filter(issue => issue.severity === 'medium').length;
    
    confidenceChange -= (criticalIssues * 0.2 + highIssues * 0.1 + mediumIssues * 0.05);
    
    // Adjust based on revision complexity
    const highPriorityRevisions = revisionPlan.nodeRevisions.filter(r => r.priority === 'high').length;
    confidenceChange -= (highPriorityRevisions * 0.05);
    
    // Increase confidence slightly for successful pattern learning
    const actionableLearning = revisionPlan.learningPoints.filter(lp => lp.actionable).length;
    confidenceChange += (actionableLearning * 0.02);
    
    return Math.max(-0.3, Math.min(0.1, confidenceChange)); // Cap change between -0.3 and +0.1
  }

  /**
   * Determine validation status after revision
   */
  private determineValidationStatus(
    feedback: ValidationResponse,
    revisionPlan: RevisionPlan
  ): 'requires_revalidation' | 'ready_for_delivery' {
    const criticalIssues = feedback.issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    ).length;
    
    const complexRevisions = revisionPlan.nodeRevisions.filter(r => 
      r.priority === 'high'
    ).length;
    
    // Require revalidation if there were critical issues or complex revisions
    if (criticalIssues > 0 || complexRevisions > 2) {
      return 'requires_revalidation';
    }
    
    return 'ready_for_delivery';
  }

  /**
   * Generate revision summary
   */
  private generateRevisionSummary(
    revisionPlan: RevisionPlan,
    learningPoints: LearningPoint[]
  ): string {
    const totalRevisions = revisionPlan.nodeRevisions.length;
    const highPriorityRevisions = revisionPlan.nodeRevisions.filter(r => r.priority === 'high').length;
    const consistencyChecks = revisionPlan.consistencyChecks.length;
    const actionableLearning = learningPoints.filter(lp => lp.actionable).length;
    
    return `Processed ${totalRevisions} revisions (${highPriorityRevisions} high-priority), performed ${consistencyChecks} consistency checks, and identified ${actionableLearning} actionable learning points for future improvement.`;
  }

  /**
   * Analyze issue patterns
   */
  private analyzeIssuePatterns(issues: ValidationIssue[]): Array<{
    type: string;
    description: string;
    severity: string;
    suggestedFix?: string;
  }> {
    return issues.map(issue => ({
      type: issue.type,
      description: issue.description,
      severity: issue.severity,
      suggestedFix: issue.suggestedFix
    }));
  }

  /**
   * Find existing pattern in learning database
   */
  private findExistingPattern(pattern: { type: string; description: string }): FeedbackPattern | null {
    for (const [id, existingPattern] of this.learningDatabase) {
      if (existingPattern.category === pattern.type && 
          existingPattern.pattern.includes(pattern.description.substring(0, 50))) {
        return existingPattern;
      }
    }
    return null;
  }

  /**
   * Map issue type to learning category
   */
  private mapIssueTypeToCategory(issueType: string): 'ethical' | 'bias' | 'factual' | 'quality' {
    switch (issueType) {
      case 'ethical':
        return 'ethical';
      case 'bias':
        return 'bias';
      case 'factual':
        return 'factual';
      default:
        return 'quality';
    }
  }

  /**
   * Calculate pattern severity
   */
  private calculatePatternSeverity(pattern: FeedbackPattern): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.occurrences >= 10) return 'critical';
    if (pattern.occurrences >= 5) return 'high';
    if (pattern.occurrences >= 3) return 'medium';
    return 'low';
  }

  /**
   * Create learning prompt for immediate application
   */
  private createLearningPrompt(
    learningPoints: LearningPoint[],
    context: FeedbackContext
  ): string {
    const patterns = learningPoints.map(lp => `${lp.category}: ${lp.pattern}`).join('; ');
    
    return `Apply these learned patterns to avoid similar issues in ${context.contentType} generation: ${patterns}`;
  }

  /**
   * Identify learning patterns from current feedback
   */
  private async identifyLearningPatterns(
    feedback: ValidationResponse,
    context: FeedbackContext
  ): Promise<LearningPoint[]> {
    const patterns: LearningPoint[] = [];
    
    // Group issues by type to identify patterns
    const issuesByType = feedback.issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);
    
    // Analyze each type for patterns
    for (const [type, issues] of Object.entries(issuesByType)) {
      if (issues.length > 1) {
        // Multiple issues of same type suggest a pattern
        patterns.push({
          pattern: `Multiple ${type} issues in ${context.contentType}`,
          category: this.mapIssueTypeToCategory(type),
          frequency: issues.length,
          severity: this.determineMostSevereSeverity(issues),
          actionable: true
        });
      }
    }
    
    return patterns;
  }

  /**
   * Determine most severe severity from issues
   */
  private determineMostSevereSeverity(issues: ValidationIssue[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    for (const issue of issues) {
      if (severityOrder[issue.severity as keyof typeof severityOrder] > severityOrder[maxSeverity as keyof typeof severityOrder]) {
        maxSeverity = issue.severity as 'low' | 'medium' | 'high' | 'critical';
      }
    }
    
    return maxSeverity;
  }

  /**
   * Call Anthropic API for revision tasks
   */
  private async callAnthropicAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.anthropicClient.messages.create({
        model: 'claude-3-opus',
        max_tokens: 2048,
        temperature: 0.3, // Lower temperature for more precise revisions
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
      throw new Error(`Feedback processing failed: ${error.message}`);
    }
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics(): {
    totalPatterns: number;
    actionablePatterns: number;
    criticalPatterns: number;
    recentLearning: FeedbackPattern[];
  } {
    const patterns = Array.from(this.learningDatabase.values());
    const actionablePatterns = patterns.filter(p => p.occurrences >= this.patternThreshold);
    const criticalPatterns = patterns.filter(p => p.severity === 'critical' || p.occurrences >= 10);
    const recentLearning = patterns
      .filter(p => Date.now() - p.lastSeen.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, 10);
    
    return {
      totalPatterns: patterns.length,
      actionablePatterns: actionablePatterns.length,
      criticalPatterns: criticalPatterns.length,
      recentLearning
    };
  }
}