-- Optional content rollback for the new podcast only. Do not run during release.
-- Code rollback alone usually suffices; this keeps the record available for admin review.
UPDATE media_features
SET status = 'draft', is_featured = 0, updated_at = CURRENT_TIMESTAMP
WHERE external_url = 'https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx'
  AND contribution_type = 'podcast_guest';
