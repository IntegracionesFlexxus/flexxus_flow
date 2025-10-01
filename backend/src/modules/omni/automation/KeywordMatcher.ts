/**
 * Keyword Matcher - Sprint 07
 * Matches keywords with support for various matching strategies
 */

import { injectable } from 'inversify';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

interface IKeywordConfig {
  keyword: string;
  options: {
    case_sensitive?: boolean;
    exact_match?: boolean;
    regex?: boolean;
    synonyms?: string[];
  };
}

@injectable()
export class KeywordMatcher {
  private logger: any;
  private synonymsMap: Map<string, string[]> = new Map();

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
    this.initializeDefaultSynonyms();
  }

  /**
   * Initialize default synonyms
   */
  private initializeDefaultSynonyms(): void {
    this.synonymsMap.set('help', ['assist', 'support', 'aid', 'ayuda', 'socorro']);
    this.synonymsMap.set('yes', ['si', 'yeah', 'yep', 'sure', 'ok', 'okay', 'affirmative']);
    this.synonymsMap.set('no', ['nope', 'nah', 'negative', 'not really']);
    this.synonymsMap.set('thanks', ['thank you', 'gracias', 'ty', 'thx']);
    this.synonymsMap.set('hello', ['hi', 'hey', 'hola', 'greetings', 'good morning', 'good afternoon']);
    this.synonymsMap.set('bye', ['goodbye', 'adios', 'see you', 'later', 'farewell']);
  }

  /**
   * Check if text matches any of the keywords
   */
  matchesAny(text: string, keywords: IKeywordConfig[]): boolean {
    if (!text || keywords.length === 0) return false;

    for (const keywordConfig of keywords) {
      if (this.matches(text, keywordConfig)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if text matches a specific keyword
   */
  matches(text: string, keywordConfig: IKeywordConfig): boolean {
    const { keyword, options } = keywordConfig;

    // Regex matching
    if (options.regex) {
      return this.matchesRegex(text, keyword, options.case_sensitive);
    }

    // Exact match
    if (options.exact_match) {
      return this.exactMatch(text, keyword, options.case_sensitive);
    }

    // Contains match (default)
    if (this.containsMatch(text, keyword, options.case_sensitive)) {
      return true;
    }

    // Check synonyms
    if (!options.regex && !options.exact_match) {
      const synonyms = options.synonyms || this.synonymsMap.get(keyword.toLowerCase()) || [];
      for (const synonym of synonyms) {
        if (this.containsMatch(text, synonym, options.case_sensitive)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Exact match
   */
  private exactMatch(text: string, keyword: string, caseSensitive?: boolean): boolean {
    if (!caseSensitive) {
      return text.toLowerCase() === keyword.toLowerCase();
    }
    return text === keyword;
  }

  /**
   * Contains match
   */
  private containsMatch(text: string, keyword: string, caseSensitive?: boolean): boolean {
    if (!caseSensitive) {
      return text.toLowerCase().includes(keyword.toLowerCase());
    }
    return text.includes(keyword);
  }

  /**
   * Regex match
   */
  private matchesRegex(text: string, pattern: string, caseSensitive?: boolean): boolean {
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      return regex.test(text);
    } catch (error) {
      this.logger.error('Invalid regex pattern', { pattern, error });
      return false;
    }
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, minLength: number = 3): string[] {
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall']);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= minLength && !stopWords.has(word));

    return [...new Set(words)];
  }

  /**
   * Calculate similarity score between text and keyword
   */
  calculateSimilarity(text: string, keyword: string): number {
    const textLower = text.toLowerCase();
    const keywordLower = keyword.toLowerCase();

    // Exact match
    if (textLower === keywordLower) return 1.0;

    // Contains match
    if (textLower.includes(keywordLower)) return 0.8;

    // Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(textLower, keywordLower);
    const maxLength = Math.max(textLower.length, keywordLower.length);
    const similarity = 1 - (distance / maxLength);

    return Math.max(0, similarity);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Add custom synonyms
   */
  addSynonyms(keyword: string, synonyms: string[]): void {
    const existing = this.synonymsMap.get(keyword.toLowerCase()) || [];
    this.synonymsMap.set(keyword.toLowerCase(), [...existing, ...synonyms]);
  }

  /**
   * Get all synonyms for a keyword
   */
  getSynonyms(keyword: string): string[] {
    return this.synonymsMap.get(keyword.toLowerCase()) || [];
  }
}