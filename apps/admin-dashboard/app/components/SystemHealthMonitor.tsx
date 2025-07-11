'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function SystemHealthMonitor({ detailed = false }: { detailed?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="chart-container"
    >
      <h3 className="chart-title">System Health Monitor</h3>
      <div className="text-center py-8 text-gray-500">
        <p>System Health Monitoring - Coming Soon</p>
      </div>
    </motion.div>
  );
}