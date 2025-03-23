require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const schedule = require('node-schedule');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5002;

// Import database configuration
const supabase = require('./config/database');

// Import notification service
const notificationService = require('./services/notificationService');

// Import authentication middleware
const { isAuthenticated } = require('./middleware/authMiddleware');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Uncomment this temporarily
app.use((req, res, next) => {
  // Only log for auth-related routes or when explicitly debugging
  const isAuthRoute = req.path.startsWith('/api/auth');
  const isDebugMode = req.query.debug === 'true';
  
  // Skip logging for most routes to prevent console spam
  if (!isAuthRoute && !isDebugMode) {
    return next();
  }
  
  // For auth routes or debug mode, log session info
  if (req.path !== '/api/auth/check') { // Skip the frequent check endpoint
    console.log('Session middleware - Session ID:', req.sessionID);
    console.log('Session data:', req.session);
  }
  next();
});

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
} else {
  // In development, serve the static files from the React dev server
  app.use(express.static(path.join(__dirname, 'client/public')));
}

// API Routes

// Import route modules
const billRoutes = require('./routes/billRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const authRoutes = require('./routes/authRoutes');

// Use route modules
app.use('/api/bills', isAuthenticated, billRoutes);
app.use('/api/notifications', isAuthenticated, notificationRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/auth', authRoutes);

// Test route has been moved to routes/utilityRoutes.js as /api/utilities/health

// Bill routes are now handled by the billRoutes module
// The following routes have been moved to routes/billRoutes.js:
// - POST /api/bills (Create bill)
// - GET /api/bills (Get all bills)
// - GET /api/bills/:id (Get bill by ID)
// - PUT /api/bills/:id (Update bill)
// - DELETE /api/bills/:id (Delete bill)
// - POST /api/bills/extract-bill (Extract bill from image)

// Redirect old /api/extract-bill endpoint to the new /api/bills/extract-bill endpoint for backward compatibility
app.post('/api/extract-bill', (req, res) => {
  console.log('Redirecting from old /api/extract-bill endpoint to /api/bills/extract-bill');
  billRoutes.handleLegacyExtractBillEndpoint(req, res);
});

// Schedule daily notification check at 8 AM
notificationService.scheduleNotifications();
console.log('Scheduled daily notification check at 8 AM');

// Import the initialization module
const { initializeServer, initializeServerWithoutNotifications } = require('./config/init');

// Comment out the original initialization
// setTimeout(initializeServer, 3000); // Wait 3 seconds after server start

// Add a simple message instead
setTimeout(() => {
  console.log('\n==================================================');
  console.log('Server initialization:');
  console.log('- Notification check skipped for testing');
  console.log('==================================================\n');
  console.log('Server is ready');
}, 3000);

// Endpoint to manually trigger bill notification check
// Endpoint to trigger notifications moved to routes/notificationRoutes.js

// Endpoint to manually trigger bill notification check for a specific user moved to routes/notificationRoutes.js

// Test email notification, test email previews, and test notification endpoints moved to routes/notificationRoutes.js

// Diagnostic endpoint to check Supabase notification tables and policies
// Endpoint to check notification tables and policies moved to routes/notificationRoutes.js

// Endpoints for notification preferences, init-notification-preferences, and test-notification moved to routes/notificationRoutes.js

// Development endpoint to create notification tables moved to routes/notificationRoutes.js

// Serve static files from the uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Catch-all handler for client-side routing - MUST BE AFTER ALL API ROUTES
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    // In development, redirect to the React dev server
    res.redirect('http://localhost:3002');
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`Bill Reminder App Server`);
  console.log('='.repeat(50));
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log(`CORS enabled, accepting requests from all origins`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('-'.repeat(50));
  console.log('Configuration Status:');
  console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Supabase: ${(process.env.SUPABASE_URL && process.env.SUPABASE_KEY) ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Email Provider: ${process.env.EMAIL_PROVIDER ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Google OAuth: ${(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Session Secret: ${process.env.SESSION_SECRET ? '✅ Configured' : '⚠️ Using default'}`);
  console.log(`- Test User ID: ${process.env.TEST_USER_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Test Email: ${process.env.TEST_EMAIL ? '✅ Configured' : '❌ Missing'}`);
  console.log('-'.repeat(50));
  console.log(`Notification system: Active (Scheduled daily at 8 AM)`);
  console.log(`Server initialization in progress...`);
  console.log('='.repeat(50));
});
