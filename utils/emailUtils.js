const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { getTransporter, createTestEmailAccount } = require('../config/email');

// Global variable to store test email previews
if (!global.testEmailPreviews) {
  global.testEmailPreviews = [];
}

/**
 * Send an email notification
 * @param {string} emailAddress - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML)
 * @param {boolean} isTestUser - Whether this is a test user
 * @returns {Promise<object|null>} - Email info or null if failed
 */
const sendEmailNotification = async (emailAddress, subject, message, isTestUser = false) => {
  if (!emailAddress) {
    console.log('No email address provided');
    return null;
  }
  
  try {
    let emailTransporter = getTransporter();
    let testAccount = null;
    let isEtherealEmail = false;
    
    // For test user or if no transporter is configured, use Ethereal Email
    if (isTestUser || !emailTransporter) {
      console.log('Using Ethereal Email for test user or missing email configuration');
      const testEmailAccount = await createTestEmailAccount();
      
      if (!testEmailAccount) {
        throw new Error('Failed to create test email account');
      }
      
      testAccount = testEmailAccount.testAccount;
      emailTransporter = testEmailAccount.testTransporter;
      
      console.log('Created test email account:', testAccount.user);
      isEtherealEmail = true;
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
 * Get all test email previews
 * @returns {Array} - Array of test email previews
 */
const getTestEmailPreviews = () => {
  return global.testEmailPreviews || [];
};

/**
 * Send a test email
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML)
 * @returns {Promise<object>} - Test email info
 */
const sendTestEmail = async (email, subject, message) => {
  try {
    // Always create a new test account for email testing
    console.log('Creating Ethereal Email test account...');
    const { testAccount, testTransporter } = await createTestEmailAccount();
    
    if (!testAccount || !testTransporter) {
      throw new Error('Failed to create test email account');
    }
    
    console.log('Created test email account:', testAccount.user);
    
    const emailSubject = subject || 'Test Bill Reminder Notification';
    const emailMessage = message || '<h2>This is a test notification</h2><p>Your bill reminder notification system is working!</p>';
    
    // Send the test email
    const info = await testTransporter.sendMail({
      from: 'test@billreminder.app',
      to: email,
      subject: emailSubject,
      html: emailMessage
    });
    
    console.log('Test email sent:', info.messageId);
    
    // Generate the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Preview URL:', previewUrl);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl,
      etherealUser: testAccount.user,
      etherealPass: testAccount.pass
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

module.exports = {
  sendEmailNotification,
  getTestEmailPreviews,
  sendTestEmail
};
