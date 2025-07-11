import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { DarkSideRisks } from './types';

interface DarkSideRiskIndicatorsProps {
  risks: DarkSideRisks;
}

const RISK_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
};

const RISK_DESCRIPTIONS = {
  narcissism: {
    title: 'Narcissistic Tendencies',
    description: 'Excessive self-focus, need for admiration, and lack of empathy',
    impact: 'Can damage team morale, create toxic culture, and impair decision-making',
    icon: '👑',
    mitigations: [
      'Practice active listening and seek feedback regularly',
      'Recognize and celebrate team achievements',
      'Develop empathy through perspective-taking exercises',
      'Work with an executive coach on self-awareness'
    ]
  },
  machiavellianism: {
    title: 'Manipulative Behavior',
    description: 'Strategic manipulation, cynical worldview, and moral flexibility',
    impact: 'Erodes trust, creates political environment, and damages relationships',
    icon: '🎭',
    mitigations: [
      'Build transparency into decision-making processes',
      'Focus on win-win outcomes in negotiations',
      'Establish clear ethical guidelines and stick to them',
      'Cultivate genuine relationships without ulterior motives'
    ]
  },
  psychopathy: {
    title: 'Callous-Unemotional Traits',
    description: 'Lack of remorse, shallow emotions, and impulsive behavior',
    impact: 'Creates fear-based culture, high turnover, and ethical violations',
    icon: '🧊',
    mitigations: [
      'Develop emotional intelligence through training',
      'Implement structured decision-making processes',
      'Create accountability mechanisms for actions',
      'Practice mindfulness to increase emotional awareness'
    ]
  },
  perfectionism: {
    title: 'Destructive Perfectionism',
    description: 'Unrealistic standards, criticism of others, and inability to delegate',
    impact: 'Causes burnout, stifles innovation, and creates bottlenecks',
    icon: '📐',
    mitigations: [
      'Set realistic goals and celebrate progress',
      'Learn to delegate and trust team members',
      'Focus on "good enough" for non-critical tasks',
      'Practice self-compassion and model it for others'
    ]
  },
  micromanagement: {
    title: 'Excessive Control',
    description: 'Over-involvement in details, lack of trust, and inability to delegate',
    impact: 'Demotivates teams, limits growth, and creates dependency',
    icon: '🔍',
    mitigations: [
      'Define clear outcomes and let teams determine approach',
      'Schedule regular check-ins instead of constant oversight',
      'Focus on strategic priorities rather than tactical details',
      'Build trust through empowerment and accountability'
    ]
  }
};

export const DarkSideRiskIndicators: React.FC<DarkSideRiskIndicatorsProps> = ({ risks }) => {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [showMitigations, setShowMitigations] = useState(false);

  const toggleRisk = (riskType: string) => {
    setExpandedRisk(expandedRisk === riskType ? null : riskType);
  };

  const overallRiskLevel = (() => {
    const highRisks = Object.values(risks).filter(r => r.risk === 'high').length;
    const moderateRisks = Object.values(risks).filter(r => r.risk === 'moderate').length;
    
    if (highRisks >= 2) return 'high';
    if (highRisks >= 1 || moderateRisks >= 3) return 'moderate';
    return 'low';
  })();

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leadership Risk Assessment</h2>
            <p className="mt-2 text-gray-600">
              Potential derailers that may emerge under stress or in positions of power
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${RISK_COLORS[overallRiskLevel].bg} ${RISK_COLORS[overallRiskLevel].text}`}>
            <div className="flex items-center space-x-2">
              <ShieldExclamationIcon className="h-5 w-5" />
              <span className="font-semibold capitalize">
                {overallRiskLevel} Overall Risk
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Understanding Dark Side Traits</p>
              <p>These traits often emerge as overused strengths or coping mechanisms under stress. 
              Awareness is the first step toward managing these tendencies effectively.</p>
            </div>
          </div>
        </div>

        {/* Risk Cards */}
        <div className="space-y-4">
          {Object.entries(risks).map(([riskType, riskData]) => {
            const description = RISK_DESCRIPTIONS[riskType as keyof typeof RISK_DESCRIPTIONS];
            const colors = RISK_COLORS[riskData.risk];
            const isExpanded = expandedRisk === riskType;

            return (
              <motion.div
                key={riskType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 rounded-lg overflow-hidden ${colors.border}`}
              >
                <button
                  onClick={() => toggleRisk(riskType)}
                  className={`w-full p-4 ${colors.bg} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{description.icon}</span>
                      <div className="text-left">
                        <h3 className={`font-semibold ${colors.text}`}>
                          {description.title}
                        </h3>
                        <p className="text-sm text-gray-700 mt-1">
                          {description.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${colors.text}`}>
                          {riskData.score}%
                        </div>
                        <div className={`text-sm ${colors.text} capitalize`}>
                          {riskData.risk} Risk
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white border-t">
                        {/* Risk Indicators */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Warning Signs Detected:</h4>
                          <div className="space-y-2">
                            {riskData.indicators.map((indicator, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <ExclamationTriangleIcon className={`h-4 w-4 mt-0.5 ${colors.text}`} />
                                <span className="text-sm text-gray-700">{indicator}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Impact */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-1">Potential Impact:</h4>
                          <p className="text-sm text-gray-700">{description.impact}</p>
                        </div>

                        {/* Mitigation Strategies */}
                        <div>
                          <button
                            onClick={() => setShowMitigations(!showMitigations)}
                            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                          >
                            <span>Mitigation Strategies</span>
                            <ChevronDownIcon className={`h-4 w-4 transform transition-transform ${showMitigations ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {showMitigations && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 space-y-2"
                              >
                                {description.mitigations.map((mitigation, index) => (
                                  <div key={index} className="flex items-start space-x-2">
                                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5" />
                                    <span className="text-sm text-gray-700">{mitigation}</span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Risk Summary and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Profile Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">High Risk Traits:</span>
              <span className="font-semibold text-red-600">
                {Object.values(risks).filter(r => r.risk === 'high').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Moderate Risk Traits:</span>
              <span className="font-semibold text-yellow-600">
                {Object.values(risks).filter(r => r.risk === 'moderate').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Low Risk Traits:</span>
              <span className="font-semibold text-green-600">
                {Object.values(risks).filter(r => r.risk === 'low').length}
              </span>
            </div>
            
            <div className="pt-3 mt-3 border-t">
              <div className="flex items-center space-x-2">
                {overallRiskLevel === 'high' && (
                  <>
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-sm text-gray-700">
                      Immediate intervention recommended
                    </span>
                  </>
                )}
                {overallRiskLevel === 'moderate' && (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-gray-700">
                      Proactive development advised
                    </span>
                  </>
                )}
                {overallRiskLevel === 'low' && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Continue self-awareness practices
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
          <div className="space-y-3 text-sm text-gray-700">
            {overallRiskLevel === 'high' && (
              <>
                <p>• Engage an executive coach immediately</p>
                <p>• Implement 360-degree feedback process</p>
                <p>• Create accountability partnership</p>
                <p>• Consider leadership assessment program</p>
              </>
            )}
            {overallRiskLevel === 'moderate' && (
              <>
                <p>• Schedule regular feedback sessions</p>
                <p>• Join peer coaching group</p>
                <p>• Practice stress management techniques</p>
                <p>• Read leadership development resources</p>
              </>
            )}
            {overallRiskLevel === 'low' && (
              <>
                <p>• Maintain self-reflection practices</p>
                <p>• Continue seeking feedback</p>
                <p>• Share learnings with others</p>
                <p>• Stay aware of stress triggers</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};