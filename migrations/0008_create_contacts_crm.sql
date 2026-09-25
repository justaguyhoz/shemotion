PRAGMA foreign_keys = ON;

CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  contact_type TEXT NOT NULL DEFAULT 'other'
    CHECK (contact_type IN ('consumer', 'organisation', 'media', 'hr_people_culture', 'event_organiser', 'other')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  first_source TEXT NOT NULL,
  first_source_url TEXT NOT NULL DEFAULT '',
  first_utm_source TEXT NOT NULL DEFAULT '',
  first_utm_medium TEXT NOT NULL DEFAULT '',
  first_utm_campaign TEXT NOT NULL DEFAULT '',
  first_utm_content TEXT NOT NULL DEFAULT '',
  first_utm_term TEXT NOT NULL DEFAULT '',
  first_contact_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_contacts_email_normalized
ON contacts (email_normalized);

CREATE INDEX idx_contacts_status_activity
ON contacts (status, last_activity_at DESC);

CREATE TABLE enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  contact_id INTEGER NOT NULL,
  enquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  utm_term TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'replied', 'closed')),
  admin_notes TEXT NOT NULL DEFAULT '',
  notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sending', 'sent', 'failed')),
  notification_attempted_at TEXT,
  notification_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_enquiries_submission_id
ON enquiries (submission_id);

CREATE INDEX idx_enquiries_contact_submitted
ON enquiries (contact_id, submitted_at DESC);

CREATE INDEX idx_enquiries_status_submitted
ON enquiries (status, submitted_at DESC);

CREATE TABLE contact_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT,
  contact_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN ('marketing_email')),
  status TEXT NOT NULL
    CHECK (status IN ('granted', 'withdrawn')),
  source TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_contact_consents_submission
ON contact_consents (submission_id)
WHERE submission_id IS NOT NULL;

CREATE INDEX idx_contact_consents_contact_recorded
ON contact_consents (contact_id, consent_type, recorded_at DESC, id DESC);

CREATE VIEW current_marketing_contacts AS
SELECT c.id,
       c.email,
       c.email_normalized,
       c.first_name,
       c.last_name,
       c.contact_type,
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
