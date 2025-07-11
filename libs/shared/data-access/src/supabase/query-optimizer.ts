/**
 * @fileoverview Supabase query optimizer to prevent N+1 queries and improve performance
 * @description Provides optimized query patterns and batching utilities
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryCache {
  data: any;
  timestamp: number;
  ttl: number;
}

export class SupabaseQueryOptimizer {
  private cache: Map<string, QueryCache> = new Map();
  private batchQueue: Map<string, Set<any>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(private supabase: SupabaseClient) {}

  /**
   * Batch multiple queries into a single request using RPC or joins
   */
  async batchQuery<T>(
    table: string,
    field: string,
    values: any[],
    select: string = '*'
  ): Promise<T[]> {
    const cacheKey = `${table}:${field}:${values.sort().join(',')}:${select}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Use 'in' operator for batch fetching
    const { data, error } = await this.supabase
      .from(table)
      .select(select)
      .in(field, values);

    if (error) throw error;

    // Cache results
    this.setCache(cacheKey, data, 60000); // 1 minute TTL
    
    return data as T[];
  }

  /**
   * Optimize dashboard queries by fetching all data in parallel
   */
  async fetchDashboardData(organizationId: string, userId: string) {
    const [
      metrics,
      recentAssessments,
      recentActivities,
      userOrgs
    ] = await Promise.all([
      this.fetchOrganizationMetrics(organizationId),
      this.fetchRecentAssessments(organizationId),
      this.fetchRecentActivities(organizationId),
      this.fetchUserOrganizations(userId)
    ]);

    return {
      metrics,
      recentAssessments,
      recentActivities,
      userOrgs
    };
  }

  /**
   * Fetch organization metrics with optimized queries
   */
  private async fetchOrganizationMetrics(organizationId: string) {
    const cacheKey = `metrics:${organizationId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Use RPC function if available for aggregated data
    try {
      const { data, error } = await this.supabase
        .rpc('get_organization_metrics', { org_id: organizationId });
      
      if (!error && data) {
        this.setCache(cacheKey, data, 300000); // 5 minutes TTL
        return data;
      }
    } catch (e) {
      // Fallback to manual calculation
    }

    // Parallel fetch all counts
    const [
      userCount,
      activeAssessmentCount,
      totalResponseCount,
      submittedResponseCount
    ] = await Promise.all([
      this.supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      
      this.supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active'),
      
      this.supabase
        .from('assessment_responses')
        .select('*, assessments!inner(organization_id)', { count: 'exact', head: true })
        .eq('assessments.organization_id', organizationId),
      
      this.supabase
        .from('assessment_responses')
        .select('*, assessments!inner(organization_id)', { count: 'exact', head: true })
        .eq('assessments.organization_id', organizationId)
        .eq('status', 'submitted')
    ]);

    const metrics = {
      total_users: userCount.count || 0,
      active_assessments: activeAssessmentCount.count || 0,
      total_responses: totalResponseCount.count || 0,
      submitted_responses: submittedResponseCount.count || 0,
      completion_rate: (totalResponseCount.count || 0) > 0 
        ? Math.round(((submittedResponseCount.count || 0) / (totalResponseCount.count || 1)) * 100) 
        : 0,
    };

    this.setCache(cacheKey, metrics, 300000); // 5 minutes TTL
    return metrics;
  }

  /**
   * Fetch recent assessments with proper joins to avoid N+1
   */
  private async fetchRecentAssessments(organizationId: string, limit: number = 5) {
    const cacheKey = `assessments:${organizationId}:recent:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase
      .from('assessments')
      .select(`
        id,
        title,
        type,
        status,
        created_at,
        start_date,
        end_date,
        created_by:users!assessments_created_by_fkey(id, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    this.setCache(cacheKey, data, 60000); // 1 minute TTL
    return data;
  }

  /**
   * Fetch recent activities with user data in single query
   */
  private async fetchRecentActivities(organizationId: string, limit: number = 10) {
    const cacheKey = `activities:${organizationId}:recent:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase
      .from('analytics_events')
      .select(`
        id,
        event_type,
        event_category,
        event_data,
        created_at,
        user:users(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    this.setCache(cacheKey, data, 30000); // 30 seconds TTL
    return data;
  }

  /**
   * Fetch user organizations with organization data
   */
  private async fetchUserOrganizations(userId: string) {
    const cacheKey = `user:${userId}:organizations`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase
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

    if (error) throw error;

    this.setCache(cacheKey, data, 300000); // 5 minutes TTL
    return data;
  }

  /**
   * Prefetch related data to avoid N+1 queries
   */
  async prefetchRelated<T>(
    items: T[],
    relation: string,
    foreignKey: string,
    select: string = '*'
  ): Promise<Map<any, any>> {
    if (items.length === 0) return new Map();

    // Extract unique foreign keys
    const foreignKeys = [...new Set(items.map((item: any) => item[foreignKey]).filter(Boolean))];
    
    if (foreignKeys.length === 0) return new Map();

    // Batch fetch related data
    const relatedData = await this.batchQuery(relation, 'id', foreignKeys, select);
    
    // Create lookup map
    const lookupMap = new Map();
    relatedData.forEach((item: any) => {
      lookupMap.set(item.id, item);
    });

    return lookupMap;
  }

  /**
   * Cache management utilities
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Create optimized select query with minimal fields
   */
  static createOptimizedSelect(fields: string[]): string {
    return fields.join(', ');
  }

  /**
   * Helper to create efficient pagination
   */
  static paginate(query: any, page: number = 1, pageSize: number = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return query.range(from, to);
  }
}

/**
 * React hook for optimized queries
 */
export function useOptimizedQuery(supabase: SupabaseClient) {
  const optimizer = new SupabaseQueryOptimizer(supabase);
  
  return {
    batchQuery: optimizer.batchQuery.bind(optimizer),
    fetchDashboardData: optimizer.fetchDashboardData.bind(optimizer),
    prefetchRelated: optimizer.prefetchRelated.bind(optimizer),
    clearCache: optimizer.clearCache.bind(optimizer)
  };
}