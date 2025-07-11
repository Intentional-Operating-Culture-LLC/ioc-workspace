'use client';

import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface QuestionOption {
  value: string;
  label: string;
}

interface AnswerInputProps {
  type: 'text' | 'radio' | 'scale' | 'checkbox';
  options?: QuestionOption[];
  value?: string | number | string[];
  onChange: (value: string | number | string[]) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

export function AnswerInput({ 
  type, 
  options = [], 
  value, 
  onChange,
  placeholder,
  min,
  max,
  minLabel,
  maxLabel
}: AnswerInputProps) {
  const [localValue, setLocalValue] = useState(value || '');

  const handleChange = (newValue: string | number | string[]) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  switch (type) {
    case 'text':
      return (
        <textarea
          value={localValue as string}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder || "Enter your answer..."}
          className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors resize-none h-32 dark:bg-gray-800"
          maxLength={1000}
        />
      );

    case 'radio':
      return (
        <div className="space-y-3">
          {options.map((option: QuestionOption) => (
            <motion.label
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`block w-full p-4 rounded-lg border-2 cursor-pointer transition-all ${
                localValue === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="answer"
                  value={option.value}
                  checked={localValue === option.value}
                  onChange={(e) => handleChange(e.target.value)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                  localValue === option.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {localValue === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full rounded-full bg-white flex items-center justify-center"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </motion.div>
                  )}
                </div>
                <span className="text-gray-900 dark:text-gray-100">{option.label}</span>
              </div>
            </motion.label>
          ))}
        </div>
      );

    case 'scale':
      return (
        <div className="space-y-6">
          <div className="relative pt-8 pb-4">
            <input
              type="range"
              min={min || 1}
              max={max || 10}
              value={localValue as number || min || 1}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                  (((localValue as number) - (min || 1)) / ((max || 10) - (min || 1))) * 100
                }%, #E5E7EB ${
                  (((localValue as number) - (min || 1)) / ((max || 10) - (min || 1))) * 100
                }%, #E5E7EB 100%)`
              }}
            />
            <div className="absolute -top-2 left-0 w-full flex justify-between text-sm text-gray-600 dark:text-gray-400 px-2">
              {[...Array((max || 10) - (min || 1) + 1)].map((_, i) => (
                <span key={i} className="text-center">{(min || 1) + i}</span>
              ))}
            </div>
            {(minLabel || maxLabel) && (
              <div className="flex justify-between mt-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{minLabel}</span>
                <span className="text-gray-600 dark:text-gray-400">{maxLabel}</span>
              </div>
            )}
          </div>
          {localValue && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {localValue}
              </span>
            </motion.div>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-3">
          {options.map((option: QuestionOption) => (
            <motion.label
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`block w-full p-4 rounded-lg border-2 cursor-pointer transition-all ${
                ((localValue as string[]) || []).includes(option.value)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={((localValue as string[]) || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = (localValue as string[]) || [];
                    if (e.target.checked) {
                      handleChange([...currentValues, option.value]);
                    } else {
                      handleChange(currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 flex-shrink-0 ${
                  ((localValue as string[]) || []).includes(option.value)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {((localValue as string[]) || []).includes(option.value) && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full text-white p-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-gray-900 dark:text-gray-100">{option.label}</span>
              </div>
            </motion.label>
          ))}
        </div>
      );

    default:
      return <div>Unsupported input type: {type}</div>;
  }
}

<style>{`
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: #3B82F6;
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background: #3B82F6;
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: none;
  }
`}</style>