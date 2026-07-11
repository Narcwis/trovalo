-- Add soft-delete column
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
