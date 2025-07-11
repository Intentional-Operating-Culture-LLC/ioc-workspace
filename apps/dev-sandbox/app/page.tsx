'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BeakerIcon, 
  CodeBracketIcon, 
  CubeIcon, 
  DocumentTextIcon, 
  PlayIcon, 
  RocketLaunchIcon,
  ChartBarIcon,
  CogIcon,
  BugAntIcon,
  SparklesIcon,
  LightBulbIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

const DeveloperSandbox = () => {
  const features = [
    {
      icon: CubeIcon,
      title: 'Component Library',
      description: 'Browse and test all IOC UI components with live examples',
      href: '/components',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: BeakerIcon,
      title: 'API Testing',
      description: 'Interactive API endpoint testing and documentation',
      href: '/api-testing',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: CodeBracketIcon,
      title: 'Code Templates',
      description: 'Pre-built templates for components, pages, and API routes',
      href: '/templates',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: DocumentTextIcon,
      title: 'Documentation',
      description: 'Developer guides, workflows, and best practices',
      href: '/docs',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: PlayIcon,
      title: 'Playground',
      description: 'Experiment with code snippets and prototypes',
      href: '/playground',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: ChartBarIcon,
      title: 'Monitoring',
      description: 'Development metrics and performance insights',
      href: '/monitoring',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  const quickActions = [
    { icon: RocketLaunchIcon, label: 'Create Component', href: '/create/component' },
    { icon: CogIcon, label: 'Generate API Route', href: '/create/api' },
    { icon: BugAntIcon, label: 'Debug Tools', href: '/debug' },
    { icon: SparklesIcon, label: 'Style Guide', href: '/style-guide' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="dev-container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-dev-primary to-dev-secondary rounded-lg flex items-center justify-center">
                <CommandLineIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IOC Developer Sandbox</h1>
                <p className="text-sm text-gray-600">Framework Development Environment</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="dev-badge-info">v1.0.0</span>
              <span className="dev-badge-success">Running</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="dev-container py-12">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-dev-primary/10 text-dev-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <LightBulbIcon className="w-4 h-4" />
            <span>Development Environment</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Build with <span className="dev-gradient-text">Confidence</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Your comprehensive toolkit for IOC Framework development. Test components, 
            explore APIs, and accelerate your development workflow.
          </p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="inline-flex items-center space-x-2 dev-button-secondary hover:shadow-md"
              >
                <action.icon className="w-4 h-4" />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Notice */}
      <section className="dev-container pb-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">🎨 Homepage Preview with 100x100 Images</h3>
              <p className="text-blue-100">Test the production homepage with smaller image sizes before deploying</p>
            </div>
            <Link
              href="/preview"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              View Preview →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="dev-container pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="group dev-card p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-dev-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 text-dev-primary text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
                Explore →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Development Stats */}
      <section className="bg-white border-t">
        <div className="dev-container py-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Development Environment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-dev-primary mb-2">50+</div>
              <div className="text-gray-600 text-sm">UI Components</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-dev-secondary mb-2">25+</div>
              <div className="text-gray-600 text-sm">API Endpoints</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-dev-accent mb-2">15+</div>
              <div className="text-gray-600 text-sm">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-dev-success mb-2">100%</div>
              <div className="text-gray-600 text-sm">Type Safe</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="dev-container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-600 text-sm mb-4 md:mb-0">
              IOC Framework Developer Environment • Port 3010
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <Link href="/health" className="hover:text-dev-primary">Health Check</Link>
              <Link href="/api/version" className="hover:text-dev-primary">API Version</Link>
              <Link href="/docs/getting-started" className="hover:text-dev-primary">Getting Started</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeveloperSandbox;