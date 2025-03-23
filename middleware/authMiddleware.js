// middleware/authMiddleware.js
const { supabaseAdmin } = require('../serverSupabase');

// Middleware to check if user is authenticated using JWT
const isAuthenticated = async (req, res, next) => {
  try {
    // Get the auth header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Verifying token...');
    
    // Verify the token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Invalid token:', error?.message || 'No user found');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    console.log('Token verified successfully for user:', data.user.email);
    
    // Store Supabase user information on the request object
    req.user = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata || {},
      app_metadata: data.user.app_metadata || {},
      identities: data.user.identities || []
    };
    
    // Check if we have additional data in user_metadata
    if (data.user.user_metadata) {
      req.user.name = data.user.user_metadata.full_name || 
                      data.user.user_metadata.name || 
                      data.user.email.split('@')[0];
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed', details: error.message });
  }
};

module.exports = {
  isAuthenticated
};
