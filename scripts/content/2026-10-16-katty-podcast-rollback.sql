-- Optional content rollback for the new podcast only. Do not run during release.
-- For a complete visual rollback, run this before restoring the old code, whose assets
-- do not include the new podcast cover. The record remains available for admin review.
UPDATE media_features
SET status = 'draft', is_featured = 0, updated_at = CURRENT_TIMESTAMP
WHERE external_url = 'https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx'
  AND contribution_type = 'podcast_guest';
