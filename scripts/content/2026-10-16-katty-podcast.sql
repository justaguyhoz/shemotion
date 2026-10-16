-- Prepared content publication. Apply to production only after review approval.
-- Existing media administration continues to control the resulting record.
INSERT INTO media_features (
  title, publisher, media_type, external_url, short_description,
  thumbnail_url, image_alt, publication_date, contribution_type,
  status, is_featured, display_order
)
SELECT
  'Your Body Is Not a Performance: Feminine Embodiment, Movement & Self-Trust',
  'Spotify',
  'podcast',
  'https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx',
  'Katty discusses feminine embodiment, movement and self-trust.',
  '/assets/katty-podcast-cover.webp',
  'Podcast episode artwork from Spotify',
  NULL,
  'podcast_guest',
  'published',
  1,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM media_features
  WHERE external_url = 'https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx'
     OR instr(external_url, 'https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx?') = 1
);
