-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on users table
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own data
CREATE POLICY "Users can view only their own data" 
  ON users FOR SELECT 
  USING (id = auth.uid() OR id = '00000000-0000-0000-0000-000000000000');

-- Policy to allow users to update only their own data
CREATE POLICY "Users can update only their own data" 
  ON users FOR UPDATE 
  USING (id = auth.uid() OR id = '00000000-0000-0000-0000-000000000000');

-- Add user_id to bills table if it doesn't exist
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index on user_id in bills table
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);

-- Enable RLS on bills table
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bills
CREATE POLICY "Users can view only their own bills" 
  ON bills FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can insert their own bills" 
  ON bills FOR INSERT 
  WITH CHECK (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can update only their own bills" 
  ON bills FOR UPDATE 
  USING (user_id = auth.uid() OR user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can delete only their own bills" 
  ON bills FOR DELETE 
  USING (user_id = auth.uid() OR user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000');

-- Create function to migrate existing bills to a user
CREATE OR REPLACE FUNCTION migrate_bills_to_user(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update bills with NULL user_id to the specified user
  UPDATE bills
  SET user_id = p_user_id
  WHERE user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
