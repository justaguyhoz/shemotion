ALTER TABLE events ADD COLUMN image_url TEXT;

-- Existing URL-backed events retain their current bookable behaviour under the
-- clearer admin label. Records without a URL are deliberately left untouched
-- so they can be reviewed individually; application compatibility maps them to
-- Coming Soon until an explicit state is saved.
UPDATE events
SET availability_status = 'Booking open'
WHERE availability_status = 'Available'
  AND booking_url IS NOT NULL
  AND trim(booking_url) != '';
