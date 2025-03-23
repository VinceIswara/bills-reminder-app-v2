// routes/utilityRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const notificationService = require('../services/notificationService');
const storageService = require('../services/storageService');
const path = require('path');
const fs = require('fs');

// Test route to check if the API is running
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Welcome to the Bill Reminder API!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get test email previews
router.get('/test-email-previews', (req, res) => {
  try {
    const previews = notificationService.getTestEmailPreviews();
    res.json(previews);
  } catch (error) {
    console.error('Error getting test email previews:', error);
    res.status(500).json({ error: 'Failed to get test email previews', details: error.message });
  }
});

// Check notification tables
router.get('/check-notification-tables', async (req, res) => {
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
      }
    };
    
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['notifications', 'notification_preferences']);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else if (tables) {
      tables.forEach(table => {
        results.tables[table.table_name] = true;
      });
    }
    
    // Test SELECT policy for notifications
    const { data: selectNotifications, error: selectNotificationsError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (!selectNotificationsError) {
      results.policies.notifications.select = true;
    }
    
    // Test INSERT policy for notifications
    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test notification for policy check',
      type: 'test',
      user_id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      read: false,
      created_at: new Date()
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
        .select();
      
      if (!updateNotificationError && updateNotification) {
        results.policies.notifications.update = true;
      }
      
      // If update succeeded, test DELETE policy
      const { error: deleteNotificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', insertNotification[0].id);
      
      if (!deleteNotificationError) {
        results.policies.notifications.delete = true;
      }
    }
    
    // Test SELECT policy for notification_preferences
    const { data: selectPreference, error: selectPreferenceError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .limit(1);
    
    if (!selectPreferenceError) {
      results.policies.notification_preferences.select = true;
    }
    
    // Test INSERT policy for notification_preferences
    const testPreference = {
      user_id: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000',
      email_enabled: true,
      push_enabled: false,
      sms_enabled: false,
      reminder_days_before: 3,
      reminder_on_due_date: true,
      reminder_after_due_date: true,
      daily_summary: false
    };
    
    const { data: insertPreference, error: insertPreferenceError } = await supabase
      .from('notification_preferences')
      .insert([testPreference])
      .select();
    
    if (!insertPreferenceError && insertPreference) {
      results.policies.notification_preferences.insert = true;
      
      // If insert succeeded, test UPDATE policy
      const { data: updatePreference, error: updatePreferenceError } = await supabase
        .from('notification_preferences')
        .update({ reminder_days_before: 5 })
        .eq('user_id', testPreference.user_id)
        .select();
      
      if (!updatePreferenceError && updatePreference) {
        results.policies.notification_preferences.update = true;
      }
      
      // If update succeeded, test DELETE policy
      const { error: deletePreferenceError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testPreference.user_id);
      
      if (!deletePreferenceError) {
        results.policies.notification_preferences.delete = true;
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error checking notification tables:', error);
    res.status(500).json({ 
      error: 'Failed to check notification tables', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Create notification tables
router.get('/create-notification-tables', async (req, res) => {
  try {
    console.log('Creating notification tables directly...');
    
    // Create notifications table
    const createNotificationsTable = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          bill_id UUID,
          type TEXT NOT NULL,
          user_id UUID NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable Row Level Security
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for users to see only their own notifications
        CREATE POLICY select_own_notifications ON notifications
          FOR SELECT USING (user_id = auth.uid());
        
        -- Create policy for users to insert only their own notifications
        CREATE POLICY insert_own_notifications ON notifications
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        -- Create policy for users to update only their own notifications
        CREATE POLICY update_own_notifications ON notifications
          FOR UPDATE USING (user_id = auth.uid());
        
        -- Create policy for users to delete only their own notifications
        CREATE POLICY delete_own_notifications ON notifications
          FOR DELETE USING (user_id = auth.uid());
      `
    });
    
    // Create notification_preferences table
    const createPreferencesTable = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notification_preferences (
          user_id UUID PRIMARY KEY,
          email_enabled BOOLEAN DEFAULT TRUE,
          push_enabled BOOLEAN DEFAULT FALSE,
          sms_enabled BOOLEAN DEFAULT FALSE,
          reminder_days_before INTEGER DEFAULT 3,
          reminder_on_due_date BOOLEAN DEFAULT TRUE,
          reminder_after_due_date BOOLEAN DEFAULT TRUE,
          daily_summary BOOLEAN DEFAULT FALSE,
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable Row Level Security
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for users to see only their own preferences
        CREATE POLICY select_own_preferences ON notification_preferences
          FOR SELECT USING (user_id = auth.uid());
        
        -- Create policy for users to insert only their own preferences
        CREATE POLICY insert_own_preferences ON notification_preferences
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        -- Create policy for users to update only their own preferences
        CREATE POLICY update_own_preferences ON notification_preferences
          FOR UPDATE USING (user_id = auth.uid());
        
        -- Create policy for users to delete only their own preferences
        CREATE POLICY delete_own_preferences ON notification_preferences
          FOR DELETE USING (user_id = auth.uid());
        
        -- Create function to mark notification as read
        CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID, p_user_id UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
          v_updated BOOLEAN;
        BEGIN
          UPDATE notifications
          SET read = TRUE, updated_at = NOW()
          WHERE id = p_notification_id AND user_id = p_user_id
          RETURNING TRUE INTO v_updated;
          
          RETURN COALESCE(v_updated, FALSE);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    return res.json({
      success: true,
      message: 'Notification tables created successfully',
      details: {
        notifications: !createNotificationsTable.error,
        preferences: !createPreferencesTable.error
      }
    });
  } catch (error) {
    console.error('Error creating notification tables:', error);
    return res.status(500).json({
      error: 'Failed to create notification tables',
      details: error.message
    });
  }
});

// Test Supabase connection
router.get('/test-supabase-connection', async (req, res) => {
  try {
    console.log('Testing basic Supabase connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const envCheck = {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      serviceRoleKey: !!serviceRoleKey
    };
    
    console.log('Environment variables check:', envCheck);
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        message: 'Missing required Supabase environment variables',
        envCheck
      });
    }
    
    // Import required modules
    const { createClient } = require('@supabase/supabase-js');
    
    // Test regular client
    console.log('Testing regular Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test a simple query to verify connection
    const { data: healthData, error: healthError } = await supabase.from('health_check').select('*').limit(1).catch(err => {
      console.error('Error during health check query:', err);
      return { error: err };
    });
    
    // If health_check table doesn't exist, try a different approach
    let connectionTest;
    if (healthError && healthError.code === '42P01') { // relation does not exist
      console.log('health_check table not found, testing with rpc function...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('version').catch(err => {
        console.error('Error during rpc call:', err);
        return { error: err };
      });
      
      connectionTest = {
        success: !rpcError,
        method: 'rpc',
        error: rpcError,
        data: rpcData
      };
    } else {
      connectionTest = {
        success: !healthError,
        method: 'query',
        error: healthError,
        data: healthData
      };
    }
    
    // Test service role client if available
    let serviceRoleTest = { available: false };
    if (serviceRoleKey) {
      console.log('Testing service role Supabase client...');
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: adminData, error: adminError } = await supabaseAdmin.storage.listBuckets().catch(err => {
        console.error('Error listing buckets with service role:', err);
        return { error: err };
      });
      
      serviceRoleTest = {
        available: true,
        success: !adminError,
        error: adminError,
        data: adminData
      };
    }
    
    // Return comprehensive test results
    res.json({
      success: connectionTest.success && (!serviceRoleTest.available || serviceRoleTest.success),
      message: 'Supabase connection test completed',
      envCheck,
      connectionTest,
      serviceRoleTest
    });
  } catch (error) {
    console.error('Unexpected error during Supabase connection test:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error during Supabase connection test',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test route for Supabase Storage connection
router.get('/test-storage', async (req, res) => {
  try {
    // Skip authentication check for this test route
    console.log('Testing Supabase Storage connection...');
    const testResult = await storageService.testSupabaseStorage();
    
    if (testResult.success) {
      // If successful, try to upload a test file
      // Look for existing image files in the uploads directory
      const uploadsDir = path.join(__dirname, '../uploads');
      
      // Get the first PNG file in the uploads directory
      let testFilePath = null;
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const pngFile = files.find(file => file.endsWith('.png'));
        
        if (pngFile) {
          testFilePath = path.join(uploadsDir, pngFile);
          console.log(`Found test file: ${testFilePath}`);
        }
      }
      
      if (testFilePath && fs.existsSync(testFilePath)) {
        console.log('Found test file, attempting to upload...');
        const testFile = {
          path: testFilePath,
          mimetype: 'image/png',
          originalname: path.basename(testFilePath)
        };
        
        // Use a test user ID for this test
        const testUserId = 'test-user-' + Date.now();
        console.log(`Using test user ID: ${testUserId}`);
        
        const uploadResult = await storageService.uploadFile(testFile, testUserId);
        
        // Check if the upload was successful
        if (uploadResult.error) {
          console.error('Test upload failed:', uploadResult.error);
          res.status(500).json({
            success: false,
            message: 'Supabase Storage connection successful but upload failed',
            bucketTest: testResult,
            uploadError: uploadResult.error
          });
        } else {
          console.log('Test upload successful:', uploadResult);
          
          // Try to fetch the file to verify it exists
          const { createClient } = require('@supabase/supabase-js');
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
          const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            serviceRoleKey
          );
          
          const filePath = `public-test/${path.basename(testFilePath)}`;
          const { data: fileData, error: fileError } = await supabaseAdmin.storage
            .from('bill-images')
            .list('public-test');
          
          if (fileError) {
            console.error('Error listing files:', fileError);
          } else {
            console.log('Files in public-test directory:', fileData);
          }
          
          res.json({
            success: true,
            message: 'Supabase Storage connection and upload successful',
            bucketTest: testResult,
            uploadTest: uploadResult,
            fileList: fileData || []
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Supabase Storage connection successful, but no test files found in uploads directory',
          bucketTest: testResult
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Supabase Storage connection failed',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('Error testing Supabase Storage:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing Supabase Storage',
      error: error.message
    });
  }
});

module.exports = router;
