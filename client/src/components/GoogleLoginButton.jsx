import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  color: #757575;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 300px;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #f8f8f8;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const GoogleIcon = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
`;

const ButtonText = styled.span`
  flex: 1;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
`;

/**
 * Google Login Button component
 * @param {Object} props - Component props
 * @param {string} props.className - CSS class to apply to the button
 * @param {Function} props.onClick - Optional custom click handler (for testing or custom behavior)
 * @param {number} props.timeout - Optional timeout duration in ms (default: 10000)
 */
const GoogleLoginButton = ({ className, onClick, timeout = 10000 }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use debounce flag to prevent multiple rapid clicks
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = useCallback(async () => {
    // Prevent multiple clicks while processing
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setIsLoading(true);
      setError(null);
      
      console.log('Starting Google login process...');
      
      // If custom click handler is provided, use it
      if (onClick) {
        await onClick();
        return;
      }
      
      // Otherwise use the default login
      const result = await login();
      
      // The login function will redirect, so we shouldn't reach here
      // But just in case there's an issue, we'll handle it
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to login');
      }
    } catch (err) {
      console.error('Error in Google login button:', err);
      setError(err.message || 'Failed to start login process');
      setIsLoading(false);
      setIsProcessing(false);
    }
    
    // Set a timeout to reset loading state in case the redirect doesn't happen
    // This prevents the button from being stuck in loading state
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setIsProcessing(false);
    }, timeout);
    
    // Clean up timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, [login, onClick, isProcessing, timeout]);

  return (
    <>
      <Button 
        onClick={handleLogin} 
        disabled={isLoading || isProcessing}
        className={className}
        aria-label="Sign in with Google"
        data-testid="google-login-button"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <ButtonText>Connecting to Google...</ButtonText>
          </>
        ) : (
          <>
            <GoogleIcon>
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            </GoogleIcon>
            <ButtonText>Sign in with Google</ButtonText>
          </>
        )}
      </Button>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
};

export default GoogleLoginButton;