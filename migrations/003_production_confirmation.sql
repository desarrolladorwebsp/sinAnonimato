-- Keep the origin of each confirmation explicit; preserve existing email evidence.
ALTER TABLE sa_authorizations ADD COLUMN IF NOT EXISTS confirmation_method text;
ALTER TABLE sa_authorizations ADD COLUMN IF NOT EXISTS confirmed_by text;
ALTER TABLE sa_authorizations ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
UPDATE sa_authorizations SET confirmation_method='email' WHERE state='confirmed' AND confirmation_method IS NULL;
ALTER TABLE sa_authorizations DROP CONSTRAINT IF EXISTS sa_authorizations_state_check;
ALTER TABLE sa_authorizations ADD CONSTRAINT sa_authorizations_state_check CHECK (state IN ('invited','pending','confirmed','cancelled','rejected'));
ALTER TABLE sa_authorizations DROP CONSTRAINT IF EXISTS sa_authorizations_confirmation_method_check;
ALTER TABLE sa_authorizations ADD CONSTRAINT sa_authorizations_confirmation_method_check CHECK (confirmation_method IS NULL OR confirmation_method IN ('email','production'));
