// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');

// Client-side success and error redirect URLs
const CLIENT_URL = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:3002/';
const CLIENT_ERROR_URL = process.env.NODE_ENV === 'production' ? '/login' : 'http://localhost:3002/login';

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Initialize session
router.get('/session', async (req, res) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return res.status(500).json({ success: false, message: 'Error retrieving session' });
    }
    
    if (!session) {
      return res.status(401).json({ success: false, message: 'No active session' });
    }
    
    return res.json({ 
      success: true, 
      session,
      user: session.user
    });
  } catch (error) {
    console.error('Unexpected error in session endpoint:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Sign out route
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error.message);
      return res.status(500).json({ success: false, message: 'Error signing out' });
    }
    
    return res.json({ success: true, message: 'Successfully signed out' });
  } catch (error) {
    console.error('Unexpected error in signout endpoint:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// OAuth callback handler - just redirect to front-end which will handle the session
router.get('/callback', async (req, res) => {
  try {
    console.log('Auth callback received with query params:', req.query);
    console.log('Auth callback received with headers:', req.headers);
    console.log('Auth callback URL:', req.originalUrl);
    console.log('Full request URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
    
    // Extract the session from the OAuth callback
    const { code, error, error_description } = req.query;
    
    // Handle error from OAuth provider
    if (error) {
      console.error(`OAuth error: ${error}`, error_description);
      return res.redirect(`${CLIENT_ERROR_URL}?error=${error}&message=${encodeURIComponent(error_description || 'OAuth error')}`);
    }
    
    if (!code) {
      console.error('No code provided in callback');
      return res.redirect(`${CLIENT_ERROR_URL}?error=no_code`);
    }
    
    console.log('Exchanging code for session...');
    
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError.message);
      console.error('Error details:', exchangeError);
      return res.redirect(`${CLIENT_ERROR_URL}?error=auth_error&message=${encodeURIComponent(exchangeError.message)}`);
    }
    
    console.log('Successfully exchanged code for session');
    console.log('Session data:', {
      user: data?.session?.user?.email || 'No user email',
      expires_at: data?.session?.expires_at || 'No expiration',
      provider: data?.session?.provider || 'No provider',
    });
    
    // Redirect to the client app
    console.log('Redirecting to client URL:', CLIENT_URL);
    return res.redirect(CLIENT_URL);
  } catch (error) {
    console.error('Unexpected error in callback endpoint:', error);
    return res.redirect(`${CLIENT_ERROR_URL}?error=server_error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
});

// Additional route for /auth/callback to handle the new callback URL format
// This ensures compatibility with both callback URL formats
router.get('/auth/callback', (req, res) => {
  console.log('Received request at /auth/callback, redirecting to /callback');
  // Forward all query parameters to the main callback handler
  const queryString = Object.keys(req.query).length > 0 
    ? '?' + new URLSearchParams(req.query).toString() 
    : '';
  res.redirect(`/callback${queryString}`);
});

// Route to get auth URL - useful if you want to initiate auth from your server
router.get('/google/url', async (req, res) => {
  try {
    console.log('Generating Google OAuth URL...');
    console.log('Environment variables:', {
      SERVER_URL: process.env.SERVER_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set'
    });
    
    // Construct the full callback URL - ensure we don't duplicate 'api' in the path
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5002/api';
    // Remove trailing '/api' if it exists to prevent duplication
    const baseUrl = serverUrl.endsWith('/api') 
      ? serverUrl.substring(0, serverUrl.length - 4) 
      : serverUrl;
    
    const callbackUrl = `${baseUrl}/auth/callback`;
    console.log('Using callback URL:', callbackUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        scopes: 'email profile'
      }
    });

    if (error) {
      console.error('Error generating Google OAuth URL:', error.message);
      console.error('Error details:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    if (!data || !data.url) {
      console.error('No OAuth URL returned from Supabase');
      return res.status(500).json({ success: false, error: 'No OAuth URL returned' });
    }
    
    console.log('Successfully generated OAuth URL');
    
    // Log URL details without exposing sensitive information
    try {
      const urlObj = new URL(data.url);
      console.log('OAuth URL details:', {
        host: urlObj.host,
        pathname: urlObj.pathname,
        params: Array.from(urlObj.searchParams.keys())
      });
    } catch (e) {
      console.error('Error parsing OAuth URL:', e);
    }
    
    return res.json({ success: true, url: data.url });
  } catch (error) {
    console.error('Unexpected error generating auth URL:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add or update the sync endpoint
router.post('/sync-supabase-user', async (req, res) => {
  try {
    const { token, userId, email } = req.body;
    
    if (!token || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required token information' 
      });
    }
    
    // Verify the token
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Token verification failed:', error?.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    // Token is valid, set up session
    req.session.userId = userId;
    req.session.email = email;
    req.session.authenticated = true;
    
    // Also set req.user for compatibility with isAuthenticated middleware
    req.user = data.user;
    
    // Return success
    return res.json({
      success: true,
      message: 'Session synchronized successfully',
      user: {
        id: userId,
        email
      }
    });
  } catch (error) {
    console.error('Error syncing session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync session'
    });
  }
});

// Get current user
router.get('/user', (req, res) => {
  console.log('User in session:', req.user);
  
  if (req.user) {
    res.json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Check if email exists
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    res.json({
      exists: !!data,
      user: data ? { id: data.id } : null
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email', details: error.message });
  }
});

// Store Supabase token in session
router.post('/set-supabase-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Store the token in the session
    req.session.supabaseToken = token;
    console.log('Stored Supabase token in session from frontend');
    
    // Save the session
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session with token:', err);
        return res.status(500).json({ error: 'Failed to save token in session' });
      }
      
      res.json({ success: true, message: 'Supabase token stored in session' });
    });
  } catch (error) {
    console.error('Error storing Supabase token:', error);
    res.status(500).json({ error: 'Failed to store token', details: error.message });
  }
});

// Check if user is authenticated
router.get('/check', (req, res) => {
  // Only log if debug parameter is present
  const shouldLog = req.query.debug === 'true';
  
  if (shouldLog) {
    console.log('Auth check requested');
    console.log('User authenticated:', !!req.session.authenticated);
  }
  
  if (req.session.authenticated && req.session.userId) {
    if (shouldLog) {
      console.log('User in session:', req.session.email);
    }
    res.json({ 
      authenticated: true, 
      user: {
        id: req.session.userId,
        email: req.session.email,
        name: req.session.name || req.session.email
      } 
    });
  } else {
    if (shouldLog) {
      console.log('No authenticated user in session');
    }
    res.json({ authenticated: false });
  }
});

// Add this test endpoint
router.get('/test-auth', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Add this endpoint to create a user record
router.post('/create-user-record', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    console.log('Creating or retrieving user record for:', user.id, user.email);
    
    // Extract Google ID from user metadata if available
    const googleId = user.user_metadata?.google_id || 
                     user.identities?.[0]?.id ||
                     `google_${user.id.substring(0, 8)}`;
    
    const name = user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email.split('@')[0];
    
    // First, check if the user already exists by ID
    const { data: existingUserById, error: idError } = await supabaseAdmin
      .from('users')
      .select('id, email, google_id')
      .eq('id', user.id)
      .single();
    
    if (!idError && existingUserById) {
      console.log('User already exists by ID, updating last_login...');
      
      // Update the last_login timestamp
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          // Only update these if they might have changed
          name: name,
          email: user.email
        })
        .eq('id', user.id)
        .select();
      
      if (updateError) {
        console.error('Error updating user:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user record',
          details: updateError.message
        });
      }
      
      return res.json({
        success: true,
        message: 'User record updated',
        user: updatedUser[0]
      });
    }
    
    // If not found by ID, check if user exists by google_id
    if (googleId) {
      const { data: existingUserByGoogleId, error: googleIdError } = await supabaseAdmin
        .from('users')
        .select('id, email, google_id')
        .eq('google_id', googleId)
        .single();
      
      if (!googleIdError && existingUserByGoogleId) {
        console.log('User exists with this google_id but different ID, updating...');
        
        // User exists with this google_id but a different id
        // We should update the user record to match the new ID from auth
        const { data: updatedGoogleUser, error: updateGoogleError } = await supabaseAdmin
          .from('users')
          .update({ 
            id: user.id, // Update to the new auth ID
            name: name,
            email: user.email,
            last_login: new Date().toISOString()
          })
          .eq('google_id', googleId)
          .select();
        
        if (updateGoogleError) {
          console.error('Error updating user by google_id:', updateGoogleError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update user record by google_id',
            details: updateGoogleError.message
          });
        }
        
        return res.json({
          success: true,
          message: 'User record updated via google_id',
          user: updatedGoogleUser[0]
        });
      }
    }
    
    // If not found by email either, check if user exists by email
    const { data: existingUserByEmail, error: emailError } = await supabaseAdmin
      .from('users')
      .select('id, email, google_id')
      .eq('email', user.email)
      .single();
    
    if (!emailError && existingUserByEmail) {
      console.log('User exists with this email but different ID, updating...');
      
      // User exists with this email but a different id and google_id
      // We should update the google_id if it's empty or different
      let updateData = { 
        name: name,
        last_login: new Date().toISOString()
      };
      
      // Only update google_id if it's not already set or doesn't match
      if (googleId && (!existingUserByEmail.google_id || existingUserByEmail.google_id !== googleId)) {
        updateData.google_id = googleId;
      }
      
      const { data: updatedEmailUser, error: updateEmailError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('email', user.email)
        .select();
      
      if (updateEmailError) {
        console.error('Error updating user by email:', updateEmailError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user record by email',
          details: updateEmailError.message
        });
      }
      
      return res.json({
        success: true,
        message: 'User record updated via email match',
        user: updatedEmailUser[0]
      });
    }
    
    // If we get here, user doesn't exist, create a new record
    console.log('Creating new user record:', { id: user.id, email: user.email, googleId });
    
    try {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            id: user.id,
            google_id: googleId,
            name: name,
            email: user.email,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) {
        throw insertError;
      }
      
      console.log('User record created successfully');
      return res.json({
        success: true,
        message: 'User record created',
        user: newUser[0]
      });
    } catch (insertError) {
      // If the insert fails due to a duplicate key, it might be a race condition
      // where another request created the user in between our checks
      if (insertError.code === '23505') { // PostgreSQL duplicate key error
        console.log('Duplicate key error, trying to retrieve existing user');
        
        // Try to get the user one more time
        const { data: existingUser, error: finalError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!finalError && existingUser) {
          console.log('Found user after duplicate key error');
          return res.json({
            success: true,
            message: 'User record found after conflict',
            user: existingUser
          });
        }
      }
      
      console.error('Error creating user record:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user record',
        details: insertError.message
      });
    }
  } catch (error) {
    console.error('Error in create-user-record endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
});

module.exports = router;
