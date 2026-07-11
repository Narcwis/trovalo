-- Add side and level columns to boxes (replacing the old zone concept)
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT '';
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT '';
