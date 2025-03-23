import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { supabase } from './supabase';

// API URL from environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Cache for notifications
const notificationCache = {
  data: null,
  timestamp: 0
};

// Cache for bills
const billsCache = {
  allBills: { data: null, timestamp: 0 },
  billById: new Map() // Map of bill IDs to {data, timestamp} objects
};

// Add this near the top with your other cache objects
const tokenCache = {
  token: null,
  timestamp: 0
};

/**
 * Create headers with authentication token
 * @returns {Object} Headers object with Authorization if available
 */
const createAuthHeaders = async () => {
  try {
    const now = Date.now();
    
    // Use cached token if available and not expired (valid for 5 minutes)
    if (tokenCache.token && now - tokenCache.timestamp < 300000) {
      console.log('Using cached auth token');
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenCache.token}`
      };
    }
    
    console.log('Fetching fresh auth token');
    
    // Get session from Supabase directly
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting token:', error);
      return { 'Content-Type': 'application/json' };
    }
    
    if (session && session.access_token) {
      // Update token cache
      tokenCache.token = session.access_token;
      tokenCache.timestamp = now;
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
    }
    
    // Fallback to localStorage token if available
    const token = localStorage.getItem('token');
    if (token) {
      // Update token cache
      tokenCache.token = token;
      tokenCache.timestamp = now;
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  } catch (error) {
    console.error('Error creating auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
};

/**
 * Log API errors with detailed information
 * @param {string} endpoint - The API endpoint
 * @param {Error} error - The error object
 */
function logAPIError(endpoint, error) {
  console.group(`API Error: ${endpoint}`);
  console.error('Status:', error.response?.status);
  console.error('Message:', error.message);
  console.error('Response data:', error.response?.data);
  console.error('Request config:', error.config);
  console.groupEnd();
}

/**
 * Handle API errors consistently
 * @param {string} endpoint - The API endpoint
 * @param {Error} error - The error object
 * @throws {Error} - Rethrows a formatted error
 */
function handleApiError(endpoint, error) {
  logAPIError(endpoint, error);
  throw error.response?.data || new Error('Network error');
}

// Extract bill information from image
export const extractBillInfo = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    const headers = await createAuthHeaders();
    headers['Content-Type'] = 'multipart/form-data';
    
    const response = await axios.post(`${API_URL}/extract-bill`, formData, {
      headers,
      withCredentials: true
    });
    
    return {
      success: response.data.success,
      data: response.data.data,
      imagePath: response.data.imagePath || '',
      supabasePath: response.data.supabasePath || ''
    };
  } catch (error) {
    handleApiError('/extract-bill', error);
  }
};

// Get all bills with caching
export const getAllBills = async (forceRefresh = false) => {
  try {
    const now = Date.now();
    // Use cache if recent (within last 30 seconds) and not forcing refresh
    if (!forceRefresh && 
        billsCache.allBills.data && 
        now - billsCache.allBills.timestamp < 30000) {
      console.log('Returning bills from cache');
      return billsCache.allBills.data;
    }
    
    console.log('Fetching all bills from API');
    
    const headers = await createAuthHeaders();
    
    const response = await axios.get(`${API_URL}/bills`, { 
      headers,
      withCredentials: true 
    });
    
    // Update cache
    billsCache.allBills.data = response.data;
    billsCache.allBills.timestamp = now;
    
    return response.data;
  } catch (error) {
    handleApiError('/bills', error);
  }
};

// Get bill by ID with caching
export const getBillById = async (id, forceRefresh = false) => {
  try {
    const now = Date.now();
    const cachedBill = billsCache.billById.get(id);
    
    // Use cache if recent (within last 30 seconds) and not forcing refresh
    if (!forceRefresh && 
        cachedBill && cachedBill.data && 
        now - cachedBill.timestamp < 30000) {
      console.log(`Returning bill ${id} from cache`);
      return cachedBill.data;
    }
    
    const headers = await createAuthHeaders();
    
    const response = await axios.get(`${API_URL}/bills/${id}`, { 
      headers,
      withCredentials: true 
    });
    
    // Update cache
    billsCache.billById.set(id, {
      data: response.data,
      timestamp: now
    });
    
    return response.data;
  } catch (error) {
    handleApiError(`/bills/${id}`, error);
  }
};

// Create new bill with user record creation
export const createBill = async (billData) => {
  try {
    console.log('Creating bill with data:', billData);
    
    // Create a sanitized version of the bill data matching the EXACT database schema
    const sanitizedData = {
      // Required fields with defaults
      vendor: billData.vendor || billData.vendor_name || 'Unknown Vendor',
      amount: parseFloat(billData.amount) || 0,
      due_date: billData.dueDate || billData.due_date || new Date().toISOString(),
      
      // Default user_id to null - the server will set this based on authenticated user
      user_id: billData.user_id || null
    };
    
    // Optional fields - only add if they exist in the input data
    if (billData.billDate || billData.bill_date) {
      sanitizedData.bill_date = billData.billDate || billData.bill_date;
    }
    
    // Handle items as a separate field (correctly matches the schema)
    if (billData.items) {
      sanitizedData.items = billData.items;
    }
    
    if (billData.imagePath || billData.image_path) {
      sanitizedData.image_path = billData.imagePath || billData.image_path;
    }
    
    if (billData.supabaseImagePath || billData.supabase_image_path) {
      sanitizedData.supabase_image_path = billData.supabaseImagePath || billData.supabase_image_path;
    }
    
    if (billData.notes) {
      sanitizedData.notes = billData.notes;
    }
    
    if (billData.category) {
      sanitizedData.category = billData.category;
    }
    
    // Handle paid status if provided
    if (billData.paid !== undefined) {
      sanitizedData.paid = !!billData.paid;
    }
    
    // Handle recurring bill fields
    if (billData.isRecurring !== undefined || billData.is_recurring !== undefined) {
      sanitizedData.is_recurring = !!billData.isRecurring || !!billData.is_recurring;
    }
    
    // Handle recurring_frequency (which is the correct field name in schema)
    if (billData.recurringFrequency || billData.recurring_frequency) {
      sanitizedData.recurring_frequency = billData.recurringFrequency || billData.recurring_frequency;
    } else if (billData.recurringInterval || billData.recurring_interval) {
      // Fall back to recurring_interval if that's what was provided
      sanitizedData.recurring_frequency = billData.recurringInterval || billData.recurring_interval;
      
      // Also set recurring_interval since it exists in the schema
      sanitizedData.recurring_interval = billData.recurringInterval || billData.recurring_interval;
    }
    
    // Handle recurring end date if provided
    if (billData.recurringEndDate || billData.recurring_end_date) {
      sanitizedData.recurring_end_date = billData.recurringEndDate || billData.recurring_end_date;
    }
    
    console.log('Sanitized bill data (matching schema):', sanitizedData);
    
    const headers = await createAuthHeaders();
    
    try {
      const response = await axios.post(
        `${API_URL}/bills`, 
        sanitizedData, 
        {
          headers,
          withCredentials: true,
          timeout: 10000
        }
      );
      
      console.log('Bill creation response:', response.data);
      
      // Invalidate bills cache
      billsCache.allBills.data = null;
      billsCache.allBills.timestamp = 0;
      
      return response.data;
    } catch (axiosError) {
      console.error('Axios error details:', {
        message: axiosError.message,
        response: axiosError.response ? {
          status: axiosError.response.status,
          data: axiosError.response.data
        } : 'No response',
        request: axiosError.request ? 'Request was made but no response received' : 'No request'
      });
      
      // Return a more detailed error object
      return { 
        success: false, 
        error: axiosError.response ? axiosError.response.data.error : 'Network or server error',
        details: axiosError.response ? axiosError.response.data.details : axiosError.message,
        status: axiosError.response ? axiosError.response.status : 500
      };
    }
  } catch (error) {
    console.error('Critical error in createBill function:', error);
    return { 
      success: false, 
      error: 'Application error', 
      details: error.message
    };
  }
};

// Update bill
export const updateBill = async (id, billData) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.put(`${API_URL}/bills/${id}`, billData, { 
      headers,
      withCredentials: true 
    });
    
    // Invalidate bills cache
    billsCache.allBills.data = null;
    billsCache.allBills.timestamp = 0;
    
    // Also invalidate the specific bill cache
    billsCache.billById.delete(id);
    
    return response.data;
  } catch (error) {
    handleApiError(`/bills/${id}`, error);
  }
};

// Delete bill
export const deleteBill = async (id) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.delete(`${API_URL}/bills/${id}`, { 
      headers,
      withCredentials: true 
    });
    
    // Invalidate bills cache
    billsCache.allBills.data = null;
    billsCache.allBills.timestamp = 0;
    
    return response.data;
  } catch (error) {
    handleApiError(`/bills/${id}`, error);
  }
};

// Add debounce function to limit API calls
const debounce = (fn, delay) => {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    return new Promise(resolve => {
      timer = setTimeout(() => resolve(fn(...args)), delay);
    });
  };
};

// Base function that gets debounced
const _fetchNotifications = async () => {
  try {
    // Use cache if recent (within last 30 seconds)
    const now = Date.now();
    if (notificationCache.data && now - notificationCache.timestamp < 30000) {
      return notificationCache.data;
    }
    
    const headers = await createAuthHeaders();
    
    const response = await axios.get(`${API_URL}/notifications`, {
      headers,
      withCredentials: true
    });
    
    // Update cache
    notificationCache.data = response.data;
    notificationCache.timestamp = now;
    
    return response.data;
  } catch (error) {
    logAPIError('/notifications', error);
    
    // Return cache on error if available
    if (notificationCache.data) {
      return notificationCache.data;
    }
    
    throw error;
  }
};

// Debounced function that limits calls to once per 3 seconds
export const getNotifications = debounce(_fetchNotifications, 3000);

// Mark notification as read
export const markNotificationAsRead = async (id) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.put(`${API_URL}/notifications/${id}/mark-read`, {}, { 
      headers,
      withCredentials: true 
    });
    
    // Clear notification cache
    notificationCache.data = null;
    notificationCache.timestamp = 0;
    
    return response.data;
  } catch (error) {
    handleApiError(`/notifications/${id}/mark-read`, error);
  }
};

// Delete notification
export const deleteNotification = async (id) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.delete(`${API_URL}/notifications/${id}`, { 
      headers,
      withCredentials: true 
    });
    
    // Clear notification cache
    notificationCache.data = null;
    notificationCache.timestamp = 0;
    
    return response.data;
  } catch (error) {
    handleApiError(`/notifications/${id}`, error);
  }
};

// Get notification preferences
export const getNotificationPreferences = async () => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.get(`${API_URL}/notifications/preferences`, { 
      headers,
      withCredentials: true 
    });
    return response.data;
  } catch (error) {
    handleApiError('/notifications/preferences', error);
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (preferencesData) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.post(`${API_URL}/notifications/preferences`, preferencesData, { 
      headers,
      withCredentials: true 
    });
    return response.data;
  } catch (error) {
    handleApiError('/notifications/preferences', error);
  }
};

// Send a test notification
export const sendTestNotification = async (notificationData) => {
  try {
    const headers = await createAuthHeaders();
    
    const response = await axios.post(`${API_URL}/test-notification`, notificationData, { 
      headers,
      withCredentials: true 
    });
    return response.data;
  } catch (error) {
    handleApiError('/test-notification', error);
  }
};

// Correctly implement createUserRecord to include userData
export const createUserRecord = async (userData = null) => {
  try {
    const headers = await createAuthHeaders();
    
    // If userData is not provided, get it from the current session
    if (!userData) {
      const { data } = await supabase.auth.getSession();
      if (data && data.session) {
        const user = data.session.user;
        
        // Get Google ID from user metadata if available
        const googleId = user.identities && 
                         user.identities[0] && 
                         user.identities[0].provider_id === 'google' ? 
                         user.identities[0].id : 
                         `manual_${user.id.substring(0, 8)}`;
        
        userData = {
          id: user.id,
          google_id: googleId,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0]
        };
      } else {
        return { success: false, error: 'No active session' };
      }
    }
    
    // Make sure google_id is present in userData to match schema
    if (!userData.google_id && userData.id) {
      userData.google_id = `manual_${userData.id.substring(0, 8)}`;
    }
    
    // Pass userData as the request body
    const response = await axios.post(
      `${API_URL}/auth/create-user-record`, 
      userData, 
      { 
        headers,
        withCredentials: true 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating user record:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return { success: false, error: error.message };
  }
};
