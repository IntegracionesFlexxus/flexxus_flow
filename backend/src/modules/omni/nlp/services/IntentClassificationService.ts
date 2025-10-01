/**
 * Intent Classification Service - Sprint 12
 * Service for classifying user intents from text
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { NLPModelRepository } from '../repositories/NLPModelRepository';
import { IntentPatternRepository } from '../repositories/IntentPatternRepository';
import { IntentData, EntityData } from '../../types/nlp.types';

@injectable()
export class IntentClassificationService {
  constructor(
    @inject(TYPES.NLPModelRepository)
    private nlpModelRepository: NLPModelRepository,

    @inject(TYPES.IntentPatternRepository)
    private intentPatternRepository: IntentPatternRepository,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Classify intent from text
   */
  async classifyIntent(text: string, tenantId: string): Promise<IntentData> {
    this.logger.info('Classifying intent', { tenantId, textLength: text.length });

    // Get all active intent patterns
    const patterns = await this.intentPatternRepository.findAll(tenantId, true);

    // Try to match patterns
    const matches = patterns
      .map(pattern => {
        const confidence = this.matchPattern(text, pattern);
        return {
          intent_name: pattern.intent_name,
          confidence,
          pattern
        };
      })
      .filter(match => match.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence);

    if (matches.length === 0) {
      // No match found
      return {
        intent_name: 'unknown',
        confidence: 0,
        entities: []
      };
    }

    // Return best match
    const bestMatch = matches[0];

    return {
      intent_name: bestMatch.intent_name,
      confidence: bestMatch.confidence,
      entities: await this.extractEntities(text, tenantId),
      context: {
        matched_pattern: bestMatch.pattern.pattern,
        pattern_type: bestMatch.pattern.pattern_type
      }
    };
  }

  /**
   * Match text against pattern
   */
  private matchPattern(text: string, pattern: any): number {
    const normalizedText = text.toLowerCase().trim();

    switch (pattern.pattern_type) {
      case 'regex':
        return this.matchRegex(normalizedText, pattern.pattern);

      case 'keyword':
        return this.matchKeywords(normalizedText, pattern.pattern);

      case 'semantic':
        return this.matchSemantic(normalizedText, pattern.training_examples);

      default:
        return 0;
    }
  }

  /**
   * Match using regex
   */
  private matchRegex(text: string, pattern: string): number {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text) ? 0.95 : 0;
    } catch (error) {
      this.logger.error('Invalid regex pattern', { pattern, error });
      return 0;
    }
  }

  /**
   * Match using keywords
   */
  private matchKeywords(text: string, pattern: string): number {
    const keywords = pattern.toLowerCase().split('|');
    const matchedKeywords = keywords.filter(keyword =>
      text.includes(keyword.trim())
    );

    if (matchedKeywords.length === 0) {
      return 0;
    }

    return Math.min(0.7 + (matchedKeywords.length * 0.1), 0.95);
  }

  /**
   * Match using semantic similarity (mock)
   */
  private matchSemantic(text: string, trainingExamples: string[]): number {
    // In production, this would use embeddings and similarity scoring
    // For now, simple keyword overlap
    const textWords = new Set(text.toLowerCase().split(/\s+/));

    const similarities = trainingExamples.map(example => {
      const exampleWords = new Set(example.toLowerCase().split(/\s+/));
      const intersection = new Set([...textWords].filter(w => exampleWords.has(w)));
      const union = new Set([...textWords, ...exampleWords]);

      return intersection.size / union.size;
    });

    return Math.max(...similarities, 0);
  }

  /**
   * Extract entities from text (mock)
   */
  private async extractEntities(text: string, tenantId: string): Promise<EntityData[]> {
    // Mock entity extraction
    // In production, this would use NER models
    const entities: EntityData[] = [];

    // Simple email extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        entities.push({
          entity_type: 'email',
          entity_value: email,
          confidence: 0.99
        });
      });
    }

    // Simple phone extraction
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phones = text.match(phoneRegex);
    if (phones) {
      phones.forEach(phone => {
        entities.push({
          entity_type: 'phone',
          entity_value: phone,
          confidence: 0.95
        });
      });
    }

    return entities;
  }
}
