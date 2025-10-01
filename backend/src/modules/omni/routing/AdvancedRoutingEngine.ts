/**
 * Advanced Routing Engine - Sprint 10
 * Intelligent conversation routing with multiple strategies
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

export interface IRoutingStrategy {
  id: string;
  company_id: string;
  name: string;
  type: RoutingStrategyType;
  priority: number;
  rules: IRoutingRule[];
  scoring_weights: IScoringWeights;
  fallback_strategy?: string;
  is_active: boolean;
}

export type RoutingStrategyType = 
  | 'skill_based'
  | 'round_robin'
  | 'least_busy'
  | 'ai_powered'
  | 'priority'
  | 'hybrid';

export interface IRoutingRule {
  type: string;
  field: string;
  operator: string;
  value: any;
  weight?: number;
}

export interface IScoringWeights {
  skill_match: number;
  availability: number;
  performance: number;
  workload: number;
  customer_preference: number;
}

export interface IAgentScore {
  agent_id: string;
  total_score: number;
  factors: {
    skill_score: number;
    availability_score: number;
    performance_score: number;
    workload_score: number;
    preference_score: number;
  };
  metadata?: Record<string, any>;
}

export interface IRoutingDecision {
  conversation_id: string;
  selected_agent_id: string;
  strategy_used: string;
  scores: IAgentScore[];
  routing_time_ms: number;
  success: boolean;
  fallback_used?: boolean;
}

export interface IAgentSkill {
  agent_id: string;
  skill_name: string;
  skill_level: number;
  skill_category?: string;
  certifications?: string[];
  verified: boolean;
}

export interface IAgentAvailability {
  agent_id: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  current_workload: number;
  max_concurrent_conversations: number;
  availability_score: number;
}

@injectable()
export class AdvancedRoutingEngine extends EventEmitter {
  private logger: any;
  private strategies: Map<string, IRoutingStrategy> = new Map();
  private agentSkillsCache: Map<string, IAgentSkill[]> = new Map();
  private cacheExpiryMs = 300000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.loadStrategies();
  }

  /**
   * Route a conversation to the best available agent
   */
  async routeConversation(
    conversationId: string,
    context: {
      customer_id?: string;
      channel?: string;
      priority?: number;
      required_skills?: string[];
      language?: string;
      sentiment?: number;
    } = {}
  ): Promise<IRoutingDecision> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting conversation routing', { conversationId, context });

      // Get company ID from conversation
      const companyId = await this.getCompanyId(conversationId);

      // Get active routing strategy
      const strategy = await this.getActiveStrategy(companyId, context);
      if (!strategy) {
        throw new Error('No active routing strategy found');
      }

      // Get available agents
      const availableAgents = await this.getAvailableAgents(companyId, context);
      if (availableAgents.length === 0) {
        throw new Error('No available agents');
      }

      // Score agents based on strategy
      const scores = await this.scoreAgents(
        availableAgents,
        strategy,
        context
      );

      // Select best agent
      const selectedAgent = this.selectBestAgent(scores);
      if (!selectedAgent) {
        throw new Error('Could not select an agent');
      }

      // Assign conversation
      await this.assignConversation(conversationId, selectedAgent.agent_id);

      // Record routing decision
      const decision: IRoutingDecision = {
        conversation_id: conversationId,
        selected_agent_id: selectedAgent.agent_id,
        strategy_used: strategy.type,
        scores,
        routing_time_ms: Date.now() - startTime,
        success: true
      };

      await this.recordRoutingDecision(decision);

      // Emit event
      this.emit('conversation:routed', decision);

      this.logger.info('Conversation routed successfully', {
        conversationId,
        agentId: selectedAgent.agent_id,
        score: selectedAgent.total_score,
        time: decision.routing_time_ms
      });

      return decision;
    } catch (error: any) {
      this.logger.error('Routing failed', error);

      // Try fallback routing
      const fallbackAgent = await this.fallbackRouting(conversationId);
      
      const decision: IRoutingDecision = {
        conversation_id: conversationId,
        selected_agent_id: fallbackAgent || '',
        strategy_used: 'fallback',
        scores: [],
        routing_time_ms: Date.now() - startTime,
        success: !!fallbackAgent,
        fallback_used: true
      };

      await this.recordRoutingDecision(decision);
      
      if (!fallbackAgent) {
        throw error;
      }

      return decision;
    }
  }

  /**
   * Score agents based on routing strategy
   */
  private async scoreAgents(
    agents: IAgentAvailability[],
    strategy: IRoutingStrategy,
    context: any
  ): Promise<IAgentScore[]> {
    const scores: IAgentScore[] = [];

    for (const agent of agents) {
      const score = await this.calculateAgentScore(agent, strategy, context);
      scores.push(score);
    }

    // Sort by total score descending
    scores.sort((a, b) => b.total_score - a.total_score);

    return scores;
  }

  /**
   * Calculate score for a single agent
   */
  private async calculateAgentScore(
    agent: IAgentAvailability,
    strategy: IRoutingStrategy,
    context: any
  ): Promise<IAgentScore> {
    const weights = strategy.scoring_weights;
    const factors = {
      skill_score: 0,
      availability_score: 0,
      performance_score: 0,
      workload_score: 0,
      preference_score: 0
    };

    // Calculate skill match score
    if (context.required_skills?.length > 0) {
      factors.skill_score = await this.calculateSkillScore(
        agent.agent_id,
        context.required_skills
      );
    } else {
      factors.skill_score = 1; // Perfect score if no skills required
    }

    // Calculate availability score
    factors.availability_score = this.calculateAvailabilityScore(agent);

    // Calculate performance score
    factors.performance_score = await this.calculatePerformanceScore(agent.agent_id);

    // Calculate workload score
    factors.workload_score = this.calculateWorkloadScore(agent);

    // Calculate customer preference score
    if (context.customer_id) {
      factors.preference_score = await this.calculatePreferenceScore(
        agent.agent_id,
        context.customer_id
      );
    } else {
      factors.preference_score = 0.5; // Neutral if no customer context
    }

    // Calculate weighted total
    const total_score = 
      factors.skill_score * weights.skill_match +
      factors.availability_score * weights.availability +
      factors.performance_score * weights.performance +
      factors.workload_score * weights.workload +
      factors.preference_score * weights.customer_preference;

    return {
      agent_id: agent.agent_id,
      total_score,
      factors
    };
  }

  /**
   * Calculate skill match score
   */
  private async calculateSkillScore(
    agentId: string,
    requiredSkills: string[]
  ): Promise<number> {
    // Get agent skills
    const agentSkills = await this.getAgentSkills(agentId);
    
    if (agentSkills.length === 0) {
      return 0;
    }

    let matchScore = 0;
    let totalWeight = requiredSkills.length;

    for (const required of requiredSkills) {
      const skill = agentSkills.find(s => s.skill_name === required);
      if (skill) {
        // Score based on skill level (1-5)
        matchScore += skill.skill_level / 5;
      }
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(agent: IAgentAvailability): number {
    if (agent.status !== 'available') {
      return 0;
    }

    const workloadRatio = agent.current_workload / agent.max_concurrent_conversations;
    
    // Higher score for lower workload
    return Math.max(0, 1 - workloadRatio);
  }

  /**
   * Calculate performance score
   */
  private async calculatePerformanceScore(agentId: string): Promise<number> {
    const query = `
      SELECT 
        AVG((metrics->>'resolution_rate')::float) as avg_resolution,
        AVG((customer_satisfaction->>'csat_score')::float) as avg_csat
      FROM agent_performance_metrics
      WHERE agent_id = $1
        AND period_start >= NOW() - INTERVAL '7 days';
    `;

    const result = await this.pool.query(query, [agentId]);
    
    if (result.rows.length === 0) {
      return 0.5; // Default middle score
    }

    const { avg_resolution, avg_csat } = result.rows[0];
    
    // Combine resolution rate and satisfaction score
    const resolutionScore = (avg_resolution || 0.5) / 100;
    const csatScore = (avg_csat || 2.5) / 5;
    
    return (resolutionScore + csatScore) / 2;
  }

  /**
   * Calculate workload score
   */
  private calculateWorkloadScore(agent: IAgentAvailability): number {
    const workloadRatio = agent.current_workload / agent.max_concurrent_conversations;
    
    // Inverse of workload - less busy agents get higher scores
    if (workloadRatio === 0) return 1;
    if (workloadRatio < 0.3) return 0.9;
    if (workloadRatio < 0.5) return 0.7;
    if (workloadRatio < 0.7) return 0.5;
    if (workloadRatio < 0.9) return 0.3;
    return 0.1;
  }

  /**
   * Calculate customer preference score
   */
  private async calculatePreferenceScore(
    agentId: string,
    customerId: string
  ): Promise<number> {
    // Check if customer has previous positive interactions with agent
    const query = `
      SELECT AVG(score) as avg_score
      FROM satisfaction_surveys ss
      JOIN conversations c ON ss.conversation_id = c.id
      WHERE c.agent_id = $1 AND ss.customer_id = $2;
    `;

    const result = await this.pool.query(query, [agentId, customerId]);
    
    if (result.rows.length === 0 || !result.rows[0].avg_score) {
      return 0.5; // Neutral score
    }

    // Convert satisfaction score (1-5) to 0-1 scale
    return result.rows[0].avg_score / 5;
  }

  /**
   * Select best agent from scores
   */
  private selectBestAgent(scores: IAgentScore[]): IAgentScore | null {
    if (scores.length === 0) {
      return null;
    }

    // Return agent with highest score
    return scores[0];
  }

  /**
   * Get available agents
   */
  private async getAvailableAgents(
    companyId: string,
    context: any
  ): Promise<IAgentAvailability[]> {
    const query = `
      SELECT 
        agent_id,
        status,
        current_workload,
        max_concurrent_conversations
      FROM agent_availability
      WHERE company_id = $1
        AND date = CURRENT_DATE
        AND status IN ('available', 'busy')
        AND current_workload < max_concurrent_conversations;
    `;

    const result = await this.pool.query(query, [companyId]);
    
    return result.rows.map(row => ({
      agent_id: row.agent_id,
      status: row.status,
      current_workload: row.current_workload,
      max_concurrent_conversations: row.max_concurrent_conversations,
      availability_score: 0 // Will be calculated
    }));
  }

  /**
   * Get agent skills
   */
  private async getAgentSkills(agentId: string): Promise<IAgentSkill[]> {
    // Check cache
    if (this.agentSkillsCache.has(agentId) && 
        Date.now() - this.lastCacheUpdate < this.cacheExpiryMs) {
      return this.agentSkillsCache.get(agentId)!;
    }

    const query = `
      SELECT 
        agent_id,
        skill_name,
        skill_level,
        skill_category,
        certifications,
        verified
      FROM agent_skills
      WHERE agent_id = $1;
    `;

    const result = await this.pool.query(query, [agentId]);
    
    const skills = result.rows.map(row => ({
      agent_id: row.agent_id,
      skill_name: row.skill_name,
      skill_level: row.skill_level,
      skill_category: row.skill_category,
      certifications: row.certifications || [],
      verified: row.verified
    }));

    // Update cache
    this.agentSkillsCache.set(agentId, skills);
    this.lastCacheUpdate = Date.now();

    return skills;
  }

  /**
   * Get active routing strategy
   */
  private async getActiveStrategy(
    companyId: string,
    context: any
  ): Promise<IRoutingStrategy | null> {
    const query = `
      SELECT *
      FROM routing_strategies
      WHERE company_id = $1
        AND is_active = true
      ORDER BY priority DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [companyId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      type: row.type,
      priority: row.priority,
      rules: row.rules || [],
      scoring_weights: row.scoring_weights,
      fallback_strategy: row.fallback_strategy,
      is_active: row.is_active
    };
  }

  /**
   * Assign conversation to agent
   */
  private async assignConversation(
    conversationId: string,
    agentId: string
  ): Promise<void> {
    const query = `
      UPDATE conversations
      SET agent_id = $2,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;

    await this.pool.query(query, [conversationId, agentId]);
  }

  /**
   * Record routing decision
   */
  private async recordRoutingDecision(decision: IRoutingDecision): Promise<void> {
    try {
      const query = `
        INSERT INTO routing_decisions (
          conversation_id,
          selected_agent_id,
          decision_scores,
          routing_time_ms,
          was_successful
        ) VALUES ($1, $2, $3, $4, $5);
      `;

      await this.pool.query(query, [
        decision.conversation_id,
        decision.selected_agent_id,
        JSON.stringify(decision.scores),
        decision.routing_time_ms,
        decision.success
      ]);
    } catch (error: any) {
      this.logger.error('Failed to record routing decision', error);
    }
  }

  /**
   * Fallback routing - simple round-robin
   */
  private async fallbackRouting(conversationId: string): Promise<string | null> {
    try {
      const query = `
        SELECT agent_id
        FROM agent_availability
        WHERE status = 'available'
          AND current_workload < max_concurrent_conversations
        ORDER BY current_workload ASC
        LIMIT 1;
      `;

      const result = await this.pool.query(query);
      
      if (result.rows.length > 0) {
        const agentId = result.rows[0].agent_id;
        await this.assignConversation(conversationId, agentId);
        return agentId;
      }

      return null;
    } catch (error: any) {
      this.logger.error('Fallback routing failed', error);
      return null;
    }
  }

  /**
   * Get company ID from conversation
   */
  private async getCompanyId(conversationId: string): Promise<string> {
    const query = `
      SELECT company_id FROM conversations WHERE id = $1;
    `;

    const result = await this.pool.query(query, [conversationId]);
    
    if (result.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    return result.rows[0].company_id;
  }

  /**
   * Load routing strategies
   */
  private async loadStrategies(): Promise<void> {
    try {
      const query = `
        SELECT * FROM routing_strategies WHERE is_active = true;
      `;

      const result = await this.pool.query(query);
      
      result.rows.forEach(row => {
        this.strategies.set(row.id, {
          id: row.id,
          company_id: row.company_id,
          name: row.name,
          type: row.type,
          priority: row.priority,
          rules: row.rules || [],
          scoring_weights: row.scoring_weights,
          fallback_strategy: row.fallback_strategy,
          is_active: row.is_active
        });
      });

      this.logger.info('Routing strategies loaded', { count: this.strategies.size });
    } catch (error: any) {
      this.logger.error('Failed to load routing strategies', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.strategies.clear();
    this.agentSkillsCache.clear();
    this.removeAllListeners();
    this.logger.info('AdvancedRoutingEngine cleaned up');
  }
}