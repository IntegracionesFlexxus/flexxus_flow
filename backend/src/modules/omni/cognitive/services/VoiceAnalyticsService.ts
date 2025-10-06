/**
 * Voice Analytics Service - Sprint 12 Fase 4
 * Business logic for voice/speech analytics
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { VoiceAnalyticsRepository, IVoiceAnalysis } from '../repositories/VoiceAnalyticsRepository';
import { SentimentType, EmotionType } from '../../types/cognitive.types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class VoiceAnalyticsService {
  constructor(
    @inject(TYPES.VoiceAnalyticsRepository)
    private voiceRepo: VoiceAnalyticsRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async analyzeVoice(
    tenantId: string,
    interactionId: string,
    transcript: string,
    options?: {
      recordingUrl?: string;
      speechMetrics?: Record<string, any>;
    }
  ): Promise<IVoiceAnalysis> {
    try {
      // Analyze sentiment and emotions (mock implementation)
      const { sentiment, sentimentScore, emotions } = this.analyzeSentiment(transcript);

      const speechMetrics = options?.speechMetrics || {
        pace_wpm: 150,
        pauses_count: 5,
        volume_variation: 0.3,
        tone_variation: 0.4
      };

      const keywords = this.extractKeywords(transcript);

      return await this.voiceRepo.create(
        tenantId,
        interactionId,
        sentiment,
        sentimentScore,
        emotions,
        speechMetrics,
        {
          recordingUrl: options?.recordingUrl,
          transcript,
          keywordsExtracted: keywords,
          qualityScore: 0.85,
          processingModel: 'voice-analytics-v1'
        }
      );
    } catch (error) {
      this.logger.error('Error analyzing voice', { interactionId, tenantId, error });
      throw new Error('Failed to analyze voice');
    }
  }

  async getAnalysis(interactionId: string, tenantId: string): Promise<IVoiceAnalysis | null> {
    return await this.voiceRepo.findByInteractionId(interactionId, tenantId);
  }

  private analyzeSentiment(text: string) {
    // Mock sentiment analysis
    return {
      sentiment: SentimentType.POSITIVE,
      sentimentScore: 0.75,
      emotions: {
        [EmotionType.JOY]: 0.6,
        [EmotionType.NEUTRAL]: 0.3,
        [EmotionType.SURPRISE]: 0.1,
        [EmotionType.SADNESS]: 0,
        [EmotionType.ANGER]: 0,
        [EmotionType.FEAR]: 0,
        [EmotionType.DISGUST]: 0
      }
    };
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase().split(' ').slice(0, 10);
  }
}
