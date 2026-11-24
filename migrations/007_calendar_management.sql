ALTER TABLE sa_authorizations ADD COLUMN IF NOT EXISTS invitation_key text;
CREATE UNIQUE INDEX IF NOT EXISTS sa_active_invitation_key
  ON sa_authorizations (invitation_key)
  WHERE state IN ('invited', 'pending', 'confirmed');

ALTER TABLE sa_episode_schedule ADD COLUMN IF NOT EXISTS removed_at timestamptz;
ALTER TABLE sa_episode_schedule ADD COLUMN IF NOT EXISTS updated_by text;
