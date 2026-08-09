CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  suburb TEXT,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_locations_identity
ON locations (name, address);

CREATE TRIGGER locations_set_updated_at
AFTER UPDATE ON locations
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE locations
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

ALTER TABLE events ADD COLUMN location_id INTEGER REFERENCES locations(id);

INSERT OR IGNORE INTO locations (name, suburb, address)
SELECT venue_name, MAX(suburb), address
FROM events
WHERE address IS NOT NULL AND trim(address) != ''
GROUP BY venue_name, address;

UPDATE events
SET location_id = (
  SELECT locations.id
  FROM locations
  WHERE locations.name = events.venue_name
    AND locations.address = events.address
  LIMIT 1
)
WHERE location_id IS NULL
  AND address IS NOT NULL
  AND trim(address) != '';

CREATE INDEX idx_events_location ON events (location_id);
