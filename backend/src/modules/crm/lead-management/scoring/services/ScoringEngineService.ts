/**
 * Scoring Engine Service
 * Calculates and manages lead scores
 * Works independently without external APIs
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { LeadRepository } from '../../../repositories/LeadRepository';
import { EventEmitter } from 'events';

export interface IScoringResult {
  total_score: number;
  demographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  fit_score: number;
  grade: string;
  temperature: string;
  recommendations: string[];
}

@injectable()
export class ScoringEngineService {
  private scoringWeights = {
    demographic: 0.30,   // BANT criteria
    behavioral: 0.25,    // Actions taken
    engagement: 0.25,    // Interaction frequency
    fit: 0.20           // ICP match
  };

  constructor(
    @inject('LeadRepository') private leadRepo: LeadRepository,
    @inject('DatabaseConnection') private db: Pool,
    @inject('EventBus') private eventBus: EventEmitter
  ) {}

  /**
   * Calculate comprehensive lead score
   */
  async calculateLeadScore(leadId: number): Promise<IScoringResult> {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Calculate individual score components
    const scores = await Promise.all([
      this.calculateDemographicScore(lead),
      this.calculateBehavioralScore(leadId),
      this.calculateEngagementScore(leadId),
      this.calculateFitScore(lead)
    ]);

    const [demographic, behavioral, engagement, fit] = scores;

    // Calculate weighted total
    const total = Math.round(
      demographic * this.scoringWeights.demographic +
      behavioral * this.scoringWeights.behavioral +
      engagement * this.scoringWeights.engagement +
      fit * this.scoringWeights.fit
    );

    // Determine grade and temperature
    const grade = this.calculateGrade(total);
    const temperature = this.calculateTemperature(behavioral, engagement);

    // Generate actionable recommendations
    const recommendations = this.generateRecommendations({
      lead,
      scores: { demographic, behavioral, engagement, fit },
      total,
      grade,
      temperature
    });

    // Save score to database using SQL function
    await this.saveScoring(leadId, {
      total_score: total,
      demographic_score: demographic,
      behavioral_score: behavioral,
      engagement_score: engagement,
      fit_score: fit,
      grade,
      temperature
    });

    // Emit scoring event
    this.eventBus.emit('lead.scored', {
      leadId,
      score: total,
      grade,
      temperature,
      timestamp: new Date()
    });

    return {
      total_score: total,
      demographic_score: demographic,
      behavioral_score: behavioral,
      engagement_score: engagement,
      fit_score: fit,
      grade,
      temperature,
      recommendations
    };
  }

  /**
   * Calculate demographic score based on BANT
   */
  private async calculateDemographicScore(lead: any): Promise<number> {
    let score = 0;

    // Budget scoring (0-30 points)
    if (lead.budget) {
      if (lead.budget >= 100000) score += 30;
      else if (lead.budget >= 50000) score += 25;
      else if (lead.budget >= 25000) score += 20;
      else if (lead.budget >= 10000) score += 15;
      else if (lead.budget >= 5000) score += 10;
      else score += 5;
    }

    // Authority scoring (0-25 points)
    const authorityScores: Record<string, number> = {
      'decision_maker': 25,
      'influencer': 20,
      'evaluator': 15,
      'user': 10,
      'other': 5
    };
    score += authorityScores[lead.authority_level] || 0;

    // Need scoring (0-25 points)
    if (lead.need_description) {
      const needLength = lead.need_description.length;
      if (needLength > 500) score += 25;
      else if (needLength > 300) score += 20;
      else if (needLength > 150) score += 15;
      else if (needLength > 50) score += 10;
      else score += 5;
    }

    // Timeline scoring (0-20 points)
    const timelineScores: Record<string, number> = {
      'immediate': 20,
      '1_month': 18,
      '3_months': 15,
      '6_months': 10,
      '1_year': 5,
      'unknown': 2
    };
    score += timelineScores[lead.timeline] || 0;

    return Math.min(score, 100);
  }

  /**
   * Calculate behavioral score based on actions
   */
  private async calculateBehavioralScore(leadId: number): Promise<number> {
    // Check if scoring history exists
    const historyQuery = `
      SELECT COUNT(*) as update_count,
             MAX(created_at) as last_update
      FROM lead_scoring_history
      WHERE lead_id = $1
    `;

    const history = await this.db.query(historyQuery, [leadId]);
    const updateCount = parseInt(history.rows[0]?.update_count || 0);

    let score = 0;

    // Points for being in the system (shows interest)
    if (updateCount > 0) score += 10;

    // Points for multiple updates (shows engagement)
    if (updateCount >= 5) score += 20;
    else if (updateCount >= 3) score += 15;
    else if (updateCount >= 2) score += 10;

    // Check lead status progression
    const lead = await this.leadRepo.findById(leadId);
    const statusScores: Record<string, number> = {
      'new': 5,
      'contacted': 15,
      'qualified': 30,
      'proposal': 40,
      'negotiation': 45
    };
    score += statusScores[lead?.status || 'new'] || 0;

    // Check if lead has been assigned (shows it's being worked)
    if (lead?.assigned_to) score += 10;

    // Check for manual notes or custom fields (shows personalization)
    if (lead?.custom_fields && Object.keys(lead.custom_fields).length > 0) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate engagement score
   */
  private async calculateEngagementScore(leadId: number): Promise<number> {
    const query = `
      SELECT
        COUNT(DISTINCT event_type) as event_diversity,
        COUNT(*) as total_events,
        SUM(score_impact) as total_impact,
        MAX(occurred_at) as last_engagement,
        COUNT(DISTINCT DATE(occurred_at)) as active_days
      FROM lead_engagement_events
      WHERE lead_id = $1
        AND occurred_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await this.db.query(query, [leadId]);
    const metrics = result.rows[0];

    let score = 0;

    // Event diversity (0-25 points)
    const diversity = parseInt(metrics?.event_diversity || 0);
    if (diversity >= 5) score += 25;
    else if (diversity >= 3) score += 20;
    else if (diversity >= 2) score += 15;
    else if (diversity >= 1) score += 10;

    // Event frequency (0-25 points)
    const totalEvents = parseInt(metrics?.total_events || 0);
    if (totalEvents >= 20) score += 25;
    else if (totalEvents >= 10) score += 20;
    else if (totalEvents >= 5) score += 15;
    else if (totalEvents >= 2) score += 10;
    else if (totalEvents >= 1) score += 5;

    // Recency (0-25 points)
    if (metrics?.last_engagement) {
      const daysSinceEngagement = Math.floor(
        (Date.now() - new Date(metrics.last_engagement).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceEngagement <= 1) score += 25;
      else if (daysSinceEngagement <= 3) score += 20;
      else if (daysSinceEngagement <= 7) score += 15;
      else if (daysSinceEngagement <= 14) score += 10;
      else if (daysSinceEngagement <= 30) score += 5;
    }

    // Active days (0-25 points)
    const activeDays = parseInt(metrics?.active_days || 0);
    if (activeDays >= 10) score += 25;
    else if (activeDays >= 5) score += 20;
    else if (activeDays >= 3) score += 15;
    else if (activeDays >= 1) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate fit score (ICP matching)
   */
  private async calculateFitScore(lead: any): Promise<number> {
    let score = 0;

    // Company size fit (0-25 points)
    if (lead.employee_count) {
      // Assume ideal is 100-1000 employees
      if (lead.employee_count >= 100 && lead.employee_count <= 1000) {
        score += 25;
      } else if (lead.employee_count >= 50 && lead.employee_count <= 5000) {
        score += 15;
      } else if (lead.employee_count >= 10) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // Revenue fit (0-25 points)
    if (lead.annual_revenue) {
      // Assume ideal is $10M-$100M
      if (lead.annual_revenue >= 10000000 && lead.annual_revenue <= 100000000) {
        score += 25;
      } else if (lead.annual_revenue >= 1000000) {
        score += 15;
      } else if (lead.annual_revenue >= 100000) {
        score += 10;
      }
    }

    // Industry fit (0-25 points)
    // Would normally check against ideal industries
    if (lead.industry_id) {
      score += 15; // Placeholder - would match against ICP industries
    }

    // Geographic fit (0-25 points)
    if (lead.city_id || lead.country) {
      score += 15; // Placeholder - would match against target regions
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate grade based on score
   */
  private calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Calculate temperature based on activity
   */
  private calculateTemperature(behavioral: number, engagement: number): string {
    const avgActivity = (behavioral + engagement) / 2;

    if (avgActivity >= 70) return 'hot';
    if (avgActivity >= 40) return 'warm';
    if (avgActivity >= 20) return 'cool';
    return 'cold';
  }

  /**
   * Generate recommendations based on scoring
   */
  private generateRecommendations(context: any): string[] {
    const recommendations = [];
    const { lead, scores, temperature, grade } = context;

    // Temperature-based recommendations
    if (temperature === 'hot') {
      recommendations.push('🔥 Contact immediately - high engagement detected');
      recommendations.push('Schedule a demo or discovery call');
      recommendations.push('Send pricing information');
    } else if (temperature === 'warm') {
      recommendations.push('Send personalized follow-up within 24 hours');
      recommendations.push('Share relevant case studies');
      recommendations.push('Invite to webinar or event');
    } else if (temperature === 'cool') {
      recommendations.push('Add to nurturing campaign');
      recommendations.push('Send educational content');
      recommendations.push('Schedule check-in for next quarter');
    } else {
      recommendations.push('Add to long-term nurture sequence');
      recommendations.push('Send monthly newsletter');
      recommendations.push('Re-evaluate in 6 months');
    }

    // Grade-based recommendations
    if (grade.startsWith('A')) {
      recommendations.push('✨ High-quality lead - prioritize for sales team');
    } else if (grade.startsWith('B')) {
      recommendations.push('Good potential - qualify further');
    }

    // Score-specific recommendations
    if (scores.demographic < 50) {
      recommendations.push('📋 Gather more BANT information');
    }

    if (scores.engagement < 30) {
      recommendations.push('📧 Increase engagement through targeted content');
    }

    if (scores.fit < 40) {
      recommendations.push('🎯 Evaluate fit with ideal customer profile');
    }

    // Timeline-based recommendations
    if (lead.timeline === 'immediate') {
      recommendations.push('⚡ Fast-track through sales process');
    }

    return recommendations;
  }

  /**
   * Save scoring to database
   */
  private async saveScoring(leadId: number, scores: any): Promise<void> {
    // Use the database function we created in migration
    const query = `SELECT * FROM calculate_advanced_lead_score($1)`;
    await this.db.query(query, [leadId]);

    // Update lead with latest score
    await this.leadRepo.update(leadId, { score: scores.total_score });
  }

  /**
   * Bulk score calculation
   */
  async bulkCalculateScores(leadIds: number[]): Promise<IScoringResult[]> {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const score = await this.calculateLeadScore(leadId);
        results.push(score);
      } catch (error) {
        console.error(`Error scoring lead ${leadId}:`, error);
        results.push(null);
      }
    }

    return results.filter(r => r !== null) as IScoringResult[];
  }

  /**
   * Recalculate scores for all leads in a company
   */
  async recalculateCompanyScores(companyId: number): Promise<void> {
    const leads = await this.leadRepo.findByCompany(companyId);

    for (const lead of leads.leads) {
      try {
        await this.calculateLeadScore(lead.id);
      } catch (error) {
        console.error(`Error recalculating score for lead ${lead.id}:`, error);
      }
    }

    this.eventBus.emit('scores.recalculation_complete', {
      companyId,
      count: leads.total
    });
  }
}