# Bill Reminder App - Client Documentation

## Overview

This is the client-side application for the Bill Reminder App, built with React. The application allows users to track and manage their bills with automated notifications, extract bill information from images, and customize notification preferences.

## Architecture

The client application follows a component-based architecture with the following structure:

```
src/
├── components/ # Reusable UI components
├── pages/ # Page components
│ ├── Home.js # Dashboard/home page
│ ├── BillDetails.js # Bill details page
│ ├── EditBill.js # Edit bill page
│ ├── AddBill.js # Add new bill page
│ ├── Notifications.js # Notifications page
│ └── Settings.js # User settings page
├── contexts/ # React contexts
│ ├── AuthContext.js # Authentication context
│ └── ThemeContext.js # Theme context
├── utils/ # Utility functions
│ ├── api.js # API communication with caching
│ ├── supabase.js # Supabase client configuration
│ ├── dateUtils.js # Date formatting utilities
│ └── formatUtils.js # Text/number formatting utilities
├── styles/ # Styled components and CSS
├── App.js # Main application component
└── index.js # Application entry point
```

## Key Components

### 1. Home Component

The Home component serves as the dashboard, displaying upcoming bills and summary information. It fetches bills from the server and displays them in a list format. The component implements:
- Optimized data fetching with caching
- Lazy loading of bill data
- Optimistic UI updates for paid status changes

### 2. BillDetails Component

The BillDetails component provides a detailed view of a specific bill with all associated information. It includes:
- Efficient image loading with fallbacks
- Time-based cache invalidation
- Comprehensive error handling

### 3. EditBill Component

The EditBill component allows users to edit existing bills. It includes:
- Form validation
- Cached data loading
- Optimized image display
- Proper cache invalidation on updates

### 4. AddBill Component

The AddBill component allows users to add new bills manually or by uploading an image for automatic extraction. It includes form validation and image upload functionality.

### 5. Notifications Component

The Notifications component displays in-app notifications about upcoming and overdue bills. Users can mark notifications as read or delete them. The component handles the following:

- Fetching notifications from the server with debounced calls
- Caching notification data
- Formatting notification timestamps
- Handling read/unread status
- Marking notifications as read
- Deleting notifications

### 6. Settings Component

The Settings component allows users to customize notification preferences, including email notifications, notification timing, and other settings.

## API Communication & Performance Optimizations

The client communicates with the server through the API utility functions in `src/utils/api.js`. These functions implement several optimizations:

### Token Caching
- Cached authentication tokens with a 5-minute validity
- Reduces repeated token verifications
- Improves API response times

### Data Caching
- Time-based caching for bills and notifications (30-second validity)
- Separate caches for all bills and individual bill details
- Map-based storage for individual bill caching
- Cache invalidation on data updates

### Debounced API Calls
- Reduced API call frequency for notifications
- Limits calls to once per 3 seconds
- Prevents excessive server load

### Error Handling
- Comprehensive error handling for all API calls
- Detailed error logging
- Graceful fallbacks to cached data when possible

## Recent Updates

### Performance Improvements

1. **Token Caching**: Added caching for authentication tokens to reduce unnecessary token verification calls.

2. **Data Caching**: Implemented caching for bills and notifications with proper cache invalidation strategies.

3. **Optimized API Calls**: Reduced the number of API calls by implementing:
   - Time-based cache refreshing
   - Debounced notification fetching
   - Dependency-optimized useEffect and useCallback implementations

4. **Image Loading Optimizations**: Enhanced image loading with fallback URLs and better error handling.

## Running the Client

### Development Mode

```bash
npm start
```

This runs the app in development mode on [http://localhost:3002](http://localhost:3002).

### Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder, optimized for performance.

## Environment Configuration

The client requires the following environment variables in a `.env` file:

```
REACT_APP_API_URL=http://localhost:5002/api
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Verify the server is running
   - Check that `REACT_APP_API_URL` is set correctly
   - Ensure CORS is enabled on the server

2. **Image Upload Issues**:
   - Check file size limits
   - Verify the uploads directory exists on the server
   - Ensure proper permissions are set

3. **Notification Display Problems**:
   - Check browser console for errors
   - Verify the notification API endpoints are correct
   - Ensure the correct handling of the `read` attribute

4. **Authentication Issues**:
   - Verify Supabase credentials
   - Check browser console for auth-related errors
   - Clear local storage/cookies and try again
