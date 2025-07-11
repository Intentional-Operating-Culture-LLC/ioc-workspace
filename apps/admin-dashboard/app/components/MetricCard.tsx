'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon | any; // Support both Lucide and Heroicons
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo';
  subtitle?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    accent: 'border-blue-200',
  },
  green: {
    icon: 'bg-green-100 text-green-600',
    accent: 'border-green-200',
  },
  purple: {
    icon: 'bg-purple-100 text-purple-600',
    accent: 'border-purple-200',
  },
  yellow: {
    icon: 'bg-yellow-100 text-yellow-600',
    accent: 'border-yellow-200',
  },
  red: {
    icon: 'bg-red-100 text-red-600',
    accent: 'border-red-200',
  },
  indigo: {
    icon: 'bg-indigo-100 text-indigo-600',
    accent: 'border-indigo-200',
  },
};

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  subtitle,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded loading-shimmer w-24"></div>
            <div className="h-8 w-8 bg-gray-200 rounded loading-shimmer"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded loading-shimmer w-16"></div>
          <div className="h-3 bg-gray-200 rounded loading-shimmer w-20"></div>
        </div>
      </div>
    );
  }

  const colors = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`metric-card border-l-4 ${colors.accent}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="metric-label">{title}</p>
          <div className="mt-2">
            <p className="metric-value">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {change && (
            <div className="mt-2 flex items-center">
              <span className={`metric-change ${changeType}`}>
                {change}
              </span>
              <span className="text-xs text-gray-500 ml-2">from last period</span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 ${colors.icon} p-3 rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}