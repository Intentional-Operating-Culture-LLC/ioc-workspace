import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

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

  // Get the default organization (first one or the one from user preferences)
  const { data: userProfile } = await supabase.
  from('users').
  select('settings').
  eq('id', user.id).
  single();

  const defaultOrgId = userProfile?.settings?.default_organization_id || userOrgs?.[0]?.organization?.id;
  const currentOrg = userOrgs?.find((org) => org.organization.id === defaultOrgId) || userOrgs?.[0];

  if (!currentOrg) {
    // User has no organizations - redirect to create one
    redirect('/onboarding/organization');
  }

  // Fetch organization metrics
  let orgMetrics = null;
  try {
    const { data } = await supabase.
    rpc('get_organization_metrics', { org_id: currentOrg.organization.id });
    orgMetrics = data;
  } catch (error) {
    // Function might not exist yet, use fallback data
    console.warn('Organization metrics function not found, using fallback data');

    // Manually calculate basic metrics
    const { count: userCount } = await supabase.
    from('user_organizations').
    select('*', { count: 'exact', head: true }).
    eq('organization_id', currentOrg.organization.id).
    eq('is_active', true);

    const { count: activeAssessmentCount } = await supabase.
    from('assessments').
    select('*', { count: 'exact', head: true }).
    eq('organization_id', currentOrg.organization.id).
    eq('status', 'active');

    const { count: totalResponseCount } = await supabase.
    from('assessment_responses').
    select('*, assessments!inner(organization_id)', { count: 'exact', head: true }).
    eq('assessments.organization_id', currentOrg.organization.id);

    const { count: submittedResponseCount } = await supabase.
    from('assessment_responses').
    select('*, assessments!inner(organization_id)', { count: 'exact', head: true }).
    eq('assessments.organization_id', currentOrg.organization.id).
    eq('status', 'submitted');

    orgMetrics = {
      total_users: userCount || 0,
      active_assessments: activeAssessmentCount || 0,
      total_responses: totalResponseCount || 0,
      submitted_responses: submittedResponseCount || 0,
      completion_rate: totalResponseCount > 0 ?
      Math.round(submittedResponseCount / totalResponseCount * 100) :
      0
    };
  }

  // Fetch recent assessments for the organization
  const { data: recentAssessments } = await supabase.
  from('assessments').
  select(`
      id,
      title,
      type,
      status,
      created_at,
      start_date,
      end_date,
      created_by:users!assessments_created_by_fkey(id, full_name)
    `).
  eq('organization_id', currentOrg.organization.id).
  order('created_at', { ascending: false }).
  limit(5);

  // Fetch recent activities (analytics events)
  const { data: recentActivities } = await supabase.
  from('analytics_events').
  select(`
      id,
      event_type,
      event_category,
      event_data,
      created_at,
      user:users(id, full_name, email)
    `).
  eq('organization_id', currentOrg.organization.id).
  order('created_at', { ascending: false }).
  limit(10);

  // Check if organization is a reseller
  const isReseller = currentOrg.organization.settings?.is_reseller === true;

  // If reseller, fetch client organizations
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
      organizations={userOrgs}
      currentOrganization={currentOrg}
      metrics={orgMetrics}
      recentAssessments={recentAssessments}
      recentActivities={recentActivities}
      isReseller={isReseller}
      clientOrganizations={clientOrgs} />);


}