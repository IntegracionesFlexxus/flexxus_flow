/**
 * Duplicate Detector Service
 * Identifies and manages duplicate leads using multiple matching strategies
 * Uses pg_trgm for fuzzy matching without external APIs
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LeadRepository } from '../../../repositories/LeadRepository';
import { EventEmitter } from 'events';

export interface IDuplicateMatch {
  leadId: number;
  matchedLeadId: number;
  matchScore: number;
  matchType: string[];
  details: {
    emailMatch?: boolean;
    phoneMatch?: boolean;
    nameMatch?: number;
    companyMatch?: number;
    addressMatch?: boolean;
  };
}

export interface IMergeStrategy {
  keepField: 'newest' | 'oldest' | 'highest_score' | 'manual';
  preserveHistory: boolean;
  mergeCustomFields: boolean;
}

@injectable()
export class DuplicateDetectorService {
  private readonly MATCH_THRESHOLD = 0.7; // 70% similarity for fuzzy matching
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.9; // 90% for auto-merge candidates

  constructor(
    @inject(TYPES.LeadRepository) private leadRepo: LeadRepository,
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.EventEmitter) private eventBus: EventEmitter
  ) {}

  /**
   * Find potential duplicates for a lead
   */
  async findDuplicates(leadId: number, companyId: number): Promise<IDuplicateMatch[]> {
    const lead = await this.leadRepo.findById(leadId, String(companyId));
    if (!lead) throw new Error('Lead not found');

    const duplicates: IDuplicateMatch[] = [];

    // Check multiple matching strategies in parallel
    const [
      emailMatches,
      phoneMatches,
      nameMatches,
      companyMatches
    ] = await Promise.all([
      this.findEmailMatches(lead, companyId),
      this.findPhoneMatches(lead, companyId),
      this.findNameMatches(lead, companyId),
      this.findCompanyMatches(lead, companyId)
    ]);

    // Combine and deduplicate results
    const allMatches = new Map<number, IDuplicateMatch>();

    // Process email matches (highest priority)
    emailMatches.forEach(match => {
      if (match.id !== leadId) {
        allMatches.set(match.id, {
          leadId,
          matchedLeadId: match.id,
          matchScore: 1.0,
          matchType: ['email'],
          details: { emailMatch: true }
        });
      }
    });

    // Process phone matches
    phoneMatches.forEach(match => {
      if (match.id !== leadId) {
        const existing = allMatches.get(match.id);
        if (existing) {
          existing.matchType.push('phone');
          existing.details.phoneMatch = true;
        } else {
          allMatches.set(match.id, {
            leadId,
            matchedLeadId: match.id,
            matchScore: 0.9,
            matchType: ['phone'],
            details: { phoneMatch: true }
          });
        }
      }
    });

    // Process name matches
    nameMatches.forEach(match => {
      if (match.id !== leadId) {
        const existing = allMatches.get(match.id);
        if (existing) {
          existing.matchType.push('name');
          existing.details.nameMatch = match.similarity;
          // Update score if name also matches
          existing.matchScore = Math.min(1.0, existing.matchScore + 0.2);
        } else if (match.similarity >= this.MATCH_THRESHOLD) {
          allMatches.set(match.id, {
            leadId,
            matchedLeadId: match.id,
            matchScore: match.similarity,
            matchType: ['name'],
            details: { nameMatch: match.similarity }
          });
        }
      }
    });

    // Process company matches
    companyMatches.forEach(match => {
      if (match.id !== leadId) {
        const existing = allMatches.get(match.id);
        if (existing) {
          existing.matchType.push('company');
          existing.details.companyMatch = match.similarity;
          // Boost score if company also matches
          existing.matchScore = Math.min(1.0, existing.matchScore + 0.1);
        } else if (match.similarity >= this.MATCH_THRESHOLD) {
          allMatches.set(match.id, {
            leadId,
            matchedLeadId: match.id,
            matchScore: match.similarity * 0.7, // Company alone is weaker signal
            matchType: ['company'],
            details: { companyMatch: match.similarity }
          });
        }
      }
    });

    // Convert to array and sort by match score
    duplicates.push(...Array.from(allMatches.values()));
    duplicates.sort((a, b) => b.matchScore - a.matchScore);

    // Log duplicate detection
    if (duplicates.length > 0) {
      await this.logDuplicateDetection(leadId, duplicates, companyId);
    }

    return duplicates;
  }

  /**
   * Find matches by email
   */
  private async findEmailMatches(lead: any, companyId: number): Promise<any[]> {
    if (!lead.email) return [];

    const query = `
      SELECT id, email, first_name, last_name, company_name, score
      FROM public.leads
      WHERE company_id = $1
        AND LOWER(email) = LOWER($2)
        AND id != $3
        AND status != 'converted'
    `;

    const result = await this.db.query(query, [companyId, lead.email, lead.id]);
    return result.rows;
  }

  /**
   * Find matches by phone (with normalization)
   */
  private async findPhoneMatches(lead: any, companyId: number): Promise<any[]> {
    if (!lead.phone && !lead.mobile) return [];

    const phones = [lead.phone, lead.mobile].filter(Boolean);
    const normalizedPhones = phones.map(p => this.normalizePhone(p));

    const query = `
      SELECT DISTINCT id, phone, mobile, first_name, last_name, company_name
      FROM public.leads
      WHERE company_id = $1
        AND id != $2
        AND status != 'converted'
        AND (
          regexp_replace(phone, '[^0-9]', '', 'g') = ANY($3::text[])
          OR regexp_replace(mobile, '[^0-9]', '', 'g') = ANY($3::text[])
        )
    `;

    const result = await this.db.query(query, [companyId, lead.id, normalizedPhones]);
    return result.rows;
  }

  /**
   * Find matches by name using fuzzy matching
   */
  private async findNameMatches(lead: any, companyId: number): Promise<any[]> {
    if (!lead.first_name && !lead.last_name) return [];

    const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();

    const query = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        company_name,
        similarity(
          LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
          LOWER($2)
        ) as similarity
      FROM public.leads
      WHERE company_id = $1
        AND id != $3
        AND status != 'converted'
        AND similarity(
          LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
          LOWER($2)
        ) > 0.5
      ORDER BY similarity DESC
      LIMIT 10
    `;

    const result = await this.db.query(query, [companyId, fullName, lead.id]);
    return result.rows;
  }

  /**
   * Find matches by company name
   */
  private async findCompanyMatches(lead: any, companyId: number): Promise<any[]> {
    if (!lead.company_name) return [];

    const query = `
      SELECT
        id,
        company_name,
        first_name,
        last_name,
        email,
        similarity(LOWER(company_name), LOWER($2)) as similarity
      FROM public.leads
      WHERE company_id = $1
        AND id != $3
        AND status != 'converted'
        AND company_name IS NOT NULL
        AND similarity(LOWER(company_name), LOWER($2)) > 0.6
      ORDER BY similarity DESC
      LIMIT 10
    `;

    const result = await this.db.query(query, [companyId, lead.company_name, lead.id]);
    return result.rows;
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    // Remove all non-numeric characters
    let normalized = phone.replace(/[^\d]/g, '');

    // Remove country code if present (assuming US +1)
    if (normalized.startsWith('1') && normalized.length === 11) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  /**
   * Merge duplicate leads
   */
  async mergeDuplicates(
    primaryLeadId: number,
    duplicateLeadIds: number[],
    strategy: IMergeStrategy,
    companyId: number,
    userId: number
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get all leads involved in the merge
      const allLeadIds = [primaryLeadId, ...duplicateLeadIds];
      const leadsQuery = `
        SELECT * FROM public.leads
        WHERE id = ANY($1::int[])
          AND company_id = $2
        ORDER BY
          CASE
            WHEN $3 = 'newest' THEN created_at
            WHEN $3 = 'oldest' THEN -EXTRACT(EPOCH FROM created_at)
            WHEN $3 = 'highest_score' THEN -score
            ELSE id
          END DESC
      `;

      const leadsResult = await client.query(leadsQuery, [
        allLeadIds,
        companyId,
        strategy.keepField
      ]);

      if (leadsResult.rows.length === 0) {
        throw new Error('No leads found for merging');
      }

      const primaryLead = leadsResult.rows.find(l => l.id === primaryLeadId) || leadsResult.rows[0];
      const duplicates = leadsResult.rows.filter(l => l.id !== primaryLead.id);

      // Merge data into primary lead
      const mergedData = this.mergeLeadData(primaryLead, duplicates, strategy);

      // Update primary lead with merged data
      await client.query(
        `UPDATE public.leads
         SET
           first_name = $1,
           last_name = $2,
           email = $3,
           phone = $4,
           mobile = $5,
           company_name = $6,
           job_title = $7,
           budget = $8,
           authority_level = $9,
           need_description = $10,
           timeline = $11,
           notes = $12,
           tags = $13,
           custom_fields = $14,
           score = $15,
           updated_at = NOW(),
           updated_by = $16
         WHERE id = $17 AND company_id = $18`,
        [
          mergedData.first_name,
          mergedData.last_name,
          mergedData.email,
          mergedData.phone,
          mergedData.mobile,
          mergedData.company_name,
          mergedData.job_title,
          mergedData.budget,
          mergedData.authority_level,
          mergedData.need_description,
          mergedData.timeline,
          mergedData.notes,
          mergedData.tags,
          JSON.stringify(mergedData.custom_fields),
          mergedData.score,
          userId,
          primaryLead.id,
          companyId
        ]
      );

      // Log the merge
      for (const duplicate of duplicates) {
        await client.query(
          `INSERT INTO public.lead_merge_logs
           (primary_lead_id, merged_lead_id, merge_data, performed_by, company_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            primaryLead.id,
            duplicate.id,
            JSON.stringify({
              strategy,
              originalData: duplicate,
              mergedInto: primaryLead.id
            }),
            userId,
            companyId
          ]
        );

        // Mark duplicate as merged (soft delete)
        await client.query(
          `UPDATE public.leads
           SET status = 'merged',
               merged_into = $1,
               updated_at = NOW(),
               updated_by = $2
           WHERE id = $3 AND company_id = $4`,
          [primaryLead.id, userId, duplicate.id, companyId]
        );

        // Transfer related records if preserving history
        if (strategy.preserveHistory) {
          // Transfer engagement events
          await client.query(
            `UPDATE public.lead_engagement_events
             SET lead_id = $1
             WHERE lead_id = $2`,
            [primaryLead.id, duplicate.id]
          );

          // Transfer scoring history
          await client.query(
            `UPDATE public.lead_scoring_history
             SET lead_id = $1
             WHERE lead_id = $2`,
            [primaryLead.id, duplicate.id]
          );

          // Transfer assignment logs
          await client.query(
            `UPDATE public.lead_assignment_logs
             SET lead_id = $1
             WHERE lead_id = $2`,
            [primaryLead.id, duplicate.id]
          );
        }
      }

      await client.query('COMMIT');

      // Emit merge event
      this.eventBus.emit('leads.merged', {
        primaryLeadId: primaryLead.id,
        mergedLeadIds: duplicates.map(d => d.id),
        strategy,
        companyId,
        userId,
        timestamp: new Date()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Merge lead data based on strategy
   */
  private mergeLeadData(primary: any, duplicates: any[], strategy: IMergeStrategy): any {
    const merged = { ...primary };

    // Helper to select best value based on strategy
    const selectValue = (field: string) => {
      const values = [primary[field], ...duplicates.map(d => d[field])].filter(Boolean);
      if (values.length === 0) return null;

      switch (strategy.keepField) {
        case 'newest':
          // Get from most recently created lead
          const newestLead = [primary, ...duplicates].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          return newestLead[field] || values[0];

        case 'oldest':
          // Get from oldest lead
          const oldestLead = [primary, ...duplicates].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          return oldestLead[field] || values[0];

        case 'highest_score':
          // Get from lead with highest score
          const highestScoreLead = [primary, ...duplicates].sort(
            (a, b) => (b.score || 0) - (a.score || 0)
          )[0];
          return highestScoreLead[field] || values[0];

        default:
          // Keep primary's value if exists
          return primary[field] || values[0];
      }
    };

    // Merge fields
    merged.first_name = selectValue('first_name');
    merged.last_name = selectValue('last_name');
    merged.email = selectValue('email');
    merged.phone = selectValue('phone');
    merged.mobile = selectValue('mobile');
    merged.company_name = selectValue('company_name');
    merged.job_title = selectValue('job_title');

    // Merge numeric fields (take maximum)
    merged.budget = Math.max(
      primary.budget || 0,
      ...duplicates.map(d => d.budget || 0)
    ) || null;

    merged.score = Math.max(
      primary.score || 0,
      ...duplicates.map(d => d.score || 0)
    );

    // Merge authority level (take highest)
    const authorityLevels = ['decision_maker', 'influencer', 'evaluator', 'user', 'other'];
    const allAuthorities = [primary.authority_level, ...duplicates.map(d => d.authority_level)]
      .filter(Boolean);

    if (allAuthorities.length > 0) {
      merged.authority_level = allAuthorities.reduce((best, current) => {
        const bestIndex = authorityLevels.indexOf(best);
        const currentIndex = authorityLevels.indexOf(current);
        return currentIndex < bestIndex ? current : best;
      });
    }

    // Merge timeline (take most urgent)
    const timelines = ['immediate', '1_month', '3_months', '6_months', '1_year', 'unknown'];
    const allTimelines = [primary.timeline, ...duplicates.map(d => d.timeline)]
      .filter(Boolean);

    if (allTimelines.length > 0) {
      merged.timeline = allTimelines.reduce((best, current) => {
        const bestIndex = timelines.indexOf(best);
        const currentIndex = timelines.indexOf(current);
        return currentIndex < bestIndex ? current : best;
      });
    }

    // Merge text fields (concatenate unique content)
    const allNotes = [primary.notes, ...duplicates.map(d => d.notes)]
      .filter(Boolean)
      .join('\n---\n');
    if (allNotes) merged.notes = allNotes;

    const allNeeds = [primary.need_description, ...duplicates.map(d => d.need_description)]
      .filter(Boolean)
      .join('\n---\n');
    if (allNeeds) merged.need_description = allNeeds;

    // Merge tags (combine unique)
    const allTags = new Set();
    [primary.tags, ...duplicates.flatMap(d => d.tags || [])]
      .filter(Boolean)
      .flat()
      .forEach(tag => allTags.add(tag));
    merged.tags = Array.from(allTags);

    // Merge custom fields
    if (strategy.mergeCustomFields) {
      merged.custom_fields = {};
      [primary, ...duplicates].forEach(lead => {
        if (lead.custom_fields) {
          Object.assign(merged.custom_fields, lead.custom_fields);
        }
      });
    }

    return merged;
  }

  /**
   * Log duplicate detection
   */
  private async logDuplicateDetection(
    leadId: number,
    duplicates: IDuplicateMatch[],
    companyId: number
  ): Promise<void> {
    const query = `
      INSERT INTO public.lead_duplicate_detections
      (lead_id, duplicate_candidates, detection_timestamp, company_id)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (lead_id, company_id)
      DO UPDATE SET
        duplicate_candidates = $2,
        detection_timestamp = NOW()
    `;

    await this.db.query(query, [
      leadId,
      JSON.stringify(duplicates),
      companyId
    ]);
  }

  /**
   * Auto-merge high confidence duplicates
   */
  async autoMergeHighConfidenceDuplicates(companyId: number, userId: number): Promise<number> {
    let mergedCount = 0;

    // Find all leads with potential duplicates
    const query = `
      SELECT DISTINCT l1.id as lead1, l2.id as lead2
      FROM public.leads l1
      JOIN public.leads l2 ON l1.company_id = l2.company_id
      WHERE l1.company_id = $1
        AND l1.id < l2.id
        AND l1.status != 'converted' AND l1.status != 'merged'
        AND l2.status != 'converted' AND l2.status != 'merged'
        AND LOWER(l1.email) = LOWER(l2.email)
        AND l1.email IS NOT NULL
    `;

    const result = await this.db.query(query, [companyId]);

    for (const row of result.rows) {
      try {
        // Check if this is truly a high-confidence match
        const duplicates = await this.findDuplicates(row.lead1, companyId);
        const match = duplicates.find(d => d.matchedLeadId === row.lead2);

        if (match && match.matchScore >= this.HIGH_CONFIDENCE_THRESHOLD) {
          // Auto-merge using highest score strategy
          await this.mergeDuplicates(
            row.lead1,
            [row.lead2],
            {
              keepField: 'highest_score',
              preserveHistory: true,
              mergeCustomFields: true
            },
            companyId,
            userId
          );
          mergedCount++;
        }
      } catch (error) {
        console.error(`Error auto-merging leads ${row.lead1} and ${row.lead2}:`, error);
      }
    }

    if (mergedCount > 0) {
      this.eventBus.emit('duplicates.auto_merged', {
        companyId,
        count: mergedCount,
        timestamp: new Date()
      });
    }

    return mergedCount;
  }

  /**
   * Find all duplicate groups in the system
   */
  async findAllDuplicateGroups(companyId: number): Promise<any[]> {
    const query = `
      WITH duplicate_groups AS (
        SELECT
          LOWER(email) as group_key,
          'email' as match_type,
          array_agg(id) as lead_ids,
          COUNT(*) as duplicate_count
        FROM public.leads
        WHERE company_id = $1
          AND email IS NOT NULL
          AND status NOT IN ('converted', 'merged')
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1

        UNION ALL

        SELECT
          regexp_replace(phone, '[^0-9]', '', 'g') as group_key,
          'phone' as match_type,
          array_agg(id) as lead_ids,
          COUNT(*) as duplicate_count
        FROM public.leads
        WHERE company_id = $1
          AND phone IS NOT NULL
          AND status NOT IN ('converted', 'merged')
        GROUP BY regexp_replace(phone, '[^0-9]', '', 'g')
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_groups
      ORDER BY duplicate_count DESC
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }
}