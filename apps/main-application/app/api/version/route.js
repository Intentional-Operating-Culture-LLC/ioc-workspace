import { NextResponse } from 'next/server';

export async function GET() {
  const deploymentInfo = {
    version: '1.1.0',
    deployedAt: '2025-01-07 14:30:00 UTC',
    lastUpdated: new Date().toISOString(),
    commit: 'd239e0ae',
    features: {
      navigation: true,
      authButtons: true,
      landingPage: true,
      pricingSection: true
    },
    message: 'Navigation with Login/Signup buttons added'
  };

  return NextResponse.json(deploymentInfo);
}