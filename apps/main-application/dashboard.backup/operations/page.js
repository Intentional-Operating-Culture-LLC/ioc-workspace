import { createClient } from "@ioc/shared/data-access";
import { redirect } from 'next/navigation';

export default async function OperationsPage() {
  const supabase = createBrowserClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor and manage system operations
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
          <p className="text-sm text-gray-500">Operations dashboard coming soon...</p>
        </div>
      </div>
    </div>);

}