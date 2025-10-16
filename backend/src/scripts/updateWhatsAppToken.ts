/**
 * Script to update WhatsApp access token
 * Updates the token in the channels table
 */

import { Pool } from 'pg';
import { environment } from '../config/environment';

const NEW_TOKEN = 'EAAKTrzWzTJIBPh5eQ43Wgyen0VEFELYZBuUvnZB5bNfSzVC0MPqwSCZAb0kW1FhUilfPqROfyJ6L1Mkyonqv248aKIa39kTUutSIEeZCLTrn9tpbq73opNEDYRmV3oSD3PlKNRIiNowiTkHEoA5b24gNs5R5hoJ5yHxROYS4pagJ54GgQ2dy6mSh1FjdQfc4ZBl1uISNtnqHmNCEOkukxJoQPR0NkZCu5FIVzxeLYm0hRmZAWmi6GzyHAZAfHId69QZDZD';

const updateWhatsAppToken = async () => {
  console.log('🔐 Starting WhatsApp Token Update...');

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
    console.log('📋 Searching for WhatsApp channels...');

    const channelsResult = await client.query(`
      SELECT id, name, type, config, details
      FROM channels
      WHERE type = 'whatsapp' OR type = 'WHATSAPP'
      OR LOWER(name) LIKE '%whatsapp%'
    `);

    if (channelsResult.rows.length === 0) {
      console.log('⚠️  No WhatsApp channels found in database');

      // Check if there are any channels at all
      const allChannels = await client.query('SELECT id, name, type FROM channels LIMIT 5');
      console.log('\n📊 Available channels:');
      allChannels.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.type}) [${row.id}]`);
      });

      return;
    }

    console.log(`\n✅ Found ${channelsResult.rows.length} WhatsApp channel(s):`);
    channelsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.type}) [${row.id}]`);
    });

    // Update each channel
    for (const channel of channelsResult.rows) {
      console.log(`\n🔧 Updating token for channel: ${channel.name}`);

      // Update in config JSONB field (if exists)
      if (channel.config) {
        await client.query(`
          UPDATE channels
          SET config = jsonb_set(
            COALESCE(config, '{}'::jsonb),
            '{api_token}',
            $1::jsonb
          )
          WHERE id = $2
        `, [JSON.stringify(NEW_TOKEN), channel.id]);
        console.log('  ✓ Updated config.api_token');
      }

      // Update in details JSONB field (if exists)
      if (channel.details) {
        await client.query(`
          UPDATE channels
          SET details = jsonb_set(
            COALESCE(details, '{}'::jsonb),
            '{access_token}',
            $1::jsonb
          )
          WHERE id = $2
        `, [JSON.stringify(NEW_TOKEN), channel.id]);
        console.log('  ✓ Updated details.access_token');
      }

      // Also update in whatsapp_channels table if it exists
      const whatsappChannelResult = await client.query(`
        SELECT id FROM whatsapp_channels WHERE channel_id = $1
      `, [channel.id]);

      if (whatsappChannelResult.rows.length > 0) {
        await client.query(`
          UPDATE whatsapp_channels
          SET access_token = $1
          WHERE channel_id = $2
        `, [NEW_TOKEN, channel.id]);
        console.log('  ✓ Updated whatsapp_channels.access_token');
      }
    }

    console.log('\n✅ Token update completed successfully!');

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyResult = await client.query(`
      SELECT
        c.id,
        c.name,
        c.type,
        c.config->>'api_token' as config_token,
        c.details->>'access_token' as details_token,
        wc.access_token as whatsapp_token
      FROM channels c
      LEFT JOIN whatsapp_channels wc ON c.id = wc.channel_id
      WHERE c.type = 'whatsapp' OR c.type = 'WHATSAPP'
      OR LOWER(c.name) LIKE '%whatsapp%'
    `);

    console.log('\n📊 Current token configuration:');
    verifyResult.rows.forEach(row => {
      console.log(`\n  Channel: ${row.name} (${row.type})`);
      console.log(`  - config.api_token: ${row.config_token ? row.config_token.substring(0, 20) + '...' : 'null'}`);
      console.log(`  - details.access_token: ${row.details_token ? row.details_token.substring(0, 20) + '...' : 'null'}`);
      console.log(`  - whatsapp_channels.access_token: ${row.whatsapp_token ? row.whatsapp_token.substring(0, 20) + '...' : 'null'}`);
    });

    console.log('\n🎉 WhatsApp token update process completed!');

  } catch (error: any) {
    console.error('💥 Error updating token:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run update
updateWhatsAppToken().catch(error => {
  console.error('Update error:', error);
  process.exit(1);
});
