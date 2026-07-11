-- Allow authenticated users (Google OAuth) to read/write boxes
-- The existing policy only covers the anon role; Google-authenticated
-- users have the 'authenticated' role and need their own policy.
CREATE POLICY "Allow all operations for authenticated users" ON boxes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
