/**
 * @fileoverview IOC Core brand colors and design tokens
 * @description Centralized brand colors for consistent theming across all applications
 */

const brandColors = {
  // Primary IOC brand colors
  'ioc-navy': '#1e3a8a',
  'ioc-blue': '#3b82f6',
  'ioc-light-blue': '#60a5fa',
  'ioc-slate': '#334155',
  'ioc-gray': '#64748b',
  
  // Extended brand palette for future use
  'ioc-dark-navy': '#1e2a5a',
  'ioc-medium-blue': '#2563eb',
  'ioc-sky': '#0ea5e9',
  'ioc-light-gray': '#94a3b8',
  'ioc-dark-gray': '#475569',
  
  // Semantic colors
  'ioc-success': '#059669',
  'ioc-warning': '#d97706',
  'ioc-error': '#dc2626',
  'ioc-info': '#0284c7',
  
  // Background variations
  'ioc-bg-primary': '#f8fafc',
  'ioc-bg-secondary': '#f1f5f9',
  'ioc-bg-dark': '#0f172a',
  
  // Text variations
  'ioc-text-primary': '#1e293b',
  'ioc-text-secondary': '#64748b',
  'ioc-text-muted': '#94a3b8',
  'ioc-text-inverse': '#f1f5f9',
};

const gradients = {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  'gradient-ioc-primary': 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  'gradient-ioc-secondary': 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
};

module.exports = {
  brandColors,
  gradients,
  // Export individual color schemes
  colors: brandColors,
  backgroundImage: gradients,
};