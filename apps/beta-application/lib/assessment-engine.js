/**
 * IOC Assessment Engine
 * Provides data and logic for Individual, Executive, and Organizational assessments
 */

export const assessmentTypes = {
  individual: {
    id: 'individual',
    name: 'Individual Assessment',
    description: 'Comprehensive assessment for individual contributors focusing on sustainable performance and potential',
    estimatedTime: '45-60 minutes',
    questionCount: 75,
    icon: '👤',
    color: '#3B82F6', // Blue
    prerequisites: [
      'Complete your profile information',
      'Ensure you have 45-60 minutes uninterrupted',
      'Review your recent work accomplishments'
    ],
    pillars: ['sustainable', 'performance', 'potential'],
    domains: ['self-awareness', 'adaptability', 'collaboration', 'innovation', 'execution']
  },
  executive: {
    id: 'executive',
    name: 'Executive Assessment',
    description: 'Leadership-focused assessment for executives and senior managers',
    estimatedTime: '60-90 minutes',
    questionCount: 90,
    icon: '👔',
    color: '#8B5CF6', // Purple
    prerequisites: [
      'Have your organizational metrics ready',
      'Review your leadership philosophy',
      'Ensure 60-90 minutes of focused time',
      'Complete Individual Assessment first (recommended)'
    ],
    pillars: ['sustainable', 'performance', 'potential'],
    domains: ['strategic-thinking', 'decision-making', 'team-building', 'influence', 'vision']
  },
  organizational: {
    id: 'organizational',
    name: 'Organizational Assessment',
    description: 'Holistic assessment of organizational health, culture, and capability',
    estimatedTime: '90-120 minutes',
    questionCount: 120,
    icon: '🏢',
    color: '#10B981', // Green
    prerequisites: [
      'Gather organizational data and metrics',
      'Have access to HR and performance data',
      'Coordinate with key stakeholders',
      'Ensure 90-120 minutes availability',
      'Executive sponsorship required'
    ],
    pillars: ['sustainable', 'performance', 'potential'],
    domains: ['culture', 'processes', 'innovation', 'talent', 'strategy']
  }
};

export const questionTypes = {
  LIKERT: 'likert',
  MULTIPLE_CHOICE: 'multiple_choice',
  RANKING: 'ranking',
  SCALE: 'scale',
  TEXT: 'text',
  SCENARIO: 'scenario'
};

// Sample questions for each assessment type
export const sampleQuestions = {
  individual: [
    {
      id: 'ind_001',
      type: questionTypes.LIKERT,
      pillar: 'sustainable',
      domain: 'self-awareness',
      question: 'I regularly reflect on my strengths and areas for improvement',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ]
    },
    {
      id: 'ind_002',
      type: questionTypes.SCALE,
      pillar: 'performance',
      domain: 'execution',
      question: 'Rate your ability to consistently meet or exceed performance targets',
      min: 1,
      max: 10,
      minLabel: 'Rarely meet targets',
      maxLabel: 'Consistently exceed targets'
    },
    {
      id: 'ind_003',
      type: questionTypes.SCENARIO,
      pillar: 'potential',
      domain: 'adaptability',
      question: 'You are assigned a project using technologies you\'ve never worked with before. How do you approach this?',
      options: [
        { value: 'a', label: 'Request reassignment to a project matching my current skills' },
        { value: 'b', label: 'Accept reluctantly and do the minimum required' },
        { value: 'c', label: 'View it as a learning opportunity and dive in enthusiastically' },
        { value: 'd', label: 'Seek mentorship while taking on the challenge' }
      ]
    }
  ],
  executive: [
    {
      id: 'exec_001',
      type: questionTypes.SCALE,
      pillar: 'sustainable',
      domain: 'strategic-thinking',
      question: 'How effectively do you balance short-term results with long-term sustainability?',
      min: 1,
      max: 10,
      minLabel: 'Focus mainly on short-term',
      maxLabel: 'Excel at balancing both'
    },
    {
      id: 'exec_002',
      type: questionTypes.RANKING,
      pillar: 'performance',
      domain: 'decision-making',
      question: 'Rank these decision-making factors by importance in your leadership approach:',
      items: [
        'Data and analytics',
        'Team consensus',
        'Strategic alignment',
        'Risk assessment',
        'Speed of execution'
      ]
    }
  ],
  organizational: [
    {
      id: 'org_001',
      type: questionTypes.LIKERT,
      pillar: 'sustainable',
      domain: 'culture',
      question: 'Our organization has a clearly defined and lived set of core values',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ]
    },
    {
      id: 'org_002',
      type: questionTypes.MULTIPLE_CHOICE,
      pillar: 'performance',
      domain: 'processes',
      question: 'Which best describes your organization\'s approach to process improvement?',
      options: [
        { value: 'a', label: 'Ad-hoc, reactive to problems' },
        { value: 'b', label: 'Some documented processes, occasional reviews' },
        { value: 'c', label: 'Systematic approach with regular optimization' },
        { value: 'd', label: 'Continuous improvement culture with data-driven decisions' }
      ]
    }
  ]
};

// Benchmark data for comparison
export const benchmarkData = {
  individual: {
    sustainable: { average: 3.8, top10: 4.6, top25: 4.2 },
    performance: { average: 3.9, top10: 4.7, top25: 4.3 },
    potential: { average: 3.7, top10: 4.5, top25: 4.1 }
  },
  executive: {
    sustainable: { average: 4.0, top10: 4.8, top25: 4.4 },
    performance: { average: 4.1, top10: 4.8, top25: 4.5 },
    potential: { average: 3.9, top10: 4.7, top25: 4.3 }
  },
  organizational: {
    sustainable: { average: 3.6, top10: 4.5, top25: 4.1 },
    performance: { average: 3.8, top10: 4.6, top25: 4.2 },
    potential: { average: 3.5, top10: 4.4, top25: 4.0 }
  }
};

// Recommendation engine
export const getRecommendations = (scores, assessmentType) => {
  const recommendations = [];
  
  Object.entries(scores).forEach(([pillar, score]) => {
    if (score < 3.5) {
      recommendations.push({
        pillar,
        priority: 'high',
        message: `Focus on improving ${pillar} capabilities`,
        actions: getImprovementActions(pillar, assessmentType)
      });
    } else if (score < 4.2) {
      recommendations.push({
        pillar,
        priority: 'medium',
        message: `Continue developing ${pillar} strengths`,
        actions: getDevelopmentActions(pillar, assessmentType)
      });
    } else {
      recommendations.push({
        pillar,
        priority: 'low',
        message: `Maintain excellence in ${pillar}`,
        actions: getMaintenanceActions(pillar, assessmentType)
      });
    }
  });
  
  return recommendations;
};

const getImprovementActions = (pillar, type) => {
  const actions = {
    sustainable: [
      'Establish regular self-care routines',
      'Set boundaries for work-life balance',
      'Develop stress management techniques'
    ],
    performance: [
      'Set clear, measurable goals',
      'Track progress with KPIs',
      'Seek feedback and coaching'
    ],
    potential: [
      'Identify growth opportunities',
      'Invest in skill development',
      'Build strategic relationships'
    ]
  };
  return actions[pillar] || [];
};

const getDevelopmentActions = (pillar, type) => {
  const actions = {
    sustainable: [
      'Optimize current practices',
      'Share knowledge with peers',
      'Mentor others in this area'
    ],
    performance: [
      'Stretch into new challenges',
      'Lead cross-functional initiatives',
      'Document best practices'
    ],
    potential: [
      'Take on leadership roles',
      'Explore adjacent skills',
      'Build influence network'
    ]
  };
  return actions[pillar] || [];
};

const getMaintenanceActions = (pillar, type) => {
  const actions = {
    sustainable: [
      'Continue current practices',
      'Be a role model for others',
      'Contribute to organizational standards'
    ],
    performance: [
      'Maintain high standards',
      'Share expertise widely',
      'Drive innovation in your area'
    ],
    potential: [
      'Mentor high-potentials',
      'Lead transformation initiatives',
      'Shape organizational strategy'
    ]
  };
  return actions[pillar] || [];
};

// Progress tracking utilities
export const calculateProgress = (answeredQuestions, totalQuestions) => {
  return Math.round((answeredQuestions / totalQuestions) * 100);
};

export const estimateTimeRemaining = (answeredQuestions, totalQuestions, averageTimePerQuestion = 45) => {
  const remainingQuestions = totalQuestions - answeredQuestions;
  const remainingSeconds = remainingQuestions * averageTimePerQuestion;
  const minutes = Math.ceil(remainingSeconds / 60);
  return minutes;
};

// Scoring utilities
export const calculatePillarScores = (responses, assessmentType) => {
  const pillarScores = {
    sustainable: [],
    performance: [],
    potential: []
  };
  
  responses.forEach(response => {
    if (response.pillar && response.score) {
      pillarScores[response.pillar].push(response.score);
    }
  });
  
  const averages = {};
  Object.entries(pillarScores).forEach(([pillar, scores]) => {
    if (scores.length > 0) {
      averages[pillar] = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else {
      averages[pillar] = 0;
    }
  });
  
  return averages;
};

// Mock API functions for assessment management
export const saveAssessmentProgress = async (assessmentId, progress) => {
  // In real implementation, this would save to a database
  if (typeof window !== 'undefined') {
    localStorage.setItem(`assessment_${assessmentId}`, JSON.stringify(progress));
  }
  return { success: true };
};

export const loadAssessmentProgress = async (assessmentId) => {
  // In real implementation, this would load from a database
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`assessment_${assessmentId}`);
    return saved ? JSON.parse(saved) : null;
  }
  return null;
};

export const generateAssessmentId = () => {
  return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};