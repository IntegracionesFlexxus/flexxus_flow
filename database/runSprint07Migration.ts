const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const runMigration = async () => {
  // Connection to omni_db
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'omni_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🚀 Starting Sprint 07 migration for omni_db...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'sprint07_omni_automation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove the \c command as we're already connected to omni_db
    const cleanSQL = migrationSQL.replace(/\\c omni_db;/g, '');

    // Execute the migration
    await pool.query(cleanSQL);

    console.log('✅ Sprint 07 migration completed successfully!');

    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'automation_rules',
        'auto_responses',
        'routing_rules',
        'conversation_flows',
        'flow_executions',
        'automation_logs',
        'agent_availability',
        'automation_metrics'
      )
      ORDER BY table_name;
    `);

    console.log('\n📋 Created tables:');
    tableCheck.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 Sprint 07 database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });