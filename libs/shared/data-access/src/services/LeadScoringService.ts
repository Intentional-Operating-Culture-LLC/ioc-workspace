/**
 * Lead Scoring Service
 * Provides unified lead scoring functionality across the platform
 */

import {
  ILeadScoringService,
  ServiceHealth,
  Lead,
  LeadActivity,
  LeadScore,
  ScoreBreakdown,
  ScoreComponent,
  ScoreHistoryItem,
  ScoringRule
} from './interfaces';
import { configurationService } from './ConfigurationService';
import { supabase } from '../supabase/client';

export class LeadScoringService implements ILeadScoringService {
  name = 'LeadScoringService';
  private scoringRules: Map<string, ScoringRule[]> = new Map();
  private scoreCache: Map<string, LeadScore> = new Map();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Lead Scoring Service...');
    await this.loadScoringRules();
    console.log('✅ Lead Scoring Service initialized');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Lead Scoring Service...');
    this.scoreCache.clear();
    this.scoringRules.clear();
    console.log('✅ Lead Scoring Service shut down');
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      // Check if we can access scoring rules
      const rules = await this.getScoringRules();
      const rulesLoaded = rules.length > 0;

      return {
        status: rulesLoaded ? 'healthy' : 'degraded',
        message: rulesLoaded ? 'Lead scoring rules loaded' : 'No scoring rules found',
        lastCheck: new Date(),
        details: {
          rulesCount: rules.length,
          cacheSize: this.scoreCache.size,
          categoriesLoaded: Array.from(this.scoringRules.keys())
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
        lastCheck: new Date(),
        details: { error: error.message }
      };
    }
  }

  async calculateScore(lead: Lead): Promise<LeadScore> {
    // Check cache first
    const cached = this.scoreCache.get(lead.id);
    if (cached && (Date.now() - cached.calculatedAt.getTime()) < this.cacheExpiry) {
      return cached;
    }

    const breakdown = {
      demographic: 0,
      behavioral: 0,
      engagement: 0
    };

    // Calculate demographic score
    breakdown.demographic = await this.calculateDemographicScore(lead);

    // Calculate behavioral score
    breakdown.behavioral = await this.calculateBehavioralScore(lead);

    // Calculate engagement score (requires activity history)
    const activities = await this.getLeadActivities(lead.id);
    breakdown.engagement = this.calculateEngagementScore(activities);

    // Apply negative scoring
    const negativeScore = await this.calculateNegativeScore(lead, activities);
    
    // Calculate total score
    const totalScore = Math.max(0, 
      breakdown.demographic + 
      breakdown.behavioral + 
      breakdown.engagement + 
      negativeScore
    );

    // Determine temperature
    const thresholds = configurationService.get<any>('leadScoring.thresholds');
    let temperature: 'hot' | 'warm' | 'cold' = 'cold';
    
    if (totalScore >= thresholds.hot) {
      temperature = 'hot';
    } else if (totalScore >= thresholds.warm) {
      temperature = 'warm';
    }

    const leadScore: LeadScore = {
      leadId: lead.id,
      score: totalScore,
      temperature,
      breakdown,
      calculatedAt: new Date()
    };

    // Cache the score
    this.scoreCache.set(lead.id, leadScore);

    // Store in database
    await this.storeLeadScore(leadScore);

    return leadScore;
  }

  async updateScore(leadId: string, activities: LeadActivity[]): Promise<LeadScore> {
    // Get lead data
    const lead = await this.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Clear cache to force recalculation
    this.scoreCache.delete(leadId);

    // Store new activities
    await this.storeLeadActivities(leadId, activities);

    // Recalculate score
    return this.calculateScore(lead);
  }

  async getScoreBreakdown(leadId: string): Promise<ScoreBreakdown> {
    const lead = await this.getLead(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const currentScore = await this.calculateScore(lead);
    const components: ScoreComponent[] = [];
    const history = await this.getScoreHistory(leadId);

    // Get demographic components
    const demographicRules = configurationService.get<any>('leadScoring.rules.demographic');
    
    if (lead.title && demographicRules.title[lead.title]) {
      components.push({
        category: 'demographic',
        field: 'title',
        value: lead.title,
        points: demographicRules.title[lead.title],
        reason: 'Job title scoring'
      });
    }

    if (lead.companySize && demographicRules.companySize[lead.companySize]) {
      components.push({
        category: 'demographic',
        field: 'companySize',
        value: lead.companySize,
        points: demographicRules.companySize[lead.companySize],
        reason: 'Company size scoring'
      });
    }

    if (lead.industry && demographicRules.industry[lead.industry]) {
      components.push({
        category: 'demographic',
        field: 'industry',
        value: lead.industry,
        points: demographicRules.industry[lead.industry],
        reason: 'Industry scoring'
      });
    }

    // Get behavioral components
    const behavioralRules = configurationService.get<any>('leadScoring.rules.behavioral');
    
    if (lead.source && behavioralRules.leadSource[lead.source]) {
      components.push({
        category: 'behavioral',
        field: 'source',
        value: lead.source,
        points: behavioralRules.leadSource[lead.source],
        reason: 'Lead source scoring'
      });
    }

    // Get engagement components
    const activities = await this.getLeadActivities(leadId);
    const engagementRules = behavioralRules.engagement;
    const activityCounts = this.countActivities(activities);

    for (const [activityType, count] of Object.entries(activityCounts)) {
      const mappedType = this.mapActivityType(activityType);
      if (mappedType && engagementRules[mappedType]) {
        const points = engagementRules[mappedType] * (count as number);
        components.push({
          category: 'engagement',
          field: activityType,
          value: count,
          points,
          reason: `${count} ${activityType} activities`
        });
      }
    }

    return {
      leadId,
      totalScore: currentScore.score,
      components,
      history
    };
  }

  async getScoringRules(): Promise<ScoringRule[]> {
    const rules: ScoringRule[] = [];
    let ruleId = 1;

    // Convert configuration rules to ScoringRule format
    const configRules = configurationService.get<any>('leadScoring.rules');

    // Demographic rules
    for (const [field, values] of Object.entries(configRules.demographic)) {
      for (const [value, points] of Object.entries(values as any)) {
        rules.push({
          id: `rule_${ruleId++}`,
          category: 'demographic',
          field,
          condition: 'equals',
          value,
          points: points as number,
          active: true
        });
      }
    }

    // Behavioral rules
    for (const [field, values] of Object.entries(configRules.behavioral)) {
      for (const [value, points] of Object.entries(values as any)) {
        rules.push({
          id: `rule_${ruleId++}`,
          category: 'behavioral',
          field,
          condition: 'equals',
          value,
          points: points as number,
          active: true
        });
      }
    }

    // Negative rules
    for (const [field, values] of Object.entries(configRules.negative)) {
      for (const [value, points] of Object.entries(values as any)) {
        rules.push({
          id: `rule_${ruleId++}`,
          category: 'negative',
          field,
          condition: field === 'email' ? 'contains' : 'equals',
          value,
          points: points as number,
          active: true
        });
      }
    }

    return rules;
  }

  async updateScoringRules(rules: ScoringRule[]): Promise<void> {
    // Group rules by category
    this.scoringRules.clear();
    
    for (const rule of rules) {
      if (!this.scoringRules.has(rule.category)) {
        this.scoringRules.set(rule.category, []);
      }
      this.scoringRules.get(rule.category)!.push(rule);
    }

    // Clear score cache as rules have changed
    this.scoreCache.clear();

    // Store rules in database
    await this.storeScoringRules(rules);
  }

  private async loadScoringRules(): Promise<void> {
    // Load from configuration initially
    const rules = await this.getScoringRules();
    await this.updateScoringRules(rules);
  }

  private async calculateDemographicScore(lead: Lead): Promise<number> {
    let score = 0;
    const rules = configurationService.get<any>('leadScoring.rules.demographic');

    if (lead.title && rules.title[lead.title]) {
      score += rules.title[lead.title];
    }

    if (lead.companySize && rules.companySize[lead.companySize]) {
      score += rules.companySize[lead.companySize];
    }

    if (lead.industry && rules.industry[lead.industry]) {
      score += rules.industry[lead.industry];
    }

    return score;
  }

  private async calculateBehavioralScore(lead: Lead): Promise<number> {
    let score = 0;
    const rules = configurationService.get<any>('leadScoring.rules.behavioral');

    if (lead.source && rules.leadSource[lead.source]) {
      score += rules.leadSource[lead.source];
    }

    // Check custom fields for primary interest
    const primaryInterest = lead.customFields?.primaryInterest;
    if (primaryInterest && rules.primaryInterest[primaryInterest]) {
      score += rules.primaryInterest[primaryInterest];
    }

    return score;
  }

  private calculateEngagementScore(activities: LeadActivity[]): number {
    let score = 0;
    const rules = configurationService.get<any>('leadScoring.rules.behavioral.engagement');
    
    for (const activity of activities) {
      const mappedType = this.mapActivityType(activity.type);
      if (mappedType && rules[mappedType]) {
        score += rules[mappedType];
      }
    }

    return score;
  }

  private async calculateNegativeScore(lead: Lead, activities: LeadActivity[]): Promise<number> {
    let score = 0;
    const rules = configurationService.get<any>('leadScoring.rules.negative');

    // Check email patterns
    if (lead.email && rules.email) {
      for (const [pattern, points] of Object.entries(rules.email)) {
        if (lead.email.includes(pattern)) {
          score += points as number;
        }
      }
    }

    // Check behaviors
    if (rules.behavior) {
      // Check for unsubscribe
      const hasUnsubscribed = activities.some(a => 
        a.type === 'email_open' && a.details?.unsubscribed === true
      );
      if (hasUnsubscribed && rules.behavior['Unsubscribed']) {
        score += rules.behavior['Unsubscribed'];
      }

      // Check for bounced email
      const hasBounced = activities.some(a => 
        a.type === 'email_open' && a.details?.bounced === true
      );
      if (hasBounced && rules.behavior['Bounced Email']) {
        score += rules.behavior['Bounced Email'];
      }

      // Check for no response
      const lastActivity = activities[activities.length - 1];
      if (lastActivity) {
        const daysSinceLastActivity = (Date.now() - lastActivity.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastActivity > 30 && rules.behavior['No Response 30 Days']) {
          score += rules.behavior['No Response 30 Days'];
        }
      }
    }

    return score;
  }

  private mapActivityType(type: string): string | null {
    const mapping: Record<string, string> = {
      'website_visit': 'Website Visit',
      'email_open': 'Email Open',
      'email_click': 'Email Click',
      'form_submission': 'Form Submission',
      'demo_request': 'Demo Attended',
      'content_download': 'Form Submission'
    };

    return mapping[type] || null;
  }

  private countActivities(activities: LeadActivity[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const activity of activities) {
      counts[activity.type] = (counts[activity.type] || 0) + 1;
    }

    return counts;
  }

  private async getLead(leadId: string): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching lead:', error);
      return null;
    }
  }

  private async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      return [];
    }
  }

  private async storeLeadActivities(leadId: string, activities: LeadActivity[]): Promise<void> {
    try {
      const records = activities.map(activity => ({
        lead_id: leadId,
        type: activity.type,
        timestamp: activity.timestamp,
        details: activity.details
      }));

      const { error } = await supabase
        .from('lead_activities')
        .insert(records);

      if (error) throw error;
    } catch (error) {
      console.error('Error storing lead activities:', error);
    }
  }

  private async storeLeadScore(score: LeadScore): Promise<void> {
    try {
      const { error } = await supabase
        .from('lead_scores')
        .upsert({
          lead_id: score.leadId,
          score: score.score,
          temperature: score.temperature,
          demographic_score: score.breakdown.demographic,
          behavioral_score: score.breakdown.behavioral,
          engagement_score: score.breakdown.engagement,
          calculated_at: score.calculatedAt
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing lead score:', error);
    }
  }

  private async getScoreHistory(leadId: string): Promise<ScoreHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('lead_score_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data?.map(item => ({
        timestamp: new Date(item.timestamp),
        score: item.score,
        change: item.change,
        reason: item.reason
      })) || [];
    } catch (error) {
      console.error('Error fetching score history:', error);
      return [];
    }
  }

  private async storeScoringRules(rules: ScoringRule[]): Promise<void> {
    try {
      // Store rules in a configuration table
      const { error } = await supabase
        .from('scoring_rules')
        .upsert(rules.map(rule => ({
          id: rule.id,
          category: rule.category,
          field: rule.field,
          condition: rule.condition,
          value: rule.value,
          points: rule.points,
          active: rule.active
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error storing scoring rules:', error);
    }
  }
}

// Export singleton instance
export const leadScoringService = new LeadScoringService();