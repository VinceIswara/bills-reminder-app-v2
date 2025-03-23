// routes/notificationRoutes.js
//
// This file handles all notification-related endpoints.
// Base path: /api/notifications
//
// Note on endpoint changes during refactoring:
// - '/api/check-notification-tables' is now '/api/notifications/check-tables'
// - '/api/dev/create-notification-tables' is now '/api/notifications/dev/create-tables'
// - '/api/notification-preferences/:userId' is now '/api/notifications/preferences/:userId'
// - '/api/init-notification-preferences' is now '/api/notifications/init-preferences'
// - '/api/test-email-notification' is now '/api/notifications/test-email'
// - '/api/trigger-notifications/:userId' is now '/api/notifications/trigger/:userId'

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const billService = require('../services/billService');
const { formatDistanceToNow } = require('date-fns');
const supabase = require('../config/database');

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const RATE_LIMIT_MAX = 2; // Maximum 2 requests per 5 seconds

// Throttling middleware
const throttleNotificationRequests = (req, res, next) => {
  const userId = req.user ? req.user.id : 'anonymous';
  const now = Date.now();
  
  // Get or initialize request tracking for this user
  if (!requestCounts.has(userId)) {
    requestCounts.set(userId, {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW
    });
  }
  
  const userRequests = requestCounts.get(userId);
  
  // Reset counter if window expired
  if (now > userRequests.resetAt) {
    userRequests.count = 0;
    userRequests.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  // Check if over limit
  if (userRequests.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many notification requests',
      retryAfter: Math.ceil((userRequests.resetAt - now) / 1000)
    });
  }
  
  // Increment counter and continue
  userRequests.count++;
  next();
};

// Get notifications for user
router.get('/', throttleNotificationRequests, async (req, res) => {
  try {
    // Get the user ID from the authenticated user
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Fetching notifications for user:', userId);
    
    const notifications = await notificationService.getNotificationsForUser(userId);
    
    // Format the notifications for display
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      timeAgo: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
    }));
    
    res.json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

// Mark notification as read
router.put('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the user ID from the authenticated user
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Marking notification as read:', id, 'for user:', userId);
    
    const success = await notificationService.markNotificationAsRead(id, userId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the user ID from the authenticated user
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Deleting notification:', id, 'for user:', userId);
    
    const success = await notificationService.deleteNotification(id, userId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification', details: error.message });
  }
});

// Get notification preferences for the authenticated user
router.get('/preferences', async (req, res) => {
  try {
    // Get the user ID from the authenticated user
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Fetching notification preferences for user:', userId);
    
    const preferences = await notificationService.getNotificationPreferences(userId);
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences', details: error.message });
  }
});

// Get notification preferences for a specific user (admin only)
router.get('/preferences/:userId', async (req, res) => {
  try {
    // Get the authenticated user ID
    const authUserId = req.user ? req.user.id : null;
    
    if (!authUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if the authenticated user is an admin (you would need to implement this check)
    // For now, only allow users to access their own preferences
    const { userId } = req.params;
    
    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('Fetching notification preferences for user:', userId);
    
    const preferences = await notificationService.getNotificationPreferences(userId);
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences', details: error.message });
  }
});

// Update notification preferences
router.post('/preferences/:userId', async (req, res) => {
  try {
    // Get the authenticated user ID
    const authUserId = req.user ? req.user.id : null;
    
    if (!authUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { userId } = req.params;
    
    // Only allow users to update their own preferences
    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const preferences = req.body;
    
    console.log('Updating notification preferences for user:', userId, 'with data:', preferences);
    
    const updatedPreferences = await notificationService.updateNotificationPreferences(userId, preferences);
    
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences', details: error.message });
  }
});

// Initialize notification preferences for the authenticated user
router.get('/init-preferences', async (req, res) => {
  try {
    // Get the user ID from the authenticated user
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Initializing notification preferences for user:', userId);
    
    // Default preferences
    const defaultPreferences = {
      email_enabled: true,
      push_enabled: false,
      sms_enabled: false,
      reminder_days_before: 3,
      reminder_on_due_date: true,
      reminder_after_due_date: true,
      daily_summary: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      email_address: req.user.email || null // Use the authenticated user's email if available
    };
    
    const updatedPreferences = await notificationService.updateNotificationPreferences(userId, defaultPreferences);
    
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error initializing notification preferences:', error);
    res.status(500).json({ error: 'Failed to initialize notification preferences', details: error.message });
  }
});

// Test email notification
router.post('/test-email', async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    console.log(`Sending test email to ${email}`);
    
    const emailInfo = await notificationService.sendEmailNotification(
      email,
      subject || 'Test Email from Bill Reminder App',
      message || '<h1>Test Email</h1><p>This is a test email from the Bill Reminder App.</p>',
      true // Always use test mode for this endpoint
    );
    
    if (emailInfo) {
      // Get the preview URL for test emails
      const testEmailPreviews = notificationService.getTestEmailPreviews();
      const latestPreview = testEmailPreviews.length > 0 ? testEmailPreviews[testEmailPreviews.length - 1] : null;
      
      res.json({
        success: true,
        messageId: emailInfo.messageId,
        previewUrl: latestPreview ? latestPreview.previewUrl : null
      });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Test email with actually configured provider (e.g. SendGrid)
router.post('/test-configured-email', async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    console.log(`Sending test email via configured provider to ${email}`);
    
    const result = await notificationService.testEmailWithConfiguredProvider(
      email,
      subject || 'Test Email via Configured Provider',
      message || '<h1>Test Email</h1><p>This email was sent using the configured email provider.</p>'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending test email with configured provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// Trigger notifications for a user
router.get('/trigger/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Triggering bill notification check for user: ${userId}`);
    
    // Use the new triggerUserNotifications function from notificationService
    const result = await notificationService.triggerUserNotifications(userId);
    
    res.json(result);
  } catch (error) {
    console.error(`Error triggering bill notification check for user:`, error);
    res.status(500).json({ error: 'Failed to trigger bill notification check', details: error.message });
  }
});

// Manually trigger notification check for all users
router.post('/trigger-check', async (req, res) => {
  try {
    console.log('Manually triggering bill notification check for all users');
    
    // Use the checkBillsAndNotify function from notificationService
    const result = await notificationService.checkBillsAndNotify();
    
    res.json({
      success: true,
      message: 'Bill notification check triggered successfully',
      result
    });
  } catch (error) {
    console.error('Error triggering bill notification check:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger bill notification check', 
      details: error.message 
    });
  }
});

// Diagnostic endpoint to check Supabase notification tables and policies
router.get('/check-tables', async (req, res) => {
  try {
    const results = {
      tables: {
        notifications: false,
        notification_preferences: false
      },
      policies: {
        notifications: {
          select: false,
          insert: false,
          update: false,
          delete: false
        },
        notification_preferences: {
          select: false,
          insert: false,
          update: false,
          delete: false
        }
      },
      functions: {
        mark_notification_as_read: false
      },
      test_user: {
        id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
        can_access: false
      }
    };

    // Check if tables exist
    console.log('Checking if notification tables exist...');
    const { data: notificationsTable, error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (!notificationsError) {
      results.tables.notifications = true;
    } else {
      console.error('Error checking notifications table:', notificationsError);
    }

    const { data: preferencesTable, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('id')
      .limit(1);
    
    if (!preferencesError) {
      results.tables.notification_preferences = true;
    } else {
      console.error('Error checking notification_preferences table:', preferencesError);
    }

    // Check if RLS policies are working for test user
    console.log('Checking RLS policies for test user...');
    const testUserId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';
    
    // Test SELECT policy for notifications
    const { data: selectNotifications, error: selectNotificationsError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);
    
    if (!selectNotificationsError) {
      results.policies.notifications.select = true;
    } else {
      console.error('Error testing SELECT policy for notifications:', selectNotificationsError);
    }
    
    // Test INSERT policy for notifications
    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test notification for policy checking',
      type: 'upcoming',
      user_id: testUserId
    };
    
    const { data: insertNotification, error: insertNotificationError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select();
    
    if (!insertNotificationError && insertNotification) {
      results.policies.notifications.insert = true;
      
      // If insert succeeded, test UPDATE policy
      const { data: updateNotification, error: updateNotificationError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', insertNotification[0].id)
        .eq('user_id', testUserId)
        .select();
      
      if (!updateNotificationError) {
        results.policies.notifications.update = true;
      } else {
        console.error('Error testing UPDATE policy for notifications:', updateNotificationError);
      }
      
      // Test DELETE policy
      const { error: deleteNotificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', insertNotification[0].id)
        .eq('user_id', testUserId);
      
      if (!deleteNotificationError) {
        results.policies.notifications.delete = true;
      } else {
        console.error('Error testing DELETE policy for notifications:', deleteNotificationError);
      }
    } else {
      console.error('Error testing INSERT policy for notifications:', insertNotificationError);
    }
    
    // Test SELECT policy for notification_preferences
    const { data: selectPreferences, error: selectPreferencesError } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);
    
    if (!selectPreferencesError) {
      results.policies.notification_preferences.select = true;
    } else {
      console.error('Error testing SELECT policy for notification_preferences:', selectPreferencesError);
    }
    
    // Test INSERT policy for notification_preferences
    const testPreference = {
      user_id: testUserId,
      email_notifications: true,
      in_app_notifications: true,
      notification_days_before: 3,
      notify_on_due_date: true,
      notify_when_overdue: true
    };
    
    // First delete any existing preferences for test user to avoid unique constraint violation
    await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', testUserId);
    
    const { data: insertPreference, error: insertPreferenceError } = await supabase
      .from('notification_preferences')
      .insert([testPreference])
      .select();
    
    if (!insertPreferenceError && insertPreference) {
      results.policies.notification_preferences.insert = true;
      
      // If insert succeeded, test UPDATE policy
      const { data: updatePreference, error: updatePreferenceError } = await supabase
        .from('notification_preferences')
        .update({ notification_days_before: 5 })
        .eq('id', insertPreference[0].id)
        .eq('user_id', testUserId)
        .select();
      
      if (!updatePreferenceError) {
        results.policies.notification_preferences.update = true;
      } else {
        console.error('Error testing UPDATE policy for notification_preferences:', updatePreferenceError);
      }
      
      // Test DELETE policy
      const { error: deletePreferenceError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('id', insertPreference[0].id)
        .eq('user_id', testUserId);
      
      if (!deletePreferenceError) {
        results.policies.notification_preferences.delete = true;
      } else {
        console.error('Error testing DELETE policy for notification_preferences:', deletePreferenceError);
      }
    } else {
      console.error('Error testing INSERT policy for notification_preferences:', insertPreferenceError);
    }
    
    // Test mark_notification_as_read function
    console.log('Testing mark_notification_as_read function...');
    
    // Create a test notification first
    const testNotificationForFunction = {
      title: 'Test Notification for Function',
      message: 'This is a test notification for function checking',
      type: 'upcoming',
      user_id: testUserId
    };
    
    const { data: insertedNotification, error: insertedNotificationError } = await supabase
      .from('notifications')
      .insert([testNotificationForFunction])
      .select();
    
    if (!insertedNotificationError && insertedNotification) {
      // Test the function
      const { data: functionResult, error: functionError } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: insertedNotification[0].id,
        p_user_id: testUserId
      });
      
      if (!functionError && functionResult === true) {
        results.functions.mark_notification_as_read = true;
      } else {
        console.error('Error testing mark_notification_as_read function:', functionError);
      }
      
      // Clean up
      await supabase
        .from('notifications')
        .delete()
        .eq('id', insertedNotification[0].id);
    }
    
    // Check if test user can access
    results.test_user.can_access = 
      results.policies.notifications.select && 
      results.policies.notification_preferences.select;
    
    res.json({
      success: true,
      results,
      supabaseConfig: {
        url: process.env.SUPABASE_URL,
        keyProvided: !!process.env.SUPABASE_KEY
      }
    });
  } catch (error) {
    console.error('Error checking notification tables:', error);
    res.status(500).json({ 
      error: 'Failed to check notification tables', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Development endpoint to create notification tables directly
router.get('/dev/create-tables', async (req, res) => {
  try {
    console.log('Creating notification tables directly...');
    
    // Create notifications table
    const createNotificationsTable = await supabase.rpc('execute_sql', {
      sql: `
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
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for notifications
        DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
        CREATE POLICY "Users can view their own notifications" 
        ON notifications FOR SELECT 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
        CREATE POLICY "Users can insert their own notifications" 
        ON notifications FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
        CREATE POLICY "Users can update their own notifications" 
        ON notifications FOR UPDATE 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
        CREATE POLICY "Users can delete their own notifications" 
        ON notifications FOR DELETE 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
      `
    });
    
    if (createNotificationsTable.error) {
      console.error('Error creating notifications table:', createNotificationsTable.error);
    } else {
      console.log('Notifications table created successfully');
    }
    
    // Create notification_preferences table
    const createPreferencesTable = await supabase.rpc('execute_sql', {
      sql: `
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
        
        CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for notification_preferences
        DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can view their own notification preferences" 
        ON notification_preferences FOR SELECT 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can insert their own notification preferences" 
        ON notification_preferences FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can update their own notification preferences" 
        ON notification_preferences FOR UPDATE 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
        
        DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can delete their own notification preferences" 
        ON notification_preferences FOR DELETE 
        USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');
      `
    });
    
    if (createPreferencesTable.error) {
      console.error('Error creating notification_preferences table:', createPreferencesTable.error);
    } else {
      console.log('Notification_preferences table created successfully');
    }
    
    return res.json({
      success: true,
      message: 'Notification tables created successfully',
      notificationsTableCreated: !createNotificationsTable.error,
      preferencesTableCreated: !createPreferencesTable.error
    });
  } catch (error) {
    console.error('Error creating notification tables:', error);
    return res.status(500).json({
      error: 'Failed to create notification tables',
      details: error.message
    });
  }
});

module.exports = router;
