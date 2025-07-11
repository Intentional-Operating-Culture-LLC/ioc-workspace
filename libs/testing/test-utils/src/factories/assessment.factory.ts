/**
 * Assessment factory for test data generation
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestQuestion {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'scale';
  options?: string[];
  required: boolean;
  order: number;
}

export interface TestAssessment {
  id: string;
  title: string;
  description: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  questions: TestQuestion[];
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
}

export interface TestAssessmentResponse {
  id: string;
  assessment_id: string;
  user_id: string;
  answers: Record<string, any>;
  score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

let assessmentCounter = 0;
let questionCounter = 0;

export function createTestQuestion(overrides?: Partial<TestQuestion>): TestQuestion {
  questionCounter++;
  
  return {
    id: uuidv4(),
    text: `Test question ${questionCounter}?`,
    type: 'single_choice',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    required: true,
    order: questionCounter,
    ...overrides,
  };
}

export function createTestAssessment(overrides?: Partial<TestAssessment>): TestAssessment {
  assessmentCounter++;
  const now = new Date().toISOString();
  
  return {
    id: uuidv4(),
    title: `Test Assessment ${assessmentCounter}`,
    description: `Description for test assessment ${assessmentCounter}`,
    type: 'skills',
    status: 'published',
    questions: Array.from({ length: 5 }, (_, i) => 
      createTestQuestion({ order: i + 1 })
    ),
    organization_id: uuidv4(),
    created_by: uuidv4(),
    created_at: now,
    updated_at: now,
    settings: {
      timeLimit: 3600, // 1 hour in seconds
      passingScore: 70,
      randomizeQuestions: false,
    },
    ...overrides,
  };
}

export function createTestAssessmentResponse(
  overrides?: Partial<TestAssessmentResponse>
): TestAssessmentResponse {
  const now = new Date().toISOString();
  
  return {
    id: uuidv4(),
    assessment_id: uuidv4(),
    user_id: uuidv4(),
    answers: {
      'q1': 'Option A',
      'q2': 'Option B',
      'q3': 'Option C',
    },
    score: 85,
    completed_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}