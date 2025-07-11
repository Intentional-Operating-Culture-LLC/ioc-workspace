export interface AssessmentData {
  userId: string;
  email: string;
  assessmentId: string;
  assessmentType: string;
  version: string;
  timestamp: string;
  completionTime: number;
  scores: any;
  responses: AssessmentResponse[];
  demographics?: Demographics;
  metadata?: AssessmentMetadata;
}

export interface AssessmentResponse {
  questionId: string;
  answer: any;
  responseTime?: number;
  confidence?: number;
}

export interface Demographics {
  age?: number;
  gender?: string;
  country?: string;
  industry?: string;
  role?: string;
  yearsExperience?: number;
}

export interface AssessmentMetadata {
  userAgent?: string;
  platform?: string;
  appVersion?: string;
  sessionId?: string;
}

export interface AnonymizedAssessment {
  anonymousUserId: string;
  sessionId: string;
  assessmentId: string;
  timestamp: string;
  scores: any;
  responses: AnonymizedResponse[];
  demographics?: AnonymizedDemographics;
  metadata?: AnonymizedMetadata;
}

export interface AnonymizedResponse {
  questionId: string;
  answer: any;
  responseTime?: number;
  confidence?: number;
}

export interface AnonymizedDemographics {
  ageRange?: string;
  industry?: string;
  role?: string;
  experience?: string;
  region?: string;
}

export interface AnonymizedMetadata {
  assessmentType: string;
  version: string;
  completionTime: number;
  device?: string;
  platform?: string;
}

export interface OCEANScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  consistency: number;
  completeness: number;
  facets: FacetScores;
  darkSideIndicators?: Record<string, number>;
}

export interface FacetScores {
  [facet: string]: {
    score: number;
    responses: number;
    standardDeviation: number;
  };
}