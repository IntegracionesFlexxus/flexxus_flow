/**
 * Sentiment Analysis Service - Sprint 10
 * Analyzes sentiment and emotions in messages
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { ISentimentAnalysis, IAIAnalysisResult } from '../interfaces/IAI';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

// Mock sentiment analysis - replace with actual AI service
class MockSentimentAnalyzer {
  private sentimentWords = {
    positive: ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy', 'good', 'love', 'perfect', 'thanks'],
    negative: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'frustrated', 'disappointed', 'poor', 'worst'],
    neutral: ['okay', 'fine', 'alright', 'normal', 'average', 'maybe', 'perhaps', 'possibly']
  };

  analyze(text: string): ISentimentAnalysis {
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    words.forEach(word => {
      if (this.sentimentWords.positive.some(pw => word.includes(pw))) positiveCount++;
      if (this.sentimentWords.negative.some(nw => word.includes(nw))) negativeCount++;
      if (this.sentimentWords.neutral.some(nw => word.includes(nw))) neutralCount++;
    });

    const total = positiveCount + negativeCount + neutralCount || 1;
    const score = (positiveCount - negativeCount) / total;
    
    let label: 'positive' | 'neutral' | 'negative';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';
    else label = 'neutral';

    // Mock emotions
    const emotions = {
      joy: Math.max(0, score) * Math.random(),
      anger: Math.max(0, -score) * Math.random() * 0.5,
      fear: Math.random() * 0.2,
      sadness: Math.max(0, -score) * Math.random() * 0.3,
      surprise: Math.random() * 0.1,
      disgust: Math.max(0, -score) * Math.random() * 0.2
    };

    return {
      score: Math.max(-1, Math.min(1, score)),
      label,
      confidence: 0.75 + Math.random() * 0.2,
      emotions
    };
  }
}

@injectable()
export class SentimentAnalysisService extends EventEmitter {
  private logger: any;
  private analyzer: MockSentimentAnalyzer;
  private cache: Map<string, ISentimentAnalysis> = new Map();
  private cacheMaxSize = 1000;
  private cacheTTL = 3600000; // 1 hour
  private lastCacheClean = Date.now();

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.analyzer = new MockSentimentAnalyzer();
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    text: string,
    context?: {
      conversation_id?: string;
      language?: string;
      customer_id?: string;
    }
  ): Promise<ISentimentAnalysis> {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(text);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.logger.debug('Sentiment analysis cache hit', { cacheKey });
        return cached;
      }

      // Clean cache periodically
      if (Date.now() - this.lastCacheClean > this.cacheTTL) {
        this.cleanCache();
      }

      // Perform sentiment analysis
      const result = await this.performAnalysis(text, context);
      
      // Cache result
      if (this.cache.size < this.cacheMaxSize) {
        this.cache.set(cacheKey, result);
      }

      // Store in database if conversation context provided
      if (context?.conversation_id) {
        await this.storeAnalysis(context.conversation_id, result);
      }

      // Emit event for real-time updates
      this.emit('sentiment:analyzed', {
        conversation_id: context?.conversation_id,
        sentiment: result,
        processing_time: Date.now() - startTime
      });

      // Check for alerts
      await this.checkSentimentAlerts(result, context);

      this.logger.info('Sentiment analysis completed', {
        score: result.score,
        label: result.label,
        processing_time: Date.now() - startTime
      });

      return result;
    } catch (error: any) {
      this.logger.error('Sentiment analysis failed', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment for entire conversation
   */
  async analyzeConversationSentiment(
    conversationId: string
  ): Promise<IAIAnalysisResult> {
    const startTime = Date.now();

    try {
      // Get conversation messages
      const messages = await this.getConversationMessages(conversationId);
      
      if (messages.length === 0) {
        throw new Error('No messages found for conversation');
      }

      // Analyze each message
      const sentiments: ISentimentAnalysis[] = [];
      for (const message of messages) {
        const sentiment = await this.analyzeSentiment(message.content, {
          conversation_id: conversationId
        });
        sentiments.push(sentiment);
      }

      // Calculate overall sentiment
      const overallSentiment = this.calculateOverallSentiment(sentiments);
      
      // Detect emotion trends
      const emotionTrends = this.detectEmotionTrends(sentiments);
      
      // Identify urgency level
      const urgencyLevel = this.calculateUrgency(sentiments);

      const result: IAIAnalysisResult = {
        conversation_id: conversationId,
        analysis_type: 'sentiment',
        sentiment: overallSentiment,
        emotions: emotionTrends,
        urgency_level: urgencyLevel,
        processing_time_ms: Date.now() - startTime,
        metadata: {
          messages_analyzed: messages.length,
          sentiment_progression: sentiments.map(s => s.score)
        }
      };

      // Store analysis result
      await this.storeConversationAnalysis(result);

      this.emit('conversation:sentiment:analyzed', result);

      return result;
    } catch (error: any) {
      this.logger.error('Conversation sentiment analysis failed', error);
      throw error;
    }
  }

  /**
   * Perform the actual sentiment analysis
   */
  private async performAnalysis(
    text: string,
    context?: any
  ): Promise<ISentimentAnalysis> {
    // Use mock analyzer for now
    // In production, this would call OpenAI, Anthropic, or other AI services
    const result = this.analyzer.analyze(text);
    
    // Apply context-based adjustments if needed
    if (context?.language && context.language !== 'en') {
      // Adjust confidence for non-English text
      result.confidence *= 0.9;
    }

    return result;
  }

  /**
   * Calculate overall sentiment from multiple analyses
   */
  private calculateOverallSentiment(
    sentiments: ISentimentAnalysis[]
  ): ISentimentAnalysis {
    if (sentiments.length === 0) {
      return {
        score: 0,
        label: 'neutral',
        confidence: 0
      };
    }

    // Weighted average giving more weight to recent messages
    let totalScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;

    sentiments.forEach((sentiment, index) => {
      const weight = 1 + (index / sentiments.length); // Recent messages have more weight
      totalScore += sentiment.score * weight;
      totalWeight += weight;
      totalConfidence += sentiment.confidence;
    });

    const avgScore = totalScore / totalWeight;
    const avgConfidence = totalConfidence / sentiments.length;

    let label: 'positive' | 'neutral' | 'negative';
    if (avgScore > 0.2) label = 'positive';
    else if (avgScore < -0.2) label = 'negative';
    else label = 'neutral';

    // Aggregate emotions
    const emotions: Record<string, number> = {};
    sentiments.forEach(s => {
      if (s.emotions) {
        Object.entries(s.emotions).forEach(([emotion, value]) => {
          emotions[emotion] = (emotions[emotion] || 0) + value;
        });
      }
    });

    // Normalize emotions
    Object.keys(emotions).forEach(emotion => {
      emotions[emotion] /= sentiments.length;
    });

    return {
      score: avgScore,
      label,
      confidence: avgConfidence,
      emotions: emotions as any
    };
  }

  /**
   * Detect emotion trends over time
   */
  private detectEmotionTrends(
    sentiments: ISentimentAnalysis[]
  ): Record<string, number> {
    const trends: Record<string, number> = {};
    
    if (sentiments.length < 2) {
      return trends;
    }

    const emotions = ['joy', 'anger', 'fear', 'sadness', 'surprise', 'disgust'];
    
    emotions.forEach(emotion => {
      let trend = 0;
      for (let i = 1; i < sentiments.length; i++) {
        const prev = (sentiments[i - 1].emotions as any)?.[emotion] || 0;
        const curr = (sentiments[i].emotions as any)?.[emotion] || 0;
        trend += curr - prev;
      }
      trends[emotion] = trend / (sentiments.length - 1);
    });

    return trends;
  }

  /**
   * Calculate urgency level based on sentiment
   */
  private calculateUrgency(sentiments: ISentimentAnalysis[]): number {
    if (sentiments.length === 0) return 1;

    // Factors for urgency
    const recentSentiments = sentiments.slice(-3); // Last 3 messages
    const avgRecentScore = recentSentiments.reduce((sum, s) => sum + s.score, 0) / recentSentiments.length;
    
    // High negative sentiment = high urgency
    if (avgRecentScore < -0.5) return 5;
    if (avgRecentScore < -0.3) return 4;
    if (avgRecentScore < -0.1) return 3;
    if (avgRecentScore < 0.1) return 2;
    return 1;
  }

  /**
   * Check for sentiment-based alerts
   */
  private async checkSentimentAlerts(
    sentiment: ISentimentAnalysis,
    context?: any
  ): Promise<void> {
    // Alert for very negative sentiment
    if (sentiment.score < -0.7 && sentiment.confidence > 0.8) {
      this.emit('alert:negative_sentiment', {
        conversation_id: context?.conversation_id,
        customer_id: context?.customer_id,
        sentiment,
        severity: 'high'
      });

      this.logger.warn('High negative sentiment detected', {
        conversation_id: context?.conversation_id,
        score: sentiment.score
      });
    }

    // Alert for high anger emotion
    if (sentiment.emotions?.anger && sentiment.emotions.anger > 0.7) {
      this.emit('alert:high_anger', {
        conversation_id: context?.conversation_id,
        customer_id: context?.customer_id,
        anger_level: sentiment.emotions.anger
      });
    }
  }

  /**
   * Get conversation messages
   */
  private async getConversationMessages(conversationId: string): Promise<any[]> {
    const query = `
      SELECT id, content, direction, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Store sentiment analysis in database
   */
  private async storeAnalysis(
    conversationId: string,
    sentiment: ISentimentAnalysis
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO conversation_ai_analysis (
          conversation_id,
          analysis_type,
          sentiment_score,
          sentiment_label,
          sentiment_confidence,
          emotions
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (conversation_id, analysis_type) 
        DO UPDATE SET
          sentiment_score = EXCLUDED.sentiment_score,
          sentiment_label = EXCLUDED.sentiment_label,
          sentiment_confidence = EXCLUDED.sentiment_confidence,
          emotions = EXCLUDED.emotions,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await this.pool.query(query, [
        conversationId,
        'sentiment',
        sentiment.score,
        sentiment.label,
        sentiment.confidence,
        JSON.stringify(sentiment.emotions || {})
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store sentiment analysis', error);
    }
  }

  /**
   * Store conversation analysis result
   */
  private async storeConversationAnalysis(
    result: IAIAnalysisResult
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO conversation_ai_analysis (
          conversation_id,
          analysis_type,
          sentiment_score,
          sentiment_label,
          sentiment_confidence,
          emotions,
          urgency_level,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;

      await this.pool.query(query, [
        result.conversation_id,
        result.analysis_type,
        result.sentiment?.score,
        result.sentiment?.label,
        result.sentiment?.confidence,
        JSON.stringify(result.emotions || {}),
        result.urgency_level,
        JSON.stringify(result.metadata || {})
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store conversation analysis', error);
    }
  }

  /**
   * Get cache key for text
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key
    return `sentiment:${text.substring(0, 50)}:${text.length}`;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    this.cache.clear();
    this.lastCacheClean = Date.now();
    this.logger.debug('Sentiment cache cleaned');
  }

  /**
   * Get sentiment statistics
   */
  async getSentimentStats(
    companyId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<any> {
    const interval = {
      hour: '1 hour',
      day: '1 day',
      week: '1 week',
      month: '1 month'
    }[period];

    const query = `
      SELECT 
        AVG(sentiment_score) as avg_sentiment,
        COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_count,
        COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_count,
        COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_count,
        COUNT(*) as total_count
      FROM conversation_ai_analysis
      WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND conversation_id IN (
          SELECT id FROM conversations WHERE company_id = $1
        );
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cache.clear();
    this.removeAllListeners();
    this.logger.info('SentimentAnalysisService cleaned up');
  }
}