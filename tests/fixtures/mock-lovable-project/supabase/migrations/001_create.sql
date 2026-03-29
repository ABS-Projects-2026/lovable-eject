-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function
DROP FUNCTION IF EXISTS get_user_habits(UUID);
CREATE FUNCTION get_user_habits(p_user_id UUID)
RETURNS SETOF habits AS $$
  SELECT * FROM habits WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Update metadata safely
UPDATE users SET metadata = jsonb_set(metadata, '{theme}', '"dark"');
