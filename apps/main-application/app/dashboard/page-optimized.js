import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SupabaseQueryOptimizer } from "@ioc/shared/data-access/supabase/query-optimizer";

// Use dynamic import for the dashboard client with no SSR
const DashboardClient = dynamic(() => import('./DashboardClientOptimized'), {
  ssr: false,
  loading: () =>
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

});

export default async function DashboardPage() {
  const supabase = await createAppDirectoryClient();
  const optimizer = new SupabaseQueryOptimizer(supabase);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all dashboard data in parallel using optimizer
  const dashboardData = await optimizer.fetchDashboardData(
    null, // Will be determined after fetching user orgs
    user.id
  );

  // Get the default organization
  const { data: userProfile } = await supabase.
  from('users').
  select('settings').
  eq('id', user.id).
  single();

  const defaultOrgId = userProfile?.settings?.default_organization_id || dashboardData.userOrgs?.[0]?.organization?.id;
  const currentOrg = dashboardData.userOrgs?.find((org) => org.organization.id === defaultOrgId) || dashboardData.userOrgs?.[0];

  if (!currentOrg) {
    redirect('/onboarding/organization');
  }

  // Now fetch organization-specific data
  const orgData = await optimizer.fetchDashboardData(
    currentOrg.organization.id,
    user.id
  );

  // Check if organization is a reseller
  const isReseller = currentOrg.organization.settings?.is_reseller === true;

  // If reseller, fetch client organizations efficiently
  let clientOrgs = [];
  if (isReseller) {
    const { data: clients } = await supabase.
    from('organizations').
    select('id, name, slug, created_at, is_active').
    eq('parent_organization_id', currentOrg.organization.id).
    order('created_at', { ascending: false });
    clientOrgs = clients || [];
  }

  return (
    <DashboardClient
      user={user}
      organizations={dashboardData.userOrgs}
      currentOrganization={currentOrg}
      metrics={orgData.metrics}
      recentAssessments={orgData.recentAssessments}
      recentActivities={orgData.recentActivities}
      isReseller={isReseller}
      clientOrganizations={clientOrgs} />);


}