// src/components/AuthCallback.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';
import logger from '../utils/logger';
import { createUserRecord } from '../utils/api';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.info('Auth callback in frontend - processing code');
        logger.debug('Processing callback URL:', window.location.href);
        
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Supabase session error:', error);
          navigate('/login?error=session_error');
          return;
        }
        
        if (data.session) {
          logger.info('Authenticated successfully:', data.session.user.email);
          
          // Create/update user record in your database
          try {
            const result = await createUserRecord({
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.full_name || data.session.user.email.split('@')[0]
            });
            
            if (result.success) {
              logger.info('User record created/updated in database');
            } else {
              logger.warn('Note: Failed to create user record', result.error);
              // Continue anyway as this might be a non-critical error
            }
          } catch (userRecordError) {
            logger.error('Error creating user record:', userRecordError);
            // Continue anyway as authentication succeeded
          }
          
          // Wait for auth state to update (important!)
          setTimeout(() => {
            navigate('/');
          }, 500); // Add a small delay to let the auth state propagate
        } else {
          logger.error('No session established after callback');
          navigate('/login?error=no_session');
        }
      } catch (error) {
        logger.error('Error handling auth callback:', error);
        navigate('/login?error=callback_error');
      }
    };
    
    handleCallback();
  }, [navigate]);
  
  return <div>Processing authentication...</div>;
};

export default AuthCallback;