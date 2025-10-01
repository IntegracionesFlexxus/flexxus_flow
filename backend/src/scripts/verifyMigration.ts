/**
 * Verify Sprint 05 migration
 */

import { Pool } from 'pg';
import { environment } from '../config/environment';

const verifyMigration = async () => {
  console.log('🔍 Verifying Sprint 05 Migration...\n');

  const pool = new Pool({
    host: environment.database.omni.host || 'localhost',
    port: environment.database.omni.port || 5432,
    database: environment.database.omni.database || 'omni_db',
    user: environment.database.omni.user || 'postgres',
    password: environment.database.omni.password || 'postgres',
    max: 1
  });

  try {
    // Check critical tables
    const criticalTables = [
      'channels',
      'whatsapp_channels',
      'instagram_channels',
      'email_channels',
      'sms_channels',
      'customers',
      'conversations',
      'messages',
      'message_templates',
      'quick_replies',
      'landing_pages',
      'forms',
      'form_submissions',
      'channel_metrics',
      'conversation_analytics'
    ];

    console.log('📋 Checking critical tables:');
    console.log('=' .repeat(50));

    for (const table of criticalTables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      `, [table]);

      const exists = result.rows[0].count > 0;
      const symbol = exists ? '✅' : '❌';
      console.log(`${symbol} ${table.padEnd(25)} ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    // Check columns in key tables
    console.log('\n📊 Checking key columns:');
    console.log('=' .repeat(50));

    const keyChecks = [
      { table: 'channels', columns: ['company_id', 'channel_type', 'health_status'] },
      { table: 'customers', columns: ['company_id', 'phone_number', 'email'] },
      { table: 'conversations', columns: ['company_id', 'customer_id', 'channel_type'] },
      { table: 'messages', columns: ['company_id', 'conversation_id', 'sender_type'] }
    ];

    for (const check of keyChecks) {
      console.log(`\n${check.table}:`);
      for (const column of check.columns) {
        const result = await pool.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        `, [check.table, column]);

        const exists = result.rows[0].count > 0;
        const symbol = exists ? '  ✓' : '  ✗';
        console.log(`${symbol} ${column}`);
      }
    }

    // Test sample insert
    console.log('\n🧪 Testing sample data insertion:');
    console.log('=' .repeat(50));

    try {
      // Insert test channel
      const channelResult = await pool.query(`
        INSERT INTO channels (company_id, channel_type, name, health_status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, ['11111111-1111-1111-1111-111111111111', 'whatsapp', 'Test WhatsApp', 'healthy']);

      if (channelResult.rows.length > 0) {
        console.log('✅ Test channel inserted successfully');
      } else {
        console.log('ℹ️  Test channel already exists');
      }

      // Insert test customer
      const customerResult = await pool.query(`
        INSERT INTO customers (company_id, first_name, last_name, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, ['11111111-1111-1111-1111-111111111111', 'Test', 'User', 'test@example.com']);

      if (customerResult.rows.length > 0) {
        console.log('✅ Test customer inserted successfully');
      } else {
        console.log('ℹ️  Test customer already exists');
      }

    } catch (error: any) {
      console.log('❌ Error inserting test data:', error.message);
    }

    // Count records
    console.log('\n📈 Record counts:');
    console.log('=' .repeat(50));

    const countTables = ['channels', 'customers', 'conversations', 'messages', 'quick_replies'];
    for (const table of countTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table.padEnd(20)} ${result.rows[0].count} records`);
      } catch (e) {
        console.log(`${table.padEnd(20)} Error counting`);
      }
    }

    console.log('\n✅ Migration verification complete!');

  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await pool.end();
  }
};

verifyMigration().catch(console.error);