/**
 * Contact Role Management Service
 * Sprint 17: Contact Role and Buying Committee Management
 *
 * Manages contact roles, buying committees, influence mapping,
 * and decision-making authority within accounts.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import winston from 'winston';

interface ContactRole {
  id: number;
  company_id: number;
  role_code: string;
  role_name: string;
  role_category: string;
  default_influence_score: number;
}

interface AccountContactRole {
  id: number;
  company_id: number;
  account_id: number;
  contact_id: number;
  contact_role_id: number;
  is_primary: boolean;
  influence_score: number;
  decision_authority_level: string;
}

interface BuyingCommittee {
  id: number;
  company_id: number;
  account_id: number;
  committee_name: string;
  committee_type: string;
  decision_stage: string;
  status: string;
}

interface BuyingCommitteeMember {
  id: number;
  buying_committee_id: number;
  contact_id: number;
  role_in_committee: string;
  voting_power: number;
  influence_level: string;
  stance: string;
  is_champion: boolean;
}

interface ContactRelationship {
  id: number;
  company_id: number;
  from_contact_id: number;
  to_contact_id: number;
  relationship_type: string;
  relationship_strength: number;
  is_bidirectional: boolean;
}

@injectable()
export class ContactRoleManagementService {
  constructor(
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Assigns a role to a contact within an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @param contactId - Contact ID
   * @param roleId - Role ID
   * @param isPrimary - Whether this is the primary contact for this role
   * @param influenceScore - Influence score (0-100)
   * @returns The created role assignment
   */
  async assignRoleToContact(
    companyId: number,
    accountId: number,
    contactId: number,
    roleId: number,
    isPrimary: boolean = false,
    influenceScore?: number
  ): Promise<AccountContactRole> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // If isPrimary, remove primary flag from other contacts with same role
      if (isPrimary) {
        await client.query(
          `UPDATE account_contact_roles
           SET is_primary = false
           WHERE company_id = $1 AND account_id = $2 AND contact_role_id = $3
             AND contact_id != $4`,
          [companyId, accountId, roleId, contactId]
        );
      }

      // Get default influence score if not provided
      let finalInfluenceScore = influenceScore;
      if (finalInfluenceScore === undefined) {
        const roleResult = await client.query(
          'SELECT default_influence_score FROM contact_roles WHERE id = $1',
          [roleId]
        );
        finalInfluenceScore = roleResult.rows[0]?.default_influence_score || 50;
      }

      // Create or update role assignment
      const result = await client.query(
        `INSERT INTO account_contact_roles
         (company_id, account_id, contact_id, contact_role_id, is_primary,
          influence_score, decision_authority_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (company_id, account_id, contact_id, contact_role_id)
         DO UPDATE SET
           is_primary = $5,
           influence_score = $6,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          companyId,
          accountId,
          contactId,
          roleId,
          isPrimary,
          finalInfluenceScore,
          this.determineDecisionAuthority(finalInfluenceScore)
        ]
      );

      // Update contact's overall influence score
      await this.recalculateContactInfluence(contactId, companyId, client);

      await client.query('COMMIT');

      this.logger.info('Role assigned to contact', {
        companyId,
        accountId,
        contactId,
        roleId,
        isPrimary
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error assigning role to contact', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Removes a role from a contact in an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @param contactId - Contact ID
   * @param roleId - Role ID to remove
   */
  async removeRoleFromContact(
    companyId: number,
    accountId: number,
    contactId: number,
    roleId: number
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `DELETE FROM account_contact_roles
         WHERE company_id = $1 AND account_id = $2
         AND contact_id = $3 AND contact_role_id = $4`,
        [companyId, accountId, contactId, roleId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact role assignment not found');
      }

      this.logger.info('Role removed from contact', {
        companyId,
        accountId,
        contactId,
        roleId
      });
    } catch (error) {
      this.logger.error('Error removing role from contact', error);
      throw error;
    }
  }

  /**
   * Creates a buying committee for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @param committeeName - Committee name
   * @param committeeType - Type of committee
   * @param decisionStage - Current decision stage
   * @param opportunityId - Optional opportunity ID
   * @returns Created buying committee
   */
  async createBuyingCommittee(
    companyId: number,
    accountId: number,
    committeeName: string,
    committeeType: string,
    decisionStage: string,
    opportunityId?: number
  ): Promise<BuyingCommittee> {
    try {
      const result = await this.db.query(
        `INSERT INTO buying_committees
         (company_id, account_id, opportunity_id, committee_name,
          committee_type, decision_stage, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'forming')
         RETURNING *`,
        [
          companyId,
          accountId,
          opportunityId || null,
          committeeName,
          committeeType,
          decisionStage
        ]
      );

      this.logger.info('Buying committee created', {
        companyId,
        accountId,
        committeeId: result.rows[0].id
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating buying committee', error);
      throw error;
    }
  }

  /**
   * Adds a member to a buying committee
   * @param companyId - Company ID
   * @param committeeId - Committee ID
   * @param contactId - Contact ID
   * @param roleInCommittee - Role within the committee
   * @param votingPower - Voting power (1-10)
   * @param stance - Stance towards decision
   * @param isChampion - Whether this is the champion
   * @returns Created committee member
   */
  async addMemberToBuyingCommittee(
    companyId: number,
    committeeId: number,
    contactId: number,
    roleInCommittee: string,
    votingPower: number = 1,
    stance: string = 'neutral',
    isChampion: boolean = false
  ): Promise<BuyingCommitteeMember> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify committee belongs to company
      const committeeCheck = await client.query(
        'SELECT id FROM buying_committees WHERE id = $1 AND company_id = $2',
        [committeeId, companyId]
      );

      if (committeeCheck.rows.length === 0) {
        throw new Error('Buying committee not found');
      }

      // If isChampion, remove champion flag from others
      if (isChampion) {
        await client.query(
          `UPDATE buying_committee_members
           SET is_champion = false
           WHERE buying_committee_id = $1`,
          [committeeId]
        );
      }

      // Add member
      const result = await client.query(
        `INSERT INTO buying_committee_members
         (company_id, buying_committee_id, contact_id, role_in_committee,
          voting_power, influence_level, stance, is_champion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (buying_committee_id, contact_id)
         DO UPDATE SET
           role_in_committee = $4,
           voting_power = $5,
           influence_level = $6,
           stance = $7,
           is_champion = $8,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          companyId,
          committeeId,
          contactId,
          roleInCommittee,
          votingPower,
          this.calculateInfluenceLevel(votingPower),
          stance,
          isChampion
        ]
      );

      // Update contact's influence score
      await this.recalculateContactInfluence(contactId, companyId, client);

      await client.query('COMMIT');

      this.logger.info('Member added to buying committee', {
        companyId,
        committeeId,
        contactId,
        isChampion
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error adding member to buying committee', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates or updates a relationship between contacts
   * @param companyId - Company ID
   * @param fromContactId - Source contact ID
   * @param toContactId - Target contact ID
   * @param relationshipType - Type of relationship
   * @param relationshipStrength - Strength (0-100)
   * @param isBidirectional - Whether relationship is bidirectional
   * @returns Created relationship
   */
  async createContactRelationship(
    companyId: number,
    fromContactId: number,
    toContactId: number,
    relationshipType: string,
    relationshipStrength: number = 50,
    isBidirectional: boolean = false,
    context?: string
  ): Promise<ContactRelationship> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate no self-relationship
      if (fromContactId === toContactId) {
        throw new Error('Cannot create self-relationship');
      }

      // Create primary relationship
      const result = await client.query(
        `INSERT INTO contact_relationships
         (company_id, from_contact_id, to_contact_id, relationship_type,
          relationship_strength, is_bidirectional, context, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (company_id, from_contact_id, to_contact_id, relationship_type)
         DO UPDATE SET
           relationship_strength = $5,
           is_bidirectional = $6,
           context = $7,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          companyId,
          fromContactId,
          toContactId,
          relationshipType,
          relationshipStrength,
          isBidirectional,
          context || null,
          80 // Default confidence score
        ]
      );

      // Create reverse relationship if bidirectional
      if (isBidirectional) {
        await client.query(
          `INSERT INTO contact_relationships
           (company_id, from_contact_id, to_contact_id, relationship_type,
            relationship_strength, is_bidirectional, context, confidence_score)
           VALUES ($1, $2, $3, $4, $5, false, $6, $7)
           ON CONFLICT (company_id, from_contact_id, to_contact_id, relationship_type)
           DO UPDATE SET
             relationship_strength = $5,
             context = $6,
             updated_at = CURRENT_TIMESTAMP`,
          [
            companyId,
            toContactId,
            fromContactId,
            this.getInverseRelationshipType(relationshipType),
            relationshipStrength,
            context || null,
            80
          ]
        );
      }

      await client.query('COMMIT');

      this.logger.info('Contact relationship created', {
        companyId,
        fromContactId,
        toContactId,
        relationshipType
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating contact relationship', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets decision makers for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns List of decision makers with their roles and influence
   */
  async getAccountDecisionMakers(
    companyId: number,
    accountId: number
  ): Promise<Array<{
    contact: any;
    roles: ContactRole[];
    totalInfluence: number;
    committees: string[];
  }>> {
    try {
      // Get contacts with decision-making roles
      const decisionMakers = await this.db.query(
        `SELECT DISTINCT
          c.*,
          acr.influence_score,
          acr.decision_authority_level
         FROM contacts c
         JOIN account_contact_roles acr ON c.id = acr.contact_id
         JOIN contact_roles cr ON acr.contact_role_id = cr.id
         WHERE acr.company_id = $1 AND acr.account_id = $2
           AND cr.role_category IN ('decision_maker', 'financial')
           AND c.is_active = true
         ORDER BY acr.influence_score DESC`,
        [companyId, accountId]
      );

      const results = [];

      for (const dm of decisionMakers.rows) {
        // Get all roles for this contact
        const roles = await this.db.query(
          `SELECT cr.*
           FROM contact_roles cr
           JOIN account_contact_roles acr ON cr.id = acr.contact_role_id
           WHERE acr.company_id = $1 AND acr.account_id = $2 AND acr.contact_id = $3`,
          [companyId, accountId, dm.id]
        );

        // Get committees
        const committees = await this.db.query(
          `SELECT bc.committee_name
           FROM buying_committees bc
           JOIN buying_committee_members bcm ON bc.id = bcm.buying_committee_id
           WHERE bc.company_id = $1 AND bc.account_id = $2 AND bcm.contact_id = $3`,
          [companyId, accountId, dm.id]
        );

        results.push({
          contact: dm,
          roles: roles.rows,
          totalInfluence: dm.influence_score,
          committees: committees.rows.map(c => c.committee_name)
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Error getting account decision makers', error);
      throw error;
    }
  }

  /**
   * Analyzes buying committee influence and coverage
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns Analysis of buying committee
   */
  async analyzeBuyingCommitteeInfluence(
    companyId: number,
    accountId: number
  ): Promise<{
    totalMembers: number;
    decisionMakers: number;
    influencers: number;
    champions: number;
    averageInfluence: number;
    coverageGaps: string[];
    committeeReadiness: number;
  }> {
    try {
      // Get all committees for the account
      const committees = await this.db.query(
        `SELECT * FROM buying_committees
         WHERE company_id = $1 AND account_id = $2 AND status != 'dissolved'`,
        [companyId, accountId]
      );

      let totalMembers = 0;
      let decisionMakers = 0;
      let influencers = 0;
      let champions = 0;
      let totalInfluence = 0;
      const rolesCovered = new Set<string>();

      for (const committee of committees.rows) {
        const members = await this.db.query(
          `SELECT bcm.*, cr.role_category
           FROM buying_committee_members bcm
           LEFT JOIN account_contact_roles acr ON acr.contact_id = bcm.contact_id
             AND acr.account_id = $2 AND acr.company_id = $1
           LEFT JOIN contact_roles cr ON cr.id = acr.contact_role_id
           WHERE bcm.buying_committee_id = $3`,
          [companyId, accountId, committee.id]
        );

        for (const member of members.rows) {
          totalMembers++;

          if (member.is_champion) champions++;
          if (member.role_category === 'decision_maker') decisionMakers++;
          if (member.role_category === 'influencer') influencers++;

          // Calculate influence based on voting power
          const memberInfluence = (member.voting_power || 1) * 10;
          totalInfluence += memberInfluence;

          if (member.role_in_committee) {
            rolesCovered.add(member.role_in_committee);
          }
        }
      }

      // Identify coverage gaps
      const requiredRoles = [
        'executive_sponsor',
        'budget_holder',
        'technical_evaluator',
        'end_user_representative'
      ];

      const coverageGaps = requiredRoles.filter(role => !rolesCovered.has(role));

      // Calculate committee readiness score (0-100)
      let readinessScore = 0;

      // Has champion (25 points)
      if (champions > 0) readinessScore += 25;

      // Has decision makers (25 points)
      if (decisionMakers > 0) readinessScore += 25;

      // Coverage completeness (25 points)
      const coveragePercentage = (rolesCovered.size / requiredRoles.length);
      readinessScore += Math.round(coveragePercentage * 25);

      // Engagement level (25 points)
      const avgInfluence = totalMembers > 0 ? totalInfluence / totalMembers : 0;
      readinessScore += Math.round((avgInfluence / 100) * 25);

      return {
        totalMembers,
        decisionMakers,
        influencers,
        champions,
        averageInfluence: Math.round(avgInfluence),
        coverageGaps,
        committeeReadiness: readinessScore
      };
    } catch (error) {
      this.logger.error('Error analyzing buying committee influence', error);
      throw error;
    }
  }

  /**
   * Gets the influence network for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns Network graph data
   */
  async getInfluenceMap(
    companyId: number,
    accountId: number
  ): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      influence: number;
      role: string;
      isChampion: boolean;
    }>;
    edges: Array<{
      from: string;
      to: string;
      strength: number;
      type: string;
    }>;
  }> {
    try {
      // Get all contacts in the account
      const contacts = await this.db.query(
        `SELECT DISTINCT
          c.id,
          c.first_name,
          c.last_name,
          c.job_title,
          c.influence_score,
          MAX(CASE WHEN bcm.is_champion THEN 1 ELSE 0 END) as is_champion
         FROM contacts c
         LEFT JOIN buying_committee_members bcm ON c.id = bcm.contact_id
         LEFT JOIN buying_committees bc ON bcm.buying_committee_id = bc.id
           AND bc.account_id = $2 AND bc.company_id = $1
         WHERE c.account_id = $2 AND c.company_id = $1 AND c.is_active = true
         GROUP BY c.id`,
        [companyId, accountId]
      );

      // Get relationships
      const relationships = await this.db.query(
        `SELECT cr.*
         FROM contact_relationships cr
         WHERE cr.company_id = $1
           AND cr.from_contact_id IN (
             SELECT id FROM contacts WHERE account_id = $2 AND company_id = $1
           )
           AND cr.to_contact_id IN (
             SELECT id FROM contacts WHERE account_id = $2 AND company_id = $1
           )`,
        [companyId, accountId]
      );

      // Build nodes
      const nodes = contacts.rows.map(contact => ({
        id: contact.id.toString(),
        name: `${contact.first_name} ${contact.last_name}`,
        influence: contact.influence_score || 0,
        role: contact.job_title || 'Unknown',
        isChampion: Boolean(contact.is_champion)
      }));

      // Build edges
      const edges = relationships.rows.map(rel => ({
        from: rel.from_contact_id.toString(),
        to: rel.to_contact_id.toString(),
        strength: rel.relationship_strength,
        type: rel.relationship_type
      }));

      return { nodes, edges };
    } catch (error) {
      this.logger.error('Error getting influence map', error);
      throw error;
    }
  }

  /**
   * Identifies key influencers in an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns List of key influencers with metrics
   */
  async identifyKeyInfluencers(
    companyId: number,
    accountId: number
  ): Promise<Array<{
    contact: any;
    influenceScore: number;
    networkSize: number;
    championStatus: boolean;
    decisionAuthority: string;
    recommendationReason: string;
  }>> {
    try {
      // Get contacts with high influence or strategic positions
      const influencers = await this.db.query(
        `WITH contact_metrics AS (
          SELECT
            c.*,
            c.influence_score,
            COUNT(DISTINCT cr_out.to_contact_id) as outbound_connections,
            COUNT(DISTINCT cr_in.from_contact_id) as inbound_connections,
            MAX(CASE WHEN bcm.is_champion THEN 1 ELSE 0 END) as is_champion,
            MAX(acr.decision_authority_level) as decision_authority
          FROM contacts c
          LEFT JOIN contact_relationships cr_out ON c.id = cr_out.from_contact_id
            AND cr_out.company_id = $1
          LEFT JOIN contact_relationships cr_in ON c.id = cr_in.to_contact_id
            AND cr_in.company_id = $1
          LEFT JOIN buying_committee_members bcm ON c.id = bcm.contact_id
          LEFT JOIN account_contact_roles acr ON c.id = acr.contact_id
            AND acr.account_id = $2 AND acr.company_id = $1
          WHERE c.company_id = $1 AND c.account_id = $2 AND c.is_active = true
          GROUP BY c.id
        )
        SELECT *
        FROM contact_metrics
        ORDER BY
          influence_score DESC,
          (outbound_connections + inbound_connections) DESC,
          is_champion DESC
        LIMIT 10`,
        [companyId, accountId]
      );

      return influencers.rows.map(contact => {
        let reason = '';

        if (contact.is_champion) {
          reason = 'Identified as champion';
        } else if (contact.influence_score >= 80) {
          reason = 'High influence score';
        } else if (contact.outbound_connections + contact.inbound_connections > 5) {
          reason = 'Well-connected in organization';
        } else if (contact.decision_authority === 'final') {
          reason = 'Final decision authority';
        } else {
          reason = 'Strategic position';
        }

        return {
          contact: {
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`,
            title: contact.job_title,
            email: contact.email
          },
          influenceScore: contact.influence_score || 0,
          networkSize: (contact.outbound_connections || 0) + (contact.inbound_connections || 0),
          championStatus: Boolean(contact.is_champion),
          decisionAuthority: contact.decision_authority || 'none',
          recommendationReason: reason
        };
      });
    } catch (error) {
      this.logger.error('Error identifying key influencers', error);
      throw error;
    }
  }

  /**
   * Recalculates contact influence score based on roles and committees
   * @private
   */
  private async recalculateContactInfluence(
    contactId: number,
    companyId: number,
    client: any
  ): Promise<void> {
    // Get role-based influence
    const rolesResult = await client.query(
      `SELECT SUM(acr.influence_score) as total_influence
       FROM account_contact_roles acr
       WHERE acr.contact_id = $1 AND acr.company_id = $2`,
      [contactId, companyId]
    );

    // Get committee-based influence
    const committeesResult = await client.query(
      `SELECT
        COUNT(*) as committee_count,
        SUM(voting_power) as total_voting_power,
        MAX(CASE WHEN is_champion THEN 1 ELSE 0 END) as is_champion
       FROM buying_committee_members
       WHERE contact_id = $1 AND company_id = $2`,
      [contactId, companyId]
    );

    const roleInfluence = parseFloat(rolesResult.rows[0]?.total_influence || 0);
    const committeeData = committeesResult.rows[0];

    // Calculate total influence
    let totalInfluence = roleInfluence / 2; // Average of role influences
    totalInfluence += (committeeData.committee_count || 0) * 5; // Bonus for committees
    totalInfluence += (committeeData.total_voting_power || 0) * 2; // Voting power bonus

    if (committeeData.is_champion) {
      totalInfluence += 20; // Champion bonus
    }

    // Cap at 100
    totalInfluence = Math.min(100, Math.round(totalInfluence));

    // Update contact
    await client.query(
      `UPDATE contacts
       SET influence_score = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [totalInfluence, contactId]
    );
  }

  /**
   * Determines decision authority level based on influence score
   * @private
   */
  private determineDecisionAuthority(influenceScore: number): string {
    if (influenceScore >= 80) return 'final';
    if (influenceScore >= 60) return 'recommend';
    if (influenceScore >= 40) return 'influence';
    return 'none';
  }

  /**
   * Calculates influence level from voting power
   * @private
   */
  private calculateInfluenceLevel(votingPower: number): string {
    if (votingPower >= 8) return 'high';
    if (votingPower >= 5) return 'medium';
    return 'low';
  }

  /**
   * Gets inverse relationship type
   * @private
   */
  private getInverseRelationshipType(relationshipType: string): string {
    const inverseMap: Record<string, string> = {
      'reports_to': 'manages',
      'manages': 'reports_to',
      'peer': 'peer',
      'mentor': 'mentee',
      'mentee': 'mentor',
      'external': 'external'
    };

    return inverseMap[relationshipType] || relationshipType;
  }
}