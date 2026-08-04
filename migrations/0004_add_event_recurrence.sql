ALTER TABLE events ADD COLUMN recurrence_frequency TEXT NOT NULL DEFAULT 'none'
  CHECK (recurrence_frequency IN ('none', 'weekly', 'fortnightly', 'monthly'));

ALTER TABLE events ADD COLUMN recurrence_until TEXT;
