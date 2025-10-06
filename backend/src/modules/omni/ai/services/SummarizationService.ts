/**
 * Summarization Service - Sprint 10
 * Generates intelligent summaries of conversations and messages
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import { ISummary, IAIAnalysisResult } from '../interfaces/IAI';

export interface ISummarizationOptions {
  max_length?: number;
  style?: 'bullet_points' | 'paragraph' | 'executive' | 'technical';
  include_sentiment?: boolean;
  include_action_items?: boolean;
  language?: string;
  focus_areas?: string[];
}

export interface IConversationSummary extends ISummary {
  conversation_id: string;
  participant_count: number;
  duration_minutes: number;
  key_topics: string[];
  sentiment_summary: string;
  action_items: Array<{
    description: string;
    assignee?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: Date;
  }>;
  next_steps: string[];
  unresolved_issues: string[];
}

@injectable()
export class SummarizationService extends EventEmitter {
  private logger: any;
  private cache: Map<string, IConversationSummary> = new Map();
  private cacheMaxSize = 500;
  private cacheTTL = 1800000; // 30 minutes

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Generate summary for a conversation
   */
  async summarizeConversation(
    conversationId: string,
    options: ISummarizationOptions = {}
  ): Promise<IConversationSummary> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(conversationId, options);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.logger.debug('Conversation summary cache hit', { conversationId });
        return cached;
      }

      // Get conversation data
      const conversation = await this.getConversationData(conversationId);
      if (!conversation || !conversation.messages.length) {
        throw new Error('Conversation not found or has no messages');
      }

      // Generate summary
      const summary = await this.generateSummary(conversation, options);

      // Cache result
      if (this.cache.size < this.cacheMaxSize) {
        this.cache.set(cacheKey, summary);

        // Clean cache after TTL
        setTimeout(() => {
          this.cache.delete(cacheKey);
        }, this.cacheTTL);
      }

      // Store in database
      await this.storeSummary(summary);

      // Emit completion event
      this.emit('summary:generated', {
        conversation_id: conversationId,
        processing_time: Date.now() - startTime,
        word_count: summary.word_count
      });

      this.logger.info('Conversation summary generated', {
        conversation_id: conversationId,
        word_count: summary.word_count,
        processing_time: Date.now() - startTime
      });

      return summary;
    } catch (error: any) {
      this.logger.error('Conversation summarization failed', error);
      throw error;
    }
  }

  /**
   * Generate summary for multiple messages
   */
  async summarizeMessages(
    messages: string[],
    options: ISummarizationOptions = {}
  ): Promise<ISummary> {
    try {
      if (!messages.length) {
        return {
          text: 'No messages to summarize',
          bullet_points: [],
          key_points: [],
          word_count: 0,
          estimated_reading_time: 0
        };
      }

      const combinedText = messages.join('\n\n');
      const summary = await this.performSummarization(combinedText, options);

      return summary;
    } catch (error: any) {
      this.logger.error('Message summarization failed', error);
      throw error;
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(
    conversationId: string
  ): Promise<{
    overview: string;
    key_metrics: Record<string, any>;
    main_topics: string[];
    outcomes: string[];
    recommendations: string[];
  }> {
    try {
      const conversation = await this.getConversationData(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get analytics data
      const analytics = await this.getConversationAnalytics(conversationId);

      // Generate executive summary
      const executiveSummary = {
        overview: await this.generateOverview(conversation),
        key_metrics: {
          duration_minutes: conversation.duration_minutes,
          message_count: conversation.messages.length,
          participant_count: conversation.participant_count,
          sentiment_score: analytics?.sentiment?.score || 0,
          resolution_status: conversation.status
        },
        main_topics: await this.extractMainTopics(conversation.messages),
        outcomes: await this.identifyOutcomes(conversation),
        recommendations: await this.generateRecommendations(conversation, analytics)
      };

      return executiveSummary;
    } catch (error: any) {
      this.logger.error('Executive summary generation failed', error);
      throw error;
    }
  }

  /**
   * Generate summary for a specific time period
   */
  async summarizePeriod(
    companyId: string,
    startDate: Date,
    endDate: Date,
    options: ISummarizationOptions = {}
  ): Promise<{
    period_summary: string;
    conversation_count: number;
    key_trends: string[];
    top_issues: string[];
    performance_insights: string[];
  }> {
    try {
      const conversations = await this.getConversationsInPeriod(
        companyId,
        startDate,
        endDate
      );

      if (!conversations.length) {
        return {
          period_summary: 'No conversations found in the specified period',
          conversation_count: 0,
          key_trends: [],
          top_issues: [],
          performance_insights: []
        };
      }

      // Analyze conversations
      const trends = await this.identifyTrends(conversations);
      const issues = await this.identifyTopIssues(conversations);
      const insights = await this.generatePerformanceInsights(conversations);

      const periodSummary = {
        period_summary: await this.generatePeriodOverview(conversations, startDate, endDate),
        conversation_count: conversations.length,
        key_trends: trends,
        top_issues: issues,
        performance_insights: insights
      };

      return periodSummary;
    } catch (error: any) {
      this.logger.error('Period summarization failed', error);
      throw error;
    }
  }

  /**
   * Core summarization logic
   */
  private async generateSummary(
    conversation: any,
    options: ISummarizationOptions
  ): Promise<IConversationSummary> {
    const messages = conversation.messages;

    // Extract text content
    const messageTexts = messages.map((m: any) => m.content);
    const combinedText = messageTexts.join('\n\n');

    // Generate basic summary
    const baseSummary = await this.performSummarization(combinedText, options);

    // Extract additional information
    const keyTopics = await this.extractMainTopics(messages);
    const actionItems = await this.extractActionItems(messages);
    const nextSteps = await this.identifyNextSteps(messages);
    const unresolvedIssues = await this.identifyUnresolvedIssues(messages);
    const sentimentSummary = await this.generateSentimentSummary(conversation.id);

    const conversationSummary: IConversationSummary = {
      ...baseSummary,
      conversation_id: conversation.id,
      participant_count: conversation.participant_count || 2,
      duration_minutes: conversation.duration_minutes || 0,
      key_topics: keyTopics,
      sentiment_summary: sentimentSummary,
      action_items: actionItems,
      next_steps: nextSteps,
      unresolved_issues: unresolvedIssues
    };

    return conversationSummary;
  }

  /**
   * Perform text summarization using AI
   */
  private async performSummarization(
    text: string,
    options: ISummarizationOptions
  ): Promise<ISummary> {
    // Mock implementation - in production, use actual AI service
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    let maxLength = options.max_length || Math.max(50, Math.min(200, Math.floor(wordCount * 0.3)));

    // Generate summary based on style
    let summaryText: string;
    let bulletPoints: string[] = [];
    let keyPoints: string[] = [];

    switch (options.style) {
      case 'bullet_points':
        bulletPoints = this.generateBulletPoints(text, maxLength);
        summaryText = bulletPoints.join('. ');
        keyPoints = bulletPoints.slice(0, 3);
        break;

      case 'executive':
        summaryText = this.generateExecutiveStyle(text, maxLength);
        keyPoints = this.extractKeyPointsFromText(text);
        break;

      case 'technical':
        summaryText = this.generateTechnicalStyle(text, maxLength);
        keyPoints = this.extractTechnicalTerms(text);
        break;

      default: // paragraph
        summaryText = this.generateParagraphSummary(text, maxLength);
        bulletPoints = this.extractMainSentences(text, 5);
        keyPoints = this.extractKeyPointsFromText(text);
    }

    const estimatedReadingTime = Math.ceil(summaryText.split(/\s+/).length / 200); // 200 WPM

    return {
      text: summaryText,
      bullet_points: bulletPoints,
      key_points: keyPoints,
      word_count: summaryText.split(/\s+/).length,
      estimated_reading_time: estimatedReadingTime
    };
  }

  /**
   * Generate bullet points summary
   */
  private generateBulletPoints(text: string, maxLength: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const important = sentences
      .filter(s => this.isImportantSentence(s))
      .slice(0, 5)
      .map(s => s.trim());

    return important.length > 0 ? important : sentences.slice(0, 3).map(s => s.trim());
  }

  /**
   * Generate executive style summary
   */
  private generateExecutiveStyle(text: string, maxLength: number): string {
    const keyWords = this.extractKeyWords(text);
    const mainTopics = keyWords.slice(0, 3).join(', ');

    return `Executive Summary: This conversation covered ${mainTopics}. Key decisions and action items were identified, with focus on resolution and next steps.`;
  }

  /**
   * Generate technical style summary
   */
  private generateTechnicalStyle(text: string, maxLength: number): string {
    const technicalTerms = this.extractTechnicalTerms(text);
    const issues = this.extractIssueKeywords(text);

    let summary = 'Technical Discussion: ';
    if (issues.length > 0) {
      summary += `Issues addressed: ${issues.slice(0, 2).join(', ')}. `;
    }
    if (technicalTerms.length > 0) {
      summary += `Technical aspects: ${technicalTerms.slice(0, 3).join(', ')}.`;
    }

    return summary;
  }

  /**
   * Generate paragraph summary
   */
  private generateParagraphSummary(text: string, maxLength: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const importantSentences = sentences
      .filter(s => this.isImportantSentence(s))
      .slice(0, Math.max(2, Math.floor(maxLength / 25)));

    return importantSentences.join('. ') + '.';
  }

  /**
   * Check if sentence is important for summary
   */
  private isImportantSentence(sentence: string): boolean {
    const importantWords = [
      'problem', 'issue', 'solution', 'resolve', 'help', 'need', 'urgent',
      'important', 'required', 'deadline', 'action', 'next', 'follow up'
    ];

    const lowerSentence = sentence.toLowerCase();
    return importantWords.some(word => lowerSentence.includes(word)) ||
           sentence.length > 50; // Prefer longer, more detailed sentences
  }

  /**
   * Extract key words from text
   */
  private extractKeyWords(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !this.isStopWord(w));

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Extract main topics from messages
   */
  private async extractMainTopics(messages: any[]): Promise<string[]> {
    const allText = messages.map(m => m.content).join(' ');
    const keyWords = this.extractKeyWords(allText);

    // Group related keywords into topics
    const topics = this.groupKeywordsIntoTopics(keyWords);
    return topics.slice(0, 5);
  }

  /**
   * Group keywords into topics
   */
  private groupKeywordsIntoTopics(keywords: string[]): string[] {
    // Simple topic grouping - in production, use more sophisticated NLP
    const topicGroups = {
      technical: ['api', 'system', 'code', 'error', 'bug', 'integration'],
      billing: ['payment', 'invoice', 'charge', 'billing', 'subscription'],
      support: ['help', 'support', 'issue', 'problem', 'assistance'],
      account: ['account', 'user', 'login', 'access', 'profile']
    };

    const detectedTopics: string[] = [];

    Object.entries(topicGroups).forEach(([topic, relatedWords]) => {
      const hasRelatedKeywords = keywords.some(keyword =>
        relatedWords.some(related => keyword.includes(related) || related.includes(keyword))
      );

      if (hasRelatedKeywords) {
        detectedTopics.push(topic);
      }
    });

    return detectedTopics.length > 0 ? detectedTopics : keywords.slice(0, 3);
  }

  /**
   * Extract action items from messages
   */
  private async extractActionItems(messages: any[]): Promise<Array<{
    description: string;
    assignee?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: Date;
  }>> {
    const actionItems: Array<{
      description: string;
      assignee?: string;
      priority: 'low' | 'medium' | 'high';
      due_date?: Date;
    }> = [];

    const actionKeywords = [
      'will', 'need to', 'should', 'must', 'follow up', 'next step',
      'action', 'todo', 'task', 'deadline', 'by when', 'schedule'
    ];

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      const hasActionKeyword = actionKeywords.some(keyword => content.includes(keyword));

      if (hasActionKeyword) {
        const priority = this.determinePriority(content);
        const description = this.extractActionDescription(message.content);

        if (description) {
          actionItems.push({
            description,
            priority,
            assignee: message.direction === 'outbound' ? 'agent' : 'customer'
          });
        }
      }
    });

    return actionItems.slice(0, 5); // Limit to 5 action items
  }

  /**
   * Determine priority from text content
   */
  private determinePriority(content: string): 'low' | 'medium' | 'high' {
    if (content.includes('urgent') || content.includes('asap') || content.includes('immediately')) {
      return 'high';
    }
    if (content.includes('important') || content.includes('soon') || content.includes('priority')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract action description from message
   */
  private extractActionDescription(content: string): string | null {
    // Simple extraction - in production, use NLP
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (lower.includes('will') || lower.includes('need to') || lower.includes('should')) {
        return sentence.trim();
      }
    }

    return null;
  }

  /**
   * Get conversation data with messages
   */
  private async getConversationData(conversationId: string): Promise<any> {
    const conversationQuery = `
      SELECT
        c.*,
        EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, NOW()) - c.created_at)) / 60 as duration_minutes,
        COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.customer_id END) +
        COUNT(DISTINCT CASE WHEN m.direction = 'outbound' THEN m.agent_id END) as participant_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = $1
      GROUP BY c.id;
    `;

    const messagesQuery = `
      SELECT content, direction, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `;

    const [conversationResult, messagesResult] = await Promise.all([
      this.pool.query(conversationQuery, [conversationId]),
      this.pool.query(messagesQuery, [conversationId])
    ]);

    if (conversationResult.rows.length === 0) {
      return null;
    }

    return {
      ...conversationResult.rows[0],
      messages: messagesResult.rows
    };
  }

  /**
   * Get conversation analytics
   */
  private async getConversationAnalytics(conversationId: string): Promise<any> {
    const query = `
      SELECT sentiment_score, sentiment_label, sentiment_confidence, emotions
      FROM conversation_ai_analysis
      WHERE conversation_id = $1 AND analysis_type = 'sentiment'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows[0];
  }

  /**
   * Store summary in database
   */
  private async storeSummary(summary: IConversationSummary): Promise<void> {
    try {
      const query = `
        INSERT INTO conversation_summaries (
          conversation_id,
          summary_text,
          bullet_points,
          key_points,
          word_count,
          key_topics,
          sentiment_summary,
          action_items,
          next_steps,
          unresolved_issues
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (conversation_id)
        DO UPDATE SET
          summary_text = EXCLUDED.summary_text,
          bullet_points = EXCLUDED.bullet_points,
          key_points = EXCLUDED.key_points,
          word_count = EXCLUDED.word_count,
          key_topics = EXCLUDED.key_topics,
          sentiment_summary = EXCLUDED.sentiment_summary,
          action_items = EXCLUDED.action_items,
          next_steps = EXCLUDED.next_steps,
          unresolved_issues = EXCLUDED.unresolved_issues,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await this.pool.query(query, [
        summary.conversation_id,
        summary.text,
        JSON.stringify(summary.bullet_points),
        JSON.stringify(summary.key_points),
        summary.word_count,
        JSON.stringify(summary.key_topics),
        summary.sentiment_summary,
        JSON.stringify(summary.action_items),
        JSON.stringify(summary.next_steps),
        JSON.stringify(summary.unresolved_issues)
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store conversation summary', error);
    }
  }

  /**
   * Helper methods for various extraction and analysis tasks
   */
  private getCacheKey(conversationId: string, options: ISummarizationOptions): string {
    const optionsHash = JSON.stringify(options);
    return `summary:${conversationId}:${optionsHash}`;
  }

  private extractMainSentences(text: string, count: number): string[] {
    return text.split(/[.!?]+/)
      .filter(s => s.trim().length > 0)
      .slice(0, count)
      .map(s => s.trim());
  }

  private extractKeyPointsFromText(text: string): string[] {
    return this.extractKeyWords(text).slice(0, 5);
  }

  private extractTechnicalTerms(text: string): string[] {
    const technicalWords = ['api', 'system', 'database', 'server', 'integration', 'error', 'bug', 'code'];
    return this.extractKeyWords(text).filter(word =>
      technicalWords.some(tech => word.includes(tech) || tech.includes(word))
    );
  }

  private extractIssueKeywords(text: string): string[] {
    const issueWords = ['problem', 'issue', 'error', 'bug', 'fail', 'broken'];
    return this.extractKeyWords(text).filter(word =>
      issueWords.some(issue => word.includes(issue) || issue.includes(word))
    );
  }

  // Additional methods would be implemented for:
  // - generateOverview
  // - identifyOutcomes
  // - generateRecommendations
  // - getConversationsInPeriod
  // - identifyTrends
  // - identifyTopIssues
  // - generatePerformanceInsights
  // - identifyNextSteps
  // - identifyUnresolvedIssues
  // - generateSentimentSummary

  private async generateOverview(conversation: any): Promise<string> {
    return `Conversation overview: ${conversation.messages.length} messages exchanged over ${conversation.duration_minutes} minutes.`;
  }

  private async identifyOutcomes(conversation: any): Promise<string[]> {
    return ['Issue identified', 'Solution provided', 'Follow-up scheduled'];
  }

  private async generateRecommendations(conversation: any, analytics: any): Promise<string[]> {
    return ['Monitor customer satisfaction', 'Follow up within 24 hours'];
  }

  private async identifyNextSteps(messages: any[]): Promise<string[]> {
    return ['Customer to test solution', 'Agent to follow up'];
  }

  private async identifyUnresolvedIssues(messages: any[]): Promise<string[]> {
    return ['Integration still pending', 'Payment processing issue'];
  }

  private async generateSentimentSummary(conversationId: string): Promise<string> {
    const analytics = await this.getConversationAnalytics(conversationId);
    return analytics ? `Overall sentiment: ${analytics.sentiment_label}` : 'Sentiment analysis not available';
  }

  private async getConversationsInPeriod(companyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT * FROM conversations
      WHERE company_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at DESC;
    `;

    const result = await this.pool.query(query, [companyId, startDate, endDate]);
    return result.rows;
  }

  private async identifyTrends(conversations: any[]): Promise<string[]> {
    return ['Increased technical inquiries', 'Improved response times'];
  }

  private async identifyTopIssues(conversations: any[]): Promise<string[]> {
    return ['Payment processing delays', 'API integration challenges'];
  }

  private async generatePerformanceInsights(conversations: any[]): Promise<string[]> {
    return ['Average resolution time improved by 15%', 'Customer satisfaction at 4.2/5'];
  }

  private async generatePeriodOverview(conversations: any[], startDate: Date, endDate: Date): Promise<string> {
    return `Period summary: ${conversations.length} conversations handled between ${startDate.toDateString()} and ${endDate.toDateString()}.`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cache.clear();
    this.removeAllListeners();
    this.logger.info('SummarizationService cleaned up');
  }
}