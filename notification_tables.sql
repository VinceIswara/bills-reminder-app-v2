-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upcoming', 'due_today', 'overdue')),
  read BOOLEAN DEFAULT FALSE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  email_notifications BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  notification_days_before INTEGER DEFAULT 3,
  notify_on_due_date BOOLEAN DEFAULT TRUE,
  notify_when_overdue BOOLEAN DEFAULT TRUE,
  email_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create index on user_id for faster RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS on both tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications table
-- Policy for SELECT operations
CREATE POLICY "Users can view their own notifications" 
ON notifications 
FOR SELECT 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for INSERT operations
CREATE POLICY "Users can insert their own notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for UPDATE operations
CREATE POLICY "Users can update their own notifications" 
ON notifications 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for DELETE operations
CREATE POLICY "Users can delete their own notifications" 
ON notifications 
FOR DELETE 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- RLS is already enabled for notification_preferences above

-- Create RLS policies for notification_preferences table
-- Policy for SELECT operations
CREATE POLICY "Users can view their own notification preferences" 
ON notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for INSERT operations
CREATE POLICY "Users can insert their own notification preferences" 
ON notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for UPDATE operations
CREATE POLICY "Users can update their own notification preferences" 
ON notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Policy for DELETE operations
CREATE POLICY "Users can delete their own notification preferences" 
ON notification_preferences 
FOR DELETE 
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Create helper function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if the notification exists and belongs to the user
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  -- If the notification exists and belongs to the user, mark it as read
  IF v_count > 0 THEN
    UPDATE notifications
    SET read = TRUE, updated_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;