// config/init.js
//
// This file contains initialization functions for the server.
// It centralizes all startup tasks to ensure proper initialization
// of all services before the server starts handling requests.

const supabase = require('./database');
const notificationService = require('../services/notificationService');
const { initializeEmailTransport } = require('./email');
const fs = require('fs');
const path = require('path');

/**
 * Initialize the email transport based on configuration
 */
const initializeEmail = () => {
  try {
    console.log('Initializing email transport...');
    const emailTransport = initializeEmailTransport();
    if (emailTransport) {
      console.log('Email transport initialized successfully');
      return true;
    } else {
      console.warn('Email transport initialization returned null or undefined');
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize email transport:', error);
    return false;
  }
};

/**
 * Check database connection and tables
 */
const checkDatabase = async () => {
  try {
    console.log('Checking database connection...');
    
    // Test the connection by making a simple query
    const { data, error } = await supabase.from('bills').select('count').limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return false;
    }
    
    console.log('Database connection successful');
    
    // Check if notification tables exist
    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
      
    if (notificationError && notificationError.code === '42P01') {
      console.warn('Notifications table does not exist. You may need to run the table creation endpoint.');
    } else if (!notificationError) {
      console.log('Notifications table exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking database:', error);
    return false;
  }
};

/**
 * Ensure upload directory exists
 */
const ensureUploadDirectory = () => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadDir);
      console.log('Uploads directory created successfully');
    } else {
      console.log('Uploads directory already exists');
    }
    return true;
  } catch (error) {
    console.error('Error ensuring upload directory exists:', error);
    return false;
  }
};

/**
 * Run initial notification check
 */
const runInitialNotificationCheck = async () => {
  try {
    console.log('Running initial bill notification check...');
    await notificationService.checkBillsAndNotify();
    console.log('Initial bill notification check completed');
    return true;
  } catch (error) {
    console.error('Error in initial notification check:', error);
    return false;
  }
};

/**
 * Main initialization function that runs all initialization tasks
 */
const initializeServer = async () => {
  console.log('='.repeat(50));
  console.log('Starting server initialization...');
  console.log('='.repeat(50));
  
  const results = {
    email: initializeEmail(),
    uploadDirectory: ensureUploadDirectory(),
    database: await checkDatabase(),
    notifications: await runInitialNotificationCheck()
  };
  
  // Check if notification check is enabled
  const shouldRunNotificationCheck = process.env.RUN_NOTIFICATION_CHECK !== 'false';
  
  if (shouldRunNotificationCheck) {
    console.log('Running initial bill notification check...');
    await notificationService.checkBillNotifications();
  } else {
    console.log('Initial bill notification check disabled in configuration');
  }
  
  console.log('='.repeat(50));
  console.log('Initialization Results:');
  console.log(`- Email System: ${results.email ? '✅ Success' : '❌ Failed'}`);
  console.log(`- Upload Directory: ${results.uploadDirectory ? '✅ Success' : '❌ Failed'}`);
  console.log(`- Database Connection: ${results.database ? '✅ Success' : '❌ Failed'}`);
  console.log(`- Notification Check: ${results.notifications ? '✅ Success' : '❌ Failed'}`);
  console.log('='.repeat(50));
  
  const allSuccessful = Object.values(results).every(result => result === true);
  if (allSuccessful) {
    console.log('Server initialization completed successfully');
  } else {
    console.warn('Server initialization completed with warnings or errors');
  }
  
  return results;
};

const initializeServerWithoutNotifications = async () => {
  try {
    console.log('Initializing server without notification check...');
    
    // Database check
    const dbResult = await checkDatabase();
    
    // Email system check
    const emailResult = await checkEmailSystem();
    
    // Check upload directory
    const uploadResult = await checkUploadsDirectory();
    
    // Skip notification check
    console.log('Skipping notification check during initialization');
    const notificationResult = true;
    
    // Log the results
    console.log('\n==================================================');
    console.log('Initialization Results:');
    console.log(`- Email System: ${emailResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Upload Directory: ${uploadResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Database Connection: ${dbResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Notification Check: ⏭️ Skipped`);
    console.log('==================================================\n');
    
    if (dbResult && emailResult && uploadResult) {
      console.log('Server initialization completed successfully');
      return true;
    } else {
      console.error('Server initialization completed with warnings');
      return false;
    }
  } catch (error) {
    console.error('Error during server initialization:', error);
    return false;
  }
};

module.exports = {
  initializeServer,
  initializeServerWithoutNotifications,
  initializeEmail,
  checkDatabase,
  ensureUploadDirectory,
  runInitialNotificationCheck
};
