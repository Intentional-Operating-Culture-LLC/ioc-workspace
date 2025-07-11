import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for the reports manager
const ReportsManager = dynamic(() => import('@ioc/ui/components/reports').then((mod) => mod.ReportsManager), {
  ssr: false,
  loading: () =>
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

});

export default async function ReportsPage() {
  const supabase = await createAppDirectoryClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's organizations
  const { data: userOrgs } = await supabase.
  from('user_organizations').
  select(`
      organization:organizations(*),
      role,
      permissions,
      joined_at
    `).
  eq('user_id', user.id).
  eq('is_active', true).
  order('joined_at', { ascending: false });

  // Get the default organization
  const { data: userProfile } = await supabase.
  from('users').
  select('settings').
  eq('id', user.id).
  single();

  const defaultOrgId = userProfile?.settings?.default_organization_id || userOrgs?.[0]?.organization?.id;
  const currentOrg = userOrgs?.find((org) => org.organization.id === defaultOrgId) || userOrgs?.[0];

  if (!currentOrg) {
    redirect('/onboarding/organization');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportsManager
          organizationId={currentOrg.organization.id}
          user={user} />

      </div>
    </div>);

}