export interface BaseEvent {
  eventType: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  attributes?: Record<string, any>;
}

export interface AssessmentEvent extends BaseEvent {
  eventType: 'assessment.started' | 'assessment.completed' | 'assessment.abandoned';
  score?: number;
  duration?: number;
}

export interface UserEngagementEvent extends BaseEvent {
  eventType: string; // user.registered, user.upgraded, etc.
  action?: string;
  revenue?: number;
}

export interface SystemEvent extends BaseEvent {
  eventType: 'system.error' | 'system.warning' | 'system.info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  errorCode?: string;
  errorMessage?: string;
}