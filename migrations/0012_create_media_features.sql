CREATE TABLE media_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('article', 'podcast', 'interview', 'other')),
  external_url TEXT NOT NULL,
  short_description TEXT,
  thumbnail_url TEXT,
  image_alt TEXT,
  publication_date TEXT,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('written_by_katty', 'interview_with_katty', 'independent_coverage', 'podcast_guest', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_features_homepage
ON media_features (status, is_featured, display_order, publication_date);

INSERT INTO media_features (
  title, publisher, media_type, external_url, short_description,
  thumbnail_url, image_alt, publication_date, contribution_type,
  status, is_featured, display_order
) VALUES (
  'When Did We Stop Moving for Joy?',
  'The Times',
  'article',
  'https://thetimes.com.au/lifestyle/health/53105-when-did-we-stop-moving-for-joy',
  'Katty shares her perspective on rediscovering the freedom to move, express ourselves and reconnect with joy.',
  NULL,
  NULL,
  '2026-10-13',
  'written_by_katty',
  'published',
  1,
  1
);
