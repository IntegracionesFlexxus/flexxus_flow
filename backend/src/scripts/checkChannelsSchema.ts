/**
 * Script to check channels table schema
 */

import { Pool } from 'pg';
import { environment } from '../config/environment';

const checkSchema = async () => {
  console.log('📊 Checking channels table schema...');

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
      WHERE table_name = 'channels'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Channels table structure:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Get sample data
    const sampleResult = await client.query(`
      SELECT * FROM channels LIMIT 3
    `);

    console.log(`\n📝 Sample channels (${sampleResult.rows.length} rows):`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n  ${index + 1}. Channel ID: ${row.id}`);
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value && typeof value === 'object') {
          console.log(`     ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
        } else {
          console.log(`     ${key}: ${value}`);
        }
      });
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
