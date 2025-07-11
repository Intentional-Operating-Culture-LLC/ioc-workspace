import { createClient } from '@supabase/supabase-js';
import { Organization, GetOrganizationMembersOptions as OrganizationOptions } from "@ioc/shared/types";
// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export interface OrganizationMember {
    id: string;
    full_name: string;
    email: string;
    role: string;
    permissions: any;
    joined_at: string;
    invited_by?: {
        id: string;
        full_name: string;
    };
}
/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization> {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization> {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Get organizations for a user
 */
export async function getUserOrganizations(userId: string): Promise<(Organization & {
    user_role: string;
    user_permissions: any;
    joined_at: string;
})[]> {
    const { data, error } = await supabase
        .from('user_organizations')
        .select(`
      organization:organizations(*),
      role,
      permissions,
      joined_at
    `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });
    if (error)
        throw error;
    // Transform to include role info in organization object
    return data.map((item: any) => ({
        ...item.organization,
        user_role: item.role,
        user_permissions: item.permissions,
        joined_at: item.joined_at,
    }));
}
/**
 * Create a new organization
 */
export async function createOrganization(organizationData: Organization, ownerId: string): Promise<Organization> {
    // Start a transaction
    const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert(organizationData)
        .select()
        .single();
    if (orgError)
        throw orgError;
    // Add owner to organization
    const { error: memberError } = await supabase
        .from('user_organizations')
        .insert({
        user_id: ownerId,
        organization_id: organization.id,
        role: 'owner',
        permissions: { all: true },
    });
    if (memberError) {
        // Rollback by deleting the organization
        await supabase.from('organizations').delete().eq('id', organization.id);
        throw memberError;
    }
    return organization;
}
/**
 * Update organization
 */
export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Delete organization
 */
export async function deleteOrganization(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    return true;
}
/**
 * Get organization members
 */
export async function getOrganizationMembers(organizationId: string, options: OrganizationOptions = {}): Promise<{
    members: OrganizationMember[];
    total: number;
}> {
    let query = supabase
        .from('user_organizations')
        .select(`
      user:users!user_organizations_user_id_fkey(*),
      role,
      permissions,
      joined_at,
      invited_by:users!user_organizations_invited_by_fkey(id, full_name)
    `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);
    // Apply filters
    if (options.role) {
        query = query.eq('role', options.role);
    }
    if (options.search) {
        query = query.or(`user.full_name.ilike.%${options.search}%,user.email.ilike.%${options.search}%`);
    }
    // Apply pagination
    if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    // Transform data
    const members = data.map((item: any) => ({
        id: item.user.id,
        full_name: item.user.full_name,
        email: item.user.email,
        role: item.role,
        permissions: item.permissions,
        joined_at: item.joined_at,
        invited_by: item.invited_by,
    }));
    return { members, total: count || 0 };
}
/**
 * Add member to organization
 */
export async function addOrganizationMember(organizationId: string, userId: string, role: string = 'member', invitedBy?: string) {
    const { data, error } = await supabase
        .from('user_organizations')
        .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        invited_by: invitedBy,
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Update member role
 */
export async function updateMemberRole(organizationId: string, userId: string, newRole: string) {
    const { data, error } = await supabase
        .from('user_organizations')
        .update({ role: newRole })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Remove member from organization
 */
export async function removeOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_organizations')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
    if (error)
        throw error;
    return true;
}
/**
 * Check if user is member of organization
 */
export async function isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();
    if (error)
        return false;
    return data !== null;
}
/**
 * Check if user has role in organization
 */
export async function userHasRole(userId: string, organizationId: string, requiredRole: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();
    if (error || !data)
        return false;
    // Check role hierarchy
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(data.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
}
/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string) {
    // Get member count
    const { count: memberCount } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);
    // Get assessment count
    const { count: assessmentCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
    // Get recent activity
    const { data: recentEvents } = await supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
    return {
        member_count: memberCount || 0,
        assessment_count: assessmentCount || 0,
        recent_activity: recentEvents || [],
    };
}
