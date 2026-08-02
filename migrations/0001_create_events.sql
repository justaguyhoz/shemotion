CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'Class',
  venue_name TEXT NOT NULL,
  suburb TEXT,
  address TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  audience TEXT NOT NULL DEFAULT 'Women only',
  short_description TEXT NOT NULL,
  booking_label TEXT NOT NULL DEFAULT 'Book now',
  booking_url TEXT,
  availability_status TEXT NOT NULL DEFAULT 'Available',
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_public
ON events (is_published, start_at, display_order);

CREATE TRIGGER events_set_updated_at
AFTER UPDATE ON events
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE events
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
