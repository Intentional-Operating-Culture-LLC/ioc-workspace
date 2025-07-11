export interface Assessment {
  id: string;
  userId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  score?: number;
  results?: AssessmentResults;
  createdAt: Date;
  completedAt?: Date;
}

export enum AssessmentType {
  OCEAN = 'OCEAN',
  BIG_FIVE = 'BIG_FIVE',
  CUSTOM = 'CUSTOM',
}

export enum AssessmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export interface AssessmentResults {
  dimensions: Record<string, number>;
  insights: string[];
  recommendations: string[];
}
