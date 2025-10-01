-- Migration: Create Email Engagement tables for Omni module
-- Sprint N+3: Landing Pages & Email Engagement
-- Description: Tables for email campaign tracking and engagement

-- =====================================================
-- 1. Email Campaigns table
-- =====================================================

CREATE TABLE IF NOT EXISTS omni_email_campaigns (
  campaign_id VARCHAR(50) PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Campaign info
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  campaign_type VARCHAR(50) DEFAULT 'marketing', -- marketing, transactional, nurture, newsletter

  -- Content
  html_content TEXT,
  text_content TEXT,

  -- Sender info
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),

  -- Tracking
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, completed
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,

  -- Schedule
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(user_id),

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb, -- Campaign-specific settings

  CONSTRAINT omni_email_campaigns_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX idx_omni_email_campaigns_company ON omni_email_campaigns(company_id);
CREATE INDEX idx_omni_email_campaigns_status ON omni_email_campaigns(status);
CREATE INDEX idx_omni_email_campaigns_sent_at ON omni_email_campaigns(sent_at DESC);

-- =====================================================
-- 2. Email Engagement Events table
-- =====================================================

CREATE TABLE IF NOT EXISTS omni_email_engagement_events (
  event_id BIGSERIAL PRIMARY KEY,
  campaign_id VARCHAR(50) REFERENCES omni_email_campaigns(campaign_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Contact info
  contact_email VARCHAR(255) NOT NULL,
  contact_id VARCHAR(50), -- Optional link to customer

  -- Event details
  event_type VARCHAR(20) NOT NULL, -- sent, delivered, opened, clicked, bounced, unsubscribed, spam_report
  event_action VARCHAR(50), -- For clicked: which link

  -- Link tracking (for clicks)
  link_url TEXT,
  link_id VARCHAR(50),

  -- Device/browser info
  user_agent TEXT,
  ip_address INET,
  device_type VARCHAR(20), -- desktop, mobile, tablet
  browser VARCHAR(50),
  os VARCHAR(50),

  -- Location
  country VARCHAR(2),
  city VARCHAR(100),

  -- Bounce info (if bounced)
  bounce_type VARCHAR(20), -- hard, soft
  bounce_reason TEXT,

  -- Timestamps
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- CRM integration
  crm_lead_id INTEGER, -- Link to CRM if this triggers lead scoring

  CONSTRAINT omni_email_engagement_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX idx_omni_email_engagement_campaign ON omni_email_engagement_events(campaign_id);
CREATE INDEX idx_omni_email_engagement_company ON omni_email_engagement_events(company_id);
CREATE INDEX idx_omni_email_engagement_contact ON omni_email_engagement_events(contact_email);
CREATE INDEX idx_omni_email_engagement_type ON omni_email_engagement_events(event_type);
CREATE INDEX idx_omni_email_engagement_occurred ON omni_email_engagement_events(occurred_at DESC);
CREATE INDEX idx_omni_email_engagement_crm_lead ON omni_email_engagement_events(crm_lead_id) WHERE crm_lead_id IS NOT NULL;

-- Composite index for contact engagement history
CREATE INDEX idx_omni_email_engagement_contact_history ON omni_email_engagement_events(contact_email, occurred_at DESC);

-- =====================================================
-- 3. Email Contact Scores table (aggregated engagement)
-- =====================================================

CREATE TABLE IF NOT EXISTS omni_email_contact_scores (
  contact_email VARCHAR(255) PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Engagement counters
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,

  -- Calculated scores
  engagement_score INTEGER DEFAULT 0, -- 0-100
  open_rate NUMERIC(5,2), -- Percentage
  click_rate NUMERIC(5,2), -- Percentage

  -- Timestamps
  first_sent_at TIMESTAMP,
  last_opened_at TIMESTAMP,
  last_clicked_at TIMESTAMP,
  last_engagement_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMP,

  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT omni_email_contact_scores_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE INDEX idx_omni_email_contact_scores_company ON omni_email_contact_scores(company_id);
CREATE INDEX idx_omni_email_contact_scores_score ON omni_email_contact_scores(engagement_score DESC);
CREATE INDEX idx_omni_email_contact_scores_active ON omni_email_contact_scores(company_id, is_active) WHERE is_active = true;

-- =====================================================
-- 4. Views and Analytics
-- =====================================================

-- Campaign performance view
CREATE OR REPLACE VIEW omni_email_campaign_performance AS
SELECT
  c.campaign_id,
  c.company_id,
  c.name,
  c.campaign_type,
  c.status,
  c.sent_count,
  c.delivered_count,
  c.opened_count,
  c.clicked_count,
  c.bounced_count,
  c.unsubscribed_count,
  CASE WHEN c.sent_count > 0 THEN ROUND((c.opened_count::numeric / c.sent_count) * 100, 2) ELSE 0 END as open_rate,
  CASE WHEN c.sent_count > 0 THEN ROUND((c.clicked_count::numeric / c.sent_count) * 100, 2) ELSE 0 END as click_rate,
  CASE WHEN c.sent_count > 0 THEN ROUND((c.bounced_count::numeric / c.sent_count) * 100, 2) ELSE 0 END as bounce_rate,
  c.sent_at,
  c.created_at
FROM omni_email_campaigns c;

-- =====================================================
-- 5. Functions
-- =====================================================

-- Function to update campaign counters
CREATE OR REPLACE FUNCTION update_email_campaign_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'delivered' THEN
    UPDATE omni_email_campaigns SET delivered_count = delivered_count + 1 WHERE campaign_id = NEW.campaign_id;
  ELSIF NEW.event_type = 'opened' THEN
    UPDATE omni_email_campaigns SET opened_count = opened_count + 1 WHERE campaign_id = NEW.campaign_id;
  ELSIF NEW.event_type = 'clicked' THEN
    UPDATE omni_email_campaigns SET clicked_count = clicked_count + 1 WHERE campaign_id = NEW.campaign_id;
  ELSIF NEW.event_type = 'bounced' THEN
    UPDATE omni_email_campaigns SET bounced_count = bounced_count + 1 WHERE campaign_id = NEW.campaign_id;
  ELSIF NEW.event_type = 'unsubscribed' THEN
    UPDATE omni_email_campaigns SET unsubscribed_count = unsubscribed_count + 1 WHERE campaign_id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaign counters
CREATE TRIGGER trigger_update_email_campaign_counters
AFTER INSERT ON omni_email_engagement_events
FOR EACH ROW
EXECUTE FUNCTION update_email_campaign_counters();

-- Function to update contact engagement scores
CREATE OR REPLACE FUNCTION update_email_contact_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO omni_email_contact_scores (contact_email, company_id, updated_at)
  VALUES (NEW.contact_email, NEW.company_id, CURRENT_TIMESTAMP)
  ON CONFLICT (contact_email) DO UPDATE
  SET
    emails_sent = CASE WHEN NEW.event_type = 'sent' THEN omni_email_contact_scores.emails_sent + 1 ELSE omni_email_contact_scores.emails_sent END,
    emails_opened = CASE WHEN NEW.event_type = 'opened' THEN omni_email_contact_scores.emails_opened + 1 ELSE omni_email_contact_scores.emails_opened END,
    emails_clicked = CASE WHEN NEW.event_type = 'clicked' THEN omni_email_contact_scores.emails_clicked + 1 ELSE omni_email_contact_scores.emails_clicked END,
    emails_bounced = CASE WHEN NEW.event_type = 'bounced' THEN omni_email_contact_scores.emails_bounced + 1 ELSE omni_email_contact_scores.emails_bounced END,
    last_opened_at = CASE WHEN NEW.event_type = 'opened' THEN NEW.occurred_at ELSE omni_email_contact_scores.last_opened_at END,
    last_clicked_at = CASE WHEN NEW.event_type = 'clicked' THEN NEW.occurred_at ELSE omni_email_contact_scores.last_clicked_at END,
    last_engagement_at = CASE WHEN NEW.event_type IN ('opened', 'clicked') THEN NEW.occurred_at ELSE omni_email_contact_scores.last_engagement_at END,
    is_unsubscribed = CASE WHEN NEW.event_type = 'unsubscribed' THEN true ELSE omni_email_contact_scores.is_unsubscribed END,
    unsubscribed_at = CASE WHEN NEW.event_type = 'unsubscribed' THEN NEW.occurred_at ELSE omni_email_contact_scores.unsubscribed_at END,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact scores
CREATE TRIGGER trigger_update_email_contact_score
AFTER INSERT ON omni_email_engagement_events
FOR EACH ROW
EXECUTE FUNCTION update_email_contact_score();

COMMENT ON TABLE omni_email_campaigns IS 'Email marketing campaigns - Sprint N+3';
COMMENT ON TABLE omni_email_engagement_events IS 'Email engagement tracking events - Sprint N+3';
COMMENT ON TABLE omni_email_contact_scores IS 'Aggregated email engagement scores per contact - Sprint N+3';
