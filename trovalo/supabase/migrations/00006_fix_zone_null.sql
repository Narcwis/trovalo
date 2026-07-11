-- The zone column was replaced by side + level in migration 00003.
-- Drop its NOT NULL constraint so upserts that don't include zone succeed.
ALTER TABLE boxes ALTER COLUMN zone DROP NOT NULL;
ALTER TABLE boxes ALTER COLUMN zone SET DEFAULT '';
