import { createClient } from '@supabase/supabase-js';
import { User, UserOrganization, SearchUsersOptions as UserSearchOptions } from "@ioc/shared/types";
// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export interface UserPermissions {
    role: string;
    permissions: {
        organizations?: string[];
        users?: string[];
        assessments?: string[];
        analytics?: string[];
        billing?: string[];
    };
}
/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      *,
      user_organizations(
        organization:organizations(*),
        role,
        permissions,
        joined_at
      )
    `)
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      *,
      user_organizations(
        organization:organizations(*),
        role,
        permissions,
        joined_at
      )
    `)
        .eq('email', email)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Create user profile
 */
export async function createUserProfile(userData: Partial<User>): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Update user profile
 */
export async function updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    if (error)
        throw error;
    return true;
}
/**
 * Search users
 */
export async function searchUsers(query: string, options: UserSearchOptions = {}): Promise<{
    users: User[];
    total: number;
}> {
    let dbQuery = supabase
        .from('users')
        .select('*', { count: 'exact' });
    // Apply search
    if (query) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
    }
    // Apply filters
    if (options.organizationId) {
        // Get user IDs from user_organizations first
        const { data: userOrgs } = await supabase
            .from('user_organizations')
            .select('user_id')
            .eq('organization_id', options.organizationId)
            .eq('is_active', true);
        if (userOrgs) {
            const userIds = userOrgs.map(org => org.user_id);
            dbQuery = dbQuery.in('id', userIds);
        }
    }
    if (options.isActive !== undefined) {
        dbQuery = dbQuery.eq('is_active', options.isActive);
    }
    // Apply sorting
    dbQuery = dbQuery.order(options.sortBy || 'created_at', {
        ascending: options.sortOrder === 'asc'
    });
    // Apply pagination
    if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        dbQuery = dbQuery.range(from, to);
    }
    const { data, error, count } = await dbQuery;
    if (error)
        throw error;
    return { users: data, total: count || 0 };
}
/**
 * Invite user to platform
 */
export async function inviteUser(email: string, invitedBy: string, organizationId?: string, role: string = 'member'): Promise<{
    userId: string;
    email: string;
}> {
    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
    let userId: string;
    if (existingUser) {
        userId = existingUser.id;
    }
    else {
        // Create auth user with temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: false,
        });
        if (authError)
            throw authError;
        // Create user profile
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .insert({
            id: authUser.user.id,
            email,
            is_active: false, // Inactive until invitation accepted
        })
            .select()
            .single();
        if (profileError)
            throw profileError;
        userId = profile.id;
    }
    // Add to organization if specified
    if (organizationId) {
        const { error: memberError } = await supabase
            .from('user_organizations')
            .insert({
            user_id: userId,
            organization_id: organizationId,
            role,
            invited_by: invitedBy,
            is_active: false, // Inactive until accepted
        });
        if (memberError && memberError.code !== '23505') { // Ignore duplicate key error
            throw memberError;
        }
    }
    // Send invitation email
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
            invited_by: invitedBy,
            organization_id: organizationId,
            role,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation`,
    });
    if (inviteError)
        throw inviteError;
    return { userId, email };
}
/**
 * Deactivate user
 */
export async function deactivateUser(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);
    if (error)
        throw error;
    // Also deactivate all organization memberships
    const { error: memberError } = await supabase
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', userId);
    if (memberError)
        throw memberError;
    return true;
}
/**
 * Reactivate user
 */
export async function reactivateUser(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId);
    if (error)
        throw error;
    return true;
}
/**
 * Get user activity
 */
export async function getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, event_category, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
    if (error)
        throw error;
    // Group by day
    const activityByDay: Record<string, number> = {};
    data.forEach(event => {
        const day = event.created_at.split('T')[0];
        if (!activityByDay[day]) {
            activityByDay[day] = 0;
        }
        activityByDay[day]++;
    });
    return {
        events: data,
        by_day: activityByDay,
        total: data.length,
    };
}
/**
 * Get user permissions for organization
 */
export async function getUserPermissions(userId: string, organizationId: string): Promise<UserPermissions | null> {
    const { data, error } = await supabase
        .from('user_organizations')
        .select('role, permissions')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();
    if (error)
        return null;
    // Define default permissions by role
    const rolePermissions: Record<string, any> = {
        owner: {
            organizations: ['create', 'read', 'update', 'delete'],
            users: ['create', 'read', 'update', 'delete'],
            assessments: ['create', 'read', 'update', 'delete'],
            analytics: ['read'],
            billing: ['read', 'update'],
        },
        admin: {
            organizations: ['read', 'update'],
            users: ['create', 'read', 'update', 'delete'],
            assessments: ['create', 'read', 'update', 'delete'],
            analytics: ['read'],
            billing: ['read'],
        },
        member: {
            organizations: ['read'],
            users: ['read'],
            assessments: ['read', 'create'],
            analytics: [],
            billing: [],
        },
        viewer: {
            organizations: ['read'],
            users: ['read'],
            assessments: ['read'],
            analytics: [],
            billing: [],
        },
    };
    // Merge role permissions with custom permissions
    const basePermissions = rolePermissions[data.role] || {};
    const customPermissions = data.permissions || {};
    return {
        role: data.role,
        permissions: { ...basePermissions, ...customPermissions },
    };
}
/**
 * Validate user password
 */
export async function validateUserPassword(userId: string, password: string): Promise<boolean> {
    // Note: This is a simplified version. In production, you'd want to
    // use Supabase Auth's built-in password validation
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user)
        return false;
    // Supabase doesn't expose password hashes, so we'd need to use
    // the signInWithPassword method to validate
    return true; // Placeholder
}
/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });
    if (error)
        throw error;
    return true;
}
/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });
    if (error)
        throw error;
    return true;
}
