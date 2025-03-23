/**
 * Bill Reminder App - Notification System Test Script
 * 
 * This script tests the notification system by:
 * 1. Updating notification preferences for the test user
 * 2. Triggering notifications for the test user
 * 3. Retrieving and displaying test email previews
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE_URL = 'http://localhost:5002/api';
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_EMAIL = 'test@example.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Helper function to print colored messages
const print = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
  json: (data) => console.log(JSON.stringify(data, null, 2))
};

// Test notification preferences update
async function testUpdateNotificationPreferences() {
  print.title('Testing Notification Preferences Update');
  
  try {
    print.info(`Updating notification preferences for test user ${TEST_USER_ID}...`);
    
    const response = await axios.post(`${API_BASE_URL}/notification-preferences/${TEST_USER_ID}`, {
      in_app_notifications: true,
      email_notifications: true,
      email_address: TEST_EMAIL,
      notification_days_before: 3
    });
    
    print.success('Notification preferences updated successfully:');
    print.json(response.data);
    
    return response.data;
  } catch (error) {
    print.error('Error updating notification preferences:');
    if (error.response) {
      print.json(error.response.data);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Test triggering notifications for a specific user
async function testTriggerNotifications() {
  print.title('Testing Notification Trigger for Test User');
  
  try {
    print.info(`Triggering notifications for test user ${TEST_USER_ID}...`);
    
    const response = await axios.get(`${API_BASE_URL}/trigger-notifications/${TEST_USER_ID}`);
    
    print.success('Notifications triggered successfully:');
    print.json(response.data);
    
    return response.data;
  } catch (error) {
    print.error('Error triggering notifications:');
    if (error.response) {
      print.json(error.response.data);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Test retrieving email previews
async function testGetEmailPreviews() {
  print.title('Testing Email Preview Retrieval');
  
  try {
    print.info('Retrieving email previews...');
    
    const response = await axios.get(`${API_BASE_URL}/test-email-previews`);
    
    if (response.data.previews && response.data.previews.length > 0) {
      print.success(`Found ${response.data.previews.length} email previews:`);
      
      response.data.previews.forEach((preview, index) => {
        console.log(`\n${colors.magenta}Email #${index + 1}:${colors.reset}`);
        console.log(`Subject: ${preview.subject}`);
        console.log(`To: ${preview.to}`);
        console.log(`Sent At: ${preview.sentAt}`);
        console.log(`Preview URL: ${colors.cyan}${preview.previewUrl}${colors.reset}`);
        console.log(`Message ID: ${preview.id}`);
      });
    } else {
      print.warning('No email previews found. Try sending some notifications first.');
    }
    
    return response.data;
  } catch (error) {
    print.error('Error retrieving email previews:');
    if (error.response) {
      print.json(error.response.data);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Test sending a test email
async function testSendTestEmail() {
  print.title('Testing Direct Email Sending');
  
  try {
    print.info(`Sending test email to ${TEST_EMAIL}...`);
    
    const response = await axios.post(`${API_BASE_URL}/test-email-notification`, {
      email: TEST_EMAIL,
      subject: 'Test Email from Bill Reminder App',
      message: `
        <h2>Test Email</h2>
        <p>This is a test email from the Bill Reminder App notification system.</p>
        <p>If you're seeing this, the email notification system is working correctly!</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `
    });
    
    print.success('Test email sent successfully:');
    print.json(response.data);
    
    return response.data;
  } catch (error) {
    print.error('Error sending test email:');
    if (error.response) {
      print.json(error.response.data);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  print.title('BILL REMINDER APP - NOTIFICATION SYSTEM TEST');
  print.info(`Using test user ID: ${TEST_USER_ID}`);
  print.info(`Using test email: ${TEST_EMAIL}`);
  
  try {
    // Step 1: Update notification preferences
    await testUpdateNotificationPreferences();
    
    // Step 2: Send a test email
    await testSendTestEmail();
    
    // Step 3: Trigger notifications
    await testTriggerNotifications();
    
    // Step 4: Get email previews
    await testGetEmailPreviews();
    
    print.title('ALL TESTS COMPLETED SUCCESSFULLY');
  } catch (error) {
    print.title('TEST SUITE FAILED');
    process.exit(1);
  }
}

// Run the tests
runAllTests();
