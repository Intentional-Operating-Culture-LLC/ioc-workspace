export interface DualAIMetrics {
  assessmentId: string;
  timestamp: Date;
  a1Metrics: A1Metrics;
  b1Metrics: B1Metrics;
  combinedMetrics: CombinedMetrics;
  disagreements: DisagreementAnalysis[];
  performance: PerformanceIndicators;
}

export interface A1Metrics {
  responseTime: number;
  confidence: number;
  tokensUsed: number;
  modelVersion: string;
  costEstimate: number;
}

export interface B1Metrics {
  validationTime: number;
  agreementScore: number;
  flaggedIssues: number;
  modelVersion: string;
  costEstimate: number;
}

export interface CombinedMetrics {
  totalProcessingTime: number;
  disagreementRate: number;
  averageConfidence: number;
  qualityScore: number;
  totalCost: number;
}

export interface DisagreementAnalysis {
  facet: string;
  a1Score: number;
  b1Score: number;
  difference: number;
  severity: 'low' | 'medium' | 'high';
}

export interface PerformanceIndicators {
  withinSLA: boolean;
  highConfidence: boolean;
  costEfficient: boolean;
}

export interface AIValidationResult {
  agreementScore: number;
  disagreementRate: number;
  confidence: number;
  issues: string[];
  disagreements: DisagreementAnalysis[];
  recommendations: string[];
}