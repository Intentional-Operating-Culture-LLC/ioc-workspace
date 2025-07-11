'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AssessmentTimer({ startTime, estimatedMinutes }) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const elapsedMinutes = Math.floor(elapsed / 1000 / 60);
  const progress = Math.min((elapsedMinutes / estimatedMinutes) * 100, 100);
  const isOvertime = elapsedMinutes > estimatedMinutes;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOvertime ? 'bg-orange-500' : 'bg-green-500'} ${!isPaused && 'animate-pulse'}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Elapsed
          </span>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatTime(elapsed)}
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Estimated: {estimatedMinutes} minutes
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isOvertime 
                ? 'bg-gradient-to-r from-orange-400 to-orange-500' 
                : 'bg-gradient-to-r from-green-400 to-green-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {isOvertime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-orange-600 dark:text-orange-400 mt-2"
          >
            You're over the estimated time, but take as long as you need!
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}