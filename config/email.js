const nodemailer = require('nodemailer');

// Handle optional dependencies gracefully
let sgMail, mailgunTransport, SESClient, SendEmailCommand, defaultProvider;

try {
  sgMail = require('@sendgrid/mail');
} catch (err) {
  console.log('SendGrid mail dependency not available');
}

try {
  mailgunTransport = require('nodemailer-mailgun-transport');
} catch (err) {
  console.log('Mailgun transport dependency not available');
}

try {
  const awsSdk = require('@aws-sdk/client-ses');
  SESClient = awsSdk.SESClient;
  SendEmailCommand = awsSdk.SendEmailCommand;
  defaultProvider = require('@aws-sdk/credential-provider-node').defaultProvider;
} catch (err) {
  console.log('AWS SDK dependencies not available');
}

// Initialize email transporter based on configuration
let transporter = null;

const initializeEmailTransport = () => {
  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
  
  try {
    switch (emailProvider.toLowerCase()) {
      case 'smtp':
        if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10),
            secure: process.env.EMAIL_PORT === '465',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
          console.log('SMTP email transport initialized');
        } else {
          console.warn('Missing SMTP configuration, email notifications will use Ethereal Email');
        }
        break;
        
      case 'sendgrid':
        if (sgMail && process.env.SENDGRID_API_KEY) {
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          transporter = {
            sendMail: async (mailOptions) => {
              const msg = {
                to: mailOptions.to,
                from: mailOptions.from,
                subject: mailOptions.subject,
                text: mailOptions.text,
                html: mailOptions.html,
                headers: mailOptions.headers
              };
              
              const response = await sgMail.send(msg);
              return {
                messageId: response[0].headers['x-message-id'],
                response: response[0].body
              };
            }
          };
          console.log('SendGrid email transport initialized');
        } else {
          console.warn('SendGrid not available or missing API key, email notifications will use Ethereal Email');
        }
        break;
        
      case 'mailgun':
        if (mailgunTransport && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
          const mailgunAuth = {
            auth: {
              api_key: process.env.MAILGUN_API_KEY,
              domain: process.env.MAILGUN_DOMAIN
            }
          };
          
          transporter = nodemailer.createTransport(mailgunTransport(mailgunAuth));
          console.log('Mailgun email transport initialized');
        } else {
          console.warn('Mailgun not available or missing configuration, email notifications will use Ethereal Email');
        }
        break;
        
      case 'ses':
        if (SESClient && SendEmailCommand && defaultProvider && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
          const sesClient = new SESClient({
            region: process.env.AWS_REGION,
            credentials: defaultProvider()
          });
          
          transporter = {
            sendMail: async (mailOptions) => {
              const params = {
                Source: mailOptions.from,
                Destination: {
                  ToAddresses: [mailOptions.to]
                },
                Message: {
                  Subject: {
                    Data: mailOptions.subject
                  },
                  Body: {
                    Html: {
                      Data: mailOptions.html
                    },
                    Text: {
                      Data: mailOptions.text
                    }
                  }
                },
                ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET
              };
              
              const command = new SendEmailCommand(params);
              const response = await sesClient.send(command);
              
              return {
                messageId: response.MessageId,
                response: JSON.stringify(response)
              };
            }
          };
          console.log('Amazon SES email transport initialized');
        } else {
          console.warn('AWS SES not available or missing configuration, email notifications will use Ethereal Email');
        }
        break;
        
      default:
        console.warn(`Unknown email provider: ${emailProvider}, email notifications will use Ethereal Email`);
        break;
    }
  } catch (error) {
    console.error('Error initializing email transport:', error);
  }
  
  return transporter;
};

// Create a test email account using Ethereal
const createTestEmailAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    return { testAccount, testTransporter };
  } catch (error) {
    console.error('Error creating test email account:', error);
    return null;
  }
};

module.exports = {
  initializeEmailTransport,
  createTestEmailAccount,
  getTransporter: () => transporter,
  getProvider: () => process.env.EMAIL_PROVIDER || 'smtp',
  getFromAddress: () => process.env.EMAIL_FROM || 'noreply@billreminder.app'
};
