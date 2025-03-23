import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import logger from './logger';

// Environment variables
export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables in frontend');
}

/**
 * Initialize Supabase client with configuration
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    timeout: 30000 // Increase to 30 seconds
  },
  global: {
    fetch: (...args) => {
      // Add custom fetching with longer timeout
      const [resource, config] = args;
      return fetch(resource, {
        ...config,
        signal: config?.signal || (AbortSignal.timeout 
          ? AbortSignal.timeout(30000) 
          : new AbortController().signal)
      });
    }
  }
});

/**
 * Synchronize Supabase session with backend server
 * @returns {Promise<Object>} Result of synchronization
 */
export const syncSupabaseSession = async () => {
  try {
    // Get the session directly from Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session for sync:', sessionError);
      return { success: false, error: sessionError.message };
    }
    
    if (!sessionData?.session) {
      return { success: false, message: 'No active session' };
    }
    
    // Send only what's needed to the backend
    const syncData = {
      token: sessionData.session.access_token,
      userId: sessionData.session.user.id,
      email: sessionData.session.user.email
    };
    
    try {
      const response = await axios.post(
        `${API_URL}/auth/sync-supabase-user`, 
        syncData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          withCredentials: true
        }
      );
      
      return { success: true, data: response.data };
    } catch (apiError) {
      console.error('Backend sync API error:', apiError.response?.status);
      // Even if backend sync fails, we can still use the Supabase session
      return { 
        success: false, 
        error: apiError.message,
        clientAuth: true // Indicate we still have client-side auth
      };
    }
  } catch (error) {
    console.error('Error in syncSupabaseSession:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initiate Google OAuth sign-in flow
 * @returns {Promise<Object>} Sign-in result
 */
export const signInWithGoogle = async () => {
  try {
    // Construct the proper callback URL
    const baseUrl = window.location.origin;
    const callbackUrl = `${baseUrl}/auth/callback`;
    
    // Generate OAuth URL from Supabase client
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          prompt: 'select_account' // Force Google to show account selection
        }
      }
    });
    
    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }
    
    if (data?.url) {
      // Redirect to the OAuth URL
      window.location.href = data.url;
      return { success: true };
    } else {
      throw new Error('No OAuth URL returned from Supabase');
    }
  } catch (error) {
    console.error('Error starting Google login:', error);
    return { success: false, error: error.message || 'Failed to start login process' };
  }
};

/**
 * Sign out the current user
 * @returns {Promise<Object>} Sign-out result
 */
export const signOut = async () => {
  try {
    console.log('Starting Supabase signOut');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase signOut timed out')), 3000);
    });
    
    // Race the signOut against the timeout
    const result = await Promise.race([
      supabase.auth.signOut().then(({ error }) => ({ error })),
      timeoutPromise
    ]);
    
    if (result.error) {
      console.error('Supabase signOut error:', result.error);
      
      // Try to clear local storage as a fallback
      try {
        const storageKeys = [
          `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`,
          'supabase.auth.token'
        ];
        
        for (const key of storageKeys) {
          localStorage.removeItem(key);
        }
        console.log('Cleared auth tokens from local storage');
      } catch (e) {
        console.error('Failed to clear local storage:', e);
      }
      
      return { success: false, error: result.error.message };
    }
    
    console.log('Supabase signOut completed successfully');
    return { success: true };
  } catch (err) {
    console.error('Exception during signOut:', err);
    
    // Even if Supabase signOut fails, try to clear local storage
    try {
      const storageKeys = [
        `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`,
        'supabase.auth.token'
      ];
      
      for (const key of storageKeys) {
        localStorage.removeItem(key);
      }
      console.log('Cleared auth tokens from local storage (fallback)');
    } catch (e) {
      console.error('Failed to clear local storage:', e);
    }
    
    return { success: false, error: err.message };
  }
};

/**
 * Get current session with timeout protection
 * @returns {Promise<Object>} Session data or error
 */
export const getCurrentSession = async () => {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    const timeElapsed = Math.round(performance.now() - startTime);
    logger.debug(`Session fetch completed in ${timeElapsed}ms - ${data.session ? 'Session found' : 'No session'}`);
    
    if (error) {
      logger.error('Error getting session:', error.message);
      return { session: null, error };
    }
    
    return { session: data.session, error: null };
  } catch (err) {
    logger.error('Error getting session:', err.message);
    return { session: null, error: err };
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object>} User data or error
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user from Supabase:', error);
      throw error;
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error getting user:', error);
    return { user: null, error: error.message };
  }
};

// Optimize the session sync to be less aggressive
let isSyncingSession = false;
let pendingSyncTimeout = null;

// Debounced sync to prevent multiple rapid calls
const debouncedSyncSession = () => {
  if (pendingSyncTimeout) {
    clearTimeout(pendingSyncTimeout);
  }
  
  pendingSyncTimeout = setTimeout(async () => {
    if (isSyncingSession) return;
    
    isSyncingSession = true;
    try {
      await syncSupabaseSession();
    } catch (error) {
      console.warn('Session sync error:', error);
    } finally {
      isSyncingSession = false;
      pendingSyncTimeout = null;
    }
  }, 500); // 500ms debounce
};

// Simplified auth state listener
supabase.auth.onAuthStateChange((event, _session) => {
  console.log('Supabase auth state changed:', event);
  
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    debouncedSyncSession();
  }
});

/**
 * Test Supabase connection for diagnostics
 * @returns {Promise<Object>} Test results
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic API endpoint
    const basicResponse = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      }
    });
    
    // Test auth endpoint
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      }
    });
    
    return { 
      success: true, 
      message: 'Connection tests completed',
      results: {
        api: { status: basicResponse.status, ok: basicResponse.ok },
        auth: { status: authResponse.status, ok: authResponse.ok }
      }
    };
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if Supabase is accessible
 * @returns {Promise<boolean>} True if Supabase is accessible
 */
export const isSupabaseAccessible = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Use a try-catch to handle the response or just check if fetch completes
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      logger.debug('Supabase connectivity status:', response.status);
      return response.status < 500; // Actually use the response variable
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return false;
    }
  } catch (error) {
    console.error('Supabase accessibility check failed:', error);
    return false;
  }
};

// Refresh token proactively if it's about to expire
export const checkAndRefreshTokenIfNeeded = async () => {
  try {
    const { session } = await getCurrentSession();
    if (!session) return false;
    
    // Check if token expires soon (within 5 minutes)
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (expiresAt - now < fiveMinutes) {
      console.log('Token expiring soon, refreshing...');
      await supabase.auth.refreshSession();
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Token refresh check failed:', error);
    return false;
  }
};

// Add a simple heartbeat check function
export const checkSupabaseHealth = async () => {
  try {
    console.log('Running Supabase health check...');
    const startTime = Date.now();
    
    // Just check if fetch completes without assigning unused variables
    await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      },
      // Use AbortSignal.timeout if available, otherwise use a manual timeout
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        return controller.signal;
      })()
    });
    
    const timeElapsed = Date.now() - startTime;
    console.log(`Supabase health check completed in ${timeElapsed}ms`);
    
    return true; // Fetch completed without throwing
  } catch (error) {
    console.error('Supabase health check failed:', error.message);
    return false;
  }
};

export default supabase;
