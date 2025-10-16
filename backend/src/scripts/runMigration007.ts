/**
 * Migration script for performance_metrics table
 * Sprint 10 - Performance Optimization
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { environment } from '../config/environment';

const runMigration007 = async () => {
  console.log('🚀 Starting Migration 007 - Performance Metrics...');

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
    // Begin transaction
    await client.query('BEGIN');
    console.log('📝 Starting transaction...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../shared/database/migrations/007_performance_metrics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📊 Creating performance_metrics table and related objects...');

    // Execute migration
    await client.query(migrationSQL);

    console.log('  ✓ performance_metrics table created');
    console.log('  ✓ Indexes created');
    console.log('  ✓ Views created');
    console.log('  ✓ Functions created');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');

    // Verify table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'performance_metrics'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('\n✅ Verification: performance_metrics table exists');

      // Check table structure
      const structureCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'performance_metrics'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table structure:');
      structureCheck.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.error('❌ Verification failed: table does not exist');
    }

    console.log('\n🎉 Migration 007 completed successfully!');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('💥 Migration failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
runMigration007().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
