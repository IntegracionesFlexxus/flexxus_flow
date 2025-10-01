/**
 * Script to run Sprint 05 migration
 * Executes the SQL migration for the omni_db database
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { environment } from '../config/environment';

const runMigration = async () => {
  console.log('🚀 Starting Sprint 05 Migration for omni_db...');

  // Create connection to omni_db
  const pool = new Pool({
    host: environment.database.omni.host || 'localhost',
    port: environment.database.omni.port || 5432,
    database: environment.database.omni.database || 'omni_db',
    user: environment.database.omni.user || 'postgres',
    password: environment.database.omni.password || 'postgres',
    max: 1
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../../database/migrations/sprint05_omni_foundation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by major sections to execute them separately
    const sqlStatements = migrationSQL
      .split(/;[\s]*\n/)
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--') && !stmt.trim().startsWith('\\c'))
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${sqlStatements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Execute each statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];

      // Skip comment-only statements
      if (statement.trim().startsWith('--') || statement.trim().length < 10) {
        continue;
      }

      try {
        // Get first 50 chars of statement for logging
        const stmtPreview = statement.substring(0, 50).replace(/\n/g, ' ');
        process.stdout.write(`\r⏳ Executing statement ${i + 1}/${sqlStatements.length}: ${stmtPreview}...`);

        await pool.query(statement);
        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || error;

        // Skip certain expected errors
        if (errorMsg.includes('already exists') ||
            errorMsg.includes('duplicate key') ||
            errorMsg.includes('EXTENSION') ||
            errorMsg.includes('ON CONFLICT DO NOTHING')) {
          successCount++;
          errorCount--;
          continue;
        }

        errors.push({
          statement: statement.substring(0, 100),
          error: errorMsg
        });
        console.error(`\n❌ Error in statement ${i + 1}: ${errorMsg}`);
      }
    }

    console.log('\n');
    console.log('=' .repeat(60));
    console.log('📊 Migration Summary:');
    console.log('=' .repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    // Verify tables were created
    console.log('\n🔍 Verifying created tables...');
    const tableCheckQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const result = await pool.query(tableCheckQuery);
    console.log('\n📋 Tables in omni_db:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}`);
    });

    // Check for critical tables
    const criticalTables = [
      'channels', 'conversations', 'messages', 'customers',
      'whatsapp_channels', 'instagram_channels', 'email_channels', 'sms_channels',
      'message_templates', 'quick_replies', 'landing_pages', 'forms'
    ];

    const existingTables = result.rows.map(r => r.tablename);
    const missingTables = criticalTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing critical tables:', missingTables);
    } else {
      console.log('\n✅ All critical tables created successfully!');
    }

    // Show any errors that occurred
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered (may be ignorable):');
      errors.forEach((e, idx) => {
        console.log(`  ${idx + 1}. ${e.error}`);
      });
    }

    console.log('\n🎉 Migration completed!');

  } catch (error) {
    console.error('\n💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run the migration
runMigration().catch(error => {
  console.error('Failed to run migration:', error);
  process.exit(1);
});