// routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billService = require('../services/billService');
const imageService = require('../services/imageService');
const path = require('path');
const storageService = require('../services/storageService');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { supabaseAdmin } = require('../serverSupabase');

// Import upload middleware
const { upload } = require('../middleware/uploadMiddleware');

// Get all bills for the authenticated user
router.get('/', async (req, res) => {
  try {
    // Get the authenticated user's ID from the session
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const bills = await billService.getBillsByUserId(userId);
    res.json(bills);
  } catch (error) {
    console.error('Error getting bills:', error);
    res.status(500).json({ error: 'Failed to get bills', details: error.message });
  }
});

// Get bill by ID for the authenticated user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const bill = await billService.getBillById(id, userId);
    
    // Check if the bill belongs to the authenticated user
    if (bill && bill.user_id && bill.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(bill);
  } catch (error) {
    console.error('Error getting bill:', error);
    if (error.message === 'Bill not found') {
      res.status(404).json({ error: 'Bill not found' });
    } else {
      res.status(500).json({ error: 'Failed to get bill', details: error.message });
    }
  }
});

// Create bill for the authenticated user
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Bill creation request received');
    console.log('User:', req.user.id, req.user.email);
    console.log('Request body:', req.body);
    
    // Make sure we have the required fields
    // CHANGE: Extract vendor (not vendor_name) from request body
    const vendorValue = req.body.vendor || req.body.vendor_name;
    const { amount } = req.body;
    const dueDate = req.body.due_date || req.body.dueDate;
    
    if (!vendorValue) {
      return res.status(400).json({
        success: false,
        error: 'Vendor name is required',
        details: 'Please provide a vendor name'
      });
    }
    
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required',
        details: 'Please provide a valid numeric amount'
      });
    }
    
    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Due date is required',
        details: 'Please provide a due date'
      });
    }
    
    // Check if user exists in our users table
    try {
      const { data: userExists, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', req.user.id)
        .single();
      
      if (userError && userError.code !== 'PGRST116') { // Not found error
        console.error('Error checking user:', userError);
        return res.status(500).json({
          success: false,
          error: 'Error checking user',
          details: userError.message
        });
      }
      
      if (!userExists) {
        console.log('User not found, creating record');
        
        // Create a user record first
        try {
          const googleId = `google_${req.user.id}_${Date.now()}`;
          const userName = req.user.name || req.user.email.split('@')[0];
          
          const { error: createUserError } = await supabaseAdmin
            .from('users')
            .insert([{
              id: req.user.id,
              google_id: googleId,
              name: userName,
              email: req.user.email,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            }]);
          
          if (createUserError) {
            console.error('Error creating user record:', createUserError);
            return res.status(500).json({
              success: false,
              error: 'Failed to create user record',
              details: createUserError.message
            });
          }
          
          console.log('User record created successfully');
        } catch (userCreationError) {
          console.error('Exception creating user:', userCreationError);
          return res.status(500).json({
            success: false,
            error: 'Exception creating user record',
            details: userCreationError.message
          });
        }
      } else {
        console.log('User exists in database');
      }
    } catch (userCheckError) {
      console.error('Exception checking user:', userCheckError);
      return res.status(500).json({
        success: false,
        error: 'Exception checking user',
        details: userCheckError.message
      });
    }
    
    // Now let's check the bills table structure
    try {
      console.log('Checking bills table structure');
      
      // Use Supabase to fetch table information
      const { data: tablesData, error: tablesError } = await supabaseAdmin.rpc('get_table_columns', {
        table_name: 'bills'
      });
      
      if (tablesError) {
        console.error('Error fetching table structure:', tablesError);
        
        // If the RPC doesn't exist, just continue with a default structure
        console.log('Continuing with default table structure');
      } else {
        console.log('Bills table columns:', tablesData);
      }
    } catch (tableCheckError) {
      console.error('Exception checking table structure:', tableCheckError);
      // Continue despite error
    }
    
    // Prepare the bill data - THIS IS THE KEY CHANGE!
    // ONLY use "vendor" to match the database schema, not vendor_name
    const billData = {
      user_id: req.user.id,
      vendor: vendorValue,  // Use the correct column name
      amount: parseFloat(amount),
      due_date: dueDate
    };
    
    // Add optional fields only if they're present
    if (req.body.bill_date || req.body.billDate) billData.bill_date = req.body.bill_date || req.body.billDate;
    if (req.body.category) billData.category = req.body.category;
    if (req.body.is_recurring !== undefined || req.body.isRecurring !== undefined) {
      billData.is_recurring = !!req.body.is_recurring || !!req.body.isRecurring;
    }
    if (req.body.notes) billData.notes = req.body.notes;
    if (req.body.items) billData.items = req.body.items;
    if (req.body.image_path || req.body.imagePath) billData.image_path = req.body.image_path || req.body.imagePath;
    if (req.body.supabase_image_path || req.body.supabasePath) {
      billData.supabase_image_path = req.body.supabase_image_path || req.body.supabasePath;
    }
    
    // Add handling for recurring fields
    if (billData.is_recurring) {
      if (req.body.recurring_frequency || req.body.recurringFrequency) {
        billData.recurring_frequency = req.body.recurring_frequency || req.body.recurringFrequency;
      }
      
      if (req.body.recurring_interval || req.body.recurringInterval) {
        billData.recurring_interval = req.body.recurring_interval || req.body.recurringInterval;
      }
      
      if (req.body.recurring_end_date || req.body.recurringEndDate) {
        billData.recurring_end_date = req.body.recurring_end_date || req.body.recurringEndDate;
      }
    }
    
    console.log('Final bill data to insert:', billData);
    
    // Try to insert the bill
    try {
      const { data: newBill, error: insertError } = await supabaseAdmin
        .from('bills')
        .insert([billData])
        .select();
      
      if (insertError) {
        console.error('Error creating bill:', insertError);
        
        // Return the detailed error for debugging
        return res.status(500).json({
          success: false,
          error: 'Failed to insert bill',
          details: insertError.message,
          code: insertError.code
        });
      }
      
      console.log('Bill created successfully:', newBill[0]);
      
      return res.json({
        success: true,
        message: 'Bill created successfully',
        bill: newBill[0]
      });
    } catch (insertError) {
      console.error('Exception inserting bill:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Exception inserting bill',
        details: insertError.message
      });
    }
  } catch (error) {
    console.error('Uncaught error in bill creation endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update bill for the authenticated user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if the bill belongs to the authenticated user
    const existingBill = await billService.getBillById(id, userId);
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (existingBill.user_id && existingBill.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Ensure the user_id stays the same
    const billData = {
      ...req.body,
      user_id: userId
    };
    
    const bill = await billService.updateBill(id, billData);
    res.json(bill);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill', details: error.message });
  }
});

// Delete bill for the authenticated user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if the bill belongs to the authenticated user
    const existingBill = await billService.getBillById(id, userId);
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (existingBill.user_id && existingBill.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await billService.deleteBill(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill', details: error.message });
  }
});

// Mark bill as paid for the authenticated user
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if the bill belongs to the authenticated user
    const existingBill = await billService.getBillById(id, userId);
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (existingBill.user_id && existingBill.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const bill = await billService.markBillAsPaid(id, userId);
    res.json(bill);
  } catch (error) {
    console.error('Error marking bill as paid:', error);
    res.status(500).json({ error: 'Failed to mark bill as paid', details: error.message });
  }
});

// Extract bill information from image for the authenticated user
router.post('/extract-bill', upload.single('image'), async (req, res) => {
  console.log('Extract bill API called');
  try {
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!req.file) {
      console.log('No image file provided in the request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Image file received:', req.file.originalname, 'Size:', req.file.size);
    const imagePath = req.file.path;
    console.log('Image saved to:', imagePath);
    
    // Get the user's authentication token from the session if available
    let authToken = null;
    
    // Check if we have a session with Supabase token
    if (req.session && req.session.supabaseToken) {
      authToken = req.session.supabaseToken;
      console.log('Auth token found in session');
    } else {
      console.log('No auth token found in session');
      
      // As a fallback, check if token is in request headers
      if (req.headers.authorization) {
        authToken = req.headers.authorization.replace('Bearer ', '');
        console.log('Auth token found in request headers');
      }
    }
    
    // Upload to both storage locations with auth token and pass the request object
    // to allow access to the session if needed
    const storagePaths = await storageService.uploadFile(req.file, userId, authToken, req);
    console.log('Storage paths:', storagePaths);
    
    // Use image service to extract bill information
    const extractedData = await imageService.extractBillInfoFromImage(imagePath);
    
    // Add the user ID to the extracted data
    extractedData.user_id = userId;
    
    // Format the response to match what the frontend expects
    res.json({
      success: true,
      data: extractedData,
      imagePath: storagePaths.localPath,
      supabasePath: storagePaths.success ? storagePaths.supabasePath : '',
      publicUrl: storagePaths.publicUrl || ''
    });
  } catch (error) {
    console.error('Error extracting bill information:', error);
    res.status(500).json({ error: 'Failed to extract bill information', details: error.message });
  }
});

// Function to handle the redirect from the old /api/extract-bill endpoint
const handleLegacyExtractBillEndpoint = (req, res) => {
  console.log('Handling legacy extract-bill endpoint request');
  
  // If this is called directly from server.js redirect handler
  if (req.url === '/extract-bill') {
    // Process the request using the extract-bill route handler
    return router.handle(req, res, () => {
      console.log('Legacy extract-bill endpoint handled successfully');
    });
  }
  
  // If this function is exported and called directly with the full URL
  console.log('Redirecting to /api/bills/extract-bill');
  res.redirect(307, '/api/bills/extract-bill');
};

module.exports = router;
module.exports.handleLegacyExtractBillEndpoint = handleLegacyExtractBillEndpoint;
