'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { assessmentTypes } from "@ioc/shared/data-access";

export default function AssessmentStartPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async (type) => {
    setIsStarting(true);
    setSelectedType(type);

    // Simulate API call to create assessment session
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to assessment
    router.push(`/assessment/${type}`);
  };

  const checkPrerequisite = (prerequisite) => {
    // In a real app, this would check actual data
    // For demo, we'll randomly mark some as complete
    return Math.random() > 0.3;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12">

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            IOC Assessment Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Select an assessment to begin your comprehensive evaluation journey. 
            Each assessment is designed to provide deep insights into different aspects of performance and potential.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.values(assessmentTypes).map((assessment, index) =>
          <motion.div
            key={assessment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">

              <div
              className="h-2 w-full"
              style={{ backgroundColor: assessment.color }} />

              
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{assessment.icon}</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {assessment.questionCount} questions
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {assessment.estimatedTime}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {assessment.name}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {assessment.description}
                </p>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Prerequisites:
                  </h3>
                  <ul className="space-y-2">
                    {assessment.prerequisites.map((prereq, idx) => {
                    const isComplete = checkPrerequisite(prereq);
                    return (
                      <li key={idx} className="flex items-start gap-2">
                          <span className={`mt-1 ${isComplete ? 'text-green-500' : 'text-gray-400'}`}>
                            {isComplete ? '✓' : '○'}
                          </span>
                          <span className={`text-sm ${isComplete ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {prereq}
                          </span>
                        </li>);

                  })}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Focus Areas:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {assessment.domains.map((domain) =>
                  <span
                    key={domain}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">

                        {domain}
                      </span>
                  )}
                  </div>
                </div>

                <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStart(assessment.id)}
                disabled={isStarting && selectedType === assessment.id}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                isStarting && selectedType === assessment.id ?
                'bg-gray-400 cursor-not-allowed' :
                'hover:shadow-lg'}`
                }
                style={{
                  backgroundColor: isStarting && selectedType === assessment.id ?
                  undefined :
                  assessment.color
                }}>

                  {isStarting && selectedType === assessment.id ?
                <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Starting Assessment...
                    </span> :

                'Start Assessment'
                }
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center">

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help choosing? <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Contact our assessment team</a>
          </p>
        </motion.div>
      </div>
    </div>);

}