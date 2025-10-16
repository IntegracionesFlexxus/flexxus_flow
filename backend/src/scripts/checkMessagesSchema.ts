/**
 * Script to check messages table schema
 */

import { Pool } from 'pg';
import { environment } from '../config/environment';

const checkSchema = async () => {
  console.log('📊 Checking messages table schema...');

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
    // Get table structure
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Messages table structure:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check for external ID columns specifically
    console.log('\n🔍 External ID related columns:');
    const externalColumns = schemaResult.rows.filter(row =>
      row.column_name.includes('external')
    );

    if (externalColumns.length > 0) {
      externalColumns.forEach(row => {
        console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('  ⚠️  No external ID columns found');
    }

    // Get sample data
    const sampleResult = await client.query(`
      SELECT id, conversation_id, external_message_id, status, created_at
      FROM messages
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log(`\n📝 Recent messages (${sampleResult.rows.length} rows):`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n  ${index + 1}. Message ID: ${row.id}`);
      console.log(`     Conversation: ${row.conversation_id}`);
      console.log(`     External Message ID: ${row.external_message_id || 'null'}`);
      console.log(`     Status: ${row.status}`);
      console.log(`     Created: ${row.created_at}`);
    });

  } catch (error: any) {
    console.error('💥 Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

checkSchema().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
