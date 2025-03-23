# Bill Reminder App - Server Documentation

This document provides an overview of the server-side architecture and components for the Bill Reminder App.

## Architecture Overview

The server is built using Node.js and Express, with Supabase as the database. The application follows a modular architecture with the following components:

1. **API Routes**: Endpoints for client-server communication
2. **Services**: Business logic and data processing
3. **Utilities**: Helper functions and shared code
4. **Middleware**: Request processing and authentication
5. **Scheduled Jobs**: Background tasks for notifications

## Directory Structure

```
project/
├── config/ # Configuration files
│ ├── email.js # Email provider configuration
│ ├── database.js # Supabase configuration
│ └── init.js # Server initialization module
├── routes/ # API route definitions
│ ├── billRoutes.js # Bill management endpoints
│ ├── notificationRoutes.js # Notification endpoints
│ ├── authRoutes.js # Authentication endpoints
│ └── utilityRoutes.js # Utility endpoints
├── services/ # Business logic
│ ├── billService.js # Bill management logic
│ ├── notificationService.js # Notification logic
│ └── imageService.js # Image processing logic
├── utils/ # Helper functions
│ ├── emailUtils.js # Email sending utilities
│ └── dateUtils.js # Date manipulation utilities
├── middleware/ # Express middleware
│ ├── uploadMiddleware.js # File upload middleware
│ ├── authMiddleware.js # Authentication middleware
│ └── errorHandler.js # Error handling middleware (planned)
├── uploads/ # Directory for uploaded bill images
└── server.js           # Main application entry point
```

## Key Components

### 0. Middleware

The application uses several middleware components:

- **uploadMiddleware**: Handles file uploads using multer, configuring storage location and filename generation
- **authMiddleware**: Validates Supabase authentication tokens with caching for improved performance
- **Express built-in middleware**: For parsing JSON, handling CORS, and serving static files

### 1. Server Initialization

The server uses a dedicated initialization module (`config/init.js`) that handles the startup process:

- **Email System Initialization**: Sets up the email transport based on configuration
- **Database Connection Check**: Verifies connectivity to Supabase
- **Upload Directory Verification**: Ensures the uploads directory exists
- **Notification System Initialization**: Runs an initial bill notification check

The initialization process provides detailed status reporting and ensures all components are properly configured before the server starts handling requests.

The server.js file has been refactored to be more modular, delegating specific functionality to the appropriate service and middleware modules.

### 2. Authentication System

The authentication system has been significantly improved:

- **Token Caching**: Implemented caching of authentication tokens to reduce verification calls
- **Supabase Integration**: Utilizes Supabase's built-in authentication services
- **Session Management**: Simplified session handling with better error reporting
- **User Synchronization**: Ensures user records exist in both auth and application databases

### 3. Email Configuration

The application supports multiple email providers:

- **SMTP**: Standard email protocol
- **SendGrid**: Popular email service
- **Mailgun**: Developer-focused email service
- **Amazon SES**: AWS email service

Email configuration is loaded from environment variables and used to initialize the appropriate transport.

### 4. Bill Management

Bills are stored in Supabase and include the following information:

- Vendor name
- Amount
- Due date
- Bill date
- Items/description
- Image path (if a bill image was uploaded)
- Supabase image path (for storage in Supabase buckets)
- Notes
- Category
- Recurring settings (frequency, end date)
- Payment status

### 5. Notification System

The notification system consists of:

- **In-app notifications**: Stored in the `notifications` table
- **Email notifications**: Sent via configured email provider
- **Notification preferences**: Stored in the `notification_preferences` table
- **Scheduled checks**: Daily checks for upcoming and overdue bills

### 6. Image Processing

The application uses OpenAI's GPT-4o API to extract bill information from images:

1. Images are uploaded via the uploadMiddleware (using multer)
2. The image is processed by the imageService which sends it to OpenAI for analysis
3. Extracted information is structured and returned to the client

The imageService handles all interactions with the OpenAI API, ensuring that image processing logic is centralized and maintainable.

## Performance Optimizations

The server includes several performance optimizations:

### 1. Token Caching

Authentication tokens are cached to reduce the number of verification calls:

```javascript
// Token cache for auth tokens with 5-minute validity
const tokenCache = {
  token: null,
  timestamp: 0
};

// Use cached token if available and not expired
if (tokenCache.token && now - tokenCache.timestamp < 300000) {
  console.log('Using cached auth token');
  return {
    verified: true,
    token: tokenCache.token,
    user: tokenCache.user
  };
}
```

This optimization significantly reduces the "Verifying token..." messages and improves API response times.

### 2. Database Query Optimization

- Using appropriate indexes for frequently queried columns
- Limiting returned columns to only those needed
- Using efficient JOIN operations when fetching related data

### 3. Proper Error Handling

Each route handler includes specific error handling that:

1. Logs errors to the console with detailed context
2. Returns appropriate HTTP status codes
3. Provides error details in the response

A centralized error handling middleware is planned for future implementation to further standardize error responses across the application.

## API Endpoints

### Authentication

- `GET /api/auth/session`: Get the current session information
- `POST /api/auth/signout`: Sign out the current user
- `GET /api/auth/google/url`: Get the Google OAuth URL
- `GET /api/auth/callback`: Handle the OAuth callback
- `GET /api/auth/user`: Get the current user information
- `POST /api/auth/sync-supabase-user`: Verify the Supabase session
- `POST /api/auth/create-user-record`: Create or update a user record

### Bill Management

- `GET /api/bills`: Get all bills
- `GET /api/bills/:id`: Get a specific bill
- `POST /api/bills`: Create a new bill
- `PUT /api/bills/:id`: Update a bill
- `DELETE /api/bills/:id`: Delete a bill
- `POST /api/bills/extract-bill`: Extract bill information from an image
- `POST /api/extract-bill`: Legacy endpoint that redirects to `/api/bills/extract-bill`

### Notification Management

- `GET /api/notifications`: Get all notifications
- `PUT /api/notifications/:id/mark-read`: Mark a notification as read
- `DELETE /api/notifications/:id`: Delete a notification
- `GET /api/notifications/preferences`: Get notification preferences
- `POST /api/notifications/preferences/:userId`: Update notification preferences
- `GET /api/notifications/init-preferences`: Initialize notification preferences
- `POST /api/notifications/test-email`: Send a test email notification
- `POST /api/notifications/test-configured-email`: Test email with configured provider
- `POST /api/notifications/trigger-check`: Manually trigger notification check for all users
- `GET /api/notifications/trigger/:userId`: Trigger notifications for a specific user
- `GET /api/notifications/check-tables`: Check notification tables and policies
- `GET /api/notifications/dev/create-tables`: Create notification tables (development only)

### Utility Endpoints

- `GET /api/utilities/health`: Health check endpoint
- `GET /api/utilities/check-notification-tables`: Check notification tables and policies

## Scheduled Jobs

The server schedules the following jobs:

- **Daily Notification Check**: Runs at 8 AM every day to check for upcoming and overdue bills (managed by notificationService.scheduleNotifications)
- **Initial Notification Check**: Runs automatically during server initialization

The scheduling logic is encapsulated within the notificationService, making it easier to modify or extend the notification schedule in the future.

## Environment Variables

The server requires the following environment variables:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase API key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations)
- `OPENAI_API_KEY`: OpenAI API key
- Email configuration variables (varies by provider)
- `TEST_USER_ID`: User ID for testing (development only)
- `SERVER_URL`: URL of the server (for OAuth callbacks)
- `CLIENT_URL`: URL of the client application (for redirects)

## Security Considerations

1. API keys are stored in environment variables
2. Row Level Security (RLS) is used in Supabase to restrict data access
3. Input validation is performed on all endpoints
4. Email credentials are securely managed
5. Token caching is implemented with appropriate expiration

## Development and Testing

The server includes several testing endpoints:

- `/api/notifications/test-email`: Test email delivery
- `/api/notifications/test-configured-email`: Test email with configured provider
- `/api/notifications/trigger-check`: Manually trigger notification check
- `/api/notifications/check-tables`: Verify notification tables and policies
- `/api/utilities/health`: Verify server is running correctly

These endpoints make it easy to test individual components of the system during development and troubleshoot issues in production.

## Recent Updates

### Performance Improvements

1. **Token Caching**: Added caching for authentication tokens to reduce unnecessary token verification calls.

2. **Optimized API Responses**: Improved API response formats for consistency across endpoints.

3. **Enhanced Error Handling**: More detailed error messages and consistent error response formats.

4. **Improved Database Operations**: Better handling of database queries with proper error handling and response formatting.

### Authentication Flow Improvements

1. **Simplified Authentication**: Removed complex fallback mechanisms in favor of Supabase's built-in OAuth.

2. **Session Synchronization**: Improved user record creation and synchronization between Supabase and application database.

### Next Steps

1. **Email Notification Reenabling**: The email notification system needs to be reactivated after debugging.

2. **Server-Side Rendering**: Consider implementing server-side rendering for improved performance.

3. **Comprehensive Logging**: Implement structured logging for better debugging and monitoring.

4. **Rate Limiting**: Add rate limiting to prevent API abuse.
