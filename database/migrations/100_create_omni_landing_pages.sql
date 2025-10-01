-- Migration: Create Landing Pages tables for Omni module
-- Sprint N+3: Landing Pages & Email Engagement
-- Description: Tables for landing page tracking and form submissions

-- =====================================================
-- 1. Landing Pages table
-- =====================================================

CREATE TABLE IF NOT EXISTS omni_landing_pages (
  landing_page_id VARCHAR(50) PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Page info
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  page_type VARCHAR(50) DEFAULT 'lead_capture', -- lead_capture, product, demo, contact

  -- Configuration
  form_fields JSONB DEFAULT '[]'::jsonb, -- Array of field definitions
  settings JSONB DEFAULT '{}'::jsonb, -- Page-specific settings

  -- Tracking
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  -- UTM defaults
  default_utm JSONB, -- Default UTM parameters for this page

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(user_id),

  -- Indexes
  CONSTRAINT omni_landing_pages_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX idx_omni_landing_pages_company ON omni_landing_pages(company_id);
CREATE INDEX idx_omni_landing_pages_status ON omni_landing_pages(status);
CREATE INDEX idx_omni_landing_pages_created_at ON omni_landing_pages(created_at DESC);

-- =====================================================
-- 2. Landing Page Submissions table
-- =====================================================

CREATE TABLE IF NOT EXISTS omni_landing_page_submissions (
  submission_id VARCHAR(50) PRIMARY KEY,
  landing_page_id VARCHAR(50) NOT NULL REFERENCES omni_landing_pages(landing_page_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Form data
  form_data JSONB NOT NULL, -- All form fields submitted

  -- Contact info (extracted from form_data for quick access)
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  company_name VARCHAR(255),

  -- UTM tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),

  -- Additional tracking
  referrer_url VARCHAR(500),
  landing_url VARCHAR(500),
  user_agent TEXT,
  ip_address INET,

  -- Processing status
  status VARCHAR(20) DEFAULT 'new', -- new, processed, crm_synced, failed
  crm_lead_id INTEGER, -- Link to CRM lead if created

  -- Metadata
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,

  -- Indexes
  CONSTRAINT omni_lp_submissions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX idx_omni_lp_submissions_landing_page ON omni_landing_page_submissions(landing_page_id);
CREATE INDEX idx_omni_lp_submissions_company ON omni_landing_page_submissions(company_id);
CREATE INDEX idx_omni_lp_submissions_email ON omni_landing_page_submissions(email);
CREATE INDEX idx_omni_lp_submissions_status ON omni_landing_page_submissions(status);
CREATE INDEX idx_omni_lp_submissions_submitted_at ON omni_landing_page_submissions(submitted_at DESC);
CREATE INDEX idx_omni_lp_submissions_crm_lead ON omni_landing_page_submissions(crm_lead_id) WHERE crm_lead_id IS NOT NULL;

-- UTM tracking index for analytics
CREATE INDEX idx_omni_lp_submissions_utm ON omni_landing_page_submissions(utm_source, utm_medium, utm_campaign);

-- =====================================================
-- 3. Views and Analytics
-- =====================================================

-- View for submission analytics by landing page
CREATE OR REPLACE VIEW omni_landing_page_stats AS
SELECT
  lp.landing_page_id,
  lp.company_id,
  lp.name,
  lp.url,
  lp.status,
  COUNT(sub.submission_id) as total_submissions,
  COUNT(sub.submission_id) FILTER (WHERE sub.status = 'crm_synced') as synced_to_crm,
  COUNT(DISTINCT sub.email) as unique_emails,
  COUNT(sub.submission_id) FILTER (WHERE sub.submitted_at >= CURRENT_DATE - INTERVAL '7 days') as submissions_last_7d,
  COUNT(sub.submission_id) FILTER (WHERE sub.submitted_at >= CURRENT_DATE - INTERVAL '30 days') as submissions_last_30d,
  MAX(sub.submitted_at) as last_submission_at
FROM omni_landing_pages lp
LEFT JOIN omni_landing_page_submissions sub ON lp.landing_page_id = sub.landing_page_id
GROUP BY lp.landing_page_id, lp.company_id, lp.name, lp.url, lp.status;

-- =====================================================
-- 4. Functions
-- =====================================================

-- Function to increment submission count
CREATE OR REPLACE FUNCTION increment_landing_page_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE omni_landing_pages
  SET submissions_count = submissions_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE landing_page_id = NEW.landing_page_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on new submission
CREATE TRIGGER trigger_increment_lp_submission
AFTER INSERT ON omni_landing_page_submissions
FOR EACH ROW
EXECUTE FUNCTION increment_landing_page_submission();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_landing_page_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_landing_page_timestamp
BEFORE UPDATE ON omni_landing_pages
FOR EACH ROW
EXECUTE FUNCTION update_landing_page_timestamp();

COMMENT ON TABLE omni_landing_pages IS 'Landing pages for lead capture - Sprint N+3';
COMMENT ON TABLE omni_landing_page_submissions IS 'Form submissions from landing pages - Sprint N+3';
