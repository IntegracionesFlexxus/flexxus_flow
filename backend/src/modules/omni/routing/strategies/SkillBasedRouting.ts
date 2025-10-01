/**
 * Skill-Based Routing Strategy - Sprint 10
 * Routes conversations based on agent skills and customer requirements
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { IRoutingStrategy, IRoutingDecision, IRoutingContext } from '../interfaces/IRouting';

export interface ISkill {
  id: string;
  name: string;
  category: 'technical' | 'product' | 'language' | 'soft_skill' | 'department';
  description?: string;
  is_active: boolean;
}

export interface IAgentSkill {
  agent_id: string;
  skill_id: string;
  proficiency_level: number; // 1-10
  verified: boolean;
  last_used?: Date;
  usage_count: number;
}

export interface ICustomerRequirement {
  conversation_id: string;
  required_skills: string[];
  preferred_skills: string[];
  language: string;
  department?: string;
  priority_level: number;
  complexity_score?: number;
}

@injectable()
export class SkillBasedRouting implements IRoutingStrategy {
  private logger: any;

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async route(context: IRoutingContext): Promise<IRoutingDecision> {
    const startTime = Date.now();

    try {
      // 1. Analyze customer requirements
      const requirements = await this.analyzeCustomerRequirements(context);

      // 2. Get available agents with skills
      const availableAgents = await this.getAvailableAgentsWithSkills(context.company_id);

      // 3. Score agents based on skill match
      const scoredAgents = await this.scoreAgentsBySkills(availableAgents, requirements);

      // 4. Apply additional filters and ranking
      const rankedAgents = this.rankAgentsBySkillFit(scoredAgents, requirements);

      // 5. Select best agent
      const selectedAgent = rankedAgents.length > 0 ? rankedAgents[0] : null;

      const decision: IRoutingDecision = {
        agent_id: selectedAgent?.agent_id || null,
        routing_strategy: 'skill_based',
        confidence: this.calculateConfidence(selectedAgent, requirements),
        reasoning: this.generateReasoning(selectedAgent, requirements, rankedAgents),
        fallback_required: !selectedAgent,
        metadata: {
          requirements,
          agents_evaluated: availableAgents.length,
          top_agents: rankedAgents.slice(0, 3).map(a => ({
            agent_id: a.agent_id,
            score: a.skill_score,
            matched_skills: a.matched_skills
          })),
          processing_time_ms: Date.now() - startTime
        }
      };

      this.logger.info('Skill-based routing completed', {
        conversation_id: context.conversation_id,
        selected_agent: selectedAgent?.agent_id,
        confidence: decision.confidence,
        processing_time: Date.now() - startTime
      });

      return decision;
    } catch (error: any) {
      this.logger.error('Skill-based routing failed', error);
      throw error;
    }
  }

  /**
   * Analyze customer requirements from conversation context
   */
  private async analyzeCustomerRequirements(
    context: IRoutingContext
  ): Promise<ICustomerRequirement> {
    try {
      // Get conversation messages for analysis
      const messages = await this.getConversationMessages(context.conversation_id);

      // Analyze content for skill requirements
      const requiredSkills = await this.extractRequiredSkills(messages);
      const language = await this.detectLanguage(messages);
      const department = await this.inferDepartment(messages, context);
      const complexity = this.calculateComplexityScore(messages);

      // Get customer tags and preferences
      const customerPreferences = await this.getCustomerPreferences(
        context.customer_id,
        context.company_id
      );

      return {
        conversation_id: context.conversation_id,
        required_skills: requiredSkills.required,
        preferred_skills: requiredSkills.preferred,
        language,
        department,
        priority_level: context.priority || 3,
        complexity_score: complexity
      };
    } catch (error: any) {
      this.logger.error('Failed to analyze customer requirements', error);

      // Return default requirements
      return {
        conversation_id: context.conversation_id,
        required_skills: [],
        preferred_skills: [],
        language: 'en',
        priority_level: 3
      };
    }
  }

  /**
   * Get available agents with their skills
   */
  private async getAvailableAgentsWithSkills(companyId: string): Promise<any[]> {
    const query = `
      WITH agent_skills AS (
        SELECT
          a.id as agent_id,
          a.name,
          a.email,
          a.status,
          a.availability_status,
          a.current_conversations,
          a.max_concurrent_conversations,
          a.skill_tags,
          json_agg(
            json_build_object(
              'skill_id', s.id,
              'skill_name', s.name,
              'skill_category', s.category,
              'proficiency_level', ags.proficiency_level,
              'verified', ags.verified,
              'last_used', ags.last_used,
              'usage_count', ags.usage_count
            )
          ) FILTER (WHERE s.id IS NOT NULL) as skills
        FROM agents a
        LEFT JOIN agent_skills ags ON a.id = ags.agent_id
        LEFT JOIN skills s ON ags.skill_id = s.id AND s.is_active = true
        WHERE a.company_id = $1
          AND a.is_active = true
          AND a.availability_status IN ('available', 'busy')
          AND a.current_conversations < a.max_concurrent_conversations
        GROUP BY a.id, a.name, a.email, a.status, a.availability_status,
                 a.current_conversations, a.max_concurrent_conversations, a.skill_tags
      )
      SELECT * FROM agent_skills
      ORDER BY
        CASE availability_status
          WHEN 'available' THEN 1
          WHEN 'busy' THEN 2
        END,
        current_conversations ASC;
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Score agents based on skill match with requirements
   */
  private async scoreAgentsBySkills(
    agents: any[],
    requirements: ICustomerRequirement
  ): Promise<any[]> {
    return agents.map(agent => {
      const skillScore = this.calculateSkillMatchScore(agent, requirements);
      const availabilityScore = this.calculateAvailabilityScore(agent);
      const experienceScore = this.calculateExperienceScore(agent, requirements);

      const totalScore = (skillScore * 0.6) + (availabilityScore * 0.2) + (experienceScore * 0.2);

      return {
        ...agent,
        skill_score: skillScore,
        availability_score: availabilityScore,
        experience_score: experienceScore,
        total_score: totalScore,
        matched_skills: this.getMatchedSkills(agent, requirements),
        missing_skills: this.getMissingSkills(agent, requirements)
      };
    });
  }

  /**
   * Calculate skill match score between agent and requirements
   */
  private calculateSkillMatchScore(agent: any, requirements: ICustomerRequirement): number {
    const agentSkills = agent.skills || [];
    const requiredSkills = requirements.required_skills;
    const preferredSkills = requirements.preferred_skills;

    if (requiredSkills.length === 0 && preferredSkills.length === 0) {
      return 0.5; // Neutral score when no specific skills required
    }

    let score = 0;
    let maxScore = 0;

    // Check required skills (higher weight)
    requiredSkills.forEach(skillName => {
      maxScore += 10;
      const agentSkill = agentSkills.find((s: any) =>
        s.skill_name.toLowerCase() === skillName.toLowerCase()
      );

      if (agentSkill) {
        score += agentSkill.proficiency_level * (agentSkill.verified ? 1.2 : 1.0);
      }
    });

    // Check preferred skills (lower weight)
    preferredSkills.forEach(skillName => {
      maxScore += 5;
      const agentSkill = agentSkills.find((s: any) =>
        s.skill_name.toLowerCase() === skillName.toLowerCase()
      );

      if (agentSkill) {
        score += (agentSkill.proficiency_level * 0.5) * (agentSkill.verified ? 1.2 : 1.0);
      }
    });

    // Language match bonus
    if (requirements.language) {
      maxScore += 5;
      const languageSkill = agentSkills.find((s: any) =>
        s.skill_category === 'language' &&
        s.skill_name.toLowerCase().includes(requirements.language.toLowerCase())
      );

      if (languageSkill) {
        score += languageSkill.proficiency_level * 0.5;
      }
    }

    return maxScore > 0 ? Math.min(score / maxScore, 1.0) : 0.5;
  }

  /**
   * Calculate availability score based on current workload
   */
  private calculateAvailabilityScore(agent: any): number {
    const utilizationRate = agent.current_conversations / agent.max_concurrent_conversations;

    if (agent.availability_status === 'available') {
      return Math.max(0, 1.0 - utilizationRate);
    } else if (agent.availability_status === 'busy') {
      return Math.max(0, 0.5 - (utilizationRate * 0.5));
    }

    return 0;
  }

  /**
   * Calculate experience score based on skill usage and verification
   */
  private calculateExperienceScore(agent: any, requirements: ICustomerRequirement): number {
    const agentSkills = agent.skills || [];

    if (agentSkills.length === 0) return 0;

    let totalExperience = 0;
    let relevantSkills = 0;

    const allRequiredSkills = [...requirements.required_skills, ...requirements.preferred_skills];

    agentSkills.forEach((skill: any) => {
      const isRelevant = allRequiredSkills.some(req =>
        skill.skill_name.toLowerCase().includes(req.toLowerCase())
      );

      if (isRelevant || allRequiredSkills.length === 0) {
        relevantSkills++;

        let skillExperience = 0;
        skillExperience += Math.min(skill.usage_count / 100, 0.5); // Usage experience
        skillExperience += skill.verified ? 0.3 : 0; // Verification bonus
        skillExperience += skill.last_used ? this.getRecentUsageScore(skill.last_used) : 0;

        totalExperience += Math.min(skillExperience, 1.0);
      }
    });

    return relevantSkills > 0 ? totalExperience / relevantSkills : 0;
  }

  /**
   * Get recent usage score based on last used date
   */
  private getRecentUsageScore(lastUsed: Date): number {
    const daysSinceUsed = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUsed <= 7) return 0.2;
    if (daysSinceUsed <= 30) return 0.1;
    if (daysSinceUsed <= 90) return 0.05;

    return 0;
  }

  /**
   * Rank agents by overall skill fit
   */
  private rankAgentsBySkillFit(agents: any[], requirements: ICustomerRequirement): any[] {
    return agents
      .filter(agent => agent.total_score > 0.1) // Minimum threshold
      .sort((a, b) => {
        // Primary sort: total score
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }

        // Secondary sort: skill match
        if (b.skill_score !== a.skill_score) {
          return b.skill_score - a.skill_score;
        }

        // Tertiary sort: availability
        return b.availability_score - a.availability_score;
      });
  }

  /**
   * Calculate confidence in the routing decision
   */
  private calculateConfidence(selectedAgent: any, requirements: ICustomerRequirement): number {
    if (!selectedAgent) return 0;

    let confidence = selectedAgent.total_score;

    // Boost confidence for perfect skill matches
    if (selectedAgent.skill_score > 0.8) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    // Reduce confidence for missing required skills
    const missingRequired = selectedAgent.missing_skills?.filter((skill: string) =>
      requirements.required_skills.includes(skill)
    ) || [];

    if (missingRequired.length > 0) {
      confidence *= 0.7;
    }

    return Math.max(0, Math.min(confidence, 1.0));
  }

  /**
   * Generate human-readable reasoning for the routing decision
   */
  private generateReasoning(
    selectedAgent: any,
    requirements: ICustomerRequirement,
    rankedAgents: any[]
  ): string {
    if (!selectedAgent) {
      return 'No suitable agent found with required skills. Fallback routing recommended.';
    }

    const reasons = [];

    if (selectedAgent.skill_score > 0.7) {
      reasons.push(`Strong skill match (${Math.round(selectedAgent.skill_score * 100)}%)`);
    }

    if (selectedAgent.matched_skills?.length > 0) {
      reasons.push(`Matched skills: ${selectedAgent.matched_skills.slice(0, 3).join(', ')}`);
    }

    if (selectedAgent.availability_score > 0.8) {
      reasons.push('High availability');
    }

    if (selectedAgent.experience_score > 0.6) {
      reasons.push('Experienced with similar requests');
    }

    const baseReason = `Selected based on ${reasons.join(', ')}`;

    if (rankedAgents.length > 1) {
      return `${baseReason}. ${rankedAgents.length - 1} other suitable agents available.`;
    }

    return baseReason;
  }

  /**
   * Get matched skills between agent and requirements
   */
  private getMatchedSkills(agent: any, requirements: ICustomerRequirement): string[] {
    const agentSkills = agent.skills || [];
    const allRequiredSkills = [...requirements.required_skills, ...requirements.preferred_skills];

    return agentSkills
      .filter((skill: any) =>
        allRequiredSkills.some(req =>
          skill.skill_name.toLowerCase().includes(req.toLowerCase())
        )
      )
      .map((skill: any) => skill.skill_name);
  }

  /**
   * Get missing skills from requirements
   */
  private getMissingSkills(agent: any, requirements: ICustomerRequirement): string[] {
    const agentSkillNames = (agent.skills || []).map((s: any) => s.skill_name.toLowerCase());

    return requirements.required_skills.filter(skill =>
      !agentSkillNames.some(agentSkill =>
        agentSkill.includes(skill.toLowerCase())
      )
    );
  }

  /**
   * Extract required skills from conversation messages
   */
  private async extractRequiredSkills(messages: any[]): Promise<{required: string[], preferred: string[]}> {
    // Simple keyword-based skill extraction
    // In production, this would use NLP/AI for better extraction

    const skillKeywords = {
      technical: ['technical', 'bug', 'error', 'api', 'integration', 'code', 'system'],
      billing: ['billing', 'payment', 'invoice', 'charge', 'refund', 'subscription'],
      support: ['help', 'support', 'assistance', 'problem', 'issue'],
      sales: ['buy', 'purchase', 'price', 'quote', 'demo', 'trial'],
      spanish: ['español', 'spanish', 'habla español'],
      english: ['english', 'inglés'],
      urgent: ['urgent', 'emergency', 'asap', 'immediately']
    };

    const required: string[] = [];
    const preferred: string[] = [];

    const fullText = messages.map(m => m.content).join(' ').toLowerCase();

    Object.entries(skillKeywords).forEach(([skill, keywords]) => {
      const matches = keywords.filter(keyword => fullText.includes(keyword));

      if (matches.length > 0) {
        if (matches.length >= 2 || keywords.includes('urgent')) {
          required.push(skill);
        } else {
          preferred.push(skill);
        }
      }
    });

    return { required, preferred };
  }

  /**
   * Detect language from conversation messages
   */
  private async detectLanguage(messages: any[]): Promise<string> {
    // Simple language detection based on keywords
    // In production, use proper language detection library

    const text = messages.map(m => m.content).join(' ').toLowerCase();

    const spanishKeywords = ['hola', 'gracias', 'por favor', 'ayuda', 'problema', 'español'];
    const spanishMatches = spanishKeywords.filter(keyword => text.includes(keyword)).length;

    return spanishMatches > 1 ? 'es' : 'en';
  }

  /**
   * Infer department from conversation context
   */
  private async inferDepartment(messages: any[], context: IRoutingContext): Promise<string | undefined> {
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    if (text.includes('technical') || text.includes('bug') || text.includes('api')) {
      return 'technical';
    }

    if (text.includes('billing') || text.includes('payment') || text.includes('invoice')) {
      return 'billing';
    }

    if (text.includes('sales') || text.includes('buy') || text.includes('demo')) {
      return 'sales';
    }

    return undefined;
  }

  /**
   * Calculate complexity score based on message content
   */
  private calculateComplexityScore(messages: any[]): number {
    const text = messages.map(m => m.content).join(' ');

    let complexity = 1;

    // Length factor
    if (text.length > 500) complexity += 1;
    if (text.length > 1000) complexity += 1;

    // Technical terms
    const technicalTerms = ['api', 'integration', 'webhook', 'database', 'server', 'code'];
    const techMatches = technicalTerms.filter(term => text.toLowerCase().includes(term)).length;
    complexity += techMatches * 0.5;

    // Question marks (multiple questions = complex)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 2) complexity += 1;

    return Math.min(complexity, 5);
  }

  /**
   * Get customer preferences and history
   */
  private async getCustomerPreferences(
    customerId: string,
    companyId: string
  ): Promise<any> {
    try {
      const query = `
        SELECT
          preferred_language,
          preferred_agent_id,
          tags,
          interaction_history
        FROM customers
        WHERE id = $1 AND company_id = $2;
      `;

      const result = await this.pool.query(query, [customerId, companyId]);
      return result.rows[0] || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Get conversation messages for analysis
   */
  private async getConversationMessages(conversationId: string): Promise<any[]> {
    const query = `
      SELECT content, direction, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'skill_based';
  }

  /**
   * Check if strategy can handle the routing context
   */
  canHandle(context: IRoutingContext): boolean {
    return true; // Skill-based routing can handle any context
  }
}