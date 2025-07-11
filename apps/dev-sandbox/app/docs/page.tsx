'use client';

import { 
  BookOpenIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CubeIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

interface DocSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: Array<{
    title: string;
    description: string;
    href: string;
    external?: boolean;
  }>;
}

const docSections: DocSection[] = [
  {
    title: 'Getting Started',
    description: 'Everything you need to begin developing with IOC Core',
    icon: RocketLaunchIcon,
    links: [
      {
        title: 'Quick Start Guide',
        description: 'Get up and running in 5 minutes',
        href: '/docs/getting-started/quick-start'
      },
      {
        title: 'Installation',
        description: 'Setting up IOC Core in your project',
        href: '/docs/getting-started/installation'
      },
      {
        title: 'Project Structure',
        description: 'Understanding the monorepo architecture',
        href: '/docs/getting-started/project-structure'
      },
      {
        title: 'Environment Setup',
        description: 'Configuring your development environment',
        href: '/docs/getting-started/environment'
      }
    ]
  },
  {
    title: 'Core Concepts',
    description: 'Fundamental concepts and architecture',
    icon: AcademicCapIcon,
    links: [
      {
        title: 'Architecture Overview',
        description: 'High-level system design and patterns',
        href: '/docs/concepts/architecture'
      },
      {
        title: 'Monorepo Structure',
        description: 'Working with Turborepo and workspaces',
        href: '/docs/concepts/monorepo'
      },
      {
        title: 'Authentication Flow',
        description: 'Understanding user authentication',
        href: '/docs/concepts/authentication'
      },
      {
        title: 'Data Management',
        description: 'Database patterns and best practices',
        href: '/docs/concepts/data'
      }
    ]
  },
  {
    title: 'Component Library',
    description: 'UI components and design system documentation',
    icon: CubeIcon,
    links: [
      {
        title: 'Component Overview',
        description: 'Browse all available UI components',
        href: '/components'
      },
      {
        title: 'Design System',
        description: 'Colors, typography, and spacing',
        href: '/docs/components/design-system'
      },
      {
        title: 'Theme Customization',
        description: 'Customizing the look and feel',
        href: '/docs/components/theming'
      },
      {
        title: 'Best Practices',
        description: 'Component composition patterns',
        href: '/docs/components/best-practices'
      }
    ]
  },
  {
    title: 'API Reference',
    description: 'Complete API documentation and examples',
    icon: CodeBracketIcon,
    links: [
      {
        title: 'REST API',
        description: 'Endpoints, parameters, and responses',
        href: '/docs/api/rest'
      },
      {
        title: 'Authentication API',
        description: 'Auth endpoints and JWT handling',
        href: '/docs/api/authentication'
      },
      {
        title: 'WebSocket API',
        description: 'Real-time communication protocols',
        href: '/docs/api/websocket'
      },
      {
        title: 'Error Handling',
        description: 'API error codes and responses',
        href: '/docs/api/errors'
      }
    ]
  },
  {
    title: 'Developer Tools',
    description: 'Tools and utilities for development',
    icon: WrenchScrewdriverIcon,
    links: [
      {
        title: 'CLI Commands',
        description: 'Command line interface reference',
        href: '/docs/tools/cli'
      },
      {
        title: 'Development Scripts',
        description: 'NPM scripts and automation',
        href: '/docs/tools/scripts'
      },
      {
        title: 'Testing Tools',
        description: 'Unit and integration testing',
        href: '/docs/tools/testing'
      },
      {
        title: 'Debugging Guide',
        description: 'Debugging tips and techniques',
        href: '/docs/tools/debugging'
      }
    ]
  },
  {
    title: 'Deployment',
    description: 'Deploy your application to production',
    icon: CommandLineIcon,
    links: [
      {
        title: 'Deployment Guide',
        description: 'Step-by-step deployment process',
        href: '/docs/deployment/guide'
      },
      {
        title: 'Environment Variables',
        description: 'Managing configuration across environments',
        href: '/docs/deployment/env-vars'
      },
      {
        title: 'CI/CD Pipeline',
        description: 'Automated deployment workflows',
        href: '/docs/deployment/ci-cd'
      },
      {
        title: 'Monitoring & Logging',
        description: 'Production monitoring setup',
        href: '/docs/deployment/monitoring'
      }
    ]
  },
  {
    title: 'Tutorials',
    description: 'Step-by-step guides for common tasks',
    icon: BeakerIcon,
    links: [
      {
        title: 'Build a Dashboard',
        description: 'Create a fully functional dashboard',
        href: '/docs/tutorials/dashboard'
      },
      {
        title: 'Add Authentication',
        description: 'Implement user authentication',
        href: '/docs/tutorials/authentication'
      },
      {
        title: 'Create API Endpoints',
        description: 'Build RESTful API routes',
        href: '/docs/tutorials/api'
      },
      {
        title: 'Real-time Features',
        description: 'Add WebSocket functionality',
        href: '/docs/tutorials/realtime'
      }
    ]
  },
  {
    title: 'Resources',
    description: 'Additional resources and references',
    icon: DocumentTextIcon,
    links: [
      {
        title: 'GitHub Repository',
        description: 'Source code and issue tracking',
        href: 'https://github.com/ioc-framework/core',
        external: true
      },
      {
        title: 'Discord Community',
        description: 'Join our developer community',
        href: 'https://discord.gg/ioc-framework',
        external: true
      },
      {
        title: 'Stack Overflow',
        description: 'Community Q&A and solutions',
        href: 'https://stackoverflow.com/questions/tagged/ioc-framework',
        external: true
      },
      {
        title: 'YouTube Channel',
        description: 'Video tutorials and demos',
        href: 'https://youtube.com/@ioc-framework',
        external: true
      }
    ]
  }
];

const quickLinks = [
  { title: 'API Testing', href: '/api-testing', icon: BeakerIcon },
  { title: 'Component Library', href: '/components', icon: CubeIcon },
  { title: 'Code Templates', href: '/templates', icon: CodeBracketIcon },
  { title: 'Playground', href: '/playground', icon: CommandLineIcon }
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Documentation Hub
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Comprehensive guides, API references, and resources for IOC Core development
          </p>
          
          {/* Quick Links */}
          <div className="flex flex-wrap gap-3">
            {quickLinks.map(link => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Icon className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm">{link.title}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search documentation..."
              className="dev-input w-full pl-12 pr-4 py-3 text-lg"
            />
            <BookOpenIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {docSections.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="dev-card h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <Icon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                    <p className="text-gray-400 text-sm mt-1">{section.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {section.links.map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                            {link.title}
                          </h3>
                          <p className="text-sm text-gray-400 mt-0.5">{link.description}</p>
                        </div>
                        {link.external && (
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-500 ml-2" />
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Popular Topics */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Popular Topics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Authentication Setup',
              'Database Migrations',
              'Component Props',
              'API Rate Limiting',
              'Error Boundaries',
              'State Management',
              'Testing Strategies',
              'Performance Tips'
            ].map(topic => (
              <a
                key={topic}
                href={`/docs/search?q=${encodeURIComponent(topic)}`}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition-colors"
              >
                <span className="text-sm text-gray-300">{topic}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 rounded-xl p-8 border border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
            <p className="text-gray-400 mb-6">
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="https://discord.gg/ioc-framework"
                className="dev-button"
              >
                Join Discord Community
              </a>
              <a
                href="https://github.com/ioc-framework/core/issues"
                className="dev-button bg-gray-700 hover:bg-gray-600"
              >
                Open GitHub Issue
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}