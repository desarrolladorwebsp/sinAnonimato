CREATE TABLE IF NOT EXISTS sa_reviews (
  id uuid PRIMARY KEY,
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 80),
  platform text NOT NULL CHECK (platform IN ('Instagram', 'YouTube', 'Comunidad')),
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 500),
  source_url text CHECK (char_length(source_url) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
