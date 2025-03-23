import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import supabase, { signInWithGoogle, signOut, getCurrentSession, supabaseUrl } from '../utils/supabase';
import logger from '../utils/logger';
import { createUserRecord } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const authInitialized = useRef(false);
  const isInitialized = useRef(false);


  // Update the isSupabaseAccessible function to be more efficient
  const isSupabaseAccessible = useCallback(async () => {
    try {
      logger.debug('Checking Supabase accessibility...');
      const startTime = performance.now();
      
      // Use the Supabase client instead of raw fetch
      const { error } = await supabase.auth.getSession();
      
      const isSuccess = !error;
      const timeElapsed = Math.round(performance.now() - startTime);
      
      if (isSuccess) {
        logger.debug(`Supabase is accessible (${timeElapsed}ms)`);
      } else {
        logger.warn(`Supabase accessibility check failed: ${error.message}`);
      }
      
      return isSuccess;
    } catch (error) {
      logger.error('Supabase accessibility check failed:', error.message);
      return false;
    }
  }, []);

  // At the top of AuthProvider component, add:
  useEffect(() => {
    // Log environment and setup
    logger.debug('Auth initialization - Environment check:', {
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not set',
      supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      apiUrl: process.env.REACT_APP_API_URL || 'Not set',
      nodeEnv: process.env.NODE_ENV
    });
    
    // Test Supabase reachability without logging errors
    supabase.auth.getSession().then(() => {
      logger.debug('Supabase client initialized successfully');
    }).catch(error => {
      logger.warn('Supabase client initialization issue:', error.message);
    });
  }, []); // No need for dependencies here

  // Now wrap getLocalAuthData in useCallback to fix the dependency warning
  const getLocalAuthData = useCallback(() => {
    try {
      // Try multiple possible storage key formats
      const possibleKeys = [
        `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`,
        `supabase.auth.token`,
        `sb:${supabaseUrl.split('//')[1].split('.')[0]}:auth:token`
      ];
      
      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.user || (parsed.data && parsed.data.user))) {
              const user = parsed.user || parsed.data.user;
              logger.debug(`Found valid auth data in localStorage key: ${key}`);
              return {
                id: user.id,
                email: user.email
              };
            }
          } catch (parseError) {
            logger.error(`Error parsing stored auth data from ${key}:`, parseError.message);
          }
        }
      }
    } catch (err) {
      logger.error('Local auth fallback error:', err.message);
    }
    return null;
  }, []); // Empty dependency array as this doesn't depend on component state

  // Check for debug mode in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug_auth');
    
    if (debug === 'bypass') {
      console.log('🛠️ DEBUG MODE: Bypassing authentication checks');
      setDebugMode(true);
      
      // Create a mock user for testing
      const mockUser = {
        id: 'debug-user-id',
        email: 'debug@example.com',
        name: 'Debug User'
      };
      
      setCurrentUser(mockUser);
      setLoading(false);
    }
  }, []);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    if (loading && !debugMode) {
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Authentication timeout triggered after 20 seconds');
        
        // Instead of just setting error, try to recover using local fallback
        const localUser = getLocalAuthData();
        if (localUser) {
          console.log('Timeout recovery: Using locally stored authentication');
          setCurrentUser(localUser);
        } else {
          setError('Authentication process timed out. Please refresh the page or try again later.');
        }
        
        setLoading(false);
      }, 20000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, debugMode, getLocalAuthData]);

  // Modify the attemptAuthWithRetry function to be more conservative
  const attemptAuthWithRetry = useCallback(async (maxRetries = 1) => {
    let attempt = 0;
    let lastError = null;
    
    // First, let's check if Supabase is even accessible before trying
    const isAccessible = await isSupabaseAccessible();
    if (!isAccessible) {
      logger.warn('Supabase is not accessible, skipping authentication attempts');
      throw new Error('Supabase service is not accessible');
    }
    
    while (attempt < maxRetries) {
      try {
        logger.info(`Starting auth attempt (will retry up to ${maxRetries - attempt} times if needed)`);
        
        const session = await getCurrentSession();
        if (session) {
          try {
            // Ensure user record is created/updated
            const userRecordResult = await createUserRecord({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
            });
            
            if (!userRecordResult.success) {
              logger.warn('User authenticated but failed to create user record:', userRecordResult.error);
              // Continue anyway since authentication succeeded
            }
          } catch (userRecordError) {
            logger.error('Error creating user record during auth attempt:', userRecordError);
            // Continue anyway since authentication succeeded
          }
          
          setCurrentUser(session.user);
          setLoading(false);
          return session;
        }
        
        // If we get here, we don't have a session
        // Only on the login page, this is normal and we shouldn't retry
        if (window.location.pathname.includes('/login')) {
          setLoading(false);
          return null;
        }
        
        // Wait before retrying - use exponential backoff
        const delayMs = Math.min(1000 * (2 ** attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        attempt++;
      } catch (error) {
        lastError = error;
        logger.error(`Auth attempt ${attempt + 1} failed: ${error.message}`);
        
        // If it's not a network error or timeout, don't retry
        if (!error.message.includes('network') && 
            !error.message.includes('timeout') &&
            !error.message.includes('aborted')) {
          break;
        }
        
        attempt++;
      }
    }
    
    // If we've exhausted retries, try local auth as fallback
    const localAuth = getLocalAuthData();
    if (localAuth) {
      logger.info('Using locally stored auth data as fallback');
      setCurrentUser(localAuth.user);
      setLoading(false);
      return localAuth;
    }
    
    setLoading(false);
    if (lastError) throw lastError;
    return null;
  }, [isSupabaseAccessible, getLocalAuthData, setCurrentUser, setLoading]);

  // Modify the initialization effect
  useEffect(() => {
    // Skip if we've already initialized
    if (isInitialized.current) return;
    
    logger.debug('AuthContext initialization');
    
    const initAuth = async () => {
      if (authInitialized.current) return;
      
      logger.debug('Starting authentication process...');
      
      try {
        // We'll only try once during initialization
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Auth initialization error:', error.message);
          setError('Authentication failed. Please try again.');
          setLoading(false);
          return;
        }
        
        if (data?.session) {
          logger.info(`Setting user from session: ${data.session.user.email}`);
          setCurrentUser(data.session.user);
        }
        
        authInitialized.current = true;
        isInitialized.current = true;
      } catch (error) {
        logger.error('Auth initialization error:', error.message);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Set up the auth state subscription (just once)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug(`Auth state changed: ${event}`);
      
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        logger.info(`Auth state update: User signed in - ${session.user.email}`);
        
        // Create or update user record in database when signed in
        createUserRecord({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
        }).then(result => {
          if (result.success) {
            logger.info('User record synchronized with database');
          } else {
            logger.warn('Failed to synchronize user record with database', result.error);
          }
        }).catch(error => {
          logger.error('Error synchronizing user record:', error);
        });
        
        setCurrentUser(session.user);
        setError(null);
        authInitialized.current = true;
      } else if (event === 'SIGNED_OUT') {
        logger.info('Auth state update: User signed out');
        setCurrentUser(null);
        authInitialized.current = false;
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [currentUser]); // Now you can include currentUser safely

  // Login function using Supabase OAuth
  const login = async () => {
    try {
      setError(null);
      
      // Check environment variables
      const envCheck = {
        apiUrl: process.env.REACT_APP_API_URL || 'Not set',
        supabaseUrl: process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not set',
        supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
      };
      
      console.log('Environment check before login:', envCheck);
      
      const result = await signInWithGoogle();
      
      if (!result.success) {
        setError(result.error || 'Failed to start login process');
        return { success: false, error: result.error || 'Failed to start login process' };
      }
      
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      return { success: false, error: err.message || 'Failed to login' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // First clear user state
      setCurrentUser(null);
      
      // Create a timeout for the signOut operation
      const signOutPromise = signOut();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timed out')), 3000);
      });
      
      // Race the signOut against the timeout
      const result = await Promise.race([signOutPromise, timeoutPromise])
        .catch(error => {
          console.warn('Sign out race failed:', error);
          return { success: false, error: error.message };
        });
      
      if (!result.success) {
        console.warn('Sign out was not successful, but continuing with logout flow');
      }
      
      // Try to clear storage directly as a failsafe
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
        localStorage.removeItem(storageKey);
        console.log('Local storage token cleared');
      } catch (storageError) {
        console.warn('Error clearing local storage:', storageError);
      }
      
      // Redirect to login page
      window.location.href = '/login';
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out');
      
      // Even if there's an error, try to redirect
      window.location.href = '/login';
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    attemptAuthWithRetry,
    getCurrentSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
