INSERT INTO events (
  title,
  event_type,
  venue_name,
  suburb,
  start_at,
  timezone,
  audience,
  short_description,
  booking_label,
  booking_url,
  availability_status,
  is_published,
  display_order
)
SELECT
  'Special Introductory Class',
  'Class',
  'Reinvigr8 Gym',
  'Helensvale',
  '2026-08-18T23:15:00.000Z',
  'Australia/Brisbane',
  'Women only',
  'A supportive women-only movement experience designed to help you release tension, reconnect with your body and feel calmer, lighter and more grounded.',
  'Book with Reinvigr8',
  NULL,
  'Limited spaces',
  1,
  0
WHERE NOT EXISTS (
  SELECT 1
  FROM events
  WHERE title = 'Special Introductory Class'
    AND venue_name = 'Reinvigr8 Gym'
    AND start_at = '2026-08-18T23:15:00.000Z'
);
