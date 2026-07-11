-- Create the boxes table for Trovalo inventory
-- Run this SQL in your Supabase project SQL Editor.
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for all boxes (the anon key is a build secret).
-- For production with user auth, replace with more restrictive policies.
CREATE POLICY "Allow all operations for anon key" ON boxes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
