/**
 * Lead Scoring Service
 * Calculates and manages lead scores based on BANT criteria and engagement
 */

import { injectable, inject } from 'inversify';
import { LeadRepository } from '../repositories/LeadRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { Lead } from '../types/lead.types';
import { TYPES } from '@/container/types';

@injectable()
export class LeadScoringService {
  private scoringRules = {
    budget: [
      { min: 100000, score: 30 },
      { min: 50000, score: 20 },
      { min: 10000, score: 10 }
    ],
    authority: {
      decision_maker: 25,
      influencer: 15,
      evaluator: 10,
      user: 5,
      unknown: 0
    },
    need: {
      hasDescription: 20,
      descriptionLength: {
        min: 100,
        score: 5
      }
    },
    timeline: {
      immediate: 25,
      this_quarter: 20,
      next_quarter: 15,
      this_year: 10,
      next_year: 5,
      unknown: 0
    },
    engagement: {
      emailOpened: 5,
      linkClicked: 10,
      formSubmitted: 15,
      demoRequested: 20
    },
    demographic: {
      validEmail: 5,
      hasPhone: 5,
      hasCompany: 10,
      hasJobTitle: 5
    }
  };

  constructor(
    @inject(TYPES.LeadRepository) private leadRepository: LeadRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Calculate comprehensive lead score
   */
  async calculateScore(leadId: number): Promise<number> {
    try {
      const lead = await this.leadRepository.findById(leadId, '0');

      if (!lead) {
        throw new Error('Lead not found');
      }

      let score = 0;

      // Budget scoring (B in BANT)
      score += this.calculateBudgetScore(lead);

      // Authority scoring (A in BANT)
      score += this.calculateAuthorityScore(lead);

      // Need scoring (N in BANT)
      score += this.calculateNeedScore(lead);

      // Timeline scoring (T in BANT)
      score += this.calculateTimelineScore(lead);

      // Engagement scoring
      const engagementScore = await this.calculateEngagementScore(leadId, lead.company_id);
      score += engagementScore;

      // Demographic scoring
      score += this.calculateDemographicScore(lead);

      // Apply modifiers
      score = this.applyModifiers(score, lead);

      // Cap at 100
      score = Math.min(score, 100);

      // Update lead score in database
      await this.leadRepository.update(leadId, String(lead.company_id), { score }, undefined);

      this.logger?.info('Lead score calculated', { leadId, score });

      return score;
    } catch (error) {
      this.logger?.error('Error calculating lead score', { error, leadId });
      throw error;
    }
  }

  /**
   * Calculate budget score
   */
  private calculateBudgetScore(lead: Lead): number {
    if (!lead.budget) return 0;

    for (const rule of this.scoringRules.budget) {
      if (lead.budget >= rule.min) {
        return rule.score;
      }
    }

    return 0;
  }

  /**
   * Calculate authority score
   */
  private calculateAuthorityScore(lead: Lead): number {
    if (!lead.authority_level) return 0;

    return this.scoringRules.authority[lead.authority_level] || 0;
  }

  /**
   * Calculate need score
   */
  private calculateNeedScore(lead: Lead): number {
    let score = 0;

    if (lead.need_description) {
      score += this.scoringRules.need.hasDescription;

      // Bonus for detailed description
      if (lead.need_description.length >= this.scoringRules.need.descriptionLength.min) {
        score += this.scoringRules.need.descriptionLength.score;
      }
    }

    return score;
  }

  /**
   * Calculate timeline score
   */
  private calculateTimelineScore(lead: Lead): number {
    if (!lead.timeline) return 0;

    return this.scoringRules.timeline[lead.timeline] || 0;
  }

  /**
   * Calculate engagement score based on activities
   */
  private async calculateEngagementScore(leadId: number, companyId: number): Promise<number> {
    const query = `
      SELECT
        COUNT(CASE WHEN type = 'email' AND status = 'completed' AND outcome LIKE '%opened%' THEN 1 END) as emails_opened,
        COUNT(CASE WHEN type = 'task' AND subject LIKE '%link%click%' THEN 1 END) as links_clicked,
        COUNT(CASE WHEN type = 'task' AND subject LIKE '%form%submit%' THEN 1 END) as forms_submitted,
        COUNT(CASE WHEN type = 'meeting' AND subject LIKE '%demo%' THEN 1 END) as demos_requested
      FROM public.activities
      WHERE lead_id = $1 AND company_id = $2
    `;

    const result = await this.leadRepository.db.query(query, [leadId, companyId]);
    const engagement = result.rows[0];

    let score = 0;
    score += Math.min(engagement.emails_opened * this.scoringRules.engagement.emailOpened, 15);
    score += Math.min(engagement.links_clicked * this.scoringRules.engagement.linkClicked, 20);
    score += Math.min(engagement.forms_submitted * this.scoringRules.engagement.formSubmitted, 15);
    score += Math.min(engagement.demos_requested * this.scoringRules.engagement.demoRequested, 20);

    return score;
  }

  /**
   * Calculate demographic score
   */
  private calculateDemographicScore(lead: Lead): number {
    let score = 0;

    // Valid email (basic check)
    if (lead.email && lead.email.includes('@') && !lead.email.includes('test')) {
      score += this.scoringRules.demographic.validEmail;
    }

    // Has phone number
    if (lead.phone || lead.mobile) {
      score += this.scoringRules.demographic.hasPhone;
    }

    // Has company information
    if (lead.company_name) {
      score += this.scoringRules.demographic.hasCompany;
    }

    // Has job title
    if (lead.job_title) {
      score += this.scoringRules.demographic.hasJobTitle;
    }

    return score;
  }

  /**
   * Apply scoring modifiers based on additional factors
   */
  private applyModifiers(baseScore: number, lead: Lead): number {
    let modifiedScore = baseScore;

    // Reduce score for disqualified leads
    if (lead.status === 'disqualified') {
      modifiedScore *= 0.3;
    }

    // Boost score for qualified leads
    if (lead.status === 'qualified') {
      modifiedScore *= 1.2;
    }

    // Reduce score for do-not-contact flags
    if (lead.do_not_call && lead.do_not_email) {
      modifiedScore *= 0.5;
    } else if (lead.do_not_call || lead.do_not_email) {
      modifiedScore *= 0.8;
    }

    // Reduce score for old leads (no activity in 30+ days)
    const daysSinceUpdate = lead.updated_at
      ? (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    if (daysSinceUpdate > 30) {
      modifiedScore *= 0.9;
    }
    if (daysSinceUpdate > 60) {
      modifiedScore *= 0.8;
    }
    if (daysSinceUpdate > 90) {
      modifiedScore *= 0.7;
    }

    return Math.round(modifiedScore);
  }

  /**
   * Bulk score update for all leads
   */
  async bulkUpdateScores(companyId: number): Promise<number> {
    try {
      const leads = await this.leadRepository.findAll(String(companyId));
      let updatedCount = 0;

      for (const lead of leads) {
        if (lead.id && lead.status !== 'converted') {
          try {
            await this.calculateScore(lead.id);
            updatedCount++;
          } catch (error) {
            this.logger?.error('Error updating lead score', { leadId: lead.id, error });
          }
        }
      }

      this.logger?.info('Bulk lead score update completed', {
        companyId,
        totalLeads: leads.length,
        updatedCount
      });

      return updatedCount;
    } catch (error) {
      this.logger?.error('Error in bulk score update', { error, companyId });
      throw error;
    }
  }

  /**
   * Get score breakdown for a lead
   */
  async getScoreBreakdown(leadId: number): Promise<any> {
    try {
      const lead = await this.leadRepository.findById(leadId, '0');

      if (!lead) {
        throw new Error('Lead not found');
      }

      const engagementScore = await this.calculateEngagementScore(leadId, lead.company_id);

      return {
        budget: this.calculateBudgetScore(lead),
        authority: this.calculateAuthorityScore(lead),
        need: this.calculateNeedScore(lead),
        timeline: this.calculateTimelineScore(lead),
        engagement: engagementScore,
        demographic: this.calculateDemographicScore(lead),
        total: lead.score
      };
    } catch (error) {
      this.logger?.error('Error getting score breakdown', { error, leadId });
      throw error;
    }
  }

  /**
   * Get leads by score range
   */
  async getLeadsByScoreRange(
    companyId: number,
    minScore: number,
    maxScore: number
  ): Promise<Lead[]> {
    try {
      return await this.leadRepository.findWithFilters(companyId, {
        minScore,
        maxScore
      });
    } catch (error) {
      this.logger?.error('Error getting leads by score range', {
        error,
        companyId,
        minScore,
        maxScore
      });
      throw error;
    }
  }

  /**
   * Identify hot leads (score >= 70)
   */
  async getHotLeads(companyId: number): Promise<Lead[]> {
    return this.getLeadsByScoreRange(companyId, 70, 100);
  }

  /**
   * Identify warm leads (score 40-69)
   */
  async getWarmLeads(companyId: number): Promise<Lead[]> {
    return this.getLeadsByScoreRange(companyId, 40, 69);
  }

  /**
   * Identify cold leads (score < 40)
   */
  async getColdLeads(companyId: number): Promise<Lead[]> {
    return this.getLeadsByScoreRange(companyId, 0, 39);
  }
}