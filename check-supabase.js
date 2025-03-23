require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';

async function checkSupabaseSetup() {
  try {
    console.log('Starting Supabase diagnostic check...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Test User ID:', testUserId);
    
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
        id: testUserId,
        can_access: false
      }
    };

    // Check if tables exist
    console.log('\nChecking if notification tables exist...');
    const { data: notificationsTable, error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (!notificationsError) {
      results.tables.notifications = true;
      console.log('✅ Notifications table exists');
    } else {
      console.error('❌ Error checking notifications table:', notificationsError);
    }

    const { data: preferencesTable, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('id')
      .limit(1);
    
    if (!preferencesError) {
      results.tables.notification_preferences = true;
      console.log('✅ Notification preferences table exists');
    } else {
      console.error('❌ Error checking notification_preferences table:', preferencesError);
    }

    // Check if RLS policies are working for test user
    console.log('\nChecking RLS policies for test user...');
    
    // Test SELECT policy for notifications
    const { data: selectNotifications, error: selectNotificationsError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);
    
    if (!selectNotificationsError) {
      results.policies.notifications.select = true;
      console.log('✅ SELECT policy for notifications is working');
    } else {
      console.error('❌ Error testing SELECT policy for notifications:', selectNotificationsError);
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
      console.log('✅ INSERT policy for notifications is working');
      
      // If insert succeeded, test UPDATE policy
      const { data: updateNotification, error: updateNotificationError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', insertNotification[0].id)
        .eq('user_id', testUserId)
        .select();
      
      if (!updateNotificationError) {
        results.policies.notifications.update = true;
        console.log('✅ UPDATE policy for notifications is working');
      } else {
        console.error('❌ Error testing UPDATE policy for notifications:', updateNotificationError);
      }
      
      // Test DELETE policy
      const { error: deleteNotificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', insertNotification[0].id)
        .eq('user_id', testUserId);
      
      if (!deleteNotificationError) {
        results.policies.notifications.delete = true;
        console.log('✅ DELETE policy for notifications is working');
      } else {
        console.error('❌ Error testing DELETE policy for notifications:', deleteNotificationError);
      }
    } else {
      console.error('❌ Error testing INSERT policy for notifications:', insertNotificationError);
    }
    
    // Test SELECT policy for notification_preferences
    const { data: selectPreferences, error: selectPreferencesError } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);
    
    if (!selectPreferencesError) {
      results.policies.notification_preferences.select = true;
      console.log('✅ SELECT policy for notification_preferences is working');
    } else {
      console.error('❌ Error testing SELECT policy for notification_preferences:', selectPreferencesError);
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
      console.log('✅ INSERT policy for notification_preferences is working');
      
      // If insert succeeded, test UPDATE policy
      const { data: updatePreference, error: updatePreferenceError } = await supabase
        .from('notification_preferences')
        .update({ notification_days_before: 5 })
        .eq('id', insertPreference[0].id)
        .eq('user_id', testUserId)
        .select();
      
      if (!updatePreferenceError) {
        results.policies.notification_preferences.update = true;
        console.log('✅ UPDATE policy for notification_preferences is working');
      } else {
        console.error('❌ Error testing UPDATE policy for notification_preferences:', updatePreferenceError);
      }
      
      // Test DELETE policy
      const { error: deletePreferenceError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('id', insertPreference[0].id)
        .eq('user_id', testUserId);
      
      if (!deletePreferenceError) {
        results.policies.notification_preferences.delete = true;
        console.log('✅ DELETE policy for notification_preferences is working');
      } else {
        console.error('❌ Error testing DELETE policy for notification_preferences:', deletePreferenceError);
      }
    } else {
      console.error('❌ Error testing INSERT policy for notification_preferences:', insertPreferenceError);
    }
    
    // Test mark_notification_as_read function
    console.log('\nTesting mark_notification_as_read function...');
    
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
        console.log('✅ mark_notification_as_read function is working');
      } else {
        console.error('❌ Error testing mark_notification_as_read function:', functionError);
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
    
    console.log('\n--- SUMMARY ---');
    console.log('Tables:');
    console.log('  Notifications:', results.tables.notifications ? '✅' : '❌');
    console.log('  Notification Preferences:', results.tables.notification_preferences ? '✅' : '❌');
    
    console.log('\nNotifications Policies:');
    console.log('  SELECT:', results.policies.notifications.select ? '✅' : '❌');
    console.log('  INSERT:', results.policies.notifications.insert ? '✅' : '❌');
    console.log('  UPDATE:', results.policies.notifications.update ? '✅' : '❌');
    console.log('  DELETE:', results.policies.notifications.delete ? '✅' : '❌');
    
    console.log('\nNotification Preferences Policies:');
    console.log('  SELECT:', results.policies.notification_preferences.select ? '✅' : '❌');
    console.log('  INSERT:', results.policies.notification_preferences.insert ? '✅' : '❌');
    console.log('  UPDATE:', results.policies.notification_preferences.update ? '✅' : '❌');
    console.log('  DELETE:', results.policies.notification_preferences.delete ? '✅' : '❌');
    
    console.log('\nFunctions:');
    console.log('  mark_notification_as_read:', results.functions.mark_notification_as_read ? '✅' : '❌');
    
    console.log('\nTest User:');
    console.log('  ID:', results.test_user.id);
    console.log('  Can Access:', results.test_user.can_access ? '✅' : '❌');
    
    console.log('\nDiagnostic check completed!');
    
  } catch (error) {
    console.error('Error during diagnostic check:', error);
  }
}

// Run the check
checkSupabaseSetup();
