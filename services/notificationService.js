// services/notificationService.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const supabase = require('../config/database');
const emailConfig = require('../config/email');

// Initialize in-memory notifications for testing
if (!global.testNotifications) {
  global.testNotifications = [];
}

// Initialize test email previews array
if (!global.testEmailPreviews) {
  global.testEmailPreviews = [];
}

// Add at the top of your file
const notificationCache = new Map(); // Cache by user ID
const CACHE_TTL = 30000; // 30 seconds cache lifetime

/**
 * Send email notification
 * @param {string} emailAddress - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML)
 * @param {boolean} isTestUser - Whether this is a test user
 * @returns {Promise<Object>} Email info object
 */
const sendEmailNotification = async (emailAddress, subject, message, isTestUser = false) => {
  if (!emailAddress) {
    console.log('No email address provided');
    return null;
  }
  
  try {
    let emailTransporter = emailConfig.getTransporter();
    let testAccount = null;
    let isEtherealEmail = false;
    
    // Only use Ethereal Email if no transporter is configured or if explicitly requested for testing
    if (!emailTransporter || (isTestUser && process.env.FORCE_TEST_EMAIL === 'true')) {
      console.log('Using Ethereal Email for testing or missing email configuration');
      testAccount = await nodemailer.createTestAccount();
      
      emailTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Created test email account:', testAccount.user);
      isEtherealEmail = true;
    } else if (emailTransporter) {
      console.log('Using configured email provider:', emailConfig.getProvider());
    }
    
    // Prepare email data with proper formatting and headers
    const emailData = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Bill Reminder'}" <${process.env.EMAIL_FROM || 'noreply@billreminder.app'}>`,
      to: emailAddress,
      subject: subject,
      html: message,
      text: message.replace(/<[^>]*>/g, ''), // Plain text version
      headers: {
        'X-Application': 'Bill Reminder App',
        'X-Environment': process.env.NODE_ENV || 'development'
      }
    };
    
    // Add unsubscribe header for production emails (CAN-SPAM compliance)
    if (!isEtherealEmail && process.env.NODE_ENV === 'production') {
      emailData.headers['List-Unsubscribe'] = `<${process.env.APP_URL || 'https://billreminder.app'}/unsubscribe?email=${encodeURIComponent(emailAddress)}>`;
    }
    
    // Add tracking pixel for email open tracking if configured
    if (process.env.EMAIL_TRACKING_ENABLED === 'true' && !isEtherealEmail) {
      const trackingId = crypto.randomUUID();
      const trackingUrl = `${process.env.APP_URL || 'https://billreminder.app'}/api/track-email?id=${trackingId}&email=${encodeURIComponent(emailAddress)}`;
      emailData.html += `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;">`;
      
      // Store tracking info in database if needed
      // This would be implemented based on your tracking needs
    }
    
    // Send the email
    const info = await emailTransporter.sendMail(emailData);
    
    console.log('Email sent:', info.messageId);
    
    // If using Ethereal, log the preview URL
    if (isEtherealEmail) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL for test email:', previewUrl);
      
      // Store the preview URL in a global variable for the test user
      global.testEmailPreviews.push({
        id: info.messageId,
        subject: subject,
        to: emailAddress,
        previewUrl: previewUrl,
        sentAt: new Date().toISOString()
      });
      
      // Keep only the last 10 preview URLs
      if (global.testEmailPreviews.length > 10) {
        global.testEmailPreviews.shift();
      }
    } else {
      // Log production email delivery for monitoring
      console.log(`Production email delivered to ${emailAddress} with subject "${subject}"`);
    }
    
    // Return the full info object
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Log detailed error information for troubleshooting
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    return null;
  }
};

/**
 * Create in-app notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} billId - Associated bill ID
 * @param {string} type - Notification type (e.g., 'reminder', 'overdue')
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created notification
 */
const createInAppNotification = async (title, message, billId, type, userId = null) => {
  try {
    // Get the user ID from the parameter or use the default test user ID
    const notificationUserId = userId || process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';
    
    console.log('Creating in-app notification for user:', notificationUserId);
    
    // For development with test user, use in-memory notifications
    if (notificationUserId === '00000000-0000-0000-0000-000000000000') {
      // Create an in-memory notification object with a random UUID
      const testNotification = {
        id: crypto.randomUUID(),
        title,
        message,
        bill_id: billId,
        type,
        user_id: notificationUserId,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in global variable for testing purposes
      global.testNotifications.push(testNotification);
      console.log('Created in-memory test notification:', testNotification);
      
      return testNotification;
    } else {
      // For real users, use Supabase
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          title,
          message,
          bill_id: billId,
          type,
          user_id: notificationUserId,
          read: false,
          created_at: new Date()
        }])
        .select();
      
      if (error) throw error;
      return data[0];
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error);
    throw error;
  }
};

/**
 * Get notifications for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of notifications
 */
const getNotificationsForUser = async (userId) => {
  try {
    // Check cache first
    const cacheKey = `notifications_${userId}`;
    const cachedData = notificationCache.get(cacheKey);
    
    // If we have fresh cached data, use it
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log('Using cached notifications for user:', userId);
      return cachedData.data;
    }
    
    // Otherwise fetch fresh data
    console.log('Fetching notifications for user:', userId);
    
    // For test user, use in-memory notifications
    if (userId === '00000000-0000-0000-0000-000000000000') {
      console.log('Using in-memory notifications for test user');
      const data = global.testNotifications.filter(notification => notification.user_id === userId);
      
      // Update cache
      notificationCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    }
    
    // For real users, use Supabase
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Update cache
    notificationCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get notification preferences for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification preferences
 */
const getNotificationPreferences = async (userId) => {
  try {
    console.log('Fetching notification preferences for user:', userId);
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // If no preferences found, return default values
      if (error.code === 'PGRST116') {
        return {
          user_id: userId,
          email_notifications: true,
          in_app_notifications: true,
          notification_days_before: 3,
          notify_on_due_date: true,
          notify_when_overdue: true,
          email_address: null
        };
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

/**
 * Update notification preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Notification preferences
 * @returns {Promise<Object>} Updated preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  try {
    console.log('Updating notification preferences for user:', userId);
    
    // Check if preferences exist for this user
    const { data: existingPrefs, error: checkError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);
    
    if (checkError) throw checkError;
    
    let result;
    
    if (existingPrefs && existingPrefs.length > 0) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      result = data[0];
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert([{ user_id: userId, ...preferences }])
        .select();
      
      if (error) throw error;
      result = data[0];
    }
    
    return result;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    console.log('Marking notification as read:', notificationId, 'for user:', userId);
    
    // For test user, update in-memory notification
    if (userId === '00000000-0000-0000-0000-000000000000') {
      const index = global.testNotifications.findIndex(
        notification => notification.id === notificationId && notification.user_id === userId
      );
      
      if (index !== -1) {
        global.testNotifications[index].read = true;
        global.testNotifications[index].updated_at = new Date().toISOString();
        return true;
      }
      
      return false;
    }
    
    // For real users, use Supabase RPC function
    const { data, error } = await supabase.rpc('mark_notification_as_read', {
      p_notification_id: notificationId,
      p_user_id: userId
    });
    
    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    console.log('Deleting notification:', notificationId, 'for user:', userId);
    
    // For test user, delete from in-memory notifications
    if (userId === '00000000-0000-0000-0000-000000000000') {
      const initialLength = global.testNotifications.length;
      global.testNotifications = global.testNotifications.filter(
        notification => notification.id !== notificationId || notification.user_id !== userId
      );
      
      return global.testNotifications.length < initialLength;
    }
    
    // For real users, use Supabase
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get test email previews
 * @returns {Array} Array of test email previews
 */
const getTestEmailPreviews = () => {
  return global.testEmailPreviews || [];
};

/**
 * Check for upcoming and overdue bills and send notifications
 * @returns {Promise<void>}
 */
const checkBillsAndNotify = async () => {
  try {
    console.log('Running bill notification check...');
    
    // In a real multi-user app, we would iterate through all users
    // For now, we'll use a default user ID for testing
    const userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';
    console.log('Checking notifications for user:', userId);
    
    // Get notification preferences for this user
    const notificationPrefs = await getNotificationPreferences(userId);
    
    // Get all unpaid bills
    // In a multi-user app, we would filter by user_id
    // For now, we'll get all bills and assume they belong to our test user
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('paid', false);
    
    if (billsError) throw billsError;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const notificationPromises = [];
    
    for (const bill of bills) {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysDifference = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      // Check if bill is due in X days (based on preferences)
      if (daysDifference === notificationPrefs.notification_days_before) {
        console.log(`Bill ${bill.id} (${bill.vendor}) is due in ${daysDifference} days`);
        
        // Check if we already sent this notification recently (in the last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const { data: existingNotifications, error: notifError } = await supabase
          .from('notifications')
          .select('id')
          .eq('bill_id', bill.id)
          .eq('type', 'upcoming')
          .eq('user_id', userId)
          .gte('created_at', oneDayAgo.toISOString());
        
        if (notifError) throw notifError;
        
        // Only send if we haven't sent this notification in the last 24 hours
        if (!existingNotifications || existingNotifications.length === 0) {
          // Create in-app notification
          if (notificationPrefs.in_app_notifications) {
            const title = `Upcoming Bill: ${bill.vendor}`;
            const message = `Your bill of $${bill.amount} for ${bill.vendor} is due in ${daysDifference} days (${new Date(bill.due_date).toLocaleDateString()}).`;
            notificationPromises.push(module.exports.createInAppNotification(title, message, bill.id, 'upcoming', userId));
          }
          
          // Send email notification
          if (notificationPrefs.email_notifications && notificationPrefs.email_address) {
            const subject = `Upcoming Bill: ${bill.vendor}`;
            const message = `
              <h2>Upcoming Bill Reminder</h2>
              <p>Your bill of $${bill.amount} for ${bill.vendor} is due in ${daysDifference} days.</p>
              <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
              <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
              <p>Please make sure to pay this bill on time to avoid late fees.</p>
            `;
            // Use test email for all users when no production email is configured
            const useTestEmail = !emailConfig.getTransporter();
            notificationPromises.push(module.exports.sendEmailNotification(notificationPrefs.email_address, subject, message, useTestEmail));
          }
        } else {
          console.log(`Skipping notification for bill ${bill.id} as one was sent in the last 24 hours`);
        }
      }
      
      // Check if bill is due today
      if (daysDifference === 0 && notificationPrefs.notify_on_due_date) {
        console.log(`Bill ${bill.id} (${bill.vendor}) is due today`);
        
        // Check if we already sent this notification today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const { data: existingNotifications, error: notifError } = await supabase
          .from('notifications')
          .select('id')
          .eq('bill_id', bill.id)
          .eq('type', 'due_today')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString());
        
        if (notifError) throw notifError;
        
        // Only send if we haven't sent this notification today
        if (!existingNotifications || existingNotifications.length === 0) {
          // Create in-app notification
          if (notificationPrefs.in_app_notifications) {
            const title = `Bill Due Today: ${bill.vendor}`;
            const message = `Your bill of $${bill.amount} for ${bill.vendor} is due today.`;
            notificationPromises.push(module.exports.createInAppNotification(title, message, bill.id, 'due_today', userId));
          }
          
          // Send email notification
          if (notificationPrefs.email_notifications && notificationPrefs.email_address) {
            const subject = `Bill Due Today: ${bill.vendor}`;
            const message = `
              <h2>Bill Due Today</h2>
              <p>Your bill of $${bill.amount} for ${bill.vendor} is due today.</p>
              <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
              <p>Please make sure to pay this bill today to avoid late fees.</p>
            `;
            // Use test email for all users when no production email is configured
            const useTestEmail = !emailConfig.getTransporter();
            notificationPromises.push(module.exports.sendEmailNotification(notificationPrefs.email_address, subject, message, useTestEmail));
          }
        } else {
          console.log(`Skipping notification for bill ${bill.id} as one was sent today`);
        }
      }
      
      // Check if bill is overdue
      if (daysDifference < 0 && notificationPrefs.notify_when_overdue) {
        console.log(`Bill ${bill.id} (${bill.vendor}) is overdue by ${Math.abs(daysDifference)} days`);
        
        // For overdue bills, we don't want to spam notifications every day
        // So we'll check if we've already sent an overdue notification in the past week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data: existingNotifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('bill_id', bill.id)
          .eq('type', 'overdue')
          .eq('user_id', userId)
          .gte('created_at', oneWeekAgo.toISOString());
        
        if (notifError) throw notifError;
        
        // Only send if we haven't sent an overdue notification in the past week
        if (!existingNotifications || existingNotifications.length === 0) {
          // Create in-app notification
          if (notificationPrefs.in_app_notifications) {
            const title = `Overdue Bill: ${bill.vendor}`;
            const message = `Your bill of $${bill.amount} for ${bill.vendor} is overdue by ${Math.abs(daysDifference)} days.`;
            notificationPromises.push(module.exports.createInAppNotification(title, message, bill.id, 'overdue', userId));
          }
          
          // Send email notification
          if (notificationPrefs.email_notifications && notificationPrefs.email_address) {
            const subject = `Overdue Bill: ${bill.vendor}`;
            const message = `
              <h2>Overdue Bill Alert</h2>
              <p>Your bill of $${bill.amount} for ${bill.vendor} is overdue by ${Math.abs(daysDifference)} days.</p>
              <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
              <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
              <p>Please pay this bill as soon as possible to avoid additional late fees.</p>
            `;
            // Use test email for all users when no production email is configured
            const useTestEmail = !emailConfig.getTransporter();
            notificationPromises.push(module.exports.sendEmailNotification(notificationPrefs.email_address, subject, message, useTestEmail));
          }
        } else {
          console.log(`Skipping overdue notification for bill ${bill.id} as one was sent in the past week`);
        }
      }
    }
    
    await Promise.all(notificationPromises);
    console.log('Bill notification check completed');
  } catch (error) {
    console.error('Error in bill notification check:', error);
    throw error;
  }
};

/**
 * Trigger bill notifications for a specific user
 * @param {string} userId - User ID to check bills and send notifications for
 * @returns {Promise<Object>} Result of the notification check
 */
const triggerUserNotifications = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    console.log(`Manually triggering bill notification check for user ${userId}...`);
    
    // For test users, use sample bills since we can't directly query by user_id
    let bills = [];
    
    if (userId === process.env.TEST_USER_ID) {
      // Create sample bills for testing
      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      
      bills = [
        {
          id: '7c02f559-3443-4ee5-83cb-7437aaefec3a',
          vendor: 'Test Vendor',
          amount: 99.99,
          due_date: today.toISOString().split('T')[0],
          category: 'Test Category'
        },
        {
          id: '70cf27c3-e850-4733-9a41-c297086b1324',
          vendor: 'Test Overdue Bill',
          amount: 79.99,
          due_date: twoDaysAgo.toISOString().split('T')[0],
          category: 'Test Category'
        },
        {
          id: '8a5d1c9e-7f3b-4e2d-b6a0-9c8d5f7e3b2a',
          vendor: 'Test Upcoming Bill',
          amount: 149.99,
          due_date: threeDaysFromNow.toISOString().split('T')[0],
          category: 'Test Category'
        }
      ];
    } else {
      // For real users, we would need to query bills based on the auth context
      // This would typically be handled by Supabase RLS policies
      // For now, we'll just use a generic query and rely on RLS to filter
      const { data: userBills, error: billsError } = await supabase
        .from('bills')
        .select('*');
        
      if (billsError) {
        throw billsError;
      }
      
      bills = userBills || [];
    }
    
    if (bills.length === 0) {
      return { success: true, message: 'No bills found for this user', notificationsCreated: 0, bills: 0 };
    }
    
    // Get user's notification preferences
    const { data: notificationPrefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
      throw prefsError;
    }
    
    // If no preferences found, use default preferences
    const userPrefs = notificationPrefs || {
      user_id: userId,
      in_app_notifications: true,
      email_notifications: false,
      email_address: null,
      notification_days_before: 3
    };
    
    // Process each bill and send notifications if needed
    const notificationPromises = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const bill of bills) {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysDifference = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      // Check if bill is upcoming and matches the notification_days_before preference
      if (daysDifference === userPrefs.notification_days_before) {
        // Create in-app notification
        if (userPrefs.in_app_notifications) {
          const title = `Upcoming Bill: ${bill.vendor}`;
          const message = `Your bill of $${bill.amount} for ${bill.vendor} is due in ${daysDifference} days.`;
          notificationPromises.push(createInAppNotification(title, message, bill.id, 'upcoming', userId));
        }
        
        // Send email notification
        if (userPrefs.email_notifications && userPrefs.email_address) {
          const subject = `Upcoming Bill: ${bill.vendor}`;
          const message = `
            <h2>Upcoming Bill Reminder</h2>
            <p>Your bill of $${bill.amount} for ${bill.vendor} is due in ${daysDifference} days.</p>
            <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
            <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
            <p>Please make sure to pay this bill on time to avoid late fees.</p>
          `;
          // Check if this is the test user
          const isTestUser = userId === process.env.TEST_USER_ID;
          notificationPromises.push(sendEmailNotification(userPrefs.email_address, subject, message, isTestUser));
        }
      }
      // Check if bill is due today
      else if (daysDifference === 0) {
        // Create in-app notification
        if (userPrefs.in_app_notifications) {
          const title = `Bill Due Today: ${bill.vendor}`;
          const message = `Your bill of $${bill.amount} for ${bill.vendor} is due today.`;
          notificationPromises.push(createInAppNotification(title, message, bill.id, 'due_today', userId));
        }
        
        // Send email notification
        if (userPrefs.email_notifications && userPrefs.email_address) {
          const subject = `Bill Due Today: ${bill.vendor}`;
          const message = `
            <h2>Bill Due Today</h2>
            <p>Your bill of $${bill.amount} for ${bill.vendor} is due today.</p>
            <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
            <p>Please make sure to pay this bill today to avoid late fees.</p>
          `;
          // Check if this is the test user
          const isTestUser = userId === process.env.TEST_USER_ID;
          notificationPromises.push(sendEmailNotification(userPrefs.email_address, subject, message, isTestUser));
        }
      }
      // Check if bill is overdue
      else if (daysDifference < 0) {
        // Create in-app notification
        if (userPrefs.in_app_notifications) {
          const title = `Overdue Bill: ${bill.vendor}`;
          const message = `Your bill of $${bill.amount} for ${bill.vendor} is overdue by ${Math.abs(daysDifference)} days.`;
          notificationPromises.push(createInAppNotification(title, message, bill.id, 'overdue', userId));
        }
        
        // Send email notification
        if (userPrefs.email_notifications && userPrefs.email_address) {
          const subject = `Overdue Bill: ${bill.vendor}`;
          const message = `
            <h2>Overdue Bill Alert</h2>
            <p>Your bill of $${bill.amount} for ${bill.vendor} is overdue by ${Math.abs(daysDifference)} days.</p>
            <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
            <p><strong>Category:</strong> ${bill.category || 'Uncategorized'}</p>
            <p>Please pay this bill as soon as possible to avoid additional late fees.</p>
          `;
          // Check if this is the test user
          const isTestUser = userId === process.env.TEST_USER_ID;
          notificationPromises.push(sendEmailNotification(userPrefs.email_address, subject, message, isTestUser));
        }
      }
    }
    
    await Promise.all(notificationPromises);
    
    return {
      success: true,
      message: `Bill notification check triggered successfully for user ${userId}`,
      notificationsCreated: notificationPromises.length,
      bills: bills.length
    };
  } catch (error) {
    console.error(`Error triggering bill notification check for user:`, error);
    throw error;
  }
};

/**
 * Test email with configured provider
 * @param {string} emailAddress - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML)
 * @returns {Promise<Object>} Email info object with provider information
 */
const testEmailWithConfiguredProvider = async (emailAddress, subject, message) => {
  if (!emailAddress) {
    console.log('No email address provided');
    return { success: false, error: 'No email address provided' };
  }
  
  try {
    let emailTransporter = emailConfig.getTransporter();
    
    if (!emailTransporter) {
      return { 
        success: false, 
        error: 'No email transport configured', 
        provider: 'none'
      };
    }
    
    // Get the current email provider from environment variables
    const currentProvider = process.env.EMAIL_PROVIDER || 'smtp';
    
    // Prepare email data
    const emailData = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Bill Reminder'}" <${process.env.EMAIL_FROM || 'noreply@billreminder.app'}>`,
      to: emailAddress,
      subject: subject,
      html: message,
      text: message.replace(/<[^>]*>/g, ''), // Plain text version
      headers: {
        'X-Application': 'Bill Reminder App',
        'X-Environment': process.env.NODE_ENV || 'development',
        'X-Test-Email': 'true'
      }
    };
    
    // Send the email
    const info = await emailTransporter.sendMail(emailData);
    
    console.log(`Test email sent via ${currentProvider}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      provider: currentProvider,
      info: info
    };
  } catch (error) {
    console.error('Error sending test email with configured provider:', error);
    return {
      success: false,
      error: error.message,
      provider: process.env.EMAIL_PROVIDER || 'unknown'
    };
  }
};

/**
 * Schedule daily notification check
 * Sets up a job to run at 8 AM daily to check bills and send notifications
 * @returns {Object} The scheduled job object
 */
const scheduleNotifications = () => {
  const schedule = require('node-schedule');
  
  // Schedule daily notification check at 8 AM
  const notificationJob = schedule.scheduleJob('0 8 * * *', async () => {
    try {
      console.log('Running scheduled bill notification check...');
      await checkBillsAndNotify();
    } catch (error) {
      console.error('Error in scheduled notification check:', error);
    }
  });
  
  return notificationJob;
};

module.exports = {
  sendEmailNotification,
  createInAppNotification,
  getNotificationsForUser,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationAsRead,
  deleteNotification,
  getTestEmailPreviews,
  checkBillsAndNotify,
  triggerUserNotifications,
  testEmailWithConfiguredProvider,
  scheduleNotifications
};