ALTER TABLE sa_episode_schedule
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'chapter'
  CHECK (format IN ('chapter', 'short'));

-- The original curated Shorts were identifiable even before format was stored.
UPDATE sa_episode_schedule SET format = 'short'
WHERE format = 'chapter' AND youtube_id IN ('nkqIhbNKGX8', 'QDn41D6XRrA', 'MUCz8n6lCkw');
