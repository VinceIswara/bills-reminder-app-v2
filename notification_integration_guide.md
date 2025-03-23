# Bill Reminder App Notification System Integration Guide

This guide explains how to integrate the comprehensive notification system with your Bill Reminder application. The notification system provides both in-app and email notifications for upcoming and overdue bills.

## System Overview

The notification system consists of:

1. **Database Tables**: For storing notifications and user preferences
2. **Backend API**: Endpoints for managing notifications and preferences
3. **Frontend Components**: UI for displaying and managing notifications
4. **Scheduled Jobs**: Background processes to check for bills and send notifications
5. **Email Integration**: For sending email notifications with support for multiple providers
6. **Test Notification Feature**: Allows users to verify their notification settings are working correctly

## Database Setup

1. Run the `notification_tables.sql` script in your Supabase SQL Editor to create:
   - `notifications` table: Stores all user notifications
   - `notification_preferences` table: Stores user notification settings
   - Row Level Security (RLS) policies: Ensures users can only access their own data
   - Helper functions: For managing notifications

## Server Integration

The notification system requires several backend endpoints and helper functions. These have been implemented in a modular architecture with dedicated files for each component:

- `routes/notificationRoutes.js`: API endpoints for notifications
- `services/notificationService.js`: Business logic for notifications
- `config/email.js`: Email provider configuration
- `utils/emailUtils.js`: Email sending utilities

### Notification Endpoints

The notification system provides the following API endpoints in `routes/notificationRoutes.js`:

#### Test Notification Endpoint

A special endpoint for sending test notifications to verify user settings:

```javascript
// Endpoint to send a test notification
router.post('/test', async (req, res) => {
  try {
    const { email, in_app } = req.body;
    
    if (!email && !in_app) {
      return res.status(400).json({ 
        error: 'At least one notification type (email or in-app) must be enabled' 
      });
    }
    
    const result = await notificationService.sendTestNotification(email, in_app);
    
    res.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification', details: error.message });
  }
});
```

### Standard Notification Endpoints

The notification system provides the following standard API endpoints:

```javascript
// Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markNotificationAsRead(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteNotification(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences();
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
router.post('/preferences', async (req, res) => {
  try {
    const preferences = req.body;
    const result = await notificationService.updateNotificationPreferences(preferences);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: error.message });
  }
});
    
    // Check if preferences already exist
    const { data: existingData, error: fetchError } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    let result;
    
    if (existingData) {
      // Update existing preferences
      result = await supabase
        .from('notification_preferences')
        .update({
          email_notifications,
          in_app_notifications,
          notification_days_before,
          notify_on_due_date,
          notify_when_overdue,
          email_address,
          updated_at: new Date()
        })
        .eq('id', existingData.id)
        .select();
    } else {
      // Insert new preferences
      result = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          email_notifications,
          in_app_notifications,
          notification_days_before,
          notify_on_due_date,
          notify_when_overdue,
          email_address
        })
        .select();
    }
    
    if (result.error) throw result.error;
    
    res.json({ success: true, data: result.data[0] });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Notification Scheduler

The notification system includes a scheduler that runs daily to check for upcoming and overdue bills. This is now implemented in the modular architecture:

```javascript
// In config/init.js
const { checkBillsAndNotify } = require('../services/notificationService');
const schedule = require('node-schedule');

// Initialize notification system
async function initializeNotificationSystem() {
  try {
    console.log('Initializing notification system...');
    
    // Run initial notification check
    await checkBillsAndNotify();
    
    // Schedule daily notification check (8 AM)
    schedule.scheduleJob('0 8 * * *', checkBillsAndNotify);
    
    console.log('Notification system initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing notification system:', error);
    return false;
  }
}

// In services/notificationService.js
async function checkBillsAndNotify() {
  try {
    console.log('Checking for bills that need notifications...');
    
    // Get all bills
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*');
      
    if (billsError) throw billsError;
    
    // Get all users with their notification preferences
    const { data: users, error: usersError } = await supabase
      .from('users') // Replace with your users table
      .select(`
        id,
        email,
        notification_preferences (*)
      `);
      
    if (usersError) throw usersError;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process each user
    for (const user of users) {
      const preferences = user.notification_preferences[0] || {
        email_notifications: true,
        in_app_notifications: true,
        notification_days_before: 3,
        notify_on_due_date: true,
        notify_when_overdue: true
      };
      
      // Process each bill
      for (const bill of bills) {
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // Calculate days until due
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        // Check if we need to notify about this bill
        let notificationType = null;
        let notificationTitle = null;
        let notificationMessage = null;
        
        if (daysUntilDue < 0 && preferences.notify_when_overdue) {
          // Bill is overdue
          notificationType = 'overdue';
          notificationTitle = `Overdue Bill: ${bill.vendor}`;
          notificationMessage = `Your bill of $${bill.amount} from ${bill.vendor} was due ${Math.abs(daysUntilDue)} days ago.`;
        } else if (daysUntilDue === 0 && preferences.notify_on_due_date) {
          // Bill is due today
          notificationType = 'due_today';
          notificationTitle = `Bill Due Today: ${bill.vendor}`;
          notificationMessage = `Your bill of $${bill.amount} from ${bill.vendor} is due today.`;
        } else if (daysUntilDue > 0 && daysUntilDue <= preferences.notification_days_before) {
          // Bill is upcoming within the notification window
          notificationType = 'upcoming';
          notificationTitle = `Upcoming Bill: ${bill.vendor}`;
          notificationMessage = `Your bill of $${bill.amount} from ${bill.vendor} is due in ${daysUntilDue} days.`;
        }
        
        // If we need to notify, create notification
        if (notificationType) {
          // Check if we already sent this notification recently
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          
          const { data: existingNotifications, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('bill_id', bill.id)
            .eq('type', notificationType)
            .eq('user_id', user.id)
            .gte('created_at', oneDayAgo.toISOString())
            .single();
            
          if (notifError && notifError.code !== 'PGRST116') throw notifError;
          
          // Only send if we haven't sent this notification in the last 24 hours
          if (!existingNotifications) {
            // Create in-app notification if enabled
            if (preferences.in_app_notifications) {
              await supabase
                .from('notifications')
                .insert({
                  title: notificationTitle,
                  message: notificationMessage,
                  bill_id: bill.id,
                  type: notificationType,
                  user_id: user.id
                });
            }
            
            // Send email notification if enabled
            if (preferences.email_notifications && preferences.email_address) {
              await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: preferences.email_address,
                subject: notificationTitle,
                text: notificationMessage,
                html: `<p>${notificationMessage}</p>`
              });
            }
          }
        }
      }
    }
    
    console.log('Notification check completed');
  } catch (error) {
    console.error('Error in bill notification check:', error);
  }
}

// Schedule notification check to run daily at 8 AM
schedule.scheduleJob('0 8 * * *', checkBillsAndNotify);

// Also run once when server starts
checkBillsAndNotify();
```

## Authentication Integration

To fully integrate the notification system with authentication:

1. Replace `'current-user-id'` with the actual user ID from your authentication system
2. Update the notification scheduler to use your actual user data structure
3. Ensure your RLS policies are correctly set up to work with your authentication system

## Frontend Integration

The notification system includes several frontend components:

### 1. Test Notification Feature

The notification settings page includes a "Send Test Notification" button that allows users to verify their notification settings are working correctly. This feature:

- Sends a test notification based on the user's current settings (email, in-app, or both)
- Provides immediate feedback on whether the notification was sent successfully
- Updates the recent notifications list to show the test notification
- Helps users troubleshoot notification issues

Implementation in the client API utility:

```javascript
// Send a test notification
export const sendTestNotification = async (notificationData) => {
  try {
    console.log('Sending test notification with data:', notificationData);
    const response = await axios.post(`${API_URL}/notifications/test`, notificationData);
    console.log('Test notification response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error.response ? error.response.data : new Error('Network error');
  }
};
```

Usage in the NotificationSettings component:

```javascript
const handleTestNotification = async () => {
  try {
    setTestingNotification(true);
    setTestSuccess(false);
    setTestError(null);
    
    // Validate email if email notifications are enabled
    if (preferences.email_notifications && !preferences.email_address) {
      setTestError('Please provide an email address for email notifications.');
      setTestingNotification(false);
      return;
    }
    
    // Call the API to trigger a test notification
    const response = await sendTestNotification({
      email: preferences.email_notifications ? preferences.email_address : null,
      in_app: preferences.in_app_notifications
    });
    
    if (response && response.success) {
      setTestSuccess(true);
      // Refresh the notifications list
      fetchRecentNotifications();
      // Hide success message after 3 seconds
      setTimeout(() => setTestSuccess(false), 3000);
    } else {
      setTestError(response.error || 'Failed to send test notification.');
    }
  } catch (err) {
    console.error('Error sending test notification:', err);
    setTestError('Failed to send test notification. Please try again later.');
  } finally {
    setTestingNotification(false);
  }
};
```

### 2. Navbar Notification Icon

The `Navbar.js` component has been updated to include a notification icon with an unread count badge:

```jsx
<NotificationIcon to="/notifications">
  <i className="fas fa-bell"></i>
  {unreadCount > 0 && <NotificationBadge>{unreadCount > 9 ? '9+' : unreadCount}</NotificationBadge>}
</NotificationIcon>
```

### 2. Notifications Page

The `Notifications.js` component displays all notifications with options to mark as read and delete:

```jsx
<NotificationCard 
  key={notification.id} 
  read={notification.read}
  type={notification.type}
>
  <NotificationHeader>
    <NotificationTitle read={notification.read}>
      {notification.title}
    </NotificationTitle>
    <NotificationDate>
      {formatDate(notification.created_at)}
    </NotificationDate>
  </NotificationHeader>
  
  <NotificationMessage>
    {notification.message}
  </NotificationMessage>
  
  <NotificationActions>
    {!notification.read && (
      <ActionButton onClick={() => handleMarkAsRead(notification.id)}>
        Mark as Read
      </ActionButton>
    )}
    <DeleteButton onClick={() => handleDelete(notification.id)}>
      Delete
    </DeleteButton>
    {notification.bill_id && (
      <ViewBillButton to={`/bill/${notification.bill_id}`}>
        View Bill
      </ViewBillButton>
    )}
  </NotificationActions>
</NotificationCard>
```

### 3. Notification Settings Page

The `NotificationSettings.js` component allows users to customize their notification preferences:

```jsx
<form onSubmit={handleSubmit}>
  <Card>
    <FormGroup>
      <Label>Notification Types</Label>
      <CheckboxContainer>
        <Checkbox 
          type="checkbox" 
          id="in_app_notifications" 
          name="in_app_notifications"
          checked={preferences.in_app_notifications}
          onChange={handleChange}
        />
        <CheckboxLabel htmlFor="in_app_notifications">In-app Notifications</CheckboxLabel>
      </CheckboxContainer>
      
      <CheckboxContainer>
        <Checkbox 
          type="checkbox" 
          id="email_notifications" 
          name="email_notifications"
          checked={preferences.email_notifications}
          onChange={handleChange}
        />
        <CheckboxLabel htmlFor="email_notifications">Email Notifications</CheckboxLabel>
      </CheckboxContainer>
    </FormGroup>
    
    {/* Additional settings... */}
  </Card>
  
  <Button type="submit" disabled={saving}>
    {saving ? 'Saving...' : 'Save Settings'}
  </Button>
</form>
```

## API Integration

The frontend components use the following API utility functions from `api.js`:

```javascript
// Get all notifications
export const getNotifications = async () => {
  try {
    const response = await axios.get(`${API_URL}/notifications`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

// Mark notification as read
export const markNotificationAsRead = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/notifications/${id}/mark-read`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

// Delete notification
export const deleteNotification = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/notifications/${id}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

// Get notification preferences
export const getNotificationPreferences = async () => {
  try {
    const response = await axios.get(`${API_URL}/notifications/preferences`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (preferencesData) => {
  try {
    const response = await axios.post(`${API_URL}/notifications/preferences`, preferencesData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};
```

## Testing the Notification System

1. Run the SQL script in Supabase to create the necessary tables and policies
2. Ensure the modular server architecture is set up with all required components:
   - `routes/notificationRoutes.js`: API endpoints for notifications
   - `services/notificationService.js`: Business logic for notifications
   - `config/init.js`: Server initialization module with notification system setup
3. Set up environment variables for email notifications in .env (see the Production Email Configuration section below for more options):
   ```
   EMAIL_PROVIDER=smtp
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-password
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Bill Reminder App
   TEST_USER_ID=00000000-0000-0000-0000-000000000000
   ```
4. Start the server and navigate to the notification settings page to configure preferences
5. Create a test bill with a due date to trigger notifications
4. Verify that the notification appears in the frontend
5. Test marking notifications as read and deleting them

## Testing Notifications

To verify that the notification system is working correctly:

1. Navigate to the Notification Settings page
2. Configure your notification preferences (email, in-app, timing)
3. Click the "Send Test Notification" button
4. Check for the success message
5. Verify that the test notification appears in the Recent Notifications section
6. If email notifications are enabled, check your email inbox

The test notification feature is particularly useful for:
- Verifying that your email address is correctly configured
- Ensuring that in-app notifications are working
- Testing the notification system without waiting for scheduled notifications
- Troubleshooting notification issues

## Troubleshooting

- **Notifications Not Appearing**:
  - Check Supabase logs for RLS policy errors
  - Verify the user ID is being correctly passed to queries
  - Ensure the scheduled job is running with `console.log('Running bill notification check...')`

- **Email Notifications Not Sending**:
  - Verify email provider settings in .env file
  - Check server logs for email sending errors (look for "Error sending email:")
  - Ensure user has a valid email address in preferences
  - Test with the "Send Test Notification" button to see detailed error messages

- **Unread Count Not Updating**:
  - Check that the mark-as-read endpoint is working correctly (should be `/notifications/:id/mark-read`)
  - Verify the Navbar component is refreshing the count
  - Look for console errors in the browser
  - Ensure the notification read status is being handled correctly (as a string comparison, not a boolean)

- **Notification Preferences Not Saving**:
  - Check for validation errors in the form
  - Verify the API endpoint is receiving the correct data
  - Ensure RLS policies allow updates to preferences

## Security Considerations

- The notification system uses Row Level Security (RLS) to ensure users can only access their own data
- Email addresses should be validated before sending notifications
- Sensitive information should not be included in notification content
- Rate limiting should be implemented to prevent notification spam
- All user inputs should be sanitized to prevent SQL injection and XSS attacks
- The server initialization process includes checks to ensure all components are properly configured before starting

## Production Email Configuration

The Bill Reminder App supports multiple email providers for production use. This allows you to choose the provider that best fits your needs in terms of deliverability, cost, and features.

### Supported Email Providers

1. **SMTP** - Standard email protocol that works with most email services
2. **SendGrid** - Popular email service with high deliverability
3. **Mailgun** - Developer-focused email service with good analytics
4. **Amazon SES** - AWS email service with excellent scalability and pricing

### Configuration Options

To configure email for production, update your `.env` file with the appropriate settings for your chosen provider:

#### 1. SMTP Configuration (Gmail, Outlook, etc.)

```
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_username
EMAIL_PASS=your_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

#### 2. SendGrid Configuration

```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

#### 3. Mailgun Configuration

```
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

#### 4. Amazon SES Configuration

```
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Bill Reminder App
```

### Additional Email Settings

```
# Enable email open tracking (adds a tracking pixel to emails)
EMAIL_TRACKING_ENABLED=true

# Base URL for the application (used for links in emails)
APP_URL=https://yourdomain.com
```

### Required Dependencies

Depending on your chosen provider, you may need to install additional packages:

```bash
# For Mailgun
npm install nodemailer-mailgun-transport

# For Amazon SES
npm install @aws-sdk/client-ses @aws-sdk/credential-provider-node
```

### Testing Your Configuration

After setting up your email provider, use the "Send Test Notification" button in the Notification Settings page to verify that emails are being sent correctly. The server logs will show detailed information about the email sending process.

## Server Initialization

The notification system is now initialized as part of the server startup process through the `config/init.js` module. This module:

1. Checks database connectivity
2. Initializes the email transport based on configuration
3. Verifies that upload directories exist
4. Runs an initial notification check
5. Schedules the daily notification check

This initialization process ensures that all components of the notification system are properly configured before the server starts accepting requests. If any part of the initialization fails, detailed error messages are logged to help with troubleshooting.

The initialization module can be extended to include additional checks and setup tasks as needed.

## Next Steps

1. **User Authentication Integration**:
   - Update all endpoints to use the authenticated user's ID from Supabase Auth
   - Remove the TEST_USER_ID environment variable once authentication is implemented

2. **Enhanced Notification Features**:
   - Add notification categories for better organization
   - Implement notification grouping for multiple bills
   - Add notification snoozing functionality

3. **Email Enhancements**:
   - Create HTML email templates with branding
   - Add bill details and payment links in emails
   - Configure email tracking (already implemented, set EMAIL_TRACKING_ENABLED=true)
   - Add support for more email providers

4. **Mobile Integration**:
   - Add push notifications for mobile devices
   - Implement deep linking to specific bills from notifications

5. **Analytics and Reporting**:
   - Track notification effectiveness (e.g., how many bills were paid after notification)
   - Create a notification analytics dashboard
   - Implement A/B testing for notification messages

6. **Advanced Scheduling**:
   - Allow users to set custom notification times
   - Implement time-zone aware notifications
   - Add smart notification timing based on user behavior

7. **Security Enhancements**:
   - Implement rate limiting for notification endpoints
   - Add encryption for sensitive notification data
   - Create comprehensive audit logs for notification activities

8. **Image Recognition Integration**:
   - Connect notification system with bill image recognition feature
   - Send notifications when new bills are extracted from images
   - Allow users to review and confirm extracted bill information
