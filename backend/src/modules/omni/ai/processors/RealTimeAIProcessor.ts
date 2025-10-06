/**
 * Real-Time AI Processor - Sprint 10
 * Processes conversations and messages in real-time with AI features
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

// Import AI services
import { SentimentAnalysisService } from '../../ai/services/SentimentAnalysisService';
import { SummarizationService } from '../../ai/services/SummarizationService';

// Import performance services
import { SmartCacheService } from '../../cache/SmartCacheService';
import { QualityManagementService } from '../../quality/QualityManagementService';

export interface IProcessingJob {
  id: string;
  type: 'message' | 'conversation' | 'batch';
  conversation_id: string;
  message_id?: string;
  features: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_at: Date;
  created_at: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  error?: string;
  results?: any;
}

export interface IProcessingMetrics {
  jobs_processed: number;
  jobs_failed: number;
  avg_processing_time: number;
  queue_size: number;
  processing_rate: number;
  last_processed_at?: Date;
}

@injectable()
export class RealTimeAIProcessor extends EventEmitter {
  private logger: any;
  private processingQueue: IProcessingJob[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private metrics: IProcessingMetrics;
  private maxConcurrentJobs = 5;
  private currentJobs = 0;

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool,
    @inject('SentimentAnalysisService') private sentimentService: SentimentAnalysisService,
    @inject('SummarizationService') private summarizationService: SummarizationService,
    @inject('SmartCacheService') private cacheService: SmartCacheService,
    @inject('QualityManagementService') private qualityService: QualityManagementService
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.metrics = this.initializeMetrics();

    // Listen to conversation and message events
    this.setupEventListeners();
  }

  /**
   * Start real-time processing
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Real-time AI processor already running');
      return;
    }

    try {
      this.isProcessing = true;

      // Load pending jobs from database
      await this.loadPendingJobs();

      // Start processing loop
      this.processingInterval = setInterval(async () => {
        await this.processQueue();
      }, 1000); // Process every second

      this.logger.info('Real-time AI processor started');
      this.emit('processor:started');
    } catch (error: any) {
      this.logger.error('Failed to start real-time AI processor', error);
      throw error;
    }
  }

  /**
   * Stop real-time processing
   */
  async stop(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = false;

      if (this.processingInterval) {
        clearInterval(this.processingInterval as any);
        this.processingInterval = undefined;
      }

      // Wait for current jobs to complete
      await this.waitForJobsToComplete();

      // Save pending jobs to database
      await this.savePendingJobs();

      this.logger.info('Real-time AI processor stopped');
      this.emit('processor:stopped');
    } catch (error: any) {
      this.logger.error('Error stopping real-time AI processor', error);
    }
  }

  /**
   * Queue a job for processing
   */
  async queueJob(job: Omit<IProcessingJob, 'id' | 'created_at' | 'status' | 'retry_count'>): Promise<string> {
    const jobId = this.generateJobId();

    const newJob: IProcessingJob = {
      ...job,
      id: jobId,
      created_at: new Date(),
      status: 'pending',
      retry_count: 0,
      max_retries: job.max_retries || 3
    };

    // Add to queue with priority sorting
    this.addJobToQueue(newJob);

    // Store in database
    await this.storeJob(newJob);

    this.logger.debug('Job queued for processing', {
      job_id: jobId,
      type: job.type,
      features: job.features,
      priority: job.priority
    });

    this.emit('job:queued', { job_id: jobId, type: job.type });

    return jobId;
  }

  /**
   * Process message in real-time
   */
  async processMessage(
    messageId: string,
    conversationId: string,
    features: string[] = ['sentiment'],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<string> {
    return await this.queueJob({
      type: 'message',
      conversation_id: conversationId,
      message_id: messageId,
      features,
      priority,
      scheduled_at: new Date(),
      max_retries: 3
    });
  }

  /**
   * Process entire conversation
   */
  async processConversation(
    conversationId: string,
    features: string[] = ['sentiment', 'summary'],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'low'
  ): Promise<string> {
    return await this.queueJob({
      type: 'conversation',
      conversation_id: conversationId,
      features,
      priority,
      scheduled_at: new Date(),
      max_retries: 2
    });
  }

  /**
   * Process batch of conversations
   */
  async processBatch(
    conversationIds: string[],
    features: string[] = ['sentiment'],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'low'
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const conversationId of conversationIds) {
      const jobId = await this.queueJob({
        type: 'batch',
        conversation_id: conversationId,
        features,
        priority,
        scheduled_at: new Date(),
        max_retries: 1
      });
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IProcessingJob | null> {
    // Check in-memory queue first
    const queuedJob = this.processingQueue.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }

    // Check database
    return await this.getStoredJob(jobId);
  }

  /**
   * Get processing metrics
   */
  getMetrics(): IProcessingMetrics {
    return {
      ...this.metrics,
      queue_size: this.processingQueue.length
    };
  }

  /**
   * Setup event listeners for automatic processing
   */
  private setupEventListeners(): void {
    // Listen for new messages
    this.on('message:created', async (data: { message_id: string, conversation_id: string }) => {
      await this.processMessage(data.message_id, data.conversation_id, ['sentiment'], 'high');
    });

    // Listen for conversation status changes
    this.on('conversation:status_changed', async (data: { conversation_id: string, status: string }) => {
      if (data.status === 'resolved') {
        await this.processConversation(data.conversation_id, ['sentiment', 'summary', 'quality'], 'medium');
      }
    });

    // Listen for customer satisfaction feedback
    this.on('feedback:received', async (data: { conversation_id: string }) => {
      await this.processConversation(data.conversation_id, ['quality'], 'low');
    });
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    if (!this.isProcessing || this.currentJobs >= this.maxConcurrentJobs) {
      return;
    }

    // Get next job to process
    const job = this.getNextJob();
    if (!job) {
      return;
    }

    // Mark job as processing
    job.status = 'processing';
    this.currentJobs++;

    try {
      // Process the job
      const startTime = Date.now();
      const results = await this.executeJob(job);

      // Mark job as completed
      job.status = 'completed';
      job.results = results;

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime);

      // Remove from queue
      this.removeJobFromQueue(job.id);

      // Store results
      await this.storeJobResults(job);

      this.logger.debug('Job completed successfully', {
        job_id: job.id,
        type: job.type,
        processing_time: processingTime
      });

      this.emit('job:completed', {
        job_id: job.id,
        type: job.type,
        processing_time: processingTime,
        results
      });
    } catch (error: any) {
      await this.handleJobError(job, error);
    } finally {
      this.currentJobs--;
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: IProcessingJob): Promise<any> {
    const results: any = {};

    for (const feature of job.features) {
      try {
        switch (feature) {
          case 'sentiment':
            results.sentiment = await this.processSentiment(job);
            break;

          case 'summary':
            results.summary = await this.processSummary(job);
            break;

          case 'quality':
            results.quality = await this.processQuality(job);
            break;

          default:
            this.logger.warn('Unknown feature requested', { feature, job_id: job.id });
        }
      } catch (error: any) {
        this.logger.error(`Feature processing failed: ${feature}`, {
          job_id: job.id,
          error: error.message
        });
        results[feature] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Process sentiment analysis
   */
  private async processSentiment(job: IProcessingJob): Promise<any> {
    const cacheKey = `sentiment:${job.conversation_id}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    let result;

    if (job.type === 'message' && job.message_id) {
      // Process single message
      const message = await this.getMessage(job.message_id);
      if (message) {
        result = await this.sentimentService.analyzeSentiment(message.content, {
          conversation_id: job.conversation_id,
          message_id: job.message_id
        });
      }
    } else {
      // Process entire conversation
      result = await this.sentimentService.analyzeConversationSentiment(job.conversation_id);
    }

    // Cache result
    if (result) {
      await this.cacheService.set(cacheKey, result, { ttl: 1800 }); // 30 minutes
    }

    return result;
  }

  /**
   * Process summarization
   */
  private async processSummary(job: IProcessingJob): Promise<any> {
    const cacheKey = `summary:${job.conversation_id}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.summarizationService.summarizeConversation(job.conversation_id);

    // Cache result
    await this.cacheService.set(cacheKey, result, { ttl: 3600 }); // 1 hour

    return result;
  }

  /**
   * Process quality evaluation
   */
  private async processQuality(job: IProcessingJob): Promise<any> {
    const cacheKey = `quality:${job.conversation_id}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.qualityService.evaluateConversationQuality(job.conversation_id);

    // Cache result
    await this.cacheService.set(cacheKey, result, { ttl: 1800 }); // 30 minutes

    return result;
  }

  /**
   * Handle job errors and retries
   */
  private async handleJobError(job: IProcessingJob, error: any): Promise<void> {
    job.retry_count++;
    job.error = error.message;

    if (job.retry_count < job.max_retries) {
      // Retry the job
      job.status = 'pending';
      job.scheduled_at = new Date(Date.now() + (job.retry_count * 5000)); // Exponential backoff

      this.logger.warn('Job failed, scheduling retry', {
        job_id: job.id,
        retry_count: job.retry_count,
        error: error.message
      });

      this.emit('job:retry', {
        job_id: job.id,
        retry_count: job.retry_count,
        error: error.message
      });
    } else {
      // Max retries exceeded
      job.status = 'failed';
      this.removeJobFromQueue(job.id);

      this.updateMetrics(false, 0);

      this.logger.error('Job failed permanently', {
        job_id: job.id,
        error: error.message,
        retry_count: job.retry_count
      });

      this.emit('job:failed', {
        job_id: job.id,
        error: error.message,
        retry_count: job.retry_count
      });

      // Store failed job
      await this.storeJobResults(job);
    }
  }

  /**
   * Utility methods
   */
  private initializeMetrics(): IProcessingMetrics {
    return {
      jobs_processed: 0,
      jobs_failed: 0,
      avg_processing_time: 0,
      queue_size: 0,
      processing_rate: 0
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addJobToQueue(job: IProcessingJob): void {
    // Insert job based on priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.processingQueue.findIndex(
      existingJob => priorityOrder[existingJob.priority] > priorityOrder[job.priority]
    );

    if (insertIndex === -1) {
      this.processingQueue.push(job);
    } else {
      this.processingQueue.splice(insertIndex, 0, job);
    }
  }

  private removeJobFromQueue(jobId: string): void {
    const index = this.processingQueue.findIndex(job => job.id === jobId);
    if (index > -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  private getNextJob(): IProcessingJob | null {
    const now = new Date();
    return this.processingQueue.find(
      job => job.status === 'pending' && job.scheduled_at <= now
    ) || null;
  }

  private updateMetrics(success: boolean, processingTime: number): void {
    if (success) {
      this.metrics.jobs_processed++;
      this.metrics.avg_processing_time =
        (this.metrics.avg_processing_time * (this.metrics.jobs_processed - 1) + processingTime) /
        this.metrics.jobs_processed;
    } else {
      this.metrics.jobs_failed++;
    }

    this.metrics.last_processed_at = new Date();
    this.metrics.processing_rate = this.metrics.jobs_processed /
      ((Date.now() - (this.metrics.last_processed_at?.getTime() || Date.now())) / 1000 / 60); // per minute
  }

  private async getMessage(messageId: string): Promise<any> {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await this.pool.query(query, [messageId]);
    return result.rows[0];
  }

  private async loadPendingJobs(): Promise<void> {
    // Implementation to load jobs from database
  }

  private async savePendingJobs(): Promise<void> {
    // Implementation to save jobs to database
  }

  private async storeJob(job: IProcessingJob): Promise<void> {
    // Implementation to store job in database
  }

  private async storeJobResults(job: IProcessingJob): Promise<void> {
    // Implementation to store job results in database
  }

  private async getStoredJob(jobId: string): Promise<IProcessingJob | null> {
    // Implementation to get job from database
    return null;
  }

  private async waitForJobsToComplete(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.currentJobs > 0 && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.processingQueue = [];
    this.removeAllListeners();
    this.logger.info('RealTimeAIProcessor cleaned up');
  }
}