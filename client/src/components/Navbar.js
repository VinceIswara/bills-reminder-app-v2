import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getNotifications } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { supabaseUrl } from '../utils/supabase';

const NavbarContainer = styled.nav`
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const NavContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
  
  &:hover {
    color: #3498db;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  margin-left: 1rem;
`;

const UserAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid white;
`;

const UserName = styled.span`
  color: white;
  margin-right: 12px;
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #3498db;
  }
`;

const NotificationIcon = styled(Link)`
  position: relative;
  color: white;
  font-size: 1.2rem;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  text-decoration: none;
  
  &:hover {
    color: #3498db;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
`;

/**
 * Navbar component with notification badge and user profile
 */
const Navbar = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { currentUser, loading, logout } = useAuth();
  
  // Memoize the fetchNotifications function with useCallback
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if user isn't logged in
    if (!currentUser) return;
    
    try {
      setLoadingNotifications(true);
      const data = await getNotifications();
      
      if (data && Array.isArray(data)) {
        setNotifications(data);
        
        // Update unread count
        const unreadCount = data.filter(notification => !notification.read).length;
        setUnreadCount(unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Just log the error, don't update state to avoid UI disruption
    } finally {
      setLoadingNotifications(false);
    }
  }, [currentUser]);
  
  // Set up notification fetching
  useEffect(() => {
    if (currentUser) {
      // Initial fetch
      fetchNotifications();
      
      // Set up interval
      const intervalId = setInterval(fetchNotifications, 60000); // Check every minute
      
      // Clean up interval
      return () => clearInterval(intervalId);
    } else {
      // Reset notification state when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser, fetchNotifications]);
  
  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Starting logout process");
    
    try {
      // First, clear local storage immediately for immediate effect
      try {
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
        localStorage.removeItem(storageKey);
        console.log("Cleared local storage token");
      } catch (storageError) {
        console.warn("Error clearing local storage:", storageError);
      }
      
      // Then attempt the formal logout process with a timeout
      const logoutPromise = logout();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.log("Logout timeout reached, forcing redirect");
          reject(new Error('Logout timed out'));
        }, 3000)
      );
      
      // Race between actual logout and timeout
      await Promise.race([logoutPromise, timeoutPromise])
        .catch(error => {
          console.warn("Logout race failed:", error);
          // Even if this fails, we'll still redirect below
        });
      
      // Always redirect to login regardless of logout success
      console.log("Redirecting to login");
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Force redirect as a last resort
      console.log("Error during logout, forcing redirect");
      window.location.href = '/login';
    }
  };
  
  return (
    <NavbarContainer>
      <NavContent>
        <Logo to="/">Bill Reminder</Logo>
        <NavLinks>
          {!loading && currentUser ? (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/add">Add Bill</NavLink>
              <NavLink to="/notification-settings">Settings</NavLink>
              <NotificationIcon to="/notifications">
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <NotificationBadge>{unreadCount > 9 ? '9+' : unreadCount}</NotificationBadge>}
              </NotificationIcon>
              <UserProfile>
                {currentUser.avatar_url && (
                  <UserAvatar src={currentUser.avatar_url} alt={currentUser.name || 'User'} />
                )}
                <UserName>{currentUser.name || 'User'}</UserName>
                <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
              </UserProfile>
            </>
          ) : (
            <NavLink to="/login">
              Sign In
            </NavLink>
          )}
        </NavLinks>
      </NavContent>
    </NavbarContainer>
  );
};

export default Navbar;
