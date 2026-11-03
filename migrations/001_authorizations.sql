CREATE TABLE IF NOT EXISTS sa_documents (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  version text NOT NULL UNIQUE,
  content text NOT NULL,
  privacy text NOT NULL,
  acceptance text NOT NULL,
  digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  retired_at timestamptz
);

CREATE TABLE IF NOT EXISTS sa_authorizations (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES sa_documents(id),
  episode text NOT NULL,
  recording_at timestamptz NOT NULL,
  personal text NOT NULL,
  state text NOT NULL DEFAULT 'invited' CHECK (state IN ('invited','pending','confirmed','cancelled')),
  invite_hash text UNIQUE,
  invite_expires timestamptz NOT NULL,
  guest_hash text UNIQUE,
  guest_expires timestamptz,
  verify_hash text UNIQUE,
  verify_expires timestamptz,
  last_verification_at timestamptz,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  receipt text,
  receipt_digest text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  retain_until timestamptz NOT NULL,
  legal_hold boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS sa_authorizations_state ON sa_authorizations(state, created_at DESC);

CREATE TABLE IF NOT EXISTS sa_events (
  id uuid PRIMARY KEY,
  authorization_id uuid NOT NULL REFERENCES sa_authorizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  actor text NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sa_outbox (
  id uuid PRIMARY KEY,
  authorization_id uuid NOT NULL REFERENCES sa_authorizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('invitation','verification','guest_receipt','production')),
  payload text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  provider_id text,
  delivery text,
  delivery_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sa_outbox_pending ON sa_outbox(status, available_at);
CREATE INDEX IF NOT EXISTS sa_outbox_provider ON sa_outbox(provider_id);
CREATE TABLE IF NOT EXISTS sa_delivery_events (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES sa_outbox(id) ON DELETE CASCADE,
  happened_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sa_rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  reset_at timestamptz NOT NULL
);
