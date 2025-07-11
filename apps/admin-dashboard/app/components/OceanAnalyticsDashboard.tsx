'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AssessmentChart } from './AssessmentChart';

export function OceanAnalyticsDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-900">OCEAN Analytics Dashboard</h2>
      <div className="text-center py-12 text-gray-500">
        <p>OCEAN Analytics Dashboard - Coming Soon</p>
      </div>
    </motion.div>
  );
}