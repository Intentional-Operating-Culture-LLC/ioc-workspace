'use client';

import React from 'react';
import { useEffect } from 'react';

export function DeploymentTracker() {
  useEffect(() => {
    // Log deployment info when component mounts
    console.log('===========================================');
    console.log('🚀 IOC PLATFORM DEPLOYMENT VERIFICATION 🚀');
    console.log('===========================================');
    console.log('Version: 1.1.0');
    console.log('Deployed: 2025-01-07 14:30:00 UTC');
    console.log('Commit: d239e0ae');
    console.log('Build Time:', new Date().toISOString());
    console.log('Features Enabled:');
    console.log('  ✓ Navigation Bar with Auth');
    console.log('  ✓ Login/Signup Buttons');
    console.log('  ✓ Landing Page');
    console.log('  ✓ Pricing Section');
    console.log('===========================================');
    console.log('To verify deployment: Check /api/version');
    console.log('===========================================');
  }, []);

  return null;
}