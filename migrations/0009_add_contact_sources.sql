ALTER TABLE contacts ADD COLUMN first_source_platform TEXT NOT NULL DEFAULT 'unknown'
  CHECK (first_source_platform IN (
    'google_ads', 'google_organic', 'facebook_ads', 'facebook_organic',
    'instagram_ads', 'instagram_organic', 'outreach', 'referral', 'event',
    'direct', 'email', 'other', 'unknown'
  ));

ALTER TABLE contacts ADD COLUMN first_referrer_url TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN admin_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE enquiries ADD COLUMN source_platform TEXT NOT NULL DEFAULT 'unknown'
  CHECK (source_platform IN (
    'google_ads', 'google_organic', 'facebook_ads', 'facebook_organic',
    'instagram_ads', 'instagram_organic', 'outreach', 'referral', 'event',
    'direct', 'email', 'other', 'unknown'
  ));

ALTER TABLE enquiries ADD COLUMN referrer_url TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN notification_required INTEGER NOT NULL DEFAULT 1
  CHECK (notification_required IN (0, 1));

CREATE INDEX idx_contacts_source_platform_activity
ON contacts (first_source_platform, last_activity_at DESC);

DROP VIEW current_marketing_contacts;

CREATE VIEW current_marketing_contacts AS
SELECT c.id,
       c.email,
       c.email_normalized,
       c.first_name,
       c.last_name,
       c.contact_type,
       c.first_source_platform AS source_platform,
       latest.recorded_at AS marketing_consent_at,
       latest.source AS marketing_consent_source,
       latest.consent_version AS marketing_consent_version
FROM contacts c
JOIN contact_consents latest
  ON latest.id = (
    SELECT cc.id
    FROM contact_consents cc
    WHERE cc.contact_id = c.id
      AND cc.consent_type = 'marketing_email'
    ORDER BY cc.recorded_at DESC, cc.id DESC
    LIMIT 1
  )
WHERE c.status = 'active'
  AND latest.status = 'granted';
