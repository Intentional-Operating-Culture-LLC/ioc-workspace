/**
 * Page Template
 * Use this as a starting point for Next.js pages
 */

import { Metadata } from 'next';
import { Suspense } from 'react';

// Metadata for the page (SEO)
export const metadata: Metadata = {
  title: 'Page Title | IOC Dev',
  description: 'Page description for SEO',
  keywords: ['keyword1', 'keyword2'],
  openGraph: {
    title: 'Page Title',
    description: 'Page description',
    type: 'website',
  },
};

// TypeScript types for page props
interface PageTemplateProps {
  params: { 
    // Dynamic route parameters
    id?: string;
  };
  searchParams?: { 
    // URL search parameters
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Page Component
 * @description Main page component following Next.js App Router conventions
 */
export default async function PageTemplate({ 
  params, 
  searchParams 
}: PageTemplateProps) {
  // Server-side data fetching
  // const data = await fetchData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Page Title</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page description or subtitle
        </p>
      </header>

      {/* Main Content */}
      <main className="space-y-8">
        {/* Section with Suspense boundary */}
        <Suspense fallback={<SectionSkeleton />}>
          <DataSection />
        </Suspense>

        {/* Grid Layout Example */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Feature 1" description="Description of feature 1" />
          <Card title="Feature 2" description="Description of feature 2" />
          <Card title="Feature 3" description="Description of feature 3" />
        </section>

        {/* Content Section */}
        <section className="prose dark:prose-invert max-w-none">
          <h2>Content Section</h2>
          <p>
            This is where your main content would go. You can use the prose
            class for nice typography on text-heavy content.
          </p>
        </section>
      </main>

      {/* Page Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Footer content or additional information
        </p>
      </footer>
    </div>
  );
}

/**
 * Data Section Component
 * @description Example of an async component that fetches data
 */
async function DataSection() {
  // Simulate data fetching
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = {
    stats: [
      { label: 'Total Users', value: '1,234' },
      { label: 'Active Projects', value: '56' },
      { label: 'API Calls', value: '789K' },
    ],
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-semibold mb-4">Statistics</h2>
      <div className="grid grid-cols-3 gap-4">
        {data.stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stat.value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Card Component
 * @description Reusable card component
 */
function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

/**
 * Section Skeleton
 * @description Loading skeleton for data section
 */
function SectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 animate-pulse">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}