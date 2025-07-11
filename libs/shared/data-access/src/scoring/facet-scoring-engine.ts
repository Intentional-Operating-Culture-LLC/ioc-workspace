// OCEAN Facet Scoring Engine
// Version: 2025-07-10.1
// Purpose: Core engine for calculating 30-facet OCEAN personality scores

export interface FacetScore {
  score: number;
  confidence: number;
  n_items: number;
  raw_scores: number[];
  percentile?: number;
  t_score?: number;
}

export interface NodeCorrelation {
  node_id: string;
  facet_code: string;
  correlation: number;
  mapping_type: 'direct' | 'indirect' | 'inverse';
  confidence: number;
}

export interface AssessmentResponse {
  id: string;
  question_id: string;
  response_value: number;
  response_text?: string;
  response_time_ms: number;
  prompts: {
    id: string;
    node_id: string;
    prompt_type: string;
    metadata: any;
  };
}

export interface CoverageMetrics {
  coverage_percentage: number;
  confidence_scores: Record<string, number>;
  missing_facets: string[];
  weak_coverage_facets: string[];
}

export class FacetScoringEngine {
  private static readonly FACET_CODES = [
    'O1_Fantasy', 'O2_Aesthetics', 'O3_Feelings', 'O4_Actions', 'O5_Ideas', 'O6_Values',
    'C1_Competence', 'C2_Order', 'C3_Dutifulness', 'C4_Achievement_Striving', 'C5_Self_Discipline', 'C6_Deliberation',
    'E1_Warmth', 'E2_Gregariousness', 'E3_Assertiveness', 'E4_Activity', 'E5_Excitement_Seeking', 'E6_Positive_Emotions',
    'A1_Trust', 'A2_Straightforwardness', 'A3_Altruism', 'A4_Compliance', 'A5_Modesty', 'A6_Tender_Mindedness',
    'N1_Anxiety', 'N2_Angry_Hostility', 'N3_Depression', 'N4_Self_Consciousness', 'N5_Impulsiveness', 'N6_Vulnerability'
  ];

  private static readonly TIER_WEIGHTS = {
    individual: { individual: 1.0, executive: 0.3, organizational: 0.1 },
    executive: { individual: 0.5, executive: 1.0, organizational: 0.4 },
    organizational: { individual: 0.3, executive: 0.6, organizational: 1.0 }
  };

  /**
   * Calculate scores for all 30 OCEAN facets
   */
  async calculateAllFacetScores(
    responses: AssessmentResponse[],
    mappings: NodeCorrelation[],
    tier: string = 'individual'
  ): Promise<Record<string, FacetScore>> {
    const facetScores: Record<string, FacetScore> = {};

    // Group mappings by facet
    const mappingsByFacet = this.groupMappingsByFacet(mappings);

    // Calculate each facet score
    for (const facetCode of FacetScoringEngine.FACET_CODES) {
      const facetMappings = mappingsByFacet[facetCode] || [];
      
      if (facetMappings.length > 0) {
        facetScores[facetCode] = await this.calculateFacetScore(
          responses,
          facetCode,
          facetMappings,
          tier
        );
      } else {
        // No mappings available for this facet
        facetScores[facetCode] = {
          score: 0.0,
          confidence: 0.0,
          n_items: 0,
          raw_scores: []
        };
      }
    }

    return facetScores;
  }

  /**
   * Calculate individual facet score from multiple node responses
   */
  async calculateFacetScore(
    responses: AssessmentResponse[],
    facetCode: string,
    facetMappings: NodeCorrelation[],
    tier: string
  ): Promise<FacetScore> {
    const weightedScores: number[] = [];
    let totalWeight = 0;

    // Process each response that contributes to this facet
    for (const response of responses) {
      const nodeId = response.prompts.node_id;
      const mapping = facetMappings.find(m => m.node_id === nodeId);

      if (mapping) {
        // Normalize response to -3 to +3 scale
        const normalizedResponse = this.normalizeResponse(
          response.response_value,
          response.prompts.prompt_type,
          mapping.correlation
        );

        // Apply tier-specific weight modifier
        const tierModifier = this.getTierWeightModifier(tier, mapping);
        const weight = Math.abs(mapping.correlation) * mapping.confidence * tierModifier;

        // Apply correlation weighting
        const weightedScore = normalizedResponse * mapping.correlation * weight;
        
        weightedScores.push(weightedScore);
        totalWeight += weight;
      }
    }

    if (totalWeight > 0 && weightedScores.length > 0) {
      const facetScore = weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight;
      const confidence = Math.min(1.0, totalWeight / 10.0); // Max confidence at weight 10

      return {
        score: this.clampScore(facetScore),
        confidence: confidence,
        n_items: weightedScores.length,
        raw_scores: weightedScores,
        percentile: this.calculatePercentile(facetScore, facetCode),
        t_score: this.calculateTScore(facetScore, facetCode)
      };
    } else {
      return {
        score: 0.0,
        confidence: 0.0,
        n_items: 0,
        raw_scores: []
      };
    }
  }

  /**
   * Normalize response value to standard -3 to +3 scale
   */
  private normalizeResponse(
    responseValue: number,
    promptType: string,
    correlation: number
  ): number {
    let normalized: number;

    switch (promptType.toLowerCase()) {
      case 'likert':
        // Assume 6-point Likert scale (1-6)
        normalized = (responseValue - 3.5) / 2.5;
        break;
      
      case 'true/false':
        // True/False: 1 = false, 2 = true
        normalized = responseValue === 2 ? 1.0 : -1.0;
        break;
      
      case 'multiple choice':
        // MCQ: values should already be normalized in the response processing
        normalized = Math.max(-3.0, Math.min(3.0, responseValue));
        break;
      
      default:
        // Default normalization for other types
        normalized = Math.max(-3.0, Math.min(3.0, responseValue));
    }

    // Apply reverse coding if correlation is negative
    if (correlation < 0) {
      normalized = -normalized;
    }

    return normalized;
  }

  /**
   * Get tier-specific weight modifier
   */
  private getTierWeightModifier(tier: string, mapping: NodeCorrelation): number {
    // These would come from the database mapping table in a full implementation
    const modifiers = {
      individual: 1.0,
      executive: 1.0,
      organizational: 1.0
    };

    return modifiers[tier as keyof typeof modifiers] || 1.0;
  }

  /**
   * Group mappings by facet code
   */
  private groupMappingsByFacet(mappings: NodeCorrelation[]): Record<string, NodeCorrelation[]> {
    const grouped: Record<string, NodeCorrelation[]> = {};

    for (const mapping of mappings) {
      if (!grouped[mapping.facet_code]) {
        grouped[mapping.facet_code] = [];
      }
      grouped[mapping.facet_code].push(mapping);
    }

    return grouped;
  }

  /**
   * Clamp score to valid range
   */
  private clampScore(score: number): number {
    return Math.max(-3.0, Math.min(3.0, score));
  }

  /**
   * Calculate percentile score (simplified - would use actual norms in production)
   */
  private calculatePercentile(score: number, facetCode: string): number {
    // Simplified percentile calculation
    // In production, this would use actual normative data
    const normalizedScore = (score + 3.0) / 6.0; // Convert -3 to +3 range to 0 to 1
    return Math.round(normalizedScore * 100);
  }

  /**
   * Calculate T-score (mean=50, std=10)
   */
  private calculateTScore(score: number, facetCode: string): number {
    // Simplified T-score calculation
    // In production, this would use actual normative data
    const zScore = score / 1.5; // Assume standard deviation of 1.5
    return Math.round(50 + (zScore * 10));
  }

  /**
   * Calculate coverage and confidence metrics
   */
  calculateCoverageMetrics(facetScores: Record<string, FacetScore>): CoverageMetrics {
    const totalFacets = FacetScoringEngine.FACET_CODES.length;
    const coveredFacets = Object.values(facetScores).filter(score => 
      score.confidence > 0.3 && score.n_items > 0
    ).length;

    const coveragePercentage = (coveredFacets / totalFacets) * 100;

    const confidenceScores: Record<string, number> = {};
    const missingFacets: string[] = [];
    const weakCoverageFacets: string[] = [];

    for (const [facetCode, score] of Object.entries(facetScores)) {
      confidenceScores[facetCode] = score.confidence;

      if (score.confidence === 0.0 || score.n_items === 0) {
        missingFacets.push(facetCode);
      } else if (score.confidence < 0.5) {
        weakCoverageFacets.push(facetCode);
      }
    }

    return {
      coverage_percentage: coveragePercentage,
      confidence_scores: confidenceScores,
      missing_facets: missingFacets,
      weak_coverage_facets: weakCoverageFacets
    };
  }

  /**
   * Validate facet scores for quality and consistency
   */
  async validateFacetScores(
    facetScores: Record<string, FacetScore>,
    responses: AssessmentResponse[]
  ): Promise<any> {
    const validation = {
      overall_quality: 'good',
      issues: [] as string[],
      recommendations: [] as string[],
      missing_facet_coverage: {
        O2_Aesthetics: facetScores['O2_Aesthetics']?.confidence || 0,
        O6_Values: facetScores['O6_Values']?.confidence || 0,
        E2_Gregariousness: facetScores['E2_Gregariousness']?.confidence || 0,
        E5_Excitement_Seeking: facetScores['E5_Excitement_Seeking']?.confidence || 0,
        A3_Altruism: facetScores['A3_Altruism']?.confidence || 0,
        A4_Compliance: facetScores['A4_Compliance']?.confidence || 0,
        A6_Tender_Mindedness: facetScores['A6_Tender_Mindedness']?.confidence || 0,
        N3_Depression: facetScores['N3_Depression']?.confidence || 0
      }
    };

    // Check for missing critical facets
    const missingCriticalFacets = Object.entries(validation.missing_facet_coverage)
      .filter(([_, confidence]) => confidence < 0.3)
      .map(([facet, _]) => facet);

    if (missingCriticalFacets.length > 0) {
      validation.issues.push(`Missing coverage for critical facets: ${missingCriticalFacets.join(', ')}`);
      validation.recommendations.push('Consider adding prompts specifically targeting missing facets');
    }

    // Check overall coverage
    const coverageMetrics = this.calculateCoverageMetrics(facetScores);
    if (coverageMetrics.coverage_percentage < 70) {
      validation.overall_quality = 'poor';
      validation.issues.push(`Low overall coverage: ${coverageMetrics.coverage_percentage.toFixed(1)}%`);
    } else if (coverageMetrics.coverage_percentage < 85) {
      validation.overall_quality = 'fair';
    }

    // Check for response quality issues
    const avgResponseTime = responses.reduce((sum, r) => sum + r.response_time_ms, 0) / responses.length;
    if (avgResponseTime < 2000) {
      validation.issues.push('Responses may be too quick - possible rushed assessment');
    }

    return validation;
  }

  /**
   * Calculate correlations between facets and nodes
   */
  async calculateNodeCorrelations(
    responses: AssessmentResponse[],
    mappings: NodeCorrelation[],
    facetScores: Record<string, FacetScore>
  ): Promise<Record<string, any>> {
    const nodeCorrelations: Record<string, any> = {};

    // Group responses by node
    const responsesByNode = responses.reduce((acc, response) => {
      const nodeId = response.prompts.node_id;
      if (!acc[nodeId]) {
        acc[nodeId] = [];
      }
      acc[nodeId].push(response);
      return acc;
    }, {} as Record<string, AssessmentResponse[]>);

    // Calculate correlations for each node
    for (const [nodeId, nodeResponses] of Object.entries(responsesByNode)) {
      const nodeMappings = mappings.filter(m => m.node_id === nodeId);
      
      nodeCorrelations[nodeId] = {
        response_count: nodeResponses.length,
        facet_contributions: {},
        total_contribution_weight: 0
      };

      for (const mapping of nodeMappings) {
        const facetScore = facetScores[mapping.facet_code];
        if (facetScore && facetScore.confidence > 0) {
          nodeCorrelations[nodeId].facet_contributions[mapping.facet_code] = {
            correlation: mapping.correlation,
            confidence: mapping.confidence,
            contribution_weight: Math.abs(mapping.correlation) * mapping.confidence
          };
          
          nodeCorrelations[nodeId].total_contribution_weight += 
            Math.abs(mapping.correlation) * mapping.confidence;
        }
      }
    }

    return nodeCorrelations;
  }
}