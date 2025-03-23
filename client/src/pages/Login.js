import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import logger from '../utils/logger';
import {
  LoginContainer,
  Title,
  Subtitle,
  ErrorMessage,
  LoadingContainer,
  LoadingSpinner,
  LoadingText,
  FooterText
} from '../styles/LoginStyles';
import supabase from '../utils/supabase';

/**
 * Login page component
 * Handles authentication flow, displays login form and error messages
 */
const Login = () => {
  const { currentUser, loading: authLoading, error: authError } = useAuth();
  const [componentLoading, setComponentLoading] = useState(true);
  const [componentError, setComponentError] = useState(null);
  const location = useLocation();

  // Check for error parameters in URL (typically from OAuth redirects)
  useEffect(() => {
    logger.info('Login component initialized');
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const messageParam = params.get('message');
    
    if (errorParam) {
      setComponentError(messageParam || `Authentication error: ${errorParam}`);
    }
  }, [location.search]);

  // Modify the useEffect to be more selective about authentication checks
  useEffect(() => {
    logger.debug("Running auth check effect");
    let isMounted = true;
    let timeoutId = null;
    
    const checkAuth = async () => {
      if (!isMounted) return;
      
      try {
        // If user is already authenticated, no need to check further
        if (currentUser) {
          setComponentLoading(false);
          return;
        }
        
        timeoutId = setTimeout(() => {
          if (isMounted) {
            logger.warn('Authentication check timeout triggered');
            setComponentLoading(false);
          }
        }, 10000);
        
        // Use Supabase client directly to check session
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          logger.info("Found existing session during login page load");
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (isMounted) {
          setComponentLoading(false);
        }
      } catch (error) {
        logger.error("Auth check error:", error.message);
        
        if (isMounted) {
          setComponentLoading(false);
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentUser]);

  // Handle manual Google login button click
  const handleGoogleLogin = useCallback(async () => {
    try {
      logger.info('Initiating manual Google login');
      setComponentError(null);
      
      // Use Supabase directly for more control over the redirect process
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Force account selection to avoid automatic login with previous account
            prompt: 'select_account'
          }
        }
      });
      
      if (error) {
        logger.error('Google login error:', error.message);
        setComponentError('Login failed: ' + error.message);
        return;
      }
      
      // If we get here without errors, the user will be redirected to Google
      logger.info('Redirecting to Google for authentication...');
    } catch (error) {
      logger.error('Login error:', error.message);
      setComponentError('Login failed: ' + error.message);
    }
  }, []);

  // Combine errors from context and component
  const displayError = componentError || authError;
  
  // Combine loading states
  const isLoading = authLoading || componentLoading;

  // Modify the debug logging to only run in development and at lower frequency
  // Log state for debugging (conditionally)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    // Only log 10% of the time to reduce console noise
    logger.debug('Login render state:', {
      authenticated: !!currentUser,
      loading: isLoading,
      error: displayError || 'none'
    });
  }

  // Redirect if logged in
  if (currentUser) {
    logger.info('User authenticated, redirecting to home');
    return <Navigate to="/" />;
  }

  // Show loading state
  if (isLoading) {
    logger.debug('Rendering loading state');
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    );
  }

  // Show login form or error
  return (
    <LoginContainer>
      <Title>Welcome to Bill Reminder</Title>
      <Subtitle>
        Keep track of your bills, get reminders, and never miss a payment again.
        Sign in to get started.
      </Subtitle>

      {displayError && <ErrorMessage>{displayError}</ErrorMessage>}

      <GoogleLoginButton onClick={handleGoogleLogin} />
      
      <FooterText>
        Clicking will redirect to Google for authentication
      </FooterText>
    </LoginContainer>
  );
};

export default Login;
