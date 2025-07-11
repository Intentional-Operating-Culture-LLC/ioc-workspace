import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon, 
  HeartIcon, 
  BriefcaseIcon, 
  ExclamationTriangleIcon,
  LightBulbIcon,
  UsersIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { OceanPrompt, OceanTraits } from './types';

interface OceanPromptDisplayProps {
  prompt: OceanPrompt;
  onAnswer: (value: number) => void;
  currentAnswer?: number;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining?: number;
}

const TRAIT_COLORS: Record<OceanTraits, string> = {
  openness: '#8b5cf6',
  conscientiousness: '#3b82f6',
  extraversion: '#f59e0b',
  agreeableness: '#10b981',
  neuroticism: '#ef4444'
};

const TRAIT_ICONS: Record<OceanTraits, React.ComponentType<any>> = {
  openness: LightBulbIcon,
  conscientiousness: ChartBarIcon,
  extraversion: UsersIcon,
  agreeableness: HeartIcon,
  neuroticism: ShieldCheckIcon
};

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree', color: '#ef4444' },
  { value: 2, label: 'Disagree', color: '#f97316' },
  { value: 3, label: 'Neutral', color: '#6b7280' },
  { value: 4, label: 'Agree', color: '#3b82f6' },
  { value: 5, label: 'Strongly Agree', color: '#10b981' }
];

export const OceanPromptDisplay: React.FC<OceanPromptDisplayProps> = ({
  prompt,
  onAnswer,
  currentAnswer,
  questionNumber,
  totalQuestions,
  timeRemaining
}) => {
  const [selectedValue, setSelectedValue] = useState<number | undefined>(currentAnswer);
  const [showTraitIndicator, setShowTraitIndicator] = useState(true);

  useEffect(() => {
    setSelectedValue(currentAnswer);
  }, [currentAnswer]);

  const handleSelect = (value: number) => {
    setSelectedValue(value);
    onAnswer(value);
  };

  const TraitIcon = TRAIT_ICONS[prompt.trait];
  const traitColor = TRAIT_COLORS[prompt.trait];

  const formatTime = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Question {questionNumber} of {totalQuestions}
              </div>
              {timeRemaining !== undefined && (
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            
            {/* Trait Indicator */}
            <AnimatePresence>
              {showTraitIndicator && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2"
                >
                  <TraitIcon 
                    className="h-5 w-5" 
                    style={{ color: traitColor }}
                  />
                  <span 
                    className="text-sm font-medium capitalize"
                    style={{ color: traitColor }}
                  >
                    {prompt.trait}
                  </span>
                  {prompt.facet && (
                    <span className="text-xs text-gray-500">
                      ({prompt.facet})
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-8">
          {/* Special Context Indicators */}
          {(prompt.emotionalRegulation || prompt.darkSide || prompt.executiveContext) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {prompt.emotionalRegulation && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <HeartIcon className="h-3 w-3 mr-1" />
                  Emotional Regulation
                </span>
              )}
              {prompt.darkSide && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Dark Side Detection
                </span>
              )}
              {prompt.executiveContext && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <BriefcaseIcon className="h-3 w-3 mr-1" />
                  Executive Scenario
                </span>
              )}
            </div>
          )}

          {/* Question Text */}
          <h3 className="text-xl font-medium text-gray-900 mb-8 leading-relaxed">
            {prompt.text}
          </h3>

          {/* Likert Scale */}
          <div className="space-y-3">
            {LIKERT_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedValue === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedValue === option.value
                        ? 'border-indigo-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedValue === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 rounded-full bg-indigo-500"
                      />
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedValue === option.value ? 'text-indigo-900' : 'text-gray-700'
                  }`}>
                    {option.label}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold" style={{ color: option.color }}>
                    {option.value}
                  </span>
                  {selectedValue === option.value && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <SparklesIcon className="h-5 w-5 text-indigo-500" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Additional Context for Special Questions */}
          {prompt.executiveContext && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Executive Context:</strong> Consider this scenario from a senior leadership perspective, 
                thinking about strategic impact and organizational outcomes.
              </p>
            </div>
          )}

          {prompt.emotionalRegulation && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Emotional Awareness:</strong> This question explores your emotional patterns and 
                self-regulation capabilities in challenging situations.
              </p>
            </div>
          )}

          {prompt.darkSide && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Leadership Risk:</strong> This question helps identify potential leadership derailers 
                that may emerge under stress or pressure.
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};