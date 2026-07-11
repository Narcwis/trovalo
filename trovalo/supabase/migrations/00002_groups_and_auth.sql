-- Groups for organizing users
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members of each group
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, email)
);

-- Add owner and group references to boxes
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE boxes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read groups
CREATE POLICY "Authenticated can read groups" ON groups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can manage groups
CREATE POLICY "Authenticated can manage groups" ON groups
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can read group members
CREATE POLICY "Authenticated can read group_members" ON group_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can manage group members
CREATE POLICY "Authenticated can manage group_members" ON group_members
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
