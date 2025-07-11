'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questionTypes } from '@/lib/assessment-engine';

export default function QuestionCard({ 
  question, 
  onAnswer, 
  currentAnswer,
  questionNumber,
  totalQuestions 
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(currentAnswer || null);
  const [textAnswer, setTextAnswer] = useState(currentAnswer || '');
  const [rankings, setRankings] = useState(currentAnswer || []);

  useEffect(() => {
    if (currentAnswer) {
      if (question.type === questionTypes.TEXT) {
        setTextAnswer(currentAnswer);
      } else if (question.type === questionTypes.RANKING) {
        setRankings(currentAnswer);
      } else {
        setSelectedAnswer(currentAnswer);
      }
    }
  }, [currentAnswer, question.type]);

  const handleAnswer = (value) => {
    setSelectedAnswer(value);
    onAnswer(value);
  };

  const handleTextSubmit = () => {
    if (textAnswer.trim()) {
      onAnswer(textAnswer);
    }
  };

  const handleRankingChange = (item, newRank) => {
    const newRankings = [...rankings];
    const existingIndex = newRankings.findIndex(r => r.item === item);
    
    if (existingIndex >= 0) {
      newRankings.splice(existingIndex, 1);
    }
    
    newRankings.splice(newRank - 1, 0, { item, rank: newRank });
    
    // Reorder ranks
    const reorderedRankings = newRankings.map((r, index) => ({
      ...r,
      rank: index + 1
    }));
    
    setRankings(reorderedRankings);
    onAnswer(reorderedRankings);
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case questionTypes.LIKERT:
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(option.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedAnswer === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-left">{option.label}</span>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedAnswer === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAnswer === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-full h-full rounded-full bg-white flex items-center justify-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case questionTypes.MULTIPLE_CHOICE:
      case questionTypes.SCENARIO:
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(option.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedAnswer === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                    selectedAnswer === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAnswer === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-full h-full rounded-full bg-white flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case questionTypes.SCALE:
        return (
          <div className="space-y-6">
            <div className="relative pt-8 pb-4">
              <input
                type="range"
                min={question.min}
                max={question.max}
                value={selectedAnswer || question.min}
                onChange={(e) => handleAnswer(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              />
              <div className="absolute -top-2 left-0 w-full flex justify-between text-sm text-gray-600 dark:text-gray-400 px-2">
                {[...Array(question.max - question.min + 1)].map((_, i) => (
                  <span key={i} className="text-center">{question.min + i}</span>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{question.minLabel}</span>
                <span className="text-gray-600 dark:text-gray-400">{question.maxLabel}</span>
              </div>
            </div>
            {selectedAnswer && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedAnswer}
                </span>
              </motion.div>
            )}
          </div>
        );

      case questionTypes.TEXT:
        return (
          <div className="space-y-4">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors resize-none h-32 dark:bg-gray-800"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {textAnswer.length}/500 characters
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTextSubmit}
                disabled={!textAnswer.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  textAnswer.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Answer
              </motion.button>
            </div>
          </div>
        );

      case questionTypes.RANKING:
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Drag items to rank them from 1 (most important) to {question.items.length} (least important)
            </div>
            {question.items.map((item, index) => {
              const ranking = rankings.find(r => r.item === item);
              return (
                <motion.div
                  key={item}
                  layout
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-move"
                >
                  <select
                    value={ranking?.rank || ''}
                    onChange={(e) => handleRankingChange(item, parseInt(e.target.value))}
                    className="w-16 p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="">-</option>
                    {[...Array(question.items.length)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <span className="flex-1">{item}</span>
                </motion.div>
              );
            })}
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
    >
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {question.pillar}
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {question.domain}
            </span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {question.question}
        </h3>
      </div>

      {renderQuestionContent()}
    </motion.div>
  );
}

