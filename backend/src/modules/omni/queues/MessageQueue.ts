/**
 * Message Queue Service - Sprint 06
 * Handles asynchronous message processing using Bull queue
 */

import { injectable, inject } from 'inversify';
import Bull, { Queue, Job } from 'bull';
import { TYPES } from '@/container/types';
import { IMessageRepository } from '../interfaces/IMessageRepository';
import { IChannelRepository } from '../interfaces/IChannelRepository';
import { IMessage } from '../interfaces/IMessage';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { ConnectorFactory } from '../connectors/ConnectorFactory';
import { IChannelConnector } from '../connectors/base/IChannelConnector';
import { decryptConfiguration } from '../utils/credentialDecryption';
import { hydrateMessage } from '../utils/messageMapper';

interface IMessageQueueJob {
  messageId: string;
  channelId: string;
  companyId: string;
  retryCount?: number;
  priority?: number;
}

interface IQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@injectable()
export class MessageQueue {
  private logger: any;
  private queue!: Queue<IMessageQueueJob>;
  private connectorFactory: ConnectorFactory;
  private connectorCache: Map<string, IChannelConnector> = new Map();
  private isProcessing: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Queue configuration
  private readonly QUEUE_NAME = 'omni-message-queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly CONCURRENCY = 10;

  constructor(
    @inject(TYPES.OmniMessageRepository) private messageRepository: IMessageRepository,
    @inject(TYPES.OmniChannelRepository) private channelRepository: IChannelRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
    this.connectorFactory = new ConnectorFactory();
    // Auto-initialize on construction (lazy init pattern)
    this.initPromise = this.initialize().catch(err => {
      this.logger.error('Failed to auto-initialize message queue', err);
      throw err;
    });
  }

  /**
   * Initialize the message queue
   */
  async initialize(redisConfig?: any): Promise<void> {
    // Prevent double initialization
    if (this.initialized) {
      this.logger.debug('Message queue already initialized');
      return;
    }

    try {
      this.logger.info('🔄 Initializing message queue...');

      // Create Bull queue with Redis configuration
      this.queue = new Bull(this.QUEUE_NAME, {
        redis: redisConfig || {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      // Process jobs
      this.startProcessing();

      this.initialized = true;
      this.logger.info('✅ Message queue initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize message queue', error);
      throw error;
    }
  }

  /**
   * Add message to queue
   */
  async enqueueMessage(
    messageId: string,
    channelId: string,
    companyId: string,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<void> {
    try {
      // Wait for initialization to complete if still initializing
      if (this.initPromise) {
        await this.initPromise;
      }

      // Verify queue is initialized
      if (!this.queue) {
        throw new Error('Message queue is not initialized');
      }

      const jobData: IMessageQueueJob = {
        messageId,
        channelId,
        companyId,
        retryCount: 0,
        priority: options?.priority || 0
      };

      const jobOptions: Bull.JobOptions = {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: this.RETRY_DELAY
        },
        removeOnComplete: true,
        removeOnFail: false
      };

      await this.queue.add(jobData, jobOptions);

      this.logger.info('Message enqueued', {
        messageId,
        channelId,
        priority: options?.priority
      });
    } catch (error) {
      this.logger.error('Failed to enqueue message', { messageId, error });
      throw error;
    }
  }

  /**
   * Bulk enqueue messages
   */
  async enqueueBatch(
    messages: Array<{
      messageId: string;
      channelId: string;
      companyId: string;
      priority?: number;
    }>
  ): Promise<void> {
    const jobs = messages.map(msg => ({
      data: {
        messageId: msg.messageId,
        channelId: msg.channelId,
        companyId: msg.companyId,
        retryCount: 0,
        priority: msg.priority || 0
      },
      opts: {
        priority: msg.priority || 0,
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: this.RETRY_DELAY
        }
      }
    }));

    await this.queue.addBulk(jobs);

    this.logger.info('Batch messages enqueued', { count: messages.length });
  }

  /**
   * Start processing queue jobs
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.queue.process(this.CONCURRENCY, async (job: Job<IMessageQueueJob>) => {
      return this.processMessage(job);
    });

    this.isProcessing = true;
    this.logger.info('Queue processing started', { concurrency: this.CONCURRENCY });
  }

  /**
   * Process a single message job
   */
  private async processMessage(job: Job<IMessageQueueJob>): Promise<void> {
    const { messageId, channelId, companyId } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug('Processing message', { messageId, attempt: job.attemptsMade });

      // Get message from database and hydrate it
      const rawMessage = await this.messageRepository.findById(messageId, companyId);
      if (!rawMessage) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // Hydrate message to extract recipient_identifier from platform_data
      const message = hydrateMessage(rawMessage);

      // Skip if already sent successfully
      if (message.status === 'sent' || message.status === 'delivered' || message.status === 'read') {
        this.logger.debug('Message already sent successfully', { messageId, status: message.status });
        return;
      }

      // Get channel configuration
      const channel = await this.channelRepository.findById(channelId, companyId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const rawConfig =
        typeof channel.configuration === 'string'
          ? JSON.parse(channel.configuration as string)
          : channel.configuration || {};
      const decryptedConfig = decryptConfiguration(rawConfig);

      // Get or create connector
      const connector = await this.getConnector(
        channelId,
        channel.channel_type,
        {
          ...decryptedConfig,
          details: (channel as any).details
        }
      );

      // Send message through connector
      const result = await connector.sendMessage(message);

      // Check if send was successful
      if (result.success) {
        // Update message status to sent
        await this.messageRepository.updateStatus(messageId, 'sent', companyId);

        // Update metadata with send result
        await this.messageRepository.update(messageId, {
          external_message_id: result.messageId,
          metadata: {
            ...message.metadata,
            sendResult: result.details,
            processingTime: Date.now() - startTime,
            attempts: job.attemptsMade + 1
          }
        }, companyId);

        this.logger.info('✅ Message sent successfully to WhatsApp', {
          messageId,
          externalId: result.messageId,
          processingTime: Date.now() - startTime
        });

        // Report progress
        await job.progress(100);

        // Exit successfully - don't throw any error
        return;
      }

      // If we reach here, the send failed
      this.logger.error('❌ Failed to send message to WhatsApp', {
        messageId,
        error: result.error,
        attempt: job.attemptsMade + 1
      });

      // Update metadata with error info
      await this.messageRepository.update(messageId, {
        metadata: {
          ...message.metadata,
          lastError: result.error,
          lastAttempt: new Date(),
          attempts: job.attemptsMade + 1
        }
      }, companyId);

      // Throw error to trigger retry
      throw new Error(result.error || 'Failed to send message');
    } catch (error: any) {
      this.logger.error('Failed to process message', {
        messageId,
        error: error.message,
        attempt: job.attemptsMade
      });

      // Update message status on final failure
      if (job.attemptsMade >= this.MAX_RETRIES - 1) {
        await this.messageRepository.updateStatus(messageId, 'failed', companyId);
        await this.messageRepository.update(messageId, {
          metadata: {
            error: error.message,
            failedAt: new Date(),
            attempts: job.attemptsMade + 1
          }
        }, companyId);
      }

      throw error;
    }
  }

  /**
   * Get or create connector instance
   */
  private async getConnector(
    channelId: string,
    channelType: string,
    config: any
  ): Promise<IChannelConnector> {
    if (!this.connectorCache.has(channelId)) {
      const connector = this.connectorFactory.create(channelType, config);
      await connector.initialize(config);
      this.connectorCache.set(channelId, connector);
    }

    return this.connectorCache.get(channelId)!;
  }

  /**
   * Setup queue event listeners
   */
  private setupEventListeners(): void {
    this.queue.on('completed', (job: Job<IMessageQueueJob>) => {
      this.logger.debug('Job completed', {
        jobId: job.id,
        messageId: job.data.messageId
      });
    });

    this.queue.on('failed', (job: Job<IMessageQueueJob>, err: Error) => {
      this.logger.error('Job failed', {
        jobId: job.id,
        messageId: job.data.messageId,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    this.queue.on('stalled', (job: Job<IMessageQueueJob>) => {
      this.logger.warn('Job stalled', {
        jobId: job.id,
        messageId: job.data.messageId
      });
    });

    this.queue.on('error', (error: Error) => {
      this.logger.error('Queue error', error);
    });

    this.queue.on('waiting', (jobId: string) => {
      this.logger.debug('Job waiting', { jobId });
    });

    this.queue.on('active', (job: Job<IMessageQueueJob>) => {
      this.logger.debug('Job active', {
        jobId: job.id,
        messageId: job.data.messageId
      });
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<IQueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed
    };
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.info('Queue paused');
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.info('Queue resumed');
  }

  /**
   * Clean completed jobs
   */
  async cleanCompleted(grace: number = 3600000): Promise<void> {
    const jobs = await this.queue.clean(grace, 'completed');
    this.logger.info('Cleaned completed jobs', { count: jobs.length });
  }

  /**
   * Clean failed jobs
   */
  async cleanFailed(grace: number = 86400000): Promise<void> {
    const jobs = await this.queue.clean(grace, 'failed');
    this.logger.info('Cleaned failed jobs', { count: jobs.length });
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.info('Job retry initiated', { jobId });
    }
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.info('Job removed', { jobId });
    }
  }

  /**
   * Shutdown queue gracefully
   */
  async shutdown(): Promise<void> {
    // Clean up connectors
    for (const [channelId, connector] of this.connectorCache) {
      await connector.cleanup();
    }
    this.connectorCache.clear();

    // Close queue
    await this.queue.close();
    this.isProcessing = false;

    this.logger.info('Message queue shutdown completed');
  }
}
