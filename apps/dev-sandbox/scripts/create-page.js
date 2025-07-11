#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

async function createPage() {
  try {
    console.log(`${colors.blue}${colors.bright}Page Generator${colors.reset}\n`);

    // Get page details
    const pagePath = await question('Page path (e.g., dashboard/analytics or about): ');
    if (!pagePath) {
      throw new Error('Page path is required');
    }

    const pageTitle = await question('Page title: ') || pagePath.split('/').pop().charAt(0).toUpperCase() + pagePath.split('/').pop().slice(1);
    const isProtected = (await question('Protected route (requires auth)? (y/N): ')).toLowerCase() === 'y';
    const hasLayout = (await question('Include custom layout? (y/N): ')).toLowerCase() === 'y';
    const hasLoading = (await question('Include loading state? (Y/n): ')).toLowerCase() !== 'n';
    const hasError = (await question('Include error boundary? (Y/n): ')).toLowerCase() !== 'n';
    const isDynamic = (await question('Dynamic route (with params)? (y/N): ')).toLowerCase() === 'y';
    const hasMetadata = (await question('Include metadata? (Y/n): ')).toLowerCase() !== 'n';

    // Create page directory
    const pageDir = path.join(process.cwd(), 'app', pagePath);
    
    if (fs.existsSync(path.join(pageDir, 'page.tsx'))) {
      const overwrite = (await question(`${colors.yellow}Page already exists. Overwrite? (y/N): ${colors.reset}`)).toLowerCase() === 'y';
      if (!overwrite) {
        console.log('Operation cancelled');
        rl.close();
        return;
      }
    }

    fs.mkdirSync(pageDir, { recursive: true });

    // Generate page content
    let pageContent = '';
    
    if (hasMetadata) {
      pageContent += `import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${pageTitle} | IOC Dev',
  description: '${pageTitle} page in the IOC Developer Sandbox',
};

`;
    }

    if (isDynamic) {
      const paramName = await question('Parameter name (e.g., id, slug): ') || 'id';
      pageContent += `interface PageProps {
  params: { ${paramName}: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

`;
    }

    if (isProtected) {
      pageContent += `import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

`;
    }

    pageContent += `export default async function ${pageTitle.replace(/\s+/g, '')}Page(${isDynamic ? 'props: PageProps' : ''}) {`;

    if (isProtected) {
      pageContent += `
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
`;
    }

    if (isDynamic) {
      pageContent += `
  const { params, searchParams } = props;
  
  // Access dynamic params and search params
  console.log('Params:', params);
  console.log('Search Params:', searchParams);
`;
    }

    pageContent += `
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">${pageTitle}</h1>
      
      <div className="grid gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome to ${pageTitle}</h2>
          <p className="text-gray-600 dark:text-gray-300">
            This is your ${pageTitle.toLowerCase()} page. Start building your content here.
          </p>
        </section>
        
        ${isDynamic ? `<section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-2">Dynamic Route Info</h3>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
            {JSON.stringify({ params${isDynamic ? ', searchParams' : ''} }, null, 2)}
          </pre>
        </section>` : ''}
        
        ${isProtected ? `<section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-2">User Session</h3>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
            {JSON.stringify(session.user, null, 2)}
          </pre>
        </section>` : ''}
      </div>
    </div>
  );
}
`;

    // Create layout if requested
    if (hasLayout) {
      const layoutContent = `export default function ${pageTitle.replace(/\s+/g, '')}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h2 className="text-xl font-semibold">${pageTitle} Section</h2>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
`;
      fs.writeFileSync(path.join(pageDir, 'layout.tsx'), layoutContent);
    }

    // Create loading state if requested
    if (hasLoading) {
      const loadingContent = `export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
      fs.writeFileSync(path.join(pageDir, 'loading.tsx'), loadingContent);
    }

    // Create error boundary if requested
    if (hasError) {
      const errorContent = `'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
          Something went wrong!
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
`;
      fs.writeFileSync(path.join(pageDir, 'error.tsx'), errorContent);
    }

    // Write page file
    fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageContent);

    // Create a basic test file
    const testContent = `import { render, screen } from '@testing-library/react';
import ${pageTitle.replace(/\s+/g, '')}Page from './page';

// Mock next-auth if needed
${isProtected ? `jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({ user: { email: 'test@example.com' } })),
}));` : ''}

describe('${pageTitle} Page', () => {
  it('renders the page title', async () => {
    const page = await ${pageTitle.replace(/\s+/g, '')}Page(${isDynamic ? '{ params: { id: "test" } }' : ''});
    const { container } = render(page);
    
    expect(container.querySelector('h1')).toHaveTextContent('${pageTitle}');
  });
});
`;
    fs.writeFileSync(path.join(pageDir, 'page.test.tsx'), testContent);

    console.log(`\n${colors.green}✓ Page created successfully!${colors.reset}`);
    console.log(`\nFiles created:`);
    console.log(`  - ${path.relative(process.cwd(), path.join(pageDir, 'page.tsx'))}`);
    console.log(`  - ${path.relative(process.cwd(), path.join(pageDir, 'page.test.tsx'))}`);
    if (hasLayout) {
      console.log(`  - ${path.relative(process.cwd(), path.join(pageDir, 'layout.tsx'))}`);
    }
    if (hasLoading) {
      console.log(`  - ${path.relative(process.cwd(), path.join(pageDir, 'loading.tsx'))}`);
    }
    if (hasError) {
      console.log(`  - ${path.relative(process.cwd(), path.join(pageDir, 'error.tsx'))}`);
    }
    console.log(`\n${colors.blue}Access at:${colors.reset} http://localhost:3000/${pagePath}`);

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

createPage();