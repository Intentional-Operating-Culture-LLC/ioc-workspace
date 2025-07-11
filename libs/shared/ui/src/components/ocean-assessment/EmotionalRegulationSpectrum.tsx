import React from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  LightBulbIcon, 
  UsersIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  HandRaisedIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { EmotionalRegulationScore } from './types';

interface EmotionalRegulationSpectrumProps {
  regulation: EmotionalRegulationScore;
}

const REGULATION_DIMENSIONS = [
  {
    key: 'selfAwareness' as keyof EmotionalRegulationScore,
    label: 'Self Awareness',
    icon: LightBulbIcon,
    color: '#8b5cf6',
    description: 'Understanding your own emotions and their impact'
  },
  {
    key: 'selfManagement' as keyof EmotionalRegulationScore,
    label: 'Self Management',
    icon: HandRaisedIcon,
    color: '#3b82f6',
    description: 'Controlling impulses and managing emotions effectively'
  },
  {
    key: 'socialAwareness' as keyof EmotionalRegulationScore,
    label: 'Social Awareness',
    icon: UsersIcon,
    color: '#10b981',
    description: 'Reading others and understanding social dynamics'
  },
  {
    key: 'relationshipManagement' as keyof EmotionalRegulationScore,
    label: 'Relationship Management',
    icon: HeartIcon,
    color: '#f59e0b',
    description: 'Influencing and inspiring others positively'
  },
  {
    key: 'stressTolerance' as keyof EmotionalRegulationScore,
    label: 'Stress Tolerance',
    icon: ShieldCheckIcon,
    color: '#06b6d4',
    description: 'Maintaining composure under pressure'
  },
  {
    key: 'impulseControl' as keyof EmotionalRegulationScore,
    label: 'Impulse Control',
    icon: SparklesIcon,
    color: '#ec4899',
    description: 'Delaying gratification and thinking before acting'
  },
  {
    key: 'emotionalStability' as keyof EmotionalRegulationScore,
    label: 'Emotional Stability',
    icon: FaceSmileIcon,
    color: '#84cc16',
    description: 'Maintaining consistent emotional state'
  }
];

const getScoreLevel = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Exceptional', color: 'text-green-600' };
  if (score >= 60) return { label: 'Strong', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Developing', color: 'text-yellow-600' };
  return { label: 'Needs Development', color: 'text-red-600' };
};

export const EmotionalRegulationSpectrum: React.FC<EmotionalRegulationSpectrumProps> = ({
  regulation
}) => {
  const overallScore = Object.values(regulation).reduce((sum, score) => sum + score, 0) / Object.values(regulation).length;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Emotional Regulation Profile</h2>
            <p className="mt-2 text-gray-600">
              Your ability to understand and manage emotions in yourself and others
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600">
              {overallScore.toFixed(0)}
            </div>
            <div className="text-sm text-gray-500">Overall Score</div>
          </div>
        </div>

        {/* Spectrum Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {REGULATION_DIMENSIONS.map((dimension, index) => {
            const score = regulation[dimension.key];
            const level = getScoreLevel(score);
            const Icon = dimension.icon;

            return (
              <motion.div
                key={dimension.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-start space-x-4">
                  <div 
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: dimension.color + '20' }}
                  >
                    <Icon className="h-6 w-6" style={{ color: dimension.color }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{dimension.label}</h3>
                      <span className={`text-sm font-medium ${level.color}`}>
                        {level.label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{dimension.description}</p>
                    
                    {/* Score Bar */}
                    <div className="relative">
                      <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                          className="h-full relative"
                          style={{ backgroundColor: dimension.color }}
                        >
                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-sm font-bold">
                            {score}%
                          </span>
                        </motion.div>
                      </div>
                      
                      {/* Benchmark markers */}
                      <div className="absolute inset-0 flex items-center">
                        {[25, 50, 75].map((marker) => (
                          <div
                            key={marker}
                            className="absolute h-full border-l-2 border-gray-300 opacity-50"
                            style={{ left: `${marker}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Strengths</h3>
          <div className="space-y-3">
            {REGULATION_DIMENSIONS
              .filter(dim => regulation[dim.key] >= 70)
              .sort((a, b) => regulation[b.key] - regulation[a.key])
              .slice(0, 3)
              .map(dim => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" style={{ color: dim.color }} />
                    <div>
                      <div className="font-medium text-gray-900">{dim.label}</div>
                      <div className="text-sm text-gray-600">
                        You excel at {dim.description.toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Opportunities</h3>
          <div className="space-y-3">
            {REGULATION_DIMENSIONS
              .filter(dim => regulation[dim.key] < 50)
              .sort((a, b) => regulation[a.key] - regulation[b.key])
              .slice(0, 3)
              .map(dim => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{dim.label}</div>
                      <div className="text-sm text-gray-600">
                        Focus on improving {dim.description.toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Emotional Intelligence Quadrants */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">EQ Quadrants Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Self (Internal)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Awareness</span>
                <span className="font-medium">{regulation.selfAwareness}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Management</span>
                <span className="font-medium">{regulation.selfManagement}%</span>
              </div>
            </div>
          </div>
          
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Social (External)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Awareness</span>
                <span className="font-medium">{regulation.socialAwareness}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Management</span>
                <span className="font-medium">{regulation.relationshipManagement}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-800">
            <strong>Overall Balance:</strong> Your emotional regulation profile shows 
            {regulation.selfAwareness + regulation.selfManagement > regulation.socialAwareness + regulation.relationshipManagement
              ? ' stronger internal regulation abilities. Consider developing your social emotional skills for better interpersonal effectiveness.'
              : ' stronger social regulation abilities. Consider strengthening your self-regulation skills for better personal emotional management.'}
          </p>
        </div>
      </div>
    </div>
  );
};