/**
 * Direct migration script for Sprint 05
 * Executes the migration as a single transaction
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { environment } from '../config/environment';

const runDirectMigration = async () => {
  console.log('🚀 Starting Sprint 05 Direct Migration for omni_db...');

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

    // First, drop existing constraints that may prevent table creation
    console.log('🗑️  Cleaning up existing objects if any...');

    const dropConstraints = `
      -- Drop policies if they exist
      DROP POLICY IF EXISTS channels_company_isolation ON channels;
      DROP POLICY IF EXISTS conversations_company_isolation ON conversations;
      DROP POLICY IF EXISTS messages_company_isolation ON messages;
      DROP POLICY IF EXISTS customers_company_isolation ON customers;
      DROP POLICY IF EXISTS landing_pages_company_isolation ON landing_pages;
      DROP POLICY IF EXISTS templates_company_isolation ON message_templates;
      DROP POLICY IF EXISTS quick_replies_company_isolation ON quick_replies;
      DROP POLICY IF EXISTS forms_company_isolation ON forms;
      DROP POLICY IF EXISTS form_submissions_company_isolation ON form_submissions;
    `;

    try {
      await client.query(dropConstraints);
    } catch (e) {
      // Ignore errors on dropping non-existent policies
    }

    // Create extensions
    console.log('🔧 Creating extensions...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);

    // Create update function
    console.log('⚙️  Creating update function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create missing tables one by one
    console.log('📊 Creating tables...');

    // 1. Create customers table if not exists
    const createCustomers = `
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL,
        external_id VARCHAR(255),
        phone_number VARCHAR(50),
        email VARCHAR(255),
        instagram_handle VARCHAR(255),
        whatsapp_id VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        display_name VARCHAR(255),
        avatar_url TEXT,
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP,
        CONSTRAINT unique_customer_phone UNIQUE(company_id, phone_number),
        CONSTRAINT unique_customer_email UNIQUE(company_id, email)
      )
    `;
    await client.query(createCustomers);
    console.log('  ✓ customers table created');

    // 2. Update channels table to add missing columns
    const updateChannelsTable = `
      -- Add missing columns to channels if they don't exist
      ALTER TABLE channels
        ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP,
        ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS created_by UUID;
    `;
    await client.query(updateChannelsTable);
    console.log('  ✓ channels table updated');

    // 3. Create WhatsApp channels
    const createWhatsApp = `
      CREATE TABLE IF NOT EXISTS whatsapp_channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        phone_number VARCHAR(50) NOT NULL,
        phone_number_id VARCHAR(255),
        business_account_id VARCHAR(255),
        access_token TEXT,
        webhook_verify_token VARCHAR(255),
        api_version VARCHAR(20) DEFAULT 'v17.0',
        rate_limit_tier VARCHAR(50),
        daily_limit INTEGER DEFAULT 1000,
        messages_sent_today INTEGER DEFAULT 0,
        last_limit_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        capabilities JSONB DEFAULT '["text", "media", "location", "contacts"]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_whatsapp_phone UNIQUE(phone_number)
      )
    `;
    await client.query(createWhatsApp);
    console.log('  ✓ whatsapp_channels table created');

    // 4. Create Instagram channels
    const createInstagram = `
      CREATE TABLE IF NOT EXISTS instagram_channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        instagram_account_id VARCHAR(255) NOT NULL,
        instagram_username VARCHAR(255),
        page_id VARCHAR(255),
        page_access_token TEXT,
        webhook_verify_token VARCHAR(255),
        api_version VARCHAR(20) DEFAULT 'v17.0',
        rate_limit_tier VARCHAR(50),
        daily_limit INTEGER DEFAULT 500,
        messages_sent_today INTEGER DEFAULT 0,
        last_limit_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_instagram_account UNIQUE(instagram_account_id)
      )
    `;
    await client.query(createInstagram);
    console.log('  ✓ instagram_channels table created');

    // 5. Create Email channels
    const createEmail = `
      CREATE TABLE IF NOT EXISTS email_channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255),
        reply_to_email VARCHAR(255),
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_user VARCHAR(255),
        smtp_password TEXT,
        api_key TEXT,
        daily_limit INTEGER DEFAULT 10000,
        messages_sent_today INTEGER DEFAULT 0,
        last_limit_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bounce_webhook_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_email_channel UNIQUE(channel_id, from_email)
      )
    `;
    await client.query(createEmail);
    console.log('  ✓ email_channels table created');

    // 6. Create SMS channels
    const createSMS = `
      CREATE TABLE IF NOT EXISTS sms_channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        account_sid VARCHAR(255),
        auth_token TEXT,
        api_key TEXT,
        messaging_service_sid VARCHAR(255),
        country_code VARCHAR(10),
        capabilities JSONB DEFAULT '["sms"]',
        daily_limit INTEGER DEFAULT 1000,
        messages_sent_today INTEGER DEFAULT 0,
        last_limit_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_sms_phone UNIQUE(phone_number)
      )
    `;
    await client.query(createSMS);
    console.log('  ✓ sms_channels table created');

    // 7. Update conversations table
    const updateConversations = `
      ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS sla_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS sla_breach_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS resolution_time_seconds INTEGER,
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `;
    await client.query(updateConversations);
    console.log('  ✓ conversations table updated');

    // 8. Update messages table
    const updateMessages = `
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS sender_id UUID,
        ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text',
        ADD COLUMN IF NOT EXISTS media_url TEXT,
        ADD COLUMN IF NOT EXISTS media_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
    `;
    await client.query(updateMessages);
    console.log('  ✓ messages table updated');

    // 9. Update message_templates
    const updateTemplates = `
      ALTER TABLE message_templates
        ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
    `;
    await client.query(updateTemplates);
    console.log('  ✓ message_templates table updated');

    // 10. Create quick_replies table
    const createQuickReplies = `
      CREATE TABLE IF NOT EXISTS quick_replies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50),
        shortcuts TEXT[] DEFAULT '{}',
        usage_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID
      )
    `;
    await client.query(createQuickReplies);
    console.log('  ✓ quick_replies table created');

    // 11. Update landing_pages
    const updateLandingPages = `
      ALTER TABLE landing_pages
        ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
        ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS conversions_count INTEGER DEFAULT 0;
    `;
    await client.query(updateLandingPages);
    console.log('  ✓ landing_pages table updated');

    // 12. Create forms table
    const createForms = `
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL,
        landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        fields JSONB NOT NULL DEFAULT '[]',
        submit_action VARCHAR(50) DEFAULT 'lead',
        submit_config JSONB DEFAULT '{}',
        success_message TEXT,
        redirect_url TEXT,
        notifications_enabled BOOLEAN DEFAULT true,
        notify_emails TEXT[],
        submissions_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createForms);
    console.log('  ✓ forms table created');

    // 13. Update form_submissions
    const updateFormSubmissions = `
      ALTER TABLE form_submissions
        ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN IF NOT EXISTS lead_id UUID;
    `;
    await client.query(updateFormSubmissions);
    console.log('  ✓ form_submissions table updated');

    // 14. Create conversation_analytics if not exists
    const createConvAnalytics = `
      CREATE TABLE IF NOT EXISTS conversation_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL,
        period_date DATE NOT NULL,
        channel_type VARCHAR(50),
        total_conversations INTEGER DEFAULT 0,
        new_conversations INTEGER DEFAULT 0,
        resolved_conversations INTEGER DEFAULT 0,
        avg_messages_per_conversation DECIMAL(10,2),
        avg_response_time_seconds INTEGER,
        avg_resolution_time_seconds INTEGER,
        sla_met_count INTEGER DEFAULT 0,
        sla_breached_count INTEGER DEFAULT 0,
        customer_satisfaction_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createConvAnalytics);
    console.log('  ✓ conversation_analytics table created');

    // Create indexes
    console.log('🔍 Creating indexes...');

    // Customer indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');

    // Channel indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_whatsapp_channel ON whatsapp_channels(channel_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_instagram_channel ON instagram_channels(channel_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_channel ON email_channels(channel_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_channel ON sms_channels(channel_id)');

    // Quick replies indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_quick_replies_company ON quick_replies(company_id)');

    // Forms indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_forms_company ON forms(company_id)');

    console.log('  ✓ All indexes created');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');

    // Verify final state
    const tableCheck = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 Final tables in omni_db:');
    tableCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}`);
    });

    console.log('\n🎉 Sprint 05 Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Migration failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
runDirectMigration().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});