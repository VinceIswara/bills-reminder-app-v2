import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import logger from '../utils/logger';

// Add a styled loading component for better user experience
const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: #3498db;
`;

/**
 * PrivateRoute component to protect routes that require authentication
 * Shows a loading state, redirects to login, or renders child routes
 */
const PrivateRoute = () => {
  const { currentUser, loading } = useAuth();
  
  // Debugging logs for auth state
  useEffect(() => {
    logger.debug('PrivateRoute - Auth state:', {
      isAuthenticated: !!currentUser,
      isLoading: loading,
      user: currentUser ? currentUser.email : 'none'
    });
  }, [currentUser, loading]);

  // Show loading indicator while checking authentication
  if (loading) {
    logger.debug('PrivateRoute - Still loading auth state');
    return (
      <LoadingContainer>
        <div>Checking authentication...</div>
      </LoadingContainer>
    );
  }

  // Add consistent logging
  if (!currentUser) {
    logger.warn('PrivateRoute - No user found, redirecting to login');
  } else {
    logger.info(`PrivateRoute - User authenticated: ${currentUser.email}`);
  }

  // Store the auth decision in a variable to avoid duplicated logic
  const isAuthenticated = !!currentUser;
  
  // Redirect to login page if not authenticated, otherwise render child routes
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
