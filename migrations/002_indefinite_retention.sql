-- NULL represents an expressly configured indeterminate term.
-- Existing dated authorizations keep their original retention deadline.
ALTER TABLE sa_authorizations ALTER COLUMN retain_until DROP NOT NULL;
