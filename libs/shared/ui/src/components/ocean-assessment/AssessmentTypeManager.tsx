import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface AssessmentTypeManagerProps {
  onSave: (types: AssessmentType[]) => void;
  initialTypes?: AssessmentType[];
}

interface AssessmentType {
  id: string;
  name: string;
  code: string;
  description: string;
  category: 'leadership' | 'team' | 'individual' | 'specialized';
  targetAudience: string[];
  estimatedDuration: number;
  questionCount: number;
  oceanWeights: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  modules: AssessmentModule[];
  scoring: ScoringConfig;
  isActive: boolean;
}

interface AssessmentModule {
  id: string;
  name: string;
  type: 'ocean' | 'emotional' | 'executive' | 'darkside' | 'custom';
  weight: number;
  required: boolean;
}

interface ScoringConfig {
  normGroup: 'general' | 'executive' | 'technical' | 'sales' | 'custom';
  benchmarks: {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
  };
  useStanines: boolean;
  usePercentiles: boolean;
  customNorms?: any;
}

const DEFAULT_ASSESSMENT_TYPES: AssessmentType[] = [
  {
    id: '1',
    name: 'Executive Leadership Assessment',
    code: 'EXEC-LEAD',
    description: 'Comprehensive assessment for C-suite and senior leadership positions',
    category: 'leadership',
    targetAudience: ['C-Suite', 'Senior Management', 'High Potentials'],
    estimatedDuration: 45,
    questionCount: 180,
    oceanWeights: {
      openness: 1.2,
      conscientiousness: 1.3,
      extraversion: 1.1,
      agreeableness: 0.9,
      neuroticism: 1.0
    },
    modules: [
      { id: '1', name: 'OCEAN Core', type: 'ocean', weight: 0.3, required: true },
      { id: '2', name: 'Executive Competencies', type: 'executive', weight: 0.3, required: true },
      { id: '3', name: 'Emotional Regulation', type: 'emotional', weight: 0.2, required: true },
      { id: '4', name: 'Dark Side Risks', type: 'darkside', weight: 0.2, required: false }
    ],
    scoring: {
      normGroup: 'executive',
      benchmarks: { excellent: 85, good: 70, average: 50, belowAverage: 30 },
      useStanines: true,
      usePercentiles: true
    },
    isActive: true
  },
  {
    id: '2',
    name: 'Team Effectiveness Assessment',
    code: 'TEAM-EFF',
    description: 'Evaluate team dynamics and collaboration potential',
    category: 'team',
    targetAudience: ['Team Members', 'Project Teams', 'Cross-functional Groups'],
    estimatedDuration: 25,
    questionCount: 90,
    oceanWeights: {
      openness: 1.0,
      conscientiousness: 1.1,
      extraversion: 1.2,
      agreeableness: 1.3,
      neuroticism: 0.9
    },
    modules: [
      { id: '1', name: 'OCEAN Core', type: 'ocean', weight: 0.4, required: true },
      { id: '2', name: 'Emotional Intelligence', type: 'emotional', weight: 0.3, required: true },
      { id: '3', name: 'Team Collaboration', type: 'custom', weight: 0.3, required: true }
    ],
    scoring: {
      normGroup: 'general',
      benchmarks: { excellent: 80, good: 65, average: 45, belowAverage: 25 },
      useStanines: true,
      usePercentiles: true
    },
    isActive: true
  }
];

export const AssessmentTypeManager: React.FC<AssessmentTypeManagerProps> = ({
  onSave,
  initialTypes = DEFAULT_ASSESSMENT_TYPES
}) => {
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>(initialTypes);
  const [editingType, setEditingType] = useState<AssessmentType | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    const newType: AssessmentType = {
      id: Date.now().toString(),
      name: '',
      code: '',
      description: '',
      category: 'individual',
      targetAudience: [],
      estimatedDuration: 30,
      questionCount: 100,
      oceanWeights: {
        openness: 1.0,
        conscientiousness: 1.0,
        extraversion: 1.0,
        agreeableness: 1.0,
        neuroticism: 1.0
      },
      modules: [
        { id: '1', name: 'OCEAN Core', type: 'ocean', weight: 1.0, required: true }
      ],
      scoring: {
        normGroup: 'general',
        benchmarks: { excellent: 80, good: 65, average: 45, belowAverage: 25 },
        useStanines: true,
        usePercentiles: true
      },
      isActive: true
    };
    setEditingType(newType);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (editingType) {
      if (isCreating) {
        setAssessmentTypes([...assessmentTypes, editingType]);
      } else {
        setAssessmentTypes(assessmentTypes.map(t => t.id === editingType.id ? editingType : t));
      }
      setEditingType(null);
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    setAssessmentTypes(assessmentTypes.filter(t => t.id !== id));
  };

  const handleDuplicate = (type: AssessmentType) => {
    const duplicate = {
      ...type,
      id: Date.now().toString(),
      name: `${type.name} (Copy)`,
      code: `${type.code}-COPY`
    };
    setAssessmentTypes([...assessmentTypes, duplicate]);
  };

  const toggleActive = (id: string) => {
    setAssessmentTypes(assessmentTypes.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assessment Type Configuration</h2>
              <p className="mt-2 text-gray-600">
                Manage assessment types, scoring, and normative data
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Type
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Assessment Types List */}
          <div className="space-y-4">
            {assessmentTypes.map((type) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-6 ${type.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        {type.code}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        type.category === 'leadership' ? 'bg-purple-100 text-purple-800' :
                        type.category === 'team' ? 'bg-green-100 text-green-800' :
                        type.category === 'specialized' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {type.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{type.description}</p>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Target Audience:</span>
                        <div className="mt-1">
                          {type.targetAudience.map((audience, idx) => (
                            <span key={idx} className="inline-block px-2 py-1 mr-1 mb-1 text-xs bg-gray-100 rounded">
                              {audience}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">{type.estimatedDuration} minutes</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Questions:</span>
                        <span className="ml-2 font-medium">{type.questionCount}</span>
                      </div>
                    </div>

                    {/* Modules */}
                    <div className="mt-4">
                      <span className="text-sm font-medium text-gray-700">Assessment Modules:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {type.modules.map((module) => (
                          <div
                            key={module.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                          >
                            {module.name}
                            <span className="ml-1 text-indigo-500">({(module.weight * 100).toFixed(0)}%)</span>
                            {module.required && (
                              <CheckCircleIcon className="h-3 w-3 ml-1 text-indigo-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* OCEAN Weights */}
                    <div className="mt-4">
                      <span className="text-sm font-medium text-gray-700">OCEAN Trait Weights:</span>
                      <div className="mt-2 grid grid-cols-5 gap-2">
                        {Object.entries(type.oceanWeights).map(([trait, weight]) => (
                          <div key={trait} className="text-center">
                            <div className="text-xs text-gray-500 capitalize">{trait.slice(0, 3)}</div>
                            <div className={`text-sm font-medium ${
                              weight > 1 ? 'text-green-600' : weight < 1 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {weight.toFixed(1)}x
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleActive(type.id)}
                      className={`p-2 rounded-lg ${
                        type.isActive 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={type.isActive ? 'Active' : 'Inactive'}
                    >
                      {type.isActive ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <XCircleIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingType(type)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(type)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Duplicate"
                    >
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Scoring Configuration */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <CogIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Norm Group:</span>
                      <span className="font-medium capitalize">{type.scoring.normGroup}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Scoring:</span>
                      {type.scoring.useStanines && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Stanines</span>
                      )}
                      {type.scoring.usePercentiles && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Percentiles</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Save Changes */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => onSave(assessmentTypes)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal - Simplified for brevity */}
      {editingType && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isCreating ? 'Create New Assessment Type' : 'Edit Assessment Type'}
            </h3>
            {/* Form fields would go here */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingType(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};