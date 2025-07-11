import { APIError } from '../errors.js';

export class UserService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * List users in organization with filters and pagination
   */
  async listUsers({ organizationId, search, role, department, page = 1, limit = 20 }) {
    // Build query
    let query = this.supabase
      .from('user_organizations')
      .select(`
        user:users!user_organizations_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          title,
          department,
          is_active,
          last_login_at,
          created_at
        ),
        role,
        permissions,
        joined_at,
        invited_by:users!user_organizations_invited_by_fkey(
          id,
          full_name
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (department) {
      query = query.eq('user.department', department);
    }

    if (search) {
      query = query.or(`user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new APIError('Failed to fetch users', 400, 'FETCH_USERS_ERROR', error);
    }

    // Transform data
    const users = data.map(item => ({
      ...item.user,
      role: item.role,
      permissions: item.permissions,
      joined_at: item.joined_at,
      invited_by: item.invited_by,
    }));

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Invite user to organization
   */
  async inviteUser({ email, organizationId, role, sendInvitationEmail, invitedBy }) {
    // Check if user already exists
    let invitedUserId;
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      invitedUserId = existingUser.id;

      // Check if already in organization
      const { data: existingMembership } = await this.supabase
        .from('user_organizations')
        .select('id, is_active')
        .eq('user_id', invitedUserId)
        .eq('organization_id', organizationId)
        .single();

      if (existingMembership) {
        if (existingMembership.is_active) {
          throw new APIError('User is already a member of this organization', 400, 'USER_ALREADY_MEMBER');
        } else {
          // Reactivate membership
          await this.supabase
            .from('user_organizations')
            .update({
              is_active: true,
              role,
              invited_by: invitedBy,
            })
            .eq('id', existingMembership.id);

          return {
            message: 'User membership reactivated',
            user_id: invitedUserId,
            reactivated: true,
          };
        }
      }
    } else {
      // Create pending user
      invitedUserId = await this.createPendingUser(email);
    }

    // Add user to organization
    const { error: membershipError } = await this.supabase
      .from('user_organizations')
      .insert({
        user_id: invitedUserId,
        organization_id: organizationId,
        role,
        invited_by: invitedBy,
        is_active: false, // Inactive until invitation accepted
      });

    if (membershipError) {
      throw new APIError('Failed to add user to organization', 400, 'ADD_USER_ERROR', membershipError);
    }

    // Send invitation email if requested
    if (sendInvitationEmail) {
      await this.sendInvitationEmail(email, organizationId, invitedBy, role);
    }

    // Log analytics event
    await this.logAnalyticsEvent('user_invited', organizationId, invitedBy, {
      invited_email: email,
      role,
    });

    return {
      message: 'User invited successfully',
      user_id: invitedUserId,
    };
  }

  /**
   * Update user profile
   */
  async updateUser(targetUserId, updateData, updatedBy) {
    const { data: updatedUser, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to update user', 400, 'UPDATE_USER_ERROR', error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('user_profile_updated', null, updatedBy, {
      updated_user_id: targetUserId,
      updated_fields: Object.keys(updateData),
    });

    return updatedUser;
  }

  /**
   * Remove user from organization
   */
  async removeUser({ userId, organizationId, removedBy }) {
    // Check if trying to remove the last owner
    const { data: targetMembership } = await this.supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (targetMembership?.role === 'owner') {
      const { count: ownerCount } = await this.supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'owner')
        .eq('is_active', true);

      if (ownerCount <= 1) {
        throw new APIError('Cannot remove the last owner', 400, 'LAST_OWNER_ERROR');
      }
    }

    // Soft delete by setting is_active to false
    const { error } = await this.supabase
      .from('user_organizations')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new APIError('Failed to remove user', 400, 'REMOVE_USER_ERROR', error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('user_removed', organizationId, removedBy, {
      removed_user_id: userId,
    });

    return { message: 'User removed successfully' };
  }

  /**
   * Check if user can update another user
   */
  async canUpdateUser(requesterId, targetUserId) {
    // Users can always update themselves
    if (requesterId === targetUserId) {
      return true;
    }

    // Must be admin in same organization
    const { data: adminOrgs } = await this.supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', requesterId)
      .in('role', ['owner', 'admin'])
      .eq('is_active', true);

    const adminOrgIds = adminOrgs?.map(o => o.organization_id) || [];

    const { data: targetUserOrgs } = await this.supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    const targetOrgIds = targetUserOrgs?.map(o => o.organization_id) || [];

    return adminOrgIds.some(id => targetOrgIds.includes(id));
  }

  /**
   * Private helper methods
   */
  async createPendingUser(email) {
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const { data: newAuthUser, error: signUpError } = await this.supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
    });

    if (signUpError) {
      throw new APIError('Failed to create user', 400, 'CREATE_USER_ERROR', signUpError);
    }

    // Create user profile
    const { data: newUser, error: profileError } = await this.supabase
      .from('users')
      .insert({
        id: newAuthUser.user.id,
        email,
        is_active: false, // Inactive until they accept invitation
      })
      .select()
      .single();

    if (profileError) {
      throw new APIError('Failed to create user profile', 400, 'CREATE_PROFILE_ERROR', profileError);
    }

    return newUser.id;
  }

  async sendInvitationEmail(email, organizationId, invitedBy, role) {
    // Get organization details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Get inviter details
    const { data: inviter } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', invitedBy)
      .single();

    // Send invitation email via Supabase
    const { error } = await this.supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          organization_id: organizationId,
          organization_name: org?.name,
          invited_by: inviter?.email,
          role,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation`,
      }
    );

    if (error) {
      console.error('Failed to send invitation email:', error);
      // Don't throw, just log - email failure shouldn't break the invitation
    }
  }

  async logAnalyticsEvent(eventType, organizationId, userId, eventData) {
    try {
      await this.supabase.from('analytics_events').insert({
        organization_id: organizationId,
        user_id: userId,
        event_type: eventType,
        event_category: 'user_management',
        event_data: eventData,
      });
    } catch (error) {
      console.error('Failed to log analytics event:', error);
      // Don't throw, analytics shouldn't break core functionality
    }
  }
}