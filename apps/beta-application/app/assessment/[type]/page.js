'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionCard, ProgressBar, AssessmentTimer } from "@ioc/shared/ui";
import {
  assessmentTypes,
  sampleQuestions,
  saveAssessmentProgress,
  loadAssessmentProgress,
  generateAssessmentId,
  calculateProgress,
  estimateTimeRemaining } from
"@ioc/shared/data-access/engines";

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentType = params.type;

  const [assessmentId, setAssessmentId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const assessment = assessmentTypes[assessmentType];
  const questions = sampleQuestions[assessmentType] || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = calculateProgress(Object.keys(answers).length, questions.length);
  const timeRemaining = estimateTimeRemaining(Object.keys(answers).length, questions.length);

  // Initialize or load assessment
  useEffect(() => {
    const initAssessment = async () => {
      let id = sessionStorage.getItem('currentAssessmentId');

      if (id) {
        // Load existing assessment
        const savedProgress = await loadAssessmentProgress(id);
        if (savedProgress && savedProgress.type === assessmentType) {
          setAnswers(savedProgress.answers || {});
          setCurrentQuestionIndex(savedProgress.currentIndex || 0);
          setStartTime(savedProgress.startTime);
          setAssessmentId(id);
        } else {
          // Create new assessment
          id = generateAssessmentId();
          setAssessmentId(id);
          setStartTime(Date.now());
          sessionStorage.setItem('currentAssessmentId', id);
        }
      } else {
        // Create new assessment
        id = generateAssessmentId();
        setAssessmentId(id);
        setStartTime(Date.now());
        sessionStorage.setItem('currentAssessmentId', id);
      }

      setIsLoading(false);
    };

    initAssessment();
  }, [assessmentType]);

  // Auto-save progress
  useEffect(() => {
    if (!assessmentId || isLoading) return;

    const saveProgress = async () => {
      setIsSaving(true);
      await saveAssessmentProgress(assessmentId, {
        type: assessmentType,
        answers,
        currentIndex: currentQuestionIndex,
        startTime,
        lastSaved: Date.now()
      });
      setIsSaving(false);
    };

    const debounceTimer = setTimeout(saveProgress, 2000);
    return () => clearTimeout(debounceTimer);
  }, [assessmentId, answers, currentQuestionIndex, assessmentType, startTime, isLoading]);

  const handleAnswer = useCallback((answer) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  }, [currentQuestion]);

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Complete assessment
      completeAssessment();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const completeAssessment = async () => {
    setIsSaving(true);

    // Save final state
    await saveAssessmentProgress(assessmentId, {
      type: assessmentType,
      answers,
      completed: true,
      completedAt: Date.now(),
      startTime,
      totalTime: Date.now() - startTime
    });

    // Clear session
    sessionStorage.removeItem('currentAssessmentId');

    // Navigate to results
    router.push(`/results/${assessmentId}`);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    router.push('/assessment/start');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading assessment...</p>
        </div>
      </div>);

  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Invalid assessment type</p>
          <button
            onClick={() => router.push('/assessment/start')}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400">

            Return to assessment selection
          </button>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{assessment.icon}</span>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {assessment.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSaving ? 'Saving...' : 'Auto-saving enabled'}
                </p>
              </div>
            </div>
            <button
              onClick={handleExit}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">

              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ProgressBar
              current={Object.keys(answers).length}
              total={questions.length}
              label="Overall Progress" />

            
            <AssessmentTimer
              startTime={startTime}
              estimatedMinutes={parseInt(assessment.estimatedTime.split('-')[0])} />


            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Answered</span>
                  <span className="font-medium">{Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Remaining</span>
                  <span className="font-medium">{questions.length - Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Est. time left</span>
                  <span className="font-medium">{timeRemaining} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}>

                <QuestionCard
                  question={currentQuestion}
                  onAnswer={handleAnswer}
                  currentAnswer={answers[currentQuestion.id]}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={questions.length} />

              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestionIndex === 0 ?
                'bg-gray-100 text-gray-400 cursor-not-allowed' :
                'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`
                }>

                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentQuestionIndex + 1} of {questions.length}
              </span>

              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                !answers[currentQuestion.id] ?
                'bg-gray-300 text-gray-500 cursor-not-allowed' :
                currentQuestionIndex === questions.length - 1 ?
                'bg-green-600 text-white hover:bg-green-700' :
                'bg-blue-600 text-white hover:bg-blue-700'}`
                }>

                {currentQuestionIndex === questions.length - 1 ? 'Complete' : 'Next'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

            <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Exit Assessment?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your progress has been saved. You can continue this assessment later from where you left off.
              </p>
              <div className="flex gap-4">
                <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">

                  Continue Assessment
                </button>
                <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">

                  Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}