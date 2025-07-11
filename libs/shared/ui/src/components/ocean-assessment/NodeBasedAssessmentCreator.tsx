import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { OceanTraits, OceanFacets, AssessmentNode } from './types';

interface NodeBasedAssessmentCreatorProps {
  onSave: (assessment: AssessmentConfig) => void;
  initialConfig?: AssessmentConfig;
}

interface AssessmentConfig {
  title: string;
  description: string;
  type: 'self' | 'peer' | 'manager' | '360' | 'executive' | 'custom';
  selectedNodes: string[];
  oceanCoverage: OceanCoverage;
  timeLimit?: number;
  templates: AssessmentTemplate[];
}

interface OceanCoverage {
  traits: Record<OceanTraits, number>;
  facets: Record<string, number>;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  nodes: string[];
  coverage: OceanCoverage;
}

const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: 'executive-leadership',
    name: 'Executive Leadership Profile',
    description: 'Comprehensive assessment for C-suite and senior leadership roles',
    nodes: ['leadership.vision', 'leadership.execution', 'emotional-regulation.self', 'cognitive.strategic'],
    coverage: {
      traits: {
        openness: 0.9,
        conscientiousness: 0.95,
        extraversion: 0.85,
        agreeableness: 0.7,
        neuroticism: 0.8
      },
      facets: {}
    }
  },
  {
    id: 'team-dynamics',
    name: 'Team Dynamics Assessment',
    description: 'Evaluate team collaboration and interpersonal effectiveness',
    nodes: ['social.collaboration', 'emotional-regulation.others', 'communication.verbal', 'agreeableness.trust'],
    coverage: {
      traits: {
        openness: 0.6,
        conscientiousness: 0.7,
        extraversion: 0.9,
        agreeableness: 0.95,
        neuroticism: 0.5
      },
      facets: {}
    }
  },
  {
    id: 'innovation-potential',
    name: 'Innovation & Creativity Profile',
    description: 'Assess creative thinking and innovation capabilities',
    nodes: ['cognitive.creative', 'openness.ideas', 'risk-taking.calculated', 'problem-solving.novel'],
    coverage: {
      traits: {
        openness: 0.95,
        conscientiousness: 0.6,
        extraversion: 0.7,
        agreeableness: 0.5,
        neuroticism: 0.4
      },
      facets: {}
    }
  }
];

const NODE_HIERARCHY = {
  'leadership': {
    label: 'Leadership',
    icon: '👔',
    children: {
      'leadership.vision': { label: 'Vision & Strategy', oceanTraits: ['openness', 'extraversion'] },
      'leadership.execution': { label: 'Execution & Delivery', oceanTraits: ['conscientiousness'] },
      'leadership.influence': { label: 'Influence & Persuasion', oceanTraits: ['extraversion', 'agreeableness'] },
      'leadership.resilience': { label: 'Resilience & Adaptability', oceanTraits: ['neuroticism'] }
    }
  },
  'cognitive': {
    label: 'Cognitive Abilities',
    icon: '🧠',
    children: {
      'cognitive.analytical': { label: 'Analytical Thinking', oceanTraits: ['openness', 'conscientiousness'] },
      'cognitive.strategic': { label: 'Strategic Planning', oceanTraits: ['openness', 'conscientiousness'] },
      'cognitive.creative': { label: 'Creative Problem Solving', oceanTraits: ['openness'] },
      'cognitive.learning': { label: 'Learning Agility', oceanTraits: ['openness'] }
    }
  },
  'emotional-regulation': {
    label: 'Emotional Regulation',
    icon: '❤️',
    children: {
      'emotional-regulation.self': { label: 'Self Regulation', oceanTraits: ['neuroticism'] },
      'emotional-regulation.others': { label: 'Empathy & Social Awareness', oceanTraits: ['agreeableness'] },
      'emotional-regulation.stress': { label: 'Stress Management', oceanTraits: ['neuroticism'] },
      'emotional-regulation.impulse': { label: 'Impulse Control', oceanTraits: ['conscientiousness', 'neuroticism'] }
    }
  },
  'social': {
    label: 'Social Skills',
    icon: '🤝',
    children: {
      'social.collaboration': { label: 'Collaboration', oceanTraits: ['agreeableness', 'extraversion'] },
      'social.networking': { label: 'Networking', oceanTraits: ['extraversion'] },
      'social.conflict': { label: 'Conflict Resolution', oceanTraits: ['agreeableness', 'neuroticism'] },
      'social.cultural': { label: 'Cultural Intelligence', oceanTraits: ['openness', 'agreeableness'] }
    }
  },
  'dark-side': {
    label: 'Dark Side Traits',
    icon: '⚠️',
    children: {
      'dark-side.narcissism': { label: 'Narcissistic Tendencies', oceanTraits: ['agreeableness', 'neuroticism'] },
      'dark-side.machiavellianism': { label: 'Manipulative Behavior', oceanTraits: ['agreeableness'] },
      'dark-side.perfectionism': { label: 'Destructive Perfectionism', oceanTraits: ['conscientiousness', 'neuroticism'] },
      'dark-side.micromanagement': { label: 'Micromanagement', oceanTraits: ['conscientiousness', 'neuroticism'] }
    }
  }
};

export const NodeBasedAssessmentCreator: React.FC<NodeBasedAssessmentCreatorProps> = ({
  onSave,
  initialConfig
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['leadership', 'cognitive']));
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(
    new Set(initialConfig?.selectedNodes || [])
  );
  const [assessmentType, setAssessmentType] = useState(initialConfig?.type || 'self');
  const [title, setTitle] = useState(initialConfig?.title || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    const template = ASSESSMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedNodes(new Set(template.nodes));
      setSelectedTemplate(templateId);
    }
  }, []);

  const oceanCoverage = useMemo(() => {
    const coverage: OceanCoverage = {
      traits: {
        openness: 0,
        conscientiousness: 0,
        extraversion: 0,
        agreeableness: 0,
        neuroticism: 0
      },
      facets: {}
    };

    selectedNodes.forEach(nodeId => {
      Object.values(NODE_HIERARCHY).forEach(category => {
        const node = category.children[nodeId];
        if (node) {
          node.oceanTraits.forEach(trait => {
            coverage.traits[trait as OceanTraits] += 1 / node.oceanTraits.length;
          });
        }
      });
    });

    // Normalize coverage scores
    const maxCoverage = Math.max(...Object.values(coverage.traits));
    if (maxCoverage > 0) {
      Object.keys(coverage.traits).forEach(trait => {
        coverage.traits[trait as OceanTraits] = coverage.traits[trait as OceanTraits] / maxCoverage;
      });
    }

    return coverage;
  }, [selectedNodes]);

  const handleSave = () => {
    const config: AssessmentConfig = {
      title,
      description,
      type: assessmentType,
      selectedNodes: Array.from(selectedNodes),
      oceanCoverage,
      templates: selectedTemplate ? ASSESSMENT_TEMPLATES.filter(t => t.id === selectedTemplate) : []
    };
    onSave(config);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create OCEAN Assessment</h2>
          <p className="mt-2 text-gray-600">Design your assessment by selecting competency nodes</p>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Assessment Details */}
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Assessment Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., Executive Leadership Assessment"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Brief description of the assessment purpose"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Assessment Type
              </label>
              <select
                id="type"
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as any)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="self">Self Assessment</option>
                <option value="peer">Peer Review</option>
                <option value="manager">Manager Evaluation</option>
                <option value="360">360-Degree Feedback</option>
                <option value="executive">Executive Assessment</option>
                <option value="custom">Custom Assessment</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Templates</h3>
              <div className="space-y-2">
                {ASSESSMENT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Panel - Node Selector */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Competency Nodes</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {Object.entries(NODE_HIERARCHY).map(([categoryId, category]) => (
                <div key={categoryId} className="border rounded-lg">
                  <button
                    onClick={() => toggleNode(categoryId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-medium">{category.label}</span>
                    </div>
                    {expandedNodes.has(categoryId) ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedNodes.has(categoryId) && (
                    <div className="px-3 pb-3 space-y-1">
                      {Object.entries(category.children).map(([nodeId, node]) => (
                        <label
                          key={nodeId}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNodes.has(nodeId)}
                            onChange={() => toggleSelection(nodeId)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{node.label}</div>
                            <div className="text-xs text-gray-500">
                              Measures: {node.oceanTraits.join(', ')}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - OCEAN Coverage Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">OCEAN Coverage Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-4">
                {Object.entries(oceanCoverage.traits).map(([trait, coverage]) => (
                  <div key={trait}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">{trait}</span>
                      <span className="text-sm text-gray-600">{Math.round(coverage * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          trait === 'openness' ? 'bg-purple-500' :
                          trait === 'conscientiousness' ? 'bg-blue-500' :
                          trait === 'extraversion' ? 'bg-yellow-500' :
                          trait === 'agreeableness' ? 'bg-green-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${coverage * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Assessment Statistics</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Selected Nodes:</dt>
                    <dd className="font-medium">{selectedNodes.size}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Estimated Time:</dt>
                    <dd className="font-medium">{selectedNodes.size * 3} - {selectedNodes.size * 5} minutes</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Question Count:</dt>
                    <dd className="font-medium">~{selectedNodes.size * 15} questions</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSave}
                  disabled={!title || selectedNodes.size === 0}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Create Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};