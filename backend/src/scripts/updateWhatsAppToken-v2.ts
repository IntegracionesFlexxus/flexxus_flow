/**
 * Script to update WhatsApp access token
 * Updates the token in the channels table with proper encryption
 */

import { Pool } from 'pg';
import * as CryptoJS from 'crypto-js';
import { environment } from '../config/environment';

const NEW_TOKEN = 'EAAKTrzWzTJIBPh5eQ43Wgyen0VEFELYZBuUvnZB5bNfSzVC0MPqwSCZAb0kW1FhUilfPqROfyJ6L1Mkyonqv248aKIa39kTUutSIEeZCLTrn9tpbq73opNEDYRmV3oSD3PlKNRIiNowiTkHEoA5b24gNs5R5hoJ5yHxROYS4pagJ54GgQ2dy6mSh1FjdQfc4ZBl1uISNtnqHmNCEOkukxJoQPR0NkZCu5FIVzxeLYm0hRmZAWmi6GzyHAZAfHId69QZDZD';

/**
 * Encrypt token using the same method as frontend
 */
function encryptToken(value: string): string {
  const ENCRYPTION_PREFIX = '__encrypted__';
  const BASE_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'flexxus_flow_omni_2024';

  // Generate encryption key (same as frontend)
  const encryptionKey = CryptoJS.SHA256(BASE_KEY).toString();

  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(value, encryptionKey).toString();

  // Add prefix
  return ENCRYPTION_PREFIX + encrypted;
}

const updateWhatsAppToken = async () => {
  console.log('🔐 Starting WhatsApp Token Update (v2)...');

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
    // Encrypt the new token
    console.log('\n🔒 Encrypting new token...');
    const encryptedToken = encryptToken(NEW_TOKEN);
    console.log(`  ✓ Token encrypted: ${encryptedToken.substring(0, 30)}...`);

    // Find WhatsApp channels
    console.log('\n📋 Searching for WhatsApp channels...');

    const channelsResult = await client.query(`
      SELECT id, name, channel_type, configuration
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
    });

    // Update each channel
    for (const channel of channelsResult.rows) {
      console.log(`\n🔧 Updating token for channel: ${channel.name}`);

      // Update api_token in configuration JSONB field
      await client.query(`
        UPDATE channels
        SET
          configuration = jsonb_set(
            COALESCE(configuration, '{}'::jsonb),
            '{api_token}',
            $1::jsonb
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(encryptedToken), channel.id]);

      console.log('  ✓ Updated configuration.api_token');

      // Also update accessToken field if it exists
      const currentConfig = channel.configuration;
      if (currentConfig && currentConfig.accessToken !== undefined) {
        await client.query(`
          UPDATE channels
          SET
            configuration = jsonb_set(
              configuration,
              '{accessToken}',
              $1::jsonb
            )
          WHERE id = $2
        `, [JSON.stringify(encryptedToken), channel.id]);

        console.log('  ✓ Updated configuration.accessToken');
      }
    }

    console.log('\n✅ Token update completed successfully!');

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyResult = await client.query(`
      SELECT
        id,
        name,
        channel_type,
        configuration->>'api_token' as api_token,
        configuration->>'accessToken' as access_token,
        configuration->>'phoneNumber' as phone_number
      FROM channels
      WHERE channel_type = 'whatsapp'
      OR LOWER(name) LIKE '%whatsapp%'
    `);

    console.log('\n📊 Current WhatsApp channel configuration:');
    verifyResult.rows.forEach(row => {
      console.log(`\n  Channel: ${row.name} (${row.channel_type})`);
      console.log(`  - ID: ${row.id}`);
      console.log(`  - Phone Number: ${row.phone_number || 'not set'}`);
      console.log(`  - api_token: ${row.api_token ? row.api_token.substring(0, 30) + '...' : 'not set'}`);
      console.log(`  - accessToken: ${row.access_token ? row.access_token.substring(0, 30) + '...' : 'not set'}`);

      // Check if token is encrypted
      if (row.api_token) {
        const isEncrypted = row.api_token.startsWith('__encrypted__');
        console.log(`  - Token is ${isEncrypted ? '✅ encrypted' : '⚠️  NOT encrypted'}`);
      }
    });

    console.log('\n🎉 WhatsApp token update process completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the backend server: npm run dev');
    console.log('   2. Test sending a WhatsApp message');
    console.log('   3. Check logs for any 401 errors');

  } catch (error: any) {
    console.error('\n💥 Error updating token:', error.message);
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
