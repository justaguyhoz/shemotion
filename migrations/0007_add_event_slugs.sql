ALTER TABLE events ADD COLUMN slug TEXT;

WITH RECURSIVE slug_parts(event_id, source, position, output) AS (
  SELECT id,
         lower(replace(title || CASE WHEN suburb IS NOT NULL AND trim(suburb) != '' THEN ' ' || suburb ELSE '' END, '&', ' and ')),
         1,
         ''
  FROM events
  UNION ALL
  SELECT event_id,
         source,
         position + 1,
         output || CASE
           WHEN substr(source, position, 1) GLOB '[a-z0-9]' THEN substr(source, position, 1)
           WHEN output != '' AND substr(output, -1) != '-' THEN '-'
           ELSE ''
         END
  FROM slug_parts
  WHERE position <= length(source)
)
UPDATE events
SET slug = (
  SELECT rtrim(output, '-')
  FROM slug_parts
  WHERE event_id = events.id AND position = length(source) + 1
) || '-' || id
WHERE slug IS NULL;

CREATE UNIQUE INDEX idx_events_slug ON events (slug);
