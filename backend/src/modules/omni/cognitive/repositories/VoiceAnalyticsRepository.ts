/**
 * Voice Analytics Repository - Sprint 12 Fase 4
 * Data access layer for voice/speech analytics
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { SentimentType, EmotionType } from '../../types/cognitive.types';

export interface IVoiceAnalysis {
  id: string;
  tenant_id: string;
  interaction_id: string;
  recording_url?: string;
  transcript?: string;
  sentiment: SentimentType;
  sentiment_score: number;
  emotions_detected: Record<EmotionType, number>;
  speech_metrics: {
    pace_wpm?: number;
    pauses_count?: number;
    volume_variation?: number;
    tone_variation?: number;
  };
  keywords_extracted?: string[];
  speaker_diarization?: Array<{
    speaker_id: string;
    start_time: number;
    end_time: number;
    text: string;
  }>;
  quality_score?: number;
  processing_model?: string;
  analyzed_at: Date;
  metadata?: Record<string, any>;
}

@injectable()
export class VoiceAnalyticsRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    interactionId: string,
    sentiment: SentimentType,
    sentimentScore: number,
    emotionsDetected: Record<EmotionType, number>,
    speechMetrics: Record<string, any>,
    options?: {
      recordingUrl?: string;
      transcript?: string;
      keywordsExtracted?: string[];
      speakerDiarization?: any[];
      qualityScore?: number;
      processingModel?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IVoiceAnalysis> {
    const query = `
      INSERT INTO voice_analytics (
        tenant_id, interaction_id, recording_url, transcript,
        sentiment, sentiment_score, emotions_detected, speech_metrics,
        keywords_extracted, speaker_diarization, quality_score,
        processing_model, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      tenantId,
      interactionId,
      options?.recordingUrl,
      options?.transcript,
      sentiment,
      sentimentScore,
      JSON.stringify(emotionsDetected),
      JSON.stringify(speechMetrics),
      options?.keywordsExtracted ? JSON.stringify(options.keywordsExtracted) : null,
      options?.speakerDiarization ? JSON.stringify(options.speakerDiarization) : null,
      options?.qualityScore,
      options?.processingModel,
      options?.metadata ? JSON.stringify(options.metadata) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToVoiceAnalysis(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IVoiceAnalysis | null> {
    const query = 'SELECT * FROM voice_analytics WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToVoiceAnalysis(result.rows[0]) : null;
  }

  async findByInteractionId(
    interactionId: string,
    tenantId: string
  ): Promise<IVoiceAnalysis | null> {
    const query = 'SELECT * FROM voice_analytics WHERE interaction_id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [interactionId, tenantId]);
    return result.rows[0] ? this.mapToVoiceAnalysis(result.rows[0]) : null;
  }

  async findBySentiment(
    sentiment: SentimentType,
    tenantId: string,
    limit: number = 100
  ): Promise<IVoiceAnalysis[]> {
    const query = `
      SELECT * FROM voice_analytics
      WHERE sentiment = $1 AND tenant_id = $2
      ORDER BY analyzed_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [sentiment, tenantId, limit]);
    return result.rows.map(row => this.mapToVoiceAnalysis(row));
  }

  async findLowQuality(
    tenantId: string,
    threshold: number = 0.5,
    limit: number = 100
  ): Promise<IVoiceAnalysis[]> {
    const query = `
      SELECT * FROM voice_analytics
      WHERE tenant_id = $1 AND quality_score < $2
      ORDER BY quality_score ASC, analyzed_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [tenantId, threshold, limit]);
    return result.rows.map(row => this.mapToVoiceAnalysis(row));
  }

  async getAverageSentimentScore(tenantId: string, days: number = 7): Promise<number> {
    const query = `
      SELECT AVG(sentiment_score) as avg_score
      FROM voice_analytics
      WHERE tenant_id = $1
        AND analyzed_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `;
    const result = await this.db.query(query, [tenantId]);
    return parseFloat(result.rows[0]?.avg_score || '0');
  }

  private mapToVoiceAnalysis(row: any): IVoiceAnalysis {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      interaction_id: row.interaction_id,
      recording_url: row.recording_url,
      transcript: row.transcript,
      sentiment: row.sentiment,
      sentiment_score: parseFloat(row.sentiment_score),
      emotions_detected: row.emotions_detected || {},
      speech_metrics: row.speech_metrics || {},
      keywords_extracted: row.keywords_extracted,
      speaker_diarization: row.speaker_diarization,
      quality_score: row.quality_score ? parseFloat(row.quality_score) : undefined,
      processing_model: row.processing_model,
      analyzed_at: row.analyzed_at,
      metadata: row.metadata
    };
  }
}
