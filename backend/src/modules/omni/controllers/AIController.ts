/**
 * AI Controller - Sprint 10
 * RESTful API endpoints for AI-powered features
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { BaseController } from '@/shared/controllers/BaseController';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { ValidationError } from '@/shared/errors/ValidationError';

// Import AI services
import { SentimentAnalysisService } from '../ai/services/SentimentAnalysisService';
import { SummarizationService } from '../ai/services/SummarizationService';

@injectable()
export class AIController extends BaseController {
  private logger: any;

  constructor(
    @inject(TYPES.OmniConnection) private pool: any,
    @inject('SentimentAnalysisService') private sentimentService: SentimentAnalysisService,
    @inject('SummarizationService') private summarizationService: SummarizationService
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Analyze sentiment of text
   * POST /api/omni/ai/sentiment/analyze
   */
  async analyzeSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { text, context } = req.body;
      const { company_id } = req.user as any;

      if (!text || typeof text !== 'string') {
        throw new ValidationError('Text is required and must be a string');
      }

      const result = await this.sentimentService.analyzeSentiment(text, {
        ...context,
        company_id
      });

      res.json({
        success: true,
        data: result,
        meta: {
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Sentiment analysis completed', {
        company_id,
        text_length: text.length,
        sentiment: result.label
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Analyze conversation sentiment
   * POST /api/omni/ai/sentiment/conversation
   */
  async analyzeConversationSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { conversation_id } = req.body;
      const { company_id } = req.user as any;

      if (!conversation_id) {
        throw new ValidationError('Conversation ID is required');
      }

      // Verify conversation belongs to company
      await this.verifyConversationAccess(conversation_id, company_id);

      const result = await this.sentimentService.analyzeConversationSentiment(conversation_id);

      res.json({
        success: true,
        data: result,
        meta: {
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Conversation sentiment analysis completed', {
        company_id,
        conversation_id,
        sentiment: result.sentiment?.label
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Get sentiment statistics
   * GET /api/omni/ai/sentiment/stats
   */
  async getSentimentStats(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.user as any;
      const { period = 'day' } = req.query;

      if (!['hour', 'day', 'week', 'month'].includes(period as string)) {
        throw new ValidationError('Invalid period. Must be one of: hour, day, week, month');
      }

      const stats = await this.sentimentService.getSentimentStats(
        company_id,
        period as 'hour' | 'day' | 'week' | 'month'
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          period,
          company_id
        }
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Summarize conversation
   * POST /api/omni/ai/summary/conversation
   */
  async summarizeConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversation_id, options = {} } = req.body;
      const { company_id } = req.user as any;

      if (!conversation_id) {
        throw new ValidationError('Conversation ID is required');
      }

      // Verify conversation belongs to company
      await this.verifyConversationAccess(conversation_id, company_id);

      const summary = await this.summarizationService.summarizeConversation(
        conversation_id,
        options
      );

      res.json({
        success: true,
        data: summary,
        meta: {
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Conversation summarization completed', {
        company_id,
        conversation_id,
        word_count: summary.word_count
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Summarize messages
   * POST /api/omni/ai/summary/messages
   */
  async summarizeMessages(req: Request, res: Response): Promise<void> {
    try {
      const { messages, options = {} } = req.body;
      const { company_id } = req.user as any;

      if (!Array.isArray(messages) || messages.length === 0) {
        throw new ValidationError('Messages array is required and must not be empty');
      }

      // Validate message format
      const validMessages = messages.every(msg =>
        typeof msg === 'string' || (typeof msg === 'object' && msg.content)
      );

      if (!validMessages) {
        throw new ValidationError('Invalid message format. Expected array of strings or objects with content property');
      }

      const messageTexts = messages.map(msg =>
        typeof msg === 'string' ? msg : msg.content
      );

      const summary = await this.summarizationService.summarizeMessages(
        messageTexts,
        options
      );

      res.json({
        success: true,
        data: summary,
        meta: {
          messages_count: messageTexts.length,
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Messages summarization completed', {
        company_id,
        messages_count: messageTexts.length,
        word_count: summary.word_count
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Generate executive summary
   * POST /api/omni/ai/summary/executive
   */
  async generateExecutiveSummary(req: Request, res: Response): Promise<void> {
    try {
      const { conversation_id } = req.body;
      const { company_id } = req.user as any;

      if (!conversation_id) {
        throw new ValidationError('Conversation ID is required');
      }

      // Verify conversation belongs to company
      await this.verifyConversationAccess(conversation_id, company_id);

      const executiveSummary = await this.summarizationService.generateExecutiveSummary(
        conversation_id
      );

      res.json({
        success: true,
        data: executiveSummary,
        meta: {
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Executive summary generated', {
        company_id,
        conversation_id
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Summarize period
   * POST /api/omni/ai/summary/period
   */
  async summarizePeriod(req: Request, res: Response): Promise<void> {
    try {
      const { start_date, end_date, options = {} } = req.body;
      const { company_id } = req.user as any;

      if (!start_date || !end_date) {
        throw new ValidationError('Start date and end date are required');
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      if (startDate >= endDate) {
        throw new ValidationError('Start date must be before end date');
      }

      // Limit period to maximum 3 months
      const maxPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
      if (endDate.getTime() - startDate.getTime() > maxPeriod) {
        throw new ValidationError('Period cannot exceed 90 days');
      }

      const periodSummary = await this.summarizationService.summarizePeriod(
        company_id,
        startDate,
        endDate,
        options
      );

      res.json({
        success: true,
        data: periodSummary,
        meta: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Period summarization completed', {
        company_id,
        start_date: startDate,
        end_date: endDate,
        conversation_count: periodSummary.conversation_count
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Get AI analysis for conversation
   * GET /api/omni/ai/analysis/:conversation_id
   */
  async getConversationAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { conversation_id } = req.params;
      const { company_id } = req.user as any;

      if (!conversation_id) {
        throw new ValidationError('Conversation ID is required');
      }

      // Verify conversation belongs to company
      await this.verifyConversationAccess(conversation_id, company_id);

      // Get all AI analysis for the conversation
      const analysis = await this.getStoredAnalysis(conversation_id);

      res.json({
        success: true,
        data: analysis,
        meta: {
          conversation_id,
          analysis_count: analysis.length
        }
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Trigger full AI processing for conversation
   * POST /api/omni/ai/process/conversation
   */
  async processConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversation_id, features = ['sentiment', 'summary'] } = req.body;
      const { company_id } = req.user as any;

      if (!conversation_id) {
        throw new ValidationError('Conversation ID is required');
      }

      if (!Array.isArray(features) || features.length === 0) {
        throw new ValidationError('Features array is required and must not be empty');
      }

      const validFeatures = ['sentiment', 'summary', 'intent'];
      const invalidFeatures = features.filter(f => !validFeatures.includes(f));

      if (invalidFeatures.length > 0) {
        throw new ValidationError(`Invalid features: ${invalidFeatures.join(', ')}`);
      }

      // Verify conversation belongs to company
      await this.verifyConversationAccess(conversation_id, company_id);

      const results: any = {};

      // Process each requested feature
      if (features.includes('sentiment')) {
        try {
          results.sentiment = await this.sentimentService.analyzeConversationSentiment(conversation_id);
        } catch (error) {
          this.logger.error('Sentiment analysis failed during processing', error);
          results.sentiment = { error: 'Sentiment analysis failed' };
        }
      }

      if (features.includes('summary')) {
        try {
          results.summary = await this.summarizationService.summarizeConversation(conversation_id);
        } catch (error) {
          this.logger.error('Summarization failed during processing', error);
          results.summary = { error: 'Summarization failed' };
        }
      }

      res.json({
        success: true,
        data: results,
        meta: {
          conversation_id,
          features_processed: features,
          processing_time_ms: Date.now() - req.startTime
        }
      });

      this.logger.info('Conversation AI processing completed', {
        company_id,
        conversation_id,
        features
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Get AI processing status
   * GET /api/omni/ai/status
   */
  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.user as any;

      // Get processing statistics
      const stats = await this.getProcessingStats(company_id);

      res.json({
        success: true,
        data: {
          ai_features_enabled: true,
          processing_stats: stats,
          available_features: [
            'sentiment_analysis',
            'conversation_summarization',
            'message_summarization',
            'executive_summary',
            'period_summary'
          ]
        }
      });
    } catch (error: any) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Verify conversation access for company
   */
  private async verifyConversationAccess(conversationId: string, companyId: string): Promise<void> {
    const query = `
      SELECT id FROM conversations
      WHERE id = $1 AND company_id = $2;
    `;

    const result = await this.pool.query(query, [conversationId, companyId]);

    if (result.rows.length === 0) {
      throw new ValidationError('Conversation not found or access denied');
    }
  }

  /**
   * Get stored AI analysis for conversation
   */
  private async getStoredAnalysis(conversationId: string): Promise<any[]> {
    const query = `
      SELECT
        analysis_type,
        sentiment_score,
        sentiment_label,
        sentiment_confidence,
        emotions,
        urgency_level,
        metadata,
        created_at
      FROM conversation_ai_analysis
      WHERE conversation_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Get AI processing statistics for company
   */
  private async getProcessingStats(companyId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN analysis_type = 'sentiment' THEN 1 END) as sentiment_analyses,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as analyses_last_24h,
        AVG(CASE WHEN analysis_type = 'sentiment' THEN sentiment_score END) as avg_sentiment_score
      FROM conversation_ai_analysis
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE company_id = $1
      );
    `;

    const summaryQuery = `
      SELECT COUNT(*) as total_summaries
      FROM conversation_summaries
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE company_id = $1
      );
    `;

    const [analysisResult, summaryResult] = await Promise.all([
      this.pool.query(query, [companyId]),
      this.pool.query(summaryQuery, [companyId])
    ]);

    return {
      ...analysisResult.rows[0],
      ...summaryResult.rows[0]
    };
  }

  /**
   * Handle errors with appropriate response
   */
  private handleError(error: any, req: Request, res: Response): void {
    this.logger.error('AI Controller error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      company_id: (req.user as any)?.company_id
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'internal_error',
        message: 'AI processing failed'
      }
    });
  }
}