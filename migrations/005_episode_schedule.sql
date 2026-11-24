CREATE TABLE IF NOT EXISTS sa_episode_schedule (
  youtube_id text PRIMARY KEY CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  publish_at timestamptz NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
