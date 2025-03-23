import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, deleteNotification } from '../utils/api';

// Import all styled components
import {
  NotificationsContainer,
  PageHeader,
  Title,
  SettingsLink,
  NotificationsList,
  EmptyState,
  EmptyStateText,
  NotificationCard,
  NotificationHeader,
  NotificationTitle,
  NotificationDate,
  NotificationMessage,
  NotificationActions,
  ActionButton,
  DeleteButton,
  ViewBillButton,
  RefreshButton
} from '../styles/NotificationsStyles';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Define fetchNotifications BEFORE using it in useEffect
  const fetchNotifications = useCallback(async () => {
    try {
      // Don't set loading to true on background refreshes
      const isInitialLoad = loading;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const data = await getNotifications();
      
      if (data && Array.isArray(data)) {
        // Find new notifications since last fetch
        const now = Date.now();
        const newNotifications = data.filter(
          notification => 
            new Date(notification.created_at).getTime() > lastFetchTime &&
            !notifications.some(n => n.id === notification.id)
        );
        
        // If there are new notifications, highlight them or show a toast
        if (newNotifications.length > 0 && !loading) {
          // Show notification or highlight - you could use a library like react-toastify
          console.log(`${newNotifications.length} new notifications received`);
        }
        
        // Add timeAgo property for each notification if it doesn't exist
        const notificationsWithTimeAgo = data.map(notification => {
          if (!notification.timeAgo) {
            const date = new Date(notification.created_at);
            const now = new Date();
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            
            let timeAgo;
            if (diffInMinutes < 1) {
              timeAgo = 'just now';
            } else if (diffInMinutes < 60) {
              timeAgo = `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
            } else {
              const diffInHours = Math.floor(diffInMinutes / 60);
              if (diffInHours < 24) {
                timeAgo = `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
              } else {
                const diffInDays = Math.floor(diffInHours / 24);
                timeAgo = `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
              }
            }
            
            return { ...notification, timeAgo };
          }
          return notification;
        });
        
        setNotifications(notificationsWithTimeAgo);
        setError(null);
        setLastFetchTime(now);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications. Please try again later.');
      setRetryCount(prevCount => prevCount + 1);
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  }, [loading, notifications, lastFetchTime]);
  
  // Now useEffect can safely use fetchNotifications
  useEffect(() => {
    fetchNotifications();
    
    const intervalId = setInterval(() => {
      if (retryCount < MAX_RETRIES || !error) {
        fetchNotifications();
      } else {
        // If we've tried several times and still have errors, stop polling
        clearInterval(intervalId);
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [error, retryCount, fetchNotifications]);
  
  const handleMarkAsRead = async (id) => {
    // Optimistically update UI first
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
    
    try {
      await markNotificationAsRead(id);
      // No need to update state again as we already did it optimistically
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert the optimistic update on error
      setNotifications(notifications.map(notification => 
        notification.id === id ? { ...notification, read: false } : notification
      ));
      alert('Failed to mark notification as read');
    }
  };
  
  const handleDelete = async (id) => {
    // Store the notification before removing it
    const deletedNotification = notifications.find(n => n.id === id);
    
    // Optimistically update UI
    setNotifications(notifications.filter(notification => notification.id !== id));
    
    try {
      await deleteNotification(id);
      // Already updated the UI
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Revert the optimistic update on error
      if (deletedNotification) {
        setNotifications([...notifications, deletedNotification]);
      }
      alert('Failed to delete notification');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Format as time if today
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  if (loading) {
    return <NotificationsContainer><p>Loading notifications...</p></NotificationsContainer>;
  }
  
  return (
    <NotificationsContainer>
      <PageHeader>
        <Title>Notifications</Title>
        <div style={{ display: 'flex', gap: '10px' }}>
          <RefreshButton onClick={fetchNotifications} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </RefreshButton>
          <SettingsLink to="/notification-settings">Notification Settings</SettingsLink>
        </div>
      </PageHeader>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <NotificationsList>
        {notifications.length === 0 ? (
          <EmptyState>
            <EmptyStateText>You don't have any notifications yet.</EmptyStateText>
            <Link to="/">Go to Home</Link>
          </EmptyState>
        ) : (
          notifications.map(notification => (
            <NotificationCard 
              key={notification.id} 
              read={notification.read ? "true" : "false"}
              type={notification.type}
            >
              <NotificationHeader>
                <NotificationTitle read={notification.read ? "true" : "false"}>
                  {notification.title}
                </NotificationTitle>
                <NotificationDate>
                  {formatDate(notification.created_at)}
                </NotificationDate>
              </NotificationHeader>
              
              <NotificationMessage>
                {notification.message}
              </NotificationMessage>
              
              <NotificationActions>
                {notification.read === false && (
                  <ActionButton onClick={() => handleMarkAsRead(notification.id)}>
                    Mark as Read
                  </ActionButton>
                )}
                <DeleteButton onClick={() => handleDelete(notification.id)}>
                  Delete
                </DeleteButton>
                {notification.bill_id && (
                  <ViewBillButton to={`/bill/${notification.bill_id}`}>
                    View Bill
                  </ViewBillButton>
                )}
              </NotificationActions>
            </NotificationCard>
          ))
        )}
      </NotificationsList>
    </NotificationsContainer>
  );
};

export default Notifications;
