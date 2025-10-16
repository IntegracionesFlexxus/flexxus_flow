/**
 * Script to update WhatsApp Webhook Verify Token
 * Updates the webhook_verify_token in the channels table
 */

import { Pool } from 'pg';
import { environment } from '../config/environment';

const NEW_VERIFY_TOKEN = 'LO_QUE_QUIERAS';

const updateWebhookVerifyToken = async () => {
  console.log('🔐 Starting WhatsApp Webhook Verify Token Update...');

  const pool = new Pool({
    host: environment.database.omni.host || 'localhost',
    port: environment.database.omni.port || 5432,
    database: environment.database.omni.database || 'omni_db',
    user: environment.database.omni.user || 'postgres',
    password: environment.database.omni.password || 'postgres',
    max: 1
  });

  const client = await pool.connect();

  try {
    // Find WhatsApp channels
    console.log('\n📋 Searching for WhatsApp channels...');

    const channelsResult = await client.query(`
      SELECT id, name, channel_type, webhook_secret
      FROM channels
      WHERE channel_type = 'whatsapp'
      OR LOWER(name) LIKE '%whatsapp%'
    `);

    if (channelsResult.rows.length === 0) {
      console.log('⚠️  No WhatsApp channels found in database');
      return;
    }

    console.log(`\n✅ Found ${channelsResult.rows.length} WhatsApp channel(s):`);
    channelsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.channel_type}) [${row.id}]`);
      console.log(`     Current webhook_secret: ${row.webhook_secret || 'null'}`);
    });

    // Update each channel
    for (const channel of channelsResult.rows) {
      console.log(`\n🔧 Updating webhook verify token for channel: ${channel.name}`);

      await client.query(`
        UPDATE channels
        SET
          webhook_secret = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [NEW_VERIFY_TOKEN, channel.id]);

      console.log(`  ✓ Updated webhook_secret to: ${NEW_VERIFY_TOKEN}`);
    }

    console.log('\n✅ Webhook verify token update completed successfully!');

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyResult = await client.query(`
      SELECT
        id,
        name,
        channel_type,
        webhook_secret,
        webhook_url
      FROM channels
      WHERE channel_type = 'whatsapp'
      OR LOWER(name) LIKE '%whatsapp%'
    `);

    console.log('\n📊 Current WhatsApp webhook configuration:');
    verifyResult.rows.forEach(row => {
      console.log(`\n  Channel: ${row.name} (${row.channel_type})`);
      console.log(`  - ID: ${row.id}`);
      console.log(`  - Webhook URL: ${row.webhook_url || 'not set'}`);
      console.log(`  - Webhook Secret (Verify Token): ${row.webhook_secret}`);
    });

    console.log('\n🎉 Webhook verify token update process completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. The webhook verification will now require token: "LO_QUE_QUIERAS"');
    console.log('   2. Configure this token in Meta/Facebook Business Manager webhook settings');
    console.log('   3. Test webhook verification: GET /api/v1/omni/webhooks/whatsapp');

  } catch (error: any) {
    console.error('\n💥 Error updating webhook verify token:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run update
updateWebhookVerifyToken().catch(error => {
  console.error('Update error:', error);
  process.exit(1);
});
