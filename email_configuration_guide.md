# Bill Reminder App - Production Email Configuration Guide

This guide explains how to set up production email for the Bill Reminder App, allowing you to send real email notifications to users.

## Overview

The Bill Reminder App supports multiple email providers through the Nodemailer library:

1. **SMTP** - Standard email protocol that works with most email services
2. **SendGrid** - Popular email service with high deliverability
3. **Mailgun** - Developer-focused email service with good analytics
4. **Amazon SES** - AWS email service with excellent scalability and pricing

## Configuration Steps

### Step 1: Choose Your Email Provider

Decide which email provider you want to use based on your needs:
- **SMTP**: Good for low volume, works with Gmail, Outlook, etc.
- **SendGrid**: Excellent for high volume, good deliverability
- **Mailgun**: Developer-friendly with good API
- **Amazon SES**: Very cost-effective for high volume

### Step 2: Set Up Environment Variables

Copy the `.env.sample` file to `.env` in your project root and configure the relevant variables:

```bash
cp .env.sample .env
```

Then edit the `.env` file with your chosen provider's details.

### Step 3: Install Required Dependencies

Depending on your chosen provider, you may need to install additional packages:

```bash
# For Mailgun
npm install nodemailer-mailgun-transport

# For Amazon SES
npm install @aws-sdk/client-ses @aws-sdk/credential-provider-node
```

## Provider-Specific Configuration

### SMTP Configuration

```
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_username
EMAIL_PASS=your_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

#### Gmail SMTP Example

```
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_app_password
```

Note: For Gmail, you need to use an "App Password" instead of your regular password. See [Google's documentation](https://support.google.com/accounts/answer/185833) for details.

### SendGrid Configuration

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com/)
2. Create an API key with "Mail Send" permissions
3. Configure your environment variables:

```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

### Mailgun Configuration

1. Create a Mailgun account at [mailgun.com](https://www.mailgun.com/)
2. Verify your domain or use the sandbox domain for testing
3. Configure your environment variables:

```
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

### Amazon SES Configuration

1. Create an AWS account if you don't have one
2. Set up Amazon SES in the AWS Console
3. Verify your domain and email addresses
4. Create an IAM user with SES permissions
5. Configure your environment variables:

```
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

## Testing Your Configuration

After setting up your email provider, you can test it using the "Send Test Notification" feature in the app:

1. Go to the Notification Settings page
2. Configure your notification preferences with your email address
3. Click the "Send Test Notification" button
4. Check your email inbox for the test notification

## Troubleshooting

### Common Issues

1. **Emails not being sent**:
   - Check your email provider credentials
   - Verify that your domain is properly configured
   - Look for error messages in the server logs

2. **Emails going to spam**:
   - Set up SPF, DKIM, and DMARC records for your domain
   - Use a consistent "from" address
   - Avoid spam trigger words in your email content

3. **Rate limiting**:
   - Most providers have sending limits
   - Implement a queue system for high-volume sending

### Checking Email Logs

The server logs detailed information about email sending. Look for lines containing:
- "Email transport configured"
- "Email sent:"
- "Error sending email:"

## Production Considerations

### Email Deliverability

To ensure your emails reach users' inboxes:

1. **Set up authentication**:
   - Configure SPF, DKIM, and DMARC records
   - Use a consistent sending domain

2. **Follow best practices**:
   - Include unsubscribe links (required by law)
   - Use a real reply-to address
   - Keep HTML emails simple and include text versions

### Scaling Email Sending

For high-volume applications:

1. **Use a queue system** to handle email sending asynchronously
2. **Monitor your sending reputation** with your provider's tools
3. **Implement retry logic** for failed email attempts

## Security Considerations

1. **Never commit email credentials** to your repository
2. **Use environment variables** for all sensitive information
3. **Implement rate limiting** to prevent abuse
4. **Validate email addresses** before sending

## Additional Features

The Bill Reminder App includes these email features:

1. **HTML and Plain Text** versions of all emails
2. **Unsubscribe Links** for CAN-SPAM compliance
3. **Email Open Tracking** (optional)
4. **Custom Headers** for better deliverability

To enable email open tracking, set `EMAIL_TRACKING_ENABLED=true` in your `.env` file.
