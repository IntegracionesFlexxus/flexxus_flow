const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const runMigration = async () => {
  // Connection to analytics_db
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'analytics_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🚀 Starting Sprint 08 migration for analytics_db...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/sprint08_analytics_reporting.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove the \c command as we're already connected to analytics_db
    const cleanSQL = migrationSQL.replace(/\\c analytics_db;/g, '');

    // Execute the migration
    await pool.query(cleanSQL);

    console.log('✅ Sprint 08 migration completed successfully!');

    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'analytics_events',
        'aggregated_metrics',
        'reports',
        'report_executions',
        'dashboards',
        'widgets',
        'kpis',
        'kpi_history',
        'predictions',
        'optimization_recommendations',
        'data_pipelines',
        'pipeline_executions',
        'anomaly_detections',
        'benchmarks'
      )
      ORDER BY table_name;
    `);

    console.log('\n📋 Created tables:');
    tableCheck.rows.forEach(row => {
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
    console.log('\n🎉 Sprint 08 database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });