import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getNotificationPreferences, updateNotificationPreferences, getNotifications, sendTestNotification } from '../utils/api';

// Import all styled components
import {
  SettingsContainer,
  BackLink,
  Title,
  Card,
  FormGroup,
  Label,
  Input,
  Select,
  CheckboxContainer,
  Checkbox,
  CheckboxLabel,
  Description,
  Button,
  SecondaryButton,
  ButtonGroup,
  TestNotificationButton,
  NotificationHistoryTitle,
  NotificationItem,
  NotificationHeader,
  NotificationTitle,
  NotificationDate,
  NotificationMessage,
  LoadingSpinner,
  SuccessMessage,
  ErrorMessage
} from '../styles/NotificationSettingsStyles';

// Recent notifications section component
const RecentNotificationsSection = ({ recentNotifications, loadingNotifications, formatDate }) => (
  <>
    <NotificationHistoryTitle>Recent Notifications</NotificationHistoryTitle>
    {loadingNotifications ? (
      <p>Loading recent notifications...</p>
    ) : recentNotifications.length > 0 ? (
      recentNotifications.map(notification => (
        <NotificationItem key={notification.id} read={notification.read}>
          <NotificationHeader>
            <NotificationTitle>{notification.title}</NotificationTitle>
            <NotificationDate>{formatDate(notification.created_at)}</NotificationDate>
          </NotificationHeader>
          <NotificationMessage>{notification.message}</NotificationMessage>
        </NotificationItem>
      ))
    ) : (
      <p>No recent notifications found.</p>
    )}
  </>
);

// Notification type settings component
const NotificationTypeSettings = ({ preferences, handleChange }) => (
  <FormGroup>
    <Label>Notification Types</Label>
    <CheckboxContainer>
      <Checkbox 
        type="checkbox" 
        id="in_app_notifications" 
        name="in_app_notifications"
        checked={preferences.in_app_notifications}
        onChange={handleChange}
      />
      <CheckboxLabel htmlFor="in_app_notifications">In-app Notifications</CheckboxLabel>
    </CheckboxContainer>
    <Description>
      Receive notifications within the app for upcoming and overdue bills.
    </Description>
    
    <CheckboxContainer>
      <Checkbox 
        type="checkbox" 
        id="email_notifications" 
        name="email_notifications"
        checked={preferences.email_notifications}
        onChange={handleChange}
      />
      <CheckboxLabel htmlFor="email_notifications">Email Notifications</CheckboxLabel>
    </CheckboxContainer>
    <Description>
      Receive email notifications for upcoming and overdue bills.
    </Description>
    
    {preferences.email_notifications && (
      <FormGroup>
        <Label htmlFor="email_address">Email Address</Label>
        <Input 
          type="email" 
          id="email_address" 
          name="email_address"
          value={preferences.email_address || ''}
          onChange={handleChange}
          placeholder="Enter your email address"
        />
        <Description>
          Email address where you want to receive bill notifications.
        </Description>
      </FormGroup>
    )}
  </FormGroup>
);

// Notification timing settings component
const NotificationTimingSettings = ({ preferences, handleChange }) => (
  <FormGroup>
    <Label>Notification Timing</Label>
    
    <CheckboxContainer>
      <Checkbox 
        type="checkbox" 
        id="notify_on_due_date" 
        name="notify_on_due_date"
        checked={preferences.notify_on_due_date}
        onChange={handleChange}
      />
      <CheckboxLabel htmlFor="notify_on_due_date">Notify on due date</CheckboxLabel>
    </CheckboxContainer>
    <Description>
      Receive a notification on the day a bill is due.
    </Description>
    
    <CheckboxContainer>
      <Checkbox 
        type="checkbox" 
        id="notify_when_overdue" 
        name="notify_when_overdue"
        checked={preferences.notify_when_overdue}
        onChange={handleChange}
      />
      <CheckboxLabel htmlFor="notify_when_overdue">Notify when bills are overdue</CheckboxLabel>
    </CheckboxContainer>
    <Description>
      Receive notifications for bills that are past their due date.
    </Description>
    
    <FormGroup>
      <Label htmlFor="notification_days_before">Advance Notice (Days)</Label>
      <Select 
        id="notification_days_before" 
        name="notification_days_before"
        value={preferences.notification_days_before}
        onChange={handleChange}
      >
        <option value="1">1 day before</option>
        <option value="2">2 days before</option>
        <option value="3">3 days before</option>
        <option value="5">5 days before</option>
        <option value="7">7 days before</option>
        <option value="14">14 days before</option>
      </Select>
      <Description>
        How many days before the due date you want to receive a notification.
      </Description>
    </FormGroup>
  </FormGroup>
);

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    in_app_notifications: true,
    notification_days_before: 3,
    notify_on_due_date: true,
    notify_when_overdue: true,
    email_address: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNotificationPreferences();
      
      if (response && response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to load notification settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchRecentNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const response = await getNotifications();
      
      if (response && Array.isArray(response)) {
        // Get the 5 most recent notifications
        const sortedNotifications = response
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setRecentNotifications(sortedNotifications);
      }
    } catch (err) {
      console.error('Error fetching recent notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);
  
  useEffect(() => {
    fetchPreferences();
    fetchRecentNotifications();
  }, [fetchPreferences, fetchRecentNotifications]);
  
  const handleTestNotification = useCallback(async () => {
    try {
      setTestingNotification(true);
      setTestSuccess(false);
      setTestError(null);
      
      // Validate email if email notifications are enabled
      if (preferences.email_notifications && !preferences.email_address) {
        setTestError('Please provide an email address for email notifications.');
        setTestingNotification(false);
        return;
      }
      
      // Call the API to trigger a test notification using our utility function
      const response = await sendTestNotification({
        email: preferences.email_notifications ? preferences.email_address : null,
        in_app: preferences.in_app_notifications
      });
      
      if (response && response.success) {
        setTestSuccess(true);
        // Refresh the notifications list
        fetchRecentNotifications();
        // Hide success message after 3 seconds
        setTimeout(() => setTestSuccess(false), 3000);
      } else {
        setTestError(response.error || 'Failed to send test notification.');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      setTestError('Failed to send test notification. Please try again later.');
    } finally {
      setTestingNotification(false);
    }
  }, [preferences, fetchRecentNotifications]);
  
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  }, []);
  
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSuccess(false);
      setError(null);
      
      // Validate email if email notifications are enabled
      if (preferences.email_notifications && !preferences.email_address) {
        setError('Please provide an email address for email notifications.');
        setSaving(false);
        return;
      }
      
      const response = await updateNotificationPreferences(preferences);
      
      if (response && response.success) {
        setSuccess(true);
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Failed to save notification settings.');
      }
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save notification settings. Please try again later.');
    } finally {
      setSaving(false);
    }
  }, [preferences]);
  
  if (loading) {
    return <SettingsContainer><p>Loading notification settings...</p></SettingsContainer>;
  }
  
  return (
    <SettingsContainer>
      <BackLink to="/notifications"><span>←</span> Back to Notifications</BackLink>
      
      <Title>Notification Settings</Title>
      
      {success && (
        <SuccessMessage>
          Notification settings saved successfully!
        </SuccessMessage>
      )}
      
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}
      
      <form onSubmit={handleSubmit}>
        <Card>
          <NotificationTypeSettings 
            preferences={preferences}
            handleChange={handleChange}
          />
        </Card>
        
        <Card>
          <NotificationTimingSettings 
            preferences={preferences}
            handleChange={handleChange}
          />
        </Card>
        
        <ButtonGroup>
          <Button type="submit" disabled={saving}>
            {saving ? <><LoadingSpinner /> Saving...</> : 'Save Settings'}
          </Button>
          <TestNotificationButton 
            type="button" 
            onClick={handleTestNotification} 
            disabled={testingNotification}
          >
            {testingNotification ? <><LoadingSpinner /> Testing...</> : 'Send Test Notification'}
          </TestNotificationButton>
        </ButtonGroup>
        
        {testSuccess && (
          <SuccessMessage style={{ marginTop: '20px' }}>
            Test notification sent successfully! Check your notifications and email (if enabled).
          </SuccessMessage>
        )}
        
        {testError && (
          <ErrorMessage style={{ marginTop: '20px' }}>
            {testError}
          </ErrorMessage>
        )}
      </form>
      
      <RecentNotificationsSection 
        recentNotifications={recentNotifications}
        loadingNotifications={loadingNotifications}
        formatDate={formatDate}
      />
    </SettingsContainer>
  );
};

export default NotificationSettings;
