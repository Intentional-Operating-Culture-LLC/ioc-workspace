import { APIError } from '../errors.js';

export class OrganizationService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * List organizations for a user
   */
  async listUserOrganizations({ userId, page = 1, limit = 10, search, role }) {
    // Build query
    let query = this.supabase
      .from('user_organizations')
      .select(`
        organization:organizations(*),
        role,
        permissions,
        joined_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Apply role filter
    if (role) {
      query = query.eq('role', role);
    }

    // Apply search filter
    if (search) {
      query = query.or(`organizations.name.ilike.%${search}%,organizations.slug.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new APIError('Failed to fetch organizations', 400, 'FETCH_ORGS_ERROR', error);
    }

    // Transform data to include organization details with user role
    const organizations = data.map(item => ({
      ...item.organization,
      user_role: item.role,
      user_permissions: item.permissions,
      joined_at: item.joined_at,
    }));

    return {
      organizations,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get single organization
   */
  async getOrganization(organizationId, userId) {
    const { data: organization, error } = await this.supabase
      .from('organizations')
      .select(`
        *,
        user_organizations!inner(
          role,
          permissions
        )
      `)
      .eq('id', organizationId)
      .eq('user_organizations.user_id', userId)
      .eq('user_organizations.is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new APIError('Organization not found or access denied', 404, 'ORG_NOT_FOUND');
      }
      throw new APIError('Failed to fetch organization', 400, 'FETCH_ORG_ERROR', error);
    }

    return {
      ...organization,
      user_role: organization.user_organizations[0].role,
      user_permissions: organization.user_organizations[0].permissions,
    };
  }

  /**
   * Create new organization
   */
  async createOrganization(data, createdBy) {
    const { name, slug, ...otherData } = data;

    // Generate slug if not provided
    const finalSlug = slug || this.generateSlug(name);

    // Check if slug is unique
    const { data: existing } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (existing) {
      throw new APIError('Organization slug already exists', 400, 'SLUG_EXISTS');
    }

    // Start transaction - create org and add creator as owner
    const { data: organization, error: createError } = await this.supabase
      .from('organizations')
      .insert({
        name,
        slug: finalSlug,
        ...otherData,
        created_by: createdBy,
      })
      .select()
      .single();

    if (createError) {
      throw new APIError('Failed to create organization', 400, 'CREATE_ORG_ERROR', createError);
    }

    // Add creator as owner
    const { error: memberError } = await this.supabase
      .from('user_organizations')
      .insert({
        user_id: createdBy,
        organization_id: organization.id,
        role: 'owner',
        permissions: ['*'], // All permissions for owner
      });

    if (memberError) {
      // Rollback by deleting org
      await this.supabase.from('organizations').delete().eq('id', organization.id);
      throw new APIError('Failed to add user to organization', 400, 'ADD_MEMBER_ERROR', memberError);
    }

    // Log analytics event
    await this.logAnalyticsEvent('organization_created', organization.id, createdBy, {
      organization_name: name,
    });

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId, updateData, updatedBy) {
    // Check if updating slug
    if (updateData.slug) {
      const { data: existing } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', organizationId)
        .single();

      if (existing) {
        throw new APIError('Organization slug already exists', 400, 'SLUG_EXISTS');
      }
    }

    const { data: updated, error } = await this.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to update organization', 400, 'UPDATE_ORG_ERROR', error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('organization_updated', organizationId, updatedBy, {
      updated_fields: Object.keys(updateData),
    });

    return updated;
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, deletedBy) {
    // Check if there are active users
    const { count } = await this.supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (count > 1) {
      throw new APIError('Cannot delete organization with active members', 400, 'HAS_ACTIVE_MEMBERS');
    }

    // Soft delete
    const { error } = await this.supabase
      .from('organizations')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (error) {
      throw new APIError('Failed to delete organization', 400, 'DELETE_ORG_ERROR', error);
    }

    // Deactivate all memberships
    await this.supabase
      .from('user_organizations')
      .update({ is_active: false })
      .eq('organization_id', organizationId);

    // Log analytics event
    await this.logAnalyticsEvent('organization_deleted', organizationId, deletedBy, {});

    return { message: 'Organization deleted successfully' };
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId) {
    // Get member count by role
    const { data: memberStats } = await this.supabase
      .from('user_organizations')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const membersByRole = memberStats.reduce((acc, { role }) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Get assessment count
    const { count: assessmentCount } = await this.supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentEvents } = await this.supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      members: {
        total: Object.values(membersByRole).reduce((a, b) => a + b, 0),
        by_role: membersByRole,
      },
      assessments: {
        total: assessmentCount || 0,
      },
      activity: {
        events_last_30_days: recentEvents || 0,
      },
    };
  }

  /**
   * Private helper methods
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async logAnalyticsEvent(eventType, organizationId, userId, eventData) {
    try {
      await this.supabase.from('analytics_events').insert({
        organization_id: organizationId,
        user_id: userId,
        event_type: eventType,
        event_category: 'organization',
        event_data: eventData,
      });
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }
}