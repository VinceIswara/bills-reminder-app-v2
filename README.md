# Bill Reminder App

This is a Bill Reminder application that helps users track and manage their bills with automated notifications. The app can be accessed from both web and mobile app browsers.

## Repository

The source code for this project is available on GitHub:
[https://github.com/VinceIswara/bills-reminder-app-v2](https://github.com/VinceIswara/bills-reminder-app-v2)

## Features
- Extract bill information from images (uploaded files or mobile camera)
- Edit extracted bill information
- Add new bill reminders
- View upcoming bills
- Mark bills as paid
- Receive notifications for upcoming and overdue bills
- Customize notification preferences (email, in-app, timing)
- Test notification delivery with one click
- Optimized token verification with caching
- Efficient API call handling with client-side data caching

## Technology Stack
- **Frontend**: React with styled-components
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Image Recognition**: OpenAI GPT-4o API
- **Email Notifications**: Multiple providers supported (SMTP, SendGrid, Mailgun, Amazon SES)

## Getting Started
1. Clone the repository
2. Install dependencies for both client and server
3. Set up environment variables (API keys)
4. Run the application

The server includes a robust initialization process that automatically:
- Verifies database connectivity
- Initializes email transport
- Ensures upload directories exist
- Runs an initial notification check
- Reports detailed status of all components

## Performance Optimizations
The application includes several performance optimizations:
- Token caching to reduce authentication verifications
- Data caching for bills and notifications
- Debounced API calls for frequently accessed data
- Lazy loading of images and components
- Optimistic UI updates for a smoother user experience

## Environment Variables
The application requires the following environment variables:

### Required Variables
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase API key

### Email Configuration (Choose one provider)

#### SMTP Configuration
- `EMAIL_PROVIDER`: Set to `smtp`
- `EMAIL_HOST`: SMTP server hostname
- `EMAIL_PORT`: SMTP server port
- `EMAIL_SECURE`: Use TLS (true/false)
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password

#### SendGrid Configuration
- `EMAIL_PROVIDER`: Set to `sendgrid`
- `SENDGRID_API_KEY`: Your SendGrid API key

#### Mailgun Configuration
- `EMAIL_PROVIDER`: Set to `mailgun`
- `MAILGUN_API_KEY`: Your Mailgun API key
- `MAILGUN_DOMAIN`: Your Mailgun domain

#### Amazon SES Configuration
- `EMAIL_PROVIDER`: Set to `ses`
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)

### Common Email Settings
- `EMAIL_FROM`: Sender email address
- `EMAIL_FROM_NAME`: Sender name
- `EMAIL_TRACKING_ENABLED`: Enable email open tracking (true/false)

These should be stored in a `.env` file in the root directory (not committed to version control). A sample `.env.example` file is provided for reference.

## Documentation

Detailed documentation is available in the following files:
- `SUPABASE_SETUP.md`: Guide for setting up Supabase tables and policies
- `AUTH-README.md`: Documentation for authentication flow and setup
- `email_configuration_guide.md`: Detailed instructions for configuring email providers
- `server_documentation.md`: Comprehensive documentation of server architecture and components
- `client/README.md`: Documentation for the client application

## License
This project is licensed under the MIT License.
