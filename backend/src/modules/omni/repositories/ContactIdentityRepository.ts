import { injectable } from 'inversify';
import { BaseOmniRepository } from './base/BaseOmniRepository';

interface ContactIdentityUpsertInput {
  contact_id: string;
  channel_id: string;
  external_id: string;
  display_name?: string;
  profile_data?: Record<string, any>;
  is_verified?: boolean;
}

@injectable()
export class ContactIdentityRepository extends BaseOmniRepository<any> {
  protected tableName = 'contact_identities';

  async findByChannelAndExternalId(channelId: string, externalId: string): Promise<any | null> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE channel_id = $1
        AND external_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [channelId, externalId]);
    return result.rows[0] || null;
  }

  async upsertIdentity(data: ContactIdentityUpsertInput): Promise<any> {
    const query = `
      INSERT INTO ${this.tableName}
        (contact_id, channel_id, external_id, display_name, profile_data, is_verified, first_interaction_at, last_interaction_at)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (channel_id, external_id)
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        display_name = COALESCE(EXCLUDED.display_name, ${this.tableName}.display_name),
        profile_data = COALESCE(EXCLUDED.profile_data, ${this.tableName}.profile_data),
        is_verified = COALESCE(EXCLUDED.is_verified, ${this.tableName}.is_verified),
        last_interaction_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const params = [
      data.contact_id,
      data.channel_id,
      data.external_id,
      data.display_name ?? null,
      data.profile_data ?? {},
      data.is_verified ?? false
    ];

    const result = await this.executeQuery(query, params);
    return result.rows[0];
  }
}
